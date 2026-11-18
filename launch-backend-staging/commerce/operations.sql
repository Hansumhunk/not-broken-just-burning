-- Phase Three staged operational controls. Apply AFTER migration.sql in QA only.
begin;
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
 refund_ref text primary key check(refund_ref ~ '^re_[A-Za-z0-9_]+),
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
commit;
