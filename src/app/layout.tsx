import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://vita-log-eight.vercel.app"),
  title: "Vitalog — histórico de exames e vacinas",
  description:
    "Reúne exames laboratoriais de uma vida inteira em séries comparáveis, extraindo os dados direto do PDF do laboratório.",
  applicationName: "Vitalog",
  // Habilita "Adicionar à Tela de Início" no iOS abrindo em tela cheia, sem a
  // barra do Safari. statusBarStyle fica em "default" de propósito: com
  // "black-translucent" o conteúdo passa por baixo da barra de status e o
  // cabeçalho do app ficaria encoberto.
  appleWebApp: {
    capable: true,
    title: "Vitalog",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // O Next 16 emite apenas o nome padronizado `mobile-web-app-capable`, que é o
  // correto — mas iOS anterior ao 16.4 não lê o `display: standalone` do
  // manifest e depende da tag antiga da Apple para abrir em tela cheia.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Vitalog — histórico de exames e vacinas",
    description:
      "Exames espalhados por vários laboratórios, reunidos em séries comparáveis.",
    locale: "pt_BR",
    type: "website",
  },
};

/**
 * A cor da barra do navegador acompanha o tema do sistema, igual ao resto do
 * app. Sem isto, o topo do celular fica branco sobre uma interface escura.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
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
        {/* No celular a navegação vai para uma segunda linha, ocupando a largura
            toda. Em uma linha só, com 375px, "Conferência" saía da tela e ficava
            inacessível — e "Enviar laudo" quebrava no meio. */}
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm text-white"
              >
                V
              </span>
              Vitalog
            </Link>
            <nav className="-mx-1 flex w-full items-center gap-0.5 overflow-x-auto text-sm sm:w-auto sm:gap-1 sm:overflow-visible">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
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
