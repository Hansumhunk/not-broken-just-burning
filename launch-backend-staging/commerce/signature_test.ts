import Stripe from "npm:stripe@22.6.2";
import { verifiedStripeEvent } from "./signature.ts";
const stripe=new Stripe("sk_test_fixture_only");
const secret="whsec_fixture_only";
async function header(payload:string, secretKey=secret, timestamp=Math.floor(Date.now()/1000)){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secretKey),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(timestamp+"."+payload)));
 return "t="+timestamp+",v1="+Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
async function rejects(fn:()=>Promise<unknown>){try{await fn();}catch{return;}throw Error("expected rejection");}
const payload=JSON.stringify({id:"evt_fixture",type:"checkout.session.completed",livemode:false,data:{object:{id:"cs_test_fixture"}}});
Deno.test("signature verifies genuine synthetic raw fixture",async()=>{const e=await verifiedStripeEvent(stripe,payload,await header(payload),secret);if(e.id!=="evt_fixture")throw Error("fixture not verified");});
Deno.test("signature rejects tampered, missing, wrong-secret, stale and live fixtures",async()=>{
 const h=await header(payload);
 await rejects(()=>verifiedStripeEvent(stripe,payload+" ",h,secret));
 await rejects(()=>verifiedStripeEvent(stripe,payload,null,secret));
 const wrong=await header(payload,"whsec_other");await rejects(()=>verifiedStripeEvent(stripe,payload,wrong,secret));
 const stale=await header(payload,secret,Math.floor(Date.now()/1000)-600);await rejects(()=>verifiedStripeEvent(stripe,payload,stale,secret));
 const live=payload.replace('"livemode":false','"livemode":true'), liveH=await header(live);await rejects(()=>verifiedStripeEvent(stripe,live,liveH,secret));
});
