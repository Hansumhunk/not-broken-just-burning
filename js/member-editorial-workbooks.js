/* One reusable worksheet for 28 editorial lessons. Prompts are read only from
   each authorized lesson response; no private manuscript is bundled here. */
(() => {
  'use strict';
  const anchors = Object.freeze({
    'provision-without-proving-worth':'full provider inventory',
    'fatherhood-what-children-watch':'generational pattern review',
    'brotherhood-without-dependency':'five tests of a useful circle',
    'lead-yourself-first':'delegation and the courage to say no',
    'the-integrated-man-thirty-day-map':'next honest action and smaller door',
    'being-needed-vs-chosen':'four-lens reciprocity map',
    'the-love-bargain':'bargain-to-choice worksheet',
    'red-flags-and-responsibility':'six-column reality map',
    'betrayal-rewrite-trap':'memory-and-meaning table',
    'children-not-relationship-glue':'fatherhood reset map',
    'loyalty-without-self-abandonment':'shared-effort test',
    'grieving-future-never-happened':'future-loss map',
    'other-person-not-your-measure':'values-based identity inventory',
    'sacred-law-emotional-boundaries':'four-part boundary builder',
    'sacred-law-pattern-recognition':'pattern check: six questions',
    'sacred-law-self-worth':'worth separation practice',
    'sacred-law-strategic-retreat':'six-part engagement test',
    'sacred-law-authentic-voice':'voice, timing, and repair rehearsal',
    'promise-of-the-room':'process-goals comparison',
    'split-alliance-therapy-triangle':'five-part alliance integrity check',
    'professional-authority-multiplier':'behavior translation method',
    'when-you-stop-trusting-own-account':'when the story of an event becomes contested',
    'double-bind-darvo-reaction':'chronological sequence map',
    'body-as-ally':'build an embodied stability map',
    'name-the-emotion-choose-action':'emotion-to-action compass',
    'the-space-between-trigger-and-response':'pause, prepare, return method',
    'boundaries-without-cruelty':'four-part boundary builder',
    'discipline-without-self-punishment':'minimum viable commitment'
  });

  function el(tag, cls, text) {
    const item=document.createElement(tag);
    if(cls)item.className=cls;
    if(text!==undefined)item.textContent=text;
    return item;
  }
  function create({slug, parking, steps, exercise, lessonTitle, saveWholeToWork}) {
    const anchor=anchors[slug];
    if(!anchor || !parking || !Array.isArray(steps) || !exercise)return null;
    const prompts=Array.isArray(exercise.prompts)
      ? exercise.prompts.filter(p=>typeof p==='string' && p.trim()) : [];
    if(!prompts.length || prompts.length>30)return null;
    const title=String(exercise.title || 'Guided practice');
    const safeTitle=String(lessonTitle || slug);
    const matchText=text=>String(text||'').toLowerCase().includes(anchor);
    const candidate=step=>!step.exercise && (matchText(step.title) ||
      (step.blocks||[]).some(block=>matchText(block.text)));
    const hits=steps.map((step,i)=>candidate(step)?i:-1).filter(i=>i>=0);
    if(!hits.length)return null;
    const focus=(slug==='grieving-future-never-happened' ? hits[hits.length-1] : hits[0]);
    const focusStep=steps[focus];
    const allFields=prompts.map((prompt,i)=>{
      const row=el('div','premium-map-row');
      const left=el('div','premium-map-reading');
      const right=el('div','premium-map-writing');
      const question=el('p','premium-draft-question',(i+1)+'. '+prompt);
      const field=el('div','premium-map-field');
      const label=el('label');
      const caption=el('strong','', 'Your response · Question '+(i+1));
      const input=el('textarea');
      input.rows=4;
      input.maxLength=1300;
      input.autocomplete='off';
      input.placeholder='Write your response here…';
      input.setAttribute('aria-label',prompt);
      label.append(caption,input);field.append(label);
      left.append(question);right.append(field);row.append(left,right);
      parking.append(row);
      return {row,input,prompt};
    });
    const controls=el('div','premium-pause-actions premium-workspace-actions');
    const copy=el('button','button button-ghost','Copy Complete Workbook');
    const save=el('button','button button-primary','Save Complete Workbook to My Work');
    copy.type=save.type='button';controls.append(copy,save);
    const feedback=el('p','premium-map-status');
    feedback.setAttribute('role','status');
    feedback.setAttribute('aria-live','polite');
    parking.append(controls,feedback);
    let preview=null;

    function answers(){return allFields.some(f=>f.input.value.trim());}
    function completedWorksheetText(){
      const lines=[
        'NOT BROKEN JUST BURNING',
        title.toUpperCase(),
        'Guided workbook · '+safeTitle,
        '',
        'MY RESPONSES'
      ];
      allFields.forEach((f,i)=>{
        lines.push('',(i+1)+'. '+f.prompt);
        lines.push(f.input.value.trim() || '[Not answered yet]');
      });
      lines.push('','Personal reflection and practical planning. This is not a diagnosis or professional advice.');
      return lines.join('\n');
    }
    function progress(){
      const answered=allFields.filter(f=>f.input.value.trim()).length;
      return answered+' of '+allFields.length+' questions answered. Unanswered prompts are marked in the document.';
    }
    function park(){
      for(const field of allFields)parking.append(field.row);
      parking.append(controls,feedback);
    }
    function matches(step){
      if(!step || step.exercise)return false;
      const i=steps.indexOf(step);
      return i>=focus && step.title===focusStep.title;
    }
    async function copyWorkbook(output){
      if(!answers()){
        output.textContent='Answer at least one question before copying.';
        return;
      }
      try{
        await navigator.clipboard.writeText(completedWorksheetText());
        output.textContent='Complete workbook copied. Paste it somewhere you control to keep it.';
      }catch(_){
        output.textContent='Copy was blocked. Select and copy the document manually.';
      }
    }
    function saveWorkbook(output){
      if(!answers()){
        output.textContent='Answer at least one question before saving.';
        return;
      }
      const full=completedWorksheetText();
      if(full.length>20000){
        output.textContent='This workbook exceeds the local document limit. Use Copy to preserve every answer.';
        return;
      }
      if(typeof saveWholeToWork!=='function'){
        output.textContent='Saving is unavailable. Use Copy to keep your answers.';
        return;
      }
      saveWholeToWork(full,title,output);
    }
    copy.addEventListener('click',()=>copyWorkbook(feedback));
    save.addEventListener('click',()=>saveWorkbook(feedback));

    function render(step,body,appendText){
      if(!matches(step))return;
      const lead=el('section','premium-batch-workbook');
      lead.append(
        el('p','eyebrow','Write as you learn · Guided practice'),
        el('h3','',title),
        el('p','premium-map-help',
          'Each question has an answer box beside it. Your answers follow you between these sections, '+
          'but are not saved or uploaded automatically. Use Copy or Save before closing the lesson.')
      );
      let inserted=false;
      const insert=()=>{
        if(inserted)return;
        body.append(lead);
        for(const field of allFields)body.append(field.row);
        body.append(controls,feedback);
        inserted=true;
      };
      let anchorSeen=false,after=0;
      for(const block of step.blocks||[]){
        appendText(body,block.kind==='heading'?'h3':'p',block.text);
        if(matchText(block.text))anchorSeen=true;
        if(anchorSeen && ++after>=2)insert();
      }
      if(!inserted)insert();
    }
    function refreshCompletion(){
      if(!preview)return;
      preview.paper.textContent=completedWorksheetText();
      preview.status.textContent=progress();
    }
    function renderCompletion(container){
      if(!container)return;
      if(!preview){
        const section=el('section','premium-worksheet-completion');
        const heading=el('h3','',title+' · My Completed Workbook');
        const intro=el('p','premium-map-help',
          'Your responses form one readable document. Return to the lesson to revise your answers, '+
          'then copy or save this complete workbook. Nothing is automatically saved or uploaded.');
        const status=el('p','premium-worksheet-progress');
        const paper=el('pre','premium-worksheet-paper');
        const actions=el('div','premium-pause-actions');
        const copyButton=el('button','button button-ghost','Copy Complete Workbook');
        const saveButton=el('button','button button-primary','Save Complete Workbook to My Work');
        copyButton.type=saveButton.type='button';
        const result=el('p','premium-map-status');
        result.setAttribute('role','status');result.setAttribute('aria-live','polite');
        copyButton.addEventListener('click',()=>copyWorkbook(result));
        saveButton.addEventListener('click',()=>saveWorkbook(result));
        actions.append(copyButton,saveButton);
        section.append(heading,intro,status,paper,actions,result);
        preview={section,paper,status};
      }
      container.hidden=false;
      container.replaceChildren(preview.section);
      refreshCompletion();
    }
    return {matches,render,park,answers,completedWorksheetText,renderCompletion,
      refreshCompletion,replacesGuidedReflection:true,focusIndex:focus,promptCount:prompts.length};
  }
  window.NBJBEditorialWorkbooks=Object.freeze({
    create,
    supportedSlugs:Object.freeze(Object.keys(anchors))
  });
})();
