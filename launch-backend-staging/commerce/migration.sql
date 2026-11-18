-- STAGED MIGRATION BODY. Generate timestamped migration with CLI on isolated stack.
-- Do not apply to production. Sandbox orders must never share production DB.
begin;
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
  where product_entitlements.status in ('expired','refunded','revoked') or product_entitlements.provider_entitlement_ref=o.id::text;
 elsif p_state in ('refunded','disputed') then
  update public.product_entitlements set status=case when p_state='refunded' then 'refunded' else 'revoked' end,updated_at=now()
  where user_id=o.user_id and product_slug=o.slug and source='stripe_commerce' and provider_entitlement_ref=o.id::text;
 end if;
end $$;
revoke execute on function public.commerce_metric(text,text),public.commerce_reserve(uuid,text,text),public.commerce_reconcile(uuid,text,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.commerce_metric(text,text),public.commerce_reserve(uuid,text,text),public.commerce_reconcile(uuid,text,text,text,text,integer,integer) to service_role;
commit;
