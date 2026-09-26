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
 * O Bruno pediu isto ao Claude Design e não veio na exportação — o
 * `movimento.css` que de lá veio é byte a byte igual ao que já cá estava, e o
 * artboard do logótipo não tem uma linha de animação. Faz-se aqui, que é onde
 * se faz bem: isto é código, não é desenho.
 *
 * O ponto vem de trás para a frente — começa pequeno, como se estivesse longe,
 * cresce até passar do tamanho e assenta com dois ressaltos. O movimento é o
 * da marca: «vai» é seguir em frente, e o ponto chega antes do resto.
 *
 * Corre UMA VEZ, quando a página abre, e nunca mais. Um logótipo que salta de
 * cinco em cinco segundos deixa de ser uma assinatura e passa a ser uma
 * distracção — e quem está a ler os preços não quer nada a mexer ao lado.
 *
 * Marca-se em vez de se escrever a animação no artboard para o desenho ficar
 * como veio, e porque o ponto aparece dezassete vezes em sítios diferentes: o
 * cabeçalho, o rodapé, o logótipo gigante da abertura, as fichas. Uma marca e
 * o CSS trata dos dezassete.
 */
const PONTOS_DA_MARCA = [
  'position:absolute;right:-.3em;top:-.02em;width:.19em;height:.19em;border-radius:50%;background:#EC5B13',
  'position:absolute;right:-.36em;top:-.06em;width:.26em;height:.26em;border-radius:50%;background:#EC5B13',
];

export function animarOPontoDaMarca(html: string): string {
  let saida = html;
  let mexidos = 0;

  for (const estilo of PONTOS_DA_MARCA) {
    const antigo = `<span style="${estilo}">`;
    const novo = `<span data-ponto-da-marca style="${estilo}">`;
    const partes = saida.split(antigo);
    mexidos += partes.length - 1;
    saida = partes.join(novo);
  }

  if (mexidos === 0) {
    throw new Error('o ponto da marca mudou de forma — ver `animarOPontoDaMarca`');
  }
  return saida;
}
