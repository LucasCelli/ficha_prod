"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActionError, reportServerError } from "@/lib/server/boundaries";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSessionToken, hashSessionToken, verifyPin } from "./crypto";
import type { LoginFormState } from "./form-state";
import { getLoginAttemptKeys, getLoginRateLimitMessage } from "./login-rate-limit";
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
  const attemptKeys = getLoginAttemptKeys(parsed.data.username, await headers());
  const { data: retryAfterSeconds, error: rateLimitError } = await supabase.rpc("consume_login_attempt", {
    p_attempt_keys: attemptKeys,
  });

  if (rateLimitError) {
    return getActionError("auth.login.rate-limit", rateLimitError, "Acesso indisponível.");
  }

  if ((retryAfterSeconds ?? 0) > 0) {
    return {
      message: getLoginRateLimitMessage(retryAfterSeconds ?? 0),
      status: "error",
    };
  }

  const { data: user, error } = await supabase
    .from("app_users")
    .select("id,username,pin_salt,pin_hash,active")
    .eq("username_normalized", normalizeUsername(parsed.data.username))
    .maybeSingle();

  if (error) {
    return getActionError("auth.login.lookup", error, "Acesso indisponível.");
  }

  if (!user?.active || !verifyPin(parsed.data.pin, user.pin_salt, user.pin_hash)) {
    const { error: auditError } = await supabase.rpc("record_login_failure", { p_attempt_keys: attemptKeys });
    if (auditError) reportServerError("auth.login.audit", auditError);

    return {
      fieldErrors: {
        pin: "Usuário ou PIN inválido.",
        username: "Usuário ou PIN inválido.",
      },
      message: "Não foi possível entrar com esses dados.",
      status: "error",
    };
  }

  const { error: clearAttemptsError } = await supabase.rpc("clear_login_attempts", {
    p_attempt_keys: attemptKeys,
  });

  if (clearAttemptsError) {
    return getActionError("auth.login.clear-rate-limit", clearAttemptsError, "Acesso indisponível.");
  }

  const token = createSessionToken();
  const expiresAt = getSessionExpiresAt();
  const { error: sessionError } = await supabase.from("app_sessions").insert({
    expires_at: expiresAt.toISOString(),
    token_hash: hashSessionToken(token),
    user_id: user.id,
  });

  if (sessionError) {
    return getActionError("auth.login.session", sessionError, "Acesso indisponível.");
  }

  const { error: lastLoginError } = await supabase
    .from("app_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);
  if (lastLoginError) reportServerError("auth.login.last-seen", lastLoginError);

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
    const { error } = await createServerSupabaseClient()
      .from("app_sessions")
      .delete()
      .eq("token_hash", hashSessionToken(token));
    if (error) reportServerError("auth.logout", error);
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
