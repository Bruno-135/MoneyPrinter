import 'server-only';
import { getServerEnv } from '@/lib/env';

/**
 * O cliente da Evolution API (o nosso servidor de WhatsApp na Hostinger).
 *
 * Só servidor: a chave global (`EVOLUTION_API_KEY`) abre TODOS os números
 * ligados, e vive só nas variáveis da Vercel. Nunca vai ao browser, nunca vai
 * para a base, nunca aparece numa mensagem de erro.
 *
 * Cada função devolve `{ ok, ... }` em vez de lançar: quem chama (o motor, o
 * ecrã) decide o que fazer com uma falha, e uma falha da Evolution nunca pode
 * rebentar uma página inteira do painel.
 */

export type Resposta<T> = { ok: true; dados: T } | { ok: false; erro: string; estado?: number };

const TEMPO_MAXIMO_MS = 20_000;

function configuracao(): { url: string; chave: string } | null {
  const env = getServerEnv();
  if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY) return null;
  return {
    url: env.EVOLUTION_API_URL.replace(/\/+$/, ''),
    chave: env.EVOLUTION_API_KEY,
  };
}

export function evolutionConfigurada(): boolean {
  return configuracao() !== null;
}

/** A mensagem de erro que a Evolution devolve vem em formatos diferentes conforme a rota. */
function mensagemDeErro(corpo: unknown, estado: number): string {
  const c = corpo as {
    response?: { message?: unknown };
    message?: unknown;
    error?: unknown;
  } | null;
  const m = c?.response?.message ?? c?.message ?? c?.error;
  if (Array.isArray(m))
    return m.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('; ');
  if (typeof m === 'string') return m;
  return `Erro ${estado} da Evolution`;
}

async function pedir<T>(
  metodo: 'GET' | 'POST',
  caminho: string,
  corpo?: unknown,
): Promise<Resposta<T>> {
  const cfg = configuracao();
  if (!cfg)
    return {
      ok: false,
      erro: 'Falta EVOLUTION_API_URL ou EVOLUTION_API_KEY neste ambiente.',
    };
  try {
    const res = await fetch(`${cfg.url}${caminho}`, {
      method: metodo,
      headers: { apikey: cfg.chave, 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      cache: 'no-store',
      signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
    });
    const texto = await res.text();
    let json: unknown = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      json = null;
    }
    if (!res.ok)
      return {
        ok: false,
        erro: mensagemDeErro(json, res.status).slice(0, 300),
        estado: res.status,
      };
    return { ok: true, dados: json as T };
  } catch (e) {
    const erro =
      e instanceof Error && e.name === 'TimeoutError'
        ? 'A Evolution não respondeu a tempo.'
        : 'Não foi possível falar com a Evolution.';
    return { ok: false, erro };
  }
}

const enc = encodeURIComponent;

export interface InstanciaEvolution {
  nome: string;
  /** 'open' quando está ligada. */
  estado: string;
  /** Só dígitos, ou null enquanto não leu o QR. */
  numero: string | null;
  perfil: string | null;
}

function numeroDoJid(jid: unknown): string | null {
  if (typeof jid !== 'string') return null;
  const d = jid.split('@')[0]!.split(':')[0]!.replace(/\D/g, '');
  return d || null;
}

/** Todas as instâncias do servidor (cada uma é um número). */
export async function listarInstancias(): Promise<Resposta<InstanciaEvolution[]>> {
  const r = await pedir<unknown[]>('GET', '/instance/fetchInstances');
  if (!r.ok) return r;
  const lista = Array.isArray(r.dados) ? r.dados : [];
  return {
    ok: true,
    dados: lista
      .map((x) => {
        const i = x as Record<string, unknown> & {
          instance?: Record<string, unknown>;
        };
        const nome = (i.name ?? i.instance?.instanceName ?? '') as string;
        return {
          nome,
          estado: String(i.connectionStatus ?? i.instance?.status ?? 'close'),
          numero:
            numeroDoJid(i.ownerJid ?? i.instance?.owner) ??
            (typeof i.number === 'string' ? i.number : null),
          perfil: (i.profileName ?? i.instance?.profileName ?? null) as string | null,
        };
      })
      .filter((i) => i.nome),
  };
}

