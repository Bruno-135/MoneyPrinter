import { describe, expect, it } from 'vitest';
import {
  dadosDoLead,
  marcadoresDesconhecidos,
  marcadoresUsados,
  montar,
  preencher,
} from './modelo';
import { ASSUNTO_PADRAO, CORPO_PADRAO } from './campanha-padrao';

describe('preencher', () => {
  it('troca os marcadores pelos dados do lead', () => {
    const r = preencher('Olá {nome} de {cidade}', { nome: 'Padaria Sol', cidade: 'Braga' });
    expect(r).toEqual({ ok: true, texto: 'Olá Padaria Sol de Braga' });
  });

  it('recusa quando falta um dado, em vez de deixar o marcador no e-mail', () => {
    const r = preencher('Encontrei {nome} em {cidade}', { nome: 'Padaria Sol', cidade: null });
    expect(r).toEqual({ ok: false, faltam: ['cidade'] });
  });

  it('um dado só com espaços conta como em falta', () => {
    expect(preencher('{nome}', { nome: '   ' })).toEqual({ ok: false, faltam: ['nome'] });
  });

  it('o mesmo marcador várias vezes', () => {
    const r = preencher('{nome} / {nome}', { nome: 'X' });
    expect(r).toEqual({ ok: true, texto: 'X / X' });
  });
});

describe('marcadores', () => {
  it('apanha as gralhas', () => {
    expect(marcadoresDesconhecidos('Olá {Nome}, {cidade} e {cidade }')).toEqual([
      'Nome',
      'cidade ',
    ]);
  });
  it('lista os usados sem repetir', () => {
    expect(marcadoresUsados('{nome} {cidade} {nome}')).toEqual(['nome', 'cidade']);
  });
});

describe('montar', () => {
  const m = montar(
    'Assunto',
    'Linha 1\nlinha 2\n\nOutro <b>parágrafo</b>',
    'https://x.pt/cancelar/abc',
  );

  it('põe a ligação de sair em texto e em HTML', () => {
    expect(m.texto).toContain('https://x.pt/cancelar/abc');
    expect(m.html).toContain('href="https://x.pt/cancelar/abc"');
  });
  it('o rodapé não se pode tirar do corpo', () => {
    expect(m.texto).toMatch(/Se não quiser receber mais mensagens da VaiDesign/);
    expect(m.html).toMatch(/Se não quiser receber mais mensagens da VaiDesign/);
  });
  it('escapa o HTML do corpo', () => {
    expect(m.html).not.toContain('<b>');
    expect(m.html).toContain('&lt;b&gt;');
  });
  it('quebras de linha e parágrafos', () => {
    expect(m.html).toContain('Linha 1<br>linha 2');
    expect(m.html.match(/<p /g)!.length).toBeGreaterThanOrEqual(3);
  });
});

describe('a campanha proposta', () => {
  it('só usa marcadores que existem', () => {
    expect(marcadoresDesconhecidos(ASSUNTO_PADRAO)).toEqual([]);
    expect(marcadoresDesconhecidos(CORPO_PADRAO)).toEqual([]);
  });
  it('preenche com um lead completo', () => {
    const d = dadosDoLead({ name: 'Padaria Sol', locality: 'Braga' });
    expect(preencher(CORPO_PADRAO, d).ok).toBe(true);
  });
});
