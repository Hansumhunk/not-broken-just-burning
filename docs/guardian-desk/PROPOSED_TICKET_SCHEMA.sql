-- Guardian Desk Phase II — DDL PROPOSAL / NOT APPLIED
-- Tracking: NBJB-GUARDIAN-DESK-001 / GitHub #275 / draft PR #276
-- Scope: isolated QA review only after founder approval. NEVER run directly on
-- production as part of Directive 005. No data is inserted by this proposal.
-- Current public schema inspection (2026-11-22): no existing support ticket tables.
--
-- Architecture: authenticated members may read a *small column allowlist* of
-- their own cases. ONLY an independently authenticated/rate-limited server may
-- create, classify or update tickets. No client-side service-role key, ever.
-- Public visitor Q&A remains possible without a database ticket.
--
-- Review gaps before running: approved support retention/deletion policy,
-- personally identifiable text minimization, staff review capability,
-- service-side Auth JWT verification, CAPTCHA/abuse controls, rate limiting,
-- legal/privacy disclosure and rollback plan.

begin;

create table public.guardian_support_tickets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (topic in (
    'account_login', 'free_membership', 'premium_membership',
    'products_downloads', 'billing_subscriptions', 'education_navigation',
    'technical_problem', 'privacy_data', 'general_feedback'
  )),
  feature_slug text check (feature_slug is null or char_length(feature_slug) between 1 and 120),
  summary text not null check (char_length(summary) between 10 and 1200),
  priority text not null default 'P2' check (priority in ('P0','P1','P2','P3')),
  status text not null default 'NEW' check (status in (
    'NEW','TRIAGED','AWAITING_CUSTOMER','ASSIGNED','IN_PROGRESS',
    'AWAITING_FOUNDER','RESOLVED','CLOSED','REOPENED'
  )),
  assigned_team text check (assigned_team is null or assigned_team in (
    'customer_experience','revenue_forge','guardian_infrastructure',
    'education','executive_command'
  )),
  -- Fingerprint is only for same-owner duplicate triage. Do NOT include PII
  -- or hash private reflection bodies to infer a psychological profile.
  dedupe_fingerprint text check (
    dedupe_fingerprint is null or char_length(dedupe_fingerprint) = 64
  ),
  last_verified_action text check (
    last_verified_action is null or char_length(last_verified_action) <= 400
  ),
  next_action text check (
    next_action is null or char_length(next_action) <= 400
  ),
  escalation_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index guardian_support_tickets_owner_created_idx
  on public.guardian_support_tickets(owner_user_id, created_at desc);
create index guardian_support_tickets_status_created_idx
  on public.guardian_support_tickets(status, created_at);
create index guardian_support_tickets_owner_dedupe_idx
  on public.guardian_support_tickets(owner_user_id, dedupe_fingerprint);

alter table public.guardian_support_tickets enable row level security;
revoke all on table public.guardian_support_tickets from PUBLIC, anon, authenticated;

-- Intentional column allowlist. Internal assignment, fingerprints and
-- escalation details are not exposed in the customer-facing ticket API.
grant select (
  id, topic, feature_slug, summary, priority, status,
  last_verified_action, next_action, created_at, updated_at, closed_at
) on public.guardian_support_tickets to authenticated;

create policy guardian_support_ticket_owner_read
on public.guardian_support_tickets
for select to authenticated
using ((select auth.uid()) is not null
  and (select auth.uid()) = owner_user_id);

-- No INSERT/UPDATE/DELETE policy for anon or authenticated.
-- The service-role backend MUST independently verify identity and limits,
-- because the service role bypasses RLS.
grant select, insert, update, delete
on table public.guardian_support_tickets to service_role;

create table public.guardian_support_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.guardian_support_tickets(id)
    on delete cascade,
  action_kind text not null check (action_kind in (
    'created','classified','assigned','status_changed','escalated',
    'reopened','resolution_verified','closed','operator_note'
  )),
  actor_kind text not null check (actor_kind in ('system','member','staff')),
  -- No full message transcripts, journal entries, or raw payment records.
  safe_note text check (safe_note is null or char_length(safe_note) <= 400),
  created_at timestamptz not null default now()
);
create index guardian_support_events_ticket_created_idx
  on public.guardian_support_events(ticket_id, created_at);

alter table public.guardian_support_events enable row level security;
revoke all on table public.guardian_support_events from PUBLIC, anon, authenticated;
-- No client-facing RLS policies on event/internal evidence table.
grant select, insert, update, delete
on table public.guardian_support_events to service_role;

-- Atomically maintained by a trusted server; NOT a complete rate limiter
-- until the application enforces policy and verifies results.
create table public.guardian_support_rate_windows (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  accepted_count integer not null default 0 check (accepted_count >= 0),
  primary key (owner_user_id, window_started_at)
);
alter table public.guardian_support_rate_windows enable row level security;
revoke all on table public.guardian_support_rate_windows from PUBLIC, anon, authenticated;
grant select, insert, update, delete
on table public.guardian_support_rate_windows to service_role;

comment on table public.guardian_support_tickets is
  'Proposed Guardian Desk authenticated minimal case records; no reflection bodies. Not live until separately approved.';
comment on table public.guardian_support_events is
  'Internal minimized support audit; no direct customer, public or marketing access.';
comment on table public.guardian_support_rate_windows is
  'Potential per-account abuse controls; enforcement belongs in trusted server code.';

commit;
