"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { LogOut, PanelLeft, ArrowRightFromLine } from "lucide-react";
import type { AppSession } from "@/features/auth/types";
import { AppNavigation } from "./app-navigation";
import { MotionPage } from "./motion-page";
import { ThemeToggle } from "./theme-toggle";
import { PriscilaIcon } from "./branding";

type AppShellProps = {
  children: ReactNode;
  session: AppSession | null;
  title?: string;
};

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";
const SIDEBAR_STATE_EVENT = "app:sidebar-collapsed-change";

export function AppShell({ children, session, title }: AppShellProps) {
  const collapsed = useSyncExternalStore(subscribeToSidebarState, getSidebarStateSnapshot, getServerSidebarStateSnapshot);

  function toggle() {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!collapsed));
    window.dispatchEvent(new Event(SIDEBAR_STATE_EVENT));
  }

  return (
    <div className={`app-frame${collapsed ? " app-frame--collapsed" : ""}`}>
      <aside
        className={`app-sidebar${collapsed ? " app-sidebar--collapsed" : ""}`}
        aria-label="Navegação principal"
      >
        <div className="app-brand-row">
          <Link className="app-brand" href="/">
            <span className="app-brand__mark" aria-hidden="true">
              <PriscilaIcon height={22} />
            </span>
            <span className="app-brand__text" translate="no">
              Fichas Tecnicas
            </span>
          </Link>
          <button
            className="app-sidebar__toggle"
            onClick={toggle}
            type="button"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed
              ? <ArrowRightFromLine size={16} aria-hidden="true" />
              : <PanelLeft size={16} aria-hidden="true" />
            }
          </button>
        </div>
        <AppNavigation role={session?.user.role ?? "operador"} collapsed={collapsed} />
        <div className="app-sidebar__footer">
          {session && !collapsed ? (
            <div className="app-user" aria-label="Usuário atual">
              <span className="app-user__name">{session.user.displayName}</span>
            </div>
          ) : null}
          <ThemeToggle />
          {session ? (
            <form action="/logout" method="post">
              <button
                className="app-logout"
                type="submit"
                title={collapsed ? "Sair" : undefined}
              >
                <LogOut aria-hidden="true" size={16} />
                {!collapsed && <span>Sair</span>}
              </button>
            </form>
          ) : null}
        </div>
      </aside>
      <main id="conteudo" className="app-shell" aria-label={title}>
        <MotionPage>{children}</MotionPage>
      </main>
    </div>
  );
}

function subscribeToSidebarState(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_STATE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_STATE_EVENT, onStoreChange);
  };
}

function getSidebarStateSnapshot() {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getServerSidebarStateSnapshot() {
  return false;
}
