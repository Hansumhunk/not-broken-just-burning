/* WB-001 storefront controller. Source-staged ONLY. Requires separate product and commerce release flags. */
(()=>{"use strict";
 const gate=window.NBJBWB001Release;
 const commerce=window.NBJBCommerce;
 const url=window.NBJBConfig?.supabaseUrl;
 const origin=location.origin;
 const ready=gate?.enabled===true && commerce?.enabled===true && commerce.mode==="live"
   && window.NBJBCommerceLive?.enabled===true
   && origin==="https://notbrokenjustburning.com"
   && url==="https://plhbvtbvtxfzulsaxuim.supabase.co"
   && gate.termsVersion==="wb001-v1" && /^0x[0-9a-z]+$/i.test(gate.turnstileSiteKey||"");
 const form=document.getElementById("wb001-order-form");
 const message=document.getElementById("wb001-order-status");
 if(!form||!message||!ready)return; // Keep ALL purchase controls hidden until review.
 const button=document.getElementById("wb001-submit");
 const email=document.getElementById("wb001-email");
 const terms=document.getElementById("wb001-terms");
 const member=document.getElementById("wb001-member-checkout");
 const box=document.getElementById("wb001-turnstile");
 const setStatus=t=>{message.textContent=t;};
 form.hidden=false;
 const turnstileReady=typeof window.turnstile?.render==="function";
 if(turnstileReady)window.turnstile.render(box,{sitekey:gate.turnstileSiteKey,action:"wb001_purchase"});
 async function guestCheckout(payload) {
  const res=await fetch(url+"/functions/v1/commerce-live",{
   method:"POST",headers:{"Content-Type":"application/json",apikey:window.NBJBConfig.supabasePublishableKey},
   body:JSON.stringify({action:"wb001_guest_checkout",...payload}),cache:"no-store",credentials:"omit"
  });
  const data=await res.json();
  if(!res.ok)throw Error(data?.error==="abuse_proof_required"?"Complete the verification challenge first.":"Checkout is not available right now.");
  return data;
 }
 function goCheckout(raw){
  const value=new URL(raw);
  if(value.protocol!=="https:"||value.hostname!=="checkout.stripe.com")throw Error("The payment link could not be verified.");
  location.assign(value.href);
 }
 form.addEventListener("submit",async ev=>{
  ev.preventDefault();
  if(!terms.checked){setStatus("Please review and accept the purchase terms first.");return;}
  if(!email.value.trim()){setStatus("Enter an email address to receive your download.");return;}
  const turnstileToken=window.turnstile?.getResponse?.()||"";
  button.disabled=true;setStatus("Checking secure one-time checkout...");
  try {
   const data=await guestCheckout({guestEmail:email.value.trim(),turnstileToken,acceptTerms:true,termsVersion:gate.termsVersion});
   goCheckout(data.url);
  }catch(e){setStatus(e.message||"Checkout unavailable. Nothing was charged.");button.disabled=false;}
 });
 member?.addEventListener("click",async()=>{
  if(!terms.checked){setStatus("Please review and accept the purchase terms first.");return;}
  member.disabled=true;setStatus("Checking your current membership price...");
  try {
   const auth=await window.NBJBAuth?.refresh?.();
   if(!auth?.user?.id){location.assign("member-auth.html?next=store.html");return;}
   const data=await commerce.call("wb001_member_checkout",{acceptTerms:true,termsVersion:gate.termsVersion});
   goCheckout(data.url);
  }catch{setStatus("Member checkout is unavailable. No new charge is confirmed.");member.disabled=false;}
 });
})();
