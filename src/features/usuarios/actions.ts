"use server";

import { getActionError, requireSuperadminAction } from "@/lib/server/boundaries";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPinHash } from "@/features/auth/crypto";
import type { AppUserRole } from "@/features/auth/types";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UsuarioFieldErrors, UsuarioFormState } from "./form-state";
import { usuarioSchema, type UsuarioValues } from "./schema";

function getUsuarioInput(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  return {
    active: formData.get("active") === "on",
    displayName: formData.get("displayName"),
    id: id || undefined,
    pin: pin || undefined,
    role: formData.get("role"),
    username: formData.get("username"),
  };
}

function getValidationState(fieldErrors: UsuarioFieldErrors): UsuarioFormState {
  return {
    fieldErrors,
    message: "Revise os campos destacados antes de salvar o usuário.",
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

function getUsuarioBasePayload(values: UsuarioValues) {
  return {
    active: values.active,
    display_name: values.displayName,
    role: values.role,
    username: values.username,
  };
}

function getUsuarioUpdatePayload(values: UsuarioValues) {
  const payload: {
    active: boolean;
    display_name: string;
    pin_hash?: string;
    pin_salt?: string;
    role: AppUserRole;
    username: string;
  } = getUsuarioBasePayload(values);

  if (values.pin) {
    const pin = createPinHash(values.pin);
    payload.pin_hash = pin.hash;
    payload.pin_salt = pin.salt;
  }

  return payload;
}

function getUsuarioInsertPayload(values: UsuarioValues) {
  const pin = createPinHash(values.pin ?? "");

  return {
    ...getUsuarioBasePayload(values),
    pin_hash: pin.hash,
    pin_salt: pin.salt,
  };
}

export async function saveUsuarioAction(_previousState: UsuarioFormState, formData: FormData): Promise<UsuarioFormState> {
  const session = await requireSuperadminAction();

  const parsed = usuarioSchema.safeParse(getUsuarioInput(formData));
  if (!parsed.success) {
    return getValidationState(getParsedErrors(parsed.error.issues));
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Usuários indisponíveis.",
      status: "error",
    };
  }

  const supabase = createServerSupabaseClient();
  const id = parsed.data.id;

  if (id === session.user.id && (!parsed.data.active || parsed.data.role !== "superadmin")) {
    return {
      fieldErrors: !parsed.data.active ? { active: "Seu próprio acesso precisa permanecer ativo." } : { role: "Seu próprio acesso precisa permanecer como Admin." },
      message: "Não é possível remover o seu próprio acesso administrativo.",
      status: "error",
    };
  }

  const result = id
    ? await supabase.from("app_users").update(getUsuarioUpdatePayload(parsed.data)).eq("id", id)
    : await supabase.from("app_users").insert(getUsuarioInsertPayload(parsed.data));

  if (result.error) {
    const isDuplicate = result.error.code === "23505";
    return {
      fieldErrors: isDuplicate ? { username: "Este usuário já existe." } : undefined,
      message: isDuplicate
        ? "Escolha outro nome de usuário."
        : getActionError("usuarios.save", result.error, "Não foi possível salvar o usuário.").message,
      status: "error",
    };
  }

  if (id && (!parsed.data.active || parsed.data.pin)) {
    const { error: revokeError } = await supabase.from("app_sessions").delete().eq("user_id", id);
    if (revokeError) {
      return getActionError("usuarios.revoke-sessions", revokeError, "O usuário foi salvo, mas as sessões não foram revogadas.");
    }
  }

  revalidatePath("/usuarios");

  const returnTo = getReturnTo(formData);
  if (returnTo) {
    redirect(withToastParam(returnTo, id ? "usuario-updated" : "usuario-created"));
  }

  return {
    message: id ? "Usuário atualizado." : "Usuário cadastrado.",
    status: "success",
  };
}
