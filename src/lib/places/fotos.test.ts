import { describe, expect, it } from 'vitest';
import { lerFotosGuardadas } from './fotos';

describe('lerFotosGuardadas', () => {
  const bruto = [
    {
      name: 'places/ABC/photos/XYZ',
      widthPx: 3000,
      heightPx: 2000,
      authorAttributions: [
        { displayName: 'João Silva', uri: 'https://maps.google.com/maps/contrib/123' },
      ],
    },
  ];

  it('traz o crédito de quem tirou a foto — sem ele não se pode publicar', () => {
    const [foto] = lerFotosGuardadas(bruto);
    expect(foto?.credito).toBe('Foto de João Silva · Google');
    expect(foto?.creditoUrl).toBe('https://maps.google.com/maps/contrib/123');
  });

  it('põe um crédito genérico quando a Google não diz o nome', () => {
    const [foto] = lerFotosGuardadas([{ name: 'places/A/photos/B' }]);
    expect(foto?.credito).toBe('Foto de um cliente · Google');
    expect(foto?.creditoUrl).toBeNull();
  });

  it('deita fora entradas sem nome, que não dariam imagem nenhuma', () => {
    expect(lerFotosGuardadas([{ widthPx: 100 }, { name: '  ' }, ...bruto])).toHaveLength(1);
  });

  it('aguenta lixo em vez de rebentar', () => {
    expect(lerFotosGuardadas(null)).toEqual([]);
    expect(lerFotosGuardadas('nada disto')).toEqual([]);
    expect(lerFotosGuardadas({})).toEqual([]);
  });
});
