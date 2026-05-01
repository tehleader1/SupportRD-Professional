(function(){
  const CLEAN_VERSION = 'sr-clean-runtime-20260501a';
  const KEEP_KEYS = new Set([
    'srLoginPanelV27',
    'srUnifiedAccountBackboneV28',
    'srAccountSettingsV1',
    'srFaqReelLoungeV4'
  ]);
  const DELETE_PREFIXES = [
    'srFunctionalRoomsV',
    'srFaqReelLoungeV1',
    'srFaqReelLoungeV2',
    'srFaqReelLoungeV3',
    'srDiaryTheaterViewsV1',
    'srDiaryTheaterEventsV1',
    'srSignalsGroupPaid',
    'srGlobalTracker',
    'srGlobalSweep',
    'srCommerceRank'
  ];

  function shouldDelete(key){
    if (KEEP_KEYS.has(key)) return false;
    return DELETE_PREFIXES.some(prefix => key.startsWith(prefix));
  }

  function clearOldStorage(){
    try {
      const last = localStorage.getItem('srCleanRuntimeVersion');
      if (last === CLEAN_VERSION) return;
      Object.keys(localStorage).forEach(key => {
        if (shouldDelete(key)) localStorage.removeItem(key);
      });
      localStorage.setItem('srCleanRuntimeVersion', CLEAN_VERSION);
    } catch {}
  }

  function clearOldNodes(){
    const selectors = [
      '#srDiaryTheater',
      '#srDiaryTheaterCss',
      '#srGlobalTrackerPanel',
      '#srMarketStatus',
      '[data-panel="globaltracker"]',
      '[data-panel="market"]'
    ];
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(node => node.remove());
    });
    document.body.classList.remove('sr-theater-on');
  }

  function installRenderLock(){
    window.SupportRDRebuild = window.SupportRDRebuild || {};
    window.SupportRDRebuild.__cleanRuntime = CLEAN_VERSION;
    window.__srRemoteRouteBinderInstalled = false;
  }

  function init(){
    clearOldStorage();
    installRenderLock();
    if (document.body) clearOldNodes();
  }

  init();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', clearOldNodes, { once:true });
})();