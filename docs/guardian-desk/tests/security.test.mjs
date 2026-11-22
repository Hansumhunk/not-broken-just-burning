// Local synthetic security suite; NOT hosted Supabase/Auth/RLS acceptance.
// Run from repository root: node --experimental-strip-types --test docs/guardian-desk/tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 TOPICS,validateSubmission,containsSecret,canonicalDedupe,isImmediateDanger,
 emergencyResponse,safePublicTicketResult,classifyTicket,suppressedExecutiveAggregate
} from '../guardian-support-core.mjs';
import { handle,gateEnvironment } from '../edge/guardian-support-intake/index.ts';

const valid={topic:'technical_problem',summary:'My synthetic lesson page does not load.',feature_slug:'member-lessons'};
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ticket='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const QA='fgpkejlmpfkxgpktgdzm';
const env={
 NBJB_GUARDIAN_QA_ENABLED:'true',
 NBJB_GUARDIAN_PROJECT_REF:QA,
 SUPABASE_URL:'https://'+QA+'.supabase.co',
 NBJB_GUARDIAN_ALLOWED_ORIGIN:'https://qa.example.test',
 SUPABASE_ANON_KEY:'fake-public',
 SUPABASE_SERVICE_ROLE_KEY:'fake-private',
 NBJB_GUARDIAN_HMAC_SECRET:'TEST-NOT-A-REAL-KEY-012345678901234567890'
};
const get=k=>env[k];
const req=(value=valid,headers={})=>new Request('https://qa.example.test',{
 method:'POST',headers:{'content-type':'application/json',origin:'https://qa.example.test',
 authorization:'Bearer synthetic-auth-token',...headers},body:JSON.stringify(value)
});
const resp=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
async function withMock(callback, auth={id:uuid}, database={ticket_id:ticket,duplicate:false,status:'NEW'}){
 const original=globalThis.fetch, seen=[];
 globalThis.fetch=async(url,options)=>{
   seen.push({url:String(url),body:options.body?JSON.parse(options.body):null});
   if(String(url).includes('/auth/v1/user')) return auth instanceof Error?Promise.reject(auth):resp(auth,auth.statusCode||200);
   if(String(url).includes('/rest/v1/rpc/')) return database instanceof Error?Promise.reject(database):resp(database,database.statusCode||200);
   throw Error('Unexpected fake network endpoint');
 };
 try{return await callback(seen);}finally{globalThis.fetch=original;}
}
test('nine supported topics',()=>assert.equal(TOPICS.length,9));
test('input validates correct ticket',()=>assert.equal(validateSubmission(valid).ok,true));
test('forged owner field refused',()=>assert.equal(validateSubmission({...valid,owner_user_id:uuid}).code,'UNEXPECTED_FIELD'));
test('forged administrative authority refused',()=>assert.equal(validateSubmission({...valid,is_staff:true}).code,'UNEXPECTED_FIELD'));
test('not allowed payment command field refused',()=>assert.equal(validateSubmission({...valid,refund:true}).code,'UNEXPECTED_FIELD'));
test('invalid topic rejected',()=>assert.equal(validateSubmission({...valid,topic:'self_promote'}).code,'INVALID_TOPIC'));
test('empty summary rejected',()=>assert.equal(validateSubmission({...valid,summary:' '}).code,'INVALID_SUMMARY'));
test('oversized summary rejected',()=>assert.equal(validateSubmission({...valid,summary:'x'.repeat(1201)}).code,'INVALID_SUMMARY'));
test('secret token patterns rejected',()=>assert.equal(containsSecret('password: secret-123'),true));
test('payment numbers rejected',()=>assert.equal(containsSecret('4444 3333 2222 1111'),true));
test('dedupe owner isolation',()=>{
 const a=validateSubmission(valid);assert.notEqual(canonicalDedupe('ownerA',a),canonicalDedupe('ownerB',a));
});
test('routine severity not escalated to critical unverified',()=>{
 for(const topic of TOPICS)assert.ok(['P2','P3'].includes(classifyTicket(validateSubmission({...valid,topic})).priority));
});
test('billing queue is revenue forge',()=>assert.equal(classifyTicket(validateSubmission({...valid,topic:'billing_subscriptions'})).suggested_team,'revenue_forge'));
test('safety language routed',()=>assert.equal(isImmediateDanger('I am going to kill myself'),true));
test('safety page says no ticket',()=>assert.match(emergencyResponse().message,/No support ticket/));
test('no ticket ID invented for wrong database payload',()=>assert.equal(safePublicTicketResult({success:true}),null));
test('public aggregates suppress tiny cohorts',()=>assert.equal(suppressedExecutiveAggregate({total:2,groups:{billing:1}}).groups.billing,null));
test('environment fails closed without QA flag',()=>assert.equal(gateEnvironment(k=>k==='NBJB_GUARDIAN_QA_ENABLED'?'false':get(k)),false));
test('environment fails closed on production host',()=>assert.equal(gateEnvironment(k=>k==='SUPABASE_URL'?'https://wrong.supabase.co':get(k)),false));
test('anonymous request rejected',async()=>assert.equal((await handle(req(valid,{authorization:''}),get)).status,401));
test('provider-verified user used for ownership, not request',async()=>{
 await withMock(async seen=>{
 const r=await handle(req(),get);assert.equal(r.status,201);assert.equal(seen[1].body.p_owner_user_id,uuid);
 assert.match(seen[1].body.p_dedupe_fingerprint,/^[0-9a-f]{64}$/);
 });
});
test('auth verification failure never reaches database',async()=>{
 await withMock(async seen=>{assert.equal((await handle(req(),get)).status,401);assert.equal(seen.length,1);},{statusCode:401});
});
test('provider outage gives no ticket success',async()=>{
 await withMock(async seen=>{const r=await handle(req(),get);assert.equal(r.status,503);assert.equal((await r.json()).ticket_id,undefined);},new Error('offline'));
});
test('credential-containing input never reaches database',async()=>{
 await withMock(async seen=>{assert.equal((await handle(req({...valid,summary:'password: myPassword cannot log in'}),get)).status,400);assert.equal(seen.length,1);});
});
test('safety text does not write a ticket',async()=>{
 await withMock(async seen=>{const r=await handle(req({...valid,summary:'I am going to kill myself'}),get);assert.equal(r.status,200);assert.equal(seen.length,1);});
});
test('duplicate does not claim a new case',async()=>{
 await withMock(async()=>{const r=await handle(req(),get);assert.equal(r.status,200);assert.equal((await r.json()).status,'IN_PROGRESS');},
 {id:uuid},{ticket_id:ticket,duplicate:true,status:'IN_PROGRESS'});
});
test('Postgres rate limit error maps 429',async()=>{
 await withMock(async()=>assert.equal((await handle(req(),get)).status,429),
 {id:uuid},{statusCode:400,code:'P1001'});
});
test('uncertain persistence response fails closed',async()=>{
 await withMock(async()=>{const r=await handle(req(),get);assert.equal(r.status,503);assert.equal((await r.json()).ticket_id,undefined);},
 {id:uuid},new Error('network timeout'));
});
const ddl=readFileSync(new URL('../PROPOSED_TICKET_SCHEMA.sql',import.meta.url),'utf8');
test('DDL is explicitly unapplied',()=>assert.match(ddl,/DRAFT, NOT APPLIED/));
test('account deletion does not cascade support tickets',()=>assert.match(ddl,/ON DELETE SET NULL/));
test('event evidence not deleted by cascading ticket delete',()=>assert.match(ddl,/ON DELETE RESTRICT/));
test('all three tables have RLS',()=>assert.equal((ddl.match(/ENABLE ROW LEVEL SECURITY/g)||[]).length,3));
test('anonymous write privilege revoked',()=>assert.match(ddl,/REVOKE ALL ON TABLE public.guardian_support_tickets FROM PUBLIC,anon,authenticated/));
test('server-only atomic intake procedure',()=>assert.match(ddl,/REVOKE ALL ON FUNCTION public.guardian_support_accept/));
test('atomic cap represented with conflict update',()=>assert.match(ddl,/WHERE r.accepted_count < 5/));
