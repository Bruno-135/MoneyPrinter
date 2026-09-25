/**
 * O que vem do formulário do site, lido e julgado.
 *
 * Fica num ficheiro sozinho, sem `server-only` e sem tocar na base de dados,
 * para poder ser testado. Foi uma lição de duas vezes: uma função pura
 * enterrada num ficheiro que importa o cliente da Anthropic ou o Supabase não
 * se consegue chamar num teste, e acaba por não ser testada.
 */

export interface PedidoLido {
  negocio: string;
  contacto: string;
  pedido: string;
  ramo: string;
  prazo: string;
}

/** Qual o campo que está mal. O desenho só desenhou o erro do contacto. */
export type CampoEmFalta = 'negocio' | 'contacto' | 'pedido';

export interface Julgamento {
  ok: boolean;
  /** O primeiro campo que falha, pela ordem em que estão no ecrã. */
  falta: CampoEmFalta | null;
  valores: PedidoLido;
}

const MAXIMOS: Record<keyof PedidoLido, number> = {
  negocio: 200,
  contacto: 200,
  pedido: 4000,
  ramo: 100,
  prazo: 200,
};

/**
 * O primeiro valor PREENCHIDO com aquele nome, e não simplesmente o primeiro.
 *
 * O desenho tem o campo do contacto duas vezes na página — a versão normal e a
 * versão com o erro — e as duas estão sempre no HTML, porque é o CSS que
 * escolhe qual se vê. Um `dados.get('contacto')` devolve a primeira das duas,
 * que pode ser a que está escondida e vazia: era assim que o formulário
 * recusava um contacto que a pessoa tinha mesmo escrito.
 *
 * Isto não se via em teste nenhum de unidade. Vi-o a carregar no botão.
 */
function texto(dados: FormData, nome: keyof PedidoLido): string {
  for (const valor of dados.getAll(nome)) {
    if (typeof valor !== 'string') continue;
    const limpo = valor.trim();
    if (limpo.length > 0) return limpo.slice(0, MAXIMOS[nome]);
  }
  return '';
}

/** Lê o formulário. Não decide nada — só arruma. */
export function lerPedido(dados: FormData): PedidoLido {
  return {
    negocio: texto(dados, 'negocio'),
    contacto: texto(dados, 'contacto'),
    pedido: texto(dados, 'pedido'),
    ramo: texto(dados, 'ramo'),
    prazo: texto(dados, 'prazo'),
  };
}

/**
 * Um contacto serve se for um email ou se tiver dígitos que cheguem para ser
 * um número de telefone.
 *
 * Não se valida o formato de um telefone a sério, e é de propósito: alguém
 * que escreva "913 014 170" ou "+351 913014170" ou "913014170 (chamar depois
 * das 18h)" quer ser contactado, e recusar-lhe o formulário por causa de um
 * espaço é perder um cliente para provar um ponto. Nove dígitos é o mínimo de
 * um número português.
 */
export function contactoServe(valor: string): boolean {
  const limpo = valor.trim();
  if (limpo.length === 0) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpo)) return true;
  return (limpo.match(/\d/g) ?? []).length >= 9;
}

/** É email ou é telefone? Muda o texto do email de aviso. */
export function ehEmail(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim());
}

export function julgarPedido(dados: FormData): Julgamento {
  const valores = lerPedido(dados);

  if (valores.negocio.length === 0) return { ok: false, falta: 'negocio', valores };
  if (!contactoServe(valores.contacto)) return { ok: false, falta: 'contacto', valores };
  if (valores.pedido.length === 0) return { ok: false, falta: 'pedido', valores };

  return { ok: true, falta: null, valores };
}

/**
 * O campo isco.
 *
 * Um campo escondido que uma pessoa nunca vê e nunca preenche, mas que um robô
 * a preencher tudo o que encontra preenche. Não trava um ataque a sério —
 * trava o robô burro, que é o que aparece num site pequeno. O caro (o
 * Turnstile) entra quando houver chaves para isso.
 */
export const CAMPO_ISCO = 'apelido_da_empresa';

export function pareceRobo(dados: FormData): boolean {
  const isco = dados.get(CAMPO_ISCO);
  return typeof isco === 'string' && isco.trim().length > 0;
}
