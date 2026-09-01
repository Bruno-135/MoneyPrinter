\set ON_ERROR_STOP on
\pset pager off

-- Dois donos, para provar o isolamento.
-- O delete torna o teste re-executável: apaga em cascata tudo o que estes dois
-- donos tenham deixado de uma execução anterior.
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@ex.pt'),
  ('22222222-2222-2222-2222-222222222222', 'b@ex.br');

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '== 1. região: owner_id e search_key automáticos =='
insert into public.searched_regions (label, business_category, country_code, locality, center_lat, center_lng, radius_meters)
values ('Braga centro', ' Padaria ', 'PT', ' Braga ', 41.5454870, -8.4265100, 2000);
select owner_id, search_key from public.searched_regions;

\echo '== 2. dedup: mesma zona/ramo com espaços e maiúsculas diferentes deve falhar =='
do $$ begin
  insert into public.searched_regions (label, business_category, country_code, locality, center_lat, center_lng, radius_meters)
  values ('Braga (outra vez)', 'PADARIA', 'PT', 'BRAGA', 41.545487, -8.426510, 2000);
  raise exception 'FALHOU: duplicado foi aceite';
exception when unique_violation then
  raise notice 'OK: duplicado rejeitado pela BD';
end $$;

\echo '== 3. cache: is_region_search_stale =='
select public.is_region_search_stale(id, 30) as stale_30d,
       public.is_region_search_stale(id, 0)  as stale_0d
from public.searched_regions;

\echo '== 4. comércio: colunas geradas (has_website, has_social, is_food_service) =='
insert into public.businesses (
  region_id, google_place_id, name, business_category, google_types,
  country_code, locality, phone_raw, phone_e164, phone_country_code, phone_country,
  rating, reviews_count, google_raw
)
select id, 'ChIJ_padaria_1', 'Padaria do Bairro', 'Padaria', array['bakery','food'],
       'PT', 'Braga', '253 123 456', '+351253123456', '+351', 'PT',
       4.6, 187, '{"places":[{"id":"ChIJ_padaria_1"}]}'::jsonb
from public.searched_regions;

insert into public.businesses (
  google_place_id, name, business_category, google_types, country_code,
  website_url, social_links, phone_raw, phone_e164, phone_country_code, phone_country
)
values ('ChIJ_loja_1', 'Loja da Esquina', 'Retalho', array['store'], 'BR',
        'https://loja.com.br', '{"instagram":"@loja"}'::jsonb,
        '(11) 91234-5678', '+5511912345678', '+55', 'BR');

select name, has_website, has_social, is_food_service, phone_country_code, phone_country, country_code
from public.businesses order by name;

\echo '== 5. telefone inválido é rejeitado =='
do $$ begin
  insert into public.businesses (google_place_id, name, business_category, country_code, phone_e164)
  values ('x', 'Mau Telefone', 'Teste', 'PT', '253123456');
  raise exception 'FALHOU: telefone não-E164 aceite';
exception when check_violation then raise notice 'OK: phone_e164 sem + rejeitado';
end $$;

\echo '== 6. score fora de 0-100 é rejeitado =='
do $$ begin
  update public.businesses set score = 140 where name = 'Padaria do Bairro';
  raise exception 'FALHOU: score 140 aceite';
exception when check_violation then raise notice 'OK: score fora do intervalo rejeitado';
end $$;

update public.businesses set score = 87,
  score_breakdown = '{"no_website":40,"rating":20,"reviews":17,"food_service":10}'::jsonb,
  score_calculated_at = now()
where name = 'Padaria do Bairro';

\echo '== 7. site gerado: public_code aleatório + validade =='
insert into public.generated_sites (business_id, template, status, title, published_at, whatsapp_number_e164, whatsapp_country)
select id, 'food_service', 'published', 'Padaria do Bairro', now(), '+351253123456', 'PT'
from public.businesses where name = 'Padaria do Bairro';
select template, status, public_code, length(public_code) as len,
       (expires_at > now()) as dentro_validade,
       round(extract(epoch from expires_at - created_at) / 86400) as dias
from public.generated_sites;

\echo '== 8. cardápio só em sites food_service =='
insert into public.menu_items (site_id, section, name, price_cents, currency, position)
select id, 'Pão', 'Broa de milho', 190, 'EUR', 1 from public.generated_sites;
select section, name, price_cents, currency from public.menu_items;

