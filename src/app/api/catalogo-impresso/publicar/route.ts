import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/session";
import { getCatalogPrintDashboard } from "@/features/catalogo-impresso/data";
import { generateCatalogPrintPdf } from "@/features/catalogo-impresso/pdf";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withAuthenticatedRoute } from "@/lib/server/boundaries";
import { consumeOperationQuota } from "@/lib/operation-quota";

export const runtime = "nodejs";
export const maxDuration = 300;

async function handlePOST() {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "superadmin") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const quota = await consumeOperationQuota({ limit: 10, scope: "catalogo-impresso-publicar", subject: session.user.id, windowSeconds: 60 * 60 });
  if (quota.status === "unavailable") return NextResponse.json({ error: "Publicação temporariamente indisponível." }, { status: 503 });
  if (quota.status === "limited") return NextResponse.json({ error: "Limite temporário de publicações atingido." }, { headers: { "Retry-After": String(quota.retryAfterSeconds) }, status: 429 });
  const dashboard = await getCatalogPrintDashboard();
  let generated;
  try { generated = await generateCatalogPrintPdf({ categories: dashboard.categories, entries: dashboard.entries, settings: dashboard.settings }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao gerar o PDF." }, { status: 422 }); }
  const supabase = createServerSupabaseClient();
  const publicationId = randomUUID();
  const path = `publicacoes/${publicationId}.pdf`;
  const checksum = createHash("sha256").update(generated.buffer).digest("hex");
  const upload = await supabase.storage.from("catalogo-impresso").upload(path, generated.buffer, { cacheControl: "3600", contentType: "application/pdf", upsert: false });
  if (upload.error) return NextResponse.json({ error: "Não foi possível armazenar o PDF. A versão anterior foi mantida." }, { status: 500 });
  const inserted = await supabase.from("catalog_print_publications").insert({ checksum, entry_count: generated.entryCount, file_size: generated.buffer.length, generated_by_user_id: session.user.id, id: publicationId, page_count: generated.pageCount, storage_path: path });
  if (inserted.error) { await supabase.storage.from("catalogo-impresso").remove([path]); return NextResponse.json({ error: "Não foi possível registrar a publicação. A versão anterior foi mantida." }, { status: 500 }); }
  const pointer = await supabase.from("catalog_print_settings").update({ latest_publication_id: publicationId }).eq("id", 1);
  if (pointer.error) { await supabase.from("catalog_print_publications").delete().eq("id", publicationId); await supabase.storage.from("catalogo-impresso").remove([path]); return NextResponse.json({ error: "Não foi possível ativar a nova versão. A anterior foi mantida." }, { status: 500 }); }
  return NextResponse.json({ checksum, entryCount: generated.entryCount, pageCount: generated.pageCount, publicationId });
}

export const POST = withAuthenticatedRoute(handlePOST, "catalogo-impresso.publish");
