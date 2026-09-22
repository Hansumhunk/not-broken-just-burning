-- Align deployed entitlement-table ACLs with the intended Phase Two access model.
-- Browser-authenticated members may read their own entitlement rows through RLS,
-- but may not mutate entitlement state directly. Stripe webhooks / trusted server
-- code will own paid-access mutation.

revoke all privileges on table public.membership_entitlements from authenticated;
revoke all privileges on table public.product_entitlements from authenticated;
revoke all privileges on table public.event_entitlements from authenticated;

grant select on table public.membership_entitlements to authenticated;
grant select on table public.product_entitlements to authenticated;
grant select on table public.event_entitlements to authenticated;
