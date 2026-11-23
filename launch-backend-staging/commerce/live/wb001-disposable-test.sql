-- D I S P O S A B L E   P O S T G R E S   O N L Y
-- Run after production-schema-staged.sql and wb001-additive-staged.sql. No hosted data.
begin;
set local role service_role;
update public.commerce_products set active=true, stripe_product_id='prod_fixture', stripe_price_id='price_retail_fixture',
 member_amount=999,member_stripe_price_id='price_member_fixture',tax_code='txcd_10302000',
 tax_behavior='exclusive',asset_key='from-chaos-to-clarity/v1.0/NBJB-WB-001_v1.0_customer.zip',
 asset_version='v1.0',download_name='NBJB-WB-001_v1.0_customer.zip',terms_version='wb001-v1'
 where slug='from-chaos-to-clarity';
insert into public.membership_entitlements(user_id,tier,status,source,provider,provider_customer_ref,
 provider_subscription_ref,valid_from,valid_until)
 values('11111111-1111-4111-8111-111111111111','paid_member','active','stripe_subscription',
 'stripe','cus_qa','sub_qa',now()-interval '1 day',now()+interval '1 day');
do $verify$
declare member_order public.commerce_direct_orders; guest_order public.commerce_direct_orders; free_order public.commerce_direct_orders; wrong_email_order public.commerce_direct_orders;
        retry public.commerce_direct_orders; count_before integer; count_after integer;
