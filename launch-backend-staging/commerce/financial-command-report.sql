-- Financial Command Center contract: service-admin aggregate only.
-- Report at UTC day / SKU / USD; no customer or provider identifiers.
-- Dates are local observation times, not settlement dates.
with sales as (
 select (paid_at at time zone 'UTC')::date as day,slug,currency,
 count(*) as observed_paid_orders,sum(total_amount) as observed_gross_cents_including_tax
 from public.commerce_orders where paid_at is not null group by 1,2,3
), refunds as (
 select (r.succeeded_observed_at at time zone 'UTC')::date as day,o.slug,o.currency,
 count(*) as observed_succeeded_refunds,sum(r.amount) as observed_refund_cents
 from public.commerce_refund_observations r join public.commerce_orders o on o.id=r.order_id
 where r.status='succeeded' and r.succeeded_observed_at is not null group by 1,2,3
)
select coalesce(s.day,r.day) as utc_observation_day, coalesce(s.slug,r.slug) as slug,coalesce(s.currency,r.currency) as currency,
 coalesce(s.observed_paid_orders,0) as observed_paid_orders,coalesce(s.observed_gross_cents_including_tax,0) as observed_gross_cents_including_tax,
 coalesce(r.observed_succeeded_refunds,0) as observed_succeeded_refunds,coalesce(r.observed_refund_cents,0) as observed_refund_cents,
 coalesce(s.observed_gross_cents_including_tax,0)-coalesce(r.observed_refund_cents,0) as observed_cash_activity_before_fees_cents
from sales s full outer join refunds r on s.day=r.day and s.slug=r.slug and s.currency=r.currency order by 1,2;
-- Point-in-time risk/reconciliation snapshot. Never interpret as a daily cash-flow report.
select slug,currency,count(*) filter(where status='pending') as pending_orders,
 count(*) filter(where status='disputed') as disputed_orders,
 count(*) filter(where review_required) as needs_review,
 count(*) filter(where status='refunded') as fully_refunded_orders,
 coalesce(sum(total_amount) filter(where status='disputed'),0) as disputed_gross_cents,
 coalesce(sum(refunded_amount),0) as ledger_cumulative_refund_cents,
 coalesce((select sum(r.amount) from public.commerce_refund_observations r join public.commerce_orders t on t.id=r.order_id
 where t.slug=o.slug and t.currency=o.currency and r.status='succeeded'),0) as observation_refund_cents
from public.commerce_orders o group by slug,currency order by slug,currency;
-- No tax liability, fees, payouts or true net revenue until reconciled to Stripe balance and tax reports.
