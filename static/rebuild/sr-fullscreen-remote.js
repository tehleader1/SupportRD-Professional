(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const REMOTE_KEY = 'sr_fullscreen_remote_v1';

  const ROUTES = {
    aria: {
      id:'aria',
      label:'Aria AI',
      kind:'assistant',
      title:'ARIA Hair Assistant',
      description:'ARIA is the main hair-care assistant. She routes questions, map behavior, analysis history, and account seriousness into one guided conversation.',
      assistant:'aria'
    },
    jake: {
      id:'jake',
      label:'Jake AI',
      kind:'assistant',
      title:'Jake Studio Assistant',
      description:'Jake is the Studio and execution assistant. He helps with exports, FX memory, beat-to-vocal checks, and serious workflow follow-through.',
      assistant:'jake'
    },
    diary: {
      id:'diary',
      label:'Diary',
      kind:'page',
      src:'/static/local-diary.html',
      title:'Diary Live Lane',
      description:'Diary is the live money/posting lane. It keeps history, live comments, map-specific prompts, tip movement, hair-analysis history, and serious user activity.'
    },
    studio: {
      id:'studio',
      label:'Studio',
      kind:'page',
      src:'/static/local-studio.html',
      title:'Studio Creation Lane',
      description:'Studio is the strongest standalone subsystem. It stays independent but feeds Profile, rank, and serious export signals through the rebuild bridge.'
    },
    profile: {
      id:'profile',
      label:'Profile',
      kind:'page',
      src:'/static/local-profile.html',
      title:'Profile Professional Lane',
      description:'Profile is the premium identity surface: verification, hair history, professional status, map identity, credibility, and account seriousness.'
    },
    faq: {
      id:'faq',
      label:'FAQ Lounge',
      kind:'page',
      src:'/static/local-faq.html',
      title:'FAQ Lounge Visibility Lane',
      description:'FAQ Lounge is the social proof and SEO bridge: comments, recent works, featured mentions, map story, reels, and human proof.'
    },
    settings: {
      id:'settings',
      label:'Settings',
      kind:'page',
      src:'/static/local-settings.html',
      title:'Settings / Account Controls',
      description:'Settings owns account options, preferences, saved choices, and the places where each serious option should reflect history and rating.'
    },
    catalog: {
      id:'catalog',
      label:'Catalog / Payments',
      kind:'catalog',
      title:'Catalog / Payments',
      description:'Catalog and Payments connect product intent, checkout, Fast Pay, support tips, and Making Money seriousness.',
      src:'/static/custom-order.html'
    },
    map: {
      id:'map',
      label:'Map Change',
      kind:'page',
      src:'/static/local-map.html',
      title:'Map Change System',
      description:'Map Change changes the world, perks, surface behavior, and account/rank seriousness.'
    }
  };

  const DEFAULTS = {
    activeRoute:'diary',
    previousRoute:'',
    history:[],
    frameReady:false,
    ui:{
      hostMinHeight:720,
      navMinHeight:88,
      lastAction:''
    }
  };

  const store = root.createStore ? root.createStore(REMOTE_KEY, DEFAULTS) : null;

  function getRemoteRouteState(){
    return store ? store.getState() : DEFAULTS;
  }

  function patchRemoteRouteState(patch){
    const next = store ? store.patch(patch || {}) : patch || {};
    try{
      root.patchAppStateSection?.('fullscreenRemote', {
        activeRoute:next.activeRoute,
        previousRoute:next.previousRoute,
        history:next.history || [],
        frameReady:!!next.frameReady,
        ui:next.ui || {}
      });
    }catch{}
    return next;
  }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, (char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function ensureRemoteShell(){
    let shell = document.querySelector('#srFullscreenRemoteShell');
    if (shell) return shell;
    shell = document.createElement('section');
    shell.id = 'srFullscreenRemoteShell';
    shell.className = 'sr-fullscreen-remote-shell';
    shell.innerHTML = `
      <div class="sr-fullscreen-remote-head">
        <div>
          <span>SupportRD Remote</span>
          <strong id="srRemoteRouteTitle">Remote</strong>
          <p id="srRemoteRouteSummary">Choose a route to open fullscreen underneath.</p>
        </div>
        <div id="srRemoteNav" class="sr-fullscreen-remote-nav"></div>
      </div>
      <div id="srRemoteAssistantBar" class="sr-remote-assistant-bar">
        <button class="btn" type="button" data-sr-remote-route="aria">Open ARIA</button>
        <button class="btn ghost" type="button" data-sr-remote-route="jake">Open Jake</button>
        <span id="srRemoteAssistantStatus">Assistants are ready.</span>
      </div>
      <div id="srRemoteContentHost" class="sr-remote-content-host" aria-live="polite"></div>
    `;
    const anchor = document.querySelector('#app') || document.body.firstElementChild;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(shell, anchor);
    else document.body.appendChild(shell);
    return shell;
  }

  function renderRemoteNav(){
    const shell = ensureRemoteShell();
    const nav = shell.querySelector('#srRemoteNav');
    const state = getRemoteRouteState();
    if (!nav) return false;
    nav.innerHTML = Object.values(ROUTES).map((route)=>`
      <button class="sr-remote-nav-btn ${state.activeRoute === route.id ? 'active' : ''}" type="button" data-sr-remote-route="${route.id}">
        ${route.label}
      </button>
    `).join('');
    if (!nav.__srRemoteNavBound) {
      shell.addEventListener('click', (event)=>{
        const btn = event.target.closest?.('[data-sr-remote-route]');
        if (!btn) return;
        openRemoteRoute(btn.dataset.srRemoteRoute, { source:'remote-nav' });
      });
      nav.__srRemoteNavBound = true;
    }
    return true;
  }

  function renderAssistantRoute(route){
    const shell = ensureRemoteShell();
    const host = shell.querySelector('#srRemoteContentHost');
    const status = shell.querySelector('#srRemoteAssistantStatus');
    if (!host) return false;
    const who = route.assistant === 'jake' ? 'Jake' : 'ARIA';
    host.innerHTML = `
      <section class="sr-assistant-fullscreen" data-sr-remote-content="${route.id}">
        <div class="sr-assistant-orb">${who}</div>
        <div class="sr-assistant-copy">
          <span>Assistant AI</span>
          <h2>${esc(route.title)}</h2>
          <p>${esc(route.description)}</p>
          <div class="sr-assistant-actions">
            <button class="btn" type="button" data-sr-assistant-action="${route.assistant}">${who} Ready</button>
            <button class="btn ghost" type="button" data-sr-remote-route="diary">Open Diary History</button>
            <button class="btn ghost" type="button" data-sr-remote-route="catalog">Open Catalog / Payments</button>
          </div>
        </div>
      </section>
    `;
    if (status) status.textContent = `${who} assistant route is active.`;
    return true;
  }

  function renderFrameRoute(route){
    const shell = ensureRemoteShell();
    const host = shell.querySelector('#srRemoteContentHost');
    if (!host) return false;
    host.innerHTML = `
      <iframe
        class="sr-remote-fullscreen-frame"
        title="${esc(route.title)}"
        src="${esc(route.src)}"
        loading="lazy"
        data-sr-remote-frame="${esc(route.id)}"
      ></iframe>
    `;
    return true;
  }

  function renderCatalogRoute(route){
    const shell = ensureRemoteShell();
    const host = shell.querySelector('#srRemoteContentHost');
    if (!host) return false;
    host.innerHTML = `
      <section class="sr-catalog-fullscreen" data-sr-remote-content="catalog">
        <div class="sr-catalog-hero">
          <span>Catalog / Payments</span>
          <h2>${esc(route.title)}</h2>
          <p>${esc(route.description)}</p>
          <div class="sr-catalog-actions">
            <button class="btn" type="button" data-sr-catalog-action="fastpay">Open Fast Pay</button>
            <a class="btn ghost" href="/static/custom-order.html" target="srCatalogFrame">Open Product Catalog</a>
            <button class="btn ghost" type="button" data-sr-remote-route="settings">Settings</button>
          </div>
        </div>
        <iframe class="sr-remote-fullscreen-frame sr-catalog-frame" name="srCatalogFrame" title="SupportRD Catalog" src="${esc(route.src)}" loading="lazy"></iframe>
      </section>
    `;
    const fast = host.querySelector('[data-sr-catalog-action="fastpay"]');
    fast?.addEventListener('click', ()=>{
      try{ document.querySelector('#remotePurchaseProducts')?.click(); }catch{}
      try{ root.setShellSurface?.('payments', { source:'fullscreen-catalog' }); }catch{}
    });
    return true;
  }

  function openRemoteRoute(routeId, detail = {}){
    const route = ROUTES[routeId] || ROUTES.diary;
    const current = getRemoteRouteState();
    const shell = ensureRemoteShell();
    const title = shell.querySelector('#srRemoteRouteTitle');
    const summary = shell.querySelector('#srRemoteRouteSummary');
    if (title) title.textContent = route.title;
    if (summary) summary.textContent = route.description;
    if (route.kind === 'assistant') renderAssistantRoute(route);
    else if (route.kind === 'catalog') renderCatalogRoute(route);
    else renderFrameRoute(route);

    document.documentElement.dataset.srRemoteRoute = route.id;
    try{ root.setShellSurface?.(route.id === 'catalog' ? 'payments' : route.id, { source:'fullscreen-remote' }); }catch{}
    const entry = { route:route.id, at:new Date().toISOString(), source:detail.source || 'remote-route' };
    const next = patchRemoteRouteState({
      activeRoute:route.id,
      previousRoute:current.activeRoute || '',
      frameReady:route.kind !== 'assistant',
      history:[entry, ...((current.history) || [])].slice(0, 80),
      ui:{ ...(current.ui || {}), lastAction:'open-route' }
    });
    renderRemoteNav();
    try{ window.dispatchEvent(new CustomEvent('supportrd-remote-route-opened', { detail:{ route, state:next } })); }catch{}
    return next;
  }

  function getRemoteRoutes(){
    return ROUTES;
  }

  function initFullscreenRemote(){
    ensureRemoteShell();
    renderRemoteNav();
    openRemoteRoute(getRemoteRouteState().activeRoute || 'diary', { source:'init' });
    return getRemoteRouteState();
  }

  root.remoteRouteDefinitions = ROUTES;
  root.getRemoteRoutes = getRemoteRoutes;
  root.getRemoteRouteState = getRemoteRouteState;
  root.patchRemoteRouteState = patchRemoteRouteState;
  root.ensureRemoteShell = ensureRemoteShell;
  root.renderRemoteNav = renderRemoteNav;
  root.openRemoteRoute = openRemoteRoute;
  root.initFullscreenRemote = initFullscreenRemote;
})();
