// Staged: provider mutation only after an atomic persistent membership claim.
// Unknown outcomes retain their exact original parameters and key. Never retry
// an unresolved key near Stripe's minimum 24h retention; operator review instead.
export const RETRY_MS = 20 * 60 * 60 * 1000;
export function retryAllowed(row, now=Date.now()) {
 const age=now-Date.parse(row.created_at);
 return Number.isFinite(age) && age>=0 && age<RETRY_MS && !row.released_at;
}
export function ownedSession(session,row) {
 return session?.mode==='subscription' && session.customer===row.customer_ref &&
 session.client_reference_id===row.user_id && session.metadata?.nbjb_attempt===row.attempt_id &&
 session.metadata?.nbjb_offer===row.offer;
}
export async function reservedCheckout(admin,stripe,{userId,customerId,offerSlug,request},now=Date.now()) {
 const table=()=>admin.from('membership_checkout_attempts');
 const reject=(error,status=409)=>({error,status});
 const read=await table().select('*').eq('user_id',userId).is('released_at',null).maybeSingle();
 if(read.error) throw read.error;
 let row=read.data;
 const subscriptions=await stripe.subscriptions.list({customer:customerId,status:'all',limit:100});
 const sessions=await stripe.checkout.sessions.list({customer:customerId,status:'open',limit:100});
 if(subscriptions.has_more||sessions.has_more||!Array.isArray(subscriptions.data)||!Array.isArray(sessions.data)) return reject('subscription_check_incomplete',503);
 const blocking=subscriptions.data.some(s=>['active','trialing','past_due','unpaid','incomplete','paused'].includes(s.status));
 if(blocking) return reject('already_subscribed');
 if(!row){
   if(sessions.data.some(s=>s.mode==='subscription'&&s.status==='open')) return reject('checkout_already_open');
   const attempt=crypto.randomUUID();
   const body={...request,metadata:{...request.metadata,nbjb_attempt:attempt}};
   const claim=await admin.rpc('claim_membership_checkout',{p_user:userId,p_attempt:attempt,p_offer:offerSlug,p_customer:customerId,p_request:body}).single();
   if(claim.error||!claim.data) throw claim.error??new Error('missing_claim');
   row=claim.data;
 }
 if(row.customer_ref!==customerId||row.user_id!==userId) return reject('checkout_mapping_review',503);
 if(row.session_ref){
   const session=await stripe.checkout.sessions.retrieve(row.session_ref);
   if(!ownedSession(session,row)) return reject('checkout_mapping_review',503);
   if(session.status==='open') return row.offer===offerSlug&&session.url?{url:session.url}:reject('checkout_already_open');
   // A paid/complete session can release only after its own subscription is
   // provider-confirmed terminal and the complete customer list has no blocker.
   if(session.status==='complete'){
     if(!session.subscription) return reject('checkout_outcome_review',503);
     const sub=await stripe.subscriptions.retrieve(typeof session.subscription==='string'?session.subscription:session.subscription.id);
     if(sub.customer!==customerId||!['canceled','incomplete_expired'].includes(sub.status)) return reject('checkout_outcome_review',503);
   } else if(session.status!=='expired') return reject('checkout_outcome_review',503);
   const released=await table().update({released_at:new Date().toISOString()}).eq('attempt_id',row.attempt_id).eq('session_ref',row.session_ref).is('released_at',null).select('attempt_id').maybeSingle();
   if(released.error) throw released.error;
   return reject('checkout_retry_after_terminal');
 }
 if(row.offer!==offerSlug) return reject('checkout_already_open');
 if(sessions.data.some(s=>s.mode==='subscription'&&s.status==='open'&&!ownedSession(s,row))) return reject('checkout_already_open');
 if(!retryAllowed(row,now)) return reject('checkout_outcome_review',503);
 // If response is lost, the same immutable Stripe request/key is retried.
 // No new UUID or changed price/URL is generated for an existing claim.
 const session=await stripe.checkout.sessions.create(row.request_body,{idempotencyKey:row.provider_key});
 if(!ownedSession(session,row)) return reject('checkout_mapping_review',503);
 const saved=await table().update({session_ref:session.id}).eq('attempt_id',row.attempt_id).is('released_at',null).is('session_ref',null).select('session_ref').maybeSingle();
 if(saved.error) throw saved.error;
 if(!saved.data){
   const current=await table().select('session_ref,released_at').eq('attempt_id',row.attempt_id).single();
   if(current.error||current.data?.session_ref!==session.id||current.data?.released_at) return reject('checkout_outcome_review',503);
 }
 return session.status==='open'&&session.url?{url:session.url}:reject('checkout_outcome_review',503);
}
