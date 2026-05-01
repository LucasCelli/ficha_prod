import { NextResponse } from "next/server";
import { getCloudinaryPublicConfig, isCloudinaryConfigured } from "@/lib/cloudinary";

export const runtime = "nodejs";

export function GET() {
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
