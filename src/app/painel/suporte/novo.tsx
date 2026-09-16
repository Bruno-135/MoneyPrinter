'use client';

import { useRef, useState, useTransition } from 'react';
import { SERVICOS } from '@/lib/servicos/catalogo';
import { PRAZOS } from '@/lib/suporte/prazos';
import { novoPedido } from './actions';

export interface ClientePossivel {
  id: string;
  nome: string;
  localidade: string | null;
}

/**
 * O formulário de um pedido novo.
 *
 * Fechado por omissão: a caixa de entrada é para ver o que está por fazer, e um
 * formulário sempre aberto empurrava a lista para baixo do ecrã num telemóvel.
 *
 * O prazo é obrigatório e tem quatro botões em vez de um calendário. Escolher
 * uma data num telemóvel entre duas chamadas é trabalho a mais, e um pedido sem
 * prazo fica para depois para sempre.
 */
export function NovoPedido({ clientes }: { clientes: readonly ClientePossivel[] }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, comecar] = useTransition();
  const forma = useRef<HTMLFormElement>(null);

  /**
   * Limpar e fechar acontece AQUI e não num efeito a olhar para o resultado.
   * Um efeito que fecha o formulário quando vê "guardado" dispara outra vez se
   * o mesmo resultado voltar, e fecha-o por baixo de quem já o tinha reaberto.
   */
  function enviar(dados: FormData) {
    comecar(async () => {
      const resultado = await novoPedido({ erro: null, feito: false }, dados);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setErro(null);
      forma.current?.reset();
      setAberto(false);
    });
  }

  if (clientes.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-[13px] text-ink2">
        Ainda não há clientes na carteira. Os pedidos de suporte são de quem já te paga — regista
        uma venda na ficha de um comércio e ele passa a aparecer aqui.
      </p>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="self-start rounded-xl border border-acc bg-surf px-4 py-2.5 text-[13px] font-bold text-acc"
      >
        + Anotar um pedido
      </button>
    );
  }

  const campo =
    'h-10 w-full rounded-xl border border-line bg-surf2 px-3 text-[13px] text-ink placeholder:text-ink3';

  return (
    <form ref={forma} action={enviar} className="rounded-2xl border border-line bg-surf p-3.5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold">Pedido novo</h2>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-[13px] text-ink3 underline underline-offset-2"
        >
          Fechar
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
            Cliente
          </span>
          <select name="businessId" className={campo} required>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
                {c.localidade ? ` · ${c.localidade}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
            O que ele pediu
          </span>
          <input
            name="titulo"
            className={campo}
            placeholder="Trocar a foto do prato do dia"
            required
            minLength={3}
          />
        </label>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
              Serviço
            </span>
            <select name="servico" className={campo} defaultValue="">
              <option value="">— nenhum em especial —</option>
              {SERVICOS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
              Chegou por
            </span>
            <select name="origem" className={campo} defaultValue="whatsapp">
              <option value="whatsapp">WhatsApp</option>
              <option value="chamada">Chamada</option>
              <option value="email">E-mail</option>
              <option value="pessoalmente">Pessoalmente</option>
            </select>
          </label>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
            Fica de estar feito
          </legend>
          <div className="flex flex-wrap gap-2">
            {PRAZOS.map((p) => (
              <label key={p.dias} className="cursor-pointer">
                <input
                  type="radio"
                  name="prazo"
                  value={p.dias}
                  defaultChecked={p.dias === 2}
                  className="peer sr-only"
                />
                <span className="flex h-9 items-center rounded-xl border border-line bg-surf2 px-3 text-[13px] peer-checked:border-acc peer-checked:text-acc">
                  {p.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">
            Notas
          </span>
          <textarea
            name="detalhes"
            rows={2}
            className="w-full rounded-xl border border-line bg-surf2 p-3 text-[13px] text-ink placeholder:text-ink3"
            placeholder="O que mais é preciso saber para o fazer."
          />
        </label>

        {erro && <p className="text-[13px] text-bad">{erro}</p>}

        <button
          type="submit"
          disabled={aEnviar}
          className="h-11 rounded-xl bg-acc text-sm font-bold text-bg disabled:opacity-50"
        >
          {aEnviar ? 'A guardar…' : 'Anotar'}
        </button>
      </div>
    </form>
  );
}
