/* WB-001 guest delivery. Bearer claim lives in the fragment; never in query, logs or referrer. */
(()=>{"use strict";
 const message=document.getElementById("wb001-claim-status");
 const button=document.getElementById("wb001-download");
 const config=window.NBJBWB001Release;
 const api=window.NBJBConfig;
 const origin="https://notbrokenjustburning.com";
 const allowed=config?.enabled===true && window.NBJBCommerceLive?.enabled===true
   && location.origin===origin && api?.supabaseUrl==="https://plhbvtbvtxfzulsaxuim.supabase.co";
 if(!button||!message||!allowed)return;
 const fragment=new URLSearchParams(location.hash.slice(1));
 const order=fragment.get("order"),claim=fragment.get("claim");
 history.replaceState(null,"",location.pathname); // remove bearer from address bar/history immediately.
 if(!/^[0-9a-f-]{36}$/i.test(order||"")||!/^[A-Za-z0-9_-]{43}$/.test(claim||"")){
  message.textContent="Use the private download link sent to your purchase email.";return;
 }
 message.textContent="Your private purchase link is ready to verify.";
 button.disabled=false;
 button.addEventListener("click",async()=>{
  button.disabled=true;message.textContent="Verifying purchase and preparing your download...";
  try{
   const res=await fetch(api.supabaseUrl+"/functions/v1/commerce-live",{
    method:"POST",headers:{"Content-Type":"application/json",apikey:api.supabasePublishableKey},
    body:JSON.stringify({action:"wb001_guest_download",order,claim}),cache:"no-store",credentials:"omit"});
   const data=await res.json();
   if(!res.ok)throw Error("Access could not be verified. Contact support if your payment completed.");
   const u=new URL(data.url);
   if(u.origin!==api.supabaseUrl||!u.pathname.startsWith("/storage/v1/object/sign/nbjb-private-products/")||data.expiresIn!==60)
     throw Error("Download link could not be verified.");
   message.textContent="Your secure download is ready. The link expires in one minute.";
   location.assign(u.href);
  }catch(e){message.textContent=e.message;button.disabled=false;}
 });
})();
