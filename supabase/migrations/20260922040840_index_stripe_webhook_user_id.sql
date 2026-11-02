-- Cover the Stripe webhook ledger's nullable user foreign key.
-- The index supports audit/user lookups without exposing webhook rows to browsers.

create index if not exists stripe_webhook_events_user_id_idx
on public.stripe_webhook_events (user_id)
where user_id is not null;
