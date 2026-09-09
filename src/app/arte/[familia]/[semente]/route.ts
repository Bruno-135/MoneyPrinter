import { arteSvg, ehFamilia } from '@/lib/sites/imagens/arte';

/**
 * Serve uma imagem gerada.
 *
 * É pública de propósito e não podia ser de outra maneira: estas imagens vivem
 * dentro das landing pages, que qualquer pessoa abre sem sessão iniciada. Não
 * há aqui nada privado — a resposta é desenhada a partir do endereço e de mais
 * nada, sem tocar na base de dados.
 *
 * A cache é de um ano e imutável porque a mesma semente dá sempre a mesma
 * imagem. Depois do primeiro pedido, isto deixa de custar sequer uma ligação.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ familia: string; semente: string }> },
) {
  const { familia, semente } = await params;

  if (!ehFamilia(familia)) {
    return new Response('Família de imagem desconhecida.', { status: 404 });
  }

  // O `.svg` no fim do endereço é decoração para os browsers e para as
  // ferramentas que olham para a extensão; não faz parte da semente.
  const limpa = decodeURIComponent(semente).replace(/\.svg$/i, '');

  return new Response(arteSvg(familia, limpa), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
      // O SVG é gerado por nós e não contém script nenhum, mas se um dia
      // alguém lhe acrescentar um, isto impede-o de correr.
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
