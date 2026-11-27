\set ON_ERROR_STOP on
-- Disposable PostgreSQL only. No Stripe calls.
begin;
insert into auth.users values('33333333-3333-4333-8333-333333333333');
update public.commerce_products set active=true,stripe_price_id='price_canary_fixture',stripe_product_id='prod_canary_fixture',tax_code='fixture-only',tax_behavior='exclusive',asset_key='boundary-builder-workbook/v1.4/fixture.zip',asset_version='v1.4',download_name='fixture.zip',terms_version='boundary-004c-v1.0' where slug='boundary-builder-workbook';
do $$ begin
 if has_function_privilege('anon','public.commerce_reserve_canary(uuid,text,text)','EXECUTE') or has_function_privilege('authenticated','public.commerce_reserve_canary(uuid,text,text)','EXECUTE') then raise exception 'client permission'; end if;
end $$;
set local role service_role;
do $$
declare u uuid:='33333333-3333-4333-8333-333333333333'; o public.commerce_orders; n public.commerce_orders;
begin
 o:=public.commerce_reserve_canary(u,'boundary-builder-workbook','boundary-004c-v1.0');
 n:=public.commerce_reserve_canary(u,'boundary-builder-workbook','boundary-004c-v1.0');
 if o.id<>n.id then raise exception 'duplicate reservation';end if;
 perform public.commerce_reconcile(o.id,'evt_canary_paid','cs_canary_fixture','pi_canary_fixture','paid',1499,0);
 perform public.commerce_reconcile(o.id,'evt_canary_refund','cs_canary_fixture','pi_canary_fixture','refunded',1499,1499);
 begin perform public.commerce_reserve_canary(u,'boundary-builder-workbook','boundary-004c-v1.0');raise exception 'expected consumed';exception when raise_exception then if sqlerrm<>'canary_consumed' then raise;end if;end;
 if (select count(*) from public.commerce_orders where user_id=u and slug='boundary-builder-workbook')<>1 then raise exception 'duplicate canary';end if;
end $$;
reset role;
rollback;
