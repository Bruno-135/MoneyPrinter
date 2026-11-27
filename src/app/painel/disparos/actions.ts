'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import type { Database } from '@/types/database.types';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { publicEnv } from '@/lib/env';
import { randomBytes } from 'node:crypto';
import {
  configurarWebhook,
  criarInstancia,
  enviarTexto,
  estadoDaInstancia,
  listarInstancias,
  pedirQr,
} from '@/lib/whatsapp/evolution';
import { nomeDeInstancia, normalizarNumero, paisDoNumero } from '@/lib/whatsapp/disparos';
import { lerPedido, selecionar } from '@/lib/whatsapp/painel-disparos';
import { gerarResposta } from '@/lib/whatsapp/robo';
import { ehModeloDoRobo, type RespostaDoRobo } from '@/lib/whatsapp/robo-prompt';

/**
 * As acções do ecrã de disparos. Todas com a sessão de quem carrega (a RLS
 * decide o que cada um toca) e com a guarda da área `whatsapp`.
 *
 * Os erros voltam na própria página, por `?erro=` — o ecrã é um formulário
 * simples e não vale a pena um estado de cliente só para mostrar uma frase.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMINHO = '/painel/disparos';

function texto(form: FormData, chave: string): string {
  const v = form.get(chave);
  return typeof v === 'string' ? v.trim() : '';
}

function voltarComErro(erro: string, caminho: string = CAMINHO): never {
  redirect(`${caminho}?erro=${encodeURIComponent(erro)}` as Route);
}

function estadoDoChip(estadoEvolution: string): 'ligado' | 'a_ligar' | 'desligado' {
  return estadoEvolution === 'open'
    ? 'ligado'
    : estadoEvolution === 'connecting'
      ? 'a_ligar'
      : 'desligado';
}

function urlDoWebhook(token: string): string {
  return `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')}/api/whatsapp/webhook/${token}`;
}

// ---------- chips ----------

export async function adicionarChip(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const instancia = texto(form, 'instancia');
  const jaAquecido = texto(form, 'aquecido') === 'sim';
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(instancia)) voltarComErro('Escolha a instância.');

  const lista = await listarInstancias();
  if (!lista.ok) voltarComErro(lista.erro);
  const daEvolution = lista.dados.find((i) => i.nome === instancia);
  if (!daEvolution) voltarComErro('Essa instância não existe na Evolution.');

  const db = await createClient();
  const hoje = new Date();
  const { data: chip, error } = await db
    .from('whatsapp_chips')
    .insert({
      instancia,
      nome: daEvolution.perfil ?? instancia,
      numero: daEvolution.numero,
      pais: daEvolution.numero ? paisDoNumero(daEvolution.numero) : 'PT',
      estado: estadoDoChip(daEvolution.estado),
      // Um número antigo, com conversas, já está aquecido: começa na fase de manutenção.
      aquecimento_desde: jaAquecido
        ? new Date(hoje.getTime() - 14 * 86_400_000).toISOString().slice(0, 10)
        : hoje.toISOString().slice(0, 10),
    })
    .select('webhook_token')
    .single();
  if (error) {
    voltarComErro(
      error.code === '23505'
        ? 'Esse chip já está ligado ao sistema.'
        : `Não foi possível gravar: ${error.message}`,
    );
  }

  const webhook = await configurarWebhook(instancia, urlDoWebhook(chip.webhook_token));
  revalidatePath(CAMINHO);
  if (!webhook.ok) voltarComErro(`Chip gravado, mas o webhook não ficou: ${webhook.erro}`);
}

/**
 * Um número novo, ligado a partir do painel: cria o chip na base (para ter o
 * token do webhook), cria a instância na Evolution, aponta-lhe o webhook e
 * leva ao ecrã do QR. Se a Evolution falhar, o chip sai da base — não fica um
 * chip fantasma sem instância.
 */
