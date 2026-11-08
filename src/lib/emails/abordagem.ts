import { versaoDe } from '@/lib/whatsapp/mensagem';
import { NOME_DO_SEGMENTO, PORQUE, segmentoDoRamo, type Segmento } from '@/lib/whatsapp/segmentos';
import {
  EMAIL_DA_AGENCIA,
  TELEFONE_DA_AGENCIA,
  WHATSAPP_DA_AGENCIA,
} from '@/lib/vaidesign/agencia';

/**
 * O e-mail de abordagem: a mesma ideia da mensagem de WhatsApp, para outro
 * público.
 *
 * Os e-mails vêm dos sites dos negócios (ver `recolher.ts`), por isso quem tem
 * e-mail TEM site: «vi que não têm site» seria falso para toda a gente. O que
 * se diz é que o site que têm pode trazer mais clientes, o que se faria nele,
 * e mostra-se um exemplo do ramo deles.
 *
 * Segue as regras do WhatsApp: muda por segmento e por país, e há três versões
 * (`versaoDe`) — a apresentação, o assunto e a pergunta final mudam juntos. O
 * porquê de cada segmento é o mesmo do WhatsApp (`PORQUE`). Sem preço: diz-se
 * quando responderem.
 *
 * Sai em HTML (com a imagem do exemplo) e em texto simples, porque há quem leia
 * e-mails sem imagens, e um e-mail só com HTML cheira a publicidade aos filtros.
 */

type Pais = 'PT' | 'BR';
type Tres = readonly [string, string, string];

export interface EmailMontado {
  assunto: string;
  html: string;
  texto: string;
  segmento: Segmento;
  versao: 0 | 1 | 2;
}

export interface DadosDoEmail {
  pais: string;
  ramo?: string | null;
  /** O id do lead: escolhe a versão, como no WhatsApp. */
  chave?: string | null;
  /** O site atual do negócio, como veio do Google. */
  site: string | null;
  /** A base dos links: `https://vaidesign.net`. */
  base: string;
  /** A página para deixar de receber, única deste e-mail. */
  sair: string;
}

const ASSUNTO: Record<Pais, (nome: string) => Tres> = {
  PT: (nome) => [
    'Uma ideia para o vosso site',
    'O vosso site pode trazer mais clientes',
    `Um exemplo de site para ${nome}`,
  ],
  BR: (nome) => [
    'Uma ideia pro site de vocês',
    'O site de vocês pode trazer mais clientes',
    `Um exemplo de site pra ${nome}`,
  ],
};

const APRESENTACAO: Record<Pais, Tres> = {
  PT: [
    'Chamo-me Bruno Dias e faço sites para pequenos negócios na VaiDesign.',
    'O meu nome é Bruno Dias e trabalho com criação de sites na VaiDesign.',
    'Sou o Bruno Dias, da VaiDesign: faço sites para pequenos negócios em Portugal e no Brasil.',
  ],
  BR: [
    'Me chamo Bruno Dias e faço sites pra pequenos negócios na VaiDesign.',
    'Meu nome é Bruno Dias e trabalho com criação de sites na VaiDesign.',
    'Sou o Bruno Dias, da VaiDesign: faço sites pra pequenos negócios no Brasil e em Portugal.',
  ],
};

const PERGUNTA: Record<Pais, Tres> = {
  PT: [
    'Querem que prepare uma para verem como fica?',
    'Posso preparar uma para compararem com o atual?',
    'Querem ver como ficaria o vosso?',
  ],
  BR: [
    'Querem que eu prepare uma pra vocês verem como fica?',
    'Posso preparar uma pra vocês compararem com o atual?',
    'Querem ver como ficaria o de vocês?',
  ],
};

