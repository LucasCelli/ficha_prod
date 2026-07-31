"use server";


import { getActionError, requireAuthenticatedAction } from "@/lib/server/boundaries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeNameOrCompany } from "@/lib/name-normalizer";
import { sanitizeObservationHtml } from "@/lib/sanitize-observations";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FichaDeleteActionState, FichaFormState, FichaStatusActionState, FieldErrors } from "./form-state";
import { fichaFormSchema, type FichaFormValues } from "./schema";
import { getFichaDeleteConfirmationCode } from "./delete-confirmation";

function getFichaFormInput(formData: FormData) {
  return {
    cliente: formData.get("cliente"),
    clienteAuxiliar: formData.get("clienteAuxiliar"),
    dataInicio: formData.get("dataInicio"),
    dataEntrega: formData.get("dataEntrega"),
    vendedor: formData.get("vendedor"),
    numeroVenda: formData.get("numeroVenda"),
    arte: formData.get("arte"),
    material: formData.get("material"),
    composicao: formData.get("composicao"),
    etiqueta: formData.get("etiqueta"),
    corMaterial: formData.get("corMaterial"),
    manga: formData.get("manga"),
    acabamentoManga: formData.get("acabamentoManga"),
    corAcabamentoManga: formData.get("corAcabamentoManga"),
    larguraManga: formData.get("larguraManga"),
    gola: formData.get("gola"),
    acabamentoGola: formData.get("acabamentoGola"),
    corGola: formData.get("corGola"),
    corDetalheGola: formData.get("corDetalheGola"),
    larguraGola: formData.get("larguraGola"),
    corPeitilhoInterno: formData.get("corPeitilhoInterno"),
    corPeitilhoExterno: formData.get("corPeitilhoExterno"),
    corPeDeGolaInterno: formData.get("corPeDeGolaInterno"),
    corPeDeGolaExterno: formData.get("corPeDeGolaExterno"),
    corBotao: formData.get("corBotao"),
    aberturaLateral: formData.get("aberturaLateral"),
    corAberturaLateral: formData.get("corAberturaLateral"),
    reforcoGola: formData.get("reforcoGola"),
    corReforco: formData.get("corReforco"),
    bolso: formData.get("bolso"),
    filete: formData.get("filete"),
    fileteLocal: formData.get("fileteLocal"),
    fileteCor: formData.get("fileteCor"),
    faixa: formData.get("faixa"),
    faixaLocal: formData.get("faixaLocal"),
    faixaCor: formData.get("faixaCor"),
    corSublimacao: formData.get("corSublimacao"),
    comNomes: formData.get("comNomes"),
    imagens: formData.get("imagensJson"),
    itens: formData.get("itensJson"),
    listaNomesRaw: formData.get("listaNomesRaw"),
    observacoes: formData.get("observacoes"),
    evento: formData.get("evento"),
  };
}

function nullableText(value: string | undefined) {
  return value ?? null;
}

function getFichaPayload(values: FichaFormValues): Json {
  return {
    acabamento_gola: nullableText(values.acabamentoGola),
    acabamento_manga: nullableText(values.acabamentoManga),
    abertura_lateral: nullableText(values.aberturaLateral),
    arte: nullableText(values.arte),
    bolso: nullableText(values.bolso),
    cliente_auxiliar: nullableText(values.clienteAuxiliar),
    cliente_nome_snapshot: normalizeNameOrCompany(values.cliente),
    com_nomes: values.comNomes ?? null,
    composicao: nullableText(values.composicao),
    etiqueta: nullableText(values.etiqueta),
    cor_abertura_lateral: nullableText(values.corAberturaLateral),
    cor_acabamento_manga: nullableText(values.corAcabamentoManga),
    cor_botao: nullableText(values.corBotao),
    cor_detalhe_gola: nullableText(values.corDetalheGola),
    cor_gola: nullableText(values.corGola),
    cor_material: nullableText(values.corMaterial),
    cor_pe_de_gola_externo: nullableText(values.corPeDeGolaExterno),
    cor_pe_de_gola_interno: nullableText(values.corPeDeGolaInterno),
    cor_peitilho_externo: nullableText(values.corPeitilhoExterno),
    cor_peitilho_interno: nullableText(values.corPeitilhoInterno),
    cor_reforco: nullableText(values.corReforco),
    cor_sublimacao: nullableText(values.corSublimacao),
    data_entrega: values.dataEntrega,
    data_inicio: nullableText(values.dataInicio),
    evento: values.evento,
    faixa: nullableText(values.faixa),
    faixa_cor: nullableText(values.faixaCor),
    faixa_local: nullableText(values.faixaLocal),
    filete: nullableText(values.filete),
    filete_cor: nullableText(values.fileteCor),
    filete_local: nullableText(values.fileteLocal),
    gola: nullableText(values.gola),
    largura_gola: nullableText(values.larguraGola),
    largura_manga: nullableText(values.larguraManga),
    lista_nomes_raw: nullableText(values.listaNomesRaw),
    manga: nullableText(values.manga),
    material: nullableText(values.material),
    numero_venda: nullableText(values.numeroVenda),
    observacoes: nullableText(values.observacoes ? sanitizeObservationHtml(values.observacoes) : undefined),
    reforco_gola: nullableText(values.reforcoGola),
    vendedor: values.vendedor,
  };
}

