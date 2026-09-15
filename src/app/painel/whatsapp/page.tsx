import { PorLigar } from '../por-ligar';

/**
 * As instâncias de WhatsApp.
 *
 * O ecrã existe antes da funcionalidade de propósito: o estado de cada
 * instância é a informação mais importante de todo este canal. As não oficiais
 * são banidas com frequência, e um painel que esconde isso faz perder a conta e
 * os contactos todos com ela. O limite diário está à vista pela mesma razão.
 */

export const dynamic = 'force-static';

interface Instancia {
  nome: string;
  numero: string;
  estado: string;
  envios: string;
  pct: number;
  tom: 'ok' | 'warm' | 'bad' | 'ink';
  nota: string;
}

const INSTANCIAS: Instancia[] = [
  {
    nome: 'Oficial · API Business',
    numero: '+351 210 998 441',
    estado: 'ligada',
    envios: '481 / 1 000',
    pct: 48,
    tom: 'ok',
    nota: 'Sem risco de banimento. Usar para tudo o que é cliente.',
  },
  {
    nome: 'Não oficial · Comercial 1',
    numero: '+351 936 114 702',
    estado: 'a aquecer',
    envios: '38 / 80',
    pct: 47,
    tom: 'warm',
    nota: 'Aquecimento no dia 4 de 14. Não passar de 80 envios.',
  },
  {
    nome: 'Não oficial · Comercial 2',
    numero: '+351 927 330 519',
    estado: 'limite atingido',
    envios: '200 / 200',
    pct: 100,
    tom: 'warm',
    nota: 'Bloqueada até amanhã às 08:00 por decisão nossa, não do WhatsApp.',
  },
  {
    nome: 'Não oficial · Brasil 1',
    numero: '+55 41 99180-3344',
    estado: 'banida',
    envios: '0 / 0',
    pct: 0,
    tom: 'bad',
    nota: 'Banida há 6 dias. 112 conversas perdidas. Substituir o chip antes de retomar Curitiba.',
  },
  {
    nome: 'Não oficial · Brasil 2',
    numero: '+55 19 99655-1207',
    estado: 'desligada',
    envios: '0 / 120',
    pct: 0,
    tom: 'ink',
    nota: 'Desligada à espera de aquecimento.',
  },
];

const BORDA = { ok: 'border-line', warm: 'border-warm', bad: 'border-bad', ink: 'border-line' };
const COR = { ok: 'text-ok', warm: 'text-warm', bad: 'text-bad', ink: 'text-ink3' };
const BARRA = { ok: 'bg-ok', warm: 'bg-warm', bad: 'bg-bad', ink: 'bg-line' };

export default function WhatsAppPage() {
  return (
    <>
      <PorLigar falta="ligar as instâncias a uma API de WhatsApp" />

      <ul className="flex flex-col gap-2.5">
        {INSTANCIAS.map((i) => (
          <li key={i.numero} className={`rounded-2xl border bg-surf p-3 ${BORDA[i.tom]}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-[13px] font-semibold">{i.nome}</span>
              <span className="font-mono text-[11px] text-ink3">{i.numero}</span>
              <span
                className={`ml-auto rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide ${COR[i.tom]} ${BORDA[i.tom] === 'border-line' ? 'border-current' : BORDA[i.tom]}`}
              >
                {i.estado}
              </span>
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-md bg-surf2">
                <div className={`h-full ${BARRA[i.tom]}`} style={{ width: `${i.pct}%` }} />
              </div>
              <span className="font-mono text-[11px] tabular-nums text-ink2">{i.envios}</span>
            </div>

            <p className="mt-2 text-[13px] text-ink2">{i.nota}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
