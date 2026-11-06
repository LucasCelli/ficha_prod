import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/features/auth/session";
import { generateCloudinarySignature, getCloudinaryConfig, isCloudinaryConfigured } from "@/lib/cloudinary";
import { consumeOperationQuota } from "@/lib/operation-quota";
import { withAuthenticatedRoute } from "@/lib/server/boundaries";

export const runtime = "nodejs";
const schema = z.object({ altText: z.string().trim().max(300) }).strict();

async function handlePOST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "superadmin") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  if (!isCloudinaryConfigured()) return NextResponse.json({ error: "Cloudinary não configurado." }, { status: 503 });
  const quota = await consumeOperationQuota({ limit: 40, scope: "catalogo-impresso-upload", subject: session.user.id, windowSeconds: 60 * 60 });
  if (quota.status === "unavailable") return NextResponse.json({ error: "Uploads indisponíveis." }, { status: 503 });
  if (quota.status === "limited") return NextResponse.json({ error: "Limite temporário de uploads atingido." }, { headers: { "Retry-After": String(quota.retryAfterSeconds) }, status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const config = getCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = "catalogo-impresso";
  const publicId = randomUUID();
  const transformation = "c_limit,w_2400,h_2400,q_auto:best";
  const context = `alt=${parsed.data.altText}`;
  const tags = "catalogo_impresso,next";
  return NextResponse.json({ apiKey: config.apiKey, cloudName: config.cloudName, context, folder, publicId, signature: generateCloudinarySignature({ context, folder, public_id: publicId, tags, timestamp, transformation }), tags, timestamp, transformation });
}

export const POST = withAuthenticatedRoute(handlePOST, "catalogo-impresso.image-signature");