/** O que se fazia no site deles, por segmento. Três coisas do ramo… */
export const MELHORIAS: Record<Segmento, Record<Pais, Tres>> = {
  restauracao: {
    PT: [
      'a ementa com preços, fácil de ler no telemóvel',
      'um botão para encomendar pelo WhatsApp',
      'horário e localização sempre à vista',
    ],
    BR: [
      'o cardápio com preços, fácil de ler no celular',
      'um botão pra fazer pedido pelo WhatsApp',
      'horário e localização sempre à vista',
    ],
  },
  beleza: {
    PT: [
      'os serviços e os preços bem organizados',
      'fotografias dos vossos trabalhos',
      'um botão para marcar pelo WhatsApp',
    ],
    BR: [
      'os serviços e os preços bem organizados',
      'fotos dos trabalhos de vocês',
      'um botão pra agendar pelo WhatsApp',
    ],
  },
  saude: {
    PT: [
      'as especialidades e a equipa bem apresentadas',
      'um botão para marcar consulta pelo WhatsApp',
      'horário, localização e contactos à vista',
    ],
    BR: [
      'as especialidades e a equipe bem apresentadas',
      'um botão pra agendar consulta pelo WhatsApp',
      'horário, localização e contatos à vista',
    ],
  },
  fitness: {
    PT: [
      'as modalidades e o horário das aulas',
      'os preços claros, sem ter de perguntar',
      'um botão para marcar uma aula experimental',
    ],
    BR: [
      'as modalidades e os horários das aulas',
      'os planos claros, sem precisar perguntar',
      'um botão pra agendar uma aula experimental',
    ],
  },
  ensino: {
    PT: [
      'os cursos e as turmas organizados',
      'horários e preços claros',
      'um botão para pedir informações pelo WhatsApp',
    ],
    BR: [
      'os cursos e as turmas organizados',
      'horários e valores claros',
      'um botão pra pedir informações pelo WhatsApp',
    ],
  },
  orcamento: {
    PT: [
      'os serviços e a zona onde trabalham',
      'fotografias de trabalhos feitos',
      'um botão para pedir orçamento pelo WhatsApp',
    ],
    BR: [
      'os serviços e a região onde vocês atendem',
      'fotos de trabalhos feitos',
      'um botão pra pedir orçamento pelo WhatsApp',
    ],
  },
  escritorio: {
    PT: [
      'as áreas em que trabalham e quem é a equipa',
      'uma apresentação que transmite confiança',
      'um botão para marcar uma reunião',
    ],
    BR: [
      'as áreas em que vocês atuam e quem é a equipe',
      'uma apresentação que passa confiança',
      'um botão pra marcar uma reunião',
    ],
  },
  loja: {
    PT: [
      'os produtos com boas fotografias',
      'o horário e a localização da loja',
      'um botão para falar pelo WhatsApp',
    ],
    BR: [
      'os produtos com boas fotos',
      'o horário e a localização da loja',
      'um botão pra falar pelo WhatsApp',
    ],
  },
  geral: {
    PT: [
      'os vossos serviços bem explicados',
      'um botão de WhatsApp em todas as páginas',
      'horário, localização e contactos à vista',
    ],
    BR: [
      'os serviços de vocês bem explicados',
      'um botão de WhatsApp em todas as páginas',
      'horário, localização e contatos à vista',
    ],
  },
};

/** …e uma que vale para todos. */
const TUDO_RAPIDO: Record<Pais, string> = {
  PT: 'tudo rápido e bom no telemóvel, preparado para aparecer no Google da vossa zona',
  BR: 'tudo rápido e bom no celular, preparado pra aparecer no Google da região',
};

const TEXTOS: Record<
  Pais,
  {
    ola: string;
    vi: (dominio: string) => string;
    fazia: string;
    exemplo: (nome: string) => string;
    proposta: string;
    responder: string;
    botaoWhatsapp: string;
    recado: (dominio: string) => string;
    sair: { antes: string; link: string };
  }
