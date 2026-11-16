(() => {
  'use strict';

  // Separate member curriculum from the public Path overviews. This page is
  // available to a verified signed-in Flamewalker member, including Free.
  // Explicit Save is the only action that persists reflection text on device.
  const service = window.NBJBMemberService;
  const auth = window.NBJBAuth;
  if (!service || !auth?.user?.id) return;

  const stages = Object.freeze([
    {
      slug:'fire-reclamation',name:'Fire Reclamation',order:'01 · Name it',
      publicUrl:'path-fire-reclamation.html',
      lead:'Name what happened without allowing the event to make every decision about who you are next.',
      teaching:[
        {heading:'The event is not your identity',text:'When something painful takes over the story, it can begin answering questions it has no right to answer: Am I worthy? Can I trust anybody? Is this all I will ever be? Fire Reclamation starts by describing an event plainly. What happened and what changed belong on one line. The conclusion you drew about yourself belongs on another. Those lines can be related without being the same thing.'},
        {heading:'Survival habits can become expensive',text:'Staying hyper-alert, working harder, shutting down, or trying to control the next surprise may have helped you get through a difficult stretch. You can respect why a response developed and still ask whether it helps you now. You are not required to forgive, forget, or decide that the experience was somehow good.'},
        {heading:'Reclaim one piece of authority',text:'Your goal is not to solve the whole past. Choose one present decision that does not need to be handed over to the old event: where you put your attention, how you rest, what boundary you practice, or who gets access to your time. One observable action is more useful than a perfect explanation.'}
      ],
      deepDive:[
        /* FIRE_MEMBER_DEEP_DIVE_INSERT */
      ],
      questions:[
        {label:'What happened that I am ready to describe plainly?',hint:'Start with observable events and consequences. You do not have to write every detail.'},
        {label:'What did it cost me, and what conclusion about myself may I have attached to that cost?',hint:'For example, losing trust is different from being incapable of trusting.'},
        {label:'What is one part of my future that this event does not get to decide?',hint:'Name a choice you can actually influence, not something another person must do.'}
      ]
    },
    {
      slug:'guardian',name:"The Guardian's Path",order:'02 · Protect',
      publicUrl:'path-guardian.html',
      lead:'Protect what matters through steady choices and boundaries—not control over another person.',
      teaching:[
        {heading:'A boundary governs your behavior',text:'A boundary is not “You must stop being difficult.” It is “If the conversation becomes insulting, I will pause it and return when we can speak respectfully.” The difference matters: one attempts to command somebody else, while the other defines the action you can take. Clear boundaries make responsibility visible without demanding obedience.'},
        {heading:'The Guardian Code is a conduct test',text:'Trust, Honor, Respect, Honesty, and Loyalty are not weapons or loyalty tests. Ask whether your own response earns trust, protects dignity, stays truthful, and serves what is real. Loyalty is not a requirement to surrender safety or self-respect. A Guardian can protect without possessing, disagree without humiliating, and say no without cruelty.'},
        {heading:'Steadiness is part of protection',text:'Before answering a heated message or entering a predictable argument, identify what actually needs a response now. A delay can be responsible when it protects judgment. A limit is useful only if you can carry it out safely and consistently—not if it is a threat you cannot or should not enforce.'}
      ],
      questions:[
        {label:'What specific behavior is crossing one of my limits?',hint:'Describe an observable action, not a judgment about somebody’s character.'},
        {label:'What boundary would describe my own response instead of trying to control theirs?',hint:'Try an “If X happens, I will do Y” statement.'},
        {label:'Which Guardian value do I want my next response to demonstrate?',hint:'Trust, honor, respect, honesty, loyalty, or a combination.'}
      ]
    },
    {
      slug:'sacred-mirror',name:'Sacred Mirror Work',order:'03 · Examine',
      publicUrl:'path-sacred-mirror.html',
      lead:'Examine your choices without turning accountability into an attack on your worth.',
      teaching:[
        {heading:'Observation is not interpretation',text:'“A message went unanswered” describes an event. “They wanted to humiliate me” describes an interpretation. Your feeling about an event may be intense and important, but it does not automatically settle every unknown. Separating fact, feeling, interpretation, and unknown creates room to make a decision with clearer eyes.'},
        {heading:'Accountability is behavioral',text:'You can acknowledge a harsh response, a broken promise, or a boundary you failed to hold without deciding that your whole identity is defective. Accountability asks what you did and what repair might be possible. Shame says you are nothing but the mistake. The first can lead to action; the second tends to keep you stuck.'},
        {heading:'Look for a standard you can live by',text:'Imagine someone you care about made the same mistake under similar stress. Would you insist their entire future be defined by it? Apply a fair standard to yourself. Then name a change you can actually practice—without taking responsibility for another person’s behavior.'}
      ],
      questions:[
        {label:'What did I directly observe, and what meaning did I add afterward?',hint:'Separate a fact from an assumption; include an unknown if one remains.'},
        {label:'What part of my own response can I take responsibility for without accepting blame for everything?',hint:'Be specific about behavior, not identity.'},
        {label:'What would an honest repair or healthier choice look like next time?',hint:'Think of something within your control.'}
      ]
    },
    {
      slug:'masculine-restoration',name:'Masculine Restoration',order:'04 · Rebuild',
      publicUrl:'path-masculine-restoration.html',
      lead:'Rebuild direction and strength without making work, invulnerability, or control your entire identity.',
      teaching:[
        {heading:'The collapse of a role is not the loss of a man',text:'A job, a relationship, a daily parenting routine, or the ability to provide in the old way may change without your worth disappearing. When the familiar role falls apart, the temptation is to work twice as hard or become impossible to reach. Restoration asks what kind of strength still serves you under the conditions you actually have.'},
        {heading:'Six practical anchors',text:'Steadiness, direction, strength with restraint, protection with boundaries, responsibility with self-respect, and brotherhood with connection are behaviors to practice—not a masculinity score. You do not have to master all six today. Identify the anchor under greatest strain and one everyday action that would make it more reliable.'},
        {heading:'Choose responsibility without self-punishment',text:'An honest rebuilding plan leaves room for limits, rest, and help. Providing is meaningful, but it is not the price of belonging. Leadership involves owning your actions and asking for what is necessary, not hiding every need behind an image of toughness.'}
      ],
      questions:[
        {label:'Which role or identity has felt unstable, and what value of mine remains even if that role changes?',hint:'Separate the role from the person doing it.'},
        {label:'Which of the six anchors most needs attention now, and how is that showing up in my daily behavior?',hint:'Choose just one anchor rather than grading the whole person.'},
        {label:'What would one small act of strength with restraint look like this week?',hint:'Keep the action realistic and measurable.'}
      ]
    },
    {
      slug:'voice-of-fire',name:'Voice of Fire',order:'05 · Speak',
      publicUrl:'path-voice-of-fire.html',
      lead:'Recover a truthful voice without mistaking intensity for clarity or confrontation for courage.',
      teaching:[
        {heading:'Expression and persuasion are different',text:'You may have learned to stay silent to avoid punishment, or to explain yourself for hours in the hope someone would finally agree. Voice of Fire invites a third option: state your experience and your needs clearly, while accepting that you cannot control whether another person agrees. An honest sentence does not require a courtroom-length defense.'},
        {heading:'Truth should survive the next morning',text:'The strongest communication is often shorter, calmer, and more precise than emotional discharge. Ask what belongs to you to say, what is fair and accurate, and what audience needs to hear it. Privacy can protect integrity. Not every story should become a public post, and not every conflict requires another confrontation.'},
        {heading:'Practice a sentence you can stand beside',text:'A usable statement often includes an observation, a feeling or need, and a specific request or limit. If sharing would create danger, practice privately or seek appropriate support instead. Reclaiming voice includes the right to pause, write, or decide not to engage.'}
      ],
      questions:[
        {label:'What is something important I have wanted to say but have not said clearly?',hint:'Name your experience or need without assigning a hidden motive to someone else.'},
        {label:'Am I trying to express myself, persuade someone, or release pressure—and how does that change my words?',hint:'A clear intention makes a stronger statement.'},
        {label:'What is a shorter, more grounded version of what I want to communicate?',hint:'Try two or three sentences you could stand beside tomorrow.'}
      ]
    },
    {
      slug:'circle-of-flame',name:'Circle of the Flame',order:'06 · Connect',
      publicUrl:'path-circle-of-the-flame.html',
      lead:'Build belonging without disappearing into rescuing, performance, or dependence.',
      teaching:[
        {heading:'Connection should leave room for two people',text:'After betrayal or isolation, closeness can feel risky. The answer is neither instant trust nor permanent armor. Healthy connection develops through repeatable conduct, clear agreements, and the freedom to disagree. Belonging is not worth much when the price is silence or self-erasure.'},
        {heading:'Trust grows in layers',text:'You do not need to give a new person every private detail to be honest. Notice whether they respect a small no, handle disagreement without humiliation, keep ordinary commitments, and allow you to have other relationships. Consistency over time provides better information than quick declarations of loyalty.'},
        {heading:'Participation is not rescuing',text:'Helping friends and community can be meaningful. Yet if every conversation makes you the fixer, referee, or emotional container, you may be repeating an old role. Choose a small act of connection where you can offer something authentic without taking ownership of another adult’s life.'}
      ],
      questions:[
        {label:'Where do I feel most able to be myself without performing or earning my place?',hint:'Consider a person, group, or situation and what makes it feel different.'},
        {label:'What signals would tell me that trust is growing at a healthy pace?',hint:'Look for observable conduct and respect for limits.'},
        {label:'Where am I over-giving or withdrawing, and what balanced connection could I try instead?',hint:'One small invitation, boundary, or honest check-in is enough.'}
      ]
    }
  ]);

  const bySlug = Object.fromEntries(stages.map(item => [item.slug,item]));
  const slug = new URLSearchParams(location.search).get('stage') || '';
  const chapter = Object.prototype.hasOwnProperty.call(bySlug,slug) ? bySlug[slug] : null;
  const byId = id => document.getElementById(id);
  const set = (id,text) => { const element=byId(id); if(element) element.textContent=text; };
  if (!chapter) { byId('path-stage-error').hidden=false; return; }
  byId('path-stage-content').hidden=false;

  // Render only approved static curriculum using textContent. Never inject
  // user answers into HTML or publish them to the repo, analytics, or API.
  set('path-stage-heading',chapter.name + '. Your work starts here.');
  set('path-stage-subtitle','The member experience: understand the lesson, reflect on your real situation, and choose a next action.');
  set('path-stage-title',chapter.name);
  set('path-stage-order',chapter.order);
  set('path-stage-lead',chapter.lead);
  byId('path-stage-public-link').href=chapter.publicUrl;
  const next=stages[(stages.findIndex(item=>item.slug===slug)+1)%stages.length];
  byId('path-stage-next-link').href='member-path-stage.html?stage='+encodeURIComponent(next.slug);
  byId('path-stage-next-link').textContent='Next: '+next.name+' →';

  function make(tag,text,className) {
    const node=document.createElement(tag);
    if (text!==undefined) node.textContent=text;
    if (className) node.className=className;
    return node;
  }
  // Mirror only the public, already published stage foundations. Bringing
  // those chapters into the Hub avoids downgrading the member experience.
  // This static source does not include private lesson manuscripts or answers.
  const foundation=window.NBJBPathFoundations?.[slug]?.blocks || [];
  const foundationsNode=byId('path-stage-foundation-blocks');
  foundation.forEach(block=>{
    const node=make(block.kind==='heading'?'h3':block.kind==='quote'?'blockquote':'p',
      block.text,block.kind==='heading'?'path-stage-foundation-heading':
        block.kind==='quote'?'path-stage-foundation-quote':'path-stage-foundation-prose');
    foundationsNode.append(node);
  });
  const depth=Array.isArray(chapter.deepDive)?chapter.deepDive:[];
  const teaching=byId('path-stage-teaching-blocks');
  [...chapter.teaching, ...depth].forEach((section,index)=>{
    const block=make('section',undefined,'path-stage-teaching-block');
    block.id='path-stage-teaching-'+(index+1);
    block.append(make('h3',section.heading));
    String(section.text||'').split(/\\n\\s*\\n/).filter(Boolean).forEach(text=>
      block.append(make('p',text)));
    teaching.append(block);
  });
  const questions=byId('path-stage-questions');
  const fields=chapter.questions.map((item,index)=>{
    const row=make('div',undefined,'path-stage-question');
    const label=make('label',(index+1)+'. '+item.label);
    const textarea=make('textarea');
    textarea.id='path-stage-answer-'+(index+1);
    textarea.name='reflection-'+(index+1);
    textarea.rows=3;
    textarea.maxLength=1200;
    textarea.placeholder='My answer, in my own words…';
    label.htmlFor=textarea.id;
    const hint=make('p',item.hint);
    row.append(label,hint,textarea);
    questions.append(row);
    return {item,textarea};
  });
  const stateSelect=byId('path-stage-progress');
  const focusButton=byId('path-stage-set-focus');
  function refreshFocus() {
    const state=service.load();
    const selected=state.journey.focus===chapter.name;
    set('path-stage-focus-caption',selected?'Current focus on your Dashboard':'Exploring this stage does not change your current focus.');
    focusButton.textContent=selected?'Current focus selected':'Set as my current focus';
    focusButton.disabled=selected;
    stateSelect.value=state.journey.progress[chapter.name]||'not-started';
  }
  refreshFocus();
  const status=byId('path-stage-result');
  stateSelect.addEventListener('change',()=>{
    const result=service.setStageProgress(chapter.name,stateSelect.value);
    status.textContent=result.ok?'Practice status updated on this device.':'Your browser blocked saving the practice status.';
    refreshFocus();
  });
  focusButton.addEventListener('click',()=>{
    const result=service.setFocus(chapter.name);
    status.textContent=result.ok?'This stage is now your current focus on the Dashboard.':'Your browser blocked saving the current focus.';
    refreshFocus();
  });
  function answers(){
    return fields.map(({item,textarea},index)=>({
      index:index+1,prompt:item.label,response:String(textarea.value||'').trim()
    })).filter(entry=>entry.response);
  }
  function buildJournal(){
    const journal=answers();
    const small=String(byId('path-stage-next-action').value||'').trim();
    if(!journal.length&&!small)return null;
    const full=[
      'FLAMEWALKER · MY PATH REFLECTION',
      chapter.name.toUpperCase(),
      '',
      ...journal.flatMap(item=>[item.index+'. '+item.prompt,item.response,'']),
      ...(small?['MY NEXT SMALL ACTION',small,'']:[]),
      'Saved intentionally in My Work on this device.'
    ].join('\n');
    return {journal,small,full};
  }
  function savedHistory(){
    const entries=service.listEntries('Path Reflection').filter(entry=>entry.data?.stageKey===slug);
    set('path-stage-last-saved',entries.length
      ? 'You have '+entries.length+' saved Path reflection'+(entries.length===1?'':'s')+
        ' for this stage in My Work on this browser. You can return to any of them.'
      : 'No Path reflection for this stage has been saved in My Work on this device yet.');
  }
  savedHistory();
  // The Save action is explicit: neither typing nor opening a stage creates a
  // journal entry, modifies the selected stage, or marks the stage practiced.
  byId('path-stage-form').addEventListener('submit',event=>{
    event.preventDefault();
    const result=buildJournal();
    if(!result){
      status.textContent='Add at least one reflection or one small action before saving.';
      return;
    }
    const record=service.recordToolEntry('Path Reflection',{
      title:chapter.name+' · Guided Reflection',
      summary:result.journal.length+' of '+chapter.questions.length+
        ' guided questions answered'+(result.small?' · next action included':'')+'. Open for the full entry.',
      tags:['Flamewalker','My Path',chapter.name],
      data:{
        stageKey:slug,stageName:chapter.name,
        worksheet:result.full,
        journalEntries:[
          ...result.journal.map(item=>({prompt:item.prompt,response:item.response})),
          ...(result.small?[{prompt:'One small action I can control next',response:result.small}]:[])
        ],
        smallAction:result.small
      }
    });
    if(!record.ok){
      status.textContent='Your browser could not save this reflection. Copy your work before leaving this page.';
      return;
    }
    if(byId('path-stage-update-next-action').checked&&result.small){
      const actionUpdate=service.update({journey:{nextAction:result.small}});
      status.textContent=actionUpdate.ok
        ? 'Saved one Path Reflection in My Work and updated your Next Honest Action on the Dashboard.'
        : 'Saved your reflection in My Work, but the Dashboard action could not be updated.';
    }else{
      status.textContent='Saved one organized Path Reflection in My Work on this device. No action or progress was changed.';
    }
    byId('path-stage-open-work').hidden=false;
    savedHistory();
  });
  byId('path-stage-copy').addEventListener('click',async()=>{
    const journal=buildJournal();
    if(!journal){status.textContent='Write at least one answer or next action before copying.';return;}
    try {
      if(!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(journal.full);
      status.textContent='Copied the organized reflection. Paste it somewhere private if you want a separate copy.';
    }catch(_){
      status.textContent='Copy is unavailable in this browser. You can select your answers manually or choose Save to My Work.';
    }
  });
  // A saved journal remains in My Work; unsaved drafts are intentionally
  // cleared when the page is closed or refreshed rather than uploaded.
})();
