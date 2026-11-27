-- STAGED PRODUCTION-ONLY COMMERCE MIGRATION: NOT APPROVED FOR APPLY OR DEPLOY.
-- Target only plhbvtbvtxfzulsaxuim, verified by release owner outside SQL.
-- Exact source QA schema/functions, plus independent pre/postflight, inactive products.
-- This changes no live Stripe, subscription or existing entitlement tables.
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
DO $nbjb_preflight$
BEGIN
 IF to_regclass('public.membership_entitlements') IS NULL OR to_regclass('public.product_entitlements') IS NULL OR to_regclass('auth.users') IS NULL OR to_regclass('storage.objects') IS NULL THEN RAISE EXCEPTION 'PRODUCTION_BASELINE_MISSING'; END IF;
 IF to_regclass('public.commerce_products') IS NOT NULL OR to_regclass('public.commerce_orders') IS NOT NULL OR EXISTS(SELECT 1 FROM storage.buckets WHERE id='nbjb-private-products') THEN RAISE EXCEPTION 'COMMERCE_ALREADY_INSTALLED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_entitlements' AND column_name='provider_entitlement_ref' AND data_type='text') THEN RAISE EXCEPTION 'ENTITLEMENT_BASELINE_CHANGED'; END IF;
END
$nbjb_preflight$;

-- Verified QA component 1: schema/accounting
-- STAGED MIGRATION BODY. Generate timestamped migration with CLI on isolated stack.
-- Do not apply to production. Sandbox orders must never share production DB.
create table public.commerce_products (
 slug text primary key, title text not null, amount integer not null check(amount>0),
 currency text not null default 'usd' check(currency='usd'),
 stripe_price_id text unique, stripe_product_id text, tax_code text,
 tax_behavior text check(tax_behavior in ('exclusive','inclusive')),
 asset_key text, asset_version text, download_name text,
 terms_version text, active boolean not null default false,
 check(not active or (stripe_price_id is not null and stripe_product_id is not null and tax_code is not null and tax_behavior is not null and asset_key is not null and asset_version is not null and download_name is not null and terms_version is not null))
);
insert into public.commerce_products(slug,title,amount) values
('boundary-builder-workbook','The Boundary Builder Workbook',1499),
('forge-workbook','The Forge Workbook',1999),
('30-days-through-the-fire','30 Days Through the Fire',2499),
('masculine-restoration-guide','Masculine Restoration Guide',2999),
('hawk-complete-toolkit','H.A.W.K. Complete Toolkit',4999);
create table public.commerce_orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete restrict,
 slug text not null references public.commerce_products(slug), amount integer not null check(amount>0),
 currency text not null check(currency='usd'), stripe_price_id text not null,
 stripe_session_id text unique, stripe_payment_intent_id text unique,
 status text not null default 'pending' check(status in ('pending','paid','expired','failed','refunded','disputed')),
 total_amount integer check(total_amount>=0), refunded_amount integer not null default 0 check(refunded_amount>=0),
 terms_version text not null, tax_behavior text not null check(tax_behavior in ('exclusive','inclusive')),
 asset_version text not null, asset_key text not null, download_name text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 paid_at timestamptz, review_required boolean not null default false
);
-- Paid or disputed purchases block another charge; refunded purchases may be bought again.
create unique index commerce_one_open_order on public.commerce_orders(user_id,slug) where status in ('pending','paid','disputed');
create table public.commerce_receipts(event_id text primary key, order_id uuid not null references public.commerce_orders(id), received_at timestamptz not null default now());
create table public.commerce_daily_metrics(day date not null, slug text not null references public.commerce_products(slug), metric text not null check(metric in ('checkout_requested','download_link_issued','product_view')), count bigint not null default 0, primary key(day,slug,metric));
alter table public.commerce_products enable row level security;
alter table public.commerce_orders enable row level security;
alter table public.commerce_receipts enable row level security;
alter table public.commerce_daily_metrics enable row level security;
revoke all on public.commerce_products,public.commerce_orders,public.commerce_receipts,public.commerce_daily_metrics from public,anon,authenticated;
grant select,insert,update,delete on public.commerce_products,public.commerce_orders,public.commerce_receipts,public.commerce_daily_metrics to service_role;
-- Only service-side signed URLs: restrictive defense in depth against future broad bucket policies.
insert into storage.buckets(id,name,public) values('nbjb-private-products','nbjb-private-products',false);
create policy commerce_no_client_assets on storage.objects as restrictive for all to anon,authenticated using(bucket_id <> 'nbjb-private-products') with check(bucket_id <> 'nbjb-private-products');
create function public.commerce_metric(p_slug text,p_metric text) returns void language sql security invoker set search_path='' as $$
 insert into public.commerce_daily_metrics(day,slug,metric,count) values((now() at time zone 'UTC')::date,p_slug,p_metric,1)
 on conflict(day,slug,metric) do update set count=commerce_daily_metrics.count+1;
