import { withAuthenticatedRoute } from "@/lib/server/boundaries";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/features/auth/session";
import { consumeOperationQuota } from "@/lib/operation-quota";
import {
  generateCloudinarySignature,
  getCloudinaryConfig,
  getCloudinaryUploadDefaults,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

const SignatureRequestSchema = z
  .object({
    context: z.string().max(500).optional(),
    tags: z.string().max(200).regex(/^[a-zA-Z0-9,_-]*$/).optional(),
  })
  .strict();

async function handlePOST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Cloudinary não configurado." }, { status: 503 });
  }

  const quota = await consumeOperationQuota({
    limit: 40,
    scope: "cloudinary-upload",
    subject: session.user.id,
    windowSeconds: 60 * 60,
  });

  if (quota.status === "unavailable") {
    return NextResponse.json({ error: "Uploads indisponíveis." }, { status: 503 });
  }

  if (quota.status === "limited") {
    return NextResponse.json(
      { error: "Limite temporário de uploads atingido." },
      { headers: { "Retry-After": String(quota.retryAfterSeconds) }, status: 429 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = SignatureRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de upload inválidos." }, { status: 400 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const defaults = getCloudinaryUploadDefaults();
  const publicId = randomUUID();
  const paramsToSign = {
    context: parsed.data.context,
    folder: defaults.folder,
    public_id: publicId,
    tags: parsed.data.tags,
    timestamp,
    transformation: defaults.transformation,
  };
  const signature = generateCloudinarySignature(paramsToSign);
  const config = getCloudinaryConfig();

  return NextResponse.json({
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    folder: defaults.folder,
    publicId,
    signature,
    timestamp,
    transformation: defaults.transformation,
  });
}

export const POST = withAuthenticatedRoute(handlePOST, "src/app/api/cloudinary/signature/route.ts");
