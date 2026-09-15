import { PorLigar } from '../por-ligar';

/**
 * A cobrança das mensalidades.
 *
 * É o que os CLIENTES pagam à agência, não uma subscrição de software. Os dois
 * estados que interessam são "falhou" e "em risco": um pagamento falhado que
 * ninguém vê transforma-se em cliente perdido sem nenhuma conversa pelo meio.
 */

export const dynamic = 'force-static';

const COBRANCAS = [
  { cliente: 'Churrasqueira Brasa Velha', servicos: 'Site, Google, Avaliações', vence: 'dia 5', valor: '45 €', estado: 'pago', tom: 'ok' },
  { cliente: 'Clínica Vet Patas Felizes', servicos: 'Site, Google, Instagram', vence: 'dia 8', valor: '60 €', estado: 'pago', tom: 'ok' },
  { cliente: 'Pizzaria Forno di Pietra', servicos: 'Site, Cardápio, Instagram', vence: 'dia 10', valor: 'R$ 320', estado: 'pendente', tom: 'warm' },
  { cliente: 'Salão Beleza Real', servicos: 'Site, Instagram', vence: 'dia 12', valor: 'R$ 180', estado: 'falhou · 2.ª tentativa', tom: 'bad' },
  { cliente: 'Doceria Açúcar & Canela', servicos: 'Google, Instagram, Cardápio', vence: 'dia 15', valor: 'R$ 150', estado: 'pendente', tom: 'warm' },
  { cliente: 'Oficina Auto Jardim', servicos: 'Google · site cancelado em Julho', vence: 'dia 20', valor: '25 €', estado: 'em risco', tom: 'bad' },
] as const;

const COR = { ok: 'border-ok text-ok', warm: 'border-warm text-warm', bad: 'border-bad text-bad' };

export default function CobrancaPage() {
  return (
    <>
      <PorLigar falta="ligar a um sistema de pagamentos e marcar cada mensalidade" />

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surf2 text-left">
            <tr>
              {['Cliente', 'Serviços', 'Vence', 'Valor', 'Estado'].map((c) => (
                <th
                  key={c}
                  className="px-4 py-3 font-mono text-[11px] font-medium tracking-wide text-ink3 uppercase whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COBRANCAS.map((c) => (
              <tr key={c.cliente} className="border-t border-line">
                <td className="px-4 py-3 text-[13px] font-semibold whitespace-nowrap">
                  {c.cliente}
                </td>
                <td className="px-4 py-3 text-[12px] text-ink2">{c.servicos}</td>
                <td className="px-4 py-3 font-mono text-[12px] whitespace-nowrap text-ink3">
                  {c.vence}
                </td>
                <td className="px-4 py-3 font-mono text-[13px] font-bold tabular-nums whitespace-nowrap">
                  {c.valor}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold whitespace-nowrap ${COR[c.tom]}`}
                  >
                    {c.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
