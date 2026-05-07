import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { AppShell } from "@/components/ui";
import { AppClientProviders } from "@/components/ui/app-client-providers";
import { getCurrentSession } from "@/features/auth/session";
import "@/styles/globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fichas Tecnicas",
  description: "Fichas tecnicas de producao.",
};

function normalizeTheme(value: string | undefined) {
  return value === "dark" ? "dark" : "light";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headersList = await headers();
  const theme = normalizeTheme(cookieStore.get("ficha_theme_preference")?.value);
  const pathname = headersList.get("x-ficha-pathname");
  const isLoginRoute = pathname === "/login" || Boolean(pathname?.startsWith("/login/"));
  const session = await getCurrentSession();

  if (pathname && !session && !isLoginRoute) {
    redirect("/login");
  }

  if (session && isLoginRoute) {
    redirect("/");
  }

  if (session?.user.role !== "superadmin" && (pathname?.startsWith("/catalogos") || pathname?.startsWith("/usuarios"))) {
    redirect("/");
  }

  return (
    <html data-scroll-behavior="smooth" data-theme={theme} lang="pt-BR">
      <body className={plusJakarta.variable}>
        <AppClientProviders>
          <a className="skip-link" href="#conteudo">
            Pular para o conteudo
          </a>
          {isLoginRoute ? children : <AppShell session={session} title="Aplicacao Fichas Tecnicas">{children}</AppShell>}
          <Toaster
            toastOptions={{
              classNames: {
                loading: "toast-loading-minimal",
              },
            }}
            position="bottom-center"
          />
        </AppClientProviders>
      </body>
    </html>
  );
}
