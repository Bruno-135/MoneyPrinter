import { describe, expect, it } from 'vitest';
import { assinar, assinaturaValida } from './webhook';

const SEGREDO = 'whsec_' + Buffer.from('segredo-de-teste-123').toString('base64');
const CORPO = '{"type":"email.bounced","data":{"email_id":"abc"}}';
const AGORA = 1_800_000_000;

function pedido(sobre: Partial<Parameters<typeof assinaturaValida>[0]> = {}) {
  const ts = String(AGORA);
  return {
    segredo: SEGREDO,
    id: 'msg_1',
    timestamp: ts,
    assinaturas: 'v1,' + assinar(SEGREDO, 'msg_1', ts, CORPO),
    corpo: CORPO,
    agora: AGORA,
    ...sobre,
  };
}

describe('assinaturaValida', () => {
  it('aceita uma assinatura certa', () => {
    expect(assinaturaValida(pedido())).toBe(true);
  });
  it('aceita quando há várias e uma é a certa', () => {
    const certa = 'v1,' + assinar(SEGREDO, 'msg_1', String(AGORA), CORPO);
    expect(assinaturaValida(pedido({ assinaturas: `v1,AAAA ${certa}` }))).toBe(true);
  });
  it('recusa um corpo alterado', () => {
    expect(assinaturaValida(pedido({ corpo: CORPO.replace('bounced', 'delivered') }))).toBe(false);
  });
  it('recusa outro segredo', () => {
    const outro = 'whsec_' + Buffer.from('outro').toString('base64');
    expect(assinaturaValida(pedido({ segredo: outro }))).toBe(false);
  });
  it('recusa um aviso velho', () => {
    expect(assinaturaValida(pedido({ agora: AGORA + 3600 }))).toBe(false);
  });
  it('recusa cabeçalhos em falta', () => {
    expect(assinaturaValida(pedido({ id: null }))).toBe(false);
    expect(assinaturaValida(pedido({ assinaturas: null }))).toBe(false);
    expect(assinaturaValida(pedido({ timestamp: null }))).toBe(false);
  });
  it('recusa uma versão desconhecida', () => {
    const certa = assinar(SEGREDO, 'msg_1', String(AGORA), CORPO);
    expect(assinaturaValida(pedido({ assinaturas: `v2,${certa}` }))).toBe(false);
  });
});
