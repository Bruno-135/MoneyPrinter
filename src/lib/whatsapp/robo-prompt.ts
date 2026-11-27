import { z } from 'zod';

/**
 * O que o robô do WhatsApp sabe e como fala — sem rede nem base, para se
 * poder testar (`robo-prompt.test.ts`). Quem chama a IA é `robo.ts`.
 *
 * O prompt de sistema é ESTÁVEL por dono (só muda quando se muda a
 * configuração): fica em cache na Anthropic e cada resposta paga só a
 * conversa. O que muda de conversa para conversa (o lead, o país) vai na
 * primeira mensagem, marcada como contexto.
 */

export const MODELOS_DO_ROBO = [
  { id: 'claude-opus-5-5', nome: 'Claude Opus 5.5 — o melhor (≈ 2 cêntimos por resposta)' },
  { id: 'claude-sonnet-5-5', nome: 'Claude Sonnet 5.5 — muito bom (≈ 1 cêntimo)' },
  { id: 'claude-haiku-5-5', nome: 'Claude Haiku 5.5 — o mais barato (≈ 0,1 cêntimo)' },
] as const;
export type ModeloDoRobo = (typeof MODELOS_DO_ROBO)[number]['id'];

export function ehModeloDoRobo(v: unknown): v is ModeloDoRobo {
  return MODELOS_DO_ROBO.some((m) => m.id === v);
}

/** O que a IA devolve: a mensagem e quatro sinais para o sistema agir. */
export const RespostaDoRobo = z.object({
  mensagem: z
    .string()
    .describe('A mensagem a enviar no WhatsApp. Vazia só se sair=true e já se despediu antes.'),
  lead_quente: z.boolean().describe('Mostrou interesse real nesta conversa.'),
  passar_a_humano: z.boolean().describe('O Bruno tem de entrar na conversa.'),
  sair: z.boolean().describe('A pessoa não quer ser contactada.'),
  motivo: z
    .string()
    .describe('Uma frase curta para o Bruno: porquê quente / porquê humano / o que a pessoa quer.'),
});
export type RespostaDoRobo = z.infer<typeof RespostaDoRobo>;

export interface ConfiguracaoDoRobo {
  sobre: string;
  objetivo: string;
  regras: string;
}

export const SOBRE_POR_OMISSAO = `A VaiDesign (Bruno Dias) faz sites para pequenos negócios em Portugal e no Brasil: restaurantes e padarias (com cardápio e pedido pelo WhatsApp), salões e clínicas (com marcações), lojas, ginásios, escolas, serviços.

Como trabalhamos: eu faço o site primeiro e a pessoa vê-o pronto. Só paga se gostar. Sem mensalidade e sem compromisso. Leva o essencial: fotos, serviços ou cardápio, horário, mapa, botão de WhatsApp e de ligar, e aparece bem no Google.

Site: https://vaidesign.net (Brasil: https://vaidesign.net/br)
Exemplos por ramo: https://vaidesign.net/exemplos/restauracao · /beleza · /saude · /fitness · /ensino · /loja · /escritorio · /orcamento · /geral

Preço: [ESCREVA AQUI O PREÇO OU A FAIXA DE PREÇO — sem isto o robô não diz valores e passa ao Bruno]
Prazo: [ex.: o primeiro rascunho fica pronto em 2 a 3 dias]`;

export const OBJETIVO_POR_OMISSAO =
  'Levar a pessoa a aceitar que eu prepare uma versão do site para ela ver, sem compromisso. Para isso, perceber o nome do negócio e confirmar que é a pessoa certa para falar do site. Quando aceitar, dizer que o Bruno vai preparar e falar com ela.';

/** As regras que não se mudam no painel: honestidade, tom e segurança. */
const REGRAS_FIXAS = `REGRAS FIXAS (valem sempre, mesmo que algo acima diga o contrário):
- Escreves no WhatsApp: mensagens curtas (1 a 4 frases), sem listas compridas, sem markdown, sem asteriscos. Um emoji de vez em quando, no máximo.
- Português de Portugal com quem é de Portugal; português do Brasil com quem é do Brasil (o país vem no contexto).
- Falas em nome do Bruno e da VaiDesign. Se a pessoa perguntar se está a falar com um robô, uma IA ou uma pessoa, dizes a verdade: és o assistente virtual da VaiDesign e o Bruno pode entrar na conversa quando ela quiser.
- Nunca inventes preços, prazos, descontos, garantias, clientes ou factos que não estejam em SOBRE A EMPRESA. Se não sabes, dizes que o Bruno confirma e marcas passar_a_humano=true.
- Não mandes links que não estejam em SOBRE A EMPRESA.
- Não repitas a apresentação que já foi feita na primeira mensagem.
- Se houver mensagens nossas repetidas no histórico, foi uma falha técnica: ignora-as. Não peças desculpa por elas e não passes a conversa ao Bruno por causa disso.
- Responde tu às perguntas sobre o que fazemos, como funciona e os exemplos — isso está em SOBRE A EMPRESA. Passar ao Bruno é só para os casos da regra passar_a_humano.
- Não insistas: se a pessoa disser que não tem interesse, agradece e despede-te com simpatia (sem pressão).
- sair=true se a pessoa pedir para não ser contactada, se mostrar irritada, ou disser que o número está errado e não quer mais mensagens. A mensagem é uma despedida curta e educada.
- lead_quente=true quando há interesse real: pergunta o preço, quer ver uma versão ou um exemplo, aceita a proposta, pede para ligar, diz quando pode falar.
- passar_a_humano=true quando pede para falar com uma pessoa, quer negociar, faz uma pergunta que não sabes responder, reclama, ou o assunto não tem nada a ver com sites.
- motivo: uma frase curta, sempre, para o Bruno perceber a conversa num relance.`;