> = {
  PT: {
    ola: 'Olá!',
    vi: (d) =>
      `Estive a ver o vosso site${d ? ` (${d})` : ''} e acho que ele vos pode trazer mais clientes.`,
    fazia: 'No vosso caso, eu tratava de:',
    exemplo: (n) => `Ver o exemplo para ${n}`,
    proposta:
      'Se quiserem, preparo uma versão nova do vosso site para compararem com o atual. Só pagam se gostarem, sem mensalidade e sem fidelização, e o site fica em vosso nome.',
    responder: 'Basta responder a este e-mail ou falar comigo pelo WhatsApp.',
    botaoWhatsapp: 'Falar pelo WhatsApp',
    recado: (d) => `Olá Bruno! Recebi o seu e-mail sobre o site${d ? ` ${d}` : ''}.`,
    sair: {
      antes:
        'Escrevo-vos porque este endereço está publicado no vosso site. Se não quiserem receber mais mensagens minhas,',
      link: 'cliquem aqui',
    },
  },
  BR: {
    ola: 'Olá!',
    vi: (d) =>
      `Dei uma olhada no site de vocês${d ? ` (${d})` : ''} e acho que ele pode trazer mais clientes.`,
    fazia: 'No caso de vocês, eu cuidaria de:',
    exemplo: (n) => `Ver o exemplo pra ${n}`,
    proposta:
      'Se quiserem, preparo uma versão nova do site de vocês pra compararem com o atual. Só pagam se gostarem, sem mensalidade e sem fidelidade, e o site fica no nome de vocês.',
    responder: 'É só responder este e-mail ou falar comigo pelo WhatsApp.',
    botaoWhatsapp: 'Falar pelo WhatsApp',
    recado: (d) => `Olá Bruno! Recebi seu e-mail sobre o site${d ? ` ${d}` : ''}.`,
    sair: {
      antes:
        'Escrevo porque este endereço está publicado no site de vocês. Se não quiserem receber mais mensagens minhas,',
      link: 'cliquem aqui',
    },
  },
};

/** O endereço do site sem `https://`, sem `www.` e sem a barra do fim; vazio sem site. */
export function dominioDe(site: string | null): string {
  if (!site) return '';
  try {
    return new URL(site).hostname.replace(/^www\./, '');
  } catch {
    return site
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
  }
}

