// Canonical customer binding: a Stripe customer is not a payment. Only the
// immutable winning database mapping may proceed to subscription checkout.
// An ambiguous create/save can strand an empty customer, but a late contender
// must not replace a prior mapping or use its own losing customer for billing.
export async function bindMembershipCustomer(admin,stripe,{userId,email,entitlement,environment}){
 const table=()=>admin.from('membership_entitlements');
 const read=async()=>{
   const r=await table().select('provider,provider_customer_ref').eq('user_id',userId).single();
   if(r.error||!r.data)throw Error('customer_mapping_unavailable');
   return r.data;
 };
 let current=await read();
 if(current.provider_customer_ref==null){
   const customer=await stripe.customers.create({
     email:typeof email==='string'?email:undefined,
     metadata:{nbjb_user_id:userId,nbjb_source:'flamewalker_account',nbjb_environment:environment.tag}
   },{idempotencyKey:'nbjb-'+environment.tag+'-customer-'+userId});
   if(!ownedCustomer(customer,userId,environment))throw Error('customer_mapping_review');
   // A late result, including one after provider idempotency-key retention,
   // cannot replace a binding won by another handler.
   const bound=await table().update({provider:'stripe',provider_customer_ref:customer.id})
     .eq('user_id',userId).is('provider_customer_ref',null).select('provider_customer_ref').maybeSingle();
   if(bound.error)throw Error('customer_mapping_unavailable');
   current=await read();
 }
 if(current.provider!=='stripe'||typeof current.provider_customer_ref!=='string'||!current.provider_customer_ref)throw Error('customer_mapping_review');
 const canonical=await stripe.customers.retrieve(current.provider_customer_ref);
 if(!ownedCustomer(canonical,userId,environment)||canonical.id!==current.provider_customer_ref)throw Error('customer_mapping_review');
 return canonical.id;
}
function ownedCustomer(customer,userId,environment){
 return !!customer&&!customer.deleted&&typeof customer.id==='string'&&customer.livemode===environment.live&&customer.metadata?.nbjb_user_id===userId&&customer.metadata?.nbjb_environment===environment.tag;
}
