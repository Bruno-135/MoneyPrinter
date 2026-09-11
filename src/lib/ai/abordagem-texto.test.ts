import { describe, expect, it } from 'vitest';
import type { Database } from '@/types/database.types';
import { factos, gancho, notaEscrita, regrasDoPais } from './abordagem-texto';

type Business = Database['public']['Tables']['businesses']['Row'];



function comercio(campos: Partial<Business>): Business {
  return {
    name: 'Padaria Jamor',
    business_category: 'padaria',
    locality: 'Braga',
    country_code: 'PT',
    website_kind: 'none',
    website_host: null,
    rating: null,
    reviews_count: null,
    ...campos,
  } as Business;
}

describe('gancho', () => {
  it('nomeia a rede social quando é a única presença', () => {
    const texto = gancho(comercio({ website_kind: 'social_only', website_host: 'instagram.com/x' }));
    expect(texto).toContain('Instagram');
  });

  it('reconhece o Facebook', () => {
    const texto = gancho(comercio({ website_kind: 'social_only', website_host: 'facebook.com/x' }));
    expect(texto).toContain('Facebook');
  });

  it('não inventa a rede quando o endereço não a diz', () => {
    const texto = gancho(comercio({ website_kind: 'social_only', website_host: 'linktr.ee/x' }));
    expect(texto).toContain('rede social');
    expect(texto).not.toContain('Instagram');
  });

  it('proíbe o "não tem site" a quem tem site', () => {
    // O erro que fecharia a conversa: dizer a alguém que ele não tem site
    // quando ele sabe que tem. A instrução tem de ser explícita.
    const texto = gancho(comercio({ website_kind: 'real', website_host: 'padariajamor.pt' }));
    expect(texto).toContain('NÃO é');
    expect(texto).toContain('padariajamor.pt');
  });
});

describe('factos', () => {
  const semPagina = { urlPagina: null, assinatura: '' };

  it('só usa a avaliação quando há votos que a sustentem', () => {
    // 4,8 de três pessoas é verdade e não convence; sem número de votos, fora.
    const sem = factos(comercio({ rating: 4.8, reviews_count: null }), semPagina);
    expect(sem).not.toContain('4,8');

    const com = factos(comercio({ rating: 4.8, reviews_count: 686 }), semPagina);
    expect(com).toContain('686');
  });

  it('manda a nota com vírgula e nunca com ponto', () => {
    // O modelo copia o número tal como o recebe. Um "4.6" no meio de uma
    // mensagem em português denuncia-a como escrita por uma máquina — e esta é
    // a primeira frase que um cliente lê.
    const texto = factos(comercio({ rating: 4.6, reviews_count: 1893 }), semPagina);
    expect(texto).toContain('4,6');
    expect(texto).not.toContain('4.6');
  });

  it('manda oferecer o link quando a página já está no ar', () => {
    const texto = factos(comercio({}), {
      urlPagina: 'https://exemplo.pt/s/abc123',
      assinatura: '',
    });
    expect(texto).toContain('https://exemplo.pt/s/abc123');
    expect(texto).toContain('JÁ EXISTE');
  });

  it('só fala de quem assina quando há nome', () => {
    expect(factos(comercio({}), { urlPagina: null, assinatura: '  ' })).not.toContain('assina');
    expect(factos(comercio({}), { urlPagina: null, assinatura: 'Bruno' })).toContain('Bruno');
  });

  it('deixa de fora a localidade que não existe', () => {
    expect(factos(comercio({ locality: null }), semPagina)).not.toContain('Localidade');
  });
});

describe('notaEscrita', () => {
  it('troca o ponto pela vírgula', () => {
    expect(notaEscrita(4.6)).toBe('4,6');
    expect(notaEscrita(5)).toBe('5,0');
    expect(notaEscrita(4.25)).toBe('4,3');
  });
});

describe('regrasDoPais', () => {
  it('separa o português de cá do de lá', () => {
    // O vocabulário é o que denuncia uma mensagem escrita para o outro lado do
    // Atlântico: "não tem telemóvel" não quer dizer nada no Brasil.
    expect(regrasDoPais('PT').toLowerCase()).toContain('telemóvel');
    expect(regrasDoPais('PT').toLowerCase()).toContain('nunca celular');
    expect(regrasDoPais('BR').toLowerCase()).toContain('celular');
    expect(regrasDoPais('BR').toLowerCase()).toContain('nunca telemóvel');
  });

  it('aceita o código em minúsculas', () => {
    expect(regrasDoPais('br')).toBe(regrasDoPais('BR'));
  });

  it('cai em Portugal quando não conhece o país', () => {
    // Português europeu é o que o produto fala por omissão. O importante é
    // devolver regras e nunca `undefined`, que mandaria "undefined" no prompt.
    expect(regrasDoPais('ES')).toBe(regrasDoPais('PT'));
    expect(regrasDoPais('')).toBe(regrasDoPais('PT'));
  });
});
