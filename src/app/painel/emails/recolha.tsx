'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { extrairLote, tentarDeNovoOsQueNaoAbriram } from './actions';

/**
 * O botão que corre a extração em ciclo, um lote de cada vez.
 *
 * Só mexe nos leads «não extraídos» — os novos, que ainda ninguém foi ver.
 * Quem já foi visto não se volta a abrir, a menos que se peça (o botão dos
 * sites que não abriram).
 *
 * Os números vêm do servidor a cada lote e não de uma conta feita aqui: o que
 * se mostra é o que está gravado.
 */

export function Extrair({
  porExtrair: inicial,
  naoAbriram,
}: {
  porExtrair: number;
  naoAbriram: number;
}) {
  const router = useRouter();
  const [porExtrair, setPorExtrair] = useState(inicial);
  const [aCorrer, setACorrer] = useState(false);
  const [vistos, setVistos] = useState(0);
  const [comEmail, setComEmail] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [aReabrir, reabrir] = useTransition();
  const parar = useRef(false);

  async function correr() {
    parar.current = false;
    setErro(null);
    setACorrer(true);
    try {
      while (!parar.current) {
        const lote = await extrairLote();
        if (lote.erro) {
          setErro(lote.erro);
          break;
        }
        setVistos((v) => v + lote.vistos);
        setComEmail((v) => v + lote.comEmail);
        setPorExtrair(lote.porExtrair);
        if (lote.porExtrair <= 0 || lote.vistos === 0) break;
      }
    } catch {
      setErro('A ligação caiu. O que já foi extraído ficou guardado — carrega para continuar.');
    } finally {
      setACorrer(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {aCorrer ? (
          <button
            type="button"
            onClick={() => (parar.current = true)}
            className="border-line rounded-lg border px-4 py-2 text-[13px] font-semibold"
          >
            A extrair… carrega para parar
          </button>
        ) : (
          <button
            type="button"
            onClick={correr}
            disabled={porExtrair <= 0}
            className="bg-brand-600 rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {porExtrair <= 0
              ? 'Não há leads por extrair'
              : `Extrair e-mails dos ${porExtrair.toLocaleString('pt-PT')} novos`}
          </button>
        )}

        {naoAbriram > 0 && !aCorrer && (
          <button
            type="button"
            disabled={aReabrir}
            onClick={() =>
              reabrir(async () => {
                await tentarDeNovoOsQueNaoAbriram();
                router.refresh();
              })
            }
            className="border-line rounded-lg border px-4 py-2 text-[13px] font-semibold disabled:opacity-60"
          >
            {aReabrir ? 'A preparar…' : `Voltar a tentar os ${naoAbriram} que não abriram`}
          </button>
        )}

        {(aCorrer || vistos > 0) && (
          <span className="text-ink2 font-mono text-[12px]">
            {vistos} sites vistos · {comEmail} e-mails achados
          </span>
        )}
      </div>

      <p className="text-ink3 text-[12px]">
        Deixa esta página aberta enquanto corre — cerca de 1 s por site. Só abre os sites ainda não
        vistos; os leads novos entram aqui sozinhos.
      </p>
      {erro && <p className="text-[13px] font-semibold text-red-600">{erro}</p>}
    </div>
  );
}
