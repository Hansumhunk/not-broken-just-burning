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
    }
  });

  function merge(base, patch) {
    const patchEntries = patch?.activity?.entries;
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

  function recordToolEntry(tool, payload = {}) {
    const data = load();
    const now = Date.now();
    const entry = {
      id: `${String(tool || 'tool').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${now}-${Math.random().toString(36).slice(2, 8)}`,
      tool: tool || 'Member Tool',
      createdAt: now,
      title: String(payload.title || '').slice(0, 160),
      summary: String(payload.summary || '').slice(0, 2400),
      tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 12).map((tag) => String(tag).slice(0, 60)) : [],
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

  function removeEntry(id) {
    const data = load();
    data.activity.entries = (data.activity.entries || []).filter((entry) => entry.id !== id);
    return save(data);
  }

  function clearActivity() {
    const data = load();
    data.activity.entries = [];
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
    removeEntry,
    clearActivity,
    reset,
    exportJson
  };
})();