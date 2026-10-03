import { describe, expect, it } from 'vitest';
import { ehSiteDePlataforma, ipPrivado } from './recolher';

describe('ipPrivado', () => {
  it('apanha as redes que não são a internet', () => {
    for (const ip of [
      '127.0.0.1',
      '10.0.0.5',
      '192.168.1.1',
      '172.16.0.1',
      '172.31.9.9',
      '169.254.169.254',
      '0.0.0.0',
      '100.64.0.1',
      '::1',
      'fd00::1',
      'fe80::1',
      '::ffff:10.0.0.1',
    ]) {
      expect(ipPrivado(ip), ip).toBe(true);
    }
  });
  it('deixa passar endereços públicos', () => {
    for (const ip of ['8.8.8.8', '172.32.0.1', '93.184.216.34', '2606:4700::1111']) {
      expect(ipPrivado(ip), ip).toBe(false);
    }
  });
});

describe('ehSiteDePlataforma', () => {
  it('não procura e-mail em plataformas', () => {
    expect(ehSiteDePlataforma('https://www.ifood.com.br/delivery/x')).toBe(true);
    expect(ehSiteDePlataforma('https://wa.link/8jk68x')).toBe(true);
    expect(ehSiteDePlataforma('https://www.tripadvisor.pt/Restaurant')).toBe(true);
  });
  it('deixa os sites dos negócios', () => {
    expect(ehSiteDePlataforma('http://www.glicinia.pt/')).toBe(false);
    expect(ehSiteDePlataforma('padariamaristela.com.br')).toBe(false);
  });
});
