import { NextResponse } from "next/server";
import {
  generateCloudinarySignature,
  getCloudinaryConfig,
  getCloudinaryUploadDefaults,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

type SignatureRequestBody = {
  context?: string;
  public_id?: string;
  tags?: string;
};

export async function POST(request: Request) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Cloudinary não configurado." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as SignatureRequestBody;
  const timestamp = Math.round(Date.now() / 1000);
  const defaults = getCloudinaryUploadDefaults();
  const paramsToSign = {
    context: body.context,
    folder: defaults.folder,
    public_id: body.public_id,
    tags: body.tags,
    timestamp,
    transformation: defaults.transformation,
  };
  const signature = generateCloudinarySignature(paramsToSign);
  const config = getCloudinaryConfig();

  return NextResponse.json({
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    folder: defaults.folder,
    signature,
    timestamp,
    transformation: defaults.transformation,
  });
}
