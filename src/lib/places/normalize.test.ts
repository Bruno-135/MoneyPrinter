import { describe, expect, it } from 'vitest';
import { normalizePlace } from './normalize';
import type { PlaceResult } from './types';

const OPTIONS = { categoryLabel: 'Padaria', fallbackCountryCode: 'PT' };

function place(overrides: Partial<PlaceResult> = {}): PlaceResult {
  return {
    id: 'ChIJ_teste',
    displayName: { text: 'Padaria do Bairro' },
    types: ['bakery', 'food'],
    formattedAddress: 'Rua Nova 12, 4700-000 Braga',
    addressComponents: [
      { longText: '12', types: ['street_number'] },
      { longText: 'Rua Nova', types: ['route'] },
      { longText: 'Braga', types: ['locality'] },
      { longText: 'Braga', types: ['administrative_area_level_1'] },
      { longText: '4700-000', types: ['postal_code'] },
      { longText: 'Portugal', shortText: 'PT', types: ['country'] },
    ],
    location: { latitude: 41.5454, longitude: -8.4265 },
    ...overrides,
  };
}

describe('normalizePlace', () => {
  it('parte a morada nos campos separados', () => {
    const row = normalizePlace(place(), OPTIONS)!;
    expect(row.street).toBe('Rua Nova');
    expect(row.street_number).toBe('12');
    expect(row.postal_code).toBe('4700-000');
    expect(row.locality).toBe('Braga');
    expect(row.country_code).toBe('PT');
  });

  it('guarda a resposta completa em google_raw', () => {
    const input = place();
    expect(normalizePlace(input, OPTIONS)!.google_raw).toBe(input);
  });

  it('recusa um resultado sem id ou sem nome', () => {
    expect(normalizePlace(place({ id: '' }), OPTIONS)).toBeNull();
    expect(normalizePlace(place({ displayName: undefined }), OPTIONS)).toBeNull();
  });

  it('deixa a null tudo o que a API não devolveu', () => {
    const row = normalizePlace({ id: 'x', displayName: { text: 'Y' } }, OPTIONS)!;
    expect(row.website_url).toBeNull();
    expect(row.phone_e164).toBeNull();
    expect(row.rating).toBeNull();
    expect(row.reviews_count).toBeNull();
    expect(row.latitude).toBeNull();
  });

  it('usa o país da morada e não o da região para normalizar o telefone', () => {
    const brasileiro = place({
      addressComponents: [{ longText: 'Brasil', shortText: 'BR', types: ['country'] }],
      nationalPhoneNumber: '(11) 91234-5678',
    });
    const row = normalizePlace(brasileiro, OPTIONS)!;
    expect(row.country_code).toBe('BR');
    expect(row.phone_e164).toBe('+5511912345678');
    expect(row.phone_country).toBe('BR');
  });

  it('guarda o telefone nacional em bruto e o normalizado à parte', () => {
    const row = normalizePlace(place({ nationalPhoneNumber: '253 123 456' }), OPTIONS)!;
    expect(row.phone_raw).toBe('253 123 456');
    expect(row.phone_e164).toBe('+351253123456');
    expect(row.phone_country_code).toBe('+351');
  });

  it('converte o nível de preço textual para inteiro', () => {
    expect(normalizePlace(place({ priceLevel: 'PRICE_LEVEL_MODERATE' }), OPTIONS)!.price_level).toBe(2);
    expect(normalizePlace(place({ priceLevel: 'DESCONHECIDO' }), OPTIONS)!.price_level).toBeNull();
  });

  it('extrai a rede social quando o campo do site aponta para uma', () => {
    const row = normalizePlace(place({ websiteUri: 'https://facebook.com/apadaria' }), OPTIONS)!;
    expect(row.social_links).toEqual({ facebook: 'https://facebook.com/apadaria' });
  });

  it('usa o país da região quando a morada não traz país', () => {
    const row = normalizePlace(place({ addressComponents: [] }), OPTIONS)!;
    expect(row.country_code).toBe('PT');
  });
});
