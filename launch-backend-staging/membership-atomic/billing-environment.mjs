// Explicitly fail closed if a candidate is deployed to an unexpected project.
// No request-controlled environment, keys, user allowlist or return origin.
const QA='https://fgpkejlmpfkxgpktgdzm.supabase.co';
const PROD='https://plhbvtbvtxfzulsaxuim.supabase.co';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function billingEnvironment(get){
 const project=(get('SUPABASE_URL')??'').replace(/\/+$/,'');
 const mode=get('NBJB_MEMBERSHIP_MODE')??'live';
 if(mode==='qa'){
   const users=(get('NBJB_MEMBERSHIP_QA_USER_IDS')??'').split(',').map(s=>s.trim());
   const key=get('NBJB_MEMBERSHIP_QA_STRIPE_SECRET_KEY');
   const endpointSecret=get('NBJB_MEMBERSHIP_QA_STRIPE_WEBHOOK_SECRET');
   const account=get('NBJB_MEMBERSHIP_QA_STRIPE_ACCOUNT');
   let site;try{site=new URL(get('NBJB_MEMBERSHIP_QA_SITE_URL')??'')}catch{return null}
   if(project!==QA||users.length!==2||new Set(users).size!==2||!users.every(x=>UUID.test(x))||
      !/^([sr]k)_test_/.test(key??'')||!/^acct_[A-Za-z0-9]+$/.test(account??'')||
      (site.origin==='https://notbrokenjustburning.com'||site.hostname==='www.notbrokenjustburning.com')||
      site.username||site.password||site.pathname!=='/'||site.search||site.hash||
      !(site.protocol==='https:'||(site.protocol==='http:'&&['localhost','127.0.0.1'].includes(site.hostname)))) return null;
   return {live:false,key,endpointSecret,account,users,site:site.origin,tag:'qa'};
 }
 const key=get('STRIPE_LIVE_SECRET_KEY');
 if(mode!=='live'||project!==PROD||!/^([sr]k)_live_/.test(key??''))return null;
 return {live:true,key,endpointSecret:get('STRIPE_LIVE_WEBHOOK_SECRET'),users:[],site:(get('NBJB_SITE_URL')??'https://notbrokenjustburning.com').replace(/\/+$/,''),tag:'live'};
}
