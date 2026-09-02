import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vitalog — histórico de exames e vacinas",
  description:
    "Reúne exames laboratoriais de uma vida inteira em séries comparáveis, extraindo os dados direto do PDF do laboratório.",
};

const NAV = [
  { href: "/painel", label: "Painel" },
  { href: "/vacinas", label: "Vacinas" },
  { href: "/enviar", label: "Enviar laudo" },
  { href: "/revisar", label: "Conferência" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3.5">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm text-white"
              >
                V
              </span>
              Vitalog
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted">
          Projeto de portfólio. Dados de demonstração são sintéticos — nenhum dado
          real de saúde. Não substitui avaliação médica.
        </footer>
      </body>
    </html>
  );
}