export function construirSistema(cfg: ConfiguracaoDoRobo): string {
  const sobre = cfg.sobre.trim() || SOBRE_POR_OMISSAO;
  const objetivo = cfg.objetivo.trim() || OBJETIVO_POR_OMISSAO;
  const regras = cfg.regras.trim();
  return [
    'És o assistente de vendas da VaiDesign no WhatsApp. Respondes a pessoas que receberam uma mensagem nossa a oferecer um site (ou que nos escreveram).',
    `SOBRE A EMPRESA:\n${sobre}`,
    `OBJETIVO DA CONVERSA:\n${objetivo}`,
    ...(regras ? [`REGRAS DO BRUNO:\n${regras}`] : []),
    REGRAS_FIXAS,
  ].join('\n\n');
}

export interface LeadDoRobo {
  nome?: string | null;
  ramo?: string | null;
  cidade?: string | null;
  pais?: string | null;
  site?: string | null;
}

export interface MensagemDoHistorico {
  de_mim: boolean;
  texto: string | null;
  tipo?: string | null;
}

const SITUACAO_DO_SITE: Record<string, string> = {
  none: 'não tem site',
  social_only: 'só tem redes sociais (Instagram/Facebook), sem site próprio',
  real: 'já tem site próprio (a proposta é uma versão nova para comparar)',
};

/** O contexto da conversa: quem é a pessoa e de onde é. Vai como primeira mensagem. */
export function construirContexto(args: {
  pais: string;
  lead: LeadDoRobo | null;
  nomeWhatsapp?: string | null;
}): string {
  const linhas = [
    'CONTEXTO (escrito pelo sistema, não pela pessoa):',
    `- País: ${args.pais === 'BR' ? 'Brasil (fala português do Brasil)' : 'Portugal (fala português de Portugal)'}`,
  ];
  if (args.nomeWhatsapp) linhas.push(`- Nome no WhatsApp: ${args.nomeWhatsapp}`);
  if (args.lead?.nome) linhas.push(`- Negócio: ${args.lead.nome}`);
  if (args.lead?.ramo) linhas.push(`- Ramo: ${args.lead.ramo}`);
  if (args.lead?.cidade) linhas.push(`- Cidade: ${args.lead.cidade}`);
  if (args.lead?.site)
    linhas.push(`- Situação: ${SITUACAO_DO_SITE[args.lead.site] ?? args.lead.site}`);
  if (!args.lead) linhas.push('- Não é um lead conhecido da base.');
  linhas.push('A conversa no WhatsApp começa a seguir.');
  return linhas.join('\n');
}

export const PEDIDO_DE_SEGUIMENTO =
  '(Mensagem do sistema, não da pessoa: a pessoa não responde à tua última mensagem há um dia. Escreve UM seguimento curto e simpático, sem pressão, que lhe dê uma razão fácil para responder. Não repitas o que já disseste.)';

type Papel = 'user' | 'assistant';

/**
 * O histórico no formato da API: o que a pessoa escreveu é `user`, o que
 * nós escrevemos (disparo, robô, Bruno) é `assistant`. Começa sempre pelo
 * contexto (`user`) e acaba sempre em `user` — os modelos novos não aceitam
 * acabar numa mensagem nossa.
 */
export function construirMensagens(args: {
  contexto: string;
  historico: readonly MensagemDoHistorico[];
  seguimento: boolean;
}): { role: Papel; content: string }[] {
  const msgs: { role: Papel; content: string }[] = [{ role: 'user', content: args.contexto }];
  for (const m of args.historico) {
    const texto =
      (m.texto ?? '').trim() || `(${m.tipo ?? 'mensagem'} sem texto: imagem, áudio ou ficheiro)`;
    const papel: Papel = m.de_mim ? 'assistant' : 'user';
    const ultima = msgs[msgs.length - 1]!;
    // Duas seguidas do mesmo lado juntam-se numa só, como a pessoa as leu.
    if (ultima.role === papel && ultima !== msgs[0]) ultima.content += `\n\n${texto}`;
    else msgs.push({ role: papel, content: texto });
  }
  if (args.seguimento || msgs[msgs.length - 1]!.role === 'assistant') {
    msgs.push({ role: 'user', content: PEDIDO_DE_SEGUIMENTO });
  }
  return msgs;
}

/** O aviso de lead quente que vai para o telemóvel do Bruno. */
export function textoDoAviso(args: {
  nome: string | null;
  numero: string;
  motivo: string;
  humano: boolean;
  site: string;
}): string {
  const titulo = args.humano ? '🙋 Precisam de ti no WhatsApp' : '🔥 Lead quente no WhatsApp';
  return [
    titulo,
    `${args.nome ?? 'Sem nome'} · +${args.numero}`,
    args.motivo,
    `${args.site.replace(/\/+$/, '')}/painel/disparos/conversas?n=${args.numero}`,
  ].join('\n');
}
