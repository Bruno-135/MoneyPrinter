import type { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/env';
import { PAGINAS } from '@/lib/vaidesign/desenho/pagina';
import { PREFIXO, REGIOES } from '@/lib/vaidesign/regiao';

/**
 * O mapa do site, com as duas versões.
 *
 * Cada página aparece duas vezes — uma por região — e cada entrada diz que a
 * outra é a mesma página noutra língua. Sem isso, o Google escolhe uma das
 * duas e esconde a outra por a achar conteúdo copiado; com isso, mostra a de
 * Portugal a quem pesquisa de Portugal e a do Brasil a quem pesquisa de lá,
 * que é exactamente o que se quer.
 */

const ROTA_DA_PAGINA: Record<(typeof PAGINAS)[number], string> = {
  inicio: '',
  servicos: '/servicos',
  modelos: '/modelos',
  sobre: '/sobre',
  contacto: '/contacto',
};

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

  return REGIOES.flatMap((regiao) =>
    PAGINAS.map((pagina) => {
      const rota = ROTA_DA_PAGINA[pagina];
      const caminho = (prefixo: string) => `${base}${prefixo}${rota}` || base;

      return {
        url: caminho(PREFIXO[regiao]),
        lastModified: new Date(),
        // A entrada é a página inicial, e é a que mais vale.
        priority: pagina === 'inicio' ? 1 : 0.8,
        alternates: {
          languages: {
            'pt-PT': caminho(PREFIXO.pt),
            'pt-BR': caminho(PREFIXO.br),
          },
        },
      };
    }),
  );
}
