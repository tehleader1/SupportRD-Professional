(function(){
  window.SupportRDRebuild = window.SupportRDRebuild || {};
  const root = window.SupportRDRebuild;

  const KEY = 'srAppStateV24';

  function read(){
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  }

  function write(state){
    localStorage.setItem(KEY, JSON.stringify(state || {}));
    return state;
  }

  function patchAppStateSection(section, value){
    const state = read();
    state[section] = {
      ...(state[section] || {}),
      ...(value || {})
    };
    state.updatedAt = new Date().toISOString();
    return write(state);
  }

  function getAppState(){
    return read();
  }

  function createStore(key, defaults){
    const storeKey = key || KEY;
    const base = defaults || {};
    function getState(){
      try { return { ...base, ...JSON.parse(localStorage.getItem(storeKey) || '{}') }; } catch { return { ...base }; }
    }
    function replace(next){
      localStorage.setItem(storeKey, JSON.stringify(next || {}));
      return getState();
    }
    function patch(update){
      const next = { ...getState(), ...(update || {}) };
      localStorage.setItem(storeKey, JSON.stringify(next));
      return next;
    }
    return { getState, replace, patch };
  }

  root.getAppState = getAppState;
  root.patchAppStateSection = patchAppStateSection;
  root.createStore = createStore;
})();
