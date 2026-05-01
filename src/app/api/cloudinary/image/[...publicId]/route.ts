import { NextResponse } from "next/server";
import { generateCloudinarySignature, getCloudinaryConfig, isCloudinaryConfigured } from "@/lib/cloudinary";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    publicId: string[];
  }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Cloudinary não configurado." }, { status: 503 });
  }

  const { publicId } = await context.params;
  const realPublicId = publicId.join("/");
  const url = new URL(request.url);
  const excludeFichaId = url.searchParams.get("excludeFichaId");

  if (!realPublicId.trim()) {
    return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });
  }

  if (getSupabaseConfigStatus().hasServerConfig) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("ficha_imagens").select("ficha_id, dados").contains("dados", {
      publicId: realPublicId,
    });
    const inUseElsewhere = (data ?? []).some((image) => image.ficha_id !== excludeFichaId);

    if (inUseElsewhere) {
      return NextResponse.json({
        message: "Imagem compartilhada. Apenas a referência local deve ser removida.",
        shared: true,
        success: true,
      });
    }
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
  const result = (await response.json()) as { result?: string };

  if (result.result === "ok" || result.result === "not found") {
    return NextResponse.json({
      notFound: result.result === "not found",
      success: true,
    });
  }

  return NextResponse.json({ error: "Falha ao deletar imagem.", details: result }, { status: 400 });
}
