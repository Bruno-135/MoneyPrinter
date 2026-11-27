import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { LigarPorQr } from './qr';

/** Ligar um chip pelo QR Code (ou pelo código de 8 letras), sem sair do painel. */

export const dynamic = 'force-dynamic';

export default async function LigarChipPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirAcesso('whatsapp');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createClient();
  const { data: chip } = await db
    .from('whatsapp_chips')
    .select('id, nome, instancia, numero')
    .eq('id', id)
    .maybeSingle();
  if (!chip) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/painel/disparos" className="text-ink2 text-[13px]">
        ← Disparos
      </Link>
      <div>
        <h2 className="text-[19px] font-semibold">Ligar {chip.nome || chip.instancia}</h2>
        <p className="text-ink3 font-mono text-[12px]">{chip.instancia}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <LigarPorQr chipId={chip.id} />
        <ol className="text-ink2 flex list-decimal flex-col gap-2 pl-5 text-[14px] leading-relaxed">
          <li>
            No telemóvel com o chip, abra o <b>WhatsApp Business</b> (ou o WhatsApp).
          </li>
          <li>
            <b>Definições</b> (ou ⋮) → <b>Dispositivos ligados</b> → <b>Ligar dispositivo</b>.
          </li>
          <li>Aponte a câmara para o QR ao lado.</li>
          <li>
            Está a ver o painel no próprio telemóvel do chip? Em vez do QR, toque em{' '}
            <b>«Ligar com número de telefone»</b> e escreva o código de 8 letras (aparece só se
            escreveu o número ao criar o chip).
          </li>
          <li>Quando ligar, esta página diz «Ligado ✓» sozinha.</li>
        </ol>
      </div>
    </div>
  );
}
