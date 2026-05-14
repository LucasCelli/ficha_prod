"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/features/auth/session";
import { normalizeNameOrCompany } from "@/lib/name-normalizer";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ClienteDeleteActionState, ClienteFieldErrors, ClienteFormState } from "./form-state";
import { clienteFormSchema, type ClienteFormValues } from "./schema";

function getClienteFormInput(formData: FormData) {
  return {
    email: formData.get("email"),
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
  };
}

function getClientePayload(values: ClienteFormValues) {
  return {
    email: values.email,
    nome: normalizeNameOrCompany(values.nome),
    telefone: values.telefone,
  };
}

function shouldRenameLinkedFichas(formData: FormData) {
  const value = formData.get("renomearFichasVinculadas");
  return value === "on" || value === "true";
}

function getReturnTo(formData: FormData, fallback: string) {
  const value = String(formData.get("returnTo") ?? "").trim();
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function withToastParam(path: string, value: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("toast", value);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function normalizeClienteName(value: string) {
  return normalizeNameOrCompany(value).toLocaleLowerCase("pt-BR");
}

function getValidationState(fieldErrors: ClienteFieldErrors): ClienteFormState {
  return {
    fieldErrors,
    message: "Revise os campos destacados antes de salvar o cliente.",
    status: "error",
  };
}

export async function createClienteAction(_previousState: ClienteFormState, formData: FormData): Promise<ClienteFormState> {
  await requireAppSession();

  const parsed = clienteFormSchema.safeParse(getClienteFormInput(formData));

  if (!parsed.success) {
    return getValidationState(
      parsed.error.issues.reduce<ClienteFieldErrors>((errors, issue) => {
        const field = issue.path[0];
        if (typeof field === "string") {
          errors[field as keyof ClienteFieldErrors] = issue.message;
        }
        return errors;
      }, {}),
    );
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Clientes indisponíveis.",
      status: "error",
    };
  }

  const supabase = createServerSupabaseClient();
  const nomeNormalizado = normalizeClienteName(parsed.data.nome);
  const { data: existingCliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("nome_normalizado", nomeNormalizado)
    .maybeSingle();

  if (existingCliente) {
    return getValidationState({
      nome: "Já existe um cliente com esse nome.",
    });
  }

  const { data: cliente, error } = await supabase
    .from("clientes")
    .insert(getClientePayload(parsed.data))
    .select("id")
    .single();

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  revalidatePath("/clientes");
  redirect(withToastParam(getReturnTo(formData, `/clientes/${cliente.id}`), "cliente-created"));
}

export async function updateClienteAction(_previousState: ClienteFormState, formData: FormData): Promise<ClienteFormState> {
  await requireAppSession();

  const id = String(formData.get("id") ?? "").trim();
  const parsed = clienteFormSchema.safeParse(getClienteFormInput(formData));

  if (!id) {
    return {
      message: "Cliente inválido para edição.",
      status: "error",
    };
  }

  if (!parsed.success) {
    return getValidationState(
      parsed.error.issues.reduce<ClienteFieldErrors>((errors, issue) => {
        const field = issue.path[0];
        if (typeof field === "string") {
          errors[field as keyof ClienteFieldErrors] = issue.message;
        }
        return errors;
      }, {}),
    );
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Clientes indisponíveis.",
      status: "error",
    };
  }

  const supabase = createServerSupabaseClient();
  const nomeNormalizado = normalizeClienteName(parsed.data.nome);
  const { data: existingCliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("nome_normalizado", nomeNormalizado)
    .neq("id", id)
    .maybeSingle();

  if (existingCliente) {
    return getValidationState({
      nome: "Já existe outro cliente com esse nome.",
    });
  }

  const payload = getClientePayload(parsed.data);
  const { error } = await supabase.from("clientes").update(payload).eq("id", id);

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  if (shouldRenameLinkedFichas(formData)) {
    const { error: fichasError } = await supabase
      .from("fichas")
      .update({ cliente_nome_snapshot: payload.nome })
      .eq("cliente_id", id);

    if (fichasError) {
      return {
        message: fichasError.message,
        status: "error",
      };
    }
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/fichas");
  revalidatePath("/quadro-producao");
  revalidatePath("/relatorios");
  redirect(withToastParam(getReturnTo(formData, `/clientes/${id}`), "cliente-updated"));
}

export async function deleteClienteAction(
  _previousState: ClienteDeleteActionState,
  formData: FormData,
): Promise<ClienteDeleteActionState> {
  await requireAppSession();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return {
      message: "Cliente invalido para exclusao.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Clientes indisponiveis.",
      status: "error",
    };
  }

  const { error } = await createServerSupabaseClient().from("clientes").delete().eq("id", id);

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/fichas");
  redirect(withToastParam(getReturnTo(formData, "/clientes"), "cliente-deleted"));
}
