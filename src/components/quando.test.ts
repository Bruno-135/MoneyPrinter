import { describe, expect, it } from 'vitest';
import { haQuantoTempo } from './quando';

const agora = new Date('2026-09-14T12:00:00Z');
const atras = (minutos: number) => new Date(agora.getTime() - minutos * 60_000).toISOString();

describe('haQuantoTempo', () => {
  it('diz os minutos na primeira hora', () => {
    expect(haQuantoTempo(atras(0), agora)).toBe('agora mesmo');
    expect(haQuantoTempo(atras(1), agora)).toBe('há 1 min');
    expect(haQuantoTempo(atras(59), agora)).toBe('há 59 min');
  });

  it('passa a horas, com o singular certo', () => {
    expect(haQuantoTempo(atras(60), agora)).toBe('há 1 hora');
    expect(haQuantoTempo(atras(120), agora)).toBe('há 2 horas');
    expect(haQuantoTempo(atras(23 * 60), agora)).toBe('há 23 horas');
  });

  it('tem uma palavra para ontem', () => {
    expect(haQuantoTempo(atras(24 * 60), agora)).toBe('ontem');
    expect(haQuantoTempo(atras(47 * 60), agora)).toBe('ontem');
  });

  it('conta dias até ao mês', () => {
    expect(haQuantoTempo(atras(48 * 60), agora)).toBe('há 2 dias');
    expect(haQuantoTempo(atras(29 * 24 * 60), agora)).toBe('há 29 dias');
  });

  it('passada essa altura vale mais a data', () => {
    // "há 84 dias" não diz nada a ninguém; 22/06/2026 diz.
    expect(haQuantoTempo(atras(30 * 24 * 60), agora)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
