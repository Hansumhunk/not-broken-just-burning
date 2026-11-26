
-- Uses only disposable fixture orders after test-operations.sql.
set role service_role;
do $q$
declare u uuid:='11111111-1111-4111-8111-111111111111'; o public.commerce_orders; a record; t uuid:=gen_random_uuid();
begin
 select * into o from public.commerce_orders where user_id=u and slug='boundary-builder-workbook' and status='paid';
 if not found then raise exception 'fixture_paid_missing';end if;
 perform public.commerce_replace_asset(o.slug,'v2',o.slug||'/v2/corrected.pdf','v3',o.slug||'/v3/final.pdf','final.pdf',gen_random_uuid(),t,'qa_operator');
 select * into a from public.commerce_resolve_asset(o.slug,o.asset_version,o.asset_key,o.download_name);
 if a.asset_version<>'v3' or a.asset_key<>o.slug||'/v3/final.pdf' then raise exception 'chain_resolution_failed';end if;
 begin
 perform public.commerce_replace_asset(o.slug,'v3',o.slug||'/v3/final.pdf','v1',o.asset_key,o.download_name,gen_random_uuid(),t,'qa_operator');
 raise exception 'expected_cycle';exception when raise_exception then if sqlerrm<>'asset_cycle_or_nonterminal_destination' then raise;end if;end;
 begin
 perform public.commerce_replace_asset(o.slug,'v2',o.slug||'/v2/corrected.pdf','v4',o.slug||'/v4/next.pdf','next.pdf',gen_random_uuid(),t,'qa_operator');
 raise exception 'expected_branch';exception when raise_exception then if sqlerrm<>'asset_already_replaced' then raise;end if;end;
 -- Additional payment must not change the canonical session or entitlement.
 perform public.commerce_record_exception(o.id,'cs_extra','pi_extra',1499,0,'paid',false);
 if not exists(select 1 from public.commerce_orders where id=o.id and stripe_session_id=o.stripe_session_id and review_required) then raise exception 'canonical_mutated';end if;
 if not exists(select 1 from public.product_entitlements where user_id=u and product_slug=o.slug and status='active' and provider_entitlement_ref=o.id::text) then raise exception 'canonical_entitlement_mutated';end if;
 begin perform public.commerce_record_exception(o.id,o.stripe_session_id,o.stripe_payment_intent_id,1499,0,'paid',false);raise exception 'expected_canonical_refusal';exception when raise_exception then if sqlerrm<>'exception_canonical_conflict' then raise;end if;end;
 perform public.commerce_reconcile(o.id,'evt_phase4_canonical_refund',o.stripe_session_id,o.stripe_payment_intent_id,'refunded',1499,1499);
 begin perform public.commerce_reserve(u,o.slug,'draft-v1');raise exception 'expected_hold';exception when raise_exception then if sqlerrm<>'payment_exception_review' then raise;end if;end;
 perform public.commerce_record_exception(o.id,'cs_extra','pi_extra',1499,1499,'refunded',false);
 perform public.commerce_record_exception(o.id,'cs_extra','pi_extra',1499,0,'paid',false);
 if (select state from public.commerce_payment_exceptions where session_ref='cs_extra')<>'refunded' then raise exception 'extra_refund_regressed';end if;
 perform public.commerce_reserve(u,o.slug,'draft-v1');
 if has_table_privilege('authenticated','public.commerce_payment_exceptions','SELECT') or has_function_privilege('authenticated','public.commerce_record_exception(uuid,text,text,integer,integer,text,boolean)','EXECUTE') or has_table_privilege('service_role','public.commerce_asset_replacements','UPDATE') then raise exception 'privilege_leak';end if;
end $q$;
reset role;
