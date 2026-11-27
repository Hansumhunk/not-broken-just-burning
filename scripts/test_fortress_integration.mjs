// Offline/synthetic only. Never log or commit private lesson bodies or PDF bytes.
// Optional private fixture execution: supply NBJB_FORTRESS_PRIVATE_FIXTURE and
// NBJB_FORTRESS_PRIVATE_PDF outside this repository. No provider/network calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto, createHash } from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const slug='when-protection-becomes-a-prison';
const edition='Fortress Project v1.1 (Directive 002)';
const sha='f4561ff8594405d372f33309bdea111bc2fecdd45e5e56eb4ffdcb1413b60604';
const size=182857;
const future='2999-01-01T00:00:00Z', past='2000-01-01T00:00:00Z';
const paid={tier:'paid_member',status:'active',valid_from:past,valid_until:future,provider:'stripe'};
const free={...paid,tier:'free_member'};
const item={slug,track_slug:'life-rebuilt',lesson_number:6,title:'Synthetic title',summary:'Synthetic summary',
  status:'published',content:{sourceEdition:edition,workbook:{slug:'fortress-audit',blocks:[{type:'paragraph',text:'Synthetic workbook'}]},
  blocks:[{type:'paragraph',text:'Synthetic protected body'}]}};
const syntheticBytes=new Uint8Array(size);
const dummy=new Blob([syntheticBytes],{type:'application/pdf'});
const fakeDigest=Uint8Array.from(sha.match(/../g).map(h=>parseInt(h,16)));
const cryptoMock={subtle:{digest:async()=>fakeDigest.buffer}};
let code=read('supabase/functions/read-flamewalker-lesson/index.ts');
code=code.replace(/^import \{ withSupabase \} from "[^"]+";\s*/,'')
  .replace('function reply(data: unknown,','function reply(data,')
  .replace(/let body: \{ slug\?: unknown; action\?: unknown; section\?: unknown \};/,'let body;')
  .replace('(v: string | null, defaultIfNull: boolean)','(v, defaultIfNull)')
  .replace('(v: string | null, future: boolean)','(v, future)')
  .replace('export default {','globalThis.endpoint = {');
