import Stripe from "npm:stripe@22.6.2";
import { idOf, verifySession } from "./commerce-core.mjs";
export async function providerSnapshot(stripe:Stripe,sid:string,o:any) {
 const session=await stripe.checkout.sessions.retrieve(sid);
 const items=await stripe.checkout.sessions.listLineItems(sid,{limit:2});
 const intent=idOf(session.payment_intent);
 const pi=session.payment_status==="paid"&&intent?await stripe.paymentIntents.retrieve(intent):null;
 const chargeId=idOf(pi?.latest_charge);
 const charge=chargeId?await stripe.charges.retrieve(chargeId):null;
 const v=verifySession(session,items,o,pi,charge);
 let won=false,pendingRefund=false;
 if(charge && pi) {
  const refunds=await stripe.refunds.list({charge:charge.id,limit:100});
  if(refunds.has_more || refunds.data.some(x=>x.livemode!==false || idOf(x.charge)!==charge.id || x.currency!==o.currency))throw Error("refund_snapshot_incomplete");
  const succeeded=refunds.data.filter(x=>x.status==="succeeded").reduce((sum,x)=>sum+x.amount,0);
  if(!Number.isSafeInteger(succeeded)||succeeded<0||succeeded>charge.amount)throw Error("refund_snapshot_mismatch");
  pendingRefund=refunds.data.some(x=>!["succeeded","failed","canceled"].includes(x.status||""));
  // Pending refunds do not revoke access as if completed. Conservative dispute hold takes precedence.
  const disputes=await stripe.disputes.list({charge:charge.id,limit:100});
  if(disputes.has_more || disputes.data.some(x=>x.livemode!==false || idOf(x.charge)!==charge.id))throw Error("dispute_snapshot_incomplete");
  won=disputes.data.length>0 && disputes.data.every(x=>x.status==="won");
  const hold=charge.disputed || disputes.data.length>0;
  v.refunded=succeeded;
  v.state=succeeded===charge.amount?"refunded":hold?"disputed":"paid";
 }
 return {session,v,won,pendingRefund};
}
// Explicitly bounded scan; if unable to enumerate all matching order sessions, fail closed.
// Do not log or return Stripe customer details.
export async function orderSessions(stripe:Stripe,o:any,maximum=2000){
 const start=Math.floor(Date.parse(o.created_at)/1000)-60;
 if(!Number.isFinite(start))throw Error("invalid_order_date");
 const found:Stripe.Checkout.Session[]=[];
 let count=0;
 for await(const session of stripe.checkout.sessions.list({created:{gte:start},limit:100})){
  if(++count>maximum)throw Error("session_scan_limit");
  if(session.metadata?.nbjb_commerce==="v1" && session.metadata?.order_id===o.id && session.mode==="payment" && !session.livemode)found.push(session);
 }
 return found;
}
