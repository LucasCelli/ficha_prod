import type { AppUserRole } from "@/features/auth/types";

type NavigationItem = {
  href: string;
  label: string;
  roles?: readonly AppUserRole[];
};

export const mainNavigation: readonly NavigationItem[] = [
  {
    href: "/",
    label: "Início",
  },
  {
    href: "/fichas",
    label: "Fichas",
  },
  {
    href: "/quadro-producao",
    label: "Quadro de Produção",
  },
  {
    href: "/ia",
    label: "IA",
  },
  {
    href: "/clientes",
    label: "Clientes",
  },
  {
    href: "/catalogos",
    label: "Catálogos",
    roles: ["superadmin"],
  },
  {
    href: "/usuarios",
    label: "Usuários",
    roles: ["superadmin"],
  },
  {
    href: "/relatorios",
    label: "Relatórios",
  },
];
