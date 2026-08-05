import type { Metadata } from "next";
import { UniformListParserDemo } from "@/components/ai/uniform-list-parser-demo";
import { requireAppSession } from "@/features/auth/session";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Organizar nomes com IA | Fichas Tecnicas",
};

type OrganizarNomesIaPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type FichaListaRawRow = {
  cliente_nome_snapshot: string;
  data_entrega: string;
  ficha_imagens?: { url: string }[] | null;
  ficha_itens?: { quantidade: number | null }[] | null;
  id: string;
  lista_ia_anexada: boolean;
  lista_nomes_raw: string | null;
  numero_venda: string | null;
};

export default async function OrganizarNomesIaPage({ searchParams }: OrganizarNomesIaPageProps) {
  const params = await searchParams;
  const fichaIdParam = params?.fichaId;
  const fichaId = Array.isArray(fichaIdParam) ? fichaIdParam[0] : fichaIdParam;
  const ficha = fichaId ? await getFichaListaRaw(fichaId) : null;

  return (
    <UniformListParserDemo
      initialFicha={
        ficha
          ? {
              cliente: ficha.cliente_nome_snapshot,
              dataEntrega: ficha.data_entrega,
              id: ficha.id,
              imagemUrl: ficha.ficha_imagens?.[0]?.url ?? null,
              itensTotal: (ficha.ficha_itens ?? []).reduce((total, item) => total + (item.quantidade ?? 0), 0),
              listaIaAnexada: ficha.lista_ia_anexada,
              numeroVenda: ficha.numero_venda,
            }
          : null
      }
      initialText={ficha?.lista_nomes_raw ?? ""}
    />
  );
}

async function getFichaListaRaw(fichaId: string): Promise<FichaListaRawRow | null> {
  await requireAppSession();

  if (!getSupabaseConfigStatus().hasServerConfig) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("fichas")
    .select(
      "id, numero_venda, cliente_nome_snapshot, data_entrega, lista_ia_anexada, lista_nomes_raw, ficha_itens(quantidade), ficha_imagens(url)",
    )
    .eq("id", fichaId)
    .maybeSingle<FichaListaRawRow>();

  if (error || !data) return null;
  return data;
}
