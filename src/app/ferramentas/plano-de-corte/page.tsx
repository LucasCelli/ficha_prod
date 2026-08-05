import type { Metadata } from "next";
import { requireAppSession } from "@/features/auth/session";
import { PlanoDeCorteWorkspace } from "@/features/plano-de-corte/plano-de-corte-workspace";

export const metadata: Metadata = { title: "Plano de Corte | Fichas Técnicas" };

export default async function PlanoDeCortePage() {
  await requireAppSession();
  return <PlanoDeCorteWorkspace />;
}
