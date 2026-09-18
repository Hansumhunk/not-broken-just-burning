-- NBJB Phase Two member backend foundation
-- Privacy boundary: this migration intentionally stores low-sensitivity account
-- continuity and entitlement data only. It does NOT create tables for Forge,
-- Pattern Map bodies, Sacred Questions answers, medical/legal material, or
-- private journal/reflection content.

begin;

create schema if not exists private;

-- Keep authorization data outside the exposed public schema.
create table if not exists private.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table private.user_roles enable row level security;
revoke all on private.user_roles from public, anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from private.user_roles
      where user_id = (select auth.uid())
        and role = 'admin'
    );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  short_bio text check (short_bio is null or char_length(short_bio) <= 280),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_visibility text not null default 'private'
    check (profile_visibility in ('private', 'members')),
  show_recent_work_metadata boolean not null default true,
  learning_reminders boolean not null default false,
  preferred_landing text not null default 'today'
    check (preferred_landing in ('today', 'path', 'library')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_path_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_stage_slug text check (
    current_stage_slug is null or current_stage_slug in (
      'fire-reclamation',
      'guardian',
      'sacred-mirror',
      'masculine-restoration',
      'voice-of-fire',
      'circle-of-the-flame'
    )
  ),
  current_anchor_slug text check (
    current_anchor_slug is null or char_length(current_anchor_slug) <= 80
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_path_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_slug text not null check (
    stage_slug in (
      'fire-reclamation',
      'guardian',
      'sacred-mirror',
      'masculine-restoration',
      'voice-of-fire',
      'circle-of-the-flame'
    )
  ),
  progress_state text not null default 'not_started'
    check (progress_state in ('not_started', 'in_progress', 'practicing')),
  updated_at timestamptz not null default now(),
  primary key (user_id, stage_slug)
);

create table public.member_continue_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  next_honest_action text check (
    next_honest_action is null or char_length(next_honest_action) <= 500
  ),
  next_honest_action_updated_at timestamptz,
  last_tool_slug text check (
    last_tool_slug is null or char_length(last_tool_slug) <= 120
  ),
  continue_kind text check (
    continue_kind is null or continue_kind in (
      'tool', 'path', 'learning', 'product', 'event'
    )
  ),
  continue_slug text check (
    continue_slug is null or char_length(continue_slug) <= 160
  ),
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_kind text not null check (
    content_kind in ('lesson', 'track', 'course', 'workshop', 'replay')
  ),
  content_slug text not null check (char_length(content_slug) between 1 and 160),
  progress_percent smallint not null default 0
    check (progress_percent between 0 and 100),
  current_unit_slug text check (
    current_unit_slug is null or char_length(current_unit_slug) <= 160
  ),
  started_at timestamptz,
  last_accessed_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_kind, content_slug)
);

create table public.membership_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free_member'
    check (tier in ('free_member', 'paid_member')),
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired', 'revoked')),
  source text not null default 'account_default'
    check (char_length(source) between 1 and 80),
  provider text check (provider is null or char_length(provider) <= 80),
  provider_customer_ref text check (
    provider_customer_ref is null or char_length(provider_customer_ref) <= 200
  ),
  provider_subscription_ref text check (
    provider_subscription_ref is null or char_length(provider_subscription_ref) <= 200
  ),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from)
);

create table public.product_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null check (char_length(product_slug) between 1 and 160),
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked', 'refunded')),
  source text not null default 'manual'
    check (char_length(source) between 1 and 80),
  provider text check (provider is null or char_length(provider) <= 80),
  provider_entitlement_ref text check (
    provider_entitlement_ref is null or char_length(provider_entitlement_ref) <= 200
  ),
  granted_at timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_slug),
  check (valid_until is null or valid_until >= granted_at)
);

