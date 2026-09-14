-- ---------------------------------------------------------------------------
-- 0024 — registar a venda, e impedir que a página vendida morra sozinha
--
-- O funil já sabia dizer "ganho". O que não sabia era quanto, nem proteger o
-- que se vendeu.
--
-- O PROBLEMA GRAVE que isto resolve
-- ---------------------------------
-- Uma landing page publicada tem validade (`expires_at`, 30 dias por omissão),
-- e passada essa data o endereço público deixa de devolver seja o que for.
-- Para uma demonstração está certo: não se quer cem páginas velhas no ar.
--
-- Para um cliente que PAGOU é um desastre silencioso. O site dele desaparece
-- ao fim de um mês, ninguém é avisado, e quem descobre é o cliente. Não havia
-- nada no esquema que distinguisse uma página de demonstração de uma página
-- vendida — e é por isso que isto entra na mesma migração que o valor da
-- venda: são a mesma decisão.
--
-- `sold_at` é essa distinção. Uma página com data de venda está no ar
-- enquanto o for, sem validade a correr contra ela.
--
-- O VALOR
-- -------
-- `deals` já tinha `expected_value_cents` — o que se ESPERA receber. O que se
-- recebeu a sério é outro número, e confundir os dois torna qualquer conta de
-- faturação uma adivinha. Daí `sale_value_cents`, ao lado e não por cima.
--
-- Em cêntimos e não em decimal, como o campo que já existia: dinheiro em
-- vírgula flutuante acaba sempre com um cêntimo a faltar numa soma.
--
-- `sale_is_monthly` porque um site de pequeno comércio vende-se quase sempre à
-- mensalidade. Sem isto, somar as vendas mistura uma avença de 30 euros com um
-- pagamento único de 400 e o total não quer dizer nada.
-- ---------------------------------------------------------------------------

alter table public.deals
  add column sale_value_cents integer
    check (sale_value_cents is null or sale_value_cents >= 0),
  add column sale_is_monthly boolean not null default false;

comment on column public.deals.sale_value_cents is
  'O que o cliente paga mesmo, em cêntimos. Separado de expected_value_cents, que é a expectativa antes de fechar.';
comment on column public.deals.sale_is_monthly is
  'true quando o valor é mensal. Sem isto, somar vendas mistura avenças com pagamentos únicos.';

alter table public.generated_sites
  add column sold_at timestamptz;

comment on column public.generated_sites.sold_at is
  'Quando esta página passou a ser de um cliente que pagou. A partir daqui não expira: a validade existe para as demonstrações, não para o site de quem pagou.';

-- ---------------------------------------------------------------------------
-- A leitura pública passa a respeitar a venda.
--
-- As duas peças que decidem se uma página responde têm de mudar juntas, senão
-- ficam a discordar: a política diz que sim e a função diz que não, ou o
-- contrário.
-- ---------------------------------------------------------------------------
drop policy if exists "sites: public reads live pages" on public.generated_sites;

create policy "sites: public reads live pages" on public.generated_sites
  for select to anon, authenticated
  using (
    status = 'published'
    and (sold_at is not null or expires_at > now())
  );

create or replace function public.is_site_live(p_site_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (
      select s.status = 'published'
         and (s.sold_at is not null or s.expires_at > now())
      from public.generated_sites s
      where s.id = p_site_id
    ),
    false
  );
$$;

comment on function public.is_site_live(uuid) is
  'true se a landing page está publicada e ainda dentro da validade — ou se foi vendida, caso em que não expira.';

-- Uma página vendida também não se apaga por engano.
create index generated_sites_sold_idx
  on public.generated_sites (owner_id, sold_at)
  where sold_at is not null;
