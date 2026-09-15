import { PorLigar } from '../por-ligar';

/**
 * Equipa e permissões.
 *
 * As permissões são a parte que interessa, e são três: quem pode gastar
 * dinheiro em varrimentos, quem pode falar com clientes, e quem só trata de
 * pedidos. Misturar as três numa só é como se perde dinheiro sem dar por isso.
 */

export const dynamic = 'force-static';

const PAPEIS = ['Dono', 'Comercial', 'Apoio'] as const;

const EQUIPA = [
  { nome: 'Rui Mendes', email: 'rui@presenca.pt', papel: 'dono', ini: 'RM' },
  { nome: 'Sofia Carvalho', email: 'sofia@presenca.pt', papel: 'apoio', ini: 'SC' },
];

const PERMISSOES: { nome: string; quem: boolean[] }[] = [
  { nome: 'Correr varrimentos (gasta dinheiro)', quem: [true, false, false] },
  { nome: 'Ver custos e cobrança', quem: [true, false, false] },
  { nome: 'Contactar e mudar etapa', quem: [true, true, false] },
  { nome: 'Gerar landing pages', quem: [true, true, false] },
  { nome: 'Gerir instâncias de WhatsApp', quem: [true, false, false] },
  { nome: 'Tratar pedidos de suporte', quem: [true, true, true] },
  { nome: 'Convidar pessoas', quem: [true, false, false] },
];

export default function EquipaPage() {
  return (
    <>
      <PorLigar falta="convites, papéis e a RLS por papel na base de dados" />

      <ul className="flex flex-col gap-2">
        {EQUIPA.map((m) => (
          <li
            key={m.email}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surf p-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-acc font-mono text-[11px] font-bold text-bg">
              {m.ini}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">{m.nome}</span>
              <span className="block font-mono text-[11px] text-ink3">{m.email}</span>
            </span>
            <span className="rounded-full border border-acc px-2.5 py-1 font-mono text-[11px] font-bold text-acc">
              {m.papel}
            </span>
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surf2 text-left">
            <tr>
              <th className="px-4 py-3 font-mono text-[11px] font-medium tracking-wide text-ink3 uppercase">
                Pode
              </th>
              {PAPEIS.map((p) => (
                <th
                  key={p}
                  className="px-3 py-3 text-center font-mono text-[11px] font-medium tracking-wide text-ink3 uppercase"
                >
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSOES.map((p) => (
              <tr key={p.nome} className="border-t border-line">
                <td className="px-4 py-2.5 text-[13px]">{p.nome}</td>
                {p.quem.map((pode, i) => (
                  <td key={i} className="px-3 py-2.5 text-center">
                    <span className={pode ? 'text-ok' : 'text-ink3 opacity-40'}>
                      {pode ? '✓' : '—'}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
