import { describe, expect, it } from 'vitest';
import { filtrarEnderecos, julgarEndereco } from './imagem';

describe('julgarEndereco', () => {
  it('aceita um ficheiro de imagem', () => {
    expect(julgarEndereco('https://exemplo.pt/casaco.jpg').serve).toBe(true);
    expect(julgarEndereco('https://exemplo.pt/a/b/foto.PNG').serve).toBe(true);
    expect(julgarEndereco('https://exemplo.pt/foto.webp?v=2').serve).toBe(true);
  });

  it('aceita o nosso armazenamento', () => {
    const u = 'https://xyz.supabase.co/storage/v1/object/public/fotos-sites/a/b/c';
    expect(julgarEndereco(u).serve).toBe(true);
  });

  it('RECUSA uma página do Pixabay — o caso real que partiu a loja', () => {
    const v = julgarEndereco('https://pixabay.com/pt/photos/casaco-panos-3619797/');
    expect(v.serve).toBe(false);
    expect(v.porque).toContain('PÁGINA');
    expect(v.porque).toContain('.jpg');
  });

  it('recusa uma página do Unsplash mas aceita a imagem', () => {
    expect(julgarEndereco('https://unsplash.com/photos/abc123').serve).toBe(false);
    expect(julgarEndereco('https://images.unsplash.com/photo-123').serve).toBe(true);
  });

  it('recusa o que não é endereço nenhum', () => {
    expect(julgarEndereco('casaco.jpg').serve).toBe(false);
    expect(julgarEndereco('').serve).toBe(false);
  });

  it('recusa javascript: mesmo acabando em .png', () => {
    expect(julgarEndereco('javascript:alert(1)//a.png').serve).toBe(false);
  });
});

describe('filtrarEnderecos', () => {
  it('separa os bons dos maus e diz porquê', () => {
    const { bons, recusados } = filtrarEnderecos([
      'https://exemplo.pt/a.jpg',
      'https://pixabay.com/pt/photos/casaco-3619797/',
      '  ',
    ]);
    expect(bons).toEqual(['https://exemplo.pt/a.jpg']);
    expect(recusados).toHaveLength(1);
    expect(recusados[0]).toContain('pixabay.com');
  });
});
