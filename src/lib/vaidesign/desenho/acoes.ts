import { RAMOS_DO_FORMULARIO } from './dados';
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

/**
 * O formulário passa a perguntar o RAMO e não o modelo preferido.
 *
 * O desenho pergunta "Modelo preferido" e dá os sete nomes da nossa
 * biblioteca. Quem chega ao formulário tem uma padaria, não tem um "Forno &
 * Brasa": para responder àquela pergunta tinha de ir a outra página, decorar
 * um nome e voltar. Ninguém volta.
 *
 * Perguntar o ramo é mais fácil para quem escreve e mais útil para quem
 * recebe — o modelo escolhe-se depois, com o ramo na mão, e escolhe-se melhor.
 *
 * Troca-se aqui e não no artboard para o desenho ficar como veio. Se um dia
 * vier um desenho novo com outra pergunta, isto rebenta em vez de deixar a
 * antiga a passar.
 */
const PERGUNTA_ANTIGA =
  `<span style="font:600 14px/1.3 'Hanken Grotesk';color:#141210">Modelo preferido<span style="font-weight:400;color:#5A5249"> · opcional</span></span>`;

const PERGUNTA_NOVA =
  `<span style="font:600 14px/1.3 'Hanken Grotesk';color:#141210">O seu ramo<span style="font-weight:400;color:#5A5249"> · opcional</span></span>`;

const OPCOES_ANTIGAS =
  `<option value="Sem preferência">Sem preferência</option><option value="Forno &amp; Brasa">Forno &amp; Brasa</option><option>Clínica Vale</option><option>Predial</option><option>Retrato</option><option>Oficina</option><option>Estrada</option><option>Neon</option>`;

export function perguntarORamo(html: string): string {
  if (!html.includes(PERGUNTA_ANTIGA)) return html;

  if (!html.includes(OPCOES_ANTIGAS)) {
    throw new Error('a pergunta do modelo mudou de opções — ver `perguntarORamo`');
  }

  // A primeira opção fica vazia: é o convite a escolher, e um pedido sem ramo
  // escolhido guarda-se sem ramo em vez de guardar a palavra do convite.
  const opcoes = [
    '<option value="">Escolha o seu ramo</option>',
    ...RAMOS_DO_FORMULARIO.map((r) => `<option>${r}</option>`),
  ].join('');

  return html
    .replace(PERGUNTA_ANTIGA, PERGUNTA_NOVA)
    .replace(OPCOES_ANTIGAS, opcoes)
    .replace('<select name="modelo"', '<select name="ramo"');
}

/**
 * O Instagram do rodapé.
 *
 * Ficou por ligar quando fiz a varredura aos botões, e disse-o então: não
 * inventava um endereço que não sabia se existia. A conta existe agora, e o
 * desenho ainda por cima escrevia o nome errado — `@vaidesign` em vez de
 * `@agenciavaidesign`. Um endereço errado no rodapé é pior do que nenhum:
 * manda o cliente a uma conta que não é a nossa.
 *
 * No artboard de computador é "Instagram @conta"; no de telemóvel é só
 * "Instagram". Os dois passam a levar lá.
 */
export function ligarInstagram(html: string, conta: string): string {
  const abre = `<a href="https://instagram.com/${conta}" target="_blank" rel="noreferrer" style="color:inherit;text-decoration:none">`;

  return html
    .replace('<span>Instagram @vaidesign</span>', `${abre}Instagram @${conta}</a>`)
    .replace('<span>Instagram</span>', `${abre}Instagram</a>`);
}

/**
 * O ponto da marca salta quando a página abre.
 *
 * O Bruno pediu esta animação ao Claude Design, ela não veio na primeira
 * exportação, eu fiz uma — e depois veio a dele, que é melhor. Fica a dele.
 *
 * A minha fazia o ponto crescer e assentar; a do desenho faz o que ele tinha
 * mesmo pedido: o ponto SAI DE TRÁS DO «v», atravessa a palavra aos pulos, e
 * só no fim chega ao sítio, à frente do «ı». E pula como pula uma bola — nos
 * três impactos achata-se e volta a esticar, que é o que separa uma coisa com
 * peso de uma caixa a deslizar.
 *
 * O CSS vem inteiro de `movimento.css`, do desenho. Aqui só se põem as duas
 * classes que ele espera encontrar, e põem-se da mesma maneira que o artboard
 * novo as põe: `vd-logo` no «vaı» e `vd-ponto` no ponto.
 *
 * Podia ter trocado os artboards pelos do ZIP novo em vez disto. Não trocou
 * porque nesse ZIP mudaram outras coisas ao mesmo tempo — o Início inteiro,
 * entre elas — e uma alteração de cada vez é uma alteração que se percebe.
 */

/** O «vaı» que serve de palco: é dentro dele que o ponto anda. */
const PALCOS_DO_LOGOTIPO = [
  `<span style="position:relative;display:block;font:800 1em/.78 'Barlow Condensed';letter-spacing:-.02em;text-transform:none">`,
  `<span style="position:relative;display:block;font:800 1em/.78 'Barlow Condensed';letter-spacing:-.02em">`,
];

/** O ponto, nas duas medidas que o desenho usa. */
const PONTOS_DA_MARCA = [
  'position:absolute;right:-.3em;top:-.02em;width:.19em;height:.19em;border-radius:50%;background:#EC5B13',
  'position:absolute;right:-.36em;top:-.06em;width:.26em;height:.26em;border-radius:50%;background:#EC5B13',
];

export function animarOPontoDaMarca(html: string): string {
  let saida = html;
  let palcos = 0;
  let pontos = 0;

  for (const palco of PALCOS_DO_LOGOTIPO) {
    const partes = saida.split(palco);
    palcos += partes.length - 1;
    saida = partes.join(palco.replace('<span style="', '<span class="vd-logo" style="'));
  }

  for (const estilo of PONTOS_DA_MARCA) {
    const antigo = `<span style="${estilo}">`;
    const partes = saida.split(antigo);
    pontos += partes.length - 1;
    saida = partes.join(`<span class="vd-ponto" style="${estilo}">`);
  }

  // O ponto sem o palco fica a saltar contra o que estiver por fora, e o palco
  // sem o ponto não faz nada. Ou vêm os dois, ou o desenho mudou.
  if (palcos === 0 || pontos === 0 || palcos !== pontos) {
    throw new Error(
      `o logótipo mudou de forma: ${palcos} palcos para ${pontos} pontos — ver \`animarOPontoDaMarca\``,
    );
  }
  return saida;
}
