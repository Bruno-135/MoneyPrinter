'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { runScan, type ScanFormState } from './actions';
import { CATEGORIES } from '@/lib/places/categories';
import { CUSTOM_ZONE, DEFAULT_ZONE, ZONES, findZone } from '@/lib/places/zones';

/**
 * O ecrã de procurar comércios.
 *
 * TODOS os campos são controlados, e não é por gosto. Quando se passa uma
 * função ao `action` de um formulário, o React limpa o formulário sozinho
 * assim que a ação termina — os campos não controlados voltam ao `defaultValue`.
 * Com "Braga" como valor por omissão, o efeito era este: escrevia-se "Porto",
 * carregava-se em "Simular", e o campo voltava a "Braga" à frente dos olhos.
 * Parecia que o campo estava bloqueado. Não estava — estava a ser reposto.
 *
 * A segunda coisa que aqui se corrige é maior: o nome da zona e as coordenadas
 * eram caixas independentes. Escrever "Porto" no nome não mexia na latitude, e
 * a busca acontecia na mesma em Braga, mas gravada com o rótulo "Porto".
 * Agora escolhe-se a cidade e vêm as três coisas juntas.
 */

const INITIAL: ScanFormState = { summary: null, error: null };

const field =
  'w-full rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 read-only:opacity-55 disabled:opacity-55 dark:border-white/15 dark:bg-white/5';

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

  const inicial = findZone(DEFAULT_ZONE);
  const [zonaId, setZonaId] = useState<string>(DEFAULT_ZONE);
  const [nome, setNome] = useState(inicial?.nome ?? 'Braga');
  const [lat, setLat] = useState(String(inicial?.lat ?? 41.5454));
  const [lng, setLng] = useState(String(inicial?.lng ?? -8.4265));
  const [pais, setPais] = useState<'PT' | 'BR'>(inicial?.pais ?? 'PT');
  const [ramo, setRamo] = useState('padaria');
  const [raio, setRaio] = useState('2000');
  const [celula, setCelula] = useState('1500');
  const [forcar, setForcar] = useState(false);

  const aMao = zonaId === CUSTOM_ZONE;

  function escolherZona(id: string) {
    setZonaId(id);

    const zona = findZone(id);
    if (!zona) return; // "outra": fica o que lá está, para se ajustar à mão.

    setNome(zona.nome);
    setLat(String(zona.lat));
    setLng(String(zona.lng));
    setPais(zona.pais);
  }

  return (
    <section className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Cidade</span>
            <select
              value={zonaId}
              onChange={(e) => escolherZona(e.target.value)}
              className={field}
            >
              <optgroup label="Portugal">
                {ZONES.filter((z) => z.pais === 'PT').map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nome}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Brasil">
                {ZONES.filter((z) => z.pais === 'BR').map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nome}
                  </option>
                ))}
              </optgroup>
              <option value={CUSTOM_ZONE}>Outra — coordenadas à mão</option>
            </select>
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

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Nome da zona</span>
          <input
            name="zona"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={field}
          />
          <span className="text-xs opacity-55">
            É este nome que fica gravado e que vai na pesquisa por texto. Podes afiná-lo — “Braga
            centro”, “Gualtar” — sem mexer nas coordenadas.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Latitude</span>
            <input
              name="latitude"
              required
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              readOnly={!aMao}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Longitude</span>
            <input
              name="longitude"
              required
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              readOnly={!aMao}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Raio da zona (m)</span>
            <input
              name="raio"
              type="number"
              min={100}
              max={50000}
              value={raio}
              onChange={(e) => setRaio(e.target.value)}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">País</span>
            <select
              name="pais"
              value={pais}
              onChange={(e) => setPais(e.target.value === 'BR' ? 'BR' : 'PT')}
              disabled={!aMao}
              className={field}
            >
              <option value="PT">Portugal</option>
              <option value="BR">Brasil</option>
            </select>
          </label>
        </div>

        {!aMao && (
          <p className="-mt-1 text-xs opacity-55">
            As coordenadas e o país vêm da cidade escolhida. Para outro sítio, escolhe “Outra” na
            lista das cidades.
          </p>
        )}

        {/*
          A latitude e a longitude ficam só de leitura, e assim continuam a ser
          enviadas no formulário. O `<select>` do país não tem "só de leitura": desativa-se, e
          um campo escondido leva o valor — sem ele, um campo desativado não
          chega ao servidor e o país ia vazio.
        */}
        {!aMao && <input type="hidden" name="pais" value={pais} />}

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

        <label className="flex items-center gap-2.5 text-sm">
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
              — procura outra vez mesmo que esta zona e ramo já tenham sido feitos. Gasta dinheiro.
            </span>
          </span>
        </label>

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
