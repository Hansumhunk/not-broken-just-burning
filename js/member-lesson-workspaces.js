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
  function create({slug, parking, saveToWork}) {
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
    const labels = config.columns || config.questions;

    function createRecord(index) {
      const item = {inputs:[],root:node('section','premium-workspace-record')};
      const head = node('h4','premium-workspace-record-title',config.singular+' '+(index+1));
      const grid = node('div','premium-workspace-field-grid');
      item.root.append(head,grid);
      labels.forEach(([name,desc])=>{
        const field = wrapField(name,desc,config.kind === 'records'?170:330);
        grid.append(field.wrap);
        item.inputs.push(field.input);
      });
      records.push(item);
      parking.append(item.root);
      return item;
    }
    if (config.kind==='map') {
      labels.forEach(([name,desc],i)=> {
        const field = wrapField('Column '+(i+1)+' · '+name,desc,330);
        fields.push(field);
        parking.append(field.wrap);
      });
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
        // Move the current card back to private parking before showing another.
        for(const rec of records)parking.append(rec.root);
        recordView.append(records[currentRecord].root);
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

    function answers() {
      if(config.kind==='map') {
        return fields.some(f=>f.input.value.trim()) ||
          fields[2].checks.some(x=>x.checked) || Boolean(fields[3].choice.value);
      }
      return records.some(rec=>rec.inputs.some(input=>input.value.trim()));
    }
    function serializedParts(){
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
      for(const rec of records)parking.append(rec.root);
      if(recordWrap)parking.append(recordWrap);
      parking.append(ui.buttons,ui.status);
    }
    function matches(step) {
      return !step.exercise && (config.heading.test(step.title) ||
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
      if(config.kind==='records'){
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
    return {matches,render,park,answers,serializedParts,config};
  }
  window.NBJBPremiumWorkspaces=Object.freeze({create});
})();