function harness(o={}){
  const user=o.user===undefined?'ordinary':o.user;
  const first=o.member===undefined?paid:o.member;
  const latest=o.latest===undefined?first:o.latest;
  const lesson=o.lesson===undefined?item:o.lesson;
  const later=o.laterLesson===undefined?lesson:o.laterLesson;
  const rows=o.rows??(lesson?[lesson]:[]);
  const trace=[];let memberReads=0,lessonReads=0;
  const admin={
    from(table){
      let wanted,statuses,selected;
      return {
        select(fields){selected=fields;return this;},
        eq(k,v){if(k==='slug')wanted=v;if(k==='status')statuses=[v];return this;},
        in(k,v){if(k==='status')statuses=v;return this;},
        async order(){trace.push(['catalog',selected]);return {data:rows.filter(x=>statuses.includes(x.status)).map(({slug,track_slug,lesson_number,title,summary,status})=>({slug,track_slug,lesson_number,title,summary,status})),error:null};},
        async maybeSingle(){
          trace.push([table,selected,wanted]);
          if(table==='membership_entitlements'){
            memberReads++;
            return {data:memberReads===1?first:latest,error:(o.memberError&&memberReads===1)||(o.latestError&&memberReads>1)?{}:null};
          }
          if(table==='flamewalker_premium_lessons'){
            lessonReads++;const v=lessonReads===1?lesson:later;
            return {data:v&&v.slug===wanted&&(!statuses||statuses.includes(v.status))?v:null,error:o.lessonError?{}:null};
          }
          throw Error('unexpected table');
        }
      };
    },
    storage:{from(bucket){return {download:async key=>{trace.push(['download',bucket,key]);return {data:o.file===undefined?dummy:o.file,error:o.fileError?{}:null};}};}}
  };
  const ctx=vm.createContext({Response,Request,Blob,Uint8Array,Date,console,crypto:o.crypto??cryptoMock,
    withSupabase:(opts,handler)=>{assert.equal(opts.auth,'user');return handler;},
    Deno:{env:{get:k=>k==='NBJB_SANDBOX_TEST_USER_ID'?'reviewer':undefined}}});
  vm.runInContext(code,ctx,{timeout:1000});
  return {trace,call:(body={slug},method='POST')=>ctx.endpoint.fetch(new Request('https://isolated.invalid/read',{method,...(method==='POST'?{body:JSON.stringify(body)}:{})}),{userClaims:user?{id:user}:null,supabaseAdmin:admin})};
}
async function denied(h,status,body={slug,action:'workbook'}){
  const res=await h.call(body);assert.equal(res.status,status);
  assert.match(res.headers.get('cache-control'),/no-store/);
  const json=await res.json();assert.ok(json.error);assert.equal(json.lesson,undefined);
  assert.equal(json.url,undefined);
}
test('guest/free/expired/revoked/future/invalid/missing Stripe expiry cannot read either protected object',async()=>{
  const cases=[
    [{user:null},401],[{member:free},403],[{member:null},403],
    [{member:{...paid,valid_until:past}},403],[{member:{...paid,status:'revoked'}},403],
    [{member:{...paid,valid_from:future}},403],[{member:{...paid,valid_until:'invalid'}},403],
    [{member:{...paid,valid_until:null}},403],[{memberError:true},503]
  ];
  for(const [opts,status] of cases){for(const body of [{slug},{slug,action:'workbook'}]){
    const h=harness(opts);await denied(h,status,body);assert.equal(h.trace.filter(x=>x[0]==='download').length,0);
  }}
});
test('review visibility is isolated from ordinary paid and free catalog/read access',async()=>{
  const preview={...item,status:'editorial_review'};
  const other={...item,slug:'old-lesson',status:'published'};
  const draft={...item,slug:'old-draft',status:'editorial_review'};
  for(const member of [paid,free]){
    const h=harness({member,lesson:preview,rows:[preview,other,draft]});
    const catalog=await (await h.call({action:'catalog'})).json();
    assert.deepEqual(catalog.lessons.map(x=>x.slug),['old-lesson','old-draft']);
    assert.ok(catalog.lessons.every(x=>!('content'in x)));
  }
  await denied(harness({lesson:preview}),404,{slug});
  await denied(harness({lesson:preview}),404);
  const review=harness({user:'reviewer',member:free,lesson:preview,rows:[preview,other,draft]});
  const catalog=await (await review.call({action:'catalog'})).json();
  assert.ok(catalog.lessons.some(x=>x.slug===slug));
  const read=await (await review.call({slug})).json();
  assert.equal(read.lesson.status,'editorial_review');assert.equal(read.workbookAvailable,true);
  const download=await review.call({slug,action:'workbook'});assert.equal(download.status,200);
  await denied(harness({user:'reviewer',member:free}),403,{slug});
  await denied(harness({user:'reviewer',member:free}),403);
});
test('paid authorized version succeeds; grace policy is preserved; no bearer or caller-controlled object key',async()=>{
  for(const member of [paid,{...paid,status:'trialing'},{...paid,status:'past_due'}]){
    const h=harness({member});
    const response=await h.call({slug});
    const json=await response.json();assert.equal(json.workbookAvailable,true);
    assert.equal(json.lesson.content.sourceEdition,edition);assert.equal(json.url,undefined);
    const dl=await h.call({slug,action:'workbook',bucket:'untrusted',path:'untrusted'});
    assert.equal(dl.status,200);assert.match(dl.headers.get('cache-control'),/private, no-store/);
    assert.equal(dl.headers.get('content-type'),'application/octet-stream');
    assert.match(dl.headers.get('content-disposition'),/The-Fortress-Audit.pdf/);
    assert.match(dl.headers.get('x-robots-tag'),/noindex/);assert.equal((await dl.arrayBuffer()).byteLength,size);
    assert.deepEqual(h.trace.filter(x=>x[0]==='download'),[['download','nbjb-private-products','curriculum/fortress/fortress-audit-v1.1.pdf']]);
  }
});
test('missing/wrong/changed assets and changed entitlement or edition fail closed',async()=>{
  const badEdition={...item,content:{...item.content,sourceEdition:'unapproved'}};
  const other={...item,slug:'old-lesson'};
  for(const [opts,status,request] of [
    [{file:null},503],[{fileError:true},503],[{file:new Blob(['bad'])},503],
    [{crypto:webcrypto},503],[{latest:{...paid,status:'revoked'}},403],
    [{latest:{...paid,valid_until:past}},403],[{latestError:true},503],
    [{laterLesson:{...item,status:'draft'}},403],[{laterLesson:badEdition},403],
    [{lesson:badEdition},404],[{lesson:other},404,{slug:'old-lesson',action:'workbook'}],
    [{lesson:{...item,status:'draft'}},404]
  ]) await denied(harness(opts),status,request);
  const h=harness({lesson:other});const old=await (await h.call({slug:'old-lesson'})).json();
  assert.equal(old.lesson.slug,'old-lesson');assert.equal(old.workbookAvailable,undefined);
  const audio=await h.call({slug,action:'audio'});assert.equal(audio.status,410);
});
test('invalid slug and method denied; old public content is not expanded',async()=>{
  await denied(harness(),400,{slug:'../secret',action:'workbook'});
  assert.equal((await harness().call({},'GET')).status,405);
  for(const file of ['flamewalker-plus.html','member-premium-lesson.html','member-lessons.html','sitemap.xml','join.html']){
    assert.ok(!read(file).includes(slug),file);
    assert.ok(!read(file).includes('Synthetic protected body'),file);
  }
});
test('reader chapters and references remain separate; protected version checked before rendering',()=>{
  const reader=read('js/member-premium-lesson.js');
  const section=reader.slice(reader.indexOf('  const major ='),reader.indexOf('  function label(step)'));
  const env=vm.runInNewContext('const slug='+JSON.stringify(slug)+'; const prettyHeading=x=>x;'+section+'\n({sectionize})',{},{timeout:1000});
  const blocks=[{type:'heading',text:'OPENING'},{type:'paragraph',text:'Opening paragraph'}];
  for(let i=1;i<=12;i++)blocks.push({type:'heading',text:'PART '+i+' — SYNTHETIC'},{type:'paragraph',text:'Teaching content '+i});
  blocks.push({type:'heading',text:'Research notes and references'},{type:'paragraph',text:'[1] Synthetic DOI https://doi.org/10.0000/example'});
  const steps=env.sectionize(blocks);
  assert.equal(steps.length,14);assert.equal(steps.at(-1).title,'Research notes and references');
  assert.ok(reader.indexOf("data.lesson.content?.sourceEdition !== fortressEdition")<reader.indexOf('renderLesson(data.lesson)'));
  assert.ok(reader.indexOf('renderLesson(data.lesson)')<reader.indexOf('installFortressCompanion(data.lesson, data.workbookAvailable === true)'));
  assert.match(reader,/body: \{ slug, action: 'workbook' \}/);
  assert.match(reader,/URL\.revokeObjectURL/);assert.match(reader,/pagehide', deactivate/);
  assert.match(reader,/a\.referrerPolicy = 'no-referrer'/);
});
test('private fixture (optional owner-local only) matches source mapping, exact PDF and actual endpoint/reader',async t=>{
  const file=process.env.NBJB_FORTRESS_PRIVATE_FIXTURE,pdf=process.env.NBJB_FORTRESS_PRIVATE_PDF;
  if(!file&&!pdf)return t.skip('Actual protected assets intentionally absent from repository and CI.');
  assert.ok(file&&pdf);
  const raw=fs.readFileSync(file), row=JSON.parse(raw), bytes=fs.readFileSync(pdf);
  assert.equal(createHash('sha256').update(raw).digest('hex'),'5be6a7b07c24c19ac868989d6252ec0e188cc9863c41f15ffab0b5e950a76628');
  assert.equal(row.slug,slug);assert.equal(row.status,'editorial_review');
  assert.equal(row.content.blocks.length,132);assert.equal(row.content.exercise.prompts.length,8);
  assert.equal(row.content.workbook.blocks.length,111);assert.equal(row.content.comprehension.length,8);
  assert.equal(bytes.length,size);assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);
  const h=harness({user:'reviewer',member:free,lesson:row,file:new Blob([bytes]),crypto:webcrypto});
  const response=await h.call({slug,action:'workbook'});assert.equal(response.status,200);
  assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),sha);
  const reader=read('js/member-premium-lesson.js');
  const section=reader.slice(reader.indexOf('  const major ='),reader.indexOf('  function label(step)'));
  const env=vm.runInNewContext('const slug='+JSON.stringify(slug)+'; const prettyHeading=x=>x;'+section+'\n({sectionize})',{},{timeout:1000});
  const steps=env.sectionize(row.content.blocks);
  for(let i=1;i<=12;i++)assert.ok(steps.some(x=>x.title.startsWith('PART '+i+' —')));
  assert.ok(steps.some(x=>x.title==='Research notes and references'));
  assert.equal(steps.flatMap(x=>x.blocks).filter(x=>/^\[\d+\].*https:\/\//.test(x.text)).length,13);
});
