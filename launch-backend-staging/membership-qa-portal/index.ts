import { withSupabase } from "npm:@supabase/server@1.7.0";
import Stripe from "npm:stripe@22.6.2";
import { billingEnvironment } from "../membership-atomic/billing-environment.mjs";
const env=billingEnvironment(k=>Deno.env.get(k));
const stripe=env&&!env.live?new Stripe(env.key):null;
const reply=(body:unknown,status=200)=>Response.json(body,{status});
export default {fetch:withSupabase({auth:"user"},async(req,ctx)=>{
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 if(!stripe||!env||env.live)return reply({error:"qa_portal_not_configured"},503);
 const uid=ctx.userClaims?.id;
 if(!uid||!env.users.includes(uid))return reply({error:"qa_identity_not_allowed"},403);
 try{
   if((await stripe.accounts.retrieveCurrent()).id!==env.account)return reply({error:"qa_account_mismatch"},503);
   const {data:member,error}=await ctx.supabaseAdmin.from("membership_entitlements").select("provider,provider_customer_ref").eq("user_id",uid).single();
   if(error||member?.provider!=="stripe"||!member.provider_customer_ref)return reply({error:"billing_unavailable"},409);
   const customer=await stripe.customers.retrieve(member.provider_customer_ref);
   if(customer.deleted||customer.livemode||customer.metadata?.nbjb_user_id!==uid||customer.metadata?.nbjb_environment!=="qa")return reply({error:"qa_customer_mismatch"},403);
   const session=await stripe.billingPortal.sessions.create({customer:customer.id,return_url:env.site+"/member-store.html"});
   if(!session.url)return reply({error:"portal_unavailable"},503);
   return reply({url:session.url});
 }catch{return reply({error:"portal_unavailable"},503)}
})};