export async function estadoDaInstancia(instancia: string): Promise<Resposta<string>> {
  const r = await pedir<{ instance?: { state?: string } }>(
    'GET',
    `/instance/connectionState/${enc(instancia)}`,
  );
  if (!r.ok) return r;
  return { ok: true, dados: r.dados?.instance?.state ?? 'close' };
}

/**
 * O número tem WhatsApp? Devolve também o número como o WhatsApp o conhece —
 * no Brasil o nono dígito nem sempre bate, e mandar para o número errado é
 * mandar para ninguém.
 */
export async function verificarNumero(
  instancia: string,
  numero: string,
): Promise<Resposta<{ existe: boolean; numero: string }>> {
  const r = await pedir<{ exists?: boolean; jid?: string; number?: string }[]>(
    'POST',
    `/chat/whatsappNumbers/${enc(instancia)}`,
    { numbers: [numero] },
  );
  if (!r.ok) return r;
  const primeiro = Array.isArray(r.dados) ? r.dados[0] : undefined;
  return {
    ok: true,
    dados: {
      existe: Boolean(primeiro?.exists),
      numero: numeroDoJid(primeiro?.jid) ?? numero,
    },
  };
}

/**
 * Manda um texto. O `atrasoMs` faz o WhatsApp mostrar «a escrever…» antes de
 * a mensagem chegar, como faz uma pessoa.
 */
export async function enviarTexto(
  instancia: string,
  numero: string,
  texto: string,
  atrasoMs = 0,
): Promise<Resposta<{ id: string | null }>> {
  const r = await pedir<{ key?: { id?: string } }>('POST', `/message/sendText/${enc(instancia)}`, {
    number: numero,
    text: texto,
    delay: Math.max(0, Math.round(atrasoMs)),
    linkPreview: true,
  });
  if (!r.ok) return r;
  return { ok: true, dados: { id: r.dados?.key?.id ?? null } };
}

/** Aponta os eventos da instância (mensagens e ligação) para o nosso webhook. */
export async function configurarWebhook(instancia: string, url: string): Promise<Resposta<null>> {
  const r = await pedir<unknown>('POST', `/webhook/set/${enc(instancia)}`, {
    webhook: {
      enabled: true,
      url,
      byEvents: false,
      base64: false,
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    },
  });
  return r.ok ? { ok: true, dados: null } : r;
}

/**
 * Cria uma instância nova (um número por ligar). Com `numero`, a Evolution
 * prepara também o código de ligação de 8 letras, para quem não pode ler o QR
 * (o painel aberto no próprio telemóvel do chip).
 *
 * Grupos ignorados à nascença: o robô e os disparos só falam com pessoas, e
 * um grupo cheio de mensagens só enchia a caixa de conversas.
 */
export async function criarInstancia(
  instancia: string,
  numero?: string | null,
): Promise<Resposta<null>> {
  const r = await pedir<unknown>('POST', '/instance/create', {
    instanceName: instancia,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
    ...(numero ? { number: numero } : {}),
    groupsIgnore: true,
    rejectCall: false,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: false,
  });
  return r.ok ? { ok: true, dados: null } : r;
}

export type EstadoDoQr =
  | { ligado: true }
  | { ligado: false; qr: string | null; codigo: string | null };

/**
 * O QR do momento (imagem em `data:image/png;base64,...`), ou «já ligado».
 * Cada QR dura uns 40 segundos; chamar outra vez devolve o seguinte.
 */
export async function pedirQr(instancia: string): Promise<Resposta<EstadoDoQr>> {
  const r = await pedir<{
    base64?: string;
    pairingCode?: string | null;
    instance?: { state?: string };
    error?: boolean;
    message?: string;
  }>('GET', `/instance/connect/${enc(instancia)}`);
  if (!r.ok) return r;
  const d = r.dados ?? {};
  if (d.error)
    return { ok: false, erro: String(d.message ?? 'A Evolution recusou o pedido.').slice(0, 300) };
  if (d.instance?.state === 'open') return { ok: true, dados: { ligado: true } };
  return {
    ok: true,
    dados: {
      ligado: false,
      qr: typeof d.base64 === 'string' && d.base64.startsWith('data:image') ? d.base64 : null,
      codigo: typeof d.pairingCode === 'string' && d.pairingCode ? d.pairingCode : null,
    },
  };
}
