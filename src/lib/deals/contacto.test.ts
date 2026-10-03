import { describe, expect, it } from 'vitest';
import {
  ESCOLHAS,
  ESTADOS_DE_CONTACTO,
  contarEscolha,
  ehEscolhaDeContacto,
  estadosDaEscolha,
  ETIQUETA_DO_CONTACTO,
  ESTILO_DO_CONTACTO,
} from './contacto';

describe('o filtro de contacto', () => {
  it('cada escolha só apanha estados que existem', () => {
    for (const e of ESCOLHAS) {
      for (const estado of e.estados) expect(ESTADOS_DE_CONTACTO, e.value).toContain(estado);
    }
  });

  it('todo o estado é apanhado por alguma escolha', () => {
    // Um estado que nenhuma escolha apanhe é uma gente que nunca aparece
    // numa lista filtrada, e que só se encontra a olhar para a lista toda.
    const apanhados = new Set(ESCOLHAS.flatMap((e) => e.estados));
    for (const estado of ESTADOS_DE_CONTACTO) expect(apanhados.has(estado), estado).toBe(true);
  });

  it('«WhatsApp» inclui quem recebeu WhatsApp e email', () => {
    expect(estadosDaEscolha('whatsapp')).toContain('email_e_whatsapp');
    expect(estadosDaEscolha('email')).toContain('email_e_whatsapp');
  });

  it('«já contactados» apanha tudo menos os que faltam e os que pediram para sair', () => {
    const ja = estadosDaEscolha('ja');
    expect(ja).not.toContain('por_contactar');
    expect(ja).not.toContain('nao_contactar');
    expect(ja).toContain('contactado');
  });

  it('«por contactar» e «já contactados» não se sobrepõem', () => {
    // São a mesma pergunta vista dos dois lados. Se se sobrepusessem, a soma
    // das duas passava do total e ninguém percebia porquê.
    const por = new Set(estadosDaEscolha('por'));
    for (const e of estadosDaEscolha('ja')) expect(por.has(e), e).toBe(false);
  });

  it('uma escolha inventada não filtra nada', () => {
    expect(estadosDaEscolha('inventado')).toEqual([]);
    expect(estadosDaEscolha(undefined)).toEqual([]);
    expect(ehEscolhaDeContacto('inventado')).toBe(false);
  });

  it('conta uma escolha somando os estados dela', () => {
    const contagem = [
      { value: 'por_contactar', count: 100 },
      { value: 'whatsapp_enviado', count: 7 },
      { value: 'email_e_whatsapp', count: 3 },
      { value: 'email_enviado', count: 5 },
    ];
    const por = (v: string) => ESCOLHAS.find((e) => e.value === v)!;
    expect(contarEscolha(contagem, por('whatsapp'))).toBe(10);
    expect(contarEscolha(contagem, por('email'))).toBe(8);
    expect(contarEscolha(contagem, por('ja'))).toBe(15);
    expect(contarEscolha(contagem, por('por'))).toBe(100);
    expect(contarEscolha(contagem, por('nao'))).toBe(0);
  });

  it('dá nome e cor a todos os estados', () => {
    for (const e of ESTADOS_DE_CONTACTO) {
      expect(ETIQUETA_DO_CONTACTO[e], e).toBeTruthy();
      expect(ESTILO_DO_CONTACTO[e], e).toBeTruthy();
    }
  });
});
