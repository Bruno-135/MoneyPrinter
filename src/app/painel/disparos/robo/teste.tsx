'use client';

import { useState, useTransition } from 'react';
import { testarRobo, type RespostaDoTeste } from '../actions';

/**
 * Conversa de teste com o robô: escreve-se como se fosse o cliente e vê-se o
 * que ele responderia, com os sinais (quente, humano, sair). Usa a
 * configuração GRAVADA e não manda nada pelo WhatsApp.
 */

interface Linha {
  de_mim: boolean;
  texto: string;
  sinais?: string;
}

const PRIMEIRA = {
  PT: 'Olá, boa tarde! Chamo-me Bruno e trabalho com criação de sites. Encontrei o vosso negócio no Google Maps e reparei que ainda não têm site próprio. Querem que prepare um para verem como fica?',
  BR: 'Oi, boa tarde! Tudo bem? Me chamo Bruno e trabalho com criação de sites. Achei vocês no Google Maps e vi que vocês ainda não têm um site próprio. Querem que eu prepare um pra vocês verem como fica?',
};

export function TesteDoRobo() {
  const [pais, setPais] = useState<'PT' | 'BR'>('PT');
  const [linhas, setLinhas] = useState<Linha[]>([{ de_mim: true, texto: PRIMEIRA.PT }]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aPensar, comecar] = useTransition();

  function recomecar(p: 'PT' | 'BR') {
    setPais(p);
    setLinhas([{ de_mim: true, texto: PRIMEIRA[p] }]);
    setErro(null);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || aPensar) return;
    const novas = [...linhas, { de_mim: false, texto: t }];
    setLinhas(novas);
    setTexto('');
    setErro(null);
    comecar(async () => {
      let r: RespostaDoTeste;
      try {
        r = await testarRobo(
          novas.map(({ de_mim, texto }) => ({ de_mim, texto })),
          pais,
        );
      } catch {
        r = { ok: false, erro: 'Sem resposta do servidor.' };
      }
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      const s = r.resposta;
      const sinais = [
        s.lead_quente && '🔥 quente',
        s.passar_a_humano && '🙋 passa ao Bruno',
        s.sair && '🚫 sai da lista',
      ]
        .filter(Boolean)
        .join(' · ');
      const baloes = s.mensagens.length > 0 ? s.mensagens : ['(sem mensagem)'];
      const notas = [sinais, s.motivo].filter(Boolean).join(' — ');
      setLinhas((atual) => [
        ...atual,
        ...baloes.map((texto, i) => ({
          de_mim: true,
          texto,
          sinais: i === baloes.length - 1 ? notas : undefined,
        })),
      ]);
    });
  }

  return (
    <div className="border-line flex flex-col rounded-xl border">
      <div className="border-line flex flex-wrap items-center gap-2 border-b px-4 py-2 text-[13px]">
        <span className="font-semibold">Testar o robô</span>
        <span className="text-ink3">— escreva como se fosse o cliente</span>
        <div className="ml-auto flex gap-1">
          {(['PT', 'BR'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => recomecar(p)}
              className={`rounded-md border px-2 py-0.5 text-[12px] ${pais === p ? 'border-brand-600 text-brand-600 font-semibold' : 'border-line'}`}
            >
              {p === 'PT' ? 'Portugal' : 'Brasil'}
            </button>
          ))}
        </div>
      </div>
      <ol className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto p-4">
        {linhas.map((l, i) => (
          <li
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] whitespace-pre-wrap ${l.de_mim ? 'self-start bg-emerald-600/15' : 'self-end bg-black/5 dark:bg-white/10'}`}
          >
            {l.texto}
            {l.sinais && <span className="text-ink3 mt-1 block text-[11px]">{l.sinais}</span>}
          </li>
        ))}
        {aPensar && <li className="text-ink3 self-start text-[12px]">o robô está a escrever…</li>}
        {erro && <li className="text-[12px] text-red-700 dark:text-red-300">{erro}</li>}
      </ol>
      <form onSubmit={enviar} className="border-line flex gap-2 border-t p-3">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: Quanto custa?"
          className="border-line h-10 min-w-0 flex-1 rounded-md border bg-transparent px-3 text-[13px]"
        />
        <button
          disabled={aPensar}
          className="bg-brand-600 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
