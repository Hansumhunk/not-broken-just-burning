(() => {
  const KEY = 'nbjb.member.v2';
  const LEGACY_KEY = 'nbjb.member.v1';

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
    }
  });

  function merge(base, patch) {
    return {
      ...base,
      ...patch,
      profile: { ...base.profile, ...(patch?.profile || {}) },
      journey: {
        ...base.journey,
        ...(patch?.journey || {}),
        progress: { ...base.journey.progress, ...(patch?.journey?.progress || {}) }
      },
      preferences: { ...base.preferences, ...(patch?.preferences || {}) }
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
    reset,
    exportJson
  };
})();