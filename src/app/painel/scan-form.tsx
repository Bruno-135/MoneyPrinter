'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { findCity, runScan, type CityFormState, type ScanFormState } from './actions';
import { CATEGORIES } from '@/lib/places/categories';
import type { CityMatch } from '@/lib/places/cities';

/**
 * O ecrã de procurar comércios.
 *
 * Escreve-se o nome da cidade, escolhe-se da lista que o Google devolve, e
 * pronto. Não há latitude, não há longitude, não há raio para adivinhar:
 * ninguém sabe de cor onde fica Barcelinhos, e "raio da zona em metros" é uma
 * pergunta a que só se pode responder a adivinhar. O raio vem da área que a
 * própria cidade ocupa no mapa.
 *
 * TODOS os campos são controlados. Quando se passa uma função ao `action` de um
 * formulário, o React limpa-o sozinho assim que a ação termina — e com campos
 * não controlados isso apagava a cidade escolhida a cada simulação.
 *
 * A procura da cidade vive num formulário SEPARADO do varrimento. Se fosse o
 * mesmo, "Procurar cidade" e "Procurar a sério" seriam dois botões do mesmo
 * formulário — e um deles gasta dinheiro a sério.
 */

const SCAN_IDLE: ScanFormState = { summary: null, error: null };
const CITY_IDLE: CityFormState = { cities: [], fromCache: false, query: '', error: null };

const field =
  'w-full rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5';

function CityButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-md border border-black/15 px-4 py-2 font-medium disabled:opacity-50 dark:border-white/15"
    >
      {pending ? 'A procurar…' : 'Procurar cidade'}
    </button>
  );
}

function ScanButtons({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      <button
        type="submit"
        name="confirmar"
        value="nao"
        disabled={pending || !ready}
        className="rounded-md border border-brand-600 px-4 py-2.5 font-medium text-brand-600 disabled:opacity-40"
      >
        {pending ? 'A calcular…' : 'Simular (não gasta)'}
      </button>
      <button
        type="submit"
        name="confirmar"
        value="sim"
        disabled={pending || !ready}
        className="rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white disabled:opacity-40"
      >
        {pending ? 'A procurar…' : 'Procurar a sério'}
      </button>
    </div>
  );
}

