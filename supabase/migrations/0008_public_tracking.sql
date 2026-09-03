-- ============================================================================
-- 0008 — Registo público de visitas e cliques
--
-- As landing pages são abertas por visitantes anónimos, que têm de conseguir
-- registar uma visita ou um clique sem terem permissão de escrita nas tabelas.
--
-- A solução são duas funções SECURITY DEFINER:
--   - recebem o `public_code` (o que o visitante conhece), nunca um id interno;
--   - recusam páginas não publicadas ou fora da validade;
--   - derivam `owner_id`, `site_id` e `business_id` da própria página, portanto
--     um visitante não consegue inserir eventos em nome de outro dono.
-- ============================================================================

create or replace function public.record_site_visit(
  p_public_code text,
  p_visitor_hash text default null,
  p_session_id text default null,
  p_referrer text default null,
  p_device_type text default null,
  p_user_agent text default null,
  p_country_code text default null,
  p_city text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site public.generated_sites%rowtype;
  v_is_first boolean := false;
  v_visit_id uuid;
begin
  select * into v_site
  from public.generated_sites s
  where s.public_code = p_public_code
    and s.status = 'published'
    and s.expires_at > now();

  if not found then
    -- Página inexistente, por publicar ou expirada: não se regista nada e não
    -- se revela qual dos três casos é.
    return null;
  end if;

  if p_visitor_hash is not null then
    v_is_first := not exists (
      select 1 from public.site_visits v
      where v.site_id = v_site.id and v.visitor_hash = p_visitor_hash
    );
  end if;

  insert into public.site_visits (
    owner_id, site_id, business_id, visitor_hash, session_id, is_first_visit,
    referrer, utm_source, utm_medium, utm_campaign,
    device_type, user_agent, country_code, city
  )
  values (
    v_site.owner_id, v_site.id, v_site.business_id, p_visitor_hash, p_session_id, v_is_first,
    p_referrer, p_utm_source, p_utm_medium, p_utm_campaign,
    nullif(p_device_type, ''), p_user_agent, nullif(upper(p_country_code), ''), p_city
  )
  returning id into v_visit_id;

  return v_visit_id;
end;
$$;

comment on function public.record_site_visit is
  'Regista uma visita a uma landing page pública. Devolve null se a página não estiver acessível.';

create or replace function public.record_site_click(
  p_public_code text,
  p_target public.click_target,
  p_target_value text default null,
  p_menu_item_id uuid default null,
  p_visit_id uuid default null,
  p_session_id text default null,
  p_visitor_hash text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site public.generated_sites%rowtype;
  v_menu_item_id uuid;
  v_click_id uuid;
begin
  select * into v_site
  from public.generated_sites s
  where s.public_code = p_public_code
    and s.status = 'published'
    and s.expires_at > now();

  if not found then
    return null;
  end if;

  -- Um item de cardápio só conta se for mesmo desta página.
  if p_menu_item_id is not null then
    select m.id into v_menu_item_id
    from public.menu_items m
    where m.id = p_menu_item_id and m.site_id = v_site.id;
  end if;

  insert into public.site_clicks (
    owner_id, site_id, business_id, menu_item_id, visit_id,
    target, target_value, session_id, visitor_hash
  )
  values (
    v_site.owner_id, v_site.id, v_site.business_id, v_menu_item_id, p_visit_id,
    p_target, p_target_value, p_session_id, p_visitor_hash
  )
  returning id into v_click_id;

  return v_click_id;
end;
$$;

comment on function public.record_site_click is
  'Regista um clique numa landing page pública. Devolve null se a página não estiver acessível.';

-- Só estas duas funções ficam ao alcance de visitantes anónimos.
revoke all on function public.record_site_visit(
  text, text, text, text, text, text, text, text, text, text, text
) from public;
revoke all on function public.record_site_click(
  text, public.click_target, text, uuid, uuid, text, text
) from public;

grant execute on function public.record_site_visit(
  text, text, text, text, text, text, text, text, text, text, text
) to anon, authenticated;
grant execute on function public.record_site_click(
  text, public.click_target, text, uuid, uuid, text, text
) to anon, authenticated;
