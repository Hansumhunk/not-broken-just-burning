// Frontier Engine public tools. Deterministic; uses only general radio choices.
// No private writing, local/session storage, backend request or selection telemetry.
(function(root) {
'use strict';
const MOMENT=Object.freeze({
 morning:"During a morning together",handoff:"Around a permitted transition",apart:"When we are apart and contact is permitted",bedtime:"During an evening together"
});
const NEED=Object.freeze({
 calm:"Offer a short, honest reassurance and listen without arguing about the other parent.",
 connection:"Give undivided attention: ask about one interest, then listen to the answer.",
 predictability:"Repeat one clear step in the same order, and explain changes simply if they occur."
});
const IDVALUE=Object.freeze({
 steadiness:"Choose a calm response instead of reacting to the first urge.",
 integrity:"Complete one small promise or responsibility you can actually keep.",
 connection:"Reach out respectfully to one safe person, without making them responsible for fixing your life.",
 courage:"Start an avoided but manageable task and stop at your chosen time."
});
const AREA=Object.freeze({
 self:"your daily routine",work:"work or practical responsibilities",relationships:"a healthy relationship"
});
function buildFather(moment,need,minutes){
 if(!Object.hasOwn(MOMENT,moment)||!Object.hasOwn(NEED,need)||!['5','15','30'].includes(minutes))return null;
 return ["MY FATHERHOOD ANCHOR",MOMENT[moment]+".","Time I can realistically offer: "+minutes+" minutes.","Child-centered action: "+NEED[need],"One promise: I will repeat a small, appropriate action when the opportunity is genuinely available.","Check: Does my child need something different? Do safety rules and parenting arrangements permit this?"].join("\n");
}
function buildIdentity(value,area,minutes){
 if(!Object.hasOwn(IDVALUE,value)||!Object.hasOwn(AREA,area)||!['5','15','30'].includes(minutes))return null;
 return ["MY IDENTITY COMPASS","Value to practice: "+value.charAt(0).toUpperCase()+value.slice(1)+".","Where: "+AREA[area]+".","For "+minutes+" minutes: "+IDVALUE[value],"Check: Could I repeat or adjust this tomorrow without punishing myself for an imperfect day?"].join("\n");
}
if(typeof module==='object'&&module.exports)module.exports={buildFather,buildIdentity};
if(typeof document==='undefined')return;
function wire(kind,build,keys,shareUrl){
 const form=document.getElementById('fe-'+kind+'-form'),result=document.getElementById('fe-'+kind+'-result'),
 output=document.getElementById('fe-'+kind+'-output'),summary=document.getElementById('fe-'+kind+'-summary'),
 status=document.getElementById('fe-'+kind+'-status'),heading=document.getElementById('fe-'+kind+'-heading');
 const run=form?.querySelector('[data-tool-run]'),fallback=document.getElementById('fe-'+kind+'-fallback');
 if(!form||!result||!output||!status||!heading||!summary||!run||!fallback)return;
 run.addEventListener('click',()=>{
  const values=keys.map(k=>form.querySelector('input[name="'+k+'"]:checked')?.value);
  const text=build(...values);
  if(!text){status.textContent='Choose one option in every section to build your next step.';return;}
  output.value=text;summary.textContent='This is a practical starting point, not a judgment or a requirement.';
  result.hidden=false;status.textContent='';heading.focus();
 });
 async function copy(value,fallback,message,el){
  try {if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(value);el.textContent=message}
  catch(_){if(fallback){fallback.focus();fallback.select();el.textContent='Select the highlighted text and use Copy on your device.';}else{el.textContent='Copy is unavailable. Copy this public link manually: '+shareUrl+'';}}
 }
 document.getElementById('fe-'+kind+'-copy')?.addEventListener('click',()=>{if(!result.hidden&&output.value)copy(output.value,output,'Routine copied. You control where it goes.',status)});
 document.getElementById('fe-'+kind+'-clear')?.addEventListener('click',()=>{form.querySelectorAll('input[type=radio]').forEach(input=>{input.checked=false});result.hidden=true;output.value='';status.textContent='Choose a new direction.';form.querySelector('input[type=radio]')?.focus()});
 const share=document.getElementById('fe-'+kind+'-share'),shareStatus=document.getElementById('fe-'+kind+'-share-status');
 share?.addEventListener('click',()=>copy(shareUrl,null,'Public tool link copied. No selections included.',shareStatus));
 // No form owner; enable controls only after initialization succeeds.
 form.querySelectorAll('fieldset').forEach(group=>{group.disabled=false});run.disabled=false;fallback.hidden=true;
}
wire('father',buildFather,['moment','need','minutes'],'https://notbrokenjustburning.com/fatherhood-stability-planner.html');
wire('identity',buildIdentity,['value','area','minutes'],'https://notbrokenjustburning.com/identity-rebuild-compass.html');
})(typeof globalThis==='object'?globalThis:this);