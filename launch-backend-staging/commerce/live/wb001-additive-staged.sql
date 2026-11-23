-- WB-001 ADDITIVE SCHEMA CANDIDATE. QA / disposable Postgres only. DO NOT APPLY TO PRODUCTION.
-- Depends on existing commerce staging schema; preserves existing recurring membership and commerce_orders.
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
alter table public.commerce_products add column if not exists member_amount integer check (member_amount > 0);
alter table public.commerce_products add column if not exists member_stripe_price_id text unique;
insert into public.commerce_products(slug,title,amount,currency,active)
values ('from-chaos-to-clarity','From Chaos to Clarity — The Flamewalker Workbook',1799,'usd',false)
on conflict (slug) do nothing;
-- Isolated purchase ledger under the SAME existing commerce backend and merchant, not a second store.
-- Ownership for signed-in buyers is also reflected in existing product_entitlements.
-- Guests receive strictly bearer-authorized ownership after verified payment + inbox delivery.
create table public.commerce_direct_orders (
 id uuid primary key default gen_random_uuid(),
 slug text not null references public.commerce_products(slug),
 buyer_kind text not null check(buyer_kind in ('guest','member')),
 user_id uuid references auth.users(id) on delete restrict,
 guest_email text,
 price_tier text not null check(price_tier in ('retail','member')),
 amount integer not null check(amount in (1799,999)),
 currency text not null default 'usd' check(currency='usd'),
 stripe_price_id text not null,
 stripe_session_id text unique,
 stripe_payment_intent_id text unique,
 status text not null default 'pending' check(status in ('pending','paid','expired','failed','refunded','disputed')),
 total_amount integer check(total_amount >= 0),
 refunded_amount integer not null default 0 check(refunded_amount >= 0),
 tax_behavior text not null check(tax_behavior in ('inclusive','exclusive')),
 terms_version text not null,
 asset_version text not null,
 asset_key text not null,
 download_name text not null,
 claim_nonce uuid not null default gen_random_uuid(),
 claim_expires_at timestamptz,
 receipt_sent_at timestamptz,
 review_required boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 paid_at timestamptz,
 check((buyer_kind='member' and user_id is not null and guest_email is null)
    or (buyer_kind='guest' and user_id is null and guest_email is not null and length(guest_email) between 5 and 254)),
 check((buyer_kind='guest' and price_tier='retail' and amount=1799)
    or (buyer_kind='member' and ((price_tier='retail' and amount=1799) or (price_tier='member' and amount=999)))),
 check(slug='from-chaos-to-clarity' and asset_key='from-chaos-to-clarity/v1.0/NBJB-WB-001_v1.0_customer.zip')
);
create unique index commerce_direct_member_open on public.commerce_direct_orders(user_id,slug)
 where buyer_kind='member' and status in ('pending','paid','disputed');
create unique index commerce_direct_guest_open on public.commerce_direct_orders(lower(guest_email),slug)
 where buyer_kind='guest' and status in ('pending','paid','disputed');
