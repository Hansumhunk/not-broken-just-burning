(() => {
 const api=window.NBJBCommerce,status=document.querySelector('#commerce-result-status'),refresh=document.querySelector('#commerce-refresh');
 const q=new URLSearchParams(location.search),order=q.get('order'),cancel=q.get('return')==='cancel';
 if(!api?.enabled){status.textContent='Product checkout is not available. No payment is confirmed on this page.';return;}
 if(!/^[0-9a-f-]{36}$/i.test(order||'')){status.textContent='No valid order reference. Open My Library or contact support.';return;}
 async function check(){
  refresh.disabled=true;
  try{const o=await api.call('status',{order});
  const messages={pending:cancel?'Checkout was left. Payment may still be pending; return to the Store to resume the same order.':'Payment verification pending. Your bank may show activity before access is confirmed. Refresh this status.',paid:o.owned?'Payment confirmed. Your product is available in My Library.':'Payment confirmed; access needs support review.',expired:'Checkout expired. No access granted. Return to the Store to try again.',failed:'Payment did not complete. Contact support or return to the Store.',refunded:'This order was refunded; future downloads have ended.',disputed:'This order is under payment review. Contact support.'};
  status.textContent=messages[o.status]||'Unable to confirm payment. Contact support.';
  }catch(e){status.textContent=e.message==='sign_in_required'?'Sign in to the account used for checkout, then return to this page.':'Unable to verify this order. Contact support if needed.';}
  finally{refresh.disabled=false;}
 }
 refresh.hidden=false;refresh.addEventListener('click',check);window.NBJBAuth?.ready?.then(check);
})();