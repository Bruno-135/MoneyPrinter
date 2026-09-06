import { describe, expect, it } from 'vitest';
import { classifyWebsite, isProspect, socialLinksFrom, websiteHost } from './website';

describe('websiteHost', () => {
  it('tira o esquema, o www e o caminho', () => {
    expect(websiteHost('https://www.padariacentral.pt/menu?x=1')).toBe('padariacentral.pt');
    expect(websiteHost('http://oficina.com.br')).toBe('oficina.com.br');
    expect(websiteHost('padaria.pt/contactos')).toBe('padaria.pt');
  });

  it('devolve null para vazio', () => {
    expect(websiteHost(null)).toBeNull();
    expect(websiteHost(undefined)).toBeNull();
    expect(websiteHost('   ')).toBeNull();
  });
});

describe('classifyWebsite — os três casos do produto', () => {
  it('sem nada no campo -> none', () => {
    expect(classifyWebsite(null)).toBe('none');
    expect(classifyWebsite('')).toBe('none');
    expect(classifyWebsite('  ')).toBe('none');
  });

  it('rede social no campo do site -> social_only', () => {
    expect(classifyWebsite('https://www.facebook.com/apadaria')).toBe('social_only');
    expect(classifyWebsite('http://instagram.com/loja')).toBe('social_only');
    expect(classifyWebsite('https://m.facebook.com/x')).toBe('social_only');
    expect(classifyWebsite('https://linktr.ee/oficina')).toBe('social_only');
    expect(classifyWebsite('https://wa.me/351912345678')).toBe('social_only');
  });

  it('site-montra gratuito também conta como social_only', () => {
    // Estes são prospetos: quem tem um destes já quer presença online.
    expect(classifyWebsite('https://apadaria.business.site/')).toBe('social_only');
    expect(classifyWebsite('https://joao.wixsite.com/oficina')).toBe('social_only');
    expect(classifyWebsite('https://loja.blogspot.com')).toBe('social_only');
  });

  it('site próprio -> real', () => {
    expect(classifyWebsite('https://www.padariacentral.pt')).toBe('real');
    expect(classifyWebsite('http://oficinadojoao.com.br')).toBe('real');
    expect(classifyWebsite('https://clinica-sorriso.pt/marcacoes')).toBe('real');
  });

  it('não confunde um domínio próprio que contenha o nome de uma rede', () => {
    expect(classifyWebsite('https://facebookmarketing.pt')).toBe('real');
    expect(classifyWebsite('https://instagramoveis.com.br')).toBe('real');
  });
});

describe('isProspect', () => {
  it('trata sem site e só rede social como prospetos', () => {
    expect(isProspect('none')).toBe(true);
    expect(isProspect('social_only')).toBe(true);
    expect(isProspect('real')).toBe(false);
  });
});

describe('socialLinksFrom', () => {
  it('reconhece a rede e guarda a ligação', () => {
    expect(socialLinksFrom('https://www.facebook.com/apadaria')).toEqual({
      facebook: 'https://www.facebook.com/apadaria',
    });
    expect(socialLinksFrom('https://instagram.com/loja')).toEqual({
      instagram: 'https://instagram.com/loja',
    });
  });

  it('devolve vazio para um site próprio ou nada', () => {
    expect(socialLinksFrom('https://padariacentral.pt')).toEqual({});
    expect(socialLinksFrom(null)).toEqual({});
  });
});
