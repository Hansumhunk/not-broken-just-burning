\set ON_ERROR_STOP on
-- Tests run against a disposable local Postgres, not actual Supabase or Stripe.
do $$ begin
 if (select count(*) from public.commerce_products where active)<>0 then raise exception 'unexpected active SKU';end if;
 if has_table_privilege('authenticated','public.commerce_orders','SELECT') or has_function_privilege('authenticated','public.commerce_reconcile(uuid,text,text,text,text,integer,integer)','EXECUTE') or has_function_privilege('anon','public.commerce_reserve(uuid,text,text)','EXECUTE') then raise exception 'client grant';end if;
 if (select public from storage.buckets where id='nbjb-private-products') then raise exception 'public bucket';end if;
end $$;
insert into storage.objects(bucket_id) values('nbjb-private-products'),('legacy');
set role authenticated;
do $$ begin if (select count(*) from storage.objects)<>1 or exists (select 1 from storage.objects where bucket_id='nbjb-private-products') then raise exception 'storage isolation failed';end if;end $$;
reset role;
update public.commerce_products set active=true,stripe_price_id='price_fixture',stripe_product_id='prod_fixture',tax_code='fixture-not-real',tax_behavior='exclusive',asset_key='forge-workbook/v1/fixture.pdf',asset_version='v1',download_name='fixture.pdf',terms_version='draft-v1' where slug='forge-workbook';
set role service_role;
do $$
declare u uuid:='11111111-1111-4111-8111-111111111111'; v uuid:='22222222-2222-4222-8222-222222222222'; o public.commerce_orders; again public.commerce_orders; n public.commerce_orders;
begin
 o:=public.commerce_reserve(u,'forge-workbook','draft-v1');
 again:=public.commerce_reserve(u,'forge-workbook','draft-v1');
 if o.id<>again.id then raise exception 'duplicate order';end if;
 perform public.commerce_reconcile(o.id,'evt_unpaid','cs_fixture',null,'pending',1999,0);
 if exists(select 1 from public.product_entitlements where user_id=u) then raise exception 'unpaid entitlement';end if;
 perform public.commerce_reconcile(o.id,'evt_paid','cs_fixture','pi_fixture','paid',1999,0);
 perform public.commerce_reconcile(o.id,'evt_paid','cs_fixture','pi_fixture','paid',1999,0);
 if (select count(*) from public.product_entitlements where user_id=u and status='active')<>1 then raise exception 'missing or duplicate grant';end if;
 if exists(select 1 from public.product_entitlements where user_id=v) then raise exception 'cross account';end if;
 begin perform public.commerce_reserve(u,'forge-workbook','draft-v1');raise exception 'expected already_owned';exception when raise_exception then if sqlerrm<>'already_owned' then raise;end if;end;
 perform public.commerce_reconcile(o.id,'evt_partial','cs_fixture','pi_fixture','paid',1999,100);
 if not (select review_required from public.commerce_orders where id=o.id) then raise exception 'partial refund review missing';end if;
 perform public.commerce_reconcile(o.id,'evt_dispute','cs_fixture','pi_fixture','disputed',1999,100);
 perform public.commerce_reconcile(o.id,'evt_stale','cs_fixture','pi_fixture','paid',1999,0);
 if (select status from public.product_entitlements where user_id=u and product_slug='forge-workbook')<>'revoked' then raise exception 'dispute replay resurrected';end if;
 perform public.commerce_reconcile(o.id,'evt_full','cs_fixture','pi_fixture','refunded',1999,1999);
 if (select status from public.product_entitlements where user_id=u and product_slug='forge-workbook')<>'refunded' then raise exception 'refund failed';end if;
 n:=public.commerce_reserve(u,'forge-workbook','draft-v1');
 if n.id=o.id then raise exception 'new order after refund not created';end if;
 perform public.commerce_reconcile(n.id,'evt_paid_new','cs_new','pi_new','paid',1999,0);
 perform public.commerce_reconcile(o.id,'evt_old_full','cs_fixture','pi_fixture','refunded',1999,1999);
 if (select provider_entitlement_ref from public.product_entitlements where user_id=u and product_slug='forge-workbook')<>n.id::text then raise exception 'old refund touched new entitlement';end if;
 if (select count from public.commerce_daily_metrics where slug='forge-workbook' and metric='checkout_requested')<>2 then raise exception 'duplicate checkout metric';end if;
end $$;
reset role;
