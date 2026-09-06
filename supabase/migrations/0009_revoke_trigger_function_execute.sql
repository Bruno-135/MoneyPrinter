-- ============================================================================
-- 0009 — Retirar as funções de trigger da API pública
--
-- O Supabase expõe automaticamente as funções do schema `public` em
-- `/rest/v1/rpc/<nome>`. As funções de trigger não são para ser chamadas por
-- ninguém a não ser pelo motor de triggers, mas ficavam na mesma listadas e
-- invocáveis por `anon` e `authenticated`.
--
-- Na prática o Postgres recusa uma chamada direta a uma função de trigger
-- ("trigger functions can only be called as triggers"), portanto isto não é
-- uma falha explorável. Mas superfície de API que não serve para nada é
-- superfície a menos, e o linter de segurança do Supabase assinala-o — em
-- especial `log_deal_stage_change`, que é SECURITY DEFINER.
--
-- Detetado ao correr o linter contra o projeto real depois da etapa 1.
--
-- As funções `record_site_visit` e `record_site_click` NÃO são tocadas: essas
-- são mesmo para serem chamadas por visitantes anónimos (ver 0008).
-- ============================================================================

revoke execute on function public.set_updated_at()            from public, anon, authenticated;
revoke execute on function public.enforce_menu_item_template() from public, anon, authenticated;
revoke execute on function public.sync_deal_stage_dates()      from public, anon, authenticated;
revoke execute on function public.log_deal_stage_change()      from public, anon, authenticated;

-- `current_owner_id()` e `is_region_search_stale()` são auxiliares usadas nas
-- políticas de RLS e no código do servidor; não há motivo para as expor a
-- visitantes anónimos.
revoke execute on function public.current_owner_id()                     from anon;
revoke execute on function public.is_region_search_stale(uuid, integer)  from anon;
revoke execute on function public.generate_public_code(integer)          from anon, authenticated;
revoke execute on function public.is_site_live(uuid)                     from anon;
