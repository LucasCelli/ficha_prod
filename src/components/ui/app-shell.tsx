import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import type { AppSession } from "@/features/auth/types";
import { AppNavigation } from "./app-navigation";
import { MotionPage } from "./motion-page";
import { ThemeToggle } from "./theme-toggle";

type AppShellProps = {
  children: ReactNode;
  session: AppSession | null;
  title?: string;
};

export function AppShell({ children, session, title }: AppShellProps) {
  return (
    <div className="app-frame">
      <aside className="app-sidebar" aria-label="Navegação principal">
        <Link className="app-brand" href="/">
          <span className="app-brand__mark" aria-hidden="true">
            FT
          </span>
          <span className="app-brand__text" translate="no">
            Fichas Tecnicas
          </span>
        </Link>
        <AppNavigation role={session?.user.role ?? "operador"} />
        <div className="app-sidebar__footer">
          {session ? (
            <div className="app-user" aria-label="Usuário atual">
              <span className="app-user__name">{session.user.displayName}</span>
            </div>
          ) : null}
          <ThemeToggle />
          {session ? (
            <form action="/logout" method="post">
              <button className="app-logout" type="submit">
                <LogOut aria-hidden="true" size={16} />
                <span>Sair</span>
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