insert into public.generated_sites (business_id, template, status)
select id, 'standard', 'draft' from public.businesses where name = 'Loja da Esquina';
do $$
declare v_id uuid;
begin
  select id into v_id from public.generated_sites where template = 'standard';
  insert into public.menu_items (site_id, name) values (v_id, 'Prato num site genérico');
  raise exception 'FALHOU: cardápio aceite em site standard';
exception when raise_exception then
  if sqlerrm like 'FALHOU%' then raise; end if;
  raise notice 'OK: cardápio recusado em site standard';
end $$;

\echo '== 9. negociação: histórico escrito por trigger =='
insert into public.deals (business_id, stage, expected_value_cents, currency)
select id, 'new', 49900, 'EUR' from public.businesses where name = 'Padaria do Bairro';
update public.deals set stage = 'contacted';
update public.deals set stage = 'proposal_sent';
update public.deals set stage = 'won';
select from_stage, to_stage from public.deal_stage_events order by changed_at, created_at;
select stage, won_at is not null as tem_data_ganho, first_contacted_at is not null as tem_1o_contacto
from public.deals;

\echo '== 10. histórico é imutável (sem política de INSERT/UPDATE/DELETE) =='
do $$ begin
  insert into public.deal_stage_events (deal_id, business_id, to_stage)
  select id, business_id, 'lost' from public.deals;
  raise exception 'FALHOU: histórico forjado aceite';
exception when insufficient_privilege then raise notice 'OK: INSERT manual no histórico bloqueado pela RLS';
end $$;
do $$ declare n integer; begin
  delete from public.deal_stage_events; get diagnostics n = row_count;
  if n > 0 then raise exception 'FALHOU: apagou % linhas do histórico', n; end if;
  raise notice 'OK: DELETE no histórico não afeta nenhuma linha';
end $$;

\echo '== 11. registo público de visita e clique (visitante anónimo) =='
\set old_role authenticated
set role anon;
set request.jwt.claim.sub = '';
select public.record_site_visit(
  (select public_code from public.generated_sites where template = 'food_service'),
  'hash_visitante_1', 'sess-1', 'https://google.com', 'mobile', 'Mozilla/5.0', 'pt', 'Braga'
) is not null as visita_registada;

select public.record_site_click(
  (select public_code from public.generated_sites where template = 'food_service'),
  'whatsapp', '+351253123456'
) is not null as clique_registado;

\echo '   site em rascunho não regista nada:'
select public.record_site_visit(
  (select public_code from public.generated_sites where template = 'standard'), 'h', 's'
) is null as rascunho_ignorado;

\echo '   anon não consegue escrever diretamente nas tabelas:'
do $$ begin
  insert into public.site_visits (owner_id, site_id) select owner_id, id from public.generated_sites limit 1;
  raise exception 'FALHOU: anon escreveu em site_visits';
exception when insufficient_privilege then raise notice 'OK: INSERT direto de anon bloqueado';
end $$;

\echo '   anon lê a página publicada mas não o rascunho:'
select count(*) as sites_visiveis_para_anon from public.generated_sites;
select count(*) as itens_cardapio_visiveis from public.menu_items;
select count(*) as comercios_visiveis_para_anon from public.businesses;

\echo '== 12. relatório mensal =='
reset role; set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select business_name, to_char(month, 'YYYY-MM') as mes, visits, unique_visitors,
       clicks, whatsapp_clicks, click_through_rate
from public.monthly_site_report;

\echo '== 13. isolamento entre donos =='
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select
  (select count(*) from public.businesses)        as comercios,
  (select count(*) from public.searched_regions)  as regioes,
  (select count(*) from public.deals)             as negociacoes,
  (select count(*) from public.deal_stage_events) as historico,
  (select count(*) from public.monthly_site_report) as linhas_relatorio;

\echo '   e o dono B não consegue escrever com o owner_id do dono A:'
do $$ begin
  insert into public.businesses (owner_id, google_place_id, name, business_category, country_code)
  values ('11111111-1111-1111-1111-111111111111', 'roubado', 'Roubo', 'X', 'PT');
  raise exception 'FALHOU: escreveu em nome de outro dono';
exception when insufficient_privilege then raise notice 'OK: escrita cruzada bloqueada pela RLS';
end $$;

reset role;
\echo '== 14. RLS ligada em todas as tabelas =='
select tablename, rowsecurity from pg_tables where schemaname='public' order by tablename;
