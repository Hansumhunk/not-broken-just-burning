-- Admin only: aggregate operational metrics, never execute via anonymous/authenticated client.
select day,slug,metric,count from public.commerce_daily_metrics order by day,slug,metric;
select slug,count(*) filter(where paid_at is not null) as paid_orders,
 count(*) filter(where status='refunded') as fully_refunded_orders,
 count(*) filter(where status='disputed') as disputed_orders,
 count(*) filter(where review_required) as review_orders,
 sum(coalesce(total_amount,0)) filter(where paid_at is not null) as gross_collected_cents_including_tax,
 sum(refunded_amount) filter(where paid_at is not null) as refunded_cents
from public.commerce_orders group by slug order by slug;
