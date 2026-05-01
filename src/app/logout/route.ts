import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APP_SESSION_COOKIE } from "@/features/auth/session";
import { hashSessionToken } from "@/features/auth/crypto";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(APP_SESSION_COOKIE)?.value;

  if (token && getSupabaseConfigStatus().hasServerConfig) {
    await createServerSupabaseClient().from("app_sessions").delete().eq("token_hash", hashSessionToken(token));
  }

  cookieStore.set(APP_SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function GET() {
  await clearSession();
  redirect("/login");
}

export async function POST() {
  await clearSession();
  redirect("/login");
}
