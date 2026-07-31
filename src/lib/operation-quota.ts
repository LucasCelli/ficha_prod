import "server-only";

import { createHash } from "node:crypto";
import { createServerSupabaseClient } from "./supabase/server";

export type OperationQuotaResult =
  | { status: "allowed" }
  | { retryAfterSeconds: number; status: "limited" }
  | { status: "unavailable" };

function createQuotaKey(scope: string, subject: string) {
  const digest = createHash("sha256").update(`${scope}:${subject}`).digest("base64url");
  return `${scope}:${digest}`;
}

export async function consumeOperationQuota(input: {
  limit: number;
  scope: string;
  subject: string;
  windowSeconds: number;
}): Promise<OperationQuotaResult> {
  const { data, error } = await createServerSupabaseClient().rpc("consume_operation_quota", {
    p_limit: input.limit,
    p_quota_key: createQuotaKey(input.scope, input.subject),
    p_window_seconds: input.windowSeconds,
  });

  if (error) return { status: "unavailable" };

  const retryAfterSeconds = Math.max(0, data ?? 0);
  return retryAfterSeconds > 0 ? { retryAfterSeconds, status: "limited" } : { status: "allowed" };
}