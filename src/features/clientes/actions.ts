"use server";

import { getActionError, requireAuthenticatedAction } from "@/lib/server/boundaries";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ClienteDeleteActionState, ClienteFieldErrors, ClienteFormState, ClienteInlineFormState } from "./form-state";
import { clienteFormSchema, type ClienteFormValues } from "./schema";

function getClienteFormInput(formData: FormData) {
  return {
    email: formData.get("email"),
    empresa: formData.get("empresa"),
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
  };
}

function getClientePayload(values: ClienteFormValues) {
  return {
    email: values.email,
    empresa: values.empresa,
    nome: values.nome,
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

function getValidationState(fieldErrors: ClienteFieldErrors): ClienteFormState {
  return {
    fieldErrors,
    message: "Revise os campos destacados antes de salvar o cliente.",
    status: "error",
  };
}

function getClientePersistenceError(message: string): ClienteFormState {
  if (message.includes("Informe a Empresa/Instituição")) {
    return getValidationState({ empresa: message });
  }
  if (message.includes("nome e esta Empresa/Instituição")) {
    return getValidationState({ empresa: message });
  }
  if (message.includes("Nome é obrigatório")) {
    return getValidationState({ nome: "Nome é obrigatório." });
  }
  return { message: "Não foi possível salvar o cliente.", status: "error" };
}

async function saveCliente(clienteId: string | null, values: ClienteFormValues) {
  return createServerSupabaseClient().rpc("save_cliente_atomic", {
    p_cliente_id: clienteId,
    p_email: values.email ?? null,
    p_empresa: values.empresa ?? null,
    p_nome: values.nome,
    p_telefone: values.telefone ?? null,
  });
}

export async function createClienteAction(_previousState: ClienteFormState, formData: FormData): Promise<ClienteFormState> {
  await requireAuthenticatedAction();

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

  const { data: cliente, error } = await saveCliente(null, parsed.data);

  if (error) {
    return getClientePersistenceError(error.message);
  }

  revalidatePath("/clientes");
  redirect(withToastParam(getReturnTo(formData, `/clientes/${cliente.id}`), "cliente-created"));
}

export async function updateClienteAction(_previousState: ClienteFormState, formData: FormData): Promise<ClienteFormState> {
  await requireAuthenticatedAction();

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
  const payload = getClientePayload(parsed.data);
  const { error } = await saveCliente(id, parsed.data);

  if (error) {
    return getClientePersistenceError(error.message);
  }

  if (shouldRenameLinkedFichas(formData)) {
    const { error: fichasError } = await supabase
      .from("fichas")
      .update({ cliente_nome_snapshot: payload.nome })
      .eq("cliente_id", id);

    if (fichasError) {
      return getActionError("clientes.rename-linked", fichasError, "O cliente foi salvo, mas as fichas vinculadas não foram renomeadas.");
    }
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/fichas");
  revalidatePath("/quadro-producao");
  revalidatePath("/relatorios");
  redirect(withToastParam(getReturnTo(formData, `/clientes/${id}`), "cliente-updated"));
}

export async function createClienteInlineAction(
  _previousState: ClienteInlineFormState,
  formData: FormData,
): Promise<ClienteInlineFormState> {
  await requireAuthenticatedAction();
  const parsed = clienteFormSchema.safeParse(getClienteFormInput(formData));

  if (!parsed.success) {
    return {
      ...getValidationState(parsed.error.issues.reduce<ClienteFieldErrors>((errors, issue) => {
        const field = issue.path[0];
        if (typeof field === "string") errors[field as keyof ClienteFieldErrors] = issue.message;
        return errors;
      }, {})),
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return { message: "Clientes indisponíveis.", status: "error" };
  }

  const { data, error } = await saveCliente(null, parsed.data);
  if (error || !data) return getClientePersistenceError(error?.message ?? "") as ClienteInlineFormState;

  revalidatePath("/clientes");
  revalidatePath("/fichas");
  return { cliente: { empresa: data.empresa, id: data.id, nome: data.nome }, status: "success" };
}

export async function deleteClienteAction(
  _previousState: ClienteDeleteActionState,
  formData: FormData,
): Promise<ClienteDeleteActionState> {
  await requireAuthenticatedAction();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return {
      message: "Cliente inválido para exclusão.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Clientes indisponíveis.",
      status: "error",
    };
  }

  const { error } = await createServerSupabaseClient().from("clientes").delete().eq("id", id);

  if (error) {
    return getActionError("clientes.delete", error, "Não foi possível excluir o cliente.");
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/fichas");
  redirect(withToastParam(getReturnTo(formData, "/clientes"), "cliente-deleted"));
}
