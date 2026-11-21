/* Default off. Enable only via separate sandbox preview build; never on production. */
(() => {
 const cfg=window.NBJBCommerceLive;
 const url=window.NBJBConfig?.supabaseUrl;
 // These checks are only a presentation switch. The live backend is the authority.
 const enabled=cfg?.enabled===true && !window.NBJBCommercePreview
   && location.origin==='https://notbrokenjustburning.com'
   && url==='https://plhbvtbvtxfzulsaxuim.supabase.co';
 async function call(action,body={}) {
  if(!enabled)throw Error('commerce_disabled');
  const auth=window.NBJBAuth;
  const current=await auth?.refresh();
  if(!current?.user?.id||!current.session?.access_token)throw Error('sign_in_required');
  const res=await fetch(url+'/functions/v1/commerce',{method:'POST',headers:{Authorization:'Bearer '+current.session.access_token,apikey:window.NBJBConfig.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({...body,action}),cache:'no-store'});
  const data=await res.json();
  if(window.NBJBAuth?.user?.id!==current.user.id)throw Error('account_changed');
  if(!res.ok){const e=Error(data.error||'commerce_unavailable');e.order=data.order;throw e;}
  return data;
 }
 function checkoutUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com')throw Error('unsafe_checkout_url');return u.href;}
 function downloadUrl(value){const u=new URL(value);if(u.origin!==url||!u.pathname.startsWith('/storage/v1/object/sign/nbjb-private-products/'))throw Error('unsafe_download_url');return u.href;}
 window.NBJBCommerce=Object.freeze({enabled,call,checkoutUrl,downloadUrl});
})();