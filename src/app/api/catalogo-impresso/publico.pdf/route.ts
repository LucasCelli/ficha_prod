import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: settings, error: settingsError } = await supabase.from("catalog_print_settings").select("latest_publication_id").eq("id", 1).single();
  if (settingsError || !settings.latest_publication_id) return new Response("Catálogo ainda não publicado.", { status: 404 });
  const { data: publication, error } = await supabase.from("catalog_print_publications").select("storage_path,checksum").eq("id", settings.latest_publication_id).maybeSingle();
  if (error || !publication) return new Response("Publicação não encontrada.", { status: 404 });
  const download = await supabase.storage.from("catalogo-impresso").download(publication.storage_path);
  if (download.error) return new Response("Arquivo indisponível.", { status: 503 });
  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  return new Response(await download.data.arrayBuffer(), { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600", "Content-Disposition": `${disposition}; filename="catalogo-priscila.pdf"`, "Content-Type": "application/pdf", ETag: `"${publication.checksum}"` } });
}
