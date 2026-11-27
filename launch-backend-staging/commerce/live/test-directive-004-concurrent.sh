#!/usr/bin/env bash
# Run ONLY in disposable CI postgres on localhost, never against hosted projects.
set -euo pipefail
db=(-h localhost -U postgres -d commerce_production_dryrun -v ON_ERROR_STOP=1)
user=44444444-4444-4444-8444-444444444444
slug=boundary-builder-workbook
terms=boundary-004c-v1.0
psql "${db[@]}" -c "insert into auth.users values('$user'); update public.commerce_products set active=true,stripe_price_id='price_concurrent_fixture',stripe_product_id='prod_concurrent_fixture',tax_code='fixture-only',tax_behavior='exclusive',asset_key='boundary-builder-workbook/v1.4/fixture.zip',asset_version='v1.4',download_name='fixture.zip',terms_version='$terms' where slug='$slug';"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
reserve="set role service_role; select (public.commerce_reserve_canary('$user','$slug','$terms')).id;"
psql "${db[@]}" -qAt -c "$reserve" > "$tmp/order1" & p1=$!
psql "${db[@]}" -qAt -c "$reserve" > "$tmp/order2" & p2=$!
wait "$p1"; wait "$p2"; diff "$tmp/order1" "$tmp/order2"
order=$(tail -n1 "$tmp/order1")
[[ "$order" =~ ^[a-f0-9-]{36}$ ]]
paid="set role service_role; select public.commerce_reconcile('$order','evt_concurrent_paid','cs_concurrent_fixture','pi_concurrent_fixture','paid',1499,0);"
psql "${db[@]}" -qAt -c "$paid" & p1=$!
psql "${db[@]}" -qAt -c "$paid" & p2=$!
wait "$p1"; wait "$p2"
psql "${db[@]}" -qAt -c "select (select count(*)=1 from public.commerce_orders where user_id='$user' and slug='$slug') and (select count(*)=1 from public.commerce_receipts where order_id='$order' and event_id='evt_concurrent_paid') and (select count(*)=1 from public.product_entitlements where user_id='$user' and product_slug='$slug' and status='active');" | grep -Fx t
refund="set role service_role; select public.commerce_reconcile('$order','evt_concurrent_refund','cs_concurrent_fixture','pi_concurrent_fixture','refunded',1499,1499);"
stale="set role service_role; select public.commerce_reconcile('$order','evt_concurrent_stale','cs_concurrent_fixture','pi_concurrent_fixture','paid',1499,0);"
psql "${db[@]}" -qAt -c "$refund" & p1=$!
psql "${db[@]}" -qAt -c "$stale" & p2=$!
wait "$p1"; wait "$p2"
psql "${db[@]}" -qAt -c "select (select status='refunded' and refunded_amount=1499 from public.commerce_orders where id='$order') and (select count(*)=1 from public.product_entitlements where user_id='$user' and product_slug='$slug' and status='refunded') and (select count(*)=3 from public.commerce_receipts where order_id='$order');" | grep -Fx t
echo 'PASS: concurrent synthetic reservations, duplicate payment events, refund and stale payment event; no Stripe calls.'
