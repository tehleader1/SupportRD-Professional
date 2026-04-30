(()=>{
  const BUILD = 'backend-outreach-20260430a';
  const modules = [
    '/static/rebuild/sr-app-state.js',
    '/static/rebuild/sr-account-backbone.js',
    '/static/rebuild/sr-commerce-rank.js',
    '/static/rebuild/sr-real-integrations.js',
    '/static/rebuild/sr-global-tracker.js',
    '/static/rebuild/sr-global-sweep.js',
    '/static/rebuild/sr-functional-surfaces.js',
    '/static/rebuild/sr-studio-motherboard.js',
    '/static/rebuild/sr-voice-assistants.js',
    '/static/rebuild/sr-remote-glide.js'
  ];

  function load(src){
    return new Promise((resolve, reject)=>{
      const script = document.createElement('script');
      script.src = `${src}?v=${BUILD}`;
      script.defer = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  function bindRemoteRoutes(root){
    if (window.__srRemoteRouteBinderInstalled) return;
    window.__srRemoteRouteBinderInstalled = true;
    document.addEventListener('click', event=>{
      const btn = event.target.closest?.('[data-route]');
      if (!btn) return;
      const route = btn.dataset.route;
      if (!route) return;
      if (!btn.closest('.sr-page, .sr-remote, .sr-side, .sr-top-ad-strip, .sr-roam-assistant')) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      root.renderFunctionalPanel?.(route);
      if (route === 'aria' || route === 'jake') {
        root.startAssistantSequence?.(route, !!btn.dataset.handsFree);
      }
    }, true);
  }

  function boot(){
    const root = window.SupportRDRebuild || {};
    root.initAccountBackbone?.();
    root.initCommerceRank?.();
    root.initGlobalTracker?.();
    root.initGlobalSweep?.();
    root.initFunctionalSurfaces?.();
    root.initStudioMotherboard?.();
    root.initVoiceAssistants?.();
    root.initRemoteGlide?.();
    bindRemoteRoutes(root);
    const path = String(window.location.pathname || '').toLowerCase();
    root.renderFunctionalPanel?.(path.includes('globaltracker') ? 'globaltracker' : 'diary');
  }

  window.SupportRD34H = window.SupportRD34H || {};
  window.SupportRD34H.version = BUILD;
  modules.reduce((chain, src)=>chain.then(()=>load(src)), Promise.resolve())
    .then(()=> {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
      else boot();
    })
    .catch(err=>{
      console.error('[SupportRD] runtime load failed', err);
      document.querySelector('#remoteStage')?.insertAdjacentHTML('afterbegin', '<section class="sr-room-card"><h3>SupportRD runtime needs refresh</h3><p>One of the remote modules did not load. Refresh the page and try again.</p></section>');
    });
})();
