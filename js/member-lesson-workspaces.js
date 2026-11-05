/* Reusable, in-memory Flamewalker+ practice workspaces.
   No storage or network calls occur unless a member explicitly selects Copy or Save.
   Manuscript text remains in the protected reader; this file only supplies form controls. */
(() => {
  'use strict';
  const configs = {
    'mother-wound': {
      kind: 'map', title: 'Maternal Imprint Map', heading: /maternal imprint map/i,
      columns: [
        ['What closeness taught me', 'What did closeness feel like, and what did I learn love required?'],
        ['What approval required', 'What seemed to earn approval, and what seemed to threaten it?'],
        ['What role I learned to play', 'What did the role help me do, what did it cost, and where do I still play it?'],
        ['What healthy closeness means now', 'Which healthy relationship rules do I choose today?']
      ]
    },


    'inherited-vs-chosen-manhood': {
      kind: 'stages', title: 'One-Page Chosen Manhood Code',
      heading: /part 12.*one-page chosen manhood code/i,
      columns: [
        ['KEEP', 'List 3–5 inherited strengths worth preserving. What are they, where did you learn them, and why do you choose them now?'],
        ['REFORGE', 'For 3–5 rules: old rule, useful value, cost, and healthier chosen rule.'],
        ['RETIRE', 'For 1–5 rules: old rule, former protection, present cost, and what replaces it.'],
        ['BUILD', 'Write one chosen statement for each of the six NBJB strength anchors.'],
        ['ACT', 'Choose one realistic behavior you can practice over the next seven days.'],
        ['REVIEW', 'After seven days: did I do it, what got in the way, what helped, and what needs to change?']
      ]
    },
    'what-strength-looked-like': {
      kind: 'records', title: 'Strength Model Audit', heading: /strength model audit/i,
      sectionTitle: /part 12.*six nbjb strength anchors/i,
      singular: 'Inherited rule', initial: 5, maximum: 7,
      questions: [
        ['Inherited rule', 'Which rule about strength did I absorb?'],
        ['Where I learned it', 'Who or what modeled it?'],
        ['What was useful about it?', 'Name the legitimate value inside the rule.'],
        ['What does it cost me now?', 'Which effect can I observe?'],
        ['Which NBJB anchor does it affect?', 'Steadiness, Direction, Strength with restraint, Protection with boundaries, Responsibility with self-respect, or Brotherhood and connection.'],
        ['Keep, Reforge, or Retire', 'Which response makes sense today?'],
        ['Chosen rule', 'Rewrite the rule so you can live it.']
      ]
    },
    'allowed-to-need': {
      kind: 'records', title: 'Needs Permission Map', heading: /needs permission map/i,
      sectionTitle: /part 11.*positive inheritance/i,
      singular: 'Need', initial: 2, maximum: 6,
      questions: [
        ['The need', 'Rest, help, privacy, affection, guidance or another legitimate need?'],
        ['Early message', 'What did I learn about having this need?'],
        ['Current strategy', 'What do I do when this need appears now?'],
        ['Category: A, B, or C', 'A = I can manage it; B = I can ask for help; C = professional, community or system support.'],
        ['Keep, Reforge, or Retire', 'Which inherited rule governs this need, and what should change?'],
        ['Clear request or action', 'What specific responsible next action can I take?']
      ]
    },
    'learned-silence': {
      kind: 'records', title: 'Silence Inventory', heading: /silence inventory/i,
      singular: 'Situation', initial: 3, maximum: 5,
      questions: [
        ['What I wanted to say', 'What was the sentence?'],
        ['What I feared would happen', 'What response or consequence did I anticipate?'],
        ['What I did instead', 'How did I respond in that moment?'],
        ['What silence protected', 'What immediate benefit did the strategy provide?'],
        ['What it cost', 'What happened later?'],
        ['What I know for certain', 'What facts can I verify?'],
        ['What I interpreted', 'What meaning did I assign?'],
        ['What remains unknown', 'What do I not know?'],
        ['What a grounded response could look like now', 'One sentence, request, pause, boundary, or chosen silence.'],
        ['Keep, Reforge, or Retire', 'What should happen to this silence strategy?']
      ]
    },
    'bullying-shame-early-armor': {
      kind: 'records', title: 'Armor Audit', heading: /armor audit/i,
      singular: 'Strategy', initial: 1, maximum: 5,
      questions: [
        ['The armor strategy', 'Give this protective behavior a name.'],
        ['What created or strengthened it?', 'What environment made it useful?'],
        ['What did it protect me from?', 'What risk or discomfort did it help manage?'],
        ['What did it help me survive or accomplish?', 'Name the useful skill or benefit.'],
        ['What does it cost me now?', 'Give a concrete present-day example.'],
        ['Keep, Reforge, or Retire', 'What is your choice today?'],
        ['My chosen rule', 'What is a healthier way to use this strength?']
      ]
    }
  };

  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function wrapField(title, help, max = 350) {
    const wrap = node('div','premium-map-field');
    const label = node('label');
    const strong = node('strong','',title);
    const small = node('small','',help);
    const input = node('textarea');
    input.rows = 3;
    input.maxLength = max;
    input.autocomplete = 'off';
    input.placeholder = 'Write your answer here…';
    label.append(strong,small,input);
    wrap.append(label);
    return {wrap,input};
  }
  function makeRow(body) {
    const row = node('div','premium-map-row');
    const reading = node('div','premium-map-reading');
    const writing = node('div','premium-map-writing');
    row.append(reading,writing);
    body.append(row);
    return {row,reading,writing};
  }
  function actions() {
    const buttons = node('div','premium-pause-actions premium-workspace-actions');
    const copy = node('button','button button-ghost','Copy My Answers');
    const save = node('button','button button-primary','Save to My Work');
    copy.type = save.type = 'button';
    buttons.append(copy,save);
    const status = node('p','premium-map-status');
    status.role = 'status';
    status.setAttribute('aria-live','polite');
    return {buttons,copy,save,status};
  }
  function create({slug, parking, saveToWork, saveWholeToWork, getFinalResponses}) {
    const config = configs[slug];
    if (!config || !parking) return null;
    const ui = actions();
    const fields = [];
    const records = [];
    let recordSelect = null;
    let currentRecord = 0;
    let recordView = null;
    let recordWrap = null;
    let addButton = null;
    let showRecord = null;

    // Six Shame Separation prompts appear in the preceding reading section.
    // Keep their input nodes alive so the final worksheet can include them.
    const shameQuestions = slug === 'bullying-shame-early-armor' ? [
      ['What happened?', 'State the event or pattern as clearly as possible.'],
      ['What was said or done to me?', 'What external message did I receive?'],
      ['What did I begin believing about myself?', 'Name the internalized shame.'],
      ['What part was never mine to carry?', 'Separate others’ behavior from your worth.'],
      ['What am I actually responsible for?', 'Own your conduct without taking imaginary blame.'],
      ['What does responsibility require now?', 'Repair, boundary, apology, distance, learning, or nothing further?']
    ] : null;
    const shameFields = shameQuestions?.map(([question,help],i)=>{
      const field=wrapField('Question '+(i+1)+' · '+question,help,550);
      parking.append(field.wrap);
      return field;
    }) || [];
    let armorTargets = [];
    let worksheetPreview = null;

    const labels = config.columns || config.questions;

    function createRecord(index) {
      const item = {inputs:[],fields:[],root:node('section','premium-workspace-record')};
      const head = node('h4','premium-workspace-record-title',config.singular+' '+(index+1));
      const grid = node('div','premium-workspace-field-grid');
      item.root.append(head,grid);
      item.grid = grid;
      labels.forEach(([name,desc])=>{
        const field = wrapField(name,desc,config.kind === 'records'?170:330);
        grid.append(field.wrap);
        item.inputs.push(field.input);
        item.fields.push(field);
      });
      records.push(item);
      parking.append(item.root);
      return item;
    }
    if (config.kind==='map' || config.kind==='stages') {
      labels.forEach(([name,desc],i)=> {
        const field = wrapField((config.kind==='stages'?'Stage ':'Column ')+(i+1)+' · '+name,desc,config.kind==='stages'?800:330);
        fields.push(field);
        parking.append(field.wrap);
      });
      if(config.kind==='map') {
      // Preserve the manuscript's categorization and choice prompts.
      const classification = node('fieldset','premium-map-classify');
      classification.append(node('legend','','Classify a learned rule (choose any that fit)'));
      const checks = ['Fact','Interpretation','Pattern','Unknown'].map(text=>{
        const line = node('label');
        const cb = node('input');
        cb.type = 'checkbox';cb.value=text;
        line.append(cb,document.createTextNode(' '+text));
        classification.append(line);
        return cb;
      });
      fields[2].wrap.append(classification);
      const choiceLabel = node('label','premium-map-followup','What will I do with this inherited rule?');
      const choice = node('select');
      [['','Choose when ready…'],['KEEP','KEEP'],['REFORGE','REFORGE'],['RETIRE','RETIRE']].forEach(([val,name])=>{
        const option=node('option','',name);option.value=val;choice.append(option);
      });
      choiceLabel.append(choice);
      fields[3].wrap.append(choiceLabel);
      fields[2].checks=checks;fields[3].choice=choice;
      }
    } else {
      for(let i=0;i<config.initial;i++)createRecord(i);
      recordWrap=node('section','premium-workspace-records');
      const label = node('label','premium-workspace-picker-label','Select '+config.singular.toLowerCase()+' to work on');
      recordSelect=node('select');
      recordSelect.setAttribute('aria-label','Select '+config.singular.toLowerCase());
      label.append(recordSelect);
      recordView=node('div');
      addButton=node('button','button button-ghost','Add another '+config.singular.toLowerCase());
      addButton.type='button';
      recordWrap.append(label,recordView,addButton);
      const show = (next)=>{
        currentRecord=Math.max(0,Math.min(next,records.length-1));
        // Return all inputs to their permanent record so strategy switching
        // cannot destroy typed responses. Then move the selected ones beside
        // the relevant question in the manuscript.
        for(const rec of records){
          for(const field of rec.fields)rec.grid.append(field.wrap);
          parking.append(rec.root);
        }
        if(slug === 'bullying-shame-early-armor'){
          armorTargets.forEach((target,i)=>{
            if(target && records[currentRecord].fields[i])target.append(records[currentRecord].fields[i].wrap);
          });
        }else{
          recordView.append(records[currentRecord].root);
        }
        recordSelect.value=String(currentRecord);
        addButton.disabled=records.length>=config.maximum;
      };
      const updateOptions=()=>{
        recordSelect.replaceChildren();
        records.forEach((rec,i)=>{
          const opt = node('option','',config.singular+' '+(i+1));
          opt.value=String(i);recordSelect.append(opt);
        });
        show(currentRecord);
      };
      showRecord = show;
      recordSelect.addEventListener('change',()=>show(Number(recordSelect.value)));
      addButton.addEventListener('click',()=>{
        if(records.length>=config.maximum)return;
        createRecord(records.length);
        currentRecord=records.length-1;
        updateOptions();
        ui.status.textContent='New '+config.singular.toLowerCase()+' added. Your earlier responses are still here.';
      });
      updateOptions();
      parking.append(recordWrap);
    }
    parking.append(ui.buttons,ui.status);


    function completedWorksheetText() {
      if(!shameQuestions) return '';
      const lines=[
        'NOT BROKEN JUST BURNING',
        'THE SHAME SEPARATION & ARMOR AUDIT',
        'A personal working document from Bullying, Shame, and the Early Armor',
        '',
        'PART I — THE SHAME SEPARATION'
      ];
      shameQuestions.forEach(([question],i)=>{
        lines.push('',(i+1)+'. '+question);
        lines.push(shameFields[i].input.value.trim() || '[Not answered yet]');
      });
      lines.push('','PART II — THE ARMOR AUDIT');
      let used=0;
      records.forEach((record,i)=>{
        if(!record.inputs.some(input=>input.value.trim()))return;
        used++;
        lines.push('','STRATEGY '+(i+1));
        config.questions.forEach(([question],idx)=>{
          lines.push('',(idx+1)+'. '+question);
          lines.push(record.inputs[idx].value.trim() || '[Not answered yet]');
        });
      });
      if(!used)lines.push('','[No strategy has been completed yet]');
      const final=typeof getFinalResponses==='function'?getFinalResponses():[];
      const answered=Array.isArray(final)?final.filter(x=>x && x.response?.trim()):[];
      if(answered.length) {
        lines.push('','PART III — FINAL REFLECTION');
        answered.forEach(item=>lines.push('',item.prompt || 'Reflection',item.response.trim()));
      }
      lines.push('','Prepared privately in Flamewalker+. This is personal reflection, not a diagnosis or professional assessment.');
      return lines.join('\n');
    }
    function worksheetProgress() {
      const shameCount=shameFields.filter(field=>field.input.value.trim()).length;
      const activeRecords=records.filter(rec=>rec.inputs.some(input=>input.value.trim()));
      const completed=activeRecords.reduce((sum,rec)=>sum+rec.inputs.filter(input=>input.value.trim()).length,0);
      const total=activeRecords.length*config.questions.length;
      return shameCount+' of 6 Shame Separation questions · '+completed+' of '+total+
        ' Armor Audit answers across '+activeRecords.length+' '+(activeRecords.length===1?'strategy':'strategies');
    }
    function refreshCompletion() {
      if(!worksheetPreview)return;
      worksheetPreview.paper.textContent=completedWorksheetText();
      worksheetPreview.progress.textContent=worksheetProgress()+
        '. Unanswered prompts remain visibly marked; you can return and edit them.';
    }
    function renderCompletion(container) {
      if(!shameQuestions || !container)return;
      if(!worksheetPreview){
        const section=node('section','premium-worksheet-completion');
        const eyebrow=node('p','eyebrow','Your completed work · Personal document');
        const heading=node('h3','','The Shame Separation & Armor Audit');
        const intro=node('p','premium-map-help',
          'Your answers from both exercises are assembled below. Review the whole page, return to any question to edit it, then choose Copy or Save. No answer is uploaded automatically.');
        const progress=node('p','premium-worksheet-progress');
        const paper=node('pre','premium-worksheet-paper');
        const controls=node('div','premium-pause-actions');
        const copyButton=node('button','button button-ghost','Copy Full Worksheet');
        const saveButton=node('button','button button-primary','Save Full Worksheet to My Work');
        copyButton.type=saveButton.type='button';
        const status=node('p','premium-map-status');
        status.setAttribute('role','status');
        status.setAttribute('aria-live','polite');
        controls.append(copyButton,saveButton);
        section.append(eyebrow,heading,intro,progress,paper,controls,status);
        copyButton.addEventListener('click',async ()=>{
          if(!answers()){status.textContent='Answer at least one question before copying the worksheet.';return;}
          try{
            await navigator.clipboard.writeText(completedWorksheetText());
            status.textContent='The full worksheet was copied. Paste it somewhere private to keep it.';
          }catch(_){status.textContent='Copy was blocked by your browser. You can select the worksheet text below.';}
        });
        saveButton.addEventListener('click',()=>{
          if(!answers()){status.textContent='Answer at least one question before saving.';return;}
          const text=completedWorksheetText();
          if(text.length>20000){
            status.textContent='The full worksheet is too long for one local entry. Use Copy to retain every answer.';
            return;
          }
          if(typeof saveWholeToWork!=='function'){
            status.textContent='Full worksheet saving is unavailable. Use Copy to keep your complete answers.';
            return;
          }
          saveWholeToWork(text,'Shame Separation & Armor Audit',status);
        });
        worksheetPreview={section,progress,paper,status};
      }
      container.hidden=false;
      container.replaceChildren(worksheetPreview.section);
      refreshCompletion();
    }

    function answers() {
      if(config.kind==='map' || config.kind==='stages') {
        return fields.some(f=>f.input.value.trim()) || (config.kind==='map' &&
          (fields[2].checks.some(x=>x.checked) || Boolean(fields[3].choice.value)));
      }
      return shameFields.some(field=>field.input.value.trim()) ||
        records.some(rec=>rec.inputs.some(input=>input.value.trim()));
    }
    function serializedParts(){
      if(config.kind==='stages'){
        return fields.map((field,i)=> config.title+' — '+labels[i][0]+'\n'+field.input.value.trim())
          .filter((part,i)=>Boolean(fields[i].input.value.trim()));
      }
      if(config.kind==='map'){
        const chunks=[config.title];
        fields.forEach((field,i)=>chunks.push('Column '+(i+1)+' — '+labels[i][0]+'\n'+
          (field.input.value.trim()||'(not answered)')));
        chunks.push('Classification: '+(fields[2].checks.filter(x=>x.checked).map(x=>x.value).join(', ')||'(not selected)'));
        chunks.push('Keep / Reforge / Retire: '+(fields[3].choice.value||'(not selected)'));
        return [chunks.join('\n\n')];
      }
      return records.map((rec,index)=>{
        const parts=[config.title+' — '+config.singular+' '+(index+1)];
        rec.inputs.forEach((input,i)=>parts.push(labels[i][0]+':\n'+(input.value.trim()||'(not answered)')));
        return parts.join('\n\n');
      }).filter((part,index)=>records[index].inputs.some(x=>x.value.trim()));
    }
    async function copy(){
      if(!answers()){ui.status.textContent='Write at least one answer first.';return;}
      try{
        await navigator.clipboard.writeText(serializedParts().join('\n\n---\n\n'));
        ui.status.textContent='Answers copied. Paste them somewhere private to keep them.';
      }catch(_){ui.status.textContent='Copy was blocked. Select and copy your answers manually.';}
    }
    function save(){
      if(!answers()){ui.status.textContent='Write at least one answer first.';return;}
      const parts=serializedParts();
      if(parts.some(x=>x.length>2400)){
        ui.status.textContent='An entry is too long to save without cutting it off. Use Copy for the full response.';
        return;
      }
      let saved=0;
      for(let i=0;i<parts.length;i++){
        saveToWork(parts[i], config.title+(parts.length>1?' · '+config.singular+' '+(i+1):''),ui.status);
        if(ui.status.textContent.startsWith('Saved to My Work'))saved++;
        else break;
      }
      if(saved===parts.length)ui.status.textContent='Saved '+saved+' '+(saved===1?'entry':'entries')+
        ' to My Work on this device. No automatic uploads occurred.';
      else ui.status.textContent='Saved '+saved+' of '+parts.length+
        ' entries. The remaining entries were not saved; use Copy to keep them.';
    }
    ui.copy.addEventListener('click',copy);
    ui.save.addEventListener('click',save);

    function park(){
      for(const f of fields)parking.append(f.wrap);
      for(const f of shameFields)parking.append(f.wrap);
      armorTargets = [];
      for(const rec of records)for(const field of rec.fields)rec.grid.append(field.wrap);
      for(const rec of records)parking.append(rec.root);
      if(recordWrap)parking.append(recordWrap);
      parking.append(ui.buttons,ui.status);
    }
    function matches(step) {
      return !step.exercise && ((shameQuestions && /part 9.*shame separation/i.test(step.title)) ||
        config.heading.test(step.title) ||
        (config.sectionTitle && config.sectionTitle.test(step.title)) ||
        step.blocks.some(block=>block.kind==='heading' && config.heading.test(block.text)));
    }
    function render(step,body,appendText) {
      if(!matches(step))return;
      const text=(target,block)=>appendText(target,block.kind==='heading'?'h3':'p',block.text);
      const note = node('p','premium-map-continuity',
        'Read the examples on the left and enter your own answers on the right. '+
        'Nothing is saved automatically. Copy or Save before leaving this page.');
      body.append(note);
      if(shameQuestions && /part 9.*shame separation/i.test(step.title)){
        let active=null;
        for(const block of step.blocks){
          const t=block.text.trim();
          const found=/^([1-6])\.\s+/.exec(t);
          if(found){
            active=makeRow(body);
            active.writing.append(shameFields[Number(found[1])-1].wrap);
          }else if(/^EXAMPLE\b/i.test(t)){
            active=null;
          }
          text(active?active.reading:body,block);
        }
        const instruction=node('p','premium-map-continuity',
          'Your answers will become the first part of your completed worksheet. '+
          'Continue to the Armor Audit next; you can review and save the full page at the end.');
        body.append(instruction);
        return;
      }
      if(slug==='bullying-shame-early-armor' && config.kind==='records'){
        body.append(recordWrap);
        let active=makeRow(body);
        armorTargets[0]=active.writing;
        for(const block of step.blocks){
          const t=block.text.trim();
          const found=/^([1-5])\.\s+/.exec(t);
          if(found){
            active=makeRow(body);
            armorTargets[Number(found[1])]=active.writing;
          }else if(/^EXAMPLE$/i.test(t)){
            active=makeRow(body);
            active.reading.append(node('h3','','MY CHOSEN RULE'));
            active.reading.append(node('p','','Write the healthier rule you want to practice.'));
            armorTargets[6]=active.writing;
            active=null;
          }
          text(active?active.reading:body,block);
        }
        if(showRecord)showRecord(currentRecord);
      } else if(config.kind==='stages'){
        let active=null,seen=0;
        for(const block of step.blocks){
          const heading=block.kind==='heading'?block.text.trim():'';
          const m=/^PART\s+([A-F])\s+—/i.exec(heading);
          if(m){
            active=makeRow(body);
            const idx=m[1].toUpperCase().charCodeAt(0)-65;
            text(active.reading,block);
            active.writing.append(fields[idx].wrap);
            seen++;
          }else text(active?active.reading:body,block);
        }
        // Continuation after the six stage headings: keep all written code
        // visible together without creating fresh inputs.
        if(!seen){
          fields.forEach((field,i)=>{
            const row=makeRow(body);
            row.reading.append(node('h3','', 'Stage '+(i+1)+' — '+labels[i][0]));
            row.reading.append(node('p','','Review and refine the answer you wrote.'));
            row.writing.append(field.wrap);
          });
        }
      } else if(config.kind==='records'){
        // Start beside the audit heading if this worksheet is embedded inside
        // a longer chapter, not beside unrelated earlier teaching.
        let row=null;
        for(const block of step.blocks){
          if(!row && block.kind==='heading' && config.heading.test(block.text))row=makeRow(body);
          if(!row && config.heading.test(step.title))row=makeRow(body);
          if(!row && config.sectionTitle && config.sectionTitle.test(step.title) &&
              (step.continuation > 0 || !step.blocks.some(x=>x.kind==='heading' && config.heading.test(x.text)))) {
            row=makeRow(body);
          }
          text(row?row.reading:body,block);
        }
        if(!row)row=makeRow(body);
        if(showRecord)showRecord(currentRecord);
        row.writing.append(recordWrap);
      } else {
        let active=null,seen=0;
        for(const block of step.blocks){
          const head=block.kind==='heading'?block.text.trim():'';
          const match=/^COLUMN\s+([1-4])\b/i.exec(head);
          if(match){
            const index=Number(match[1])-1;
            active=makeRow(body);
            text(active.reading,block);
            active.writing.append(fields[index].wrap);
            seen++;
          }else if(/^EXAMPLE\s+\d+/i.test(head)){
            active=null;
            text(body,block);
          }else{
            text(active?active.reading:body,block);
          }
        }
        // The maternal map spans two sections; show the same fields for review
        // when the continuation starts in categorization/illustrations.
        if(!seen){
          fields.forEach((field,i)=>{
            const row=makeRow(body);
            row.reading.append(node('h3','', 'Column '+(i+1)+' — '+labels[i][0]));
            row.reading.append(node('p','','Review or revise this answer before finishing.'));
            row.writing.append(field.wrap);
          });
        }
      }
      body.append(ui.buttons,ui.status);
    }
    return {matches,render,park,answers,serializedParts,config,
      renderCompletion,refreshCompletion,completedWorksheetText,worksheetProgress};
  }
  window.NBJBPremiumWorkspaces=Object.freeze({create});
})();
