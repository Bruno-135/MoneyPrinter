import { NextResponse } from 'next/server';
import { WHATSAPP_DA_AGENCIA } from '@/lib/vaidesign/agencia';

/**
 * A porta do WhatsApp, para o número não andar escrito no site.
 *
 * Um botão que aponta directamente a `wa.me/351913014170` tem o número dentro
 * do HTML, e um robô que leia a página apanha-o tão bem como uma pessoa. Tirar
 * o número do texto visível e deixá-lo no `href` era esconder a chave debaixo
 * do tapete.
 *
 * Assim, no site os botões apontam a `/wa` e o número só existe no servidor.
 * Quem carrega é reencaminhado para o WhatsApp e não dá por nada; quem raspa a
 * página leva um caminho que não lhe serve para juntar a uma lista.
 *
 * O texto do formulário vem em `?texto=` e segue para o WhatsApp. Nunca se
 * reencaminha para outro lado que não seja o `wa.me`: o destino é escrito aqui
 * e o que vem de fora é só o recado.
 */

/** Um recado maior do que isto não é um recado, é um ataque a tentar a sorte. */
const MAXIMO = 2000;

export function GET(pedido: Request): NextResponse {
  if (!WHATSAPP_DA_AGENCIA) {
    // Sem número configurado, manda-se para a página de contacto em vez de
    // para um endereço partido.
    return NextResponse.redirect(new URL('/contacto', pedido.url), 307);
  }

  const texto = new URL(pedido.url).searchParams.get('texto')?.slice(0, MAXIMO) ?? '';
  const destino = texto
    ? `https://wa.me/${WHATSAPP_DA_AGENCIA}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/${WHATSAPP_DA_AGENCIA}`;

  // 307 e não 301: um reencaminhamento permanente ficava guardado no browser
  // com o número lá dentro, e mudar de número deixava as pessoas presas ao
  // antigo durante meses.
  const resposta = NextResponse.redirect(destino, 307);
  // Isto é uma porta, não uma página: não há nada aqui para um motor de busca
  // guardar nem para uma cache servir a outra pessoa.
  resposta.headers.set('X-Robots-Tag', 'noindex, nofollow');
  resposta.headers.set('Cache-Control', 'no-store');
  return resposta;
}
