'use client';

import { useRef, useState } from 'react';
import type { Contagens } from '@/lib/emails/repository';
import { recolherLote } from './actions';

/**
 * O botão que corre a recolha em ciclo, um lote de cada vez.
 *
 * Os números vêm do servidor a cada lote e não de uma conta feita aqui: o
 * que se mostra é o que está gravado, e se a janela fechar a meio não há
 * diferença entre o ecrã e a base.
 */

export function Recolha({ inicial }: { inicial: Contagens }) {
  const [c, setC] = useState(inicial);
  const [aCorrer, setACorrer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const parar = useRef(false);

  async function correr() {
    parar.current = false;
    setErro(null);
    setACorrer(true);
    try {
      while (!parar.current) {
        const lote = await recolherLote();
        if (lote.erro) {
          setErro(lote.erro);
          break;
        }
        setC((v) => ({
          ...v,
          vistos: v.comSite - lote.porVer,
          comEmail: v.comEmail + lote.comEmail,
          porVer: lote.porVer,
        }));
        if (lote.porVer <= 0 || lote.vistos === 0) break;
      }
    } catch {
      setErro('A ligação caiu. O que já foi visto ficou guardado — carrega para continuar.');
    } finally {
      setACorrer(false);
    }
  }

  const feito = c.comSite > 0 ? Math.round((c.vistos / c.comSite) * 100) : 0;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Numero valor={c.comSite} nome="Leads com site" />
        <Numero valor={c.vistos} nome="Já vistos" />
        <Numero valor={c.comEmail} nome="Com e-mail" destaque />
        <Numero valor={c.porVer} nome="Por ver" />
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-black/8 dark:bg-white/10"
        role="progressbar"
        aria-valuenow={feito}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-brand-600 transition-[width]" style={{ width: `${feito}%` }} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {aCorrer ? (
          <button
            type="button"
            onClick={() => (parar.current = true)}
            className="rounded-lg border border-line px-4 py-2 text-[13px] font-semibold"
          >
            A recolher… carrega para parar
          </button>
        ) : (
          <button
            type="button"
            onClick={correr}
            disabled={c.porVer === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {c.porVer === 0
              ? 'Tudo visto'
              : c.vistos > 0
                ? 'Continuar a recolher'
                : 'Recolher e-mails'}
          </button>
        )}
        <span className="text-[12px] text-ink3">
          Deixa esta página aberta. Demora cerca de 1 s por site.
        </span>
      </div>

      {erro && <p className="mt-3 text-[13px] font-semibold text-red-600">{erro}</p>}
    </div>
  );
}

function Numero({ valor, nome, destaque }: { valor: number; nome: string; destaque?: boolean }) {
  return (
    <div className="rounded-xl border border-line px-3 py-2.5">
      <div className={`font-mono text-[22px] font-bold ${destaque ? 'text-brand-600' : ''}`}>
        {valor.toLocaleString('pt-PT')}
      </div>
      <div className="text-[11px] text-ink2">{nome}</div>
    </div>
  );
}