$$;
create function public.commerce_reserve(p_user uuid,p_slug text,p_terms text) returns public.commerce_orders language plpgsql security invoker set search_path='' as $$
declare p public.commerce_products; o public.commerce_orders;
begin
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text||':'||p_slug,0));
 if exists(select 1 from public.product_entitlements where user_id=p_user and product_slug=p_slug and status='active' and (valid_until is null or valid_until>now())) then raise exception 'already_owned'; end if;
 select * into p from public.commerce_products where slug=p_slug and active and terms_version=p_terms;
 if not found then raise exception 'not_available'; end if;
 select * into o from public.commerce_orders where user_id=p_user and slug=p_slug and status in ('pending','paid','disputed');
 if found then
  if o.status<>'pending' then raise exception 'order_review'; end if;
  if o.terms_version<>p_terms then raise exception 'order_review'; end if;
  return o;
 end if;
 insert into public.commerce_orders(user_id,slug,amount,currency,stripe_price_id,terms_version,tax_behavior,asset_version,asset_key,download_name)
 values(p_user,p_slug,p.amount,p.currency,p.stripe_price_id,p.terms_version,p.tax_behavior,p.asset_version,p.asset_key,p.download_name) returning * into o;
 perform public.commerce_metric(p_slug,'checkout_requested');
 return o;
end $$;
-- Payment provider verification occurs upstream; this procedure trusts only service role.
-- Row lock, receipt dedup and entitlement update in the same transaction.
create function public.commerce_reconcile(p_order uuid,p_event text,p_session text,p_intent text,p_state text,p_total integer,p_refunded integer) returns void language plpgsql security invoker set search_path='' as $$
declare o public.commerce_orders;
begin
 if p_state not in ('pending','paid','expired','failed','refunded','disputed') then raise exception 'invalid_state'; end if;
 select * into o from public.commerce_orders where id=p_order for update;
 if not found then raise exception 'unknown_order'; end if;
 if p_session is null or (o.stripe_session_id is not null and o.stripe_session_id<>p_session) or (o.stripe_payment_intent_id is not null and o.stripe_payment_intent_id is distinct from p_intent) then raise exception 'provider_mismatch'; end if;
 if p_state in ('paid','refunded','disputed') and (p_intent is null or p_total is null or p_total<o.amount or p_refunded<0 or p_refunded>p_total) then raise exception 'invalid_payment'; end if;
 insert into public.commerce_receipts(event_id,order_id) values(p_event,o.id) on conflict do nothing;
 if not found then return; end if;
 -- Replays/stale events cannot reverse refunds or disputes. Dispute recovery is manual review.
 if o.status='refunded' or (o.status='disputed' and p_state<>'refunded') then return; end if;
 if o.status in ('expired','failed') and p_state in ('paid','refunded','disputed') then
  update public.commerce_orders set review_required=true,updated_at=now() where id=o.id; return;
 end if;
 if o.status='paid' and p_state not in ('paid','refunded','disputed') then return; end if;
 if o.status in ('expired','failed') then return; end if;
 update public.commerce_orders set stripe_session_id=p_session,stripe_payment_intent_id=coalesce(p_intent,stripe_payment_intent_id),
 status=p_state,total_amount=coalesce(p_total,total_amount),refunded_amount=greatest(refunded_amount,coalesce(p_refunded,0)),
 paid_at=case when p_state in ('paid','refunded','disputed') then coalesce(paid_at,now()) else paid_at end,
 review_required=review_required or p_state='disputed' or (coalesce(p_refunded,0)>0 and p_state='paid'),updated_at=now() where id=o.id;
 if p_state='paid' then
  insert into public.product_entitlements(user_id,product_slug,status,source,provider,provider_entitlement_ref,valid_until)
  values(o.user_id,o.slug,'active','stripe_commerce','stripe',o.id::text,null)
  on conflict(user_id,product_slug) do update set status='active',source='stripe_commerce',provider='stripe',provider_entitlement_ref=o.id::text,valid_until=null,granted_at=now(),updated_at=now()
  where (product_entitlements.status in ('expired','refunded','revoked') and product_entitlements.provider_entitlement_ref is distinct from o.id::text) or (product_entitlements.status='active' and product_entitlements.provider_entitlement_ref=o.id::text);
 elsif p_state in ('refunded','disputed') then
  update public.product_entitlements set status=case when p_state='refunded' then 'refunded' else 'revoked' end,updated_at=now()
  where user_id=o.user_id and product_slug=o.slug and source='stripe_commerce' and provider_entitlement_ref=o.id::text;
 end if;
