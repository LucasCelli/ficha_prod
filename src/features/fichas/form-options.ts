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
const VENDEDOR_OPTIONS_LIMIT = 500;

export async function listFichaFormOptions(): Promise<FichaFormOptions> {
  const catalogOptionsPromise = listCatalogOptionsForFichaForm();

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      catalogOptions: await catalogOptionsPromise,
      clienteOptions: [],
      vendedorOptions: [],
    };
  }

  const supabase = createServerSupabaseClient();
  const [catalogOptions, clientesResult, vendedoresResult] = await Promise.all([
    catalogOptionsPromise,
    supabase
      .from("clientes")
      .select("nome,email,telefone")
      .order("nome", { ascending: true })
      .limit(CLIENTE_OPTIONS_LIMIT),
    supabase
      .from("app_users")
      .select("id,display_name")
      .eq("role", "vendedor")
      .eq("active", true)
      .order("display_name", { ascending: true })
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
    vendedorOptions: (vendedoresResult.data ?? []).map((vendedor) => ({
      id: vendedor.id,
      label: vendedor.display_name,
      value: vendedor.display_name,
    })),
  };
}
