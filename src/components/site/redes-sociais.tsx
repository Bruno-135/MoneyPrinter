import type { RedeSocial, SiteSocial } from '@/lib/sites/content';

/**
 * As redes sociais do comércio, em símbolos, no rodapé.
 *
 * Muitos destes comércios não têm site e puseram o Instagram no lugar dele —
 * é literalmente por isso que estão na lista de prospeção. Na página do
 * próprio, essa ligação deixa de ser o sinal de fraqueza que o pôs na lista e
 * passa a ser o sítio para onde mandar quem quer ver mais fotografias do que
 * as que cabem aqui.
 *
 * Os símbolos são desenhados aqui, em formas simples, e não carregados de
 * lado nenhum: um símbolo de rede social num ficheiro externo é mais um
 * pedido, mais uma coisa que pode faltar, e — pior — mais uma imagem que os
 * motores de impressão do telemóvel gostam de deitar fora. Estes são parte da
 * página e vão a todo o lado com ela, incluindo para dentro do PDF.
 */

const NOMES: Record<RedeSocial, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  linktree: 'Linktree',
};

/**
 * Cada símbolo é feito de formas geométricas simples: um quadrado de cantos
 * redondos, um círculo, um triângulo. Não são reproduções exatas das marcas —
 * são o desenho reconhecível de cada uma, que é o que faz uma pessoa perceber
 * onde vai carregar. O nome vai no `aria-label`, para quem usa leitor de ecrã
 * ouvir "Instagram" e não "ligação".
 */
function Simbolo({ rede }: { rede: RedeSocial }) {
  const comuns = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    focusable: false,
  } as const;

  switch (rede) {
    case 'instagram':
      return (
        <svg {...comuns} fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'facebook':
      // Um "f" feito de dois retângulos dentro de um círculo cheio. O vazado
      // usa a cor do papel, para o símbolo funcionar em fundo claro e escuro.
      return (
        <svg {...comuns} fill="currentColor">
          <circle cx="12" cy="12" r="9.5" />
          <path
            d="M13.6 7.6h1.6V5.2h-2.1c-1.9 0-3 1.1-3 3v1.9H8.4v2.4h1.7v6.3h2.6v-6.3h1.9l.3-2.4h-2.2V8.7c0-.7.3-1.1.9-1.1z"
            fill="var(--site-bg)"
          />
        </svg>
      );

    case 'youtube':
      return (
        <svg {...comuns} fill="currentColor">
          <rect x="2" y="5.5" width="20" height="13" rx="4" />
          <path d="M10.2 9.2v5.6l4.9-2.8z" fill="var(--site-bg)" />
        </svg>
      );

    case 'tiktok':
      // Uma nota musical: a haste e a cabeça, mais o gancho que a distingue.
      return (
        <svg {...comuns} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <path d="M13.5 3.5v11.2a3.4 3.4 0 1 1-3.4-3.4" />
          <path d="M13.5 5.2c.6 1.9 2.2 3.2 4.2 3.3" />
        </svg>
      );

    case 'linkedin':
      return (
        <svg {...comuns} fill="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="3.5" />
          <circle cx="7.6" cy="7.8" r="1.4" fill="var(--site-bg)" />
          <rect x="6.4" y="10.2" width="2.4" height="7.4" fill="var(--site-bg)" />
          <path
            d="M11 10.2h2.3v1a2.9 2.9 0 0 1 2.4-1.2c1.8 0 2.9 1.1 2.9 3.2v4.4h-2.4v-4c0-1-.4-1.6-1.3-1.6-.8 0-1.5.6-1.5 1.7v3.9H11z"
            fill="var(--site-bg)"
          />
        </svg>
      );

    case 'linktree':
      // Não é a marca do Linktree: é o símbolo de "abre noutro sítio". A
      // primeira tentativa de desenhar a árvore de ligações saiu parecida com
      // um ideograma, e um símbolo que se percebe mal é pior do que um símbolo
      // genérico que se percebe bem.
      return (
        <svg
          {...comuns}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 4.5h5.5V10" />
          <path d="M19.5 4.5 11 13" />
          <path d="M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5V8.5A1.5 1.5 0 0 1 5.5 7H10" />
        </svg>
      );
  }
}

export function RedesSociais({ redes }: { redes: readonly SiteSocial[] }) {
  if (redes.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center justify-center gap-2.5">
      {redes.map((rede) => (
        <li key={rede.rede}>
          <a
            href={rede.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={NOMES[rede.rede]}
            title={NOMES[rede.rede]}
            className="flex size-10 items-center justify-center rounded-full border border-[var(--site-line)] text-[var(--site-fg)] opacity-70"
          >
            <Simbolo rede={rede.rede} />
          </a>
        </li>
      ))}
    </ul>
  );
}