export function ScanForm() {
  const [scanState, scanAction] = useActionState(runScan, SCAN_IDLE);
  const [cityState, cityAction] = useActionState(findCity, CITY_IDLE);

  const [pais, setPais] = useState<'PT' | 'BR'>('PT');
  const [texto, setTexto] = useState('');
  const [cidade, setCidade] = useState<CityMatch | null>(null);
  const [zona, setZona] = useState('');
  const [ramo, setRamo] = useState('padaria');
  const [celula, setCelula] = useState('1500');
  const [forcar, setForcar] = useState(false);

  function escolher(match: CityMatch) {
    setCidade(match);
    // O nome da zona segue o da cidade, mas fica editável: "Braga centro" e
    // "Gualtar" são procuras diferentes no mesmo sítio, e é este nome que fica
    // gravado e que vai na pesquisa por texto.
    setZona(match.name);
  }

  return (
    <section className="flex flex-col gap-5">
      <form action={cityAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Cidade</span>
          <div className="flex flex-wrap gap-2">
            <input
              name="cidade"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreve o nome — Braga, Fafe, Curitiba…"
              className={`${field} min-w-52 flex-1`}
            />
            <select
              name="pais"
              value={pais}
              onChange={(e) => setPais(e.target.value === 'BR' ? 'BR' : 'PT')}
              className="shrink-0 rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
            >
              <option value="PT">Portugal</option>
              <option value="BR">Brasil</option>
            </select>
            <CityButton />
          </div>
        </div>

        {cityState.error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {cityState.error}
          </p>
        )}

        {cityState.cities.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {cityState.cities.map((match) => (
              <li key={match.placeId}>
                <button
                  type="button"
                  onClick={() => escolher(match)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    cidade?.placeId === match.placeId
                      ? 'border-brand-600 bg-brand-50/60 dark:bg-white/5'
                      : 'border-black/12 hover:border-brand-500 dark:border-white/12'
                  }`}
                >
                  <span className="font-medium">{match.name}</span>
                  {match.address && <span className="ml-2 opacity-60">{match.address}</span>}
                  <span className="ml-2 opacity-45">
                    · raio {(match.radiusMeters / 1000).toFixed(1)} km
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {cityState.query !== '' && cityState.cities.length === 0 && !cityState.error && (
          <p className="text-sm opacity-60">
            Não encontrei nenhuma cidade para “{cityState.query}”. Tenta escrever de outra maneira,
            ou juntar o distrito — “Fafe, Braga”.
          </p>
        )}

        {cityState.cities.length > 0 && (
          <p className="text-xs opacity-45">
            {cityState.fromCache
              ? 'Esta procura já estava gravada — não gastou nada.'
              : 'Procura nova, gravada para a próxima vez não custar nada.'}
          </p>
        )}
      </form>

      <form action={scanAction} className="flex flex-col gap-4">
        <input type="hidden" name="latitude" value={cidade?.latitude ?? ''} />
        <input type="hidden" name="longitude" value={cidade?.longitude ?? ''} />
        <input type="hidden" name="raio" value={cidade?.radiusMeters ?? ''} />
        <input type="hidden" name="pais" value={pais} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Nome da zona</span>
            <input
              name="zona"
              required
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              placeholder="Escolhe uma cidade em cima"
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Ramo</span>
            <select
              name="ramo"
              value={ramo}
              onChange={(e) => setRamo(e.target.value)}
              className={field}
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {cidade && (
          // O que se vai procurar, escrito por extenso e mesmo por cima dos
          // botões. Um varrimento no ramo errado custa dinheiro e enche a lista
          // de comércios que não se queriam; a confirmação tem de estar onde os
          // olhos já estão antes de carregar.
          <p className="-mt-1 text-sm opacity-70">
            Vais procurar{' '}
            <strong className="font-semibold opacity-100">
              {CATEGORIES.find((c) => c.slug === ramo)?.label ?? ramo}
            </strong>{' '}
            em <strong className="font-semibold opacity-100">{cidade.name}</strong>, num raio de{' '}
            {(cidade.radiusMeters / 1000).toFixed(1)} km à volta do centro.
          </p>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer opacity-60">Opções avançadas</summary>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex max-w-xs flex-col gap-1.5">
              <span className="text-sm font-medium">Raio de cada busca (m)</span>
              <select
                name="celula"
                value={celula}
                onChange={(e) => setCelula(e.target.value)}
                className={field}
              >
                <option value="2000">2000 — mais barato, pode falhar comércios</option>
                <option value="1500">1500 — equilibrado</option>
                <option value="1000">1000 — mais caro, apanha mais</option>
                <option value="700">700 — para zonas muito densas</option>
              </select>
              <span className="text-xs opacity-55">
                Um raio menor faz mais buscas — mais chamadas, mais custo, mas apanha comércios que
                um raio grande deixa de fora quando a zona é densa.
              </span>
            </label>

            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                name="forcar"
                value="sim"
                checked={forcar}
                onChange={(e) => setForcar(e.target.checked)}
                className="size-4 accent-brand-600"
              />
              <span>
                Ignorar cache
                <span className="ml-1.5 opacity-55">
                  — procura outra vez mesmo que esta zona e ramo já tenham sido feitos. Gasta
                  dinheiro.
                </span>
              </span>
            </label>
          </div>
        </details>

        <ScanButtons ready={cidade !== null} />

        {cidade === null && (
          <p className="text-sm opacity-50">
            Procura e escolhe uma cidade em cima para poder avançar.
          </p>
        )}
      </form>

      {scanState.error && (
        <p role="alert" className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {scanState.error}
        </p>
      )}

      {scanState.summary && <Summary summary={scanState.summary} />}
    </section>
  );
}

function Summary({ summary }: { summary: ScanFormState['summary'] }) {
  if (!summary) return null;

  return (
    <div className="rounded-lg border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-sm font-semibold">
        {summary.region.label} · {summary.region.category}
        {summary.dryRun && (
          <span className="ml-2 rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            simulação — nada foi gasto nem gravado
          </span>
        )}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <Stat label="Pontos da grelha" value={String(summary.grid.total)} />
        <Stat
          label={summary.dryRun ? 'Chamadas previstas' : 'Chamadas feitas'}
          value={
            summary.dryRun
              ? String(summary.grid.toSearch)
              : summary.api.failed > 0
                ? `${summary.api.calls} (${summary.api.failed} falharam)`
                : String(summary.api.calls)
          }
        />
        <Stat
          label={summary.dryRun ? 'Custo estimado' : 'Custo (só o faturado)'}
          value={`~${summary.api.estimatedUsd.toFixed(2)} USD`}
        />
        <Stat label="Em cache" value={String(summary.grid.cached)} />
      </dl>

      {!summary.dryRun && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-black/10 pt-4 text-sm sm:grid-cols-4 dark:border-white/10">
          <Stat label="Encontrados" value={`${summary.found.total} (${summary.found.created} novos)`} />
          <Stat label="Sem site" value={String(summary.websites.none)} />
          <Stat label="Só rede social" value={String(summary.websites.social_only)} />
          <Stat label="Prospetos" value={String(summary.prospects)} />
        </dl>
      )}

      {summary.warnings.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 border-t border-black/10 pt-4 text-sm dark:border-white/10">
          {summary.warnings.map((w) => (
            <li key={w} className="text-amber-700 dark:text-amber-300">
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide opacity-55">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
