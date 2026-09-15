import { PorLigar } from '../por-ligar';

/**
 * As conversas do robô do Instagram.
 *
 * O momento que interessa neste ecrã é um só: a passagem do Instagram para o
 * WhatsApp. É aí que um seguidor passa a ser um contacto com telefone, e por
 * isso é o que está marcado a cor em cada conversa.
 */

export const dynamic = 'force-static';

interface Conversa {
  perfil: string;
  nome: string;
  cidade: string;
  estado: 'a conversar' | 'qualificado' | 'passou para WhatsApp' | 'sem resposta';
  ultima: string;
  quando: string;
}

const CONVERSAS: Conversa[] = [
  { perfil: '@brasavelha_churrasco', nome: 'Churrasqueira Brasa Velha', cidade: 'Setúbal', estado: 'passou para WhatsApp', ultima: 'Pode mandar no 912 447 903, é o meu', quando: 'há 20 min' },
  { perfil: '@fornodipietra', nome: 'Pizzaria Forno di Pietra', cidade: 'Curitiba', estado: 'qualificado', ultima: 'Quanto fica isso por mês?', quando: 'há 1 h' },
  { perfil: '@belezareal.salao', nome: 'Salão Beleza Real', cidade: 'Campinas', estado: 'a conversar', ultima: 'A gente já tem o Insta, precisa de site mesmo?', quando: 'há 2 h' },
  { perfil: '@patasfelizes.vet', nome: 'Clínica Vet Patas Felizes', cidade: 'Braga', estado: 'a conversar', ultima: 'Bom dia, do que se trata?', quando: 'há 3 h' },
  { perfil: '@acucarecanela.doces', nome: 'Doceria Açúcar & Canela', cidade: 'Goiânia', estado: 'sem resposta', ultima: '—', quando: 'há 2 dias' },
];

const COR = {
  'passou para WhatsApp': 'border-ok text-ok',
  qualificado: 'border-acc text-acc',
  'a conversar': 'border-line text-ink2',
  'sem resposta': 'border-line text-ink3',
};

export default function RoboPage() {
  const passaram = CONVERSAS.filter((c) => c.estado === 'passou para WhatsApp').length;

  return (
    <>
      <PorLigar falta="ligar o robô a uma conta de Instagram" />

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(152px,1fr))]">
        {[
          ['Conversas abertas', String(CONVERSAS.length), 'no Instagram', ''],
          ['Passaram para WhatsApp', String(passaram), 'já com telefone', 'text-ok'],
          ['Sem resposta', '1', 'a fechar sozinha', 'text-ink3'],
        ].map(([r, v, n, t]) => (
          <div key={r} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surf p-3">
            <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">{r}</span>
            <span className={`font-mono text-2xl font-bold tabular-nums ${t}`}>{v}</span>
            <span className="text-[11px] text-ink3">{n}</span>
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {CONVERSAS.map((c) => (
          <li key={c.perfil} className="rounded-2xl border border-line bg-surf p-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[13px] font-semibold">{c.nome}</span>
              <span className="font-mono text-[11px] text-ink3">{c.perfil}</span>
              <span className="text-[11px] text-ink3">{c.cidade}</span>
              <span
                className={`ml-auto rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold ${COR[c.estado]}`}
              >
                {c.estado}
              </span>
            </div>
            <p className="mt-2 text-[13px] text-ink2">
              &ldquo;{c.ultima}&rdquo; <span className="text-ink3">· {c.quando}</span>
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
