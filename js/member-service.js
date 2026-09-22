(() => {
  const KEY = 'nbjb.member.v2';
  const LEGACY_KEY = 'nbjb.member.v1';
  const MAX_ACTIVITY_ENTRIES = 75;

  const stages = [
    'Fire Reclamation',
    "The Guardian's Path",
    'Sacred Mirror Work',
    'Masculine Restoration',
    'Voice of Fire',
    'Circle of the Flame'
  ];

  const emptyProgress = () => Object.fromEntries(stages.map((stage) => [stage, 'not-started']));

  const defaults = () => ({
    version: 2,
    profile: {
      displayName: '',
      about: '',
      visibility: 'private'
    },
    journey: {
      focus: '',
      nextAction: '',
      values: [],
      progress: emptyProgress(),
      onboardingComplete: false,
      lastTool: '',
      lastVisited: '',
      updatedAt: null
    },
    preferences: {
      syncNextActionLater: false,
      memberUpdatesLater: false,
      motion: 'system'
    },
    activity: {
      entries: []
    },
    review: {
      patternLens: {
        statement: '',
        hypothesis: '',
        entryRelations: {},
        updatedAt: null
      },
      periodic: {}
    }
  });

  function merge(base, patch) {
    const patchEntries = patch?.activity?.entries;
    const patchLensRelations = patch?.review?.patternLens?.entryRelations;
    return {
      ...base,
      ...patch,
      profile: { ...base.profile, ...(patch?.profile || {}) },
      journey: {
        ...base.journey,
        ...(patch?.journey || {}),
        progress: { ...base.journey.progress, ...(patch?.journey?.progress || {}) }
      },
      preferences: { ...base.preferences, ...(patch?.preferences || {}) },
      activity: {
        ...base.activity,
        ...(patch?.activity || {}),
        entries: Array.isArray(patchEntries) ? patchEntries : base.activity.entries
      },
      review: {
        ...base.review,
        ...(patch?.review || {}),
        patternLens: {
          ...base.review.patternLens,
          ...(patch?.review?.patternLens || {}),
          entryRelations: patchLensRelations && typeof patchLensRelations === 'object'
            ? patchLensRelations
            : base.review.patternLens.entryRelations
        },
        periodic: {
          ...base.review.periodic,
          ...(patch?.review?.periodic || {})
        }
      }
    };
  }

  function readRaw(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function migrateLegacy() {
    const legacy = readRaw(LEGACY_KEY);
    if (!legacy) return null;
    const data = defaults();
    data.profile.displayName = legacy.name || '';
    data.journey.focus = legacy.focus || '';
    data.journey.nextAction = legacy.action || '';
    data.journey.values = Array.isArray(legacy.values) ? legacy.values : [];
    data.journey.onboardingComplete = Boolean(data.profile.displayName || data.journey.focus || data.journey.nextAction || data.journey.values.length);
    data.journey.updatedAt = Date.now();
    return data;
  }

  function load() {
    const current = readRaw(KEY);
    if (current) return merge(defaults(), current);
    const migrated = migrateLegacy();
    if (migrated) {
      save(migrated);
      return migrated;
    }
    return defaults();
  }

  function save(data) {
    const normalized = merge(defaults(), data);
    normalized.journey.updatedAt = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(normalized));
      return { ok: true, data: normalized };
    } catch (error) {
      return { ok: false, data: normalized, error };
    }
  }

  function update(patch) {
    return save(merge(load(), patch));
  }

  function setFocus(focus) {
    const data = load();
    data.journey.focus = stages.includes(focus) ? focus : '';
    if (data.journey.focus && data.journey.progress[data.journey.focus] === 'not-started') {
      data.journey.progress[data.journey.focus] = 'in-progress';
    }
    return save(data);
  }

  function setStageProgress(stage, state) {
    const allowed = ['not-started', 'in-progress', 'practicing'];
    const data = load();
    if (stages.includes(stage) && allowed.includes(state)) data.journey.progress[stage] = state;
    return save(data);
  }

  function noteTool(tool) {
    const data = load();
    data.journey.lastTool = tool || '';
    data.journey.lastVisited = tool ? Date.now() : data.journey.lastVisited;
    return save(data);
  }

  function normalizeMeta(meta = {}) {
    const themes = Array.isArray(meta.themes)
      ? [...new Set(meta.themes.map((theme) => String(theme).trim()).filter(Boolean))].slice(0, 6)
      : [];
    const allowedOutcomes = ['', 'improved', 'mixed', 'unchanged', 'harder', 'still-unfolding'];
    const allowedFollowUps = ['', 'active', 'completed', 'changed', 'abandoned', 'no-longer-relevant'];
    const outcome = allowedOutcomes.includes(String(meta.outcome || '')) ? String(meta.outcome || '') : '';
    const followUpStatus = allowedFollowUps.includes(String(meta.followUpStatus || '')) ? String(meta.followUpStatus || '') : '';
    return {
      themes,
      context: String(meta.context || '').trim().slice(0, 1200),
      outcome,
      helped: String(meta.helped || '').trim().slice(0, 1200),
      changed: String(meta.changed || '').trim().slice(0, 1200),
      followUpStatus,
      followUpNote: String(meta.followUpNote || '').trim().slice(0, 1200)
    };
  }

  function recordToolEntry(tool, payload = {}) {
    const data = load();
    const now = Date.now();
    const meta = normalizeMeta(payload.meta || {});
    const entry = {
      id: `${String(tool || 'tool').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${now}-${Math.random().toString(36).slice(2, 8)}`,
      tool: tool || 'Member Tool',
      createdAt: now,
      updatedAt: now,
      title: String(payload.title || '').slice(0, 160),
      summary: String(payload.summary || '').slice(0, 2400),
      tags: meta.themes.length
        ? meta.themes
        : (Array.isArray(payload.tags) ? payload.tags.slice(0, 12).map((tag) => String(tag).slice(0, 60)) : []),
      meta,
      data: payload.data && typeof payload.data === 'object' ? payload.data : {}
    };
    data.activity.entries = [entry, ...(data.activity.entries || [])].slice(0, MAX_ACTIVITY_ENTRIES);
    data.journey.lastTool = entry.tool;
    data.journey.lastVisited = now;
    const result = save(data);
    return { ...result, entry };
  }

  function listEntries(tool = '') {
    const entries = load().activity.entries || [];
    return tool ? entries.filter((entry) => entry.tool === tool) : entries;
  }

  function updateEntry(id, patch = {}) {
    const data = load();
    const index = (data.activity.entries || []).findIndex((entry) => entry.id === id);
    if (index < 0) return { ok: false, data, error: new Error('Entry not found') };
    const current = data.activity.entries[index];
    data.activity.entries[index] = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
      tags: Array.isArray(patch.tags) ? patch.tags.slice(0, 12).map((tag) => String(tag).slice(0, 60)) : current.tags,
      meta: patch.meta ? normalizeMeta(patch.meta) : normalizeMeta(current.meta || { themes: current.tags || [] }),
      data: patch.data && typeof patch.data === 'object' ? patch.data : current.data
    };
    return save(data);
  }

  function updateEntryMeta(id, metaPatch = {}) {
    const data = load();
    const index = (data.activity.entries || []).findIndex((entry) => entry.id === id);
    if (index < 0) return { ok: false, data, error: new Error('Entry not found') };
    const current = data.activity.entries[index];
    const currentMeta = normalizeMeta(current.meta || { themes: current.tags || [] });
    const nextMeta = normalizeMeta({ ...currentMeta, ...metaPatch });
    data.activity.entries[index] = {
      ...current,
      updatedAt: Date.now(),
      tags: nextMeta.themes,
      meta: nextMeta
    };
    return save(data);
  }

  function normalizeLensRelation(value) {
    const allowed = ['', 'supports', 'challenges', 'exception', 'unclear'];
    const relation = String(value || '');
    return allowed.includes(relation) ? relation : '';
  }

  function setPatternLens(patch = {}) {
    const data = load();
    const current = data.review.patternLens || defaults().review.patternLens;
    const entryRelations = { ...(current.entryRelations || {}) };
    if (patch.entryRelations && typeof patch.entryRelations === 'object') {
      Object.entries(patch.entryRelations).forEach(([entryId, relation]) => {
        const normalized = normalizeLensRelation(relation);
        if (normalized) entryRelations[entryId] = normalized;
        else delete entryRelations[entryId];
      });
    }
    data.review.patternLens = {
      statement: String(patch.statement ?? current.statement ?? '').trim().slice(0, 300),
      hypothesis: String(patch.hypothesis ?? current.hypothesis ?? '').trim().slice(0, 1200),
      entryRelations,
      updatedAt: Date.now()
    };
    return save(data);
  }

  function setPatternLensRelation(entryId, relation) {
    const data = load();
    if (!(data.activity.entries || []).some((entry) => entry.id === entryId)) {
      return { ok: false, data, error: new Error('Entry not found') };
    }
    const normalized = normalizeLensRelation(relation);
    const relations = { ...(data.review.patternLens?.entryRelations || {}) };
    if (normalized) relations[entryId] = normalized;
    else delete relations[entryId];
    data.review.patternLens = {
      ...(data.review.patternLens || defaults().review.patternLens),
      entryRelations: relations,
      updatedAt: Date.now()
    };
    return save(data);
  }

  function clearPatternLens() {
    const data = load();
    data.review.patternLens = defaults().review.patternLens;
    return save(data);
  }

  function savePeriodicReview(days, takeaway, nextAction) {
    const allowed = [7, 30, 90];
    const period = allowed.includes(Number(days)) ? Number(days) : 30;
    const data = load();
    data.review.periodic[String(period)] = {
      takeaway: String(takeaway || '').trim().slice(0, 1600),
      nextAction: String(nextAction || '').trim().slice(0, 600),
      savedAt: Date.now()
    };
    if (String(nextAction || '').trim()) data.journey.nextAction = String(nextAction).trim().slice(0, 600);
    return save(data);
  }

  function getPeriodicReview(days) {
    const period = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
    return load().review.periodic?.[String(period)] || { takeaway: '', nextAction: '', savedAt: null };
  }

  function removeEntry(id) {
    const data = load();
    data.activity.entries = (data.activity.entries || []).filter((entry) => entry.id !== id);
    if (data.review.patternLens?.entryRelations) delete data.review.patternLens.entryRelations[id];
    return save(data);
  }

  function clearActivity() {
    const data = load();
    data.activity.entries = [];
    if (data.review.patternLens) data.review.patternLens.entryRelations = {};
    return save(data);
  }

  function reset() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(LEGACY_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  function exportJson() {
    return JSON.stringify(load(), null, 2);
  }

  window.NBJBMemberService = {
    KEY,
    stages,
    defaults,
    load,
    save,
    update,
    setFocus,
    setStageProgress,
    noteTool,
    recordToolEntry,
    listEntries,
    updateEntry,
    updateEntryMeta,
    setPatternLens,
    setPatternLensRelation,
    clearPatternLens,
    savePeriodicReview,
    getPeriodicReview,
    removeEntry,
    clearActivity,
    reset,
    exportJson
  };
})();