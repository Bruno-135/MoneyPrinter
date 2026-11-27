import { describe, expect, it } from 'vitest';
import {
  PEDIDO_DE_SEGUIMENTO,
  SOBRE_POR_OMISSAO,
  construirContexto,
  construirMensagens,
  construirSistema,
  ehModeloDoRobo,
  textoDoAviso,
} from './robo-prompt';

describe('construirSistema', () => {
  it('usa o que se escreveu e, em branco, o texto por omissão', () => {
    expect(
      construirSistema({ sobre: 'Fazemos sites.', objetivo: 'Marcar chamada.', regras: '' }),
    ).toContain('Fazemos sites.');
    expect(construirSistema({ sobre: '', objetivo: '', regras: '' })).toContain(SOBRE_POR_OMISSAO);
  });

  it('as regras fixas vêm sempre no fim, depois das do dono', () => {
    const s = construirSistema({ sobre: 'x', objetivo: 'y', regras: 'Diz que és uma pessoa.' });
    expect(s.indexOf('REGRAS DO BRUNO')).toBeLessThan(s.indexOf('REGRAS FIXAS'));
    expect(s).toContain('assistente virtual da VaiDesign');
  });
});

describe('construirMensagens', () => {
  const contexto = construirContexto({ pais: 'PT', lead: { nome: 'Padaria X', site: 'none' } });

  it('começa no contexto, junta mensagens seguidas do mesmo lado e acaba na pessoa', () => {
    const m = construirMensagens({
      contexto,
      historico: [
        { de_mim: true, texto: 'Olá! Proposta' },
        { de_mim: false, texto: 'Olá' },
        { de_mim: false, texto: 'Quanto custa?' },
      ],
      seguimento: false,
    });
    expect(m.map((x) => x.role)).toEqual(['user', 'assistant', 'user']);
    expect(m[0]!.content).toContain('Padaria X');
    expect(m[2]!.content).toBe('Olá\n\nQuanto custa?');
  });

  it('nunca acaba numa mensagem nossa: num seguimento junta o pedido do sistema', () => {
    const m = construirMensagens({
      contexto,
      historico: [
        { de_mim: true, texto: 'Olá! Proposta' },
        { de_mim: false, texto: 'Vou ver' },
        { de_mim: true, texto: 'Combinado' },
      ],
      seguimento: true,
    });
    expect(m[m.length - 1]).toEqual({ role: 'user', content: PEDIDO_DE_SEGUIMENTO });
  });

  it('mensagens sem texto (áudio, imagem) não ficam vazias', () => {
    const m = construirMensagens({
      contexto,
      historico: [{ de_mim: false, texto: null, tipo: 'audioMessage' }],
      seguimento: false,
    });
    expect(m[1]!.content).toContain('audioMessage');
  });
});

describe('contexto, modelos e aviso', () => {
  it('diz o país e a situação do site', () => {
    const c = construirContexto({
      pais: 'BR',
      lead: { nome: 'Salão', site: 'social_only' },
      nomeWhatsapp: 'Ana',
    });
    expect(c).toContain('Brasil');
    expect(c).toContain('só tem redes sociais');
    expect(c).toContain('Ana');
    expect(construirContexto({ pais: 'PT', lead: null })).toContain('Não é um lead conhecido');
  });

  it('só aceita os modelos da lista', () => {
    expect(ehModeloDoRobo('claude-opus-5-5')).toBe(true);
    expect(ehModeloDoRobo('gpt-4')).toBe(false);
  });

  it('o aviso leva o número e a ligação para a conversa', () => {
    const t = textoDoAviso({
      nome: 'Padaria X',
      numero: '351912345678',
      motivo: 'Pediu o preço',
      humano: false,
      site: 'https://vaidesign.net/',
    });
    expect(t).toContain('🔥');
    expect(t).toContain('+351912345678');
    expect(t).toContain('https://vaidesign.net/painel/disparos/conversas?n=351912345678');
  });
});
