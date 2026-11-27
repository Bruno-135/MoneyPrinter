import { describe, expect, it } from 'vitest';
import {
  aplicarModelo,
  comLinhaParaSair,
  diasDeAquecimento,
  diasParaTerminar,
  lerNumerosColados,
  limiteHoje,
  metaDeAquecimento,
  nomeDeInstancia,
  normalizarNumero,
  paisDoNumero,
  pedeParaSair,
  primeiroNome,
} from './disparos';
import { mensagemDeAbertura } from './mensagem';

describe('normalizarNumero', () => {
  it('aceita os formatos de Portugal', () => {
    expect(normalizarNumero('+351 912 345 678', 'PT')).toBe('351912345678');
    expect(normalizarNumero('00351912345678', 'PT')).toBe('351912345678');
    expect(normalizarNumero('912345678', 'PT')).toBe('351912345678');
    // Um telemóvel português sem indicativo é português, mesmo com o Brasil escolhido.
    expect(normalizarNumero('912345678', 'BR')).toBe('351912345678');
  });

  it('aceita os formatos do Brasil', () => {
    expect(normalizarNumero('+55 (11) 91234-5678', 'PT')).toBe('5511912345678');
    expect(normalizarNumero('11912345678', 'BR')).toBe('5511912345678');
  });

  it('recusa o que não é número', () => {
    expect(normalizarNumero('abc', 'PT')).toBeNull();
    expect(normalizarNumero('123', 'PT')).toBeNull();
  });
});

describe('lerNumerosColados', () => {
  it('lê número, nome;número e número;nome, e conta os repetidos uma vez', () => {
    const r = lerNumerosColados(
      [
        '912345678',
        'Ana; +351 913 000 111',
        '+351913000111, Outra vez',
        'lixo',
        '',
        '11 91234-5678\tCarlos',
      ].join('\n'),
      'BR',
    );
    expect(r.validos).toEqual([
      { numero: '351912345678', nome: '', pais: 'PT' },
      { numero: '351913000111', nome: 'Ana', pais: 'PT' },
      { numero: '5511912345678', nome: 'Carlos', pais: 'BR' },
    ]);
    expect(r.invalidos).toEqual(['lixo']);
  });
});

describe('paisDoNumero', () => {
  it('55 é Brasil, o resto Portugal', () => {
    expect(paisDoNumero('5511912345678')).toBe('BR');
    expect(paisDoNumero('351912345678')).toBe('PT');
  });
});

describe('modelos', () => {
  it('usa o primeiro nome de uma pessoa e o nome todo de uma empresa', () => {
    expect(primeiroNome('Ana Martins')).toBe('Ana');
    expect(primeiroNome('Padaria Central Lda')).toBe('Padaria Central Lda');
    expect(primeiroNome('')).toBe('');
  });

  it('troca {nome} e, sem nome, não deixa «Olá !»', () => {
    expect(aplicarModelo('Olá {nome}, {saudacao}!', 'Ana Martins')).toBe('Olá Ana, {saudacao}!');
    expect(aplicarModelo('Olá {nome}, tudo bem?', '')).toBe('Olá, tudo bem?');
    expect(aplicarModelo('Olá, {nome}! Tudo bem?', '')).toBe('Olá! Tudo bem?');
  });

  it('a linha de sair vai no fim e a base reconhece a palavra', () => {
    expect(comLinhaParaSair('Olá', 'PT')).toBe(
      'Olá\n\nSe não quiser receber mais mensagens, responda SAIR.',
    );
    expect(pedeParaSair('Sair.')).toBe(true);
    expect(pedeParaSair(' parar ')).toBe(true);
    expect(pedeParaSair('Quero saber o preço, não quero sair')).toBe(false);
  });

  it('a mensagem automática leva {saudacao} para a base trocar na hora do envio', () => {
    const m = mensagemDeAbertura({
      pais: 'PT',
      presenca: 'none',
      chave: 'x',
      saudacao: '{saudacao}',
    });
    expect(m).toContain('{saudacao}');
    expect(m).not.toMatch(/bom dia|boa tarde|boa noite/);
  });
});

describe('ritmo e aquecimento (o mesmo que a base)', () => {
  const hoje = new Date('2026-11-26T12:00:00Z');
  const chip = (desde: string, aquecer = true) => ({
    limiteDiario: 30,
    aquecer,
    aquecimentoDesde: desde,
  });

  it('conta os dias por datas', () => {
    expect(diasDeAquecimento('2026-11-26', hoje)).toBe(0);
    expect(diasDeAquecimento('2026-11-20', hoje)).toBe(6);
  });

  it('a rampa dos disparos: 5, 10, 20 e depois o limite', () => {
    expect(limiteHoje(chip('2026-11-26'), hoje)).toBe(5);
    expect(limiteHoje(chip('2026-11-22'), hoje)).toBe(10);
    expect(limiteHoje(chip('2026-11-16'), hoje)).toBe(20);
    expect(limiteHoje(chip('2026-11-01'), hoje)).toBe(30);
    expect(limiteHoje(chip('2026-11-26', false), hoje)).toBe(30);
    expect(limiteHoje({ ...chip('2026-11-01'), limiteDiario: 15 }, hoje)).toBe(15);
  });

  it('a meta do aquecimento: 10, 7 e depois 4', () => {
    expect(metaDeAquecimento(chip('2026-11-26'), hoje)).toBe(10);
    expect(metaDeAquecimento(chip('2026-11-16'), hoje)).toBe(7);
    expect(metaDeAquecimento(chip('2026-11-01'), hoje)).toBe(4);
    expect(metaDeAquecimento(chip('2026-11-01', false), hoje)).toBe(0);
  });

  it('quantos dias leva um disparo', () => {
    expect(diasParaTerminar(60, [chip('2026-11-01'), chip('2026-11-01')], hoje)).toBe(1);
    expect(diasParaTerminar(61, [chip('2026-11-01'), chip('2026-11-01')], hoje)).toBe(2);
    expect(diasParaTerminar(10, [], hoje)).toBe(Infinity);
    expect(diasParaTerminar(0, [], hoje)).toBe(0);
  });
});

describe('nomeDeInstancia', () => {
  it('só letras, números e hífenes, com um sufixo para não colidir', () => {
    expect(nomeDeInstancia('Chip PT nº 2', 'K3X9')).toBe('chip-pt-n-2-k3x9');
    expect(nomeDeInstancia('São João', 'ab12')).toBe('sao-joao-ab12');
    expect(nomeDeInstancia('***', 'ab12')).toBe('chip-ab12');
    expect(nomeDeInstancia('Chip PT nº 2', 'K3X9')).toMatch(/^[A-Za-z0-9_-]{1,60}$/);
  });
});
