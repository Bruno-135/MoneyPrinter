import type { Destinos } from './links';

/**
 * Os botões do desenho que não levavam a lado nenhum.
 *
 * Numa tela do Claude Design um botão é um desenho: quem o vê percebe o que
 * faz, mas não há para onde ir, porque não existe um sítio para onde ir. Ao
 * pôr o desenho num site a sério, essas caixas ficam a olhar para quem lhes
 * carrega e não acontece nada — e quem carrega duas vezes e não acontece nada
 * vai-se embora.
 *
 * Aqui resolvem-se três casos, todos pelo que o botão DIZ e não por onde está:
 *
 *   - um botão que diz "WhatsApp" abre o WhatsApp;
 *   - um botão que diz o endereço de email abre o email;
 *   - o "Menu" do telemóvel e o "Enviar pelo WhatsApp" do formulário ficam
 *     marcados, para o browser lhes pegar.
 *
 * Cada troca confirma que encontrou o que esperava. Se um dia vier um desenho
 * novo com outras palavras, isto rebenta em vez de servir calado uma página
 * com botões mortos — que foi exactamente o que aconteceu da primeira vez.
 */

/** O texto que se vê dentro de um pedaço de HTML. */
function texto(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Manda para o sítio certo os links que o desenho apontou à página de contacto.
 *
 * O rodapé tem um botão grande a dizer "Escrever no WhatsApp" e outro com o
 * endereço de email escrito por extenso. Os dois iam parar à página de
 * contacto, porque na tela do desenho era para lá que apontavam. Mas um botão
 * que diz WhatsApp tem de abrir o WhatsApp: quem lhe carrega já decidiu por
 * onde quer falar, e obrigá-lo a passar por uma página é perdê-lo.
 */
export function apontarPorEtiqueta(html: string, destinos: Destinos, email: string): string {
  let saida = '';
  let i = 0;
  let mexidos = 0;

  while (i < html.length) {
    const abre = html.indexOf('<a ', i);
    if (abre === -1) {
      saida += html.slice(i);
      break;
    }
    const fimDaAbertura = html.indexOf('>', abre);
    const fecha = html.indexOf('</a>', fimDaAbertura);
    if (fimDaAbertura === -1 || fecha === -1) {
      saida += html.slice(i);
      break;
    }

    const abertura = html.slice(abre, fimDaAbertura + 1);
    const dentro = html.slice(fimDaAbertura + 1, fecha);
    const etiqueta = texto(dentro);

    let nova = abertura;
    if (abertura.includes('href="/contacto"')) {
      if (/whatsapp/i.test(etiqueta) && destinos.whatsapp) {
        nova = abertura.replace(
          'href="/contacto"',
          `href="https://wa.me/${destinos.whatsapp}" target="_blank" rel="noreferrer"`,
        );
        mexidos += 1;
      } else if (etiqueta.includes(email)) {
        nova = abertura.replace('href="/contacto"', `href="mailto:${email}"`);
        mexidos += 1;
      }
    }

    saida += html.slice(i, abre) + nova + dentro + '</a>';
    i = fecha + 4;
  }

  if (mexidos === 0) {
    throw new Error('nenhum botão de WhatsApp ou de email para apontar — o rodapé mudou?');
  }
  return saida;
}

/**
 * O botão "Menu" do telemóvel.
 *
 * No desenho é um `<span>`: desenha o botão e mais nada, porque na tela não há
 * para onde abrir. Num telemóvel a sério é a ÚNICA maneira de chegar às outras
 * páginas — sem ele, quem entra no site pelo telemóvel fica preso na página
 * onde caiu. Fica marcado aqui e é o browser que lhe abre o painel.
 */
const MENU = `<span style="height:44px;padding:0 16px;border-radius:999px;background:#141210;color:#F6EFE4;display:flex;align-items:center;gap:8px;font:600 13px/1 'Hanken Grotesk';letter-spacing:.06em;text-transform:uppercase">Menu`;

export function marcarMenuMovel(html: string): string {
  if (!html.includes(MENU)) return html;
  return html.replace(
    MENU,
    MENU.replace(
      '<span style="height:44px;',
      '<span data-menu-movel role="button" tabindex="0" aria-haspopup="true" style="cursor:pointer;height:44px;',
    ),
  );
}

/**
 * O "Enviar pelo WhatsApp" que está ao lado da mensagem de exemplo.
 *
 * Diz o que faz e não fazia nada. Fica marcado para o browser lhe pegar: leva
 * o que a pessoa escreveu no formulário e abre a conversa já com o texto lá
 * dentro. É a alternativa para quem escreveu tudo e prefere não deixar o
 * email.
 */
const ENVIAR = `<span style="height:48px;padding:0 20px;display:flex;align-items:center;background:#EC5B13;border-radius:4px;font:600 14px/1 'Hanken Grotesk';letter-spacing:.06em;text-transform:uppercase">Enviar pelo WhatsApp`;

export function marcarEnviarPeloWhatsApp(html: string): string {
  if (!html.includes(ENVIAR)) return html;
  return html.replace(
    ENVIAR,
    ENVIAR.replace(
      '<span style="height:48px;',
      '<span data-whatsapp-do-formulario role="button" tabindex="0" style="cursor:pointer;height:48px;',
    ),
  );
}

/**
 * A coluna de contactos do rodapé, no telemóvel.
 *
 * No artboard de computador o "WhatsApp" e o "Email" são links. No de
 * telemóvel são três palavras soltas dentro de `<span>` — WhatsApp, Email,
 * Instagram — e por isso não faziam nada. Um rodapé com a palavra "WhatsApp"
 * escrita e sem lá chegar é pior do que um rodapé sem nada: quem lhe carrega
 * fica a pensar que o site está partido, e tem razão.
 *
 * O Instagram fica como está, texto. Não invento um endereço que não sei se
 * existe — o dia em que houver conta, liga-se.
 */
export function ligarRodapeMovel(html: string, destinos: Destinos, email: string): string {
  let saida = html;

  if (destinos.whatsapp) {
    saida = saida.replace(
      '<span>WhatsApp</span>',
      `<a href="https://wa.me/${destinos.whatsapp}" target="_blank" rel="noreferrer" style="color:inherit;text-decoration:none">WhatsApp</a>`,
    );
  }
  saida = saida.replace(
    '<span>Email</span>',
    `<a href="mailto:${email}" style="color:inherit;text-decoration:none">Email</a>`,
  );

  return saida;
}
