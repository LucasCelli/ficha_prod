import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/session";
import { getCloudinaryPublicConfig, isCloudinaryConfigured } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        message: "Cloudinary não configurado.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ...getCloudinaryPublicConfig(),
    configured: true,
  });
}
