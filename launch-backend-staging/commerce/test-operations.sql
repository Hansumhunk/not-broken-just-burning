\set ON_ERROR_STOP on
do $$ begin
 if has_table_privilege('authenticated','public.commerce_ops_audit','SELECT') or has_table_privilege('service_role','public.commerce_ops_audit','DELETE') or has_function_privilege('authenticated','public.commerce_ops_recover(uuid,timestamptz,text,text,integer,integer,boolean,uuid,uuid,text)','EXECUTE') or has_function_privilege('anon','public.commerce_erasure_preflight(uuid)','EXECUTE') or has_table_privilege('authenticated','public.commerce_refund_observations','SELECT') then raise exception 'admin privilege leak';end if;
end $$;
-- fresh isolated product for recovery cases
update public.commerce_products set active=true,stripe_price_id='price_boundary',stripe_product_id='prod_boundary',tax_code='fixture-not-real',tax_behavior='exclusive',asset_key='boundary-builder-workbook/v1/fixture.pdf',asset_version='v1',download_name='fixture.pdf',terms_version='draft-v1' where slug='boundary-builder-workbook';
set role service_role;
do $$
declare u uuid:='11111111-1111-4111-8111-111111111111'; v uuid:='22222222-2222-4222-8222-222222222222'; o public.commerce_orders; prior timestamptz; t uuid:=gen_random_uuid(); slug text:='boundary-builder-workbook'; pre jsonb; refdata jsonb;
begin
 o:=public.commerce_reserve(u,slug,'draft-v1');
 -- simulate provider success missing from local DB; only service-role audited recovery
 perform public.commerce_ops_recover(o.id,o.updated_at,'cs_recover','pi_recover',1499,0,false,gen_random_uuid(),t,'qa_operator');
 if not exists(select 1 from public.product_entitlements where user_id=u and product_slug=slug and status='active' and provider_entitlement_ref=o.id::text) then raise exception 'recovery grant missing';end if;
 prior:= (select updated_at from public.commerce_orders where id=o.id);
 perform public.commerce_reconcile(o.id,'evt_recover_dispute','cs_recover','pi_recover','disputed',1499,0);
 begin
  perform public.commerce_ops_recover(o.id,prior,'cs_recover','pi_recover',1499,0,true,gen_random_uuid(),t,'qa_operator');raise exception 'expected_stale';
 exception when raise_exception then if sqlerrm<>'provider_snapshot_stale' then raise;end if;end;
 select * into o from public.commerce_orders where id=o.id;
 begin
  perform public.commerce_ops_recover(o.id,o.updated_at,'cs_recover','pi_recover',1499,0,false,gen_random_uuid(),t,'qa_operator');raise exception 'expected_hold';
 exception when raise_exception then if sqlerrm<>'recovery_not_permitted' then raise;end if;end;
 perform public.commerce_ops_recover(o.id,o.updated_at,'cs_recover','pi_recover',1499,0,true,gen_random_uuid(),t,'qa_operator');
 if (select status from public.product_entitlements where user_id=u and product_slug=slug)<>'active' then raise exception 'restore missing';end if;
 -- duplicate review does not automatically refund or cancel
 perform public.commerce_mark_review(o.id,gen_random_uuid(),t,'qa_operator',true);
 if not (select review_required from public.commerce_orders where id=o.id) then raise exception 'duplicate not flagged';end if;
 perform public.commerce_replace_asset(slug,'v1',slug||'/v1/fixture.pdf','v2',slug||'/v2/corrected.pdf','corrected.pdf',gen_random_uuid(),t,'qa_operator');
 if (select asset_version from public.commerce_orders where id=o.id)<>'v1' then raise exception 'historical asset mutated';end if;
 if not exists(select 1 from public.commerce_asset_replacements where commerce_asset_replacements.slug='boundary-builder-workbook' and asset_version='v2') then raise exception 'replacement missing';end if;
 refdata:=jsonb_build_array(jsonb_build_object('id','re_fixture','amount',100,'status','pending','currency','usd','created',1700000000));
 perform public.commerce_record_refunds(o.id,'cs_recover','pi_recover',refdata);
 perform public.commerce_record_refunds(o.id,'cs_recover','pi_recover',jsonb_set(refdata,'{0,status}','"succeeded"'));
 perform public.commerce_record_refunds(o.id,'cs_recover','pi_recover',refdata);
 if (select status from public.commerce_refund_observations where refund_ref='re_fixture')<>'succeeded' or (select succeeded_observed_at from public.commerce_refund_observations where refund_ref='re_fixture') is null then raise exception 'refund replay regression';end if;
 pre:=public.commerce_erasure_hold(v,true,gen_random_uuid(),t,'qa_operator');
 if not (pre->>'held')::boolean or (pre->>'deletion_authorized')::boolean then raise exception 'erasure guard failed';end if;
 begin
  perform public.commerce_reserve(v,slug,'draft-v1');raise exception 'expected_account_review';
 exception when raise_exception then if sqlerrm<>'account_review' then raise;end if;end;
 perform public.commerce_erasure_hold(v,false,gen_random_uuid(),t,'qa_operator');
 perform public.commerce_reserve(v,slug,'draft-v1');
 if (select count(*) from public.commerce_ops_audit where ticket_ref=t)<>6 then raise exception 'audit count mismatch';end if;
end $$;
reset role;

-- Exceptional late payment already fully refunded: confirm closure and do not grant access.
set role service_role;
do $$
declare o public.commerce_orders; u uuid:='22222222-2222-4222-8222-222222222222'; stamp timestamptz;
begin
 select * into o from public.commerce_orders where user_id=u and slug='boundary-builder-workbook' and status='pending';
 perform public.commerce_reconcile(o.id,'evt_late_expired','cs_late',null,'expired',1499,0);
 select * into o from public.commerce_orders where id=o.id;
 perform public.commerce_ops_close_refund(o.id,o.updated_at,'cs_late','pi_late',1499,1499,gen_random_uuid(),gen_random_uuid(),'qa_operator');
 if (select status from public.commerce_orders where id=o.id)<>'refunded' or exists(select 1 from public.product_entitlements where user_id=u and product_slug='boundary-builder-workbook') then raise exception 'late refund closeout incorrect';end if;
end $$;
reset role;
-- Verify baseline ownership policy with synthetic auth.uid and SELECT-only permissions.
insert into public.membership_entitlements(user_id,tier,status) values
 ('11111111-1111-4111-8111-111111111111','paid_member','active'),
 ('22222222-2222-4222-8222-222222222222','free_member','active');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ begin
 if (select count(*) from public.membership_entitlements)<>1 or (select count(*) from public.product_entitlements)<>2 then raise exception 'own row policy mismatch';end if;
 if has_table_privilege('authenticated','public.product_entitlements','UPDATE') then raise exception 'client write permission';end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
 if (select count(*) from public.membership_entitlements)<>1 or (select count(*) from public.product_entitlements)<>0 then raise exception 'cross-account policy mismatch';end if;
end $$;
reset role;
-- Simulate cancellation of membership: standalone purchases remain unchanged.
update public.membership_entitlements set tier='free_member',status='canceled' where user_id='11111111-1111-4111-8111-111111111111';
do $$ begin
 if (select count(*) from public.product_entitlements where user_id='11111111-1111-4111-8111-111111111111' and status='active')<>2 then raise exception 'subscription cancellation altered product ownership';end if;
end $$;
