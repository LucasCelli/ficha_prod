"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/features/auth/session";
import { createPinHash } from "@/features/auth/crypto";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UsuarioFieldErrors, UsuarioFormState } from "./form-state";
import { operadorSchema, type OperadorValues } from "./schema";

function getUsuarioInput(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  return {
    active: formData.get("active") === "on",
    displayName: formData.get("displayName"),
    id: id || undefined,
    pin: pin || undefined,
    username: formData.get("username"),
  };
}

function getValidationState(fieldErrors: UsuarioFieldErrors): UsuarioFormState {
  return {
    fieldErrors,
    message: "Revise os campos destacados antes de salvar o operador.",
    status: "error",
  };
}

function getParsedErrors(issues: { message: string; path: PropertyKey[] }[]) {
  return issues.reduce<UsuarioFieldErrors>((errors, issue) => {
    const field = issue.path[0];
    if (typeof field === "string") {
      errors[field as keyof UsuarioFieldErrors] = issue.message;
    }
    return errors;
  }, {});
}

function getReturnTo(formData: FormData) {
  const value = String(formData.get("returnTo") ?? "").trim();
  return value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

function withToastParam(path: string, value: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("toast", value);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function getOperadorBasePayload(values: OperadorValues) {
  return {
    active: values.active,
    display_name: values.displayName,
    role: "operador" as const,
    username: values.username,
  };
}

function getOperadorUpdatePayload(values: OperadorValues) {
  const payload: {
    active: boolean;
    display_name: string;
    pin_hash?: string;
    pin_salt?: string;
    role: "operador";
    username: string;
  } = getOperadorBasePayload(values);

  if (values.pin) {
    const pin = createPinHash(values.pin);
    payload.pin_hash = pin.hash;
    payload.pin_salt = pin.salt;
  }

  return payload;
}

function getOperadorInsertPayload(values: OperadorValues) {
  const pin = createPinHash(values.pin ?? "");

  return {
    ...getOperadorBasePayload(values),
    pin_hash: pin.hash,
    pin_salt: pin.salt,
  };
}

export async function saveOperadorAction(_previousState: UsuarioFormState, formData: FormData): Promise<UsuarioFormState> {
  await requireSuperadmin();

  const parsed = operadorSchema.safeParse(getUsuarioInput(formData));
  if (!parsed.success) {
    return getValidationState(getParsedErrors(parsed.error.issues));
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Operadores indisponíveis.",
      status: "error",
    };
  }

  const supabase = createServerSupabaseClient();
  const id = parsed.data.id;
  const result = id
    ? await supabase.from("app_users").update(getOperadorUpdatePayload(parsed.data)).eq("id", id).eq("role", "operador")
    : await supabase.from("app_users").insert(getOperadorInsertPayload(parsed.data));

  if (result.error) {
    const isDuplicate = result.error.code === "23505";
    return {
      fieldErrors: isDuplicate ? { username: "Este usuário já existe." } : undefined,
      message: isDuplicate ? "Escolha outro usuário para o operador." : result.error.message,
      status: "error",
    };
  }

  if (id && (!parsed.data.active || parsed.data.pin)) {
    await supabase.from("app_sessions").delete().eq("user_id", id);
  }

  revalidatePath("/usuarios");

  const returnTo = getReturnTo(formData);
  if (returnTo) {
    redirect(withToastParam(returnTo, id ? "operador-updated" : "operador-created"));
  }

  return {
    message: id ? "Operador atualizado." : "Operador cadastrado.",
    status: "success",
  };
}
