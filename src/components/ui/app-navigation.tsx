"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Users,
  UserCog,
  Database,
  BarChart3,
} from "lucide-react";
import { mainNavigation } from "@/lib/navigation";
import type { AppUserRole } from "@/features/auth/types";

const iconMap: Record<string, typeof Home> = {
  "/": Home,
  "/fichas": FileText,
  "/clientes": Users,
  "/catalogos": Database,
  "/usuarios": UserCog,
  "/relatorios": BarChart3,
};

type AppNavigationProps = {
  role: AppUserRole;
};

export function AppNavigation({ role }: AppNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Módulos principais">
      {mainNavigation.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
        const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = iconMap[item.href] ?? FileText;

        return (
          <Link className="app-nav__link" href={item.href} key={item.href} aria-current={isActive ? "page" : undefined}>
            <span className="app-nav__icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className="app-nav__copy">
              <span>{item.label}</span>
              <small>{item.description}</small>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
