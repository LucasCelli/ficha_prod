import type { Metadata } from "next";
import { requireAppSession } from "@/features/auth/session";
import { PlanoDeCorteWorkspace } from "@/features/plano-de-corte/plano-de-corte-workspace";
import { listCatalogOptionsForFichaForm, listCatalogSizesForCutPlan } from "@/features/catalogos/data";

export const metadata: Metadata = { title: "Plano de Corte | Fichas Técnicas" };

export default async function PlanoDeCortePage() {
  await requireAppSession();
  const [catalogSizes, catalogOptions] = await Promise.all([
    listCatalogSizesForCutPlan(),
    listCatalogOptionsForFichaForm(),
  ]);
  return <PlanoDeCorteWorkspace catalogFabricOptions={catalogOptions.tecido} catalogSizes={catalogSizes} />;
}
