import type { MetadataRoute } from 'next';

/**
 * O que os motores de busca podem ler.
 *
 * O painel, a entrada e a página da assinatura ficam de fora: são trabalho
 * interno e não têm nada que apareça numa pesquisa. As páginas dos clientes em `/s/<código>` ficam de
 * dentro de propósito — cada uma é o site de um comércio real, e ser
 * encontrada no Google é metade do que o cliente está a comprar.
 *
 * Um `robots.txt` não tranca nada: quem escrever o endereço à mão chega lá na
 * mesma. Quem tranca é o Supabase, que não devolve linha nenhuma a quem não
 * tem sessão. Isto só evita que o painel apareça numa pesquisa pelo nome da
 * agência.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/painel', '/entrar', '/api', '/assinatura'],
    },
  };
}
