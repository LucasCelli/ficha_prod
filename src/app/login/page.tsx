import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { getCurrentSession } from "@/features/auth/session";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Login | Fichas Tecnicas",
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getCurrentSession();
  if (session) redirect("/");

  const params = await searchParams;
  const next = Array.isArray(params?.next) ? params?.next[0] : params?.next;

  return (
    <main className="auth-page" aria-labelledby="login-title">
      <section className="auth-shell">
        <div className="auth-copy">
          <Badge tone="info">Acesso operacional</Badge>
          <h1 id="login-title">Fichas Tecnicas</h1>
          <p>Entre com usuario e PIN para acessar os fluxos de producao, clientes e relatorios.</p>
        </div>
        <Card className="auth-card">
          <h2>Entrar</h2>
          <LoginForm next={next} />
        </Card>
      </section>
    </main>
  );
}
