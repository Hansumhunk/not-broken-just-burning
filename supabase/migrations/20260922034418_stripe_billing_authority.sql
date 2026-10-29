-- NBJB Phase Two Stripe billing authority hardening
-- Minimal server-only webhook receipt ledger plus provider mapping uniqueness.
-- No Stripe payloads, private reflections, or secrets are stored here.

begin;

create table public.stripe_webhook_events (
  event_id text primary key check (char_length(event_id) between 1 and 200),
  event_type text not null check (char_length(event_type) between 1 and 160),
  event_created_at timestamptz not null,
  livemode boolean not null,
  user_id uuid references auth.users(id) on delete set null,
  object_ref text check (object_ref is null or char_length(object_ref) <= 200),
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'ignored', 'failed')),
  error_message text check (error_message is null or char_length(error_message) <= 1000),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.stripe_webhook_events enable row level security;

revoke all privileges on table public.stripe_webhook_events from anon, authenticated;
grant select, insert, update, delete on table public.stripe_webhook_events to service_role;

create policy stripe_webhook_events_deny_browser
on public.stripe_webhook_events
for all
to anon, authenticated
using (false)
with check (false);

create index stripe_webhook_events_created_idx
  on public.stripe_webhook_events (event_created_at desc);

create unique index membership_entitlements_stripe_customer_uidx
  on public.membership_entitlements (provider_customer_ref)
  where provider = 'stripe' and provider_customer_ref is not null;

create unique index membership_entitlements_stripe_subscription_uidx
  on public.membership_entitlements (provider_subscription_ref)
  where provider = 'stripe' and provider_subscription_ref is not null;

-- private.user_roles is intentionally browser-inaccessible. This explicit
-- deny policy documents that intent and keeps the security advisor quiet.
create policy user_roles_deny_direct_browser
on private.user_roles
for all
to anon, authenticated
using (false)
with check (false);

comment on table public.stripe_webhook_events is
  'Minimal Stripe webhook receipt ledger for idempotency and audit. Full webhook payloads are intentionally not stored.';

commit;
