import { describe, expect, it } from 'vitest';
import { CAMPO_ISCO, contactoServe, ehEmail, julgarPedido, lerPedido, pareceRobo } from './campos';

function formulario(campos: Record<string, string>): FormData {
  const d = new FormData();
  for (const [k, v] of Object.entries(campos)) d.append(k, v);
  return d;
}

const COMPLETO = {
  negocio: 'Pão da Rita',
  contacto: '913 014 170',
  pedido: 'Queria um site com o menu e encomendas por WhatsApp.',
};

describe('contactoServe', () => {
  it('aceita um email', () => {
    expect(contactoServe('rita@paodarita.pt')).toBe(true);
  });

  it('aceita um telefone escrito como as pessoas o escrevem', () => {
    for (const v of [
      '913014170',
      '913 014 170',
      '+351 913 014 170',
      '913014170 (depois das 18h)',
      '00351913014170',
    ]) {
      expect(contactoServe(v), v).toBe(true);
    }
  });

  it('recusa o que não dá para contactar', () => {
    for (const v of ['', '   ', 'não sei', '91301', 'rita@', '@paodarita.pt']) {
      expect(contactoServe(v), JSON.stringify(v)).toBe(false);
    }
  });
});

describe('ehEmail', () => {
  it('distingue email de telefone', () => {
    expect(ehEmail('rita@paodarita.pt')).toBe(true);
    expect(ehEmail('913014170')).toBe(false);
  });
});

describe('lerPedido', () => {
  it('corta os espaços das pontas', () => {
    const v = lerPedido(formulario({ ...COMPLETO, negocio: '  Pão da Rita  ' }));
    expect(v.negocio).toBe('Pão da Rita');
  });

  it('corta um texto grande em vez de o deixar passar', () => {
    const v = lerPedido(formulario({ ...COMPLETO, pedido: 'a'.repeat(9000) }));
    expect(v.pedido).toHaveLength(4000);
  });

  it('dá vazio ao campo que não veio', () => {
    const v = lerPedido(formulario({ negocio: 'X' }));
    expect(v.contacto).toBe('');
    expect(v.ramo).toBe('');
  });
});

describe('julgarPedido', () => {
  it('deixa passar um pedido completo', () => {
    const j = julgarPedido(formulario(COMPLETO));
    expect(j.ok).toBe(true);
    expect(j.falta).toBeNull();
  });

  it('aponta o primeiro campo que falha, pela ordem do ecrã', () => {
    expect(julgarPedido(formulario({ ...COMPLETO, negocio: '' })).falta).toBe('negocio');
    expect(julgarPedido(formulario({ ...COMPLETO, contacto: 'xpto' })).falta).toBe('contacto');
    expect(julgarPedido(formulario({ ...COMPLETO, pedido: '  ' })).falta).toBe('pedido');
  });

  it('devolve o que a pessoa escreveu mesmo quando recusa', () => {
    const j = julgarPedido(formulario({ ...COMPLETO, contacto: 'xpto', prazo: 'Antes do Natal' }));
    expect(j.ok).toBe(false);
    expect(j.valores.negocio).toBe('Pão da Rita');
    expect(j.valores.prazo).toBe('Antes do Natal');
  });

  it('os campos opcionais não são obrigatórios', () => {
    expect(julgarPedido(formulario(COMPLETO)).ok).toBe(true);
  });
});

describe('pareceRobo', () => {
  it('uma pessoa deixa o campo isco vazio', () => {
    expect(pareceRobo(formulario(COMPLETO))).toBe(false);
    expect(pareceRobo(formulario({ ...COMPLETO, [CAMPO_ISCO]: '' }))).toBe(false);
  });

  it('um robô preenche tudo o que encontra', () => {
    expect(pareceRobo(formulario({ ...COMPLETO, [CAMPO_ISCO]: 'Lda' }))).toBe(true);
  });
});

describe('o campo repetido', () => {
  it('lê o primeiro PREENCHIDO e não o primeiro', () => {
    // O desenho tem o campo do contacto duas vezes: a versão normal e a do
    // erro. No estado de erro, a escondida vem vazia à frente da preenchida.
    const d = new FormData();
    d.append('negocio', 'Pão da Rita');
    d.append('contacto', '');
    d.append('contacto', '913014170');
    d.append('pedido', 'Quero um site.');

    expect(lerPedido(d).contacto).toBe('913014170');
    expect(julgarPedido(d).ok).toBe(true);
  });

  it('continua vazio quando nenhuma das cópias traz nada', () => {
    const d = new FormData();
    d.append('contacto', '');
    d.append('contacto', '   ');
    expect(lerPedido(d).contacto).toBe('');
  });
});
