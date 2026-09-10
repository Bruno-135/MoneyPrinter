-- ============================================================================
-- 0020 — as avaliações escritas do Google
--
-- A nota e o número de avaliações já apareciam na página. O que faltava era o
-- que as pessoas escreveram — e é isso que se lê, não o número.
--
-- Ao contrário das fotos, este campo é de um escalão de preço ACIMA do que se
-- paga hoje. Por isso não entra na máscara do varrimento: encarecia todas as
-- procuras, incluindo as dos 900 comércios a que nunca se vai fazer site.
-- Pede-se à parte, comércio a comércio, num botão.
--
-- Guarda-se o texto tal e qual, com o nome do autor e a ligação. Alterar o
-- texto de uma avaliação não é permitido, e é também a única coisa que a torna
-- útil: uma avaliação reescrita não prova nada a ninguém.
-- ============================================================================

alter table public.businesses
  add column if not exists google_reviews jsonb not null default '[]'::jsonb,
  add column if not exists reviews_fetched_at timestamptz;

comment on column public.businesses.google_reviews is
  'Avaliações escritas no Google: texto, nota, autor e ligação. Nunca alteradas.';
comment on column public.businesses.reviews_fetched_at is
  'Quando foram pedidas. Nulo = nunca se pagou por elas.';
