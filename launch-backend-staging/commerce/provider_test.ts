import Stripe from "npm:stripe@22.6.2";
import {providerSnapshot,orderSessions,verifySandboxAccount} from "./provider.ts";
const o={id:"order-a",user_id:"user-a",slug:"forge-workbook",stripe_session_id:"cs_test",stripe_price_id:"price_test",amount:1999,currency:"usd",created_at:"2026-01-01T00:00:00Z"};
const session={id:"cs_test",livemode:false,mode:"payment",status:"complete",metadata:{nbjb_commerce:"v1",order_id:o.id,slug:o.slug},client_reference_id:o.id,currency:"usd",amount_subtotal:1999,amount_total:1999,total_details:{amount_discount:0},payment_status:"paid",payment_intent:"pi_test"};
function fake({refunds=[],disputes=[],disputed=false,more=false,sessions=[session]}:{refunds?:any[],disputes?:any[],disputed?:boolean,more?:boolean,sessions?:any[]}={}){
 return {checkout:{sessions:{retrieve:async()=>session,listLineItems:async()=>({has_more:false,data:[{price:{id:"price_test"},quantity:1,amount_subtotal:1999}]}),list:()=>({async *[Symbol.asyncIterator](){for(const s of sessions)yield s;}})}},
 paymentIntents:{retrieve:async()=>({id:"pi_test",livemode:false,status:"succeeded",metadata:{nbjb_commerce:"v1",order_id:o.id},currency:"usd",amount_received:1999,latest_charge:"ch_test"})},
 charges:{retrieve:async()=>({id:"ch_test",livemode:false,payment_intent:"pi_test",paid:true,amount:1999,amount_refunded:refunds.reduce((n,x)=>n+x.amount,0),disputed})},
 refunds:{list:async()=>({has_more:more,data:refunds})},disputes:{list:async()=>({has_more:false,data:disputes})}} as unknown as Stripe;
}
const refund=(amount:number,status:string)=>({id:"re_fixture",charge:"ch_test",livemode:false,currency:"usd",amount,status,created:1700000000});
function assert(v:unknown){if(!v)throw Error("assertion failed");}
async function reject(fn:()=>Promise<unknown>){try{await fn();}catch{return;}throw Error("expected rejection");}
Deno.test("pending refund is not treated as successful money movement",async()=>{const x=await providerSnapshot(fake({refunds:[refund(1999,"pending")]}),"cs_test",o);assert(x.pendingRefund&&x.v.state==="paid"&&x.v.refunded===0);});
Deno.test("verified partial and full successful refunds",async()=>{let x=await providerSnapshot(fake({refunds:[refund(100,"succeeded")]}),"cs_test",o);assert(x.v.state==="paid"&&x.v.refunded===100);x=await providerSnapshot(fake({refunds:[refund(1999,"succeeded")]}),"cs_test",o);assert(x.v.state==="refunded");});
Deno.test("won dispute is distinct from open or lost dispute",async()=>{for(const status of ["needs_response","lost","won"]){const x=await providerSnapshot(fake({disputed:true,disputes:[{id:"du_fixture",charge:"ch_test",livemode:false,status}]}),"cs_test",o);assert(x.won===(status==="won")&&x.v.state===(status==="won"?"paid":"disputed"));}});
Deno.test("truncated, foreign or unknown refund snapshots fail closed",async()=>{await reject(()=>providerSnapshot(fake({more:true}),"cs_test",o));await reject(()=>providerSnapshot(fake({refunds:[{...refund(100,"succeeded"),charge:"ch_other"}]}),"cs_test",o));await reject(()=>providerSnapshot(fake({refunds:[refund(100,"unrecognized")]}),"cs_test",o));});
Deno.test("duplicate scanner only selects matching one-time commerce sessions",async()=>{const result=await orderSessions(fake({sessions:[session,{...session,id:"cs_other"},{...session,mode:"subscription"},{...session,livemode:true},{...session,metadata:{order_id:"other"}}]}),o);assert(result.length===2);await reject(()=>orderSessions(fake({sessions:[session,session]}),o,1));});

Deno.test("sandbox identity must be independently confirmed, not merely a test key",async()=>{
 const provider={accounts:{retrieve:async()=>({id:"acct_QAfixture"})}} as unknown as Stripe;
 assert(await verifySandboxAccount(provider,"acct_QAfixture"));
 for(const wrong of ["","acct_other","acct_1UIHnYGyOSBYVfGl"])await reject(()=>verifySandboxAccount(provider,wrong));
});
