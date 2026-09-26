import {
  EMAIL_DA_AGENCIA,
  INSTAGRAM_DA_AGENCIA,
  TELEFONE_DA_AGENCIA,
  WHATSAPP_DA_AGENCIA,
} from './agencia';

/**
 * A assinatura de email da agência, reconstruída a partir do desenho.
 *
 * O desenho veio do Claude Design e é isso mesmo: um desenho. Uma assinatura
 * de email quase não é desenho — é uma lista de coisas que os clientes de
 * email recusam. O Outlook ignora flexbox, grid e `border-radius`; o Gmail
 * corta o `<style>` e as classes; nenhum dos dois vai buscar uma fonte ao
 * Google. O que sobra são tabelas e estilos em linha, como em 2005, e é isso
 * que está aqui.
 *
 * Do desenho fica tudo o que sobrevive: as duas colunas, o bloco preto com o
 * logótipo, o nome em Barlow Condensed, as etiquetas cor de laranja em
 * maiúsculas espaçadas, as linhas a separar cada contacto.
 *
 * TRÊS COISAS MUDARAM, e digo-as em vez de fingir que o resultado é igual:
 *
 *  - A FORMA CURVA cor de laranja no canto do bloco preto não existe aqui. Um
 *    quarto de círculo só se faz com `border-radius` (que o Outlook deita
 *    fora) ou com uma imagem (que fica à espera de que alguém carregue em
 *    «mostrar imagens», e muita gente nunca carrega). Um enfeite não vale uma
 *    assinatura partida.
 *  - Os CANTOS ARREDONDADOS ficam, mas só para quem os desenha. No Outlook a
 *    caixa aparece quadrada, e é uma diferença que ninguém repara.
 *  - A LARGURA passa de 1200px para 520. Uma assinatura de 1200px obriga o
 *    telemóvel a encolher tudo até não se ler, ou a arrastar para o lado.
 *
 * As letras do desenho — Barlow Condensed e uma monoespaçada — não podem ser
 * descarregadas num email. Quem as tiver instaladas vê-as; quem não, cai numa
 * alternativa parecida. É por isso que o `font-family` traz sempre três
 * nomes.
 */

const PRETO = '#141210';
const CREME = '#F6EFE4';
const CINZENTO = '#5A5249';
const LARANJA = '#EC5B13';
const LINHA = '#DDD2C0';
const LINK = '#BA4100';

/** A letra dos títulos. Condensada, com duas alternativas de sistema. */
const TITULO = "'Barlow Condensed','Arial Narrow',Arial,sans-serif";
/** A letra das etiquetas pequenas, monoespaçada. */
const MONO = "'JetBrains Mono','Courier New',monospace";
/** A letra do texto corrido. Todas de sistema. */
const TEXTO = "-apple-system,'Segoe UI',Roboto,Arial,sans-serif";

export const MORADA_DO_SITE = 'vaidesign.net';

/**
 * A assinatura desenhada, como fotografia.
 *
 * Veio do Claude Design, e é a única maneira de ter exactamente o desenho:
 * a forma curva cor de laranja, os cantos redondos, as letras da marca. Nada
 * disso sobrevive escrito em HTML.
 *
 * O preço é que muita gente nunca vê imagens. O Outlook bloqueia-as por
 * omissão, e há quem nunca carregue em «mostrar imagens» em nenhum email da
 * vida. Para essas pessoas a assinatura é um rectângulo vazio — e é por isso
 * que o texto alternativo diz tudo o que a imagem diz, e os links vão a
 * seguir, em texto, sempre visíveis.
 *
 * O endereço da imagem é absoluto, de propósito. Uma assinatura vive dentro
 * de um email, longe do site: um caminho relativo não tem contra o que
 * resolver e a imagem nunca aparece.
 */
const IMAGEM = `https://${'vaidesign.net'}/vaidesign/assinatura.png`;

/** O que a imagem diz, para quem não a vê. */
const DESCRICAO_DA_IMAGEM = [
  'Bruno Dias · VaiDesign',
  'Sites, marca e redes sociais à medida',
  `WhatsApp ${TELEFONE_DA_AGENCIA}`,
  MORADA_DO_SITE,
  `@${INSTAGRAM_DA_AGENCIA}`,
].join(' · ');

export function assinaturaComImagem(): string {
  const atalho = (href: string, texto: string) =>
    `<a href="${href}" style="color:${LINK};text-decoration:none;font-weight:600">${texto}</a>`;

  const atalhos = [
    WHATSAPP_DA_AGENCIA ? atalho(`https://wa.me/${WHATSAPP_DA_AGENCIA}`, 'WhatsApp') : '',
    atalho(`mailto:${EMAIL_DA_AGENCIA}`, 'Email'),
    atalho(`https://${MORADA_DO_SITE}`, 'Site'),
    atalho(`https://instagram.com/${INSTAGRAM_DA_AGENCIA}`, 'Instagram'),
  ]
    .filter(Boolean)
    .join('&nbsp;&nbsp;·&nbsp;&nbsp;');

  return [
    `<table cellpadding="0" cellspacing="0" border="0" width="520" style="border-collapse:collapse;max-width:520px">`,
    `<tr><td style="padding:0">`,
    `<a href="https://${MORADA_DO_SITE}" style="text-decoration:none">`,
    // `width` como atributo E no estilo: o Outlook lê o atributo, o resto lê o
    // estilo, e sem os dois a imagem sai ao tamanho original de 1200px.
    `<img src="${IMAGEM}" width="520" alt="${DESCRICAO_DA_IMAGEM}" style="display:block;width:100%;max-width:520px;height:auto;border:0">`,
    `</a>`,
    `</td></tr>`,
    `<tr><td style="padding:10px 0 0;font-family:${TEXTO};font-size:13px;line-height:20px;color:${CINZENTO}">${atalhos}</td></tr>`,
    `</table>`,
  ].join('');
}

