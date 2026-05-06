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
    label: "Início",
    description: "Visão geral da migração",
  },
  {
    href: "/fichas",
    label: "Fichas",
    description: "Centro operacional",
  },
  {
    href: "/quadro-producao",
    label: "Quadro de Produção",
    description: "Kanban de operação",
  },
  {
    href: "/clientes",
    label: "Clientes",
    description: "Cadastro e histórico",
  },
  {
    href: "/catalogos",
    label: "Catálogos",
    description: "Produtos e opções",
    roles: ["superadmin"],
  },
  {
    href: "/usuarios",
    label: "Usuários",
    description: "Acessos e perfis",
    roles: ["superadmin"],
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    description: "Indicadores e exportações",
  },
];
