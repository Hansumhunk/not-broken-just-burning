-- REVIEW ONLY. Additive Stage B delta; do not run on production without exact approval.
begin;
create or replace function public.commerce_reserve_canary(p_user uuid,p_slug text,p_terms text)
returns public.commerce_orders language plpgsql security invoker set search_path='' as $q$
begin
 if p_slug is distinct from 'boundary-builder-workbook' or p_terms is distinct from 'boundary-004c-v1.0' then raise exception 'not_available'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('commerce-account:'||p_user::text,0));
 if exists(select 1 from public.commerce_orders where user_id=p_user and slug=p_slug and status<>'pending') then raise exception 'canary_consumed'; end if;
 return public.commerce_reserve(p_user,p_slug,p_terms);
end $q$;
revoke all on function public.commerce_reserve_canary(uuid,text,text) from public,anon,authenticated;
grant execute on function public.commerce_reserve_canary(uuid,text,text) to service_role;
commit;
