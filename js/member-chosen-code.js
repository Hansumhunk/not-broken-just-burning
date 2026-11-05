/* Flamewalker+ Chosen Manhood Code — an in-lesson guided exercise.
   Member answers stay in memory until the member explicitly chooses Copy or Save.
   This UI never transmits reflection text. The original protected manuscript
   continues to be rendered by the premium reader. */
(() => {
  'use strict';
  const repeat = {
    A: {
      title:'KEEP', name:'Strength', initial:3, maximum:5,
      prompts:[
        ['What is it?','Which inherited trait, rule, or value is worth preserving?'],
        ['Where did I learn it?','Name the person, situation, or example.'],
        ['Why do I choose it now?','What makes this a value you want to carry forward?']
      ]
    },
    B: {
      title:'REFORGE', name:'Rule', initial:3, maximum:5,
      prompts:[
        ['Old rule','What was the original inherited rule?'],
        ['Useful value inside it','What value deserves to survive?'],
        ['Cost of the old form','What does this rule cost you or others now?'],
        ['Chosen rule','Rewrite it in a healthier form you can practice.']
      ]
    },
    C: {
      title:'RETIRE', name:'Rule', initial:1, maximum:5,
      prompts:[
        ['Old rule','What rule no longer deserves authority?'],
        ['What it once protected','What did this rule help you avoid or survive?'],
        ['What it costs now','What is its current effect on your life?'],
        ['What replaces it','What concrete chosen rule takes its place?']
      ]
    },
    PRESSURE: {
      title:'THE PRESSURE TEST',name:'Pressure state',initial:3,maximum:3,
      prompts:[
        ['Pressure state','Which situation tends to pull you back into an old rule?'],
        ['What old rule tends to return?','Name it without shame or exaggeration.'],
        ['What behavior does that rule produce?','Describe the observable response.'],
        ['What chosen rule should replace it?','Write the replacement principle.'],
        ['What small action signals the difference?','Name one action you control.']
      ]
    }
  };
  const anchors=[
    'Steadiness','Direction','Strength with restraint',
    'Protection with boundaries','Responsibility with self-respect','Brotherhood and connection'
  ];
  const review=[
    'Did I do it?','What got in the way?','Which old rule returned?',
    'What helped?','What needs to change?'
  ];
  const smaller=[
    'One rule I inherited was…','I choose instead…','This week I will prove that by…'
  ];
  function n(tag,cls,text) {
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function writeField(name,help,max=420){
    const root=n('div','premium-map-field');
    const label=n('label');
    const strong=n('strong','',name);
    const small=n('small','',help);
    const input=n('textarea');
    input.rows=3;
    input.maxLength=max;
    input.autocomplete='off';
    input.placeholder='Your response…';
    label.append(strong,small,input);
    root.append(label);
    return {root,input};
  }
  function row(body){
    const root=n('div','premium-map-row');
    const reading=n('div','premium-map-reading');
    const writing=n('div','premium-map-writing');
    root.append(reading,writing);
    body.append(root);
    return {root,reading,writing};
  }
  function create({slug,parking,saveWholeToWork,getFinalResponses}){
    if(slug!=='inherited-vs-chosen-manhood'||!parking)return null;
    const sets={};
    function createSet(key){
      const spec=repeat[key];
      const set={spec,records:[],index:0,targets:[],parking:n('div'),controls:n('div','premium-workspace-records')};
      const label=n('label','premium-workspace-picker-label','Select '+spec.name.toLowerCase()+' to examine');
      const select=n('select');
      select.setAttribute('aria-label','Select '+spec.name.toLowerCase());
      label.append(select);
      const add=n('button','button button-ghost','Add another '+spec.name.toLowerCase());
      add.type='button';
      set.controls.append(label,add);
      set.select=select;set.add=add;
      function addRecord(){
        const rec={fields:spec.prompts.map(([title,help])=>writeField(title,help))};
        rec.fields.forEach(f=>set.parking.append(f.root));
        set.records.push(rec);
      }
      set.show=()=>{
        for(const rec of set.records)for(const f of rec.fields)set.parking.append(f.root);
        const active=set.records[set.index];
        for(let i=0;i<active.fields.length;i++){
          if(set.targets[i])set.targets[i].append(active.fields[i].root);
        }
        select.value=String(set.index);
        add.disabled=set.records.length>=spec.maximum;
      };
      set.update=()=>{
        select.replaceChildren();
        set.records.forEach((_,i)=>{
          const option=n('option','',spec.name+' '+(i+1));
          option.value=String(i);
          select.append(option);
        });
        set.show();
      };
      for(let i=0;i<spec.initial;i++)addRecord();
      select.addEventListener('change',()=>{
        set.index=Math.max(0,Math.min(Number(select.value)||0,set.records.length-1));
        set.show();
      });
      add.addEventListener('click',()=>{
        if(set.records.length>=spec.maximum)return;
        addRecord();set.index=set.records.length-1;set.update();
      });
      set.update();
      parking.append(set.parking,set.controls);
      return set;
    }
    for(const key of Object.keys(repeat))sets[key]=createSet(key);
    const simple={
      D:anchors.map(a=>writeField(a,'Write one personal statement for this strength anchor.',360)),
      E:[writeField('One observable action for the next seven days',
        'Choose a realistic behavior inside your control, connected to one chosen principle.',500)],
      F:review.map(q=>writeField(q,'Reflect after the seven-day practice period. It is okay to leave this blank for now.',400)),
      SMALL:smaller.map(q=>writeField(q,'The smaller three-line version is optional.',350))
    };
    Object.values(simple).flat().forEach(f=>parking.append(f.root));
    const controls=n('div','premium-pause-actions premium-workspace-actions');
    const copy=n('button','button button-ghost','Copy Full Personal Code');
    const save=n('button','button button-primary','Save Full Code to My Work');
    copy.type=save.type='button';
    const status=n('p','premium-map-status');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    controls.append(copy,save);
    parking.append(controls,status);
    let preview=null;

    function park(){
      for(const set of Object.values(sets)){
        set.targets=[];
        set.show();
        parking.append(set.controls);
      }
      for(const f of Object.values(simple).flat())parking.append(f.root);
      parking.append(controls,status);
    }
    function matches(step){
      return !step.exercise && (
        /part 12.*one-page chosen manhood code/i.test(step.title)||
        /part 13.*pressure test/i.test(step.title)||
        /the smaller door/i.test(step.title)
      );
    }
    function render(step,body,appendText){
      if(!matches(step))return;
      const text=(target,block)=>appendText(target,block.kind==='heading'?'h3':'p',block.text);
      body.append(n('p','premium-map-continuity',
        'Read the prompt on the left, write your answer on the right. '+
        'Your responses follow you through this lesson, but are not automatically saved.'));
      const title=step.title.toLowerCase();
      if(title.includes('pressure test')){
        const set=sets.PRESSURE;
        let active=null,inExample=false;
        for(const block of step.blocks){
          const t=block.text.trim();
          if(/^Choose the three states most likely to pull you backward\./i.test(t)){
            text(body,block);
            body.append(set.controls);
            active=row(body);
            active.reading.append(n('p','', 'Pressure state — which one are you examining?'));
            set.targets[0]=active.writing;
            continue;
          }
          const m=/^([1-4])\.\s+/.exec(t);
          if(m&&!inExample){
            active=row(body);
            set.targets[Number(m[1])]=active.writing;
          }
          if(/^EXAMPLE\b/i.test(t)){inExample=true;active=null;}
          text(active?active.reading:body,block);
        }
        set.show();
      }else if(title.includes('smaller door')){
        let i=0;
        for(const block of step.blocks){
          if(i<3 && /^“(?:One rule I inherited|I choose instead|This week I will prove)/i.test(block.text.trim())){
            const r=row(body);
            text(r.reading,block);
            r.writing.append(simple.SMALL[i++].root);
          }else text(body,block);
        }
      }else{
        let stage=null,bullet=0;
        for(const block of step.blocks){
          const t=block.text.trim();
          const match=block.kind==='heading'?/^PART\s+([A-F])\s+—/i.exec(t):null;
          if(match){
            stage=match[1].toUpperCase();
            bullet=0;
            text(body,block);
            if(sets[stage])body.append(sets[stage].controls);
            if(stage==='F')body.append(n('p','premium-map-continuity',
              'Review these questions after seven days of practice. You can save your code now with this section unfinished.'));
            continue;
          }
          if(stage&&sets[stage]&&/^\-\s+/.test(t)){
            const set=sets[stage];
            if(bullet<set.spec.prompts.length){
              const r=row(body);
              text(r.reading,block);
              set.targets[bullet++]=r.writing;
              continue;
            }
          }
          if(stage==='D'){
            const ix=anchors.findIndex(a=>a.toLowerCase()+'.'===t.toLowerCase());
            if(ix>=0){
              const r=row(body);
              text(r.reading,block);
              r.writing.append(simple.D[ix].root);
              continue;
            }
          }
          if(stage==='E'&&/^Choose one behavior for the next seven days\./i.test(t)){
            const r=row(body);
            text(r.reading,block);
            r.writing.append(simple.E[0].root);
            continue;
          }
          if((stage==='F'||step.continuation>0)&&/^\-\s+/.test(t)){
            const ix=review.findIndex(q=>('- '+q).toLowerCase()===t.toLowerCase());
            if(ix>=0){
              const r=row(body);
              text(r.reading,block);
              r.writing.append(simple.F[ix].root);
              continue;
            }
          }
          text(body,block);
        }
        for(const key of ['A','B','C'])sets[key].show();
      }
      body.append(controls,status);
    }
    function answered(){
      return Object.values(sets).some(set=>set.records.some(rec=>
        rec.fields.some(f=>f.input.value.trim()))) ||
        Object.values(simple).flat().some(f=>f.input.value.trim());
    }
    function documentText(){
      const lines=[
        'NOT BROKEN JUST BURNING',
        'MY CHOSEN MANHOOD CODE',
        'Personal working document — Inherited Manhood vs. Chosen Manhood',
        ''
      ];
      function addAnswer(q,v){
        lines.push('',q,v?.trim()||'[Not answered yet]');
      }
      for(const key of ['A','B','C']){
        const set=sets[key];
        lines.push('','PART '+key+' — '+set.spec.title);
        let count=0;
        set.records.forEach((rec,i)=>{
          if(!rec.fields.some(f=>f.input.value.trim()))return;
          count++;
          lines.push('',set.spec.name.toUpperCase()+' '+(i+1));
          set.spec.prompts.forEach(([question],j)=>addAnswer(question,rec.fields[j].input.value));
        });
        if(!count)lines.push('','[Not completed yet]');
      }
      lines.push('','PART D — BUILD: SIX PERSONAL STRENGTH ANCHORS');
      anchors.forEach((a,i)=>addAnswer(a,simple.D[i].input.value));
      lines.push('','PART E — ACT: SEVEN-DAY COMMITMENT');
      addAnswer('One observable, realistic behavior within my control',simple.E[0].input.value);
      lines.push('','PART F — REVIEW AFTER SEVEN DAYS');
      review.forEach((q,i)=>addAnswer(q,simple.F[i].input.value));
      const set=sets.PRESSURE;
      lines.push('','THE PRESSURE TEST — THREE STATES');
      let any=false;
      set.records.forEach((rec,i)=>{
        if(!rec.fields.some(f=>f.input.value.trim()))return;
        any=true;lines.push('','PRESSURE STATE '+(i+1));
        set.spec.prompts.forEach(([q],j)=>addAnswer(q,rec.fields[j].input.value));
      });
      if(!any)lines.push('','[Not completed yet]');
      if(simple.SMALL.some(f=>f.input.value.trim())){
        lines.push('','THE SMALLER DOOR — OPTIONAL THREE-LINE CODE');
        smaller.forEach((q,i)=>addAnswer(q,simple.SMALL[i].input.value));
      }
      const final=typeof getFinalResponses==='function'?getFinalResponses():[];
      if(Array.isArray(final)&&final.some(x=>x?.response?.trim())){
        lines.push('','FINAL GUIDED REFLECTION');
        final.filter(x=>x?.response?.trim()).forEach(x=>addAnswer(x.prompt||'Reflection',x.response));
      }
      lines.push('','Written for personal reflection and practice. This is not a professional assessment or diagnosis.');
      return lines.join('\n');
    }
    function progress(){
      let count=0;
      for(const set of Object.values(sets))for(const rec of set.records)
        for(const f of rec.fields)if(f.input.value.trim())count++;
      for(const f of Object.values(simple).flat())if(f.input.value.trim())count++;
      return count+' answers entered · '+(simple.F.some(f=>f.input.value.trim())?
        'Seven-day review started':'Seven-day review can be completed later');
    }
    async function copyCode(out){
      if(!answered()){out.textContent='Answer at least one question first.';return;}
      try{
        await navigator.clipboard.writeText(documentText());
        out.textContent='Full personal code copied. Paste it somewhere private to keep it.';
      }catch(_){out.textContent='Copy was blocked. Select and copy the complete text manually.';}
    }
    function saveCode(out){
      if(!answered()){out.textContent='Answer at least one question first.';return;}
      const full=documentText();
      if(full.length>20000){
        out.textContent='The complete code is too long for one local entry. Use Copy to keep all answers.';
        return;
      }
      if(typeof saveWholeToWork!=='function'){
        out.textContent='Saving is unavailable on this device. Use Copy to keep your work.';
        return;
      }
      saveWholeToWork(full,'My Chosen Manhood Code',out);
    }
    copy.addEventListener('click',()=>copyCode(status));
    save.addEventListener('click',()=>saveCode(status));
    function renderCompletion(container){
      if(!container)return;
      if(!preview){
        const section=n('section','premium-worksheet-completion');
        const heading=n('h3','','My Chosen Manhood Code');
        const intro=n('p','premium-map-help',
          'Your answers form one complete working document. Review it, then copy or save it to My Work. '+
          'The seven-day review can remain unanswered until after the practice period. Nothing is uploaded automatically.');
        const summary=n('p','premium-worksheet-progress');
        const paper=n('pre','premium-worksheet-paper');
        const actions=n('div','premium-pause-actions');
        const copyButton=n('button','button button-ghost','Copy Full Personal Code');
        const saveButton=n('button','button button-primary','Save Full Code to My Work');
        copyButton.type=saveButton.type='button';
        const feedback=n('p','premium-map-status');
        feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
        copyButton.addEventListener('click',()=>copyCode(feedback));
        saveButton.addEventListener('click',()=>saveCode(feedback));
        actions.append(copyButton,saveButton);
        section.append(heading,intro,summary,paper,actions,feedback);
        preview={section,paper,summary};
      }
      container.hidden=false;
      container.replaceChildren(preview.section);
      refreshCompletion();
    }
    function refreshCompletion(){
      if(!preview)return;
      preview.paper.textContent=documentText();
      preview.summary.textContent=progress();
    }
    return {matches,render,park,renderCompletion,refreshCompletion,
      completedWorksheetText:documentText,serializedParts:()=>[documentText()],answers:answered,config:{kind:'stages'}};
  }
  window.NBJBChosenCode=Object.freeze({create});
})();
