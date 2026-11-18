
-- Phase Four: staged only. Apply after operations.sql in isolated QA.
begin;
-- Chain immutable corrections, no branching or cycles. Preserve original purchase version.
revoke update on public.commerce_asset_replacements from service_role;
create function public.commerce_resolve_asset(p_slug text,p_version text,p_key text,p_name text)
returns table(asset_version text,asset_key text,download_name text) language plpgsql security invoker set search_path='' as $q$
declare v text:=p_version; k text:=p_key; n text:=p_name; edge public.commerce_asset_replacements; visited text[]:=array[p_key]; i integer;
begin
 for i in 1..32 loop
  select * into edge from public.commerce_asset_replacements x where x.slug=p_slug and x.original_version=v and x.original_asset_key=k;
  if not found then return query select v,k,n;return;end if;
  if edge.asset_key=any(visited) then raise exception 'asset_cycle';end if;
  v:=edge.asset_version;k:=edge.asset_key;n:=edge.download_name;visited:=array_append(visited,k);
 end loop;
 raise exception 'asset_chain_limit';
end $q$;
create or replace function public.commerce_replace_asset(p_slug text,p_old_version text,p_old_key text,p_new_version text,p_new_key text,p_name text,p_operation uuid,p_ticket uuid,p_operator text) returns void language plpgsql security invoker set search_path='' as $q$
declare destination record;
begin
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended('commerce-asset:'||p_slug,0));
 if not exists(select 1 from public.commerce_orders where slug=p_slug and asset_version=p_old_version and asset_key=p_old_key)
 and not exists(select 1 from public.commerce_asset_replacements where slug=p_slug and asset_version=p_old_version and asset_key=p_old_key) then raise exception 'no_order_asset';end if;
 if p_old_key=p_new_key or p_old_version=p_new_version or exists(select 1 from public.commerce_asset_replacements where slug=p_slug and original_asset_key=p_new_key) then raise exception 'asset_cycle_or_nonterminal_destination';end if;
 if exists(select 1 from public.commerce_asset_replacements where slug=p_slug and original_version=p_old_version and original_asset_key=p_old_key) then raise exception 'asset_already_replaced';end if;
 insert into public.commerce_ops_audit(operation_id,action,reason_code,operator_alias,ticket_ref,slug)
 values(p_operation,'replace_asset','approved_correction',p_operator,p_ticket,p_slug);
 insert into public.commerce_asset_replacements(slug,original_version,original_asset_key,asset_version,asset_key,download_name,operation_id)
 values(p_slug,p_old_version,p_old_key,p_new_version,p_new_key,p_name,p_operation);
 -- Check every existing ancestor order so no correction can exceed the depth limit.
 for destination in select distinct asset_version,asset_key,download_name from public.commerce_orders where slug=p_slug loop
  perform * from public.commerce_resolve_asset(p_slug,destination.asset_version,destination.asset_key,destination.download_name);
 end loop;
end $q$;
-- Verified additional payment observations. Not grants, not financial transactions.
create table public.commerce_payment_exceptions(
 session_ref text primary key, order_id uuid not null references public.commerce_orders(id),
 intent_ref text not null unique, gross_cents integer not null check(gross_cents>0),
 refunded_cents integer not null check(refunded_cents between 0 and gross_cents),
 state text not null check(state in ('paid','refunded','disputed')), pending_refund boolean not null,
 observed_at timestamptz not null default now()
);
alter table public.commerce_payment_exceptions enable row level security;
revoke all on public.commerce_payment_exceptions from public,anon,authenticated,service_role;
grant select,insert,update on public.commerce_payment_exceptions to service_role;
create function public.commerce_record_exception(p_order uuid,p_session text,p_intent text,p_gross integer,p_refunded integer,p_state text,p_pending boolean) returns void language plpgsql security invoker set search_path='' as $q$
declare o public.commerce_orders;
begin
 select * into o from public.commerce_orders where id=p_order;
 if not found then raise exception 'unknown_order';end if;
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended('commerce-account:'||o.user_id::text,0));
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended(o.user_id::text||':'||o.slug,0));
 select * into o from public.commerce_orders where id=p_order for update;
 if not found or p_session is null or p_intent is null or p_gross<o.amount or p_refunded is null or p_pending is null then raise exception 'exception_snapshot_invalid';end if;
 if p_session=o.stripe_session_id or p_intent=o.stripe_payment_intent_id or exists(select 1 from public.commerce_orders where id<>p_order and (stripe_session_id=p_session or stripe_payment_intent_id=p_intent)) then raise exception 'exception_canonical_conflict';end if;
 if p_state='refunded' and p_refunded<>p_gross then raise exception 'exception_refund_invalid';end if;
 insert into public.commerce_payment_exceptions(session_ref,order_id,intent_ref,gross_cents,refunded_cents,state,pending_refund)
 values(p_session,p_order,p_intent,p_gross,p_refunded,p_state,p_pending)
 on conflict(session_ref) do update set refunded_cents=greatest(commerce_payment_exceptions.refunded_cents,excluded.refunded_cents),
 state=case when commerce_payment_exceptions.state='refunded' then 'refunded' else excluded.state end,
 pending_refund=excluded.pending_refund,observed_at=clock_timestamp()
 where commerce_payment_exceptions.order_id=p_order and commerce_payment_exceptions.intent_ref=p_intent and commerce_payment_exceptions.gross_cents=p_gross;
 if not found then raise exception 'exception_reference_conflict';end if;
 update public.commerce_orders set review_required=true,updated_at=clock_timestamp() where id=p_order;
