/* Flamewalker Find & Resume.
 * Searches titles and public navigation labels only, in the member's browser.
 * No search terms, private reflections, billing details or journals are sent
 * to analytics or the server. Catalog request is fixed and returns metadata.
 */
(() => {
  'use strict';

  const TRACKS = Object.freeze({
    'wounded-boy': 'Track 1 · The Wounded Boy and Inherited Manhood',
    'placeholder-wound': 'Track 2 · The Placeholder Wound',
    'safe-room-courtroom': 'Track 3 · When the Safe Room Becomes the Courtroom',
    'steadiness-command': 'Track 4 · Steadiness & Emotional Command',
    'life-rebuilt': 'Track 5 · Rebuilding a Life That Holds',
    'sacred-laws': 'Track 6 · The Five Sacred Laws of Survival'
  });
  const PAGES = Object.freeze([
    { title:'Start Here', description:'Free foundation lesson · orientation', href:'member-start-here.html', kind:'Free lesson', terms:'begin basics first lesson' },
    { title:'All Lessons', description:'Browse the guided learning library', href:'member-lessons.html', kind:'Navigation', terms:'curriculum tracks education' },
    { title:'My Work', description:'Search and reopen explicitly saved reflections on this device', href:'member-work.html', kind:'Navigation', terms:'saved worksheets journal drafts' },
    { title:'My Path', description:'Your selected focus and five stages', href:'member-path.html', kind:'Navigation', terms:'chaos clarity agency action integration' },
    { title:'Toolbox', description:'All six member reflection tools', href:'member-tools.html', kind:'Navigation', terms:'practice exercises' },
    { title:'Progress', description:'Continue practice and learning', href:'member-progress.html', kind:'Navigation', terms:'history learning trail' },
    { title:'Membership', description:'Review your Flamewalker+ access or billing', href:'member-store.html', kind:'Navigation', terms:'account payment plan subscription stripe' },
    { title:'Dashboard', description:'Return to your Flamewalker Hub', href:'members.html', kind:'Navigation', terms:'home overview' },
    { title:'Library', description:'Member learning resources', href:'member-library.html', kind:'Navigation', terms:'content' },
    { title:'The Forge', description:'Work with a difficult thought', href:'member-workshop.html#forge-tool', kind:'Tool', terms:'thought examination' },
    { title:'Flame Check-In', description:'Name what is happening right now', href:'member-workshop.html#checkin-tool', kind:'Tool', terms:'emotion grounding' },
    { title:'Pattern Map', description:'Separate observations and interpretations', href:'member-workshop.html#pattern-tool', kind:'Tool', terms:'patterns reality evidence' },
    { title:'Boundary Builder', description:'Decide what action a boundary requires', href:'member-workshop.html#boundary-builder', kind:'Tool', terms:'boundaries' },
    { title:'One Stone', description:'Choose one manageable next action', href:'member-workshop.html#one-stone', kind:'Tool', terms:'overwhelmed action' },
    { title:'Six Sacred Questions', description:'Find clarity through structured questions', href:'member-workshop.html#six-question-tool', kind:'Tool', terms:'who what when where why how' },
    { title:'Profile', description:'Edit your device-local member profile', href:'member-profile.html', kind:'Navigation', terms:'name' },
    { title:'Settings', description:'Review member settings', href:'member-settings.html', kind:'Navigation', terms:'preferences account' }
  ]);

  function normalized(text) {
    return String(text ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function scored(items, query, max = 9) {
    const words = normalized(query).split(' ').filter(Boolean);
    if (!words.length) return [];
    return items.map((item) => {
      const title = normalized(item.title);
      const desc = normalized(item.description);
      const terms = normalized(item.terms);
      const combined = [title,desc,terms].join(' ');
      if (!words.every(word => combined.includes(word))) return null;
      const score = words.reduce((total,word) => total +
        (title === word ? 14 : title.startsWith(word) ? 9 : title.includes(word) ? 6 : 0) +
        (desc.includes(word) ? 2 : 0) + (terms.includes(word) ? 1 : 0), 0);
      return { ...item, score };
    }).filter(Boolean).sort((a,b) => b.score-a.score || a.title.localeCompare(b.title)).slice(0,max);
  }
  function indexedLessons(rows) {
    if (!Array.isArray(rows)) return [];
    const seen = new Set();
    return rows.filter(row => row && row.status === 'published' &&
      Object.hasOwn(TRACKS,row.track_slug) &&
      typeof row.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) &&
      row.slug.length <= 100 && typeof row.title === 'string' &&
      row.title.trim().length >= 2 && row.title.length <= 140
    ).map(row => ({
      title:row.title.trim(),description:TRACKS[row.track_slug],
      kind:'Flamewalker+ lesson',premium:true,
      href:'member-premium-lesson.html?lesson='+encodeURIComponent(row.slug),
      terms:'paid premium '+row.track_slug.replace(/-/g,' ')
    })).filter(item => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  }
  function resumeEntry(position,paid) {
    if (!paid || !position || typeof position.slug !== 'string' ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(position.slug) ||
        !Number.isInteger(position.section) || position.section < 1 ||
        position.section > 500 || typeof position.title !== 'string') return null;
    return {
      title:'Resume: '+position.title.slice(0,140),
      description:'Section '+position.section+' · Saved on this device',
      kind:'Resume reading',
      href:'member-premium-lesson.html?lesson='+encodeURIComponent(position.slug)+'&section='+position.section
    };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PAGES, TRACKS, scored, indexedLessons, resumeEntry };
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const auth = window.NBJBAuth;
  const entitlements = window.NBJBEntitlements;
  if (!auth?.user?.id || !entitlements?.load) return;
  if (!document.querySelector('link[data-member-search-style]')) {
    const stylesheet=document.createElement('link');
    stylesheet.rel='stylesheet';
    stylesheet.href='css/member-search.css?v=1';
    stylesheet.dataset.memberSearchStyle='';
    document.head.append(stylesheet);
  }
  let catalog = [];
  let catalogRequested = false;
  let catalogAvailable = false;
  const paidAccess = () => {
    const s=entitlements.load();
    return Boolean(s?.tier === 'paid' && s?.source === 'server' && auth.user?.id);
  };

  async function fetchCatalogOnce() {
    if (catalogRequested) return;
    catalogRequested = true;
    try {
      const response = await auth.client.functions.invoke('read-flamewalker-lesson',{
        body:{action:'catalog'}
      });
      if (response.error || !Array.isArray(response.data?.lessons)) return;
      catalog = indexedLessons(response.data.lessons);
      catalogAvailable = true;
    } catch (_) {
      // Keep navigation working even when the catalog service is unavailable.
    }
  }

  document.querySelectorAll('.member-nav-actions').forEach((actions,index) => {
    if (actions.querySelector('.member-search-toggle')) return;

    const more=actions.querySelector('.member-nav-more');
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='member-search-toggle';
    toggle.setAttribute('aria-label','Find a Flamewalker lesson, tool or page');
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls','member-search-panel-'+index);
    toggle.textContent='⌕ Search';
    const panel=document.createElement('section');
    panel.className='member-search-panel';
    panel.id='member-search-panel-'+index;
    panel.hidden=true;
    panel.setAttribute('aria-label','Find and resume Flamewalker content');

    const form=document.createElement('form');
    form.setAttribute('role','search');
    const label=document.createElement('label');
    label.htmlFor='member-search-input-'+index;
    label.textContent='Find a lesson, tool, or page';
    const input=document.createElement('input');
    input.id=label.htmlFor;
    input.type='search';
    input.maxLength=90;
    input.autocomplete='off';
    input.placeholder='Try “boundaries” or “fatherhood”';
    const note=document.createElement('p');
    note.className='member-search-privacy';
    note.textContent='Search runs on this page. Private reflections are searchable only in My Work.';
    const results=document.createElement('ul');
    results.className='member-search-results';
    results.setAttribute('aria-label','Search results');
    const status=document.createElement('p');
    status.className='member-search-status';
    status.setAttribute('role','status');

    form.append(label,input);
    panel.append(form,note,results,status);
    actions.insertBefore(toggle,more);
    actions.append(panel);

    const render=() => {
      results.replaceChildren();
      status.textContent='';
      const query=input.value.trim();
      const resume=resumeEntry(window.NBJBLearningContinuity?.get?.(),paidAccess());
      let entries;
      if (query) {
        entries=scored([...PAGES,...catalog],query,9);
      } else {
        entries=[...(resume?[resume]:[]),
          PAGES[0],PAGES[1],PAGES[2],PAGES[4]];
      }
      if (!entries.length) {
        status.textContent=catalogAvailable
          ? 'No matching titles. Try another term or open All Lessons.'
          : 'No matching pages. The lesson catalog may be unavailable; try All Lessons.';
        entries=[PAGES[1]];
      }
      for(const entry of entries) {
        const li=document.createElement('li');
        const a=document.createElement('a');
        a.href=entry.href;
        a.className='member-search-result';
        const name=document.createElement('strong');
        name.textContent=entry.title;
        const small=document.createElement('small');
        small.textContent=entry.description+
          (entry.premium?(paidAccess()?' · Included in Flamewalker+':' · Membership required'):'');
        a.append(name,small);
        li.append(a);
        results.append(li);
      }
    };
    const close=(returnFocus=false)=>{
      if(panel.hidden)return;
      panel.hidden=true;
      toggle.setAttribute('aria-expanded','false');
      if(returnFocus) toggle.focus();
    };
    const open=()=>{
      if(more)more.open=false;
      panel.hidden=false;
      toggle.setAttribute('aria-expanded','true');
      input.value='';
      render();
      input.focus();
      // Fixed catalog request, never a search query, journal or member note.
      void fetchCatalogOnce().then(()=>{if(!panel.hidden)render();});
    };
    toggle.addEventListener('click',()=>{
      if(panel.hidden)open();
      else close(true);
    });
    form.addEventListener('submit',event=>{
      event.preventDefault();
      results.querySelector('a')?.click();
    });
    input.addEventListener('input',render);
    panel.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();close(true);}
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!panel.hidden)close(true);
    });
    document.addEventListener('click',event=>{
      if(!panel.hidden&&!actions.contains(event.target))close();
    });
    more?.addEventListener('toggle',()=>{
      if(more.open)close();
    });
    window.addEventListener('nbjb:entitlements',()=>{
      if(!panel.hidden)render();
    });
  });
})();
