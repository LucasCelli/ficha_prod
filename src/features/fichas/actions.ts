"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/features/auth/session";
import { resolveDefaultKanbanColumnId } from "@/features/quadro-producao/data";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FichaDeleteActionState, FichaFormState, FichaStatusActionState, FieldErrors } from "./form-state";
import { fichaFormSchema, type FichaFormValues } from "./schema";

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
    corMaterial: formData.get("corMaterial"),
    manga: formData.get("manga"),
    acabamentoManga: formData.get("acabamentoManga"),
    corAcabamentoManga: formData.get("corAcabamentoManga"),
    larguraManga: formData.get("larguraManga"),
    gola: formData.get("gola"),
    acabamentoGola: formData.get("acabamentoGola"),
    corGola: formData.get("corGola"),
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
    observacoes: formData.get("observacoes"),
    evento: formData.get("evento"),
  };
}

function getFichaPayload(values: FichaFormValues) {
  return {
    acabamento_gola: values.acabamentoGola,
    acabamento_manga: values.acabamentoManga,
    abertura_lateral: values.aberturaLateral,
    bolso: values.bolso,
    com_nomes: values.comNomes,
    composicao: values.composicao,
    cor_abertura_lateral: values.corAberturaLateral,
    cor_acabamento_manga: values.corAcabamentoManga,
    cor_botao: values.corBotao,
    cor_gola: values.corGola,
    cor_material: values.corMaterial,
    cor_pe_de_gola_externo: values.corPeDeGolaExterno,
    cor_pe_de_gola_interno: values.corPeDeGolaInterno,
    cor_peitilho_externo: values.corPeitilhoExterno,
    cor_peitilho_interno: values.corPeitilhoInterno,
    cor_reforco: values.corReforco,
    cor_sublimacao: values.corSublimacao,
    faixa: values.faixa,
    faixa_cor: values.faixaCor,
    faixa_local: values.faixaLocal,
    filete: values.filete,
    filete_cor: values.fileteCor,
    filete_local: values.fileteLocal,
    gola: values.gola,
    largura_gola: values.larguraGola,
    largura_manga: values.larguraManga,
    manga: values.manga,
    material: values.material,
    reforco_gola: values.reforcoGola,
  };
}

function getFichaItensPayload(fichaId: string, values: FichaFormValues) {
  return values.itens.map((item, index) => ({
    descricao: item.produto,
    detalhes_produto: item.detalhesProduto,
    ficha_id: fichaId,
    ordem: index,
    produto: item.produto,
    quantidade: item.quantidade,
    tamanho: item.tamanho,
  }));
}

function getFichaImagensPayload(fichaId: string, values: FichaFormValues) {
  return values.imagens.map((image, index) => ({
    alt_text: image.altText,
    bytes: image.bytes,
    dados: {
      publicId: image.publicId,
    },
    ficha_id: fichaId,
    height: image.height,
    ordem: index,
    storage_path: image.publicId,
    url: image.secureUrl,
    width: image.width,
  }));
}

export async function createFichaAction(_previousState: FichaFormState, formData: FormData): Promise<FichaFormState> {
  await requireAppSession();

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
      message: "Configure as variáveis de ambiente do Supabase para salvar fichas.",
      status: "error",
    };
  }

  const supabase = createServerSupabaseClient();
  const clienteId = await resolveClienteId(parsed.data.cliente, parsed.data.dataEntrega, "create");
  const defaultKanbanColumnId = await resolveDefaultKanbanColumnId("pendente");
  const { data: fichaCriada, error } = await supabase
    .from("fichas")
    .insert({
      ...getFichaPayload(parsed.data),
      arte: parsed.data.arte,
      cliente_id: clienteId,
      cliente_auxiliar: parsed.data.clienteAuxiliar,
      cliente_nome_snapshot: parsed.data.cliente,
      data_inicio: parsed.data.dataInicio,
      data_entrega: parsed.data.dataEntrega,
      evento: parsed.data.evento,
      kanban_column_id: defaultKanbanColumnId ?? undefined,
      kanban_ordem: 0,
      kanban_status: "pendente",
      kanban_status_updated_at: new Date().toISOString(),
      numero_venda: parsed.data.numeroVenda,
      observacoes: parsed.data.observacoes,
      vendedor: parsed.data.vendedor,
    })
    .select("id")
    .single();

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  if (fichaCriada?.id) {
    const { error: itensError } = await supabase.from("ficha_itens").insert(getFichaItensPayload(fichaCriada.id, parsed.data));

    if (itensError) {
      await rollbackCreatedFicha(fichaCriada.id);
      return {
        message: itensError.message,
        status: "error",
      };
    }

    if (parsed.data.imagens.length > 0) {
      const { error: imagensError } = await supabase
        .from("ficha_imagens")
        .insert(getFichaImagensPayload(fichaCriada.id, parsed.data));

      if (imagensError) {
        await rollbackCreatedFicha(fichaCriada.id);
        return {
          message: imagensError.message,
          status: "error",
        };
      }
    }
  }

  revalidatePath("/fichas");
  redirect("/fichas?saved=created");
}

async function rollbackCreatedFicha(id: string) {
  const supabase = createServerSupabaseClient();
  await supabase.from("ficha_imagens").delete().eq("ficha_id", id);
  await supabase.from("ficha_itens").delete().eq("ficha_id", id);
  await supabase.from("fichas").delete().eq("id", id);
}

