import type { MetadataRoute } from "next";

/**
 * Manifest do PWA — é o que permite "Adicionar à Tela de Início".
 *
 * `start_url` aponta para /painel, não para a landing: um app instalado abre no
 * lugar onde se trabalha, não na página que explica o projeto para quem chega
 * de fora.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vitalog — histórico de exames e vacinas",
    short_name: "Vitalog",
    description:
      "Reúne exames laboratoriais de uma vida inteira em séries comparáveis, extraindo os dados direto do PDF do laboratório.",
    lang: "pt-BR",
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    background_color: "#fbfcfd",
    theme_color: "#fbfcfd",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // "maskable" tem margem extra: o Android recorta o ícone em círculo ou
      // squircle, e sem a zona segura o "V" sairia com as pontas cortadas.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Painel", short_name: "Painel", url: "/painel" },
      { name: "Vacinas", short_name: "Vacinas", url: "/vacinas" },
      { name: "Conferência", short_name: "Conferir", url: "/revisar" },
    ],
  };
}
