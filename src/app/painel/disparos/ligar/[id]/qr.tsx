'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { verificarLigacao, type EstadoDaLigacao } from '../../actions';

/**
 * O QR que se renova sozinho. Pergunta ao servidor a cada 4 segundos: enquanto
 * o telemóvel não ler, chega o QR do momento (cada um dura uns 40 s); quando
 * ler, o servidor grava o número e isto mostra que ficou ligado e pára.
 *
 * Pára também ao fim de 5 minutos sem ligar — a Evolution deixa de gerar QR
 * depois de umas tentativas, e um ecrã esquecido aberto não deve ficar a
 * pedir para sempre. «Gerar outro» recomeça.
 */

const INTERVALO_MS = 4000;
const DESISTIR_MS = 5 * 60_000;

export function LigarPorQr({ chipId }: { chipId: string }) {
  const [estado, setEstado] = useState<EstadoDaLigacao | null>(null);
  const [parado, setParado] = useState(false);
  const [volta, setVolta] = useState(0);
  const ocupado = useRef(false);

  useEffect(() => {
    let vivo = true;
    const inicio = Date.now();

    async function perguntar() {
      if (ocupado.current) return;
      ocupado.current = true;
      try {
        const r = await verificarLigacao(chipId);
        if (vivo) setEstado(r);
        if (r.tipo === 'ligado') clearInterval(relogio);
      } catch {
        if (vivo)
          setEstado({ tipo: 'erro', erro: 'Sem resposta do servidor. A tentar outra vez…' });
      } finally {
        ocupado.current = false;
      }
      if (Date.now() - inicio > DESISTIR_MS) {
        clearInterval(relogio);
        if (vivo) setParado(true);
      }
    }

    const relogio = setInterval(perguntar, INTERVALO_MS);
    void perguntar();
    return () => {
      vivo = false;
      clearInterval(relogio);
    };
  }, [chipId, volta]);

  if (estado?.tipo === 'ligado') {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl bg-emerald-500/10 p-5">
        <p className="text-[17px] font-semibold text-emerald-700 dark:text-emerald-300">Ligado ✓</p>
        <p className="text-[14px]">
          {estado.nome ? `${estado.nome} · ` : ''}
          {estado.numero ? `+${estado.numero}` : 'número a confirmar'}
        </p>
        <p className="text-ink2 text-[13px]">
          O chip já está no sistema. Se for um número novo, deixe-o aquecer uns dias antes de
          disparos grandes — a rampa trata disso sozinha.
        </p>
        <Link
          href="/painel/disparos"
          className="bg-brand-600 rounded-md px-4 py-2 text-sm font-semibold text-white"
        >
          Voltar aos disparos
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="border-line flex h-[280px] w-[280px] items-center justify-center rounded-xl border bg-white p-3">
        {parado ? (
          <button
            onClick={() => {
              setParado(false);
              setVolta((v) => v + 1);
            }}
            className="bg-brand-600 rounded-md px-4 py-2 text-sm font-semibold text-white"
          >
            Gerar outro QR
          </button>
        ) : estado?.tipo === 'qr' && estado.qr ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagem em data: vinda da Evolution
          <img src={estado.qr} alt="QR Code para ligar o WhatsApp" className="h-full w-full" />
        ) : (
          <span className="text-[13px] text-neutral-500">A preparar o QR…</span>
        )}
      </div>

      {estado?.tipo === 'qr' && estado.codigo && !parado && (
        <div className="flex flex-col gap-1">
          <span className="text-ink3 text-[12px]">
            Ou, no telemóvel, «Ligar com número de telefone»:
          </span>
          <span className="font-mono text-[26px] font-semibold tracking-[0.2em]">
            {estado.codigo}
          </span>
        </div>
      )}

      {estado?.tipo === 'erro' && (
        <p className="text-[13px] text-red-700 [overflow-wrap:anywhere] dark:text-red-300">
          {estado.erro}
        </p>
      )}
      {!parado && (
        <p className="text-ink3 text-[12px]">O QR renova-se sozinho. Não feche esta página.</p>
      )}
    </div>
  );
}
