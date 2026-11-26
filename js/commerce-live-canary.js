/* Production-only, unlinked, founder-approved canary lane. The Edge Function, not this file, enforces user/SKU authorization. */
(() => {
 const status=document.querySelector('#canary-status');
 const start=document.querySelector('#canary-start');
 const refresh=document.querySelector('#canary-refresh');
 const download=document.querySelector('#canary-download');
 const consent=document.querySelector('#canary-terms');
 const auth=window.NBJBAuth;
 const prod='https://plhbvtbvtxfzulsaxuim.supabase.co';
 const approvedContext=location.origin==='https://notbrokenjustburning.com'
   && window.NBJBConfig?.supabaseUrl===prod
   && !window.NBJBCommercePreview
   && window.NBJBCommerceLive?.enabled!==true;
 const slug='boundary-builder-workbook',termsVersion='live-v1';
 const order=(new URLSearchParams(location.search)).get('order');
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const setStatus=s=>{status.textContent=s;};
 const authenticated=async()=>{
  const a=await auth?.refresh();
  if(!a?.user?.id||!a.session?.access_token)throw Error('sign_in_required');
  return a;
 };
 const call=async(action,data={})=>{
  if(!approvedContext)throw Error('canary_context_invalid');
  const a=await authenticated();
  const response=await fetch(prod+'/functions/v1/commerce-live',{
   method:'POST',mode:'cors',cache:'no-store',credentials:'omit',
   headers:{'Content-Type':'application/json',
    'apikey':window.NBJBConfig.supabasePublishableKey,
    Authorization:'Bearer '+a.session.access_token},
   body:JSON.stringify({...data,action})
  });
  let body={};
  try{body=await response.json();}catch{}
  if(!response.ok)throw Error(body.error||'canary_not_available');
  if(window.NBJBAuth?.user?.id!==a.user.id)throw Error('account_changed');
  return body;
 };
 if(!approvedContext){setStatus('Canary is not available here. No purchase was initiated.');return;}
 start.addEventListener('click',async()=>{
  if(!consent.checked){setStatus('Review and accept the approved one-time digital product terms.');return;}
  start.disabled=true;setStatus('Requesting the individually authorized live canary checkout…');
  try{
   const result=await call('checkout',{slug,termsVersion,acceptTerms:true});
   const url=new URL(result.url);
   if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('unexpected_checkout_destination');
   location.assign(url.href);
  }catch(e){setStatus(e.message==='checkout_disabled'?'The canary is not yet authorized for this account and product.': 'Checkout unavailable: '+e.message);start.disabled=false;}
 });
 async function check(){
  if(!uuid.test(order||''))return;
  try{
   const o=await call('status',{order});
   if(o.status==='paid'&&o.owned){
    setStatus('Live payment and ownership are confirmed. Your workbook can be downloaded.');
    download.hidden=false;
   }else if(o.status==='pending'){
    setStatus('Order is pending Stripe confirmation. No access is granted until the signed webhook is reconciled.');
   }else{
    setStatus('Order status: '+String(o.status||'unavailable')+'. No download access is granted.');
   }
  }catch(e){setStatus('Purchase status unavailable. Check your account or contact support.');}
 }
 download.addEventListener('click',async()=>{
  download.disabled=true;
  try{
   const result=await call('download',{slug});
   const file=new URL(result.url);
   if(file.origin!==prod||!file.pathname.startsWith('/storage/v1/object/sign/nbjb-private-products/'))throw Error('untrusted_delivery_url');
   setStatus('Secure download link issued; the link expires in 60 seconds.');
   location.assign(file.href);
  }catch(e){setStatus('The file could not be retrieved; contact support before retrying payment.');}
  finally{download.disabled=false;}
 });
 refresh.addEventListener('click',check);
 auth?.ready?.then(async()=>{
  try{await authenticated();start.disabled=false;if(uuid.test(order||'')){refresh.hidden=false;await check();}else{setStatus('Signed in. Complete the terms check to request the authorized canary purchase.');}}
  catch{setStatus('Sign in to the existing NBJB account authorized for the live canary.');}
 });
})();
