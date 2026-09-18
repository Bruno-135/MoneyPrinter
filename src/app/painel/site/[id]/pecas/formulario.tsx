'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AI_IDLE } from '@/lib/ai/action-state';
import { escreverPreco, ETIQUETA_DO_ESTADO, type Peca } from '@/lib/loja/peca';
import { alternarEsgotada, apagarPecaDaLoja, gravarPeca } from './actions';

interface Props {
  siteId: string;
  pecas: readonly Peca[];
  familias: readonly string[];
}

const campo = 'h-11 w-full rounded-md border border-line bg-surf px-3 text-base';
const rotulo = 'flex flex-col gap-1 text-sm';

function Gravar({ novo }: { novo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-md bg-brand-600 px-5 font-medium text-white disabled:opacity-60"
    >
      {pending ? 'A gravar…' : novo ? 'Acrescentar peça' : 'Gravar alterações'}
    </button>
  );
}

/** Uma peça em edição, ou uma peça nova quando `peca` é null. */
function Formulario({ siteId, peca, aoFechar }: { siteId: string; peca: Peca | null; aoFechar?: () => void }) {
  const [estado, accao] = useActionState(gravarPeca, AI_IDLE);

  return (
    <form action={accao} className="flex flex-col gap-3 rounded-2xl border border-line bg-surf p-4">
      <input type="hidden" name="siteId" value={siteId} />
      {peca && <input type="hidden" name="pecaId" value={peca.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={rotulo}>
          <span className="font-medium">Referência</span>
          <input name="ref" defaultValue={peca?.ref ?? ''} placeholder="VM-1042" maxLength={24} className={campo} />
          <span className="text-xs text-ink3">É por ela que encontras a peça quando chegar a mensagem.</span>
        </label>

        <label className={rotulo}>
          <span className="font-medium">Nome</span>
          <input name="nome" defaultValue={peca?.nome ?? ''} placeholder="Casaco de lã cinza" maxLength={120} className={campo} />
        </label>

        <label className={rotulo}>
          <span className="font-medium">Preço</span>
          <input
            name="preco"
            defaultValue={peca?.precoCentimos != null ? (peca.precoCentimos / 100).toString() : ''}
            placeholder="48"
            inputMode="decimal"
            className={campo}
          />
        </label>

        <label className={rotulo}>
          <span className="font-medium">Preço anterior</span>
          <input
            name="precoAnterior"
            defaultValue={peca?.precoAnteriorCentimos != null ? (peca.precoAnteriorCentimos / 100).toString() : ''}
            placeholder="135"
            inputMode="decimal"
            className={campo}
          />
          <span className="text-xs text-ink3">Aparece riscado ao lado. Deixa vazio se não há.</span>
        </label>

        <label className={rotulo}>
          <span className="font-medium">Moeda</span>
          <select name="moeda" defaultValue={peca?.moeda ?? 'EUR'} className={campo}>
            <option value="EUR">Euro</option>
            <option value="BRL">Real</option>
          </select>
        </label>

        <label className={rotulo}>
          <span className="font-medium">Família</span>
          <input name="familia" defaultValue={peca?.familia ?? ''} placeholder="mulher" className={campo} />
          <span className="text-xs text-ink3">mulher, homem, criança… é o que faz o menu.</span>
        </label>

        <label className={rotulo}>
          <span className="font-medium">Tipo</span>
          <input name="tipo" defaultValue={peca?.tipo ?? ''} placeholder="casacos" className={campo} />
        </label>

        <label className={rotulo}>
          <span className="font-medium">Cor</span>
          <input name="cor" defaultValue={peca?.cor ?? ''} placeholder="cinza-chumbo" className={campo} />
        </label>

        <label className={rotulo}>
          <span className="font-medium">Tamanhos</span>
          <input name="tamanhos" defaultValue={peca?.tamanhos.join(', ') ?? ''} placeholder="S, M, L" className={campo} />
          <span className="text-xs text-ink3">Separa por vírgula. Cada um vira um botão de WhatsApp.</span>
        </label>

        <label className={rotulo}>
          <span className="font-medium">Estado</span>
          <select name="estado" defaultValue={peca?.estado ?? 'novo'} className={campo}>
            <option value="novo">Novo</option>
            <option value="seminovo">Como novo</option>
            <option value="usado">2.ª mão</option>
          </select>
        </label>
      </div>

      <label className={rotulo}>
        <span className="font-medium">O que dizer do estado</span>
        <input
          name="notaDoEstado"
          defaultValue={peca?.notaDoEstado ?? ''}
          placeholder="Pequena marca na bainha, 1 cm — ver 3.ª foto."
          className={campo}
        />
        <span className="text-xs text-ink3">
          Dizer o defeito à frente vende mais do que escondê-lo. Quem compra em 2.ª mão sabe disso.
        </span>
      </label>

      <label className={rotulo}>
        <span className="font-medium">Descrição</span>
        <textarea
          name="descricao"
          rows={2}
          defaultValue={peca?.descricao ?? ''}
          className="rounded-md border border-line bg-surf px-3 py-2 text-base"
        />
      </label>

      <label className={rotulo}>
        <span className="font-medium">Fotografias</span>
        <textarea
          name="fotos"
          rows={4}
          defaultValue={peca?.fotos.map((f) => f.url).join('\n') ?? ''}
          placeholder={'https://…/frente.jpg\nhttps://…/costas.jpg'}
          className="rounded-md border border-line bg-surf px-3 py-2 font-mono text-sm"
        />
        <span className="text-xs text-ink3">
          Um endereço por linha, até oito. A primeira é a que aparece na grelha.
        </span>
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="destaque" value="sim" defaultChecked={peca?.destaque ?? false} />
          Pôr nos destaques
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="esgotado" value="sim" defaultChecked={peca?.esgotado ?? false} />
          Esgotada
        </label>
      </div>

      {estado.message && (
        <p className={`text-sm ${estado.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {estado.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2.5">
        <Gravar novo={peca === null} />
        {aoFechar && (
          <button type="button" onClick={aoFechar} className="h-11 rounded-md border border-line px-4 text-sm font-medium">
            Deixar
          </button>
        )}
      </div>
    </form>
  );
}

export function Pecas({ siteId, pecas, familias }: Props) {
  const [aEditar, setAEditar] = useState<string | null>(null);
  const [aCriar, setACriar] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">
          <span className="font-semibold">{pecas.length}</span>{' '}
          {pecas.length === 1 ? 'peça' : 'peças'}
          {familias.length > 0 && (
            <span className="text-ink3"> · {familias.join(' · ')}</span>
          )}
        </p>
        {!aCriar && (
          <button
            type="button"
            onClick={() => setACriar(true)}
            className="ml-auto h-10 rounded-md bg-brand-600 px-4 text-sm font-medium text-white"
          >
            Acrescentar peça
          </button>
        )}
      </div>

      {aCriar && <Formulario siteId={siteId} peca={null} aoFechar={() => setACriar(false)} />}

      {pecas.length === 0 && !aCriar && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="text-lg font-semibold">A loja ainda não tem peças.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink2">
            Sem peças, a página da loja é uma casca: não há preços, não há tamanhos e carregar
            numa peça não leva a lado nenhum. Mete duas ou três para veres como fica.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {pecas.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-surf p-4">
            {aEditar === p.id ? (
              <Formulario siteId={siteId} peca={p} aoFechar={() => setAEditar(null)} />
            ) : (
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className={`font-medium ${p.esgotado ? 'line-through opacity-60' : ''}`}>
                      {p.nome}
                    </span>
                    <span className="font-mono text-[11px] text-ink3">{p.ref}</span>
                    <span className="text-[11px] text-ink3">{ETIQUETA_DO_ESTADO[p.estado]}</span>
                    {p.destaque && <span className="text-[11px] text-brand-600">destaque</span>}
                  </div>
                  <div className="mt-0.5 text-sm text-ink2">
                    {escreverPreco(p.precoCentimos, p.moeda) ?? 'sem preço'}
                    {p.tamanhos.length > 0 && ` · ${p.tamanhos.join(' · ')}`}
                    {p.familia && ` · ${p.familia}`}
                    {p.fotos.length > 0 && ` · ${p.fotos.length} foto${p.fotos.length === 1 ? '' : 's'}`}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAEditar(p.id)}
                    className="h-9 rounded-md border border-line px-3 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <form action={alternarEsgotada}>
                    <input type="hidden" name="pecaId" value={p.id} />
                    <input type="hidden" name="siteId" value={siteId} />
                    <input type="hidden" name="esgotada" value={p.esgotado ? 'sim' : 'nao'} />
                    <button type="submit" className="h-9 rounded-md border border-line px-3 text-sm font-medium">
                      {p.esgotado ? 'Voltou' : 'Esgotou'}
                    </button>
                  </form>
                  <form action={apagarPecaDaLoja}>
                    <input type="hidden" name="pecaId" value={p.id} />
                    <input type="hidden" name="siteId" value={siteId} />
                    <button type="submit" className="h-9 rounded-md px-3 text-sm font-medium text-red-600">
                      Apagar
                    </button>
                  </form>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