export async function novoChip(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const rotulo = texto(form, 'nome').slice(0, 60) || 'Chip';
  const jaAquecido = texto(form, 'aquecido') === 'sim';
  const numeroEscrito = texto(form, 'numero');
  const numero = numeroEscrito
    ? normalizarNumero(numeroEscrito, texto(form, 'pais') === 'BR' ? 'BR' : 'PT')
    : null;
  if (numeroEscrito && !numero) {
    voltarComErro('Esse número não parece certo. Escreva com o indicativo (+351 ou +55).');
  }

  const instancia = nomeDeInstancia(rotulo, randomBytes(3).toString('hex'));
  const db = await createClient();
  const hoje = new Date();
  const { data: chip, error } = await db
    .from('whatsapp_chips')
    .insert({
      instancia,
      nome: rotulo,
      numero,
      pais: numero ? paisDoNumero(numero) : texto(form, 'pais') === 'BR' ? 'BR' : 'PT',
      estado: 'a_ligar',
      aquecimento_desde: jaAquecido
        ? new Date(hoje.getTime() - 14 * 86_400_000).toISOString().slice(0, 10)
        : hoje.toISOString().slice(0, 10),
    })
    .select('id, webhook_token')
    .single();
  if (error) voltarComErro(`Não foi possível gravar: ${error.message}`);

  const criada = await criarInstancia(instancia, numero);
  if (!criada.ok) {
    await db.from('whatsapp_chips').delete().eq('id', chip.id);
    voltarComErro(`A Evolution não criou o número: ${criada.erro}`);
  }
  await configurarWebhook(instancia, urlDoWebhook(chip.webhook_token));
  revalidatePath(CAMINHO);
  redirect(`${CAMINHO}/ligar/${chip.id}` as Route);
}

export type EstadoDaLigacao =
  | { tipo: 'ligado'; numero: string | null; nome: string | null }
  | { tipo: 'qr'; qr: string | null; codigo: string | null }
  | { tipo: 'erro'; erro: string };

/**
 * Chamado pelo ecrã do QR de poucos em poucos segundos: devolve o QR do
 * momento, ou — quando o telemóvel o leu — grava o número no chip e diz que
 * ficou ligado.
 */