create table public.event_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_slug text not null check (char_length(event_slug) between 1 and 160),
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked', 'refunded')),
  source text not null default 'manual'
    check (char_length(source) between 1 and 80),
  provider text check (provider is null or char_length(provider) <= 80),
  provider_entitlement_ref text check (
    provider_entitlement_ref is null or char_length(provider_entitlement_ref) <= 200
  ),
  granted_at timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, event_slug),
  check (valid_until is null or valid_until >= granted_at)
);

-- Index ownership columns used by RLS and common lookups.
create index member_path_progress_user_idx
  on public.member_path_progress (user_id);
create index learning_progress_user_idx
  on public.learning_progress (user_id);
create index product_entitlements_user_idx
  on public.product_entitlements (user_id);
create index event_entitlements_user_idx
  on public.event_entitlements (user_id);

-- RLS is enabled from the first schema migration.
alter table public.profiles enable row level security;
alter table public.member_preferences enable row level security;
alter table public.member_path_state enable row level security;
alter table public.member_path_progress enable row level security;
alter table public.member_continue_state enable row level security;
alter table public.learning_progress enable row level security;
alter table public.membership_entitlements enable row level security;
alter table public.product_entitlements enable row level security;
alter table public.event_entitlements enable row level security;

-- Explicit Data API grants. Anonymous/browser-public requests get no member-table grants.
revoke all on public.profiles from anon;
revoke all on public.member_preferences from anon;
revoke all on public.member_path_state from anon;
revoke all on public.member_path_progress from anon;
revoke all on public.member_continue_state from anon;
revoke all on public.learning_progress from anon;
revoke all on public.membership_entitlements from anon;
revoke all on public.product_entitlements from anon;
revoke all on public.event_entitlements from anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.member_preferences to authenticated;
grant select, insert, update, delete on public.member_path_state to authenticated;
grant select, insert, update, delete on public.member_path_progress to authenticated;
grant select, insert, update, delete on public.member_continue_state to authenticated;
grant select, insert, update, delete on public.learning_progress to authenticated;

-- Entitlement rows are browser read-only. Trusted server/admin paths own mutation.
grant select on public.membership_entitlements to authenticated;
grant select on public.product_entitlements to authenticated;
grant select on public.event_entitlements to authenticated;

-- Owner + explicit-admin policies for ordinary continuity data.
create policy profiles_select_own_or_admin
on public.profiles for select to authenticated
using (
  (select auth.uid()) = user_id
  or (select private.is_admin())
);
create policy profiles_insert_own_or_admin
on public.profiles for insert to authenticated
with check (
  (select auth.uid()) = user_id
  or (select private.is_admin())
);
create policy profiles_update_own_or_admin
on public.profiles for update to authenticated
using (
  (select auth.uid()) = user_id
  or (select private.is_admin())
)
with check (
  (select auth.uid()) = user_id
  or (select private.is_admin())
);
create policy profiles_delete_own_or_admin
on public.profiles for delete to authenticated
using (
  (select auth.uid()) = user_id
  or (select private.is_admin())
);

create policy member_preferences_select_own_or_admin
on public.member_preferences for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_preferences_insert_own_or_admin
on public.member_preferences for insert to authenticated
with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_preferences_update_own_or_admin
on public.member_preferences for update to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()))
with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_preferences_delete_own_or_admin
on public.member_preferences for delete to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy member_path_state_select_own_or_admin
on public.member_path_state for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_path_state_insert_own_or_admin
on public.member_path_state for insert to authenticated
with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_path_state_update_own_or_admin
on public.member_path_state for update to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()))
with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_path_state_delete_own_or_admin
on public.member_path_state for delete to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy member_path_progress_select_own_or_admin
on public.member_path_progress for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_path_progress_insert_own_or_admin
on public.member_path_progress for insert to authenticated
with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_path_progress_update_own_or_admin
on public.member_path_progress for update to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()))
with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_path_progress_delete_own_or_admin
on public.member_path_progress for delete to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy member_continue_state_select_own_or_admin
on public.member_continue_state for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_continue_state_insert_own_or_admin
on public.member_continue_state for insert to authenticated
with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_continue_state_update_own_or_admin
on public.member_continue_state for update to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()))
with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy member_continue_state_delete_own_or_admin
on public.member_continue_state for delete to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy learning_progress_select_own_or_admin
on public.learning_progress for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy learning_progress_insert_own_or_admin
on public.learning_progress for insert to authenticated
with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy learning_progress_update_own_or_admin
on public.learning_progress for update to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()))
with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy learning_progress_delete_own_or_admin
on public.learning_progress for delete to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