create table public.commerce_direct_receipts (
 event_id text primary key,
 order_id uuid not null references public.commerce_direct_orders(id),
 received_at timestamptz not null default now()
);
-- Durable retry marker; avoid dropping entitlement just because email delivery temporarily fails.
create table public.commerce_direct_outbox (
 order_id uuid primary key references public.commerce_direct_orders(id),
 status text not null default 'pending' check(status in ('pending','sent','hold')),
 attempts integer not null default 0 check(attempts>=0),
 last_attempt_at timestamptz,
 sent_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.commerce_direct_orders enable row level security;
alter table public.commerce_direct_receipts enable row level security;
alter table public.commerce_direct_outbox enable row level security;
revoke all on public.commerce_direct_orders,public.commerce_direct_receipts,public.commerce_direct_outbox from public,anon,authenticated,service_role;
grant select,insert,update on public.commerce_direct_orders,public.commerce_direct_receipts,public.commerce_direct_outbox to service_role;
-- Server-only reservation locks unique ownership. Caller must verify user JWT or guest abuse-gate.
create function public.commerce_direct_reserve(p_slug text,p_user uuid,p_guest_email text,p_terms text)
returns public.commerce_direct_orders language plpgsql security invoker set search_path='' as $q$
declare p public.commerce_products; o public.commerce_direct_orders; eligible boolean:=false;
    kind text; tier text; due integer; price text; buyerkey text;
begin
 if p_slug <> 'from-chaos-to-clarity' then raise exception 'unknown_direct_sku'; end if;
 if (p_user is null) = (p_guest_email is null) then raise exception 'invalid_buyer'; end if;
 kind:=case when p_user is null then 'guest' else 'member' end;
 if kind='guest' and (length(p_guest_email) > 254 or p_guest_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  or p_guest_email <> lower(trim(p_guest_email))) then raise exception 'invalid_guest_email'; end if;
 buyerkey:=case when p_user is null then lower(p_guest_email) else p_user::text end;
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended('direct:'||p_slug||':'||kind||':'||buyerkey,0));
 select * into p from public.commerce_products
  where slug=p_slug and active=true and terms_version=p_terms and amount=1799
  and member_amount=999 and member_stripe_price_id is not null;
 if not found then raise exception 'not_available'; end if;
 if p_user is not null then
  if exists(select 1 from public.product_entitlements where user_id=p_user and product_slug=p_slug and status='active') then raise exception 'already_owned'; end if;
  select exists(select 1 from public.membership_entitlements m where m.user_id=p_user
    and m.tier='paid' and m.status='active' and m.source='stripe_subscription' and m.provider='stripe'
    and m.provider_subscription_ref like 'sub_%'
    and m.valid_from<=now() and m.valid_until>now()) into eligible;
 end if;
 tier:=case when eligible then 'member' else 'retail' end;
 due:=case when eligible then 999 else 1799 end;
 price:=case when eligible then p.member_stripe_price_id else p.stripe_price_id end;
 select * into o from public.commerce_direct_orders where slug=p_slug and buyer_kind=kind
  and ((kind='guest' and guest_email=p_guest_email) or (kind='member' and user_id=p_user))
  and status in ('pending','paid','disputed') for update;
 if found then
  if o.status<>'pending' or o.amount<>due or o.stripe_price_id<>price or o.terms_version<>p_terms
   then raise exception 'order_review';end if;
  return o;
 end if;
 insert into public.commerce_direct_orders(slug,buyer_kind,user_id,guest_email,price_tier,amount,currency,
  stripe_price_id,tax_behavior,terms_version,asset_version,asset_key,download_name)
 values(p_slug,kind,p_user,p_guest_email,tier,due,'usd',price,p.tax_behavior,p_terms,p.asset_version,p.asset_key,p.download_name)
 returning * into o;
 return o;
end $q$;
-- Reconcile exactly once, only after signed Stripe event AND independent provider snapshot.
create function public.commerce_direct_reconcile(p_order uuid,p_event text,p_session text,p_intent text,
 p_state text,p_total integer,p_refunded integer,p_email text)
returns void language plpgsql security invoker set search_path='' as $q$
declare o public.commerce_direct_orders;
begin
 if p_state not in ('pending','paid','expired','failed','refunded','disputed') then raise exception 'invalid_state'; end if;
 select * into o from public.commerce_direct_orders where id=p_order for update;
 if not found then raise exception 'unknown_order'; end if;
 if p_session is null or (o.stripe_session_id is not null and p_session<>o.stripe_session_id)
  or (o.stripe_payment_intent_id is not null and p_intent is distinct from o.stripe_payment_intent_id)
  then raise exception 'provider_mismatch'; end if;
 if p_state in ('paid','refunded','disputed') and (p_intent is null or p_total is null or p_total<o.amount
   or p_refunded is null or p_refunded<0 or p_refunded>p_total) then raise exception 'invalid_payment';end if;
 insert into public.commerce_direct_receipts(event_id,order_id) values(p_event,o.id) on conflict do nothing;
 if not found then return;end if;
 if o.status='refunded' or (o.status='disputed' and p_state<>'refunded') then return;end if;
 if o.status in ('failed','expired') and p_state in ('paid','disputed','refunded') then
  update public.commerce_direct_orders set review_required=true,updated_at=now() where id=o.id;return;end if;
 if o.status='paid' and p_state not in ('paid','refunded','disputed') then return;end if;
 if o.status in ('failed','expired') then return;end if;
 update public.commerce_direct_orders set
  stripe_session_id=p_session,stripe_payment_intent_id=coalesce(p_intent,stripe_payment_intent_id),
  status=p_state,total_amount=coalesce(p_total,total_amount),refunded_amount=greatest(o.refunded_amount,coalesce(p_refunded,0)),
  paid_at=case when p_state in ('paid','refunded','disputed') then coalesce(paid_at,now()) else paid_at end,
  review_required=review_required or p_state='disputed' or (coalesce(p_refunded,0)>0 and p_state='paid')
   or (o.buyer_kind='guest' and p_state='paid' and (p_email is null or lower(trim(p_email))<>o.guest_email)),
  updated_at=now() where id=o.id;
 if p_state='paid' and o.buyer_kind='member' then
   insert into public.product_entitlements(user_id,product_slug,status,source,provider,provider_entitlement_ref,valid_until)
   values(o.user_id,o.slug,'active','stripe_commerce','stripe',o.id::text,null)
   on conflict(user_id,product_slug) do update set status='active',source='stripe_commerce',
   provider='stripe',provider_entitlement_ref=o.id::text,valid_until=null,updated_at=now()
   where product_entitlements.provider_entitlement_ref=o.id::text or product_entitlements.status in ('expired','refunded','revoked');
 elsif p_state='paid' and o.buyer_kind='guest' and p_email is not null and lower(trim(p_email))=o.guest_email then
   insert into public.commerce_direct_outbox(order_id) values(o.id) on conflict do nothing;
 elsif p_state in ('refunded','disputed') then
   update public.product_entitlements set status=case when p_state='refunded' then 'refunded' else 'revoked' end,updated_at=now()
   where user_id=o.user_id and product_slug=o.slug and provider_entitlement_ref=o.id::text;
   update public.commerce_direct_outbox set status='hold' where order_id=o.id and status='pending';
 end if;
end $q$;
-- Mark notification sent only after email provider confirms acceptance, never before.
create function public.commerce_direct_mark_receipt(p_order uuid)
returns void language plpgsql security invoker set search_path='' as $q$
declare o public.commerce_direct_orders;
begin
 select * into o from public.commerce_direct_orders where id=p_order for update;
 if not found or o.buyer_kind<>'guest' or o.status<>'paid' or o.review_required or o.refunded_amount>0 then
  raise exception 'receipt_not_permitted';end if;
 update public.commerce_direct_orders set receipt_sent_at=now(),claim_expires_at=now()+interval '30 days',updated_at=now()
 where id=p_order;
 update public.commerce_direct_outbox set status='sent',sent_at=now(),attempts=attempts+1,last_attempt_at=now()
 where order_id=p_order and status='pending';
 if not found then raise exception 'outbox_not_pending';end if;
end $q$;
revoke execute on function public.commerce_direct_reserve(text,uuid,text,text),
 public.commerce_direct_reconcile(uuid,text,text,text,text,integer,integer,text),
 public.commerce_direct_mark_receipt(uuid) from public,anon,authenticated;
grant execute on function public.commerce_direct_reserve(text,uuid,text,text),
 public.commerce_direct_reconcile(uuid,text,text,text,text,integer,integer,text),
 public.commerce_direct_mark_receipt(uuid) to service_role;
commit;
