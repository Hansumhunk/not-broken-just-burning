// QA service operator only. No browser-facing admin route. No charge/refund creation.
import {createClient} from "npm:@supabase/supabase-js@2.116.0";
import Stripe from "npm:stripe@22.6.2";
import {sandboxAllowed,SKU} from "./commerce-core.mjs";
import {orderSessions,providerSnapshot} from "./provider.ts";
const env=(k:string)=>Deno.env.get(k)||"";
const url=env("SUPABASE_URL"),ref=env("NBJB_COMMERCE_SANDBOX_REF"),key=env("NBJB_COMMERCE_STRIPE_TEST_KEY");
if(!sandboxAllowed({mode:env("NBJB_COMMERCE_MODE"),key,url,expectedRef:ref}))throw Error("isolated_QA_only");
const service=env("SUPABASE_SERVICE_ROLE_KEY");
if(!service)throw Error("QA_service_key_required");
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const stripe=new Stripe(key);
const operator=env("NBJB_COMMERCE_OPERATOR");
const [cmd,target,...args]=Deno.args;
const apply=args.includes("--apply");
const arg=(name:string)=>{const i=args.indexOf(name);return i>=0?args[i+1]||"":""};
const uuid=(x:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x||"");
const ticket=arg("--ticket"), operation=arg("--operation");
function must(r:any){if(r.error)throw Error("operation_failed:"+String(r.error.code||"unknown"));return r.data;}
function audit(){if(!apply||!uuid(ticket)||!uuid(operation)||!/^[a-zA-Z0-9_-]{3,32}$/.test(operator))throw Error("apply_ticket_operation_and_operator_required");return {p_operation:operation,p_ticket:ticket,p_operator:operator};}
async function inspect(id:string){if(!uuid(id))throw Error("order_id_required");const o=must(await admin.from("commerce_orders").select("*").eq("id",id).maybeSingle());if(!o)throw Error("unknown_order");return o;}
async function main(){
 if(["inspect","recover","restore","review","close-refund","reconcile-extras","recover-canonical"].includes(cmd)){
  const o=await inspect(target);
  const sessions=await orderSessions(stripe,o);
  const paid=sessions.filter(s=>s.payment_status==="paid");
  console.log(JSON.stringify({status:o.status,review:o.review_required,scanSessions:sessions.length,paidSessions:paid.length,duplicate:paid.length>1}));
  if(cmd==="reconcile-extras"){
   // No automatic canonical reassignment. Require an existing bound session, and inspect every additional paid session.
   if(!o.stripe_session_id)throw Error("canonical_session_not_bound");
   if(!sessions.some(x=>x.id===o.stripe_session_id))throw Error("canonical_session_missing");
   if(apply)audit();
   let unresolved=0,observed=0;
   for(const extra of paid.filter(x=>x.id!==o.stripe_session_id)){
    const snap=await providerSnapshot(stripe,extra.id,{...o,stripe_session_id:null});
    if(!snap.v.intent||!["paid","refunded","disputed"].includes(snap.v.state))throw Error("exception_snapshot_invalid");
    if(snap.v.state!=="refunded"||snap.pendingRefund)unresolved++;
    if(apply)must(await admin.rpc("commerce_record_exception",{p_order:o.id,p_session:extra.id,p_intent:snap.v.intent,p_gross:snap.v.total,p_refunded:snap.v.refunded,p_state:snap.v.state,p_pending:snap.pendingRefund}));
    observed++;
   }
   if(apply)must(await admin.rpc("commerce_mark_review",{p_order:o.id,...audit(),p_duplicate:observed>0}));
   console.log(JSON.stringify({additionalPayments:observed,unresolved,applied:apply,canonicalUnchanged:true}));return;
  }
  if(cmd==="review"){
   if(apply)must(await admin.rpc("commerce_mark_review",{p_order:o.id,...audit(),p_duplicate:paid.length>1}));
   return;
  }
  let canonical=paid[0];
  if(cmd==="recover-canonical"){
    if(!o.stripe_session_id)throw Error("canonical_session_not_bound");
    const bound=paid.find(x=>x.id===o.stripe_session_id);
    if(!bound)throw Error("canonical_paid_session_missing");
    canonical=bound;
    // No unexpired payable session or unresolved extra payment may coexist with recovery.
    for(const x of sessions.filter(x=>x.id!==bound.id)){
      const other=await providerSnapshot(stripe,x.id,{...o,stripe_session_id:null});
      if(other.pendingRefund||!["refunded","expired"].includes(other.v.state))throw Error("additional_payment_unresolved");
    }
    const extraRows=must(await admin.from("commerce_payment_exceptions").select("session_ref,state,pending_refund").eq("order_id",o.id));
    if(extraRows.some((x:any)=>x.state!=="refunded"||x.pending_refund||!sessions.some(y=>y.id===x.session_ref)))throw Error("additional_payment_records_unresolved");
  }else if(sessions.length!==1||paid.length!==1||o.stripe_session_id&&paid[0].id!==o.stripe_session_id){
   if(apply)must(await admin.rpc("commerce_mark_review",{p_order:o.id,...audit(),p_duplicate:paid.length>1}));
   return;
  }
  const snap=await providerSnapshot(stripe,canonical.id,o);
  console.log(JSON.stringify({verifiedState:snap.v.state,grossCents:snap.v.total,successfulRefundCents:snap.v.refunded,disputeWon:snap.won,pendingRefund:snap.pendingRefund}));
  if(cmd==="inspect"||!apply)return;
  if(cmd==="close-refund"){
   if(snap.pendingRefund||snap.v.state!=="refunded")throw Error("confirmed_full_refund_required");
   must(await admin.rpc("commerce_ops_close_refund",{p_order:o.id,p_expected_updated:o.updated_at,p_session:snap.session.id,p_intent:snap.v.intent,p_total:snap.v.total,p_refunded:snap.v.refunded,...audit()}));
   must(await admin.rpc("commerce_record_refunds",{p_order:o.id,p_session:snap.session.id,p_intent:snap.v.intent,p_data:snap.refundRecords}));
   console.log("QA refund closeout committed");return;
  }
  if(snap.pendingRefund||snap.v.state==="refunded"||!((cmd==="recover"||cmd==="recover-canonical")&&snap.v.state==="paid"||cmd==="restore"&&snap.v.state==="paid"&&snap.won))throw Error("manual_review_required");
  must(await admin.rpc("commerce_ops_recover",{p_order:o.id,p_expected_updated:o.updated_at,p_session:snap.session.id,p_intent:snap.v.intent,p_total:snap.v.total,p_refunded:snap.v.refunded,p_restore_won:cmd==="restore",...audit()}));
  if(snap.refundRecords.length)must(await admin.rpc("commerce_record_refunds",{p_order:o.id,p_session:snap.session.id,p_intent:snap.v.intent,p_data:snap.refundRecords}));
  console.log("QA recovery committed");
 }else if(["erasure-check","erasure-hold","erasure-cancel"].includes(cmd)){
  if(!uuid(target))throw Error("user_uuid_required");
  const data=cmd==="erasure-check"||!apply?must(await admin.rpc("commerce_erasure_preflight",{p_user:target})):must(await admin.rpc("commerce_erasure_hold",{p_user:target,p_hold:cmd==="erasure-hold",...audit()}));
  console.log(JSON.stringify(data));
 }else if(cmd==="replace-asset"){
  if(!SKU.has(target))throw Error("known_slug_required");
  const oldVersion=arg("--old-version"),oldKey=arg("--old-key"),version=arg("--new-version"),path=arg("--new-key"),name=arg("--name");
  if(!path.startsWith(target+"/"+version+"/")||!oldKey.startsWith(target+"/"+oldVersion+"/")||path.includes("..")||oldKey.includes("..")||!(/^[a-zA-Z0-9._-]+\.(pdf|zip)$/.test(name)))throw Error("invalid_asset");
  const ix=path.lastIndexOf("/"),files=must(await admin.storage.from("nbjb-private-products").list(path.slice(0,ix),{search:path.slice(ix+1),limit:100}));
  if(!files?.some((f:any)=>f.name===path.slice(ix+1)&&f.id&&Number(f.metadata?.size)>0))throw Error("replacement_missing");
  if(apply)must(await admin.rpc("commerce_replace_asset",{p_slug:target,p_old_version:oldVersion,p_old_key:oldKey,p_new_version:version,p_new_key:path,p_name:name,...audit()}));
  console.log(JSON.stringify({replacementVerified:true,applied:apply}));
 }else throw Error("unknown_command");
}
await main().catch(e=>{console.error(e instanceof Error?e.message:"operation_failed");Deno.exit(1);});
