-- STAGED ONLY. Not a migration; approval + QA execution required.
-- Membership owns this table; standalone commerce tables are untouched.
begin;
create table public.membership_checkout_attempts (
 attempt_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 offer text not null check (offer in ('flamewalker_plus_monthly','flamewalker_plus_annual')),
 customer_ref text not null,
 request_body jsonb not null check (jsonb_typeof(request_body)='object'),
 provider_key text not null unique,
 created_at timestamptz not null default clock_timestamp(),
 session_ref text unique,
 released_at timestamptz,
 check (released_at is null or session_ref is not null)
);
create unique index membership_one_active_attempt on public.membership_checkout_attempts(user_id) where released_at is null;
alter table public.membership_checkout_attempts enable row level security;
revoke all on public.membership_checkout_attempts from public, anon, authenticated;
grant select, insert on public.membership_checkout_attempts to service_role;
grant update (session_ref,released_at) on public.membership_checkout_attempts to service_role;
-- No client can call this; SECURITY INVOKER uses service_role privileges.
create function public.claim_membership_checkout(p_user uuid,p_attempt uuid,p_offer text,p_customer text,p_request jsonb)
returns setof public.membership_checkout_attempts
language plpgsql security invoker set search_path = ''
as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text, 712190));
 insert into public.membership_checkout_attempts(attempt_id,user_id,offer,customer_ref,request_body,provider_key)
 values(p_attempt,p_user,p_offer,p_customer,p_request,'nbjb-membership-'||p_attempt::text)
 on conflict (user_id) where released_at is null do nothing;
 return query select * from public.membership_checkout_attempts where user_id=p_user and released_at is null;
end;
$$;
revoke all on function public.claim_membership_checkout(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.claim_membership_checkout(uuid,uuid,text,text,jsonb) to service_role;
-- Monotonic database revision fences all writers, including earlier deployed code.
alter table public.membership_entitlements add column membership_revision bigint not null default 0;
create function public.bump_membership_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.membership_revision := old.membership_revision+1; return new; end;
$$;
revoke all on function public.bump_membership_revision() from public, anon, authenticated;
create trigger membership_revision_before_update before update on public.membership_entitlements for each row execute function public.bump_membership_revision();
commit;
