import "server-only";

import { randomUUID } from "node:crypto";
import { getCurrentSession, requireAppSession, requireSuperadmin } from "@/features/auth/session";

function sanitizeLogMessage(value: string) {
  return value
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(?:sb_(?:secret|publishable)_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, "[redacted]")
    .replace(/([?&](?:key|token|secret|signature)=)[^&\s]+/gi, "$1[redacted]")
    .slice(0, 800);
}

function getErrorMetadata(error: unknown) {
  if (!(error instanceof Error)) return { message: "Unknown server error", name: "UnknownError" };
  const candidate = error as Error & { code?: unknown; status?: unknown; statusCode?: unknown };
  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message: sanitizeLogMessage(error.message),
    name: error.name,
    status: typeof candidate.statusCode === "number" ? candidate.statusCode : typeof candidate.status === "number" ? candidate.status : undefined,
  };
}
export function reportServerError(context: string, error: unknown) {
  const requestId = randomUUID();
  console.error(`[${context}]`, { requestId, ...getErrorMetadata(error) });
  return requestId;
}

export function requireAuthenticatedAction() {
  return requireAppSession();
}

export function requireSuperadminAction() {
  return requireSuperadmin();
}

export function withAuthenticatedRoute<TArguments extends unknown[]>(
  handler: (...args: TArguments) => Promise<Response>,
  context = handler.name || "authenticated-route",
) {
  return async (...args: TArguments) => {
    const session = await getCurrentSession();
    if (!session) {
      return Response.json({ error: "Não autenticado." }, { status: 401 });
    }

    try {
      return await handler(...args);
    } catch (error) {
      const requestId = reportServerError(context, error);
      return Response.json(
        { error: "Não foi possível concluir a operação.", requestId },
        { status: 500 },
      );
    }
  };
}

export function getActionError(context: string, error: unknown, message: string) {
  const requestId = reportServerError(context, error);
  return { message: `${message} Código: ${requestId}.`, status: "error" as const };
}
export function getServerErrorMessage(context: string, error: unknown, message: string) {
  const requestId = reportServerError(context, error);
  return `${message} Código: ${requestId}.`;
}