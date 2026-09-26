import {
  EMAIL_DA_AGENCIA,
  INSTAGRAM_DA_AGENCIA,
  TELEFONE_DA_AGENCIA,
  WHATSAPP_DA_AGENCIA,
} from './agencia';

/**
 * A assinatura de email da agência.
 *
 * Escrita à mão e não desenhada, porque uma assinatura de email quase não é
 * desenho — é uma lista de coisas que os clientes de email recusam. O Outlook
 * ignora flexbox e grid; o Gmail corta o `<style>` e as classes; nenhum deles
 * carrega uma fonte do Google; e o Outlook do Windows nem SVG mostra. O que
 * sobra são tabelas e estilos em linha, como em 2005, e é isso que está aqui.
 *
 * Sem imagens, de propósito. O logótipo do site já é feito de letra e um
 * ponto, portanto não se perde nada — e ganha-se o que interessa: uma
 * assinatura sem imagens nunca aparece partida, nunca fica à espera de que
 * alguém carregue em «mostrar imagens», e não engorda a mensagem.
 *
 * Duas versões. A completa vai nas mensagens novas; a curta nas respostas,
 * porque uma assinatura grande repetida em cada troca de mensagens cansa e
 * acaba por se ler como ruído.
 */

const PRETO = '#141210';
const CINZENTO = '#5A5249';
const LARANJA = '#EC5B13';
const LINK = '#BA4100';
const LINHA = '#DDD2C0';

/** A letra do logótipo. Quem não tiver a primeira cai na segunda, condensada. */
const TITULO = "'Barlow Condensed','Arial Narrow',Arial,sans-serif";
/** A letra do resto. Todas de sistema: nenhuma precisa de ser descarregada. */
const TEXTO = "-apple-system,'Segoe UI',Roboto,Arial,sans-serif";

export const MORADA_DO_SITE = 'vaidesign.net';

function ligacao(href: string, texto: string, tamanho = 14): string {
  return `<a href="${href}" style="color:${LINK};text-decoration:none;font-weight:600;font-size:${tamanho}px;font-family:${TEXTO}">${texto}</a>`;
}

/**
 * O logótipo: `vaı` com o ponto laranja, e DESIGN espaçado ao lado.
 *
 * O «i» é o sem pinto (U+0131), como no site — o pinto dele foi promovido a
 * ponto da marca e ficou cor de laranja, à direita. O ponto é o carácter `•`
 * e não um `<div>` redondo: um `border-radius` não sobrevive ao Outlook.
 */
function logotipo(tamanho: number): string {
  const pequeno = Math.round(tamanho * 0.3);
  return (
    `<span style="font-family:${TITULO};font-size:${tamanho}px;font-weight:800;letter-spacing:-0.02em;color:${PRETO};line-height:1">vaı</span>` +
    `<span style="color:${LARANJA};font-size:${tamanho}px;font-weight:800;line-height:1">•</span>` +
    `<span style="font-family:${TEXTO};font-size:${pequeno}px;letter-spacing:0.3em;color:${CINZENTO};text-transform:uppercase;padding-left:8px">design</span>`
  );
}

/** A assinatura das mensagens novas. */
export function assinaturaCompleta(): string {
  const whats = WHATSAPP_DA_AGENCIA
    ? `<tr><td style="padding:0 0 3px;font-family:${TEXTO};font-size:14px;color:${CINZENTO}">WhatsApp ${ligacao(`https://wa.me/${WHATSAPP_DA_AGENCIA}`, TELEFONE_DA_AGENCIA)}</td></tr>`
    : '';

  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:460px">`,
    `<tr><td style="padding:0 0 12px">${logotipo(30)}</td></tr>`,
    // Uma linha de 1px feita com border e não com <hr>, que o Outlook engorda.
    `<tr><td style="border-top:1px solid ${LINHA};font-size:0;line-height:0">&nbsp;</td></tr>`,
    `<tr><td style="padding:12px 0 2px;font-family:${TEXTO};font-size:15px;font-weight:600;color:${PRETO}">Bruno Dias</td></tr>`,
    `<tr><td style="padding:0 0 12px;font-family:${TEXTO};font-size:14px;color:${CINZENTO};line-height:1.45">Sites e marketing para quem vive do seu negócio</td></tr>`,
    whats,
    `<tr><td style="padding:0 0 3px">${ligacao(`mailto:${EMAIL_DA_AGENCIA}`, EMAIL_DA_AGENCIA)}</td></tr>`,
    `<tr><td style="padding:0 0 3px">${ligacao(`https://${MORADA_DO_SITE}`, MORADA_DO_SITE)}</td></tr>`,
    `<tr><td>${ligacao(`https://instagram.com/${INSTAGRAM_DA_AGENCIA}`, `@${INSTAGRAM_DA_AGENCIA}`)}</td></tr>`,
    `</table>`,
  ].join('');
}

/** A assinatura das respostas: o nome e uma maneira de falar consigo. */
export function assinaturaCurta(): string {
  const whats = WHATSAPP_DA_AGENCIA
    ? ` · ${ligacao(`https://wa.me/${WHATSAPP_DA_AGENCIA}`, TELEFONE_DA_AGENCIA, 13)}`
    : '';

  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:460px">`,
    `<tr><td style="padding:0 0 4px">${logotipo(20)}</td></tr>`,
    `<tr><td style="font-family:${TEXTO};font-size:13px;color:${CINZENTO}">Bruno Dias${whats}</td></tr>`,
    `</table>`,
  ].join('');
}