export async function verificarLigacao(chipId: string): Promise<EstadoDaLigacao> {
  await exigirAcesso('whatsapp');
  if (!UUID.test(chipId)) return { tipo: 'erro', erro: 'Chip desconhecido.' };
  const db = await createClient();
  const { data: chip } = await db
    .from('whatsapp_chips')
    .select('id, instancia, webhook_token')
    .eq('id', chipId)
    .maybeSingle();
  if (!chip) return { tipo: 'erro', erro: 'Este chip já não está no sistema.' };

  const qr = await pedirQr(chip.instancia);
  if (!qr.ok) return { tipo: 'erro', erro: qr.erro };
  if (!qr.dados.ligado) return { tipo: 'qr', qr: qr.dados.qr, codigo: qr.dados.codigo };

  const lista = await listarInstancias();
  const info = lista.ok ? lista.dados.find((i) => i.nome === chip.instancia) : undefined;
  await db
    .from('whatsapp_chips')
    .update({
      estado: 'ligado',
      ...(info?.numero ? { numero: info.numero, pais: paisDoNumero(info.numero) } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', chip.id);
  // O webhook outra vez: uma instância antiga podia ter outro endereço.
  await configurarWebhook(chip.instancia, urlDoWebhook(chip.webhook_token));
  revalidatePath(CAMINHO);
  return { tipo: 'ligado', numero: info?.numero ?? null, nome: info?.perfil ?? null };
}

export async function atualizarChip(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const id = texto(form, 'id');
  if (!UUID.test(id)) return;
  const db = await createClient();
  const { data: chip } = await db
    .from('whatsapp_chips')
    .select('instancia, webhook_token')
    .eq('id', id)
    .maybeSingle();
  if (!chip) return;

  const [estado, lista] = await Promise.all([
    estadoDaInstancia(chip.instancia),
    listarInstancias(),
  ]);
  if (!estado.ok) voltarComErro(estado.erro);
  const info = lista.ok ? lista.dados.find((i) => i.nome === chip.instancia) : undefined;
  await db
    .from('whatsapp_chips')
    .update({
      estado: estadoDoChip(estado.dados),
      ...(info?.numero ? { numero: info.numero, pais: paisDoNumero(info.numero) } : {}),
      ...(info?.perfil ? { nome: info.perfil } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  const webhook = await configurarWebhook(chip.instancia, urlDoWebhook(chip.webhook_token));
  revalidatePath(CAMINHO);
  if (!webhook.ok) voltarComErro(`Estado atualizado, mas o webhook não ficou: ${webhook.erro}`);
}

export async function mudarChip(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const id = texto(form, 'id');
  const acao = texto(form, 'acao');
  if (!UUID.test(id)) return;
  const db = await createClient();
  const agora = new Date();

  const mudancas: Database['public']['Tables']['whatsapp_chips']['Update'] = {
    updated_at: agora.toISOString(),
  };
  if (acao === 'pausar') mudancas.ativo = false;
  else if (acao === 'retomar') mudancas.ativo = true;
  else if (acao === 'destravar')
    Object.assign(mudancas, { travado_motivo: null, falhas_seguidas: 0 });
  else if (acao === 'aquecer')
    Object.assign(mudancas, {
      aquecer: true,
      proximo_aquecimento_em: agora.toISOString(),
    });
  else if (acao === 'parar_aquecimento') mudancas.aquecer = false;
  else if (acao === 'aquecido')
    mudancas.aquecimento_desde = new Date(agora.getTime() - 14 * 86_400_000)
      .toISOString()
      .slice(0, 10);
  else if (acao === 'recomecar') mudancas.aquecimento_desde = agora.toISOString().slice(0, 10);
  else if (acao === 'ritmo') {
    const limite = Number.parseInt(texto(form, 'limite'), 10);
    const intervalo = Number.parseInt(texto(form, 'intervalo'), 10);
    if (!(limite >= 1 && limite <= 200) || !(intervalo >= 2 && intervalo <= 120)) {
      voltarComErro('Limite entre 1 e 200 por dia; intervalo entre 2 e 120 minutos.');
    }
    Object.assign(mudancas, {
      limite_diario: limite,
      intervalo_min: intervalo,
    });
  } else if (acao === 'remover') {
    await db.from('whatsapp_chips').delete().eq('id', id);
    revalidatePath(CAMINHO);
    return;
  } else return;

  await db.from('whatsapp_chips').update(mudancas).eq('id', id);
  revalidatePath(CAMINHO);
}

// ---------- números de confiança (aquecimento) ----------

export async function adicionarNumeroDeAquecimento(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const numero = normalizarNumero(
    texto(form, 'numero'),
    texto(form, 'pais') === 'BR' ? 'BR' : 'PT',
  );
  if (!numero)
    voltarComErro('Esse número não parece certo. Escreva com o indicativo (+351 ou +55).');
  const db = await createClient();
  const { error } = await db.from('whatsapp_aquecimento_numeros').insert({
    numero,
    nome: texto(form, 'nome').slice(0, 80),
    pais: paisDoNumero(numero),
  });
  if (error && error.code !== '23505') voltarComErro(`Não foi possível gravar: ${error.message}`);
  revalidatePath(CAMINHO);
}

export async function removerNumeroDeAquecimento(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const id = texto(form, 'id');
  if (!UUID.test(id)) return;
  const db = await createClient();
  await db.from('whatsapp_aquecimento_numeros').delete().eq('id', id);
  revalidatePath(CAMINHO);
}

// ---------- disparos ----------

/** Refaz a seleção da pré-visualização e põe tudo na fila do motor. */
export async function criarDisparo(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const params: Record<string, string | string[]> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v !== 'string') continue;
    const atual = params[k];
    params[k] = atual === undefined ? v : Array.isArray(atual) ? [...atual, v] : [atual, v];
  }
  const pedido = lerPedido(params);
  const db = await createClient();
  const selecao = await selecionar(db, pedido);
  if (selecao.erro) voltarComErro(selecao.erro, `${CAMINHO}/nova`);

  const { data: campanha, error } = await db
    .from('whatsapp_campanhas')
    .insert({
      nome: pedido.nome,
      chips: pedido.chips,
      hora_inicio: pedido.horaInicio,
      hora_fim: pedido.horaFim,
    })
    .select('id')
    .single();
  if (error) voltarComErro(`Não foi possível criar o disparo: ${error.message}`, `${CAMINHO}/nova`);

  const linhas = selecao.destinatarios.map((d, i) => ({
    campanha_id: campanha.id,
    business_id: d.businessId,
    numero: d.numero,
    pais: d.pais,
    nome: d.nome || null,
    texto: d.texto,
    ordem: i,
  }));
  for (let i = 0; i < linhas.length; i += 500) {
    const { error: e2 } = await db.from('whatsapp_envios').insert(linhas.slice(i, i + 500));
    if (e2) {
      // Sem fila completa não há disparo: apaga a campanha (e o que já entrou, em cascata).
      await db.from('whatsapp_campanhas').delete().eq('id', campanha.id);
      voltarComErro(`Não foi possível pôr na fila: ${e2.message}`, `${CAMINHO}/nova`);
    }
  }
  revalidatePath(CAMINHO);
  redirect(`${CAMINHO}/${campanha.id}` as Route);
}

export async function mudarDisparo(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const id = texto(form, 'id');
  const acao = texto(form, 'acao');
  if (!UUID.test(id)) return;
  const db = await createClient();
  const agora = new Date().toISOString();
  if (acao === 'pausar') {
    await db
      .from('whatsapp_campanhas')
      .update({ estado: 'pausada', updated_at: agora })
      .eq('id', id)
      .eq('estado', 'a_correr');
  } else if (acao === 'retomar') {
    await db
      .from('whatsapp_campanhas')
      .update({ estado: 'a_correr', updated_at: agora })
      .eq('id', id)
      .eq('estado', 'pausada');
  } else if (acao === 'cancelar') {
    await db
      .from('whatsapp_campanhas')
      .update({ estado: 'cancelada', terminada_em: agora, updated_at: agora })
      .eq('id', id)
      .in('estado', ['a_correr', 'pausada']);
    await db
      .from('whatsapp_envios')
      .update({ estado: 'cancelado', erro: 'disparo cancelado' })
      .eq('campanha_id', id)
      .eq('estado', 'pendente');
  }
  revalidatePath(CAMINHO);
  revalidatePath(`${CAMINHO}/${id}`);
}

// ---------- conversas ----------

export async function responder(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const numero = texto(form, 'numero');
  const mensagem = texto(form, 'texto').slice(0, 4000);
  const caminho = `${CAMINHO}/conversas?n=${numero}`;
  if (!/^[1-9][0-9]{7,14}$/.test(numero) || !mensagem) return;

  const db = await createClient();
  // Responde pelo chip por onde a conversa estava a correr.
  const { data: ultima } = await db
    .from('whatsapp_mensagens')
    .select('chip_id, business_id, owner_id')
    .eq('numero', numero)
    .order('enviada_em', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ultima) redirect(caminho as Route);
  const { data: chip } = await db
    .from('whatsapp_chips')
    .select('instancia')
    .eq('id', ultima.chip_id)
    .maybeSingle();
  if (!chip)
    redirect(
      `${caminho}&erro=${encodeURIComponent('O chip desta conversa já não está no sistema.')}` as Route,
    );

  const enviado = await enviarTexto(chip.instancia, numero, mensagem, 1200);
  if (!enviado.ok) redirect(`${caminho}&erro=${encodeURIComponent(enviado.erro)}` as Route);

  await db.from('whatsapp_mensagens').insert({
    owner_id: ultima.owner_id,
    chip_id: ultima.chip_id,
    numero,
    business_id: ultima.business_id,
    de_mim: true,
    texto: mensagem,
    mensagem_id: enviado.dados.id,
    lida: true,
    origem: 'painel',
  });
  // Quem responde à mão assume a conversa: o robô cala-se até «Devolver ao robô».
  await db
    .from('whatsapp_conversas')
    .update({ humano_desde: new Date().toISOString(), responder_em: null, seguimento_em: null })
    .eq('numero', numero)
    .is('humano_desde', null);
  revalidatePath(`${CAMINHO}/conversas`);
  redirect(caminho as Route);
}

export async function naoContactarNumero(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  // O dono por extenso: o valor por omissão desta tabela é `auth.uid()`, que
  // para uma conta da equipa não é o dono do espaço. (A segunda leitura não
  // vai à base: `lerQuemSou` guarda a resposta durante o pedido.)
  const quem = await exigirAcesso('whatsapp');
  const numero = texto(form, 'numero');
  if (!/^[1-9][0-9]{7,14}$/.test(numero)) return;
  const db = await createClient();
  const { data: ultima } = await db
    .from('whatsapp_mensagens')
    .select('business_id')
    .eq('numero', numero)
    .not('business_id', 'is', null)
    .limit(1)
    .maybeSingle();
  await db.from('nao_contactar').insert({
    owner_id: quem.donoId,
    telefone: numero,
    business_id: ultima?.business_id ?? null,
    motivo: 'marcado na caixa de conversas',
  });
  await db
    .from('whatsapp_envios')
    .update({ estado: 'cancelado', erro: 'marcado como não contactar' })
    .eq('numero', numero)
    .eq('estado', 'pendente');
  revalidatePath(`${CAMINHO}/conversas`);
  redirect(`${CAMINHO}/conversas?n=${numero}` as Route);
}

// ---------- robô ----------

export async function guardarRobo(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const quem = await exigirAcesso('whatsapp');
  const inteiro = (k: string, min: number, max: number, omissao: number) => {
    const n = Number.parseInt(texto(form, k), 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : omissao;
  };
  const avisarEscrito = texto(form, 'avisar_numero');
  const avisar = avisarEscrito ? normalizarNumero(avisarEscrito, 'PT') : null;
  if (avisarEscrito && !avisar) {
    voltarComErro('O número para avisos não parece certo.', `${CAMINHO}/robo`);
  }
  const modelo = texto(form, 'modelo');
  const responderA = texto(form, 'responder_a');
  const horaInicio = inteiro('hora_inicio', 0, 23, 8);
  const db = await createClient();
  const { error } = await db.from('whatsapp_robo').upsert({
    owner_id: quem.donoId,
    modelo: ehModeloDoRobo(modelo) ? modelo : 'claude-opus-5-5',
    responder_a: ['disparos', 'leads', 'todos'].includes(responderA) ? responderA : 'disparos',
    sobre: texto(form, 'sobre').slice(0, 8000),
    objetivo: texto(form, 'objetivo').slice(0, 2000),
    regras: texto(form, 'regras').slice(0, 4000),
    avisar_numero: avisar,
    hora_inicio: horaInicio,
    hora_fim: Math.max(horaInicio + 1, inteiro('hora_fim', 1, 24, 22)),
    max_respostas: inteiro('max_respostas', 1, 50, 12),
    seguimento: texto(form, 'seguimento') === 'sim',
    seguimento_horas: inteiro('seguimento_horas', 2, 168, 24),
    updated_at: new Date().toISOString(),
  });
  if (error) voltarComErro(`Não foi possível gravar: ${error.message}`, `${CAMINHO}/robo`);
  revalidatePath(`${CAMINHO}/robo`);
  redirect(`${CAMINHO}/robo?gravado=1` as Route);
}

export type RespostaDoTeste = { ok: true; resposta: RespostaDoRobo } | { ok: false; erro: string };

/**
 * O teste do robô no painel: a mesma IA, a mesma configuração GRAVADA, sem
 * WhatsApp. `historico` é a conversa de teste (o que escreveu como se fosse o
 * cliente, e o que o robô respondeu).
 */
export async function testarRobo(
  historico: { de_mim: boolean; texto: string }[],
  pais: 'PT' | 'BR',
): Promise<RespostaDoTeste> {
  await exigirAcesso('whatsapp');
  const db = await createClient();
  const { data: robo } = await db.from('whatsapp_robo').select('*').maybeSingle();
  const limpo = historico
    .slice(-30)
    .map((m) => ({ de_mim: Boolean(m.de_mim), texto: String(m.texto ?? '').slice(0, 2000) }));
  const r = await gerarResposta({
    modelo: robo?.modelo ?? 'claude-opus-5-5',
    configuracao: {
      sobre: robo?.sobre ?? '',
      objetivo: robo?.objetivo ?? '',
      regras: robo?.regras ?? '',
    },
    pais,
    lead: {
      nome: 'Padaria de Teste',
      ramo: 'Padaria',
      cidade: pais === 'BR' ? 'São Paulo' : 'Lisboa',
      site: 'none',
    },
    historico: limpo,
    seguimento: false,
  });
  return r.ok ? { ok: true, resposta: r.resposta } : { ok: false, erro: r.erro };
}

export async function mudarConversa(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const numero = texto(form, 'numero');
  const acao = texto(form, 'acao');
  if (!/^[1-9][0-9]{7,14}$/.test(numero)) return;
  const db = await createClient();
  const agora = new Date().toISOString();
  if (acao === 'desligar_robo') {
    await db
      .from('whatsapp_conversas')
      .update({ robo_ativo: false, responder_em: null, seguimento_em: null, updated_at: agora })
      .eq('numero', numero);
  } else if (acao === 'devolver') {
    await db
      .from('whatsapp_conversas')
      .update({ robo_ativo: true, humano_desde: null, devolvido_em: agora, updated_at: agora })
      .eq('numero', numero);
  }
  revalidatePath(`${CAMINHO}/conversas`);
  redirect(`${CAMINHO}/conversas?n=${numero}` as Route);
}

// ---------- teste real no WhatsApp ----------

/**
 * Manda uma mensagem de abertura a um número escolhido à mão e abre uma
 * conversa de TESTE: o robô (se estiver ligado) responde-lhe a sério, mesmo
 * sem disparo. Não entra em disparo nenhum, não conta para o limite do chip e
 * não impede disparos futuros para esse número. Repetir recomeça a conversa.
 */
export async function enviarTeste(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const quem = await exigirAcesso('whatsapp');
  const voltar = texto(form, 'voltar') === 'robo' ? `${CAMINHO}/robo` : `${CAMINHO}/nova`;
  const pais = texto(form, 'pais') === 'BR' ? 'BR' : 'PT';
  const numero = normalizarNumero(texto(form, 'numero'), pais);
  const mensagem = texto(form, 'texto').slice(0, 4000);
  if (!numero) voltarComErro('Escreva o número de teste com o indicativo (+351 ou +55).', voltar);
  if (!mensagem) voltarComErro('Falta a mensagem.', voltar);

  const db = await createClient();
  const { data: bloqueado } = await db
    .from('nao_contactar')
    .select('id')
    .eq('telefone', numero)
    .limit(1)
    .maybeSingle();
  if (bloqueado) voltarComErro('Esse número está em «não contactar» (respondeu SAIR).', voltar);

  const { data: chips } = await db
    .from('whatsapp_chips')
    .select('id, instancia, numero')
    .eq('estado', 'ligado')
    .eq('ativo', true)
    .order('created_at')
    .limit(1);
  const chip = chips?.[0];
  if (!chip) voltarComErro('Não há nenhum chip ligado e ativo para enviar o teste.', voltar);
  if (chip.numero === numero) voltarComErro('Use outro número: este é o próprio chip.', voltar);

  // Antes do envio: a mensagem de abertura tem de ficar DEPOIS deste instante.
  const agora = new Date(Date.now() - 1000).toISOString();
  const enviado = await enviarTexto(chip.instancia, numero, mensagem, 1500);
  if (!enviado.ok) voltarComErro(`A Evolution não enviou: ${enviado.erro}`, voltar);

  await db.from('whatsapp_mensagens').insert({
    owner_id: quem.donoId,
    chip_id: chip.id,
    numero,
    de_mim: true,
    texto: mensagem,
    mensagem_id: enviado.dados.id,
    origem: 'disparo',
    lida: true,
  });
  await db.from('whatsapp_conversas').upsert(
    {
      owner_id: quem.donoId,
      numero,
      chip_id: chip.id,
      teste: true,
      robo_ativo: true,
      humano_desde: null,
      devolvido_em: agora,
      // O robô só lê a conversa a partir deste teste: os testes anteriores não contam.
      contexto_desde: agora,
      responder_em: null,
      respostas_robo: 0,
      quente: false,
      seguimento_em: null,
      seguimento_feito: false,
      ultima_saida_em: agora,
      updated_at: agora,
    },
    { onConflict: 'owner_id,numero' },
  );
  revalidatePath(`${CAMINHO}/conversas`);
  redirect(`${voltar}?teste=${numero}` as Route);
}

/** Ligar ou desligar o robô. Ao ligar, responde já a quem ficou à espera. */
export async function ligarRobo(form: FormData): Promise<void> {
  await exigirAcesso('whatsapp');
  const quem = await exigirAcesso('whatsapp');
  const ligar = texto(form, 'acao') === 'ligar';
  const db = await createClient();
  const { error } = await db
    .from('whatsapp_robo')
    .upsert({ owner_id: quem.donoId, ativo: ligar, updated_at: new Date().toISOString() });
  if (error) voltarComErro(`Não foi possível gravar: ${error.message}`, `${CAMINHO}/robo`);
  if (ligar) {
    // As conversas cuja última mensagem é da pessoa e ainda não têm resposta.
    const { data: espera } = await db
      .from('whatsapp_conversas')
      .select('id, ultima_entrada_em, ultima_saida_em')
      .eq('robo_ativo', true)
      .is('humano_desde', null)
      .not('ultima_entrada_em', 'is', null);
    const ids = (espera ?? [])
      .filter((c) => !c.ultima_saida_em || c.ultima_entrada_em! > c.ultima_saida_em)
      .map((c) => c.id);
    if (ids.length > 0) {
      await db
        .from('whatsapp_conversas')
        .update({ responder_em: new Date().toISOString() })
        .in('id', ids);
    }
  }
  revalidatePath(`${CAMINHO}/robo`);
  redirect(`${CAMINHO}/robo` as Route);
}
