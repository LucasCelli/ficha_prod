import type { AppUserRole } from "@/features/auth/types";

type NavigationItem = {
  description: string;
  href: string;
  label: string;
  roles?: readonly AppUserRole[];
};

export const mainNavigation: readonly NavigationItem[] = [
  {
    href: "/",
    label: "Inicio",
    description: "Visao geral da migracao",
  },
  {
    href: "/fichas",
    label: "Fichas",
    description: "Centro operacional",
  },
  {
    href: "/clientes",
    label: "Clientes",
    description: "Cadastro e historico",
  },
  {
    href: "/catalogos",
    label: "Catalogos",
    description: "Produtos e opcoes",
    roles: ["superadmin"],
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    description: "Acessos e perfis",
    roles: ["superadmin"],
  },
  {
    href: "/relatorios",
    label: "Relatorios",
    description: "Indicadores e exportacoes",
  },
];
