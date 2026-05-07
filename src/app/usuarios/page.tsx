import type { Metadata } from "next";
import { requireSuperadmin } from "@/features/auth/session";
import { listOperadores } from "@/features/usuarios/data";
import { UsuariosOverview } from "@/features/usuarios/usuarios-overview";

export const metadata: Metadata = {
  title: "Usuários - Fichas Técnicas",
};

type UsuariosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  await requireSuperadmin();

  const params = await searchParams;
  const editId = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const modalMode = Array.isArray(params.modal) ? params.modal[0] : params.modal;
  const result = await listOperadores();

  return <UsuariosOverview editId={editId} modalMode={modalMode} result={result} />;
}
