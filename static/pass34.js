(()=>{
  const BUILD = 'support-rd-clean-20260502l';
  const modules = [
    '/static/rebuild/sr-runtime-clean-start.js',
    '/static/rebuild/sr-app-state.js',
    '/static/rebuild/sr-account-backbone.js',
    '/static/rebuild/sr-login-square.js',
    '/static/rebuild/sr-account-intelligence-settings.js',
    '/static/rebuild/sr-faq-reel-lounge.js',
    '/static/rebuild/sr-commerce-rank.js',
    '/static/rebuild/sr-real-integrations.js',
    '/static/rebuild/sr-global-tracker.js',
    '/static/rebuild/sr-global-sweep.js',
    '/static/rebuild/sr-functional-surfaces.js',
    '/static/rebuild/sr-diary-backlink-video.js',
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

  function boot(){
    const root = window.SupportRDRebuild || {};
    root.initAccountBackbone?.();
    root.initLoginSquare?.();
    root.initAccountIntelligenceSettings?.();
    root.initFaqReelLounge?.();
    root.initCommerceRank?.();
    root.initGlobalTracker?.();
    root.initGlobalSweep?.();
    root.initFunctionalSurfaces?.();
    root.initStudioMotherboard?.();
    root.initVoiceAssistants?.();
    root.initRemoteGlide?.();
    root.initDiaryBacklinkVideo?.();
    const path = String(window.location.pathname || '').toLowerCase();
    const route =
      path.includes('globaltracker') ? 'globaltracker' :
      path.includes('settings') ? 'settings' :
      path.includes('studio') ? 'studio' :
      path.includes('profile') ? 'profile' :
      path.includes('faq') ? 'faq' :
      path.includes('map') ? 'map' :
      path.includes('market') ? 'market' :
      path.includes('catalog') || path.includes('products') ? 'catalog' :
      'diary';
    root.renderFunctionalPanel?.(route);
    setTimeout(()=>root.initDiaryBacklinkVideo?.(), 80);
  }

  modules.reduce((chain, src)=>chain.then(()=>load(src)), Promise.resolve())
    .then(()=> {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
      else boot();
    })
    .catch(err=>{
      console.error('[SupportRD CLEAN] runtime load failed', err);
    });
})();