end $$;
revoke execute on function public.commerce_metric(text,text),public.commerce_reserve(uuid,text,text),public.commerce_reconcile(uuid,text,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.commerce_metric(text,text),public.commerce_reserve(uuid,text,text),public.commerce_reconcile(uuid,text,text,text,text,integer,integer) to service_role;


-- Verified QA component 2: refund/operations
-- Phase Three staged operational controls. Apply AFTER migration.sql in QA only.
create table public.commerce_ops_audit (
 operation_id uuid primary key, order_id uuid references public.commerce_orders(id),
 action text not null check(action in ('recover_payment','restore_dispute','mark_review','record_duplicate','resolve_refund','replace_asset','request_erasure','cancel_erasure')),
 reason_code text not null check(reason_code ~ '^[a-z0-9_]{3,64}$'),
 operator_alias text not null check(operator_alias ~ '^[a-zA-Z0-9_-]{3,32}$'),
 ticket_ref uuid not null, slug text references public.commerce_products(slug),
 created_at timestamptz not null default now()
);
create table public.commerce_account_holds (
 user_id uuid primary key references auth.users(id) on delete cascade,
 requested_at timestamptz not null default now(), ticket_ref uuid not null
);
create table public.commerce_asset_replacements (
 slug text not null references public.commerce_products(slug),
 original_version text not null, original_asset_key text not null,
 asset_version text not null, asset_key text not null, download_name text not null,
 operation_id uuid not null references public.commerce_ops_audit(operation_id),
 primary key(slug,original_version,original_asset_key),
 check(asset_version<>original_version), check(asset_key<>original_asset_key),
 check(asset_key ~ '^[a-z0-9-]+/[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+[.](pdf|zip)$' and
  asset_key not like '%..%' and asset_key like slug||'/'||asset_version||'/%'),
 check(download_name ~ '^[a-zA-Z0-9._-]+[.](pdf|zip)$' and download_name not like '%..%')
);
alter table public.commerce_ops_audit enable row level security;
alter table public.commerce_account_holds enable row level security;
alter table public.commerce_asset_replacements enable row level security;
revoke all on public.commerce_ops_audit,public.commerce_account_holds,public.commerce_asset_replacements from public,anon,authenticated,service_role;
grant select,insert on public.commerce_ops_audit to service_role;
grant select,insert,delete on public.commerce_account_holds to service_role;
grant select,insert,update on public.commerce_asset_replacements to service_role;
-- Order creation must respect pending account deletion, including retries.
create or replace function public.commerce_reserve(p_user uuid,p_slug text,p_terms text) returns public.commerce_orders language plpgsql security invoker set search_path='' as $$
declare p public.commerce_products; o public.commerce_orders;
begin
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended('commerce-account:'||p_user::text,0));
 if exists(select 1 from public.commerce_account_holds where user_id=p_user) then raise exception 'account_review'; end if;
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text||':'||p_slug,0));
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
end $$;
-- No direct deletion. Preserve records, freeze new reservations, and surface blockers.
create function public.commerce_erasure_preflight(p_user uuid) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object(
 'held',exists(select 1 from public.commerce_account_holds where user_id=p_user),
 'pending',count(*) filter(where status='pending'),
 'paid',count(*) filter(where status='paid'),
 'disputed',count(*) filter(where status='disputed'),
 'review',count(*) filter(where review_required),
 'retained_orders',count(*),
 'active_product_rights',(select count(*) from public.product_entitlements where user_id=p_user and status='active' and (valid_until is null or valid_until>now())),
 'deletion_authorized',false) from public.commerce_orders where user_id=p_user;