/**
 * O logótipo sobre o preto.
 *
 * O «i» é o sem pinto (U+0131): o pinto dele foi promovido a ponto da marca e
 * ficou cor de laranja, acima e à direita. O ponto é o carácter `•` levantado
 * com `vertical-align`, e não uma caixa redonda — um `border-radius` não
 * sobrevive ao Outlook.
 *
 * O levantamento vai em pixéis e não em percentagem: em percentagem é medido
 * contra o `line-height`, que cada cliente de email calcula à sua maneira, e
 * o ponto acabava a alturas diferentes em cada caixa de correio.
 */
function logotipo(tamanho: number, cor: string): string {
  const ponto = Math.round(tamanho * 0.42);
  return (
    `<span style="font-family:${TITULO};font-size:${tamanho}px;font-weight:800;letter-spacing:-.02em;color:${cor};line-height:1">vaı</span>` +
    `<span style="font-family:${TEXTO};font-size:${ponto}px;color:${LARANJA};line-height:1;vertical-align:${Math.round(tamanho * 0.52)}px">&bull;</span>`
  );
}

/** Uma linha da tabela de contactos: etiqueta cor de laranja, valor a seguir. */
function contacto(etiqueta: string, href: string, valor: string, ultima: boolean): string {
  const borda = ultima ? '' : `border-bottom:1px solid ${LINHA};`;
  return (
    `<tr>` +
    `<td valign="middle" style="${borda}padding:9px 14px 9px 0;font-family:${MONO};font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:${LARANJA};white-space:nowrap">${etiqueta}</td>` +
    `<td valign="middle" style="${borda}padding:9px 0;font-family:${TEXTO};font-size:15px;font-weight:600">` +
    `<a href="${href}" style="color:${PRETO};text-decoration:none;font-weight:600">${valor}</a>` +
    `</td>` +
    `</tr>`
  );
}

/** A assinatura das mensagens novas. */
export function assinaturaCompleta(): string {
  const linhas = [
    WHATSAPP_DA_AGENCIA
      ? contacto('WhatsApp', `https://wa.me/${WHATSAPP_DA_AGENCIA}`, TELEFONE_DA_AGENCIA, false)
      : '',
    contacto('Email', `mailto:${EMAIL_DA_AGENCIA}`, EMAIL_DA_AGENCIA, false),
    contacto('Site', `https://${MORADA_DO_SITE}`, MORADA_DO_SITE, false),
    contacto('Instagram', `https://instagram.com/${INSTAGRAM_DA_AGENCIA}`, `@${INSTAGRAM_DA_AGENCIA}`, true),
  ].join('');

  return [
    `<table cellpadding="0" cellspacing="0" border="0" width="520" style="border-collapse:collapse;max-width:520px;background:${CREME};border-radius:10px">`,
    `<tr>`,

    // A coluna preta: o logótipo em cima, DESIGN em baixo, como no desenho.
    `<td width="132" valign="top" style="width:132px;background:${PRETO};padding:22px 0 22px 20px;border-radius:10px 0 0 10px">`,
    `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;height:100%">`,
    `<tr><td style="padding:0 0 34px">${logotipo(44, CREME)}</td></tr>`,
    `<tr><td style="font-family:${MONO};font-size:11px;font-weight:500;letter-spacing:.42em;text-transform:uppercase;color:${CREME}">design</td></tr>`,
    `</table>`,
    `</td>`,

    // A coluna creme: o nome, o que fazemos, e os contactos.
    `<td valign="top" style="padding:20px 22px 20px 22px;border-radius:0 10px 10px 0">`,
    `<div style="font-family:${TITULO};font-size:34px;font-weight:800;letter-spacing:-.01em;text-transform:uppercase;color:${PRETO};line-height:1">Bruno Dias</div>`,
    `<div style="padding:6px 0 12px;font-family:${TEXTO};font-size:14px;color:${CINZENTO};line-height:1.4">Sites, marca e redes sociais à medida</div>`,
    // A barra preta grossa que o desenho põe por baixo do subtítulo.
    `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse"><tr><td style="border-top:2px solid ${PRETO};font-size:0;line-height:0">&nbsp;</td></tr></table>`,
    `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">${linhas}</table>`,
    `</td>`,

    `</tr>`,
    `</table>`,
  ].join('');
}

/**
 * A assinatura das respostas.
 *
 * Numa troca de mensagens a assinatura grande repete-se a cada resposta e
 * acaba por se ler como ruído — e o bloco preto, repetido cinco vezes numa
 * conversa, pesa. Fica o logótipo, o nome e uma maneira de ligar.
 */
export function assinaturaCurta(): string {
  const whats = WHATSAPP_DA_AGENCIA
    ? ` &nbsp;·&nbsp; <a href="https://wa.me/${WHATSAPP_DA_AGENCIA}" style="color:${PRETO};text-decoration:none;font-weight:600">${TELEFONE_DA_AGENCIA}</a>`
    : '';

  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:520px">`,
    `<tr>`,
    `<td valign="middle" style="padding:0 12px 0 0;border-right:2px solid ${LARANJA}">${logotipo(22, PRETO)}</td>`,
    `<td valign="middle" style="padding:0 0 0 12px;font-family:${TEXTO};font-size:13px;color:${CINZENTO}">`,
    `<span style="color:${PRETO};font-weight:600">Bruno Dias</span>${whats}`,
    `</td>`,
    `</tr>`,
    `</table>`,
  ].join('');
}