function getFichaItensPayload(values: FichaFormValues): Json {
  return values.itens.map((item) => ({
    detalhes_produto: nullableText(item.detalhesProduto),
    produto: item.produto,
    quantidade: item.quantidade,
    tamanho: nullableText(item.tamanho),
  }));
}

function getFichaImagensPayload(values: FichaFormValues): Json {
  return values.imagens.map((image) => ({
    alt_text: nullableText(image.altText),
    bytes: image.bytes ?? null,
    height: image.height ?? null,
    public_id: image.publicId,
    url: image.secureUrl,
    width: image.width ?? null,
  }));
}

async function saveFichaAtomic(fichaId: string | null, actorId: string, values: FichaFormValues) {
  return createServerSupabaseClient().rpc("save_ficha_atomic", {
    p_actor_id: actorId,
    p_ficha: getFichaPayload(values),
    p_ficha_id: fichaId,
    p_imagens: getFichaImagensPayload(values),
    p_itens: getFichaItensPayload(values),
  });
}
export async function createFichaAction(_previousState: FichaFormState, formData: FormData): Promise<FichaFormState> {
  const session = await requireAuthenticatedAction();

  const parsed = fichaFormSchema.safeParse(getFichaFormInput(formData));

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.issues.reduce<FieldErrors>((errors, issue) => {
        const field = issue.path[0];
        if (typeof field === "string") {
          const fieldName = field === "itens" ? "itensJson" : field === "imagens" ? "imagensJson" : field;
          errors[fieldName as keyof FieldErrors] = issue.message;
        }
        return errors;
      }, {}),
      message: "Revise os campos destacados antes de salvar a ficha.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Fichas indisponíveis.",
      status: "error",
    };
  }

  const { error } = await saveFichaAtomic(null, session.user.id, parsed.data);

  if (error) {
    return getActionError("fichas.save", error, "Não foi possível salvar a ficha.");
  }
  revalidatePath("/fichas");
  redirect("/fichas?saved=created");
}


export async function updateFichaAction(_previousState: FichaFormState, formData: FormData): Promise<FichaFormState> {
  const session = await requireAuthenticatedAction();

  const id = String(formData.get("id") ?? "").trim();
  const parsed = fichaFormSchema.safeParse(getFichaFormInput(formData));

  if (!id) {
    return {
      message: "Ficha inválida para edição.",
      status: "error",
    };
  }

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.issues.reduce<FieldErrors>((errors, issue) => {
        const field = issue.path[0];
        if (typeof field === "string") {
          const fieldName = field === "itens" ? "itensJson" : field === "imagens" ? "imagensJson" : field;
          errors[fieldName as keyof FieldErrors] = issue.message;
        }
        return errors;
      }, {}),
      message: "Revise os campos destacados antes de salvar a ficha.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Fichas indisponíveis.",
      status: "error",
    };
  }

  const { error } = await saveFichaAtomic(id, session.user.id, parsed.data);

  if (error) {
    return getActionError("fichas.save", error, "Não foi possível salvar a ficha.");
  }
  revalidatePath("/fichas");
  revalidatePath(`/fichas/${id}`);
  redirect("/fichas?saved=updated");
}

export async function markFichaEntregueAction(
  _previousState: FichaStatusActionState,
  formData: FormData,
): Promise<FichaStatusActionState> {
  const session = await requireAuthenticatedAction();

  const id = String(formData.get("id") ?? "").trim();
  const returnTo = getSafeReturnPath(formData.get("returnTo"));

  if (!id) {
    return {
      message: "Ficha inválida para entrega.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Fichas indisponíveis.",
      status: "error",
    };
  }

  const { error } = await createServerSupabaseClient().rpc("set_ficha_delivery_status_atomic", {
    p_actor_id: session.user.id,
    p_delivered: true,
    p_ficha_id: id,
  });

  if (error) {
    return {
      message: "Não foi possível marcar a ficha como entregue.",
      status: "error",
    };
  }
  revalidatePath("/meu-painel");
  revalidatePath("/fichas");
  revalidatePath("/relatorios");
  revalidatePath(`/fichas/${id}`);
  redirect(withToastParam(returnTo ?? "/fichas", "ficha-delivered"));
}

