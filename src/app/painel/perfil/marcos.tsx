export interface Marco {
  nome: string;
  feito: boolean;
  estado: string;
}

/**
 * Os marcos, feitos e por fazer na mesma lista.
 *
 * Os por fazer mostram a distância — "30,00 € de 500,00 €" — e não só que
 * faltam. Um objectivo sem a distância à vista é um objectivo que não puxa por
 * ninguém.
 */
export function Marcos({ marcos }: { marcos: readonly Marco[] }) {
  return (
    <section className="rounded-2xl border border-line bg-surf p-3.5">
      <h2 className="mb-3 text-sm font-bold">Marcos</h2>
      <ul className="flex flex-col gap-2">
        {marcos.map((m) => (
          <li
            key={m.nome}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surf2 p-2.5"
          >
            <span className={`shrink-0 ${m.feito ? 'text-ok' : 'text-ink3 opacity-40'}`}>
              {m.feito ? '✓' : '○'}
            </span>
            <span className="flex-1 text-[13px]">{m.nome}</span>
            <span
              className={`rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold whitespace-nowrap ${
                m.feito ? 'border-ok text-ok' : 'border-line text-ink3'
              }`}
            >
              {m.estado}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
