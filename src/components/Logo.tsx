/**
 * Marca do Vitalog: cruz de saúde com degradê do verde para o branco.
 *
 * A cruz fica sobre um quadrado teal em vez de solta sobre a página: o degradê
 * termina em branco, e num fundo claro essa ponta simplesmente desapareceria.
 * O quadrado garante que a marca funcione nos dois temas e sobre qualquer
 * superfície.
 *
 * O `id` do gradiente é parametrizado porque a marca aparece mais de uma vez na
 * mesma página (cabeçalho e rodapé, por exemplo) e ids repetidos em SVG fazem o
 * navegador aplicar o primeiro a todos.
 */
export function LogoMark({
  size = 28,
  id = "vitalog-mark",
  className = "",
}: {
  size?: number;
  id?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Vitalog"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f8f88" />
          <stop offset="100%" stopColor="#0a625e" />
        </linearGradient>
        {/* Do verde (base esquerda) ao branco (topo direita).
            `userSpaceOnUse` é essencial: no padrão objectBoundingBox cada
            retângulo do grupo receberia a própria caixa, e a cruz sairia com
            dois degradês independentes em vez de um contínuo. As coordenadas
            vão da ponta de baixo à ponta de cima da cruz — não dos cantos da
            caixa, que numa cruz estão vazios e desperdiçariam metade da rampa
            em pixels que não existem. */}
        <linearGradient
          id={`${id}-cross`}
          gradientUnits="userSpaceOnUse"
          x1="34" y1="66" x2="66" y2="34"
        >
          <stop offset="0%" stopColor="#22b8a4" />
          <stop offset="55%" stopColor="#9eecdd" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>

      <rect width="100" height="100" rx="24" fill={`url(#${id}-bg)`} />
      <g fill={`url(#${id}-cross)`}>
        <rect x="37" y="18" width="26" height="64" rx="9" />
        <rect x="18" y="37" width="64" height="26" rx="9" />
      </g>
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <LogoMark size={size} />
      Vitalog
    </span>
  );
}