function escapar(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function emailDeAbordagem(d: DadosDoEmail): EmailMontado {
  const pais: Pais = d.pais === 'BR' ? 'BR' : 'PT';
  const segmento = segmentoDoRamo(d.ramo);
  const v = versaoDe(d.chave);
  const t = TEXTOS[pais];
  const base = d.base.replace(/\/$/, '');
  const nome = NOME_DO_SEGMENTO[segmento][pais];
  const dominio = dominioDe(d.site);

  const assunto = ASSUNTO[pais](nome)[v];
  const apresentacao = APRESENTACAO[pais][v];
  const porque = PORQUE[segmento][pais][v];
  const itens = [...MELHORIAS[segmento][pais], TUDO_RAPIDO[pais]];
  const pergunta = PERGUNTA[pais][v];
  const exemplo = `${base}/exemplos/${segmento}`;
  const imagem = `${base}/vaidesign/exemplos/${segmento}.jpg`;
  const logo = `${base}/vaidesign/email/logo.png`;
  // Direto ao wa.me, sem passar por `/wa`: aberto a partir do e-mail (no browser
  // de dentro do Outlook, do Gmail…), um reencaminhamento a meio já não abre a
  // aplicação do WhatsApp e a pessoa fica numa página em branco. O recado já
  // vai escrito, com o site, para se saber de que lead se trata.
  const whatsapp = WHATSAPP_DA_AGENCIA
    ? `https://wa.me/${WHATSAPP_DA_AGENCIA}?text=${encodeURIComponent(t.recado(dominio))}`
    : `${base}/wa`;
  const whatsappNoTexto = WHATSAPP_DA_AGENCIA ? `https://wa.me/${WHATSAPP_DA_AGENCIA}` : whatsapp;
  // O número é de Portugal: no Brasil, escrito por baixo, assusta mais do que
  // ajuda. Lá fica só o botão.
  const telefone = pais === 'BR' ? '' : ` · ${TELEFONE_DA_AGENCIA}`;
  const site = pais === 'BR' ? `${base}/br` : base;
  const siteVisivel = site.replace(/^https?:\/\//, '');

  const texto = [
    t.ola,
    apresentacao,
    `${t.vi(dominio)} ${porque}`,
    [t.fazia, ...itens.map((i) => `• ${i}`)].join('\n'),
    `${t.exemplo(nome)}: ${exemplo}`,
    t.proposta,
    `${pergunta} ${t.responder}`,
    `WhatsApp: ${whatsappNoTexto}`,
    `Atenciosamente,\nBruno Dias\nVaiDesign · ${siteVisivel}${telefone}`,
    '—',
    `${t.sair.antes} ${t.sair.link}: ${d.sair}`,
  ].join('\n\n');

  const p = (conteudo: string, extra = '') =>
    `<p style="margin:0 0 16px;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:#141210;${extra}">${conteudo}</p>`;
  // Botões em tabela, com a cor também em `bgcolor`: é o que o Outlook respeita.
  // Cores de meio-tom, de propósito: no modo escuro do telemóvel um botão preto
  // some no fundo (já aconteceu), e um laranja ou verde continua a ver-se.
  const botao = (href: string, rotulo: string, fundo: string, cor: string) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${fundo}" style="background:${fundo};border-radius:999px"><a href="${escapar(href)}" style="display:inline-block;padding:13px 22px;color:${cor};border-radius:999px;font:700 15px/1.35 Arial,Helvetica,sans-serif;text-decoration:none">${escapar(rotulo)}</a></td></tr></table>`;

  const html = `<!doctype html>
<html lang="${pais === 'BR' ? 'pt-BR' : 'pt-PT'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapar(assunto)}</title></head>
<body style="margin:0;padding:0;background:#F6EFE4">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapar(porque)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6EFE4">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:14px">
<tr><td style="padding:28px 32px 8px"><img src="${escapar(logo)}" width="141" height="48" alt="VaiDesign" style="display:block;border:0"></td></tr>
<tr><td style="padding:16px 32px 4px">
${p(escapar(t.ola))}
${p(escapar(apresentacao))}
${p(`${escapar(t.vi(dominio))} ${escapar(porque)}`)}
${p(escapar(t.fazia), 'margin-bottom:8px')}
<ul style="margin:0 0 20px;padding-left:20px;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:#141210">
${itens.map((i) => `<li style="margin:0 0 4px">${escapar(i)}</li>`).join('\n')}
</ul>
</td></tr>
<tr><td style="padding:0 32px 8px">
<a href="${escapar(exemplo)}" style="text-decoration:none"><img src="${escapar(imagem)}" width="536" alt="${escapar(t.exemplo(nome))}" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #DDD2C0;border-radius:10px"></a>
</td></tr>
<tr><td style="padding:12px 32px 20px">${botao(exemplo, t.exemplo(nome), '#EC5B13', '#141210')}</td></tr>
<tr><td style="padding:4px 32px 4px">
${p(escapar(t.proposta))}
${p(`<strong>${escapar(pergunta)}</strong> ${escapar(t.responder)}`)}
</td></tr>
<tr><td style="padding:0 32px 24px">${botao(whatsapp, t.botaoWhatsapp, '#25D366', '#141210')}</td></tr>
<tr><td style="padding:0 32px 28px;border-top:1px solid #EFE6D8">
<p style="margin:20px 0 0;font:400 15px/1.5 Arial,Helvetica,sans-serif;color:#141210">Atenciosamente,<br><strong>Bruno Dias</strong><br><span style="color:#5A5249">VaiDesign · <a href="${escapar(site)}" style="color:#BA4100">${escapar(siteVisivel)}</a>${escapar(telefone)}</span></p>
</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font:400 12px/1.5 Arial,Helvetica,sans-serif;color:#7A7066">${escapar(t.sair.antes)} <a href="${escapar(d.sair)}" style="color:#7A7066">${escapar(t.sair.link)}</a>.<br>VaiDesign · ${escapar(EMAIL_DA_AGENCIA)}</p>
</td></tr>
</table>
</body>
</html>`;

  return { assunto, html, texto, segmento, versao: v };
}
