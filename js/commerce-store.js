(() => {
 const api=window.NBJBCommerce;
 if(!api?.enabled)return;
 const status=document.querySelector('#commerce-store-status'), consent=document.querySelector('#commerce-terms');
 const terms=consent?.dataset.version;
 const buttons=[...document.querySelectorAll('[data-commerce-buy]')];
 const reset=()=>buttons.forEach(b=>{b.disabled=true;b.textContent='Purchase · Coming Soon';});
 function message(s){status.textContent=s;}
 async function init(){
 reset();
 if(!window.NBJBAuth?.user){message('Sandbox preview: sign in via My Library, then return here.');return;}
 try{
 const {products}=await api.call('catalog');
 let n=0;
 for(const b of buttons){const p=products.find(p=>p.slug===b.dataset.commerceBuy);if(p&&p.terms_version===terms){b.disabled=false;b.textContent='Test one-time checkout';n++;}}
 consent.hidden=n===0;
 message(n?'SANDBOX ONLY — no real money. Available test products are marked below.':'No sandbox products ready.');
 }catch{message('Checkout not available. Nothing has been charged.');}
 }
 for(const b of buttons)b.addEventListener('click',async()=>{
 if(!consent.querySelector('input').checked){message('Review and accept the draft purchase terms first.');return;}
 b.disabled=true;message('Preparing secure test checkout…');
 try{const result=await api.call('checkout',{slug:b.dataset.commerceBuy,termsVersion:terms,acceptTerms:true});location.assign(api.checkoutUrl(result.url));}
 catch(e){if(e.order&&/^[a-f0-9-]{36}$/.test(e.order)){location.assign('commerce-result.html?order='+encodeURIComponent(e.order));return;}message(e.message==='already_owned'?'This product is already in My Library.':'Checkout unavailable or needs review. No new charge is confirmed.');b.disabled=false;}
 });
 document.querySelectorAll('article.member-card details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open&&navigator.globalPrivacyControl!==true&&navigator.doNotTrack!=='1'&&window.NBJBAuth?.user)api.call('view',{slug:d.closest('article').id}).catch(()=>{});}));
 window.NBJBAuth?.ready?.then(()=>init());
})();