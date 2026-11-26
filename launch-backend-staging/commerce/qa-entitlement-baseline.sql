-- QA ONLY: minimal entitlement baseline for a brand-new empty isolated Supabase project.
-- No production data, real identities, membership billing, lessons or user reflections.
-- Auth and storage schemas are supplied by actual Supabase; never run over existing tables.
begin;
create table public.membership_entitlements(
 user_id uuid primary key references auth.users(id) on delete cascade,
 tier text not null default 'free_member' check(tier in ('free_member','paid_member')),
 status text not null default 'active' check(status in ('active','trialing','past_due','canceled','expired','revoked')),
 source text not null default 'account_default' check(char_length(source) between 1 and 80),
 provider text check(char_length(provider)<=80),
 provider_customer_ref text check(char_length(provider_customer_ref)<=200),
 provider_subscription_ref text check(char_length(provider_subscription_ref)<=200),
 valid_from timestamptz not null default now(),valid_until timestamptz,
 cancel_at_period_end boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(valid_until is null or valid_until>=valid_from)
);
create table public.product_entitlements(
 user_id uuid references auth.users(id) on delete cascade,
 product_slug text not null check(char_length(product_slug) between 1 and 160),
 status text not null default 'active' check(status in ('active','expired','revoked','refunded')),
 source text not null default 'manual' check(char_length(source) between 1 and 80),
 provider text check(char_length(provider)<=80),
 provider_entitlement_ref text check(char_length(provider_entitlement_ref)<=200),
 granted_at timestamptz not null default now(),valid_until timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(user_id,product_slug),check(valid_until is null or valid_until>=granted_at)
);
create table public.event_entitlements(
 user_id uuid references auth.users(id) on delete cascade,
 event_slug text not null check(char_length(event_slug) between 1 and 160),
 status text not null default 'active' check(status in ('active','expired','revoked','refunded')),
 source text not null default 'manual' check(char_length(source) between 1 and 80),
 provider text check(char_length(provider)<=80),
 provider_entitlement_ref text check(char_length(provider_entitlement_ref)<=200),
 granted_at timestamptz not null default now(),valid_until timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(user_id,event_slug),check(valid_until is null or valid_until>=granted_at)
);
alter table public.membership_entitlements enable row level security;
alter table public.product_entitlements enable row level security;
alter table public.event_entitlements enable row level security;
revoke all on public.membership_entitlements,public.product_entitlements,public.event_entitlements from public,anon,authenticated;
grant select on public.membership_entitlements,public.product_entitlements,public.event_entitlements to authenticated;
grant select,insert,update,delete on public.membership_entitlements,public.product_entitlements,public.event_entitlements to service_role;
create policy qa_own_membership on public.membership_entitlements for select to authenticated using ((select auth.uid())=user_id);
create policy qa_own_product on public.product_entitlements for select to authenticated using ((select auth.uid())=user_id);
create policy qa_own_event on public.event_entitlements for select to authenticated using ((select auth.uid())=user_id);
-- Create two synthetic Auth accounts in QA first, then insert free/paid rows manually
-- using reviewed QA UUIDs only. Do not add authentication triggers or copy live users.
commit;
