import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/features/auth/session";
import { LoginForm } from "@/features/auth/login-form";
import { AuthCardWrap } from "@/features/auth/auth-card";
import { PriscilaLogo } from "@/components/ui/branding";

export const metadata: Metadata = {
  title: "Login | Fichas Técnicas",
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
    <main className="auth-page">
      <AuthCardWrap>
        <section className="auth-card" aria-labelledby="login-title">
          <div className="auth-card-brand" aria-hidden="true">
            <PriscilaLogo height={96} />
            <span translate="no">Sistema de Fichas Técnicas</span>
          </div>
          <h1 id="login-title" className="auth-form-title">Entrar</h1>
          <LoginForm next={next} />
        </section>
      </AuthCardWrap>
    </main>
  );
}
