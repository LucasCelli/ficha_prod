import type { CustomDatalistOption } from "@/components/ui";
import { listCatalogOptionsForFichaForm, type CatalogOptionsByKind } from "@/features/catalogos/data";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type FichaFormOptions = {
  catalogOptions: CatalogOptionsByKind;
  clienteOptions: CustomDatalistOption[];
  vendedorOptions: CustomDatalistOption[];
};

const CLIENTE_OPTIONS_LIMIT = 500;
const VENDEDOR_OPTIONS_LIMIT = 1000;

export async function listFichaFormOptions(): Promise<FichaFormOptions> {
  const catalogOptions = await listCatalogOptionsForFichaForm();

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      catalogOptions,
      clienteOptions: [],
      vendedorOptions: [],
    };
  }

  const supabase = createServerSupabaseClient();
  const [clientesResult, vendedoresResult] = await Promise.all([
    supabase
      .from("clientes")
      .select("nome,email,telefone")
      .order("nome", { ascending: true })
      .limit(CLIENTE_OPTIONS_LIMIT),
    supabase
      .from("fichas")
      .select("vendedor")
      .not("vendedor", "is", null)
      .order("vendedor", { ascending: true })
      .limit(VENDEDOR_OPTIONS_LIMIT),
  ]);

  return {
    catalogOptions,
    clienteOptions: (clientesResult.data ?? [])
      .filter((cliente) => cliente.nome?.trim())
      .map((cliente) => ({
        aliases: [cliente.email, cliente.telefone].filter((value): value is string => Boolean(value?.trim())),
        label: cliente.nome,
        value: cliente.nome,
      })),
    vendedorOptions: buildUniqueVendedorOptions(vendedoresResult.data ?? []),
  };
}

function buildUniqueVendedorOptions(rows: Array<{ vendedor: string | null }>): CustomDatalistOption[] {
  const options = new Map<string, string>();

  rows.forEach((row) => {
    const vendedor = row.vendedor?.trim();
    if (!vendedor) return;

    const key = vendedor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (!options.has(key)) {
      options.set(key, vendedor);
    }
  });

  return Array.from(options.values())
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
    .map((vendedor) => ({
      label: vendedor,
      value: vendedor,
    }));
}
