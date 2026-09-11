import { describe, expect, it } from 'vitest';
import { lerSistema } from './botao-imprimir';

/**
 * O que interessa aqui é NÃO confundir o Safari do iPhone com os browsers que
 * no iPhone não conseguem imprimir. É essa distinção que decide se se manda a
 * pessoa ao botão Partilhar ou se se lhe diz para mudar de browser.
 */
describe('lerSistema', () => {
  it('reconhece o Safari do iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    expect(lerSistema(ua)).toBe('ios-safari');
  });

  it('separa o Chrome do iPhone, que não abre a janela de impressão', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1';
    expect(lerSistema(ua)).toBe('ios-outro');
  });

  it('apanha também o Firefox, o Edge e o Opera do iPhone', () => {
    const base = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15';
    for (const marca of ['FxiOS/127.0', 'EdgiOS/126.0', 'OPiOS/16.0']) {
      expect(lerSistema(`${base} ${marca} Mobile/15E148`)).toBe('ios-outro');
    }
  });

  it('conhece o Android e o computador', () => {
    expect(lerSistema('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126.0 Mobile')).toBe(
      'android',
    );
    expect(lerSistema('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126.0')).toBe(
      'secretaria',
    );
    expect(lerSistema('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/127.0')).toBe(
      'secretaria',
    );
  });

  it('não confunde um Mac com um iPhone', () => {
    // O Safari do Mac tem "Macintosh" e não "iPhone" — mas ambos têm
    // "AppleWebKit", que é a armadilha óbvia se se procurasse por aí.
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
    expect(lerSistema(ua)).toBe('secretaria');
  });
});
