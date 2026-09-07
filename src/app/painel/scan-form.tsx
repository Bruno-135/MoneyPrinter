'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { runScan, type ScanFormState } from './actions';
import { CATEGORIES } from '@/lib/places/categories';

/** Zonas com as coordenadas já preenchidas, para não andar à procura delas. */
const PRESETS = [
  { nome: 'Braga', lat: 41.5454, lng: -8.4265, pais: 'PT' },
  { nome: 'Porto', lat: 41.1579, lng: -8.6291, pais: 'PT' },
  { nome: 'Lisboa', lat: 38.7223, lng: -9.1393, pais: 'PT' },
  { nome: 'Guimarães', lat: 41.4425, lng: -8.2918, pais: 'PT' },
  { nome: 'Coimbra', lat: 40.2033, lng: -8.4103, pais: 'PT' },
  { nome: 'São Paulo', lat: -23.5505, lng: -46.6333, pais: 'BR' },
  { nome: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, pais: 'BR' },
] as const;

const INITIAL: ScanFormState = { summary: null, error: null };

const field =
  'w-full rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5';

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      <button
        type="submit"
        name="confirmar"
        value="nao"
        disabled={pending}
        className="rounded-md border border-brand-600 px-4 py-2.5 font-medium text-brand-600 disabled:opacity-50"
      >
        {pending ? 'A calcular…' : 'Simular (não gasta)'}
      </button>
      <button
        type="submit"
        name="confirmar"
        value="sim"
        disabled={pending}
        className="rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
      >
        {pending ? 'A procurar…' : 'Procurar a sério'}
      </button>
    </div>
  );
}

export function ScanForm() {
  const [state, action] = useActionState(runScan, INITIAL);

  return (
    <section className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Zona</span>
            <input name="zona" required defaultValue="Braga" className={field} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Ramo</span>
            <select name="ramo" defaultValue="padaria" className={field}>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Latitude</span>
            <input name="latitude" required defaultValue="41.5454" className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Longitude</span>
            <input name="longitude" required defaultValue="-8.4265" className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Raio da zona (m)</span>
            <input name="raio" type="number" min={100} max={50000} defaultValue={2000} className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">País</span>
            <select name="pais" defaultValue="PT" className={field}>
              <option value="PT">Portugal</option>
              <option value="BR">Brasil</option>
            </select>
          </label>
        </div>

        <label className="flex max-w-xs flex-col gap-1.5">
          <span className="text-sm font-medium">Raio de cada busca (m)</span>
          <select name="celula" defaultValue="1500" className={field}>
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

        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="forcar" value="sim" className="size-4 accent-brand-600" />
          <span>
            Ignorar cache
            <span className="ml-1.5 opacity-55">
              — procura outra vez mesmo que esta zona e ramo já tenham sido feitos. Gasta dinheiro.
            </span>
          </span>
        </label>

        <details className="text-sm">
          <summary className="cursor-pointer opacity-70">Coordenadas de cidades</summary>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 opacity-70">
            {PRESETS.map((p) => (
              <span key={p.nome} className="font-mono text-xs">
                {p.nome}: {p.lat}, {p.lng}
              </span>
            ))}
          </div>
        </details>

        <Buttons />
      </form>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      {state.summary && <Summary summary={state.summary} />}
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