$$;
create function public.commerce_erasure_hold(p_user uuid,p_hold boolean,p_operation uuid,p_ticket uuid,p_operator text) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended('commerce-account:'||p_user::text,0));
 insert into public.commerce_ops_audit(operation_id,action,reason_code,operator_alias,ticket_ref)
 values(p_operation,case when p_hold then 'request_erasure' else 'cancel_erasure' end,'verified_support_request',p_operator,p_ticket);
 if p_hold then insert into public.commerce_account_holds(user_id,ticket_ref) values(p_user,p_ticket) on conflict(user_id) do nothing;
 else delete from public.commerce_account_holds where user_id=p_user;end if;
 return public.commerce_erasure_preflight(p_user);
end $$;
-- Manual recovery is only callable by service_role; the separate tool re-fetches Stripe.
-- Optimistic lock plus row and account locks protect against refund/dispute races.
create function public.commerce_ops_recover(p_order uuid,p_expected_updated timestamptz,p_session text,p_intent text,p_total integer,p_refunded integer,p_restore_won boolean,p_operation uuid,p_ticket uuid,p_operator text) returns text language plpgsql security invoker set search_path='' as $$
declare o public.commerce_orders; e public.product_entitlements;
begin
 select * into o from public.commerce_orders where id=p_order;
 if not found then raise exception 'unknown_order';end if;
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended('commerce-account:'||o.user_id::text,0));
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended(o.user_id::text||':'||o.slug,0));
 select * into o from public.commerce_orders where id=p_order for update;
 if o.updated_at<>p_expected_updated then raise exception 'provider_snapshot_stale';end if;
 if exists(select 1 from public.commerce_account_holds where user_id=o.user_id) then raise exception 'account_review';end if;
 if p_total is null or p_total<o.amount or p_refunded is null or p_refunded<0 or p_refunded>=p_total or p_session is null or p_intent is null or
 (o.stripe_session_id is not null and o.stripe_session_id<>p_session) or (o.stripe_payment_intent_id is not null and o.stripe_payment_intent_id<>p_intent) or
 (o.total_amount is not null and o.total_amount<>p_total and o.status in ('paid','disputed')) or o.refunded_amount>p_refunded then raise exception 'payment_snapshot_mismatch';end if;
 if o.status='refunded' or (o.status='disputed' and not p_restore_won) or (p_restore_won and o.status<>'disputed') then raise exception 'recovery_not_permitted';end if;
 if exists(select 1 from public.commerce_orders where user_id=o.user_id and slug=o.slug and id<>o.id and status in ('pending','paid','disputed')) then raise exception 'competing_order_review';end if;
 select * into e from public.product_entitlements where user_id=o.user_id and product_slug=o.slug for update;
 if found and ((e.status='active' and e.provider_entitlement_ref is distinct from o.id::text) or
 (e.provider_entitlement_ref=o.id::text and e.status<>'active' and not (p_restore_won and e.status='revoked' and e.source='stripe_commerce'))) then raise exception 'existing_entitlement_review';end if;
 insert into public.commerce_ops_audit(operation_id,order_id,action,reason_code,operator_alias,ticket_ref,slug)
 values(p_operation,o.id,case when p_restore_won then 'restore_dispute' else 'recover_payment' end,'provider_verified',p_operator,p_ticket,o.slug);
 update public.commerce_orders set stripe_session_id=p_session,stripe_payment_intent_id=p_intent,status='paid',total_amount=p_total,refunded_amount=p_refunded,
 paid_at=coalesce(paid_at,now()),review_required=(p_refunded>0),updated_at=clock_timestamp() where id=o.id;
 insert into public.product_entitlements(user_id,product_slug,status,source,provider,provider_entitlement_ref,valid_until)
 values(o.user_id,o.slug,'active','stripe_commerce','stripe',o.id::text,null)
 on conflict(user_id,product_slug) do update set status='active',source='stripe_commerce',provider='stripe',provider_entitlement_ref=o.id::text,valid_until=null,granted_at=now(),updated_at=now()
 where (product_entitlements.status='active' and product_entitlements.provider_entitlement_ref=o.id::text) or (product_entitlements.status<>'active' and product_entitlements.provider_entitlement_ref is distinct from o.id::text) or (p_restore_won and product_entitlements.status='revoked' and product_entitlements.source='stripe_commerce' and product_entitlements.provider_entitlement_ref=o.id::text);
 if not found then raise exception 'entitlement_race';end if;
 return 'recovered';