export async function updateFichaAction(_previousState: FichaFormState, formData: FormData): Promise<FichaFormState> {
  await requireAppSession();

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
      message: "Configure as variáveis de ambiente do Supabase para editar fichas.",
      status: "error",
    };
  }

  const supabase = createServerSupabaseClient();
  const clienteId = await resolveClienteId(parsed.data.cliente, parsed.data.dataEntrega, "update");
  const { error } = await supabase
    .from("fichas")
    .update({
      ...getFichaPayload(parsed.data),
      arte: parsed.data.arte,
      cliente_id: clienteId,
      cliente_auxiliar: parsed.data.clienteAuxiliar,
      cliente_nome_snapshot: parsed.data.cliente,
      data_inicio: parsed.data.dataInicio,
      data_entrega: parsed.data.dataEntrega,
      evento: parsed.data.evento,
      numero_venda: parsed.data.numeroVenda,
      observacoes: parsed.data.observacoes,
      vendedor: parsed.data.vendedor,
    })
    .eq("id", id);

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  const { error: deleteItensError } = await supabase.from("ficha_itens").delete().eq("ficha_id", id);

  if (deleteItensError) {
    return {
      message: deleteItensError.message,
      status: "error",
    };
  }

  const { error: itensError } = await supabase.from("ficha_itens").insert(getFichaItensPayload(id, parsed.data));

  if (itensError) {
    return {
      message: itensError.message,
      status: "error",
    };
  }

  const { error: deleteImagensError } = await supabase.from("ficha_imagens").delete().eq("ficha_id", id);

  if (deleteImagensError) {
    return {
      message: deleteImagensError.message,
      status: "error",
    };
  }

  if (parsed.data.imagens.length > 0) {
    const { error: imagensError } = await supabase.from("ficha_imagens").insert(getFichaImagensPayload(id, parsed.data));

    if (imagensError) {
      return {
        message: imagensError.message,
        status: "error",
      };
    }
  }

  revalidatePath("/fichas");
  revalidatePath(`/fichas/${id}`);
  redirect("/fichas?saved=updated");
}

export async function markFichaEntregueAction(
  _previousState: FichaStatusActionState,
  formData: FormData,
): Promise<FichaStatusActionState> {
  await requireAppSession();

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
      message: "Configure as variáveis de ambiente do Supabase para marcar fichas como entregues.",
      status: "error",
    };
  }

  const { error } = await createServerSupabaseClient()
    .from("fichas")
    .update({
      delivered_at: new Date().toISOString(),
      status: "entregue",
    })
    .eq("id", id);

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  revalidatePath("/fichas");
  revalidatePath("/relatorios");
  revalidatePath(`/fichas/${id}`);
  redirect(returnTo ?? "/fichas");
}

export async function markFichaEntregueFormAction(formData: FormData): Promise<void> {
  await markFichaEntregueAction({ status: "idle" }, formData);
}

export async function revertFichaToPendenteAction(
  _previousState: FichaStatusActionState,
  formData: FormData,
): Promise<FichaStatusActionState> {
  await requireAppSession();

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
      message: "Configure as variáveis de ambiente do Supabase para reverter fichas para pendente.",
      status: "error",
    };
  }

  const { error } = await createServerSupabaseClient()
    .from("fichas")
    .update({
      delivered_at: null,
      status: "pendente",
    })
    .eq("id", id);

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  revalidatePath("/fichas");
  revalidatePath("/relatorios");
  revalidatePath(`/fichas/${id}`);
  redirect(returnTo ?? "/fichas");
}

export async function revertFichaToPendenteFormAction(formData: FormData): Promise<void> {
  await revertFichaToPendenteAction({ status: "idle" }, formData);
}

export async function deleteFichaAction(
  _previousState: FichaDeleteActionState,
  formData: FormData,
): Promise<FichaDeleteActionState> {
  await requireAppSession();

  const id = String(formData.get("id") ?? "").trim();
  const confirmationCode = String(formData.get("confirmationCode") ?? "").trim().toUpperCase();
  const confirmationInput = String(formData.get("confirmationInput") ?? "").trim().toUpperCase();
  const returnTo = getSafeReturnPath(formData.get("returnTo"));

  if (!id) {
    return {
      message: "Ficha inválida para exclusão.",
      status: "error",
    };
  }

  if (!confirmationCode || confirmationInput !== confirmationCode) {
    return {
      message: "Código de confirmação incorreto.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Configure as variáveis de ambiente do Supabase para excluir fichas.",
      status: "error",
    };
  }

  const supabase = createServerSupabaseClient();
  const { error: imagensError } = await supabase.from("ficha_imagens").delete().eq("ficha_id", id);

  if (imagensError) {
    return {
      message: imagensError.message,
      status: "error",
    };
  }

  const { error: itensError } = await supabase.from("ficha_itens").delete().eq("ficha_id", id);

  if (itensError) {
    return {
      message: itensError.message,
      status: "error",
    };
  }

  const { error } = await supabase.from("fichas").delete().eq("id", id);

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  revalidatePath("/fichas");
  revalidatePath("/relatorios");
  redirect(returnTo ?? "/fichas");
}

function getSafeReturnPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

async function resolveClienteId(nome: string, dataEntrega: string, mode: "create" | "update") {
  const supabase = createServerSupabaseClient();
  const nomeNormalizado = nome.trim().toLowerCase();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, total_fichas, primeira_ficha")
    .eq("nome_normalizado", nomeNormalizado)
    .maybeSingle();

  if (cliente) {
    if (mode === "create") {
      await supabase
        .from("clientes")
        .update({
          total_fichas: cliente.total_fichas + 1,
          ultima_ficha: dataEntrega,
        })
        .eq("id", cliente.id);
    }

    return cliente.id;
  }

  const { data: novoCliente } = await supabase
    .from("clientes")
    .insert({
      nome,
      primeira_ficha: dataEntrega,
      ultima_ficha: dataEntrega,
      total_fichas: 1,
    })
    .select("id")
    .single();

  return novoCliente?.id ?? null;
}
