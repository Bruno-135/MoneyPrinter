import Link from 'next/link';

/**
 * "O teu dia" — o cartão de gamificação do desenho.
 *
 * AINDA SEM LIGAÇÃO A DADOS. Os números são os do desenho e não se mexem: não
 * há em base de dados um contador de contactos por dia, nem histórico de metas,
 * nem sequências. Ficam aqui para o ecrã estar completo e para se ver o que
 * falta construir — mas com o aviso à vista, porque um número inventado num
 * painel que serve para decidir a quem ligar é pior do que um espaço vazio.
 *
 * Para isto passar a ser verdade faltam três coisas: registar cada contacto com
 * a data, guardar a meta diária escolhida, e contar os pedidos de suporte
 * fechados dentro do prazo.
 */
export function OTeuDia() {
  return (
    <section className="rounded-2xl border border-line bg-surf p-3.5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold">O teu dia</h2>
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink3 uppercase">
          por ligar
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <Barra rotulo="Contactos feitos hoje" valor="—/20" percentagem={0} cor="bg-acc" />
        <Barra rotulo="Pedidos de suporte fechados no prazo" valor="—" percentagem={0} cor="bg-ok" />

        <div className="flex flex-wrap gap-2.5">
          <Quadrado numero="—" legenda="dias seguidos com a meta feita" />
          <Quadrado numero="—" legenda="desafio da semana" />
        </div>

        <p className="text-xs leading-relaxed text-ink3">
          Ainda não conta nada: falta registar cada contacto com a data e guardar a meta diária.{' '}
          <Link href="/painel/perfil" className="text-acc underline underline-offset-2">
            Ver progresso
          </Link>
        </p>
      </div>
    </section>
  );
}

function Barra({
  rotulo,
  valor,
  percentagem,
  cor,
}: {
  rotulo: string;
  valor: string;
  percentagem: number;
  cor: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-ink2">
        <span>{rotulo}</span>
        <span className="font-mono tabular-nums text-ink">{valor}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-md bg-surf2">
        <div className={`h-full ${cor}`} style={{ width: `${percentagem}%` }} />
      </div>
    </div>
  );
}

function Quadrado({ numero, legenda }: { numero: string; legenda: string }) {
  return (
    <div className="min-w-[120px] flex-1 rounded-xl border border-line bg-surf2 p-2.5">
      <div className="font-mono text-[22px] font-bold tabular-nums">{numero}</div>
      <div className="text-[11px] text-ink3">{legenda}</div>
    </div>
  );
}
