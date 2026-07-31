import { withAuthenticatedRoute } from "@/lib/server/boundaries";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/session";
import { generateCloudinarySignature, getCloudinaryConfig, isCloudinaryConfigured } from "@/lib/cloudinary";
import { consumeOperationQuota } from "@/lib/operation-quota";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MANAGED_PUBLIC_ID_PATTERN = /^fichas\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/;

type RouteContext = {
  params: Promise<{
    publicId: string[];
  }>;
};

async function handleDELETE(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!isCloudinaryConfigured() || !getSupabaseConfigStatus().hasServerConfig) {
    return NextResponse.json({ error: "Imagens indisponíveis." }, { status: 503 });
  }

  const quota = await consumeOperationQuota({
    limit: 80,
    scope: "cloudinary-delete",
    subject: session.user.id,
    windowSeconds: 60 * 60,
  });

  if (quota.status === "unavailable") {
    return NextResponse.json({ error: "Imagens indisponíveis." }, { status: 503 });
  }

  if (quota.status === "limited") {
    return NextResponse.json(
      { error: "Limite temporário de operações com imagens atingido." },
      { headers: { "Retry-After": String(quota.retryAfterSeconds) }, status: 429 },
    );
  }

  const { publicId } = await context.params;
  const realPublicId = publicId.join("/");

  if (!MANAGED_PUBLIC_ID_PATTERN.test(realPublicId)) {
    return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: references, error: referenceError } = await supabase
    .from("ficha_imagens")
    .select("id")
    .eq("storage_path", realPublicId)
    .limit(1);

  if (referenceError) {
    return NextResponse.json({ error: "Não foi possível validar a imagem." }, { status: 503 });
  }

  if ((references?.length ?? 0) > 0) {
    return NextResponse.json({
      message: "A imagem permanece vinculada até a ficha ser salva.",
      shared: true,
      success: true,
    });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = generateCloudinarySignature({
    public_id: realPublicId,
    timestamp,
  });
  const config = getCloudinaryConfig();
  const formData = new URLSearchParams();
  formData.append("api_key", config.apiKey);
  formData.append("public_id", realPublicId);
  formData.append("signature", signature);
  formData.append("timestamp", String(timestamp));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
    body: formData,
    method: "POST",
  });
  const result = (await response.json().catch(() => null)) as { result?: string } | null;

  if (response.ok && (result?.result === "ok" || result?.result === "not found")) {
    return NextResponse.json({
      notFound: result.result === "not found",
      success: true,
    });
  }

  return NextResponse.json({ error: "Falha ao deletar imagem." }, { status: 502 });
}

export const DELETE = withAuthenticatedRoute(handleDELETE, "src/app/api/cloudinary/image/[...publicId]/route.ts");
