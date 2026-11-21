/* Default off. Enable only via separate sandbox preview build; never on production. */
(() => {
 const cfg=window.NBJBCommercePreview;
 const url=window.NBJBConfig?.supabaseUrl;
 const ref=cfg?.sandboxRef;
 // QA preview only: separate test project and never the public website.
 const qa=cfg?.enabled===true && /^[a-z0-9]{20}$/.test(ref||'')
   && ref!=='plhbvtbvtxfzulsaxuim' && url==='https://'+ref+'.supabase.co'
   && !['notbrokenjustburning.com','www.notbrokenjustburning.com'].includes(location.hostname);
 // Independently gated LIVE storefront. The backend must separately verify this context.
 const live=window.NBJBCommerceLive?.enabled===true && !qa && !cfg
   && location.origin==='https://notbrokenjustburning.com'
   && url==='https://plhbvtbvtxfzulsaxuim.supabase.co';
 const enabled=qa||live;
 async function call(action,body={}) {
  if(!enabled)throw Error('commerce_disabled');
  const auth=window.NBJBAuth;
  const current=await auth?.refresh();
  const publicCatalog=live&&action==='catalog';
  if(!publicCatalog&&(!current?.user?.id||!current.session?.access_token))throw Error('sign_in_required');
  const requestHeaders={apikey:window.NBJBConfig.supabasePublishableKey,'Content-Type':'application/json'};
  if(current?.session?.access_token)requestHeaders.Authorization='Bearer '+current.session.access_token;
  const res=await fetch(url+'/functions/v1/commerce',{method:'POST',headers:requestHeaders,body:JSON.stringify({...body,action}),cache:'no-store'});
  const data=await res.json();
  if(!publicCatalog&&window.NBJBAuth?.user?.id!==current.user.id)throw Error('account_changed');
  if(!res.ok){const e=Error(data.error||'commerce_unavailable');e.order=data.order;throw e;}
  return data;
 }
 function checkoutUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com')throw Error('unsafe_checkout_url');return u.href;}
 function downloadUrl(value){const u=new URL(value);if(u.origin!==url||!u.pathname.startsWith('/storage/v1/object/sign/nbjb-private-products/'))throw Error('unsafe_download_url');return u.href;}
 window.NBJBCommerce=Object.freeze({enabled,mode:qa?'sandbox':live?'live':'off',call,checkoutUrl,downloadUrl});
})();