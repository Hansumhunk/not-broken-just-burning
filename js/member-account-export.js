(() => {
  'use strict';
  const auth = window.NBJBAuth;
  // Explicit column allowlists from current schema; no tokens, payment IDs, raw
  // messages or service-role credentials. Every query is filtered by the
  // verified current user, even for accounts that have administrative RLS.
  const datasets = {
    profiles: ['display_name,short_bio,onboarding_completed,created_at,updated_at', ['user_id']],
    member_preferences: ['profile_visibility,show_recent_work_metadata,learning_reminders,preferred_landing,created_at,updated_at', ['user_id']],
    member_continue_state: ['next_honest_action,next_honest_action_updated_at,last_tool_slug,continue_kind,continue_slug,last_activity_at,created_at,updated_at', ['user_id']],
    member_path_state: ['current_stage_slug,current_anchor_slug,created_at,updated_at', ['user_id']],
    member_path_progress: ['stage_slug,progress_state,updated_at', ['stage_slug']],
    learning_progress: ['content_kind,content_slug,progress_percent,current_unit_slug,started_at,last_accessed_at,completed_at,updated_at', ['content_kind','content_slug']],
    membership_entitlements: ['tier,status,source,provider,valid_from,valid_until,cancel_at_period_end,created_at,updated_at', ['user_id']],
    product_entitlements: ['product_slug,status,source,provider,granted_at,valid_until,created_at,updated_at', ['product_slug']],
    event_entitlements: ['event_slug,status,source,provider,granted_at,valid_until,created_at,updated_at', ['event_slug']]
  };
  const PAGE = 200;
  const MAX_PAGES = 50;
  const anonCheck = () => document.body?.dataset?.memberAccess === 'granted';
  async function collectAccountExport() {
    if (!auth?.refresh || !auth?.client || !anonCheck()) throw new Error('authentication_required');
    const identity = (await auth.refresh())?.user;
    const id = identity?.id;
    // Refresh must correspond to the currently displayed, verified identity.
    const same = () => Boolean(id && auth?.user?.id === id && anonCheck());
    if (!same()) throw new Error('authentication_required');
    const result = {};
    for (const [table,[columns, ordering]] of Object.entries(datasets)) {
      const allowed = columns.split(',');
      const rows = [];
      let complete = false;
      for (let page=0;page<MAX_PAGES;page++) {
        if (!same()) throw new Error('identity_changed');
        let request = auth.client.from(table).select('user_id,'+columns).eq('user_id',id);
        for (const column of ordering) request = request.order(column,{ascending:true});
        const response = await request.range(page*PAGE,(page+1)*PAGE-1);
        if (!same()) throw new Error('identity_changed');
        if (response.error || !Array.isArray(response.data)) throw new Error('export_unavailable');
        for (const row of response.data) {
          if (row.user_id !== id) throw new Error('identity_mismatch');
          rows.push(Object.fromEntries(allowed.map(key=>[key,row[key] ?? null])));
        }
        if(response.data.length<PAGE){ complete=true; break; }
      }
      if (!complete) throw new Error('export_limit_reached');
      result[table]=rows;
    }
    const current = (await auth.refresh())?.user;
    if (!same() || current?.id !== id) throw new Error('identity_changed');
    return {
      schema:'nbjb.account-data.v1',
      exported_at:new Date().toISOString(),
      account:{id,email:current.email ?? null,created_at:current.created_at ?? null},
      scope:'Account and member data currently exposed to you. Device-local reflections, billing receipts and administrative records are separate.',
      records:result
    };
  }
  const button=document.getElementById('download-account-data');
  const status=document.getElementById('account-export-status');
  let busy=false;
  button?.addEventListener('click',async()=>{
    if(busy||!anonCheck()||!window.confirm('Download your private account data to this device? The downloaded file is not encrypted. Continue only on a device you trust.')) return;
    const requestedId=auth?.user?.id;
    if(!requestedId)return;
    busy=true;button.disabled=true;
    if(status)status.textContent='Preparing account export…';
    let url;
    try {
      const exported=await collectAccountExport();
      if(auth?.user?.id!==requestedId||exported.account.id!==requestedId||!anonCheck())throw new Error('identity_changed');
      url=URL.createObjectURL(new Blob([JSON.stringify(exported,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='nbjb-account-data.json';
      document.body.appendChild(link);link.click();link.remove();
      if(status)status.textContent='Account export downloaded. Keep the file somewhere private.';
    } catch (_) {
      if(status)status.textContent='We could not complete the account export. No partial file was downloaded. Try again or contact account support.';
    } finally {
      if(url)window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      busy=false;button.disabled=false;
    }
  });
  // Read-only function exposed for regression tests; no auth bypass or writes.
  window.NBJBAccountExport={collectAccountExport};
})();
