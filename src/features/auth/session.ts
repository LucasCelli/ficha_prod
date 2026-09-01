import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hashSessionToken } from "./crypto";
import type { AppSession } from "./types";
import type { AppUserRole } from "./types";

export const APP_SESSION_COOKIE = "ficha_app_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionRpcRow = {
  active: boolean;
  display_name: string;
  expires_at: string;
  last_seen_at: string;
  role: AppUserRole;
  user_id: string;
  username: string;
};

export function getSessionExpiresAt() {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
}

const resolveCurrentSession = cache(async (): Promise<AppSession | null> => {
  if (!getSupabaseConfigStatus().hasServerConfig) return null;

  const token = (await cookies()).get(APP_SESSION_COOKIE)?.value;
  if (!token) return null;

  const { data, error } = await createServerSupabaseClient()
    .rpc("resolve_app_session", {
      p_seen_at: new Date().toISOString(),
      p_token_hash: hashSessionToken(token),
    })
    .maybeSingle<SessionRpcRow>();

  if (error || !data?.active) return null;

  return {
    expiresAt: data.expires_at,
    user: {
      displayName: data.display_name,
      id: data.user_id,
      role: data.role,
      username: data.username,
    },
  };
});

export function getCurrentSession() {
  return resolveCurrentSession();
}

export async function requireAppSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireSuperadmin() {
  const session = await requireAppSession();
  if (session.user.role !== "superadmin") redirect("/");
  return session;
}