end $$;
create function public.commerce_mark_review(p_order uuid,p_operation uuid,p_ticket uuid,p_operator text,p_duplicate boolean) returns void language plpgsql security invoker set search_path='' as $$
begin
 insert into public.commerce_ops_audit(operation_id,order_id,action,reason_code,operator_alias,ticket_ref,slug)
 select p_operation,id,case when p_duplicate then 'record_duplicate' else 'mark_review' end,'provider_review',p_operator,p_ticket,slug from public.commerce_orders where id=p_order;
 if not found then raise exception 'unknown_order';end if;
 update public.commerce_orders set review_required=true,updated_at=clock_timestamp() where id=p_order;
end $$;
-- Replacement corrects delivery while preserving the historical order's original asset snapshot.
create function public.commerce_replace_asset(p_slug text,p_old_version text,p_old_key text,p_new_version text,p_new_key text,p_name text,p_operation uuid,p_ticket uuid,p_operator text) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended('commerce-asset:'||p_slug,0));
 if not exists(select 1 from public.commerce_orders where slug=p_slug and asset_version=p_old_version and asset_key=p_old_key) then raise exception 'no_order_asset';end if;
 insert into public.commerce_ops_audit(operation_id,action,reason_code,operator_alias,ticket_ref,slug)
 values(p_operation,'replace_asset','approved_correction',p_operator,p_ticket,p_slug);
 insert into public.commerce_asset_replacements(slug,original_version,original_asset_key,asset_version,asset_key,download_name,operation_id)
 values(p_slug,p_old_version,p_old_key,p_new_version,p_new_key,p_name,p_operation);
