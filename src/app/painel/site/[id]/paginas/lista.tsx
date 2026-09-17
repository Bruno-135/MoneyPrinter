'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AI_IDLE } from '@/lib/ai/action-state';
import { DEFAULT_MODEL, MODELS, MODEL_IDS, formatCost, isModelId, type ModelId } from '@/lib/ai/models';
import { criarPaginaDoSite, gerarPaginaDoSite, apagarPaginaDoSite } from './actions';

export interface PaginaNaLista {
  id: string;
  slug: string;
  titulo: string;
  gerada: boolean;
  endereco: string;
}

interface Props {
  siteId: string;
  publicCode: string;
  paginas: readonly PaginaNaLista[];
}

function Botao({ children, variante = 'normal' }: { children: string; variante?: 'normal' | 'forte' }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        variante === 'forte'
          ? 'h-11 rounded-md bg-brand-600 px-4 font-medium text-white disabled:opacity-60'
          : 'h-11 rounded-md border border-line px-4 text-sm font-medium disabled:opacity-60'
      }
    >
      {pending ? 'A trabalhar…' : children}
    </button>
  );
}

/** Cria uma página. Só o nome e o endereço — o conteúdo vem depois. */
function NovaPagina({ siteId }: { siteId: string }) {
  const [estado, accao] = useActionState(criarPaginaDoSite, AI_IDLE);

  return (
    <form action={accao} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surf p-4">
      <input type="hidden" name="siteId" value={siteId} />
      <p className="text-sm font-medium">Acrescentar uma página</p>

      <div className="flex flex-wrap gap-2.5">
        <input
          name="titulo"
          placeholder="Nome no menu — ex.: Mulher"
          maxLength={60}
          className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surf px-3 text-base"
        />
        <input
          name="slug"
          placeholder="endereço (opcional)"
          maxLength={40}
          className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surf px-3 font-mono text-sm"
        />
        <Botao>Criar</Botao>
      </div>

      <p className="text-xs text-ink3">
        Deixa o endereço vazio e sai do nome: «Moda Mulher» fica «moda-mulher».
      </p>

      {estado.message && (
        <p className={`text-sm ${estado.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {estado.message}
          {estado.hint && <span className="mt-0.5 block opacity-80">{estado.hint}</span>}
        </p>
      )}
    </form>
  );
}

/** Gera o conteúdo de UMA página. */
function Gerar({ siteId, pagina }: { siteId: string; pagina: PaginaNaLista }) {
  const [estado, accao] = useActionState(gerarPaginaDoSite, AI_IDLE);
  const [aberto, setAberto] = useState(false);
  const [brief, setBrief] = useState('');
  const [modelo, setModelo] = useState<ModelId>(DEFAULT_MODEL);

  if (!aberto) {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="h-10 rounded-md border border-brand-500 px-3 text-sm font-medium text-brand-600"
        >
          {pagina.gerada ? 'Gerar outra vez' : 'Gerar com IA'}
        </button>
        {estado.message && (
          <p className={`text-xs ${estado.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
            {estado.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={accao} className="flex w-full flex-col gap-2.5">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="paginaId" value={pagina.id} />

      <textarea
        name="brief"
        rows={3}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder={`O que tem de estar na página "${pagina.titulo}"`}
        maxLength={4000}
        className="rounded-md border border-line bg-surf px-3 py-2 text-base"
      />

      <select
        name="model"
        value={modelo}
        onChange={(e) => {
          const v = e.target.value;
          if (isModelId(v)) setModelo(v);
        }}
        className="h-11 rounded-md border border-line bg-surf px-3 text-sm"
      >
        {MODEL_IDS.map((id) => (
          <option key={id} value={id}>
            {MODELS[id].label} — {formatCost(id, 'html')}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-2.5">
        <Botao variante="forte">Gerar esta página</Botao>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="h-11 rounded-md border border-line px-4 text-sm font-medium"
        >
          Deixar
        </button>
      </div>

      {estado.message && (
        <p className={`text-sm ${estado.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {estado.message}
          {estado.hint && <span className="mt-0.5 block opacity-80">{estado.hint}</span>}
        </p>
      )}
    </form>
  );
}

export function ListaDePaginas({ siteId, publicCode, paginas }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-line bg-surf p-4">
        <p className="text-sm font-medium">Início</p>
        <p className="mt-0.5 font-mono text-xs text-ink3">/s/{publicCode}</p>
        <p className="mt-2 text-sm text-ink2">
          A página inicial gera-se em «Gerar com IA», no ecrã do site. O menu que ela escreve
          inclui sozinho as páginas abaixo — mas só as que já existirem quando a gerares.
        </p>
      </div>

      {paginas.map((p) => (
        <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surf p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-medium">{p.titulo}</span>
            <span className="font-mono text-xs text-ink3">{p.endereco}</span>
            {!p.gerada && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                por gerar
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-start gap-2.5">
            <Gerar siteId={siteId} pagina={p} />

            {p.gerada && (
              <a
                href={p.endereco}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center rounded-md border border-line px-3 text-sm font-medium"
              >
                Abrir
              </a>
            )}

            <form action={apagarPaginaDoSite}>
              <input type="hidden" name="paginaId" value={p.id} />
              <input type="hidden" name="siteId" value={siteId} />
              <button type="submit" className="h-10 rounded-md px-3 text-sm font-medium text-red-600">
                Apagar
              </button>
            </form>
          </div>
        </div>
      ))}

      <NovaPagina siteId={siteId} />

      {paginas.length > 0 && (
        <p className="text-sm text-ink3">
          Depois de acrescentares uma página, vale a pena gerar a inicial outra vez — é assim
          que ela passa a ter a entrada nova no menu.
        </p>
      )}
    </div>
  );
}