begin
 select * into member_order from public.commerce_direct_reserve('from-chaos-to-clarity',
  '11111111-1111-4111-8111-111111111111',null,'wb001-v1');
 if member_order.buyer_kind<>'member' or member_order.price_tier<>'member'
   or member_order.amount<>999 or member_order.stripe_price_id<>'price_member_fixture' then
   raise exception 'WB001_MEMBER_PRICE_BYPASS';end if;
 select * into retry from public.commerce_direct_reserve('from-chaos-to-clarity',
  '11111111-1111-4111-8111-111111111111',null,'wb001-v1');
 if retry.id<>member_order.id then raise exception 'WB001_RESERVATION_NOT_IDEMPOTENT';end if;
 -- A registered FREE buyer never receives the paid-member amount.
 select * into free_order from public.commerce_direct_reserve('from-chaos-to-clarity',
  '22222222-2222-4222-8222-222222222222',null,'wb001-v1');
 if free_order.amount<>1799 or free_order.price_tier<>'retail' or free_order.buyer_kind<>'member'
 then raise exception 'WB001_FREE_ACCOUNT_DISCOUNT_LEAK';end if;
  select * into guest_order from public.commerce_direct_reserve('from-chaos-to-clarity',
  null,'guest@example.org','wb001-v1');
 if guest_order.buyer_kind<>'guest' or guest_order.price_tier<>'retail'
  or guest_order.amount<>1799 or guest_order.user_id is not null then
   raise exception 'WB001_GUEST_PRICE_BYPASS';end if;
 begin
  perform public.commerce_direct_reserve('from-chaos-to-clarity',
   null,'guest@example.org','wrong-terms');
  raise exception 'WB001_TERMS_MISMATCH_ACCEPTED';
 exception when others then
  if sqlerrm='WB001_TERMS_MISMATCH_ACCEPTED' then raise; end if;
 end;
 begin
  perform public.commerce_direct_reserve('from-chaos-to-clarity',
   null,'guest@example.org',null);
  raise exception 'WB001_NULL_TERMS_ACCEPTED';
 exception when others then
  if sqlerrm='WB001_NULL_TERMS_ACCEPTED' then raise; end if;
 end;
 -- A checkout email changed in Stripe is held; never email the original or unverified address.
 select * into wrong_email_order from public.commerce_direct_reserve('from-chaos-to-clarity',
  null,'another@example.org','wb001-v1');
 perform public.commerce_direct_reconcile(wrong_email_order.id,'evt_wrong_email','cs_live_mismatch','pi_live_mismatch',
  'paid',1799,0,'stranger@example.org');
 if not (select review_required from public.commerce_direct_orders where id=wrong_email_order.id)
  or exists(select 1 from public.commerce_direct_outbox where order_id=wrong_email_order.id)
 then raise exception 'WB001_EMAIL_MISMATCH_DELIVERY';end if;
  perform public.commerce_direct_reconcile(member_order.id,'evt_member_1','cs_live_member','pi_live_member',
  'paid',999,0,null);
 if (select status from public.product_entitlements where user_id=member_order.user_id
  and product_slug='from-chaos-to-clarity')<>'active' then raise exception 'WB001_MEMBER_ENTITLEMENT_MISSING';end if;
 perform public.commerce_direct_reconcile(guest_order.id,'evt_guest_1','cs_live_guest','pi_live_guest',
  'paid',1799,0,'guest@example.org');
 if (select count(*) from public.commerce_direct_outbox where order_id=guest_order.id and status='pending')<>1
  then raise exception 'WB001_GUEST_RECEIPT_MISSING';end if;
 select count(*) into count_before from public.commerce_direct_receipts;
 perform public.commerce_direct_reconcile(guest_order.id,'evt_guest_1','cs_live_guest','pi_live_guest',
  'paid',1799,0,'guest@example.org');
 select count(*) into count_after from public.commerce_direct_receipts;
 if count_after<>count_before then raise exception 'WB001_DUPLICATE_PROVIDER_EVENT';end if;
 perform public.commerce_direct_mark_receipt(guest_order.id);
 if (select receipt_sent_at is null or claim_expires_at <= now() from public.commerce_direct_orders where id=guest_order.id)
 then raise exception 'WB001_GUEST_RECEIPT_NOT_TRACKED';end if;
 -- Claim rotation happens only after the new email is accepted, never when requested.
 update public.commerce_direct_outbox set sent_at=now()-interval '20 minutes' where order_id=guest_order.id;
 if public.commerce_direct_request_recovery('guest@example.org')<>guest_order.id then
  raise exception 'WB001_RECOVERY_NOT_QUEUED';end if;
 if (select status<>'pending' from public.commerce_direct_outbox where order_id=guest_order.id)
 then raise exception 'WB001_RECOVERY_OUTBOX_NOT_PENDING';end if;
 if (select pending_nonce=claim_nonce from public.commerce_direct_outbox x
     join public.commerce_direct_orders o on o.id=x.order_id where o.id=guest_order.id)
 then raise exception 'WB001_RECOVERY_ROTATED_TOO_EARLY';end if;
 perform public.commerce_direct_mark_receipt(guest_order.id);
 if (select pending_nonce<>claim_nonce from public.commerce_direct_outbox x
     join public.commerce_direct_orders o on o.id=x.order_id where o.id=guest_order.id)
 then raise exception 'WB001_RECOVERY_CLAIM_NOT_ROTATED';end if;
  perform public.commerce_direct_reconcile(guest_order.id,'evt_refund_1','cs_live_guest','pi_live_guest',
  'refunded',1799,1799,'guest@example.org');
 if (select status from public.commerce_direct_orders where id=guest_order.id)<>'refunded'
 then raise exception 'WB001_REFUND_IGNORED';end if;
 perform public.commerce_direct_reconcile(guest_order.id,'evt_stale_paid','cs_live_guest','pi_live_guest',
  'paid',1799,0,'guest@example.org');
 if (select status from public.commerce_direct_orders where id=guest_order.id)<>'refunded'
 then raise exception 'WB001_STALE_EVENT_REGRANTED';end if;
 perform public.commerce_direct_reconcile(member_order.id,'evt_member_refund','cs_live_member','pi_live_member',
  'refunded',999,999,null);
 if (select status from public.product_entitlements where user_id=member_order.user_id
  and product_slug='from-chaos-to-clarity')<>'refunded' then raise exception 'WB001_MEMBER_REFUND_NOT_REVOKED';end if;
end $verify$;
rollback;
