import Stripe from "npm:stripe@22.6.2";
// Raw request bytes and endpoint-specific secret; never accept client JSON as an event.
export async function verifiedStripeEvent(stripe:Stripe, payload:string, signature:string|null, secret:string) {
 if(!secret.startsWith("whsec_")||!signature)throw Error("signature_required");
 const event=await stripe.webhooks.constructEventAsync(payload,signature,secret,undefined,Stripe.createSubtleCryptoProvider());
 if(event.livemode!==false)throw Error("wrong_environment");
 return event;
}
