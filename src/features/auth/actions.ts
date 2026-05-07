"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSessionToken, hashSessionToken, verifyPin } from "./crypto";
import type { LoginFormState } from "./form-state";
import { APP_SESSION_COOKIE, getSessionExpiresAt } from "./session";
import { loginSchema } from "./schema";

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function getSafeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}

export async function loginAction(_previousState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    next: formData.get("next"),
    pin: formData.get("pin"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.issues.reduce<LoginFormState["fieldErrors"]>((errors, issue) => {
        const field = issue.path[0];
        if (field === "pin" || field === "username") {
          return { ...errors, [field]: issue.message };
        }
        return errors;
      }, {}),
      message: "Revise os dados de acesso.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Acesso indisponível.",
      status: "error",
    };
  }

  const supabase = createServerSupabaseClient();
  const { data: user, error } = await supabase
    .from("app_users")
    .select("id,username,pin_salt,pin_hash,active")
    .eq("username_normalized", normalizeUsername(parsed.data.username))
    .maybeSingle();

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  if (!user?.active || !verifyPin(parsed.data.pin, user.pin_salt, user.pin_hash)) {
    return {
      fieldErrors: {
        pin: "Usuario ou PIN invalido.",
        username: "Usuario ou PIN invalido.",
      },
      message: "Nao foi possivel entrar com esses dados.",
      status: "error",
    };
  }

  const token = createSessionToken();
  const expiresAt = getSessionExpiresAt();
  const { error: sessionError } = await supabase.from("app_sessions").insert({
    expires_at: expiresAt.toISOString(),
    token_hash: hashSessionToken(token),
    user_id: user.id,
  });

  if (sessionError) {
    return {
      message: sessionError.message,
      status: "error",
    };
  }

  await supabase.from("app_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);

  const cookieStore = await cookies();
  cookieStore.set(APP_SESSION_COOKIE, token, {
    expires: expiresAt,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect(getSafeNext(parsed.data.next));
}

export async function logoutAction() {
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
  redirect("/login");
}