end $$;
revoke execute on function public.commerce_erasure_preflight(uuid),public.commerce_erasure_hold(uuid,boolean,uuid,uuid,text),public.commerce_ops_recover(uuid,timestamptz,text,text,integer,integer,boolean,uuid,uuid,text),public.commerce_mark_review(uuid,uuid,uuid,text,boolean),public.commerce_replace_asset(text,text,text,text,text,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.commerce_erasure_preflight(uuid),public.commerce_erasure_hold(uuid,boolean,uuid,uuid,text),public.commerce_ops_recover(uuid,timestamptz,text,text,integer,integer,boolean,uuid,uuid,text),public.commerce_mark_review(uuid,uuid,uuid,text,boolean),public.commerce_replace_asset(text,text,text,text,text,text,uuid,uuid,text) to service_role;
-- Provider-refund records are financial observations, not customer analytics.
create table public.commerce_refund_observations(
 refund_ref text primary key check(refund_ref ~ '^re_[A-Za-z0-9_]+$'),
 order_id uuid not null references public.commerce_orders(id),
 amount integer not null check(amount>0),
 status text not null check(status in ('pending','requires_action','succeeded','failed','canceled')),
 provider_created_at timestamptz not null,
 succeeded_observed_at timestamptz,
 observed_at timestamptz not null default now()
);
alter table public.commerce_refund_observations enable row level security;
revoke all on public.commerce_refund_observations from public,anon,authenticated,service_role;
grant select,insert,update on public.commerce_refund_observations to service_role;
create function public.commerce_record_refunds(p_order uuid,p_session text,p_intent text,p_data jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare o public.commerce_orders; f jsonb; a integer; st text; rid text; stamp timestamptz;
begin
 select * into o from public.commerce_orders where id=p_order for update;
 if not found or o.stripe_session_id is distinct from p_session or o.stripe_payment_intent_id is distinct from p_intent then raise exception 'refund_order_mismatch';end if;
 if jsonb_typeof(p_data)<>'array' or jsonb_array_length(p_data)>100 then raise exception 'refund_snapshot_invalid';end if;
 for f in select value from jsonb_array_elements(p_data) loop
  rid:=f->>'id';a:=(f->>'amount')::integer;st:=f->>'status';stamp:=to_timestamp((f->>'created')::double precision);
  if f->>'currency' is distinct from o.currency or a<=0 or a>coalesce(o.total_amount,0) then raise exception 'refund_amount_mismatch';end if;
  insert into public.commerce_refund_observations(refund_ref,order_id,amount,status,provider_created_at,succeeded_observed_at)
  values(rid,o.id,a,st,stamp,case when st='succeeded' then now() end)
  on conflict(refund_ref) do update set status=case when commerce_refund_observations.status in ('succeeded','failed','canceled') then commerce_refund_observations.status else excluded.status end,
  succeeded_observed_at=coalesce(commerce_refund_observations.succeeded_observed_at,excluded.succeeded_observed_at),observed_at=now()
  where commerce_refund_observations.order_id=o.id and commerce_refund_observations.amount=a;
  if not found then raise exception 'refund_reference_conflict';end if;
 end loop;
end $$;
revoke execute on function public.commerce_record_refunds(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.commerce_record_refunds(uuid,text,text,jsonb) to service_role;
-- Record a confirmed full refund even when a late successful payment hit an expired local order.
-- No Stripe money movement. Only an exact provider-verified full refund may close the record.
create function public.commerce_ops_close_refund(p_order uuid,p_expected_updated timestamptz,p_session text,p_intent text,p_total integer,p_refunded integer,p_operation uuid,p_ticket uuid,p_operator text) returns void language plpgsql security invoker set search_path='' as $$
declare o public.commerce_orders;
begin
 select * into o from public.commerce_orders where id=p_order for update;
 if not found or o.updated_at<>p_expected_updated then raise exception 'provider_snapshot_stale';end if;
 if p_total is null or p_total<o.amount or p_refunded is distinct from p_total or p_session is null or p_intent is null or
 (o.stripe_session_id is not null and o.stripe_session_id<>p_session) or (o.stripe_payment_intent_id is not null and o.stripe_payment_intent_id<>p_intent) or
 (o.total_amount is not null and o.status in ('paid','disputed','refunded') and o.total_amount<>p_total) then raise exception 'refund_snapshot_mismatch';end if;
 insert into public.commerce_ops_audit(operation_id,order_id,action,reason_code,operator_alias,ticket_ref,slug)
 values(p_operation,o.id,'resolve_refund','provider_verified',p_operator,p_ticket,o.slug);
 update public.commerce_orders set stripe_session_id=p_session,stripe_payment_intent_id=p_intent,status='refunded',total_amount=p_total,
 refunded_amount=p_refunded,paid_at=coalesce(paid_at,now()),review_required=false,updated_at=clock_timestamp() where id=o.id;
 update public.product_entitlements set status='refunded',updated_at=now() where user_id=o.user_id and product_slug=o.slug and source='stripe_commerce' and provider_entitlement_ref=o.id::text;
end $$;
revoke execute on function public.commerce_ops_close_refund(uuid,timestamptz,text,text,integer,integer,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.commerce_ops_close_refund(uuid,timestamptz,text,text,integer,integer,uuid,uuid,text) to service_role;


-- Verified QA component 3: immutable asset corrections

-- Phase Four: staged only. Apply after operations.sql in isolated QA.
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


DO $nbjb_postflight$
BEGIN
 IF (SELECT count(*) FROM public.commerce_products)<>5 OR (SELECT count(*) FROM public.commerce_products WHERE active)<>0 OR (SELECT public FROM storage.buckets WHERE id='nbjb-private-products') IS DISTINCT FROM false THEN RAISE EXCEPTION 'COMMERCE_POSTFLIGHT_UNEXPECTED_ACTIVE_CONFIG'; END IF;
END
$nbjb_postflight$;
commit;