end $q$;
-- Refuse to open another purchase while an unresolved provider exception remains.
create function public.commerce_exception_guard() returns trigger language plpgsql security invoker set search_path='' as $q$
begin
 if exists(select 1 from public.commerce_payment_exceptions x join public.commerce_orders o on o.id=x.order_id where o.user_id=new.user_id and o.slug=new.slug and (x.state<>'refunded' or x.pending_refund)) then raise exception 'payment_exception_review';end if;
 return new;
end $q$;
create trigger commerce_exception_reservation_guard before insert on public.commerce_orders for each row execute function public.commerce_exception_guard();
revoke execute on function public.commerce_resolve_asset(text,text,text,text),public.commerce_record_exception(uuid,text,text,integer,integer,text,boolean),public.commerce_exception_guard() from public,anon,authenticated;
grant execute on function public.commerce_resolve_asset(text,text,text,text),public.commerce_record_exception(uuid,text,text,integer,integer,text,boolean),public.commerce_exception_guard() to service_role;
-- More precise deletion preflight: a review hold is not erasure permission.
create or replace function public.commerce_erasure_preflight(p_user uuid) returns jsonb language sql security invoker set search_path='' as $q$
 select jsonb_build_object(
 'held',exists(select 1 from public.commerce_account_holds where user_id=p_user),
 'pending',count(*) filter(where status='pending'),
 'paid',count(*) filter(where status='paid'),
 'disputed',count(*) filter(where status='disputed'),
 'review',count(*) filter(where review_required),
 'retained_orders',count(*),
 'unresolved_additional_payments',(select count(*) from public.commerce_payment_exceptions x join public.commerce_orders y on y.id=x.order_id where y.user_id=p_user and (x.state<>'refunded' or x.pending_refund)),
 'pending_refunds',(select count(*) from public.commerce_refund_observations r join public.commerce_orders y on y.id=r.order_id where y.user_id=p_user and r.status in ('pending','requires_action')),
 'active_product_rights',(select count(*) from public.product_entitlements where user_id=p_user and status='active' and (valid_until is null or valid_until>now())),
 'deletion_authorized',false) from public.commerce_orders where user_id=p_user;
$q$;
-- Before either reusing or inserting an order, ensure prior exceptions do not permit a second checkout.
create or replace function public.commerce_reserve(p_user uuid,p_slug text,p_terms text) returns public.commerce_orders language plpgsql security invoker set search_path='' as $q$
declare p public.commerce_products; o public.commerce_orders;
begin
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended('commerce-account:'||p_user::text,0));
 if exists(select 1 from public.commerce_account_holds where user_id=p_user) then raise exception 'account_review'; end if;
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text||':'||p_slug,0));
 if exists(select 1 from public.commerce_payment_exceptions x join public.commerce_orders y on y.id=x.order_id where y.user_id=p_user and y.slug=p_slug and (x.state<>'refunded' or x.pending_refund)) then raise exception 'payment_exception_review';end if;
 if exists(select 1 from public.product_entitlements where user_id=p_user and product_slug=p_slug and status='active' and (valid_until is null or valid_until>now())) then raise exception 'already_owned'; end if;
 select * into p from public.commerce_products where slug=p_slug and active and terms_version=p_terms;
 if not found then raise exception 'not_available'; end if;
 select * into o from public.commerce_orders where user_id=p_user and slug=p_slug and status in ('pending','paid','disputed');
 if found then
  if o.status<>'pending' or o.terms_version<>p_terms then raise exception 'order_review'; end if;
  return o;
 end if;
 insert into public.commerce_orders(user_id,slug,amount,currency,stripe_price_id,terms_version,tax_behavior,asset_version,asset_key,download_name)
 values(p_user,p_slug,p.amount,p.currency,p.stripe_price_id,p.terms_version,p.tax_behavior,p.asset_version,p.asset_key,p.download_name) returning * into o;
 perform public.commerce_metric(p_slug,'checkout_requested');
 return o;
end $q$;
commit;
