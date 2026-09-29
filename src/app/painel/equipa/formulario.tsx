'use client';

import { useActionState } from 'react';
import { AREAS } from '@/lib/equipa/permissoes';
import { criarPessoa } from './actions';
import { CONVITE_PARADO } from './estado';

/**
 * O formulário de criar uma pessoa.
 *
 * Em `<details>` e fechado por omissão: na maior parte dos dias abre-se esta
 * página para mudar um acesso e não para criar mais alguém, e um formulário
 * com senha sempre aberto no topo é um formulário que se preenche por engano.
 */
export function CriarPessoa() {
  const [estado, acao] = useActionState(criarPessoa, CONVITE_PARADO);

  return (
    <details className="border-line bg-surf rounded-2xl border">
      <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-bold">
        + Dar acesso a uma pessoa
      </summary>

      <form action={acao} className="border-line flex flex-col gap-4 border-t p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-ink3 text-[11px] font-semibold">Nome</span>
            <input
              name="nome"
              required
              autoComplete="off"
              className="border-line bg-surf2 h-10 rounded-lg border px-3 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-ink3 text-[11px] font-semibold">Email de entrada</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              className="border-line bg-surf2 h-10 rounded-lg border px-3 font-mono text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-ink3 text-[11px] font-semibold">Senha (mínimo 8)</span>
            <input
              name="senha"
              type="text"
              minLength={8}
              required
              autoComplete="new-password"
              className="border-line bg-surf2 h-10 rounded-lg border px-3 font-mono text-[13px]"
            />
          </label>
        </div>

        {/* `type="text"` e não `password` de propósito: quem escreve a senha é
            quem a vai ditar à outra pessoa, e escondê-la só faz com que se
            engane a escrever uma senha que ninguém mais vai conseguir ler. */}
        <p className="text-ink3 text-[12px] leading-relaxed">
          A senha aparece à vista porque é para a passares à pessoa. Ela pode mudá-la depois de
          entrar.
        </p>

        <CaixasDeAcesso />

        {estado.mensagem && (
          <p
            role="alert"
            className="rounded-lg px-3 py-2 text-[13px] font-semibold"
            style={{
              background:
                estado.fase === 'erro'
                  ? 'color-mix(in oklch, var(--bad) 12%, transparent)'
                  : 'color-mix(in oklch, var(--ok) 14%, transparent)',
              color: estado.fase === 'erro' ? 'var(--bad)' : 'var(--ok)',
            }}
          >
            {estado.mensagem}
          </p>
        )}

        <button
          type="submit"
          className="bg-marca h-10 self-start rounded-lg px-4 text-[13px] font-bold text-[#141210]"
        >
          Criar e dar acesso
        </button>
      </form>
    </details>
  );
}

/** As caixas de cada área, agrupadas como no menu. */
export function CaixasDeAcesso({ marcadas = [] }: { marcadas?: readonly string[] }) {
  return (
    <div className="flex flex-col gap-3">
      {AREAS.map((grupo) => (
        <fieldset key={grupo.grupo} className="flex flex-col gap-1.5">
          <legend className="text-ink3 font-mono text-[11px] tracking-[0.08em] uppercase">
            {grupo.grupo}
          </legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {grupo.areas.map((area) => (
              <label
                key={area.chave}
                className="border-line bg-surf2 flex cursor-pointer items-start gap-2 rounded-lg border p-2"
              >
                <input
                  type="checkbox"
                  name="acesso"
                  value={area.chave}
                  defaultChecked={marcadas.includes(area.chave)}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-semibold">
                    {area.nome}
                    {area.dinheiro && (
                      <span
                        className="ml-1.5 rounded px-1 py-0.5 font-mono text-[10px] font-bold"
                        style={{
                          background: 'color-mix(in oklch, var(--warm) 22%, transparent)',
                          color: 'var(--warm)',
                        }}
                      >
                        DINHEIRO
                      </span>
                    )}
                  </span>
                  <span className="text-ink3 text-[11px] leading-snug">{area.explica}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