export async function markFichaEntregueFormAction(formData: FormData): Promise<void> {
  await markFichaEntregueAction({ status: "idle" }, formData);
}

export async function revertFichaToPendenteAction(
  _previousState: FichaStatusActionState,
  formData: FormData,
): Promise<FichaStatusActionState> {
  const session = await requireAuthenticatedAction();

  const id = String(formData.get("id") ?? "").trim();
  const returnTo = getSafeReturnPath(formData.get("returnTo"));

  if (!id) {
    return {
      message: "Ficha inválida para reversão.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Fichas indisponíveis.",
      status: "error",
    };
  }

  const { error } = await createServerSupabaseClient().rpc("set_ficha_delivery_status_atomic", {
    p_actor_id: session.user.id,
    p_delivered: false,
    p_ficha_id: id,
  });

  if (error) {
    return {
      message: "Não foi possível reabrir a ficha.",
      status: "error",
    };
  }
  revalidatePath("/meu-painel");
  revalidatePath("/fichas");
  revalidatePath("/relatorios");
  revalidatePath(`/fichas/${id}`);
  redirect(withToastParam(returnTo ?? "/fichas", "ficha-reverted"));
}

export async function revertFichaToPendenteFormAction(formData: FormData): Promise<void> {
  await revertFichaToPendenteAction({ status: "idle" }, formData);
}

export async function removeFichaListaIaAction(
  _previousState: FichaStatusActionState,
  formData: FormData,
): Promise<FichaStatusActionState> {
  return removeFichaListaField(formData, "lista_ia", "lista-ia-removed");
}

export async function removeFichaListaNomesRawAction(
  _previousState: FichaStatusActionState,
  formData: FormData,
): Promise<FichaStatusActionState> {
  return removeFichaListaField(formData, "lista_nomes_raw", "lista-raw-removed");
}

export async function deleteFichaAction(
  _previousState: FichaDeleteActionState,
  formData: FormData,
): Promise<FichaDeleteActionState> {
  await requireAuthenticatedAction();

  const id = String(formData.get("id") ?? "").trim();
  const confirmationInput = String(formData.get("confirmationInput") ?? "").trim().toUpperCase();
  const returnTo = getSafeReturnPath(formData.get("returnTo"));

  if (!id) {
    return {
      message: "Ficha inválida para exclusão.",
      status: "error",
    };
  }

  const confirmationCode = getFichaDeleteConfirmationCode(id);

  if (!confirmationCode || confirmationInput !== confirmationCode) {
    return {
      message: "Código de confirmação incorreto.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Fichas indisponíveis.",
      status: "error",
    };
  }

  const { data, error } = await createServerSupabaseClient().from("fichas").delete().eq("id", id).select("id").maybeSingle();

  if (error) {
    return getActionError("fichas.delete", error, "Não foi possível excluir a ficha.");
  }

  if (!data) {
    return {
      message: "Ficha não encontrada.",
      status: "error",
    };
  }
  revalidatePath("/fichas");
  revalidatePath("/relatorios");
  redirect(withToastParam(returnTo ?? "/fichas", "ficha-deleted"));
}

async function removeFichaListaField(
  formData: FormData,
  field: "lista_ia" | "lista_nomes_raw",
  toast: "lista-ia-removed" | "lista-raw-removed",
): Promise<FichaStatusActionState> {
  await requireAuthenticatedAction();

  const id = String(formData.get("id") ?? "").trim();
  const returnTo = getSafeReturnPath(formData.get("returnTo"));

  if (!id) {
    return {
      message: "Ficha inválida.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Fichas indisponíveis.",
      status: "error",
    };
  }

  const updatePayload = field === "lista_ia" ? { lista_ia: null } : { lista_nomes_raw: null };
  const { data, error } = await createServerSupabaseClient().from("fichas").update(updatePayload).eq("id", id).select("id").maybeSingle();

  if (error) {
    return getActionError("fichas.remove-list", error, "Não foi possível remover a lista.");
  }

  if (!data) {
    return {
      message: "Ficha não encontrada.",
      status: "error",
    };
  }

  revalidatePath("/fichas");
  revalidatePath(`/fichas/${id}`);
  redirect(withToastParam(returnTo ?? "/fichas", toast));
}

function getSafeReturnPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

function withToastParam(path: string, value: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("toast", value);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}
