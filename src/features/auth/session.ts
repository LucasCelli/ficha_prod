import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hashSessionToken } from "./crypto";
import type { AppSession, AppSessionUser } from "./types";

export const APP_SESSION_COOKIE = "ficha_app_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 10;

type SessionRow = {
  expires_at: string;
  user: {
    active: boolean;
    display_name: string;
    id: string;
    role: AppSessionUser["role"];
    username: string;
  } | null;
};

export function getSessionExpiresAt() {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
}

export async function getCurrentSession(): Promise<AppSession | null> {
  if (!getSupabaseConfigStatus().hasServerConfig) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (!token) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("app_sessions")
    .select("expires_at,user:app_users(id,username,display_name,role,active)")
    .eq("token_hash", hashSessionToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<SessionRow>();

  if (error || !data?.user?.active) return null;

  await supabase.from("app_sessions").update({ last_seen_at: new Date().toISOString() }).eq("token_hash", hashSessionToken(token));

  return {
    expiresAt: data.expires_at,
    user: {
      displayName: data.user.display_name,
      id: data.user.id,
      role: data.user.role,
      username: data.user.username,
    },
  };
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