-- Entitlements: member can read own; explicit admin can read/manage any.
create policy membership_entitlements_select_own_or_admin
on public.membership_entitlements for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy membership_entitlements_admin_insert
on public.membership_entitlements for insert to authenticated
with check ((select private.is_admin()));
create policy membership_entitlements_admin_update
on public.membership_entitlements for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy membership_entitlements_admin_delete
on public.membership_entitlements for delete to authenticated
using ((select private.is_admin()));

create policy product_entitlements_select_own_or_admin
on public.product_entitlements for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy product_entitlements_admin_insert
on public.product_entitlements for insert to authenticated
with check ((select private.is_admin()));
create policy product_entitlements_admin_update
on public.product_entitlements for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy product_entitlements_admin_delete
on public.product_entitlements for delete to authenticated
using ((select private.is_admin()));

create policy event_entitlements_select_own_or_admin
on public.event_entitlements for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy event_entitlements_admin_insert
on public.event_entitlements for insert to authenticated
with check ((select private.is_admin()));
create policy event_entitlements_admin_update
on public.event_entitlements for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy event_entitlements_admin_delete
on public.event_entitlements for delete to authenticated
using ((select private.is_admin()));

-- Generic timestamp maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger member_preferences_set_updated_at
before update on public.member_preferences
for each row execute function public.set_updated_at();

create trigger member_path_state_set_updated_at
before update on public.member_path_state
for each row execute function public.set_updated_at();

create trigger member_path_progress_set_updated_at
before update on public.member_path_progress
for each row execute function public.set_updated_at();

create trigger member_continue_state_set_updated_at
before update on public.member_continue_state
for each row execute function public.set_updated_at();

create trigger learning_progress_set_updated_at
before update on public.learning_progress
for each row execute function public.set_updated_at();

create trigger membership_entitlements_set_updated_at
before update on public.membership_entitlements
for each row execute function public.set_updated_at();

create trigger product_entitlements_set_updated_at
before update on public.product_entitlements
for each row execute function public.set_updated_at();

create trigger event_entitlements_set_updated_at
before update on public.event_entitlements
for each row execute function public.set_updated_at();

-- Create low-sensitivity defaults for a new Auth account.
create or replace function public.handle_new_nbjb_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.member_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.member_path_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.member_continue_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.membership_entitlements (
    user_id, tier, status, source
  )
  values (
    new.id, 'free_member', 'active', 'account_default'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_nbjb_user() from public, anon, authenticated;

create trigger on_auth_user_created_nbjb
after insert on auth.users
for each row execute function public.handle_new_nbjb_user();

comment on table public.profiles is
  'Low-sensitivity member profile only. Do not store private reflection content.';
comment on table public.member_preferences is
  'Low-sensitivity member preferences only; not a free-form journal store.';
comment on table public.member_continue_state is
  'Low-sensitivity Today/Continue state. No Forge, Pattern Map, medical/legal, Sacred Questions, or journal bodies.';
comment on table public.learning_progress is
  'Learning continuity metadata only; protected content bodies/URLs are authorized separately.';
comment on table public.membership_entitlements is
  'Authoritative membership entitlement state. Browser clients may read their own row but cannot self-promote.';
comment on table public.product_entitlements is
  'Separate product ownership. Product access does not imply paid membership.';
comment on table public.event_entitlements is
  'Separate event/replay entitlement. Event access does not imply paid membership.';

commit;
