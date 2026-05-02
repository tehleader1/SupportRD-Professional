(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const STORE_KEY = 'srGlobalSweepV1';
  const SWEEP_MS = 10 * 60 * 1000;
  const SERVER_STATUS_ENDPOINT = '/api/global-sweep/status';
  const SERVER_RUN_ENDPOINT = '/api/global-sweep/run';
  const VIRAL_ENDPOINT = '/api/viral-engine/opportunities';
  const OUTREACH_MOVEMENTS_ENDPOINT = '/api/outreach/movements';
  const OUTREACH_TICK_ENDPOINT = '/api/outreach/tick';
  const OUTREACH_EXPAND_ENDPOINT = '/api/outreach/expand';
  const OUTREACH_FOLLOWUPS_ENDPOINT = '/api/outreach/followups';
  const LIVE_SUPPORT_RD_ORIGIN = 'https://supportrd.com';
  const IS_LOCAL_PREVIEW = ['127.0.0.1', 'localhost', '::1'].includes(window.location.hostname || '');
  const TRAFFIC_ORIGIN = IS_LOCAL_PREVIEW ? LIVE_SUPPORT_RD_ORIGIN : '';
  const TRAFFIC_SUMMARY_ENDPOINT = `${TRAFFIC_ORIGIN}/api/shopify/traffic/summary`;
  const TRAFFIC_PIXEL_ENDPOINT = `${TRAFFIC_ORIGIN}/api/shopify/traffic/pixel`;
  const TRAFFIC_MANUAL_SESSIONS_ENDPOINT = `${TRAFFIC_ORIGIN}/api/shopify/traffic/manual-sessions`;
  const TRAFFIC_PING_KEY = 'srTrafficPingEnabled';
  const TRAFFIC_CLIENT_KEY = 'srTrafficClientId';
  const TRAFFIC_LAST_ALERT_KEY = 'srTrafficLastAlertAt';
  const TRAFFIC_FIRST_BOT_KEY = 'srTrafficFirstBotReturnKey';
  const BOT_LIVE_MS = 8000;
  const BOT_PHASE_MS = 1400;
  const BOT_FETCH_MS = 30000;
  const TRAFFIC_FETCH_MS = 6000;
  const PERSONAL_ENDPOINTS = ['/api/tracker/personal','/api/personal-tracker','/api/tracker'];
  const SHOPIFY_ENDPOINTS = ['/api/shopify/live','/api/shopify/live-analytics','/api/shopify/tracker'];

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function read(){
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch { return {}; }
  }

  function write(next){
    localStorage.setItem(STORE_KEY, JSON.stringify(next || {}));
    return next;
  }

  function normalize(value){
    return String(value || '').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'');
  }

  function maskToken(token){
    const raw = String(token || '');
    const [key, ...rest] = raw.split(':');
    const value = rest.join(':');
    if (!value) return raw;
    const lower = key.toLowerCase();
    if (lower.includes('email')) {
      const [, domain = 'email'] = value.split('@');
      return `${key}:***@${domain}`;
    }
    if (lower.includes('phone')) return `${key}:***${value.slice(-4)}`;
    if (lower.includes('ip')) return `${key}:masked`;
    if (lower.includes('customer') || lower.includes('visitor') || lower.includes('session') || lower.includes('checkout') || lower.includes('cart') || lower === 'id') {
      return `${key}:...${value.slice(-6)}`;
    }
    return raw.length > 52 ? `${raw.slice(0, 49)}...` : raw;
  }

  function compactMatch(match){
    return {
      personalIndex: match?.personalIndex ?? 0,
      shopifyIndex: match?.shopifyIndex ?? 0,
      exact: Array.isArray(match?.exact) ? match.exact.map(maskToken) : [],
      score: Number(match?.score || 0),
      at: match?.at || new Date().toISOString()
    };
  }

  function flattenPayload(payload){
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.rows)) return payload.rows;
    if (Array.isArray(payload.events)) return payload.events;
    if (Array.isArray(payload.sessions)) return payload.sessions;
    if (Array.isArray(payload.matches)) return payload.matches;
    return [payload];
  }

  async function fetchFirstJson(urls){
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache:'no-store', headers:{ 'Accept':'application/json' } });
        if (!res.ok) continue;
        return { url, data: await res.json(), ok:true };
      } catch {}
    }
    return { url:'localStorage', data:null, ok:false };
  }

  function localFallback(key){
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  }

  function normalizeServerSweep(payload){
    if (!payload || payload.ok === false) return null;
    const intervalMs = Number(payload.intervalMs || payload.intervalSeconds * 1000 || SWEEP_MS);
    return {
      lastRun: payload.lastRun || payload.updated_at || new Date().toISOString(),
      nextRun: payload.nextRun || new Date(Date.now() + intervalMs).toISOString(),
      intervalMs,
      personalSource: 'server tracker',
      shopifySource: payload.shopifyAdminConnected ? 'shopify admin + tracker' : 'tracker cache',
      personalCount: Number(payload.personalCount || 0),
      shopifyCount: Number(payload.shopifyCount || 0),
      matchCount: Number(payload.matchCount || 0),
      matches: Array.isArray(payload.matches) ? payload.matches.map(compactMatch) : [],
      shopifyAdminConnected: !!payload.shopifyAdminConnected,
      serverSweep: true
    };
  }

  async function fetchServerSweep(runNow){
    try {
      const res = await fetch(runNow ? SERVER_RUN_ENDPOINT : SERVER_STATUS_ENDPOINT, {
        method: runNow ? 'POST' : 'GET',
        cache:'no-store',
        headers:{ 'Accept':'application/json' }
      });
      if (!res.ok) return null;
      return normalizeServerSweep(await res.json());
    } catch {
      return null;
    }
  }

  async function refreshOpportunities(){
    try {
      const res = await fetch(VIRAL_ENDPOINT, { cache:'no-store', headers:{ 'Accept':'application/json' } });
      if (!res.ok) return null;
      const payload = await res.json();
      const state = read();
      const next = {
        ...state,
        opportunities: Array.isArray(payload.opportunities) ? payload.opportunities.slice(0, 8) : [],
        opportunitiesUpdatedAt: payload.generatedAt || new Date().toISOString()
      };
      write(next);
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return next;
    } catch {
      return null;
    }
  }

  async function refreshOutreachMovements(pushNow){
    try {
      if (pushNow) {
        await fetch(OUTREACH_EXPAND_ENDPOINT, { method:'POST', cache:'no-store', headers:{ 'Accept':'application/json' } }).catch(()=>null);
        await fetch(OUTREACH_TICK_ENDPOINT, { method:'POST', cache:'no-store', headers:{ 'Accept':'application/json' } }).catch(()=>null);
      }
      const res = await fetch(OUTREACH_MOVEMENTS_ENDPOINT, { cache:'no-store', headers:{ 'Accept':'application/json' } });
      if (!res.ok) return null;
      const payload = await res.json();
      const state = read();
      const next = {
        ...state,
        outreachMovements: Array.isArray(payload.movements) ? payload.movements.slice(0, 80) : [],
        outreachSummary: {
          count: payload.count || 0,
          loaded: Array.isArray(payload.movements) ? Math.min(payload.movements.length, 80) : 0,
          intervalSeconds: payload.intervalSeconds || 900,
          safety: payload.safety || 'Drafts and logs only.'
        },
        outreachFocusLive: payload.focusLive || state.outreachFocusLive || null,
        outreachFollowups: Array.isArray(payload.followups) ? payload.followups.slice(0, 40) : state.outreachFollowups || [],
        outreachSettings: payload.settings || state.outreachSettings || null,
        outreachLiveTick: Number(state.outreachLiveTick || 0) + 1,
        outreachUpdatedAt: new Date().toISOString()
      };
      write(next);
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return next;
    } catch {
      return null;
    }
  }

  async function queueSmartFollowup(context){
    const state = read();
    const active = currentMovement(state);
    try {
      const res = await fetch(OUTREACH_FOLLOWUPS_ENDPOINT, {
        method:'POST',
        cache:'no-store',
        headers:{ 'Accept':'application/json', 'Content-Type':'application/json' },
        body: JSON.stringify({
          id: active.id,
          key: active.key,
          context: context || active.draft || active.movement || active.focus_reason || ''
        })
      });
      if (res.ok) {
        const payload = await res.json();
        const followups = [payload.followup, ...((state.outreachFollowups || []).filter(Boolean))].slice(0, 40);
        write({ ...state, outreachFollowups: followups, outreachUpdatedAt: new Date().toISOString() });
      }
    } catch {}
    return refreshOutreachMovements(false);
  }

  async function approveSmartFollowup(id){
    if (!id) return null;
    try {
      await fetch(`${OUTREACH_FOLLOWUPS_ENDPOINT}/${encodeURIComponent(id)}/approve`, {
        method:'POST',
        cache:'no-store',
        headers:{ 'Accept':'application/json' }
      });
    } catch {}
    return refreshOutreachMovements(false);
  }

  function trafficClientId(){
    try {
      let id = localStorage.getItem(TRAFFIC_CLIENT_KEY);
      if (!id) {
        id = `dashboard-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(TRAFFIC_CLIENT_KEY, id);
      }
      return id;
    } catch {
      return 'dashboard-client';
    }
  }

  function trafficPingEnabled(){
    try { return localStorage.getItem(TRAFFIC_PING_KEY) === '1'; }
    catch { return false; }
  }

  function trafficFive(summary){
    const shopify = Array.isArray(summary?.shopify) ? summary.shopify : [];
    const local = Array.isArray(summary?.local) ? summary.local : [];
    return shopify.find(item=>Number(item.window_minutes) === 5) || local.find(item=>Number(item.window_minutes) === 5) || shopify[0] || local[0] || {};
  }

  function renderShopifySessionsReport(report, manualReport){
    const data = report || {};
    const manual = manualReport || {};
    const series = Array.isArray(data.series) ? data.series : [];
    const manualSeries = Array.isArray(manual.series) ? manual.series : [];
    const activeSeries = series.length ? series : manualSeries;
    const peak = Math.max(1, ...activeSeries.map(item=>Math.max(Number(item.sessions || 0), Number(item.online_store_visitors || 0))));
    const status = data.ok ? 'connected' : (data.configured ? 'needs scope' : 'needs token');
    const query = data.query || manual.query || 'FROM sessions SHOW online_store_visitors, sessions';
    return `
      <div class="sr-traffic-report ${data.ok ? 'connected' : 'setup'}">
        <div class="sr-traffic-report-copy">
          <span>ShopifyQL Admin Sessions</span>
          <strong>${data.ok ? 'Private sessions lane connected' : (manual.ok ? 'Manual sessions bridge active' : 'Sessions lane waiting')}</strong>
          <p>${esc(data.ok ? data.message : (manual.ok ? manual.message : (data.message || 'Connect Shopify Admin reporting or paste copied Shopify Analytics rows.')))}</p>
          <small>${esc(status)} · ${esc(data.store || 'supportdr-com.myshopify.com')} · ${esc(data.api_version || '2026-01')} · manual ${manual.ok ? 'saved' : 'empty'}</small>
        </div>
        <div class="sr-traffic-report-chart">
          ${(activeSeries.length ? activeSeries : [{label:'waiting', sessions:0, online_store_visitors:0}]).slice(-7).map(item=>{
            const sessions = Number(item.sessions || 0);
            const visitors = Number(item.online_store_visitors || 0);
            return `<article>
              <b>${esc(item.label || 'day')}</b>
              <div><i style="height:${Math.max(4, (sessions / peak) * 100)}%"></i><em style="height:${Math.max(4, (visitors / peak) * 100)}%"></em></div>
              <small>${esc(visitors)} visitors · ${esc(sessions)} sessions</small>
            </article>`;
          }).join('')}
        </div>
        <details>
          <summary>ShopifyQL query being tracked</summary>
          <pre>${esc(query)}</pre>
        </details>
        <div class="sr-traffic-manual">
          <div>
            <span>Manual Shopify Bridge</span>
            <strong>${manual.ok ? `${esc(manual.total_online_store_visitors || 0)} visitors · ${esc(manual.total_sessions || 0)} sessions` : 'Paste report link or copied rows'}</strong>
          </div>
          <input data-shopify-report-link type="url" placeholder="Shopify report URL" value="${esc(manual.report_link || '')}">
          <textarea data-shopify-report-text placeholder="Paste copied Shopify table, CSV, or JSON rows"></textarea>
          <button type="button" data-save-shopify-manual>Save Manual Sessions</button>
        </div>
      </div>
    `;
  }

  function trafficBeep(score){
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = root.__srTrafficAudio || new AudioContext();
      root.__srTrafficAudio = ctx;
      if (ctx.state === 'suspended') ctx.resume().catch(()=>null);
      const intensity = Math.max(1, Math.min(100, Number(score || 20)));
      const bursts = Math.max(1, Math.min(4, Math.ceil(intensity / 28)));
      for (let i = 0; i < bursts; i += 1) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 620 + (i * 120);
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.12;
        gain.gain.exponentialRampToValueAtTime(0.12, t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        osc.start(t);
        osc.stop(t + 0.16);
      }
    } catch {}
  }

  function trafficNotify(title, body, score){
    trafficBeep(score);
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      new Notification(title, { body, tag: 'supportrd-traffic-wave', renotify: true });
    } catch {}
  }

  function maybeNotifyTrafficWave(summary){
    if (!trafficPingEnabled() || !summary) return;
    const five = trafficFive(summary);
    const score = Number(summary.wave_score || five.events || 0);
    const hot = !!summary.wave_hot || !!five.hot || score >= 42;
    const latestBot = Array.isArray(summary.latest_bot_returns) ? summary.latest_bot_returns[0] : null;
    if (latestBot) {
      const key = `${latestBot.created_at || ''}:${latestBot.path || ''}:${latestBot.campaign || ''}`;
      let seen = '';
      try { seen = localStorage.getItem(TRAFFIC_FIRST_BOT_KEY) || ''; } catch {}
      if (key && key !== seen) {
        try { localStorage.setItem(TRAFFIC_FIRST_BOT_KEY, key); } catch {}
        trafficNotify(
          'SupportRD bot brought someone back',
          `${latestBot.source || 'Bot source'} landed on ${latestBot.path || '/'}`,
          Math.max(score, 80)
        );
        return;
      }
    }
    if (!hot) return;
    const now = Date.now();
    let last = 0;
    try { last = Number(localStorage.getItem(TRAFFIC_LAST_ALERT_KEY) || 0); } catch {}
    if (now - last < 60000) return;
    try { localStorage.setItem(TRAFFIC_LAST_ALERT_KEY, String(now)); } catch {}
    trafficNotify(
      'SupportRD traffic wave',
      `${five.visitors || 0} visitors and ${five.events || 0} events in the live window.`,
      score
    );
  }

  async function sendDashboardTrafficPing(){
    try {
      const params = new URLSearchParams(location.search || '');
      if (window.top !== window || params.has('_globalBotPreview')) return;
      await fetch(TRAFFIC_PIXEL_ENDPOINT, {
        method:'POST',
        cache:'no-store',
        headers:{ 'Accept':'application/json', 'Content-Type':'application/json' },
        body: JSON.stringify({
          source: params.get('utm_source') || params.get('sr_source') || 'supportrd_globaltracker',
          event_name: 'globaltracker_dashboard_view',
          client_id: trafficClientId(),
          url: location.href,
          path: `${location.pathname || '/'}${location.search || ''}`,
          title: document.title || 'SupportRD Globaltracker',
          referrer: document.referrer || '',
          utm_source: params.get('utm_source') || '',
          utm_campaign: params.get('utm_campaign') || '',
          sr_bot: params.get('sr_bot') || params.get('sr_campaign') || ''
        })
      }).catch(()=>null);
    } catch {}
  }

  async function refreshTrafficSummary(sendPing){
    try {
      if (sendPing) await sendDashboardTrafficPing();
      const res = await fetch(TRAFFIC_SUMMARY_ENDPOINT, { cache:'no-store', headers:{ 'Accept':'application/json' } });
      if (!res.ok) return null;
      const payload = await res.json();
      const state = read();
      const next = {
        ...state,
        trafficSummary: payload,
        trafficPingEnabled: trafficPingEnabled(),
        trafficUpdatedAt: payload.updated_at || new Date().toISOString()
      };
      write(next);
      maybeNotifyTrafficWave(payload);
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return next;
    } catch {
      return null;
    }
  }

  async function saveManualShopifySessions(){
    const link = document.querySelector('[data-shopify-report-link]')?.value || '';
    const text = document.querySelector('[data-shopify-report-text]')?.value || '';
    try {
      const res = await fetch(TRAFFIC_MANUAL_SESSIONS_ENDPOINT, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
        body: JSON.stringify({ report_link: link, report_text: text })
      });
      if (!res.ok) return null;
      const manual = await res.json();
      const state = read();
      const trafficSummary = { ...(state.trafficSummary || {}), manual_sessions_report: manual };
      write({ ...state, trafficSummary, trafficUpdatedAt: manual.updated_at || new Date().toISOString() });
      trafficBeep(manual.ok ? 58 : 24);
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      refreshTrafficSummary(false);
      return manual;
    } catch {
      return null;
    }
  }

  async function toggleTrafficPing(){
    const nextEnabled = !trafficPingEnabled();
    if (nextEnabled && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }
    try { localStorage.setItem(TRAFFIC_PING_KEY, nextEnabled ? '1' : '0'); } catch {}
    if (nextEnabled) trafficBeep(55);
    const state = { ...read(), trafficPingEnabled: nextEnabled };
    write(state);
    if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
    refreshTrafficSummary(true);
  }

  function identityTokens(item){
    const keys = [
      'id','event_id','eventId','session_id','sessionId','visitor_id','visitorId','customer_id','customerId',
      'order_id','orderId','checkout_id','checkoutId','cart_token','cartToken','email','phone','product_id','productId',
      'variant_id','variantId','sku','handle','product_handle','productHandle','url','path','landing_page','landingPage',
      'source','campaign','utm_campaign','city','region','country','ip_hash','ipHash','account','username','tag'
    ];
    const out = new Set();
    keys.forEach(key=>{
      const val = item && item[key];
      if (val !== undefined && val !== null && String(val).trim()) out.add(`${key}:${normalize(val)}`);
    });
    if (item && item.product && typeof item.product === 'object') {
      ['id','handle','sku','title'].forEach(k=>{
        if (item.product[k]) out.add(`product.${k}:${normalize(item.product[k])}`);
      });
    }
    if (item && item.customer && typeof item.customer === 'object') {
      ['id','email','phone'].forEach(k=>{
        if (item.customer[k]) out.add(`customer.${k}:${normalize(item.customer[k])}`);
      });
    }
    return out;
  }

  function scoreMatches(personalRows, shopifyRows){
    const matches = [];
    personalRows.forEach((personal, pi)=>{
      const pTokens = identityTokens(personal);
      if (!pTokens.size) return;
      shopifyRows.forEach((shopify, si)=>{
        const sTokens = identityTokens(shopify);
        const exact = [...pTokens].filter(token=>sTokens.has(token));
        if (!exact.length) return;
        matches.push({
          personalIndex: pi,
          shopifyIndex: si,
          exact,
          score: exact.length,
          at: new Date().toISOString()
        });
      });
    });
    return matches.sort((a,b)=>b.score-a.score).slice(0,100);
  }

  async function runGlobalSweep(){
    const serverSweep = await fetchServerSweep(true);
    if (serverSweep) {
      const merged = { ...read(), ...serverSweep };
      write(merged);
      try { root.bumpCommerceRank?.('makingMoney', serverSweep.matchCount || 1); } catch {}
      try { refreshOpportunities(); } catch {}
      try { refreshOutreachMovements(false); } catch {}
      try {
        if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      } catch {}
      return merged;
    }

    const personalFetch = await fetchFirstJson(PERSONAL_ENDPOINTS);
    const shopifyFetch = await fetchFirstJson(SHOPIFY_ENDPOINTS);
    const personalRows = flattenPayload(personalFetch.data || localFallback('srPersonalTracker'));
    const shopifyRows = flattenPayload(shopifyFetch.data || localFallback('srShopifyTracker'));
    const matches = scoreMatches(personalRows, shopifyRows);
    const next = {
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + SWEEP_MS).toISOString(),
      intervalMs: SWEEP_MS,
      personalSource: personalFetch.url,
      shopifySource: shopifyFetch.url,
      personalCount: personalRows.length,
      shopifyCount: shopifyRows.length,
      matchCount: matches.length,
      matches: matches.map(compactMatch),
      serverSweep: false
    };
    write(next);
    try { root.bumpCommerceRank?.('makingMoney', matches.length || 1); } catch {}
    try { refreshOpportunities(); } catch {}
    try { refreshOutreachMovements(false); } catch {}
    try {
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
    } catch {}
    return next;
  }

  async function loadGlobalSweep(){
    const serverSweep = await fetchServerSweep(false);
    if (serverSweep) {
      const merged = { ...read(), ...serverSweep };
      write(merged);
      try { refreshOpportunities(); } catch {}
      try { refreshOutreachMovements(false); } catch {}
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return merged;
    }
    return runGlobalSweep();
  }

  function currentMovement(state){
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    const index = movements.length ? Number(state.outreachActiveIndex || 0) % movements.length : 0;
    return movements[index] || {
      category: 'bot warmup',
      status: 'waiting',
      title: 'Waiting for backend movement report',
      target: 'SupportRD growth queue',
      movement: 'Connect outreach movement endpoint -> load queue -> show owner approval controls.',
      next_action: 'Press Push Bot Movement to refresh the backend queue.',
      draft: 'The backend bot is ready to queue permission-based growth drafts.',
      score: 0,
      approval_boundary: 'Draft only. Manual approval required before posting, emailing, submitting, commenting, or using an account.',
      updated_at: new Date().toISOString()
    };
  }

  function botCommandFor(item, state){
    const phases = executionPhasesFor(item);
    const phaseIndex = phases.length ? Number(state?.outreachLivePhase || 0) % phases.length : 0;
    const phase = phases[phaseIndex] || phases[0] || {};
    return [
      'supportRD.backendBot.queueMovement({',
      `  mode: "draft_only",`,
      `  livePhase: "${String(phase.label || 'Scan')}",`,
      `  liveTick: ${Number(state?.outreachLiveTick || 0)},`,
      `  status: "${String(item.status || 'queued')}",`,
      `  category: "${String(item.category || 'opportunity')}",`,
      `  target: "${String(item.target || 'SupportRD audience').replace(/"/g, '\\"')}",`,
      `  website: "${String((item.website_target || {}).domain || 'owner-review target').replace(/"/g, '\\"')}",`,
      `  movement: "${String(item.movement || '').replace(/"/g, '\\"')}",`,
      `  draft: "${String(item.draft || '').replace(/"/g, '\\"')}",`,
      `  nextAction: "${String(item.next_action || '').replace(/"/g, '\\"')}",`,
      '  requiresOwnerApproval: true',
      '});'
    ].join('\n');
  }

  function dataStructureFor(state, item){
    const summary = state.outreachSummary || {};
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    return JSON.stringify({
      backendMode: true,
      botVisibleOnWebsite: false,
      queue: {
        total: Number(summary.count || movements.length || 0),
        loaded: movements.length,
        status: item.status || 'queued',
        intervalSeconds: Number(summary.intervalSeconds || 900)
      },
      selectedMovement: {
        title: item.title,
        category: item.category,
        target: item.target,
        score: item.score,
        movement: item.movement,
        next_action: item.next_action
      },
      safety: summary.safety || item.approval_boundary || 'Drafts and logs only. Manual approval is required before external action.'
    }, null, 2);
  }

  function executionPhasesFor(item){
    const category = item.category || 'growth movement';
    const target = item.target || 'SupportRD growth route';
    const movement = item.movement || 'Prepare the next permission-based SupportRD growth action.';
    const draft = item.draft || 'Draft is being shaped for owner review.';
    const boundary = item.approval_boundary || 'Draft only. Manual approval required before any external action.';
    return [
      {
        key: 'scan',
        label: 'Scan',
        status: 'Reading live opportunity queue',
        detail: `Checking ${category} movement signals for ${target}.`
      },
      {
        key: 'select',
        label: 'Select',
        status: 'Selecting the active move',
        detail: item.title || 'Choosing the highest-ready SupportRD growth movement.'
      },
      {
        key: 'reason',
        label: 'Decision Note',
        status: 'Writing visible decision note',
        detail: `${movement} Target route: ${target}.`
      },
      {
        key: 'compose',
        label: 'Draft',
        status: 'Composing owner-review draft',
        detail: draft
      },
      {
        key: 'guard',
        label: 'Safety Check',
        status: 'Checking approval boundary',
        detail: boundary
      },
      {
        key: 'queue',
        label: 'Queue',
        status: 'Saving movement to backend queue',
        detail: item.next_action || 'Hold this move for owner approval.'
      },
      {
        key: 'standby',
        label: 'Standby',
        status: 'Waiting for next tick',
        detail: 'No emails, posts, submissions, or comments are sent without approval.'
      }
    ];
  }

  function renderExecutionTrace(state, active){
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    const phases = executionPhasesFor(active);
    const phaseIndex = phases.length ? Number(state.outreachLivePhase || 0) % phases.length : 0;
    const current = phases[phaseIndex] || phases[0];
    const nextPhase = phases[(phaseIndex + 1) % phases.length] || current;
    const tick = Number(state.outreachLiveTick || 0);
    const opId = String((tick % 9999) + 1).padStart(4, '0');
    const now = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const target = active.target || 'SupportRD growth route';
    const website = websiteTargetFor(active);
    const status = active.status || 'queued';
    const boundary = active.approval_boundary || 'Draft only. Owner approval required before external action.';
    const traceLines = [
      `[${now}] queue.read rows=${movements.length}`,
      `[${now}] movement.select status=${status} target="${target}"`,
      `[${now}] website.target domain="${website.domain || website.label || 'review target'}"`,
      `[${now}] phase.${current.key} "${current.status}"`,
      `[${now}] approval.guard "${boundary}"`,
      `[${now}] next.phase "${nextPhase.label}"`
    ];
    return `
      <section class="sr-global-band sr-bot-execution" data-live-phase="${esc(current.key)}" aria-live="polite">
        <div class="sr-bot-exec-top">
          <div>
            <span>Live Operator Trace</span>
            <strong>Operation ${esc(opId)} is moving now</strong>
          </div>
          <div class="sr-bot-exec-pills">
            <b>Backend only</b>
            <b>Draft mode</b>
            <b>Approval locked</b>
          </div>
        </div>

        <div class="sr-bot-exec-main">
          <div class="sr-bot-orbit" aria-hidden="true">
            <i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
          <div class="sr-bot-exec-current">
            <span>Executing phase ${esc(phaseIndex + 1)} of ${esc(phases.length)}</span>
            <strong>${esc(current.status)}</strong>
            <p>${esc(current.detail)}</p>
            <code>target: ${esc(target)} | website: ${esc(website.domain || website.label || 'review target')} | queue: ${esc(movements.length)} | next: ${esc(nextPhase.label)}</code>
          </div>
          <pre class="sr-bot-console-feed">${esc(traceLines.join('\n'))}</pre>
        </div>

        <div class="sr-bot-phase-rail">
          ${phases.map((phase,index)=>`
            <span class="sr-bot-phase ${index === phaseIndex ? 'active' : ''} ${index < phaseIndex ? 'seen' : ''}">
              <i>${esc(index + 1)}</i>
              <b>${esc(phase.label)}</b>
            </span>
          `).join('')}
        </div>
      </section>
    `;
  }

  function placementLaneFor(item){
    const settings = read().outreachSettings || {};
    const text = `${item.category || ''} ${item.title || ''} ${item.target || ''}`.toLowerCase();
    const lanes = [
      ['Career comment/post', 'Career pages, job-readiness boards, workforce posts, and approved career comment areas', ['career']],
      ['College comment/post', 'College pages, student boards, campus channels, and approved college comment areas', ['college', 'student']],
      ['Community college entrance', 'Community college entrance, advising, student success, career fair, and comment/post channels', ['community college']],
      ['Social video feed comment', 'Regular social video feed comments under approved hair-related videos', ['social video', 'video feed', 'creator']],
      ['Blog post', 'Free contributor articles, write-for-us pages, and natural-hair blog submissions', ['blog post', 'free blog', 'guest post']],
      ['Featured blog post', 'Featured article, spotlight, editor review, rating, and tech-beauty list placement', ['featured blog', 'rating', 'newspaper', 'review']],
      ['Hair store / salon comment-post', 'Beauty supply, hair store, salon, stylist pages, and approved store/salon comments', ['hair store', 'salon', 'beauty supply']],
      ['Family/community post', 'Family-friendly, local community, parent/student, and neighborhood post drafts', ['family', 'community']],
      ['Attention diversity move', 'Unique low-competition places the bot uses when ordinary attention is weak', ['attention diversity', 'library', 'nonprofit', 'q&a', 'vendor', 'club']]
    ];
    const backendLane = item.placement_lane || item.placementLane;
    if (backendLane) {
      const configured = Array.isArray(settings.placement_lanes)
        ? settings.placement_lanes.find(lane=>lane.label === backendLane)
        : null;
      return {
        label: backendLane,
        detail: item.placement_detail || configured?.description || 'Backend-selected attention lane',
        lanes,
        diversifyTargets: item.diversity_targets || configured?.diversify_targets || []
      };
    }
    const priority = [lanes[2], lanes[5], lanes[3], lanes[6], lanes[4], lanes[8], lanes[0], lanes[1], lanes[7]].filter(Boolean);
    const active = priority.find(([, , terms])=>terms.some(term=>text.includes(term))) || lanes[0];
    return { label: active[0], detail: active[1], lanes, diversifyTargets: [] };
  }

  function slugify(value){
    return String(value || 'support-rd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'support-rd';
  }

  function websiteTargetFor(item){
    if (item?.website_target && item.website_target.url) return item.website_target;
    const placement = placementLaneFor(item);
    const label = placement.label;
    const fallback = label.includes('Community college')
      ? { label:'Central Piedmont', domain:'cpcc.edu', url:'https://www.cpcc.edu/', purpose:'Community college entrance and career-readiness review route.' }
      : label.includes('Career')
        ? { label:'NCWorks', domain:'ncworks.gov', url:'https://www.ncworks.gov/', purpose:'Career/workforce resource review route.' }
        : label.includes('College')
          ? { label:'Handshake', domain:'joinhandshake.com', url:'https://joinhandshake.com/', purpose:'College/career-center review route.' }
          : label.includes('Social video')
            ? { label:'YouTube', domain:'youtube.com', url:'https://www.youtube.com/', purpose:'Hair video comment or Shorts review route.' }
            : label.includes('Blog post')
              ? { label:'Medium', domain:'medium.com', url:'https://medium.com/', purpose:'Free blog/article draft route.' }
              : label.includes('Featured')
                ? { label:'Patch', domain:'patch.com', url:'https://patch.com/', purpose:'Local feature/news pitch review route.' }
                : label.includes('Hair store')
                  ? { label:'Yelp', domain:'yelp.com', url:'https://www.yelp.com/', purpose:'Salon/store discovery route.' }
                  : label.includes('Family')
                    ? { label:'Nextdoor', domain:'nextdoor.com', url:'https://nextdoor.com/', purpose:'Local/community post review route.' }
                    : { label:'Eventbrite', domain:'eventbrite.com', url:'https://www.eventbrite.com/', purpose:'Community event and placement research route.' };
    return {
      ...fallback,
      lane: label,
      status: 'queued_for_owner_review',
      action: 'open_review_target',
      campaign: slugify(`${label}-${item?.title || item?.category || ''}`),
      tracking_url: `https://supportrd.com?utm_source=supportrd_bot&utm_medium=outreach&sr_bot=1&utm_campaign=${slugify(`${label}-${item?.title || item?.category || ''}`)}`,
      permission_note: 'Research/draft target only. Owner approval is required before external action.'
    };
  }

  function renderWebsiteEntryBoard(state, active){
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    const rows = (movements.length ? movements : [active]).slice(0, 16).map((item, index)=>({
      item,
      site: websiteTargetFor(item),
      active: item.key && item.key === active.key || index === Number(state.outreachActiveIndex || 0)
    }));
    const current = websiteTargetFor(active);
    return `
      <section class="sr-global-band sr-bot-websites">
        <div class="sr-global-band-head">
          <span>Live Websites Entering</span>
          <strong>${esc(current.domain || current.label || 'review target')}</strong>
        </div>
        <div class="sr-bot-site-live">
          <div>
            <span>Current Website Target</span>
            <strong>${esc(current.label || current.domain || 'Target website')}</strong>
            <p>${esc(current.purpose || 'The bot is preparing a draft/review route for this website lane.')}</p>
            <code>${esc(current.tracking_url || 'https://supportrd.com?utm_source=supportrd_bot&sr_bot=1')}</code>
          </div>
          <a href="${esc(current.url || 'https://supportrd.com')}" target="_blank" rel="noopener">Open Website</a>
        </div>
        <div class="sr-bot-site-grid">
          ${rows.map(({item, site, active: isActive})=>`
            <article class="${isActive ? 'active' : ''}">
              <span>${esc(site.lane || item.placement_lane || placementLaneFor(item).label)}</span>
              <strong>${esc(site.label || site.domain || 'Target website')}</strong>
              <p>${esc(site.purpose || item.target || 'Owner-review placement route')}</p>
              <div>
                <b>${esc(site.domain || 'supportrd.com')}</b>
                <em>${esc(site.status || item.status || 'queued')}</em>
              </div>
              <small>${esc(item.title || item.category || 'SupportRD movement')}</small>
              <a href="${esc(site.url || 'https://supportrd.com')}" target="_blank" rel="noopener">review</a>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderLiveFocusResults(state, active){
    const focus = state.outreachFocusLive || {};
    const views = Array.isArray(focus.views) && focus.views.length ? focus.views : [
      { id:'comments', label:'Live Comment Replies', description:'Waiting for focused comment results.', count:0, read:0, items:[active] }
    ];
    const tick = Number(state.outreachLiveTick || 0);
    const view = views[tick % views.length] || views[0];
    const items = Array.isArray(view.items) && view.items.length ? view.items : [active];
    const current = items[tick % items.length] || active;
    const website = websiteTargetFor(current);
    const parts = messagePartsFor(current);
    const focusRows = views.map((entry, index)=>({
      ...entry,
      active: entry.id === view.id || index === tick % views.length
    }));
    const recent = Array.isArray(focus.top_results) && focus.top_results.length ? focus.top_results : items;
    const progress = Math.min(100, Math.max(5, Number(current.focus_rank || current.attention_score || current.score || view.read || 0)));
    return `
      <section class="sr-global-band sr-bot-focus-live" data-focus-live="${esc(view.id || 'comments')}">
        <div class="sr-bot-focus-head">
          <div>
            <span>Real Live Focus Results</span>
            <strong>${esc(focus.headline || 'Comments, story posts, and family letters')}</strong>
            <p>${esc(focus.live_note || 'Live owner-review drafts update from the backend queue. Nothing leaves SupportRD without approval.')}</p>
          </div>
          <div class="sr-bot-focus-pulse">
            <b>LIVE</b>
            <i style="--focusRead:${progress}%"><em></em></i>
            <small>${esc(new Date(focus.updated_at || state.outreachUpdatedAt || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }))}</small>
          </div>
        </div>

        <div class="sr-bot-view-strip">
          ${focusRows.map(entry=>`
            <article class="${entry.active ? 'active' : ''}">
              <span>${esc(entry.label || 'Live view')}</span>
              <strong>${esc(entry.count || 0)}</strong>
              <p>${esc(entry.description || 'Focused results view')}</p>
              <i><em style="width:${Math.min(100, Math.max(5, Number(entry.read || 0)))}%"></em></i>
            </article>
          `).join('')}
        </div>

        <div class="sr-bot-live-view">
          <article class="sr-bot-result-main">
            <span>Now Viewing: ${esc(view.label || 'Focused result')}</span>
            <strong>${esc(current.title || 'SupportRD focused draft')}</strong>
            <p>${esc(current.focus_reason || current.movement || 'The bot is prioritizing this result because it matches the current comment/story/family focus.')}</p>
            <div class="sr-bot-result-meta">
              <b>${esc(current.category || 'focused result')}</b>
              <b>${esc(current.placement_lane || placementLaneFor(current).label)}</b>
              <b>${esc(website.domain || website.label || 'review target')}</b>
              <b>${esc(current.status || 'queued')}</b>
            </div>
          </article>

          <article class="sr-bot-result-copy">
            <span>Draft Pieces Being Built</span>
            ${parts.slice(0,6).map(part=>`
              <div>
                <b>${esc(part.label)}</b>
                <p>${esc(part.text)}</p>
              </div>
            `).join('')}
          </article>

          <article class="sr-bot-result-feed">
            <span>Live Results Feed</span>
            ${recent.slice(0,10).map((item,index)=>`
              <div class="${item.key === current.key || index === tick % Math.max(1, recent.length) ? 'active' : ''}">
                <b>${esc(item.title || item.category || 'SupportRD result')}</b>
                <p>${esc(item.category || 'focused draft')} · ${esc(item.focus_reason || item.target || 'owner review')}</p>
              </div>
            `).join('')}
          </article>
        </div>
      </section>
    `;
  }

  function renderSmartFollowupPanel(state, active){
    const followups = Array.isArray(state.outreachFollowups) ? state.outreachFollowups : [];
    const settings = state.outreachSettings || {};
    const approved = followups.filter(item=>String(item.status || '').includes('approved'));
    const queued = followups.filter(item=>!String(item.status || '').includes('approved'));
    const tick = Number(state.outreachLiveTick || 0);
    const current = followups.length ? followups[tick % followups.length] : null;
    const path = Array.isArray(settings.explicit_approval_path) ? settings.explicit_approval_path : [
      'bot drafts follow-up',
      'owner reviews',
      'owner approves',
      'ready for owner or connected channel'
    ];
    return `
      <section class="sr-global-band sr-bot-followups">
        <div class="sr-bot-followup-head">
          <div>
            <span>Acting On Your Behalf</span>
            <strong>Smart follow-up approval path</strong>
            <p>The bot can now infer the next best comment, story reply, family-letter continuation, or community post follow-up and queue it for your explicit approval.</p>
          </div>
          <button class="sr-buy-btn" type="button" data-followup-run>Draft Smart Follow-Up</button>
        </div>

        <div class="sr-bot-followup-path">
          ${path.map((step,index)=>`
            <b class="${index <= (current ? 2 : 1) ? 'active' : ''}">
              <i>${esc(index + 1)}</i>
              ${esc(step)}
            </b>
          `).join('')}
        </div>

        <div class="sr-bot-followup-live">
          <article class="sr-bot-followup-current">
            <span>Current Follow-Up Brain</span>
            <strong>${esc(current?.title || `Ready to draft for: ${active.title || 'SupportRD result'}`)}</strong>
            <p>${esc(current?.strategy || active.focus_reason || 'Click Draft Smart Follow-Up and the bot will construct the next reply using the current result context.')}</p>
            <small>${esc(current?.promo_hook_line || (Array.isArray(settings.promo_hooks) ? settings.promo_hooks.join(' / ') : 'New Hair AI! / New Hair AI Premiums / New Hair Scanner / New Hair Analysis / Exclusive suburbs Hair AI / Linked Dominican Republic product'))}</small>
            <pre>${esc(current?.draft || 'No follow-up drafted yet for this active result. The next draft will appear here live.')}</pre>
          </article>

          <article class="sr-bot-followup-status">
            <span>Approval Queue</span>
            <strong>${esc(queued.length)} waiting · ${esc(approved.length)} approved</strong>
            <p>Approved means ready for you or a connected permitted channel. It does not silently use personal accounts or external sites.</p>
            <div>
              ${followups.slice(0,8).map(item=>`
                <section class="${String(item.status || '').includes('approved') ? 'approved' : ''}">
                  <b>${esc(item.title || 'Follow-up draft')}</b>
                  <small>${esc(item.intent || 'follow_up')} · ${esc(item.status || 'queued_for_owner_review')}</small>
                  <p>${esc(item.draft || '').slice(0, 210)}${String(item.draft || '').length > 210 ? '...' : ''}</p>
                  ${String(item.status || '').includes('approved')
                    ? '<em>Approved-ready</em>'
                    : `<button type="button" data-followup-approve="${esc(item.id || '')}">Approve Follow-Up</button>`}
                </section>
              `).join('') || '<section><b>No follow-ups queued yet</b><small>Ready</small><p>Click Draft Smart Follow-Up to generate the first intelligent follow-up for this lane.</p></section>'}
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function messagePartsFor(item){
    const placement = placementLaneFor(item);
    const category = String(item.category || 'growth draft').toLowerCase();
    const target = item.target || 'approved SupportRD audience';
    const draft = item.draft || item.movement || 'SupportRD helps people find natural-hair guidance, product routes, and real customer support.';
    const url = 'https://supportrd.com';
    const settings = read().outreachSettings || {};
    const promoHooks = Array.isArray(item.promo_hooks) && item.promo_hooks.length
      ? item.promo_hooks
      : Array.isArray(settings.promo_hooks) && settings.promo_hooks.length
        ? settings.promo_hooks
        : ['New Hair AI!', 'New Hair AI Premiums', 'New Hair Scanner', 'New Hair Analysis', 'Exclusive suburbs Hair AI', 'Linked Dominican Republic product'];
    const promoLine = item.promo_hook_line || promoHooks.join(' / ');
    let opening = 'Hello, I am sharing SupportRD as a natural-hair solutions resource.';
    let value = draft;
    let cta = `If this is welcome here, visit ${url} for ARIA hair help, Profile Hair Prep, FAQ support, and product guidance.`;

    if (category.includes('comment')) {
      opening = 'Helpful comment draft: I would start by answering the hair question directly and keeping the tone friendly.';
      value = 'For dryness, breakage, or product confusion, SupportRD can lead with New Hair AI!, the New Hair Scanner, and New Hair Analysis before routing the person into the right product path.';
      cta = `Only add ${url} if the thread allows helpful links and the owner approves the comment.`;
    } else if (category.includes('story') || category.includes('letter') || category.includes('caption')) {
      opening = 'Story/family letter draft: This should sound human, personal, and useful, not like a hard ad.';
      value = 'SupportRD exists so families, students, and working people can get natural-hair support, New Hair AI Premiums, ARIA/Profile guidance, and the linked Dominican Republic product path when it fits.';
      cta = `Share ${url} only on approved owned accounts or approved pages after owner review.`;
    } else if (category.includes('family')) {
      opening = 'Free family post draft: Families deserve simple hair guidance before school, work, interviews, and everyday routines.';
      value = 'SupportRD gives parents, students, and working families a place to understand hair problems with New Hair AI!, New Hair Scanner, and New Hair Analysis.';
    } else if (category.includes('community college')) {
      opening = 'Community college entrance post draft: SupportRD.com Get your Hair Right for orientation, advising, career fairs, and first-job preparation.';
      value = 'The message should feel student-friendly, career-ready, and useful, using New Hair AI! and New Hair Analysis without sounding like a hard ad.';
    } else if (category.includes('college') || category.includes('career')) {
      opening = 'College/career post draft: Get your hair right before class, interviews, career fairs, work, or your next opportunity.';
      value = 'SupportRD combines New Hair AI!, Profile Hair Prep, FAQ help, and product routing so students and job seekers can move with confidence.';
    } else if (category.includes('blog') || category.includes('guest')) {
      opening = 'Guest post pitch draft: I am preparing a practical natural-hair article for your readers.';
      value = 'The article can cover dryness, breakage, product confusion, and how SupportRD routes people from a hair concern into guidance and checkout support.';
      cta = `If you accept contributor posts, I can send a clean draft for review with ${url} as the credited resource.`;
    } else if (category.includes('salon') || category.includes('hair store')) {
      opening = 'Partner outreach draft: SupportRD can help your clients understand hair concerns after they leave the chair or store.';
      value = 'ARIA, New Hair Scanner, New Hair Analysis, and the catalog give customers a support route for dryness, breakage, growth routines, and product decisions, including Exclusive suburbs Hair AI and linked Dominican Republic product positioning when relevant.';
    } else if (category.includes('radio')) {
      opening = 'Radio/community shoutout draft: SupportRD.com, Suave Natural Hair Solution, Caribbean Hair Solutions.';
      value = 'Short, memorable, family-friendly, and easy to read live on a local station or community podcast.';
      cta = `Join us at ${url}.`;
    }

    return [
      { key:'placement', label:'Placement Lane', text:placement.label },
      { key:'subject', label:'Subject', text:item.title || 'SupportRD natural-hair solutions outreach' },
      { key:'audience', label:'Audience', text:`Target: ${target}` },
      { key:'opening', label:'Opening', text:opening },
      { key:'hooks', label:'SupportRD Hooks', text:promoLine },
      { key:'value', label:'Value Pitch', text:value },
      { key:'cta', label:'CTA', text:cta },
      { key:'focus', label:'Focus Reason', text:item.focus_reason || 'Current backend focus is comments, stories, family letters, and safe community posts.' },
      { key:'approval', label:'Approval Boundary', text:item.approval_boundary || 'Draft only. Owner approval required before any post, email, comment, or submission.' }
    ];
  }

  function fullDraftFor(item){
    return messagePartsFor(item).map(part=>`${part.label}: ${part.text}`).join('\n\n');
  }

  function renderLiveMessageBuilder(state, active){
    const parts = messagePartsFor(active);
    const placement = placementLaneFor(active);
    const fullDraft = fullDraftFor(active);
    const cursorMax = Math.max(1, fullDraft.length);
    const rawCursor = Number(state.outreachDraftCursor || 0);
    const cursor = Math.min(cursorMax, rawCursor % (cursorMax + 28));
    const visible = fullDraft.slice(0, cursor);
    const pct = Math.min(100, Math.round((cursor / cursorMax) * 100));
    let running = 0;
    const activeIndex = parts.findIndex(part=>{
      running += `${part.label}: ${part.text}\n\n`.length;
      return cursor <= running;
    });
    const currentPart = parts[Math.max(0, activeIndex)];
    return `
      <section class="sr-global-band sr-bot-builder" aria-live="polite">
        <div class="sr-bot-builder-head">
          <div>
            <span>Live Message Construction</span>
            <strong>${esc(active.title || 'SupportRD draft is being built')}</strong>
            <p>Watch the backend bot assemble the actual owner-review copy for comments, posts, blog requests, salon outreach, college/career posts, and community channels.</p>
          </div>
          <div class="sr-bot-builder-meter">
            <b>${esc(pct)}%</b>
            <i><em style="width:${pct}%"></em></i>
            <small>${esc(currentPart?.label || 'Drafting')}</small>
          </div>
        </div>
        <div class="sr-bot-placement">
          <div>
            <span>Current Free-For-All Lane</span>
            <strong>${esc(placement.label)}</strong>
            <p>${esc(placement.detail)}</p>
          </div>
          <div class="sr-bot-placement-grid">
            ${placement.lanes.map(([label, detail])=>`
              <b class="${label === placement.label ? 'active' : ''}" title="${esc(detail)}">${esc(label)}</b>
            `).join('')}
          </div>
        </div>
        <div class="sr-bot-builder-grid">
          <pre class="sr-bot-draft-paper">${esc(visible)}<span class="sr-bot-type-cursor"></span></pre>
          <div class="sr-bot-draft-stack">
            ${parts.map((part,index)=>`
              <article class="${index < activeIndex ? 'done' : index === activeIndex ? 'active' : ''}">
                <span>${esc(part.label)}</span>
                <p>${esc(part.text)}</p>
              </article>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }

  function renderAttentionDiagram(state, active){
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    const settings = state.outreachSettings || {};
    const threshold = Number(settings.attention_low_threshold || 62);
    const configured = Array.isArray(settings.placement_lanes) ? settings.placement_lanes : [];
    const fallback = placementLaneFor(active).lanes.map(([label, detail])=>({ label, description: detail, diversify_targets: [] }));
    const laneList = configured.length ? configured : fallback;
    const stats = laneList.map(lane=>{
      const matched = movements.filter(item=>placementLaneFor(item).label === lane.label);
      const scores = matched.map(item=>Number(item.attention_score || item.score || 0)).filter(Boolean);
      const avg = scores.length ? Math.round(scores.reduce((sum,val)=>sum+val,0) / scores.length) : 0;
      return {
        label: lane.label,
        detail: lane.description || 'Attention placement lane',
        count: matched.length,
        avg,
        low: matched.length === 0 || avg < threshold,
        diversify: lane.diversify_targets || []
      };
    });
    const activeLane = placementLaneFor(active).label;
    const low = stats.filter(item=>item.low).slice(0,4);
    const totalAttention = stats.length
      ? Math.round(stats.reduce((sum,item)=>sum + item.avg, 0) / stats.length)
      : 0;
    const activeAttention = Number(active.attention_score || active.score || 0);
    return `
      <section class="sr-global-band sr-bot-attention-diagram">
        <div class="sr-global-band-head">
          <span>Attention Capture Diagram</span>
          <strong>${esc(totalAttention)} overall attention read</strong>
        </div>
        <div class="sr-bot-attention-map">
          <div class="sr-bot-attention-core">
            <span>SupportRD</span>
            <strong>Attention Core</strong>
            <p>${esc(settings.attention_goal || 'Construct drafts, measure attention lanes, and diversify when a lane is weak.')}</p>
            <b>${esc(activeAttention)} active score</b>
          </div>
          <div class="sr-bot-attention-spokes">
            ${stats.map(item=>`
              <article class="${item.label === activeLane ? 'active' : ''} ${item.low ? 'low' : 'strong'}">
                <span>${esc(item.low ? 'Diversify' : 'Capturing')}</span>
                <strong>${esc(item.label)}</strong>
                <p>${esc(item.detail)}</p>
                <div class="sr-bot-attention-meter"><i style="width:${Math.min(100, Math.max(4, item.avg))}%"></i><em>${esc(item.avg || 0)}</em></div>
                <small>${esc(item.count)} queued movement${item.count === 1 ? '' : 's'}</small>
              </article>
            `).join('')}
          </div>
        </div>
        <div class="sr-bot-diversify-board">
          <div>
            <span>Low Attention Response</span>
            <strong>${low.length ? 'Making posts/comments more diverse' : 'All visible lanes have attention'}</strong>
            <p>When a lane is weak, the bot switches the next drafts into more unique places instead of repeating the same post angle.</p>
          </div>
          <div class="sr-bot-diversify-targets">
            ${(low.length ? low : stats.slice(0,3)).map(item=>`
              <b>${esc(item.label)} <em>${esc((item.diversify || []).slice(0,3).join(' · ') || 'fresh placement angle')}</em></b>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }

  function countBy(items, key){
    return items.reduce((acc, item)=>{
      const label = String(item?.[key] || 'unknown');
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
  }

  function renderDataDeck(state, active){
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    const summary = state.outreachSummary || {};
    const categoryCounts = Object.entries(countBy(movements, 'category')).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const statusCounts = countBy(movements, 'status');
    const maxCategory = Math.max(1, ...categoryCounts.map(([,count])=>count));
    const loaded = movements.length;
    const total = Number(summary.count || loaded || 0);
    const loadedPct = Math.min(100, Math.round((loaded / Math.max(1, total)) * 100));
    const topScore = Math.max(0, ...movements.map(item=>Number(item.score || 0)));
    return `
      <div class="sr-bot-deck" aria-label="Bot data presentation">
        <section class="sr-bot-slide hero">
          <span>Queue Health</span>
          <strong>${esc(total)} movements</strong>
          <p>${esc(loaded)} live rows loaded into the command center. Refresh cycle: ${esc(summary.intervalSeconds || 900)} seconds.</p>
          <div class="sr-bot-meter"><i style="width:${loadedPct}%"></i></div>
          <small>${esc(loadedPct)}% loaded for this view</small>
        </section>

        <section class="sr-bot-slide graph">
          <span>Category Graph</span>
          <div class="sr-bot-bars">
            ${categoryCounts.map(([category,count])=>{
              const width = Math.max(8, Math.round((count / maxCategory) * 100));
              return `<div class="sr-bot-bar"><b>${esc(category)}</b><i style="width:${width}%"></i><em>${esc(count)}</em></div>`;
            }).join('') || '<div class="sr-bot-empty">No category rows yet.</div>'}
          </div>
        </section>

        <section class="sr-bot-slide pipeline">
          <span>Approval Pipeline</span>
          <div class="sr-bot-pipeline">
            <b class="active">Draft Queue <em>${esc(statusCounts.queued || loaded)}</em></b>
            <b>Owner Review <em>0</em></b>
            <b>Approved Send <em>0</em></b>
            <b>Reply Log <em>0</em></b>
          </div>
          <p>Nothing posts, emails, submits, or comments until the owner approves it.</p>
        </section>

        <section class="sr-bot-slide movement">
          <span>Current Movement</span>
          <strong>${esc(active.title || 'Movement loading')}</strong>
          <p>${esc(active.target || 'SupportRD growth route')}</p>
          <div class="sr-bot-score"><i style="width:${Math.min(100, Math.max(4, Number(active.score || 0)))}%"></i><em>${esc(active.score || 0)} score</em></div>
          <small>Top score in queue: ${esc(topScore)}</small>
        </section>
      </div>
    `;
  }

  function renderTrafficPingPanel(state){
    const summary = state.trafficSummary || {};
    const shopify = Array.isArray(summary.shopify) ? summary.shopify : [];
    const local = Array.isArray(summary.local) ? summary.local : [];
    const sessionsReport = summary.sessions_report || {};
    const manualSessionsReport = summary.manual_sessions_report || {};
    const five = trafficFive(summary);
    const waveScore = Math.max(0, Math.min(100, Number(summary.wave_score || 0)));
    const enabled = trafficPingEnabled();
    const pulse = Math.max(0.18, 1.32 - (waveScore / 100) * 1.02).toFixed(2);
    const reportSessions = Number(sessionsReport.total_sessions || 0);
    const reportVisitors = Number(sessionsReport.total_online_store_visitors || 0);
    const reportHeadline = sessionsReport.configured
      ? (sessionsReport.ok ? `${reportVisitors || reportSessions} visitors` : 'Scope check')
      : 'Admin token';
    const botReturns = Array.isArray(summary.latest_bot_returns) ? summary.latest_bot_returns : [];
    const latestEvents = Array.isArray(summary.latest_events) ? summary.latest_events : [];
    const topPaths = Array.isArray(five.top_paths) && five.top_paths.length
      ? five.top_paths
      : ((local.find(item=>Number(item.window_minutes) === 5) || {}).top_paths || []);
    const snippet = summary.pixel_snippet || [
      "// Waiting for /api/shopify/traffic/summary to return the Shopify pixel snippet.",
      "// The backend route is /api/shopify/traffic/pixel."
    ].join('\n');
    return `
      <section class="sr-global-band sr-traffic-alarm ${summary.wave_hot ? 'hot' : ''}">
        <div class="sr-traffic-head">
          <div class="sr-traffic-bang" style="--trafficPulse:${pulse}s" aria-label="Traffic wave alarm">!</div>
          <div>
            <span>Actual Traffic Reader</span>
            <strong>${esc(waveScore)} wave score</strong>
            <p>Ping button is ${enabled ? 'armed' : 'off'}. When Shopify or SupportRD sends a live wave, this panel pulses faster and can alert you. Bot-returned visitors are tracked separately from regular traffic.</p>
          </div>
          <div class="sr-traffic-actions">
            <button class="sr-buy-btn" type="button" data-traffic-ping>${enabled ? 'Ping Armed' : 'Ping Me On Waves'}</button>
            <button type="button" data-traffic-refresh>Refresh Traffic</button>
            <button type="button" data-copy-shopify-pixel>Copy Shopify Pixel</button>
          </div>
        </div>

        <div class="sr-traffic-grid">
          <article class="sr-traffic-card hero">
            <span>5 Minute Live Window</span>
            <strong>${esc(five.visitors || 0)} visitors</strong>
            <p>${esc(five.events || 0)} tracked events · ${esc(five.bot_visitors || 0)} bot-return visitors · ${summary.wave_hot ? 'hot wave' : 'steady watch'}</p>
          </article>
          <article class="sr-traffic-card">
            <span>First Bot Return</span>
            <strong>${botReturns.length ? 'Seen' : 'Not yet'}</strong>
            <p>${botReturns.length ? esc(`${botReturns[0].source || 'source'} -> ${botReturns[0].path || '/'}`) : 'No visitor has landed with sr_bot / outreach campaign markers yet.'}</p>
          </article>
          <article class="sr-traffic-card">
            <span>Shopify Pixel</span>
            <strong>${shopify.reduce((sum,item)=>sum + Number(item.events || 0), 0)} events</strong>
            <p>${esc(summary.install_hint || 'Install the custom pixel in Shopify Customer Events.')}</p>
          </article>
          <article class="sr-traffic-card">
            <span>Shopify Sessions Report</span>
            <strong>${esc(reportHeadline)}</strong>
            <p>${sessionsReport.ok ? `${esc(reportSessions)} sessions from private Shopify Analytics.` : esc(sessionsReport.message || 'Needs Shopify Admin API read_reports access.')}</p>
          </article>
        </div>

        <div class="sr-traffic-presentation">
          <div class="sr-traffic-windows">
            ${(shopify.length ? shopify : local).slice(0,5).map(item=>{
              const score = Math.min(100, Number(item.events || 0) * 8 + Number(item.visitors || 0) * 16 + Number(item.bot_visitors || 0) * 32);
              return `<article><span>${esc(item.window_minutes)}m</span><strong>${esc(item.visitors || 0)}</strong><p>${esc(item.events || 0)} events</p><i style="width:${Math.max(4, score)}%"></i></article>`;
            }).join('') || '<article><span>Live</span><strong>0</strong><p>No traffic rows yet.</p><i style="width:4%"></i></article>'}
          </div>
          <div class="sr-traffic-paths">
            <span>Top Paths</span>
            ${topPaths.slice(0,5).map(item=>`<b>${esc(item.path || '/')} <em>${esc(item.hits || 0)}</em></b>`).join('') || '<b>No path data yet <em>0</em></b>'}
          </div>
          <div class="sr-traffic-paths">
            <span>Bot Returns</span>
            ${botReturns.slice(0,5).map(item=>`<b>${esc(item.campaign || item.source || 'bot source')} <em>${esc(item.path || '/')}</em></b>`).join('') || '<b>Waiting for first bot visitor <em>armed</em></b>'}
          </div>
        </div>

        ${renderShopifySessionsReport(sessionsReport, manualSessionsReport)}

        <details class="sr-traffic-code">
          <summary>Shopify traffic code</summary>
          <p>Paste this in Shopify admin under Settings, Customer events, Add custom pixel. Use campaign links with <code>?utm_source=supportrd_bot&amp;sr_bot=1</code> so bot-returned people are counted.</p>
          <pre>${esc(snippet)}</pre>
        </details>

        <div class="sr-traffic-feed">
          ${latestEvents.slice(0,8).map(item=>`
            <article class="${item.is_bot_return ? 'bot' : ''}">
              <span>${esc(item.event_name || 'event')} · ${esc(item.source || 'source')}</span>
              <strong>${esc(item.path || '/')}</strong>
              <p>${item.is_bot_return ? 'Bot-return visitor marker detected.' : esc(item.campaign || 'Regular traffic event.')}</p>
            </article>
          `).join('') || '<article><span>Reader waiting</span><strong>No traffic events recorded yet</strong><p>Once the Shopify pixel is installed or a campaign link lands, this feed moves live.</p></article>'}
        </div>
      </section>
    `;
  }

  function renderBotOnlyMarkup(){
    const state = read();
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    const summary = state.outreachSummary || {};
    const active = currentMovement(state);
    return `
      <section class="sr-global-tracker sr-bot-console" data-panel="globaltracker" data-outreach-movements>
        <header class="sr-global-hero sr-bot-hero">
          <span>SupportRD Backend Bot</span>
          <h2>Growth command center</h2>
          <p>Live queue for blog requests, salon outreach, hair-store pitches, radio shoutouts, creator ideas, student ads, review/rating pitches, and safe social/story drafts. The bot drafts and queues only; owner approval is required before anything leaves SupportRD.</p>
          <div class="sr-global-actions">
            <button class="sr-buy-btn" type="button" data-outreach-run>Push Bot Movement</button>
            <span class="sr-global-stamp">${state.outreachUpdatedAt ? new Date(state.outreachUpdatedAt).toLocaleString() : 'Waiting for movement report'}</span>
            <strong class="sr-bot-pill">${esc(summary.count || movements.length)} queued moves</strong>
            <strong class="sr-bot-live-dot">Live auto-refresh</strong>
          </div>
        </header>

        ${renderLiveFocusResults(state, active)}

        ${renderSmartFollowupPanel(state, active)}

        ${renderTrafficPingPanel(state)}

        ${renderWebsiteEntryBoard(state, active)}

        ${renderLiveMessageBuilder(state, active)}

        ${renderAttentionDiagram(state, active)}

        ${renderExecutionTrace(state, active)}

        <section class="sr-bot-live-grid">
          <article class="sr-global-band sr-bot-code">
            <div class="sr-global-band-head">
              <span>Live Bot Code</span>
              <strong>${esc(active.status || 'queued')}</strong>
            </div>
            <p class="sr-global-note">This is the command package the backend bot is preparing right now.</p>
            <pre>${esc(botCommandFor(active, state))}</pre>
          </article>

          <article class="sr-global-band sr-bot-data">
            <div class="sr-global-band-head">
              <span>Live Data Presentation</span>
              <strong>${esc(active.category || 'movement')}</strong>
            </div>
            ${renderDataDeck(state, active)}
          </article>

          <article class="sr-global-band sr-bot-page">
            <div class="sr-global-band-head">
              <span>Live Page View</span>
              <strong>SupportRD preview</strong>
            </div>
            <div class="sr-bot-preview-card">
              <span>${esc(active.category || 'movement')}</span>
              <strong>${esc(active.title || 'SupportRD growth move')}</strong>
              <p>${esc(active.draft || active.movement || 'SupportRD growth draft is loading.')}</p>
              <a href="/" target="_blank" rel="noopener">Open page</a>
            </div>
            <iframe class="sr-bot-live-frame" src="/?_globalBotPreview=1" title="SupportRD live page preview" loading="lazy"></iframe>
          </article>
        </section>

        <section class="sr-global-band sr-bot-queue">
          <div class="sr-global-band-head">
            <span>Movement Queue</span>
            <strong>${esc(movements.length)} loaded</strong>
          </div>
          <div class="sr-global-grid compact">
          ${movements.map(item=>`
            <article class="sr-global-card">
              <span>${esc(item.category)} · ${esc(item.status)}</span>
              <strong>${esc(item.title)}</strong>
              <p>${esc(item.movement)}</p>
              <small>${esc(item.next_action)}</small>
            </article>
          `).join('') || '<article class="sr-global-card"><span>Bot warming up</span><strong>No outreach movements loaded</strong><p>Press Push Bot Movement to generate the next safe request wave.</p></article>'}
          </div>
        </section>
      </section>
    `;
  }

  function renderSweepMarkup(){
    return renderBotOnlyMarkup();
  }

  function patchGlobalTrackerRender(){
    if (root.__globalSweepPatched) return;
    root.__globalSweepPatched = true;
    root.renderGlobalTrackerMarkup = function(){
      return renderBotOnlyMarkup();
    };
  }

  function installBotStyles(){
    if (document.getElementById('srGlobalBotConsoleCss')) return;
    const style = document.createElement('style');
    style.id = 'srGlobalBotConsoleCss';
    style.textContent = `
      .sr-bot-console{gap:.85rem}
      .sr-bot-hero{border-color:rgba(97,239,255,.24);background:linear-gradient(135deg,rgba(3,8,19,.92),rgba(13,23,50,.82))}
      .sr-bot-hero h2{font-size:clamp(2rem,3vw,3.25rem)}
      .sr-bot-pill{display:inline-flex;align-items:center;min-height:2.15rem;padding:.45rem .8rem;border:1px solid rgba(97,239,255,.25);border-radius:999px;background:rgba(97,239,255,.08);color:#dffbff;font-size:.82rem}
      .sr-bot-live-dot{display:inline-flex;align-items:center;gap:.45rem;min-height:2.15rem;padding:.45rem .8rem;border:1px solid rgba(154,254,143,.28);border-radius:999px;background:rgba(154,254,143,.1);color:#eaffdf;font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
      .sr-bot-live-dot:before{content:"";width:.55rem;height:.55rem;border-radius:999px;background:#9afe8f;box-shadow:0 0 0 0 rgba(154,254,143,.55);animation:srBotPulse 1.25s infinite}
      @keyframes srBotPulse{70%{box-shadow:0 0 0 .45rem rgba(154,254,143,0)}100%{box-shadow:0 0 0 0 rgba(154,254,143,0)}}
      .sr-bot-focus-live,.sr-bot-followups{position:relative;overflow:hidden;border-color:rgba(154,254,143,.28);background:radial-gradient(circle at 8% 0%,rgba(154,254,143,.15),transparent 24rem),linear-gradient(135deg,rgba(4,10,22,.96),rgba(9,24,38,.9));box-shadow:0 24px 70px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.08)}
      .sr-bot-focus-live:before,.sr-bot-followups:before{content:"";position:absolute;left:-20%;right:-20%;top:0;height:2px;background:linear-gradient(90deg,transparent,#61efff,#9afe8f,#ffd27a,transparent);animation:srBotRail 2.2s linear infinite}
      .sr-bot-focus-head,.sr-bot-followup-head{position:relative;z-index:1;display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:.85rem}
      .sr-bot-focus-head span,.sr-bot-followup-head span,.sr-bot-live-view span,.sr-bot-followup-live span{display:block;color:#61efff;font-size:.72rem;font-weight:1000;text-transform:uppercase;letter-spacing:.06em}
      .sr-bot-focus-head strong,.sr-bot-followup-head strong{display:block;margin:.2rem 0;color:#fff;font-size:1.55rem;line-height:1.06}
      .sr-bot-focus-head p,.sr-bot-followup-head p{max-width:62rem;color:rgba(247,251,255,.74);line-height:1.4}
      .sr-bot-focus-pulse{display:grid;justify-items:end;gap:.3rem;min-width:8.5rem}
      .sr-bot-focus-pulse b{display:grid;place-items:center;width:4.2rem;height:4.2rem;border-radius:999px;background:#9afe8f;color:#07101d;font-size:.95rem;box-shadow:0 0 0 0 rgba(154,254,143,.44);animation:srBotPulse 1s infinite}
      .sr-bot-focus-pulse i{display:block;width:8rem;height:.58rem;border-radius:999px;background:rgba(0,0,0,.36);overflow:hidden;border:1px solid rgba(255,255,255,.12)}
      .sr-bot-focus-pulse em{display:block;width:var(--focusRead,40%);height:100%;background:linear-gradient(90deg,#61efff,#9afe8f,#ffd27a)}
      .sr-bot-focus-pulse small{color:#ffe8ad;font-weight:900}
      .sr-bot-view-strip{position:relative;z-index:1;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:.45rem;margin-bottom:.75rem}
      .sr-bot-view-strip article{min-height:7rem;padding:.65rem;border-radius:.78rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045)}
      .sr-bot-view-strip article.active{border-color:rgba(154,254,143,.48);background:linear-gradient(135deg,rgba(154,254,143,.17),rgba(97,239,255,.08));box-shadow:0 12px 26px rgba(0,0,0,.18)}
      .sr-bot-view-strip span{display:block;color:#61efff;font-size:.62rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-view-strip strong{display:block;margin:.2rem 0;color:#fff;font-size:1.35rem}
      .sr-bot-view-strip p{color:rgba(247,251,255,.68);font-size:.7rem;line-height:1.24}
      .sr-bot-view-strip i{display:block;height:.42rem;margin-top:.42rem;border-radius:999px;background:rgba(0,0,0,.32);overflow:hidden}
      .sr-bot-view-strip em{display:block;height:100%;background:linear-gradient(90deg,#61efff,#9afe8f)}
      .sr-bot-live-view,.sr-bot-followup-live{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.05fr) minmax(18rem,.75fr);gap:.7rem}
      .sr-bot-result-main,.sr-bot-result-copy,.sr-bot-result-feed,.sr-bot-followup-current,.sr-bot-followup-status{padding:.8rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.25)}
      .sr-bot-result-main strong,.sr-bot-followup-current strong,.sr-bot-followup-status strong{display:block;margin:.3rem 0;color:#fff;font-size:1.22rem;line-height:1.08}
      .sr-bot-result-main p,.sr-bot-result-copy p,.sr-bot-result-feed p,.sr-bot-followup-current p,.sr-bot-followup-status p{color:rgba(247,251,255,.74);line-height:1.36}
      .sr-bot-result-meta{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.6rem}
      .sr-bot-result-meta b{display:inline-flex;padding:.38rem .52rem;border-radius:999px;border:1px solid rgba(97,239,255,.16);background:rgba(97,239,255,.07);color:#dffbff;font-size:.68rem}
      .sr-bot-result-copy div,.sr-bot-result-feed div,.sr-bot-followup-status section{margin-top:.45rem;padding:.55rem;border-radius:.68rem;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045)}
      .sr-bot-result-copy b,.sr-bot-result-feed b,.sr-bot-followup-status b{display:block;color:#fff;font-size:.78rem}
      .sr-bot-result-feed div.active,.sr-bot-followup-status section.approved{border-color:rgba(154,254,143,.36);background:rgba(154,254,143,.1)}
      .sr-bot-followup-path{position:relative;z-index:1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.45rem;margin-bottom:.75rem}
      .sr-bot-followup-path b{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.4rem;align-items:center;min-height:3.2rem;padding:.55rem;border-radius:.72rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);color:rgba(247,251,255,.72);font-size:.72rem;line-height:1.12}
      .sr-bot-followup-path b.active{border-color:rgba(97,239,255,.35);background:rgba(97,239,255,.1);color:#fff}
      .sr-bot-followup-path i{display:grid;place-items:center;width:1.42rem;height:1.42rem;border-radius:999px;background:#61efff;color:#07101d;font-style:normal;font-weight:1000}
      .sr-bot-followup-current pre{min-height:12rem;max-height:18rem;overflow:auto;margin:.65rem 0 0;padding:.75rem;border-radius:.72rem;border:1px solid rgba(97,239,255,.16);background:rgba(0,0,0,.42);color:#f7fbff;font:800 .82rem/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}
      .sr-bot-followup-current small{display:block;margin-top:.55rem;padding:.5rem .6rem;border-radius:.65rem;border:1px solid rgba(255,210,122,.2);background:rgba(255,210,122,.08);color:#ffe8ad;font-weight:900;line-height:1.3}
      .sr-bot-followup-status{display:grid;align-content:start}
      .sr-bot-followup-status div{max-height:22rem;overflow:auto;padding-right:.12rem}
      .sr-bot-followup-status small{display:block;margin:.22rem 0;color:#9ff9ff;font-size:.7rem}
      .sr-bot-followup-status button,.sr-bot-followup-status em{display:inline-flex;align-items:center;justify-content:center;min-height:2rem;margin-top:.45rem;padding:.42rem .62rem;border-radius:.62rem;border:1px solid rgba(154,254,143,.28);background:rgba(154,254,143,.14);color:#eaffdf;font-size:.72rem;font-weight:1000;cursor:pointer;font-style:normal}
      .sr-bot-followup-status button:hover{background:#9afe8f;color:#07101d}
      .sr-traffic-alarm{position:relative;overflow:hidden;border-color:rgba(255,80,80,.22);background:radial-gradient(circle at 4rem 2rem,rgba(255,77,92,.18),transparent 18rem),linear-gradient(135deg,rgba(6,9,21,.96),rgba(14,24,42,.9));box-shadow:0 24px 70px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.08)}
      .sr-traffic-alarm.hot{border-color:rgba(255,210,122,.38);box-shadow:0 0 0 1px rgba(255,210,122,.12),0 26px 76px rgba(0,0,0,.34)}
      .sr-traffic-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.9rem;align-items:center}
      .sr-traffic-head span{display:block;color:#ffcf74;font-size:.72rem;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}
      .sr-traffic-head strong{display:block;margin:.18rem 0;color:#fff;font-size:1.55rem;line-height:1}
      .sr-traffic-head p{max-width:58rem;color:rgba(247,251,255,.74);line-height:1.38}
      .sr-traffic-bang{display:grid;place-items:center;width:5.2rem;height:5.2rem;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:radial-gradient(circle,#ffefb3 0 28%,#ff4d5c 29% 100%);color:#07101d;font-size:3.5rem;font-weight:1000;line-height:1;box-shadow:0 0 0 0 rgba(255,77,92,.48),0 0 44px rgba(255,77,92,.24);animation:srTrafficBang var(--trafficPulse,1s) ease-in-out infinite}
      @keyframes srTrafficBang{0%,100%{transform:scale(.92);box-shadow:0 0 0 0 rgba(255,77,92,.42),0 0 30px rgba(255,77,92,.22)}50%{transform:scale(1.08);box-shadow:0 0 0 .72rem rgba(255,77,92,0),0 0 62px rgba(255,210,122,.38)}}
      .sr-traffic-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.45rem}
      .sr-traffic-actions button{min-height:2.35rem;padding:.55rem .75rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#f7fbff;font-weight:1000;cursor:pointer}
      .sr-traffic-grid{display:grid;grid-template-columns:1.15fr 1fr 1fr 1fr;gap:.65rem;margin-top:.85rem}
      .sr-traffic-card{min-height:7.6rem;padding:.78rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045)}
      .sr-traffic-card.hero{background:linear-gradient(135deg,rgba(97,239,255,.13),rgba(154,254,143,.08));border-color:rgba(97,239,255,.22)}
      .sr-traffic-card span,.sr-traffic-paths span{display:block;color:#61efff;font-size:.68rem;font-weight:1000;text-transform:uppercase}
      .sr-traffic-card strong{display:block;margin:.3rem 0;color:#fff;font-size:1.32rem}
      .sr-traffic-card p{color:rgba(247,251,255,.72);line-height:1.34}
      .sr-traffic-presentation{display:grid;grid-template-columns:1.2fr .9fr .9fr;gap:.65rem;margin-top:.75rem}
      .sr-traffic-report{display:grid;grid-template-columns:minmax(16rem,.95fr) minmax(18rem,1.45fr);gap:.7rem;margin-top:.75rem;padding:.78rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:linear-gradient(135deg,rgba(97,239,255,.075),rgba(255,255,255,.035))}
      .sr-traffic-report.connected{border-color:rgba(154,254,143,.32);box-shadow:0 0 26px rgba(154,254,143,.08)}
      .sr-traffic-report-copy span{display:block;color:#61efff;font-size:.68rem;font-weight:1000;text-transform:uppercase}
      .sr-traffic-report-copy strong{display:block;margin:.2rem 0;color:#fff;font-size:1.1rem}
      .sr-traffic-report-copy p{color:rgba(247,251,255,.72);line-height:1.34}
      .sr-traffic-report-copy small{display:block;margin-top:.45rem;color:#ffcf74;font-weight:900}
      .sr-traffic-report-chart{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.42rem;align-items:end;min-height:9rem}
      .sr-traffic-report-chart article{display:grid;align-content:end;gap:.3rem;min-height:8.8rem;padding:.45rem;border-radius:.65rem;background:rgba(0,0,0,.22);overflow:hidden}
      .sr-traffic-report-chart b{color:#dffbff;font-size:.62rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .sr-traffic-report-chart div{display:flex;align-items:end;gap:.18rem;height:4.8rem}
      .sr-traffic-report-chart i,.sr-traffic-report-chart em{display:block;flex:1;border-radius:.45rem .45rem .18rem .18rem;min-height:.3rem}
      .sr-traffic-report-chart i{background:linear-gradient(180deg,#61efff,#4d7cff)}
      .sr-traffic-report-chart em{background:linear-gradient(180deg,#9afe8f,#28c76f)}
      .sr-traffic-report-chart small{color:rgba(247,251,255,.68);font-size:.62rem;line-height:1.2}
      .sr-traffic-report details{grid-column:1/-1;padding-top:.35rem}
      .sr-traffic-report summary{color:#dffbff;font-weight:1000;cursor:pointer}
      .sr-traffic-report pre{max-height:9rem;overflow:auto;margin:.45rem 0 0;padding:.65rem;border-radius:.62rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.45);color:#dffbff;font:800 .7rem/1.42 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}
      .sr-traffic-manual{grid-column:1/-1;display:grid;grid-template-columns:1fr 1.1fr 1.2fr auto;gap:.48rem;align-items:stretch;padding:.58rem;border-radius:.78rem;border:1px solid rgba(255,207,116,.18);background:rgba(255,207,116,.055)}
      .sr-traffic-manual span{display:block;color:#ffcf74;font-size:.65rem;font-weight:1000;text-transform:uppercase}
      .sr-traffic-manual strong{display:block;margin-top:.18rem;color:#fff;font-size:.82rem}
      .sr-traffic-manual input,.sr-traffic-manual textarea{width:100%;min-height:2.6rem;padding:.58rem .65rem;border-radius:.62rem;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.28);color:#f7fbff;font:800 .74rem/1.35 inherit;resize:vertical}
      .sr-traffic-manual textarea{min-height:2.6rem;max-height:7rem}
      .sr-traffic-manual button{min-height:2.6rem;padding:.55rem .8rem;border:0;border-radius:.62rem;background:linear-gradient(135deg,#61efff,#9afe8f);color:#07101d;font-weight:1000;cursor:pointer}
      .sr-traffic-windows{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.42rem}
      .sr-traffic-windows article,.sr-traffic-paths{padding:.7rem;border-radius:.85rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22)}
      .sr-traffic-windows span{display:block;color:#ffcf74;font-size:.68rem;font-weight:1000;text-transform:uppercase}
      .sr-traffic-windows strong{display:block;margin:.2rem 0;color:#fff;font-size:1.25rem}
      .sr-traffic-windows p{color:rgba(247,251,255,.68);font-size:.72rem}
      .sr-traffic-windows i{display:block;height:.48rem;margin-top:.42rem;border-radius:999px;background:linear-gradient(90deg,#ff4d5c,#ffcf74,#9afe8f);box-shadow:0 0 18px rgba(255,207,116,.18)}
      .sr-traffic-paths{display:grid;align-content:start;gap:.38rem}
      .sr-traffic-paths b{display:flex;justify-content:space-between;gap:.5rem;padding:.46rem .55rem;border-radius:.58rem;background:rgba(255,255,255,.05);color:#f7fbff;font-size:.76rem;overflow:hidden}
      .sr-traffic-paths em{flex:0 0 auto;color:#9afe8f;font-style:normal}
      .sr-traffic-code{margin-top:.75rem;padding:.7rem;border-radius:.85rem;border:1px solid rgba(97,239,255,.16);background:rgba(97,239,255,.055)}
      .sr-traffic-code summary{color:#dffbff;font-weight:1000;cursor:pointer}
      .sr-traffic-code p{margin:.55rem 0;color:rgba(247,251,255,.72);line-height:1.35}
      .sr-traffic-code code{color:#ffefb3}
      .sr-traffic-code pre{max-height:18rem;overflow:auto;margin:0;padding:.75rem;border-radius:.68rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.45);color:#dffbff;font:800 .72rem/1.42 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}
      .sr-traffic-feed{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.45rem;margin-top:.72rem}
      .sr-traffic-feed article{min-height:5.8rem;padding:.6rem;border-radius:.72rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04)}
      .sr-traffic-feed article.bot{border-color:rgba(154,254,143,.36);background:rgba(154,254,143,.09)}
      .sr-traffic-feed span{display:block;color:#61efff;font-size:.64rem;font-weight:1000;text-transform:uppercase}
      .sr-traffic-feed strong{display:block;margin:.25rem 0;color:#fff;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .sr-traffic-feed p{color:rgba(247,251,255,.68);font-size:.72rem;line-height:1.28}
      .sr-bot-websites{position:relative;overflow:hidden;border-color:rgba(97,239,255,.22);background:radial-gradient(circle at 100% 0%,rgba(97,239,255,.12),transparent 24rem),linear-gradient(135deg,rgba(4,10,22,.96),rgba(14,22,38,.9))}
      .sr-bot-site-live{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.75rem;align-items:center;margin-top:.7rem;padding:.85rem;border-radius:.95rem;border:1px solid rgba(154,254,143,.22);background:linear-gradient(135deg,rgba(154,254,143,.11),rgba(97,239,255,.06))}
      .sr-bot-site-live span,.sr-bot-site-grid span{display:block;color:#61efff;font-size:.68rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-site-live strong{display:block;margin:.24rem 0;color:#fff;font-size:1.38rem}
      .sr-bot-site-live p{color:rgba(247,251,255,.75);line-height:1.36}
      .sr-bot-site-live code{display:block;margin-top:.45rem;padding:.45rem .55rem;border-radius:.55rem;border:1px solid rgba(97,239,255,.16);background:rgba(0,0,0,.3);color:#dffbff;font:800 .72rem/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}
      .sr-bot-site-live a,.sr-bot-site-grid a{display:inline-flex;align-items:center;justify-content:center;min-height:2.2rem;padding:.48rem .68rem;border-radius:.62rem;background:#61efff;color:#07101d;font-size:.78rem;font-weight:1000;text-decoration:none}
      .sr-bot-site-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.52rem;margin-top:.72rem;max-height:24rem;overflow:auto;padding-right:.12rem}
      .sr-bot-site-grid article{position:relative;min-height:11.5rem;padding:.68rem;border-radius:.82rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);display:grid;gap:.32rem;align-content:start}
      .sr-bot-site-grid article.active{border-color:rgba(154,254,143,.45);background:linear-gradient(135deg,rgba(154,254,143,.14),rgba(97,239,255,.08));box-shadow:0 12px 28px rgba(0,0,0,.18)}
      .sr-bot-site-grid strong{display:block;color:#fff;font-size:1.02rem;line-height:1.08}
      .sr-bot-site-grid p{color:rgba(247,251,255,.7);font-size:.74rem;line-height:1.28}
      .sr-bot-site-grid div{display:flex;justify-content:space-between;gap:.35rem;align-items:center;margin-top:.1rem}
      .sr-bot-site-grid b{color:#ffefb3;font-size:.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .sr-bot-site-grid em{color:#9afe8f;font-size:.66rem;font-style:normal;font-weight:1000;text-transform:uppercase}
      .sr-bot-site-grid small{color:rgba(247,251,255,.62);font-size:.68rem;line-height:1.2}
      .sr-bot-site-grid a{justify-self:start;margin-top:.15rem;min-height:1.9rem;background:rgba(97,239,255,.14);border:1px solid rgba(97,239,255,.22);color:#dffbff}
      .sr-bot-builder{position:relative;overflow:hidden;border-color:rgba(97,239,255,.26);background:linear-gradient(135deg,rgba(4,12,28,.96),rgba(7,28,40,.88));box-shadow:0 24px 70px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.08)}
      .sr-bot-builder:after{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#61efff,#9afe8f,#ffd27a,transparent);animation:srBotRail 2.2s linear infinite}
      @keyframes srBotRail{0%{transform:translateX(-55%)}100%{transform:translateX(55%)}}
      .sr-bot-builder-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:.85rem}
      .sr-bot-builder-head span{display:block;color:#61efff;font-size:.74rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-builder-head strong{display:block;margin:.18rem 0;color:#fff;font-size:1.5rem;line-height:1.06}
      .sr-bot-builder-head p{max-width:58rem;color:rgba(247,251,255,.74);line-height:1.42}
      .sr-bot-builder-meter{min-width:10rem;display:grid;gap:.25rem;justify-items:end}
      .sr-bot-builder-meter b{color:#9afe8f;font-size:1.35rem}
      .sr-bot-builder-meter i{display:block;width:10rem;height:.58rem;border-radius:999px;overflow:hidden;background:rgba(0,0,0,.34);border:1px solid rgba(255,255,255,.12)}
      .sr-bot-builder-meter em{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#61efff,#9afe8f,#ffd27a)}
      .sr-bot-builder-meter small{color:#ffe8ad;font-weight:900}
      .sr-bot-placement{display:grid;grid-template-columns:minmax(15rem,.52fr) minmax(0,1fr);gap:.75rem;align-items:stretch;margin-bottom:.85rem}
      .sr-bot-placement>div:first-child{padding:.8rem;border-radius:.85rem;border:1px solid rgba(255,210,122,.22);background:rgba(255,210,122,.08)}
      .sr-bot-placement span{display:block;color:#ffd27a;font-size:.7rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-placement strong{display:block;margin:.22rem 0;color:#fff;font-size:1.16rem;line-height:1.06}
      .sr-bot-placement p{color:rgba(247,251,255,.76);line-height:1.35;font-size:.82rem}
      .sr-bot-placement-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.42rem}
      .sr-bot-placement-grid b{display:grid;place-items:center;min-height:2.8rem;padding:.42rem;border-radius:.72rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);color:rgba(247,251,255,.72);font-size:.72rem;text-align:center;line-height:1.1}
      .sr-bot-placement-grid b.active{border-color:rgba(154,254,143,.5);background:linear-gradient(135deg,rgba(154,254,143,.2),rgba(97,239,255,.1));color:#fff;box-shadow:0 12px 26px rgba(0,0,0,.2)}
      .sr-bot-builder-grid{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(18rem,.82fr);gap:.85rem}
      .sr-bot-draft-paper{min-height:23rem;margin:0;padding:1rem;border-radius:.95rem;border:1px solid rgba(97,239,255,.18);background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.38));color:#f7fbff;font:800 .9rem/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;box-shadow:inset 0 0 34px rgba(97,239,255,.055)}
      .sr-bot-type-cursor{display:inline-block;width:.58rem;height:1.1rem;margin-left:.18rem;vertical-align:-.16rem;background:#9afe8f;box-shadow:0 0 14px rgba(154,254,143,.7);animation:srBotBlink .72s steps(2,end) infinite}
      .sr-bot-draft-stack{display:grid;gap:.48rem;align-content:start;max-height:23rem;overflow:auto;padding-right:.15rem}
      .sr-bot-draft-stack article{padding:.72rem;border-radius:.8rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);opacity:.68;transition:border-color .2s ease,background .2s ease,transform .2s ease,opacity .2s ease}
      .sr-bot-draft-stack article span{display:block;color:#61efff;font-size:.68rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-draft-stack article p{margin:.25rem 0 0;color:rgba(247,251,255,.76);line-height:1.35;font-size:.82rem}
      .sr-bot-draft-stack article.done{border-color:rgba(154,254,143,.22);background:rgba(154,254,143,.075);opacity:.86}
      .sr-bot-draft-stack article.active{transform:translateX(-2px);border-color:rgba(255,210,122,.42);background:linear-gradient(135deg,rgba(255,210,122,.14),rgba(97,239,255,.08));opacity:1;box-shadow:0 10px 26px rgba(0,0,0,.18)}
      .sr-bot-attention-diagram{position:relative;overflow:hidden;border-color:rgba(255,210,122,.22);background:radial-gradient(circle at 50% 0%,rgba(255,210,122,.14),transparent 26%),linear-gradient(135deg,rgba(5,12,25,.95),rgba(17,24,42,.9))}
      .sr-bot-attention-map{display:grid;grid-template-columns:minmax(13rem,.34fr) minmax(0,1fr);gap:.85rem;align-items:stretch}
      .sr-bot-attention-core{display:grid;place-content:center;gap:.35rem;min-height:18rem;padding:1rem;border-radius:1rem;border:1px solid rgba(255,210,122,.28);background:radial-gradient(circle,rgba(255,210,122,.18),rgba(97,239,255,.07));text-align:center;box-shadow:inset 0 0 42px rgba(255,210,122,.08)}
      .sr-bot-attention-core span{color:#ffd27a;font-size:.72rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-attention-core strong{color:#fff;font-size:1.45rem;line-height:1}
      .sr-bot-attention-core p{color:rgba(247,251,255,.74);line-height:1.35}
      .sr-bot-attention-core b{justify-self:center;display:inline-grid;place-items:center;min-width:5.2rem;min-height:2rem;border-radius:999px;background:#ffd27a;color:#07101d;font-size:.82rem}
      .sr-bot-attention-spokes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}
      .sr-bot-attention-spokes article{position:relative;min-height:8.3rem;padding:.72rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);overflow:hidden}
      .sr-bot-attention-spokes article:before{content:"";position:absolute;left:0;top:.75rem;width:.18rem;height:calc(100% - 1.5rem);border-radius:999px;background:#61efff}
      .sr-bot-attention-spokes article.low:before{background:#ffd27a}
      .sr-bot-attention-spokes article.active{border-color:rgba(154,254,143,.5);background:linear-gradient(135deg,rgba(154,254,143,.16),rgba(97,239,255,.08));box-shadow:0 14px 28px rgba(0,0,0,.2)}
      .sr-bot-attention-spokes span{display:block;color:#61efff;font-size:.64rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-attention-spokes .low span{color:#ffd27a}
      .sr-bot-attention-spokes strong{display:block;margin:.2rem 0;color:#fff;font-size:.9rem;line-height:1.05}
      .sr-bot-attention-spokes p{color:rgba(247,251,255,.7);font-size:.74rem;line-height:1.28}
      .sr-bot-attention-meter{position:relative;height:.58rem;margin:.55rem 0 .3rem;border-radius:999px;background:rgba(0,0,0,.35);overflow:hidden;border:1px solid rgba(255,255,255,.1)}
      .sr-bot-attention-meter i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#61efff,#9afe8f)}
      .sr-bot-attention-spokes .low .sr-bot-attention-meter i{background:linear-gradient(90deg,#ffd27a,#ff9f6e)}
      .sr-bot-attention-meter em{position:absolute;inset:0;display:grid;place-items:center;color:#06101f;font-size:.58rem;font-style:normal;font-weight:1000}
      .sr-bot-attention-spokes small{color:rgba(247,251,255,.62);font-size:.68rem}
      .sr-bot-diversify-board{display:grid;grid-template-columns:minmax(14rem,.38fr) minmax(0,1fr);gap:.75rem;margin-top:.85rem;padding:.85rem;border-radius:.95rem;border:1px solid rgba(255,210,122,.18);background:rgba(255,210,122,.06)}
      .sr-bot-diversify-board span{color:#ffd27a;font-size:.7rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-diversify-board strong{display:block;margin:.2rem 0;color:#fff;font-size:1.05rem}
      .sr-bot-diversify-board p{color:rgba(247,251,255,.72);line-height:1.35}
      .sr-bot-diversify-targets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.45rem}
      .sr-bot-diversify-targets b{display:grid;gap:.25rem;padding:.6rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2);color:#fff;font-size:.78rem}
      .sr-bot-diversify-targets em{color:#dffbff;font-style:normal;font-size:.68rem;line-height:1.25}
      .sr-bot-execution{position:relative;overflow:hidden;border-color:rgba(154,254,143,.24);background:radial-gradient(circle at 12% 0%,rgba(154,254,143,.16),transparent 28%),linear-gradient(135deg,rgba(4,10,22,.96),rgba(11,19,43,.9));box-shadow:0 22px 55px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.08)}
      .sr-bot-execution:before{content:"";position:absolute;inset:-40% -20%;background:linear-gradient(115deg,transparent 0%,rgba(97,239,255,.08) 38%,rgba(154,254,143,.18) 50%,rgba(255,210,122,.1) 58%,transparent 70%);transform:translateX(-45%);animation:srBotSweep 2.8s linear infinite;pointer-events:none}
      @keyframes srBotSweep{0%{transform:translateX(-48%) rotate(0deg)}100%{transform:translateX(48%) rotate(0deg)}}
      .sr-bot-exec-top,.sr-bot-exec-main,.sr-bot-phase-rail{position:relative;z-index:1}
      .sr-bot-exec-top{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:.85rem}
      .sr-bot-exec-top span{display:block;color:#9afe8f;font-size:.74rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-exec-top strong{display:block;margin-top:.2rem;color:#fff;font-size:1.35rem;line-height:1.08}
      .sr-bot-exec-pills{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:flex-end}
      .sr-bot-exec-pills b{display:inline-flex;align-items:center;min-height:1.85rem;padding:.35rem .58rem;border-radius:999px;border:1px solid rgba(255,210,122,.22);background:rgba(255,210,122,.08);color:#ffe8ad;font-size:.72rem}
      .sr-bot-exec-main{display:grid;grid-template-columns:5.8rem minmax(0,1fr) minmax(18rem,.86fr);gap:.8rem;align-items:stretch}
      .sr-bot-orbit{position:relative;width:5.8rem;min-height:5.8rem;border-radius:999px;border:1px solid rgba(97,239,255,.2);background:radial-gradient(circle,rgba(97,239,255,.2) 0 10%,rgba(154,254,143,.1) 11% 32%,rgba(0,0,0,.2) 33% 100%);box-shadow:0 0 34px rgba(97,239,255,.16);animation:srBotOrbit 5.6s linear infinite}
      .sr-bot-orbit:after{content:"";position:absolute;inset:1.6rem;border-radius:999px;border:1px solid rgba(255,255,255,.24);background:rgba(0,0,0,.22)}
      .sr-bot-orbit i{position:absolute;left:50%;top:50%;width:.48rem;height:.48rem;margin:-.24rem;border-radius:999px;background:#61efff;box-shadow:0 0 16px rgba(97,239,255,.75)}
      .sr-bot-orbit i:nth-child(1){transform:rotate(0deg) translateX(2.45rem)}
      .sr-bot-orbit i:nth-child(2){transform:rotate(60deg) translateX(2.45rem);background:#9afe8f}
      .sr-bot-orbit i:nth-child(3){transform:rotate(120deg) translateX(2.45rem);background:#ffd27a}
      .sr-bot-orbit i:nth-child(4){transform:rotate(180deg) translateX(2.45rem)}
      .sr-bot-orbit i:nth-child(5){transform:rotate(240deg) translateX(2.45rem);background:#9afe8f}
      .sr-bot-orbit i:nth-child(6){transform:rotate(300deg) translateX(2.45rem);background:#ffd27a}
      @keyframes srBotOrbit{to{transform:rotate(360deg)}}
      .sr-bot-exec-current{display:grid;align-content:center;gap:.45rem;padding:.85rem;border:1px solid rgba(97,239,255,.16);border-radius:.9rem;background:rgba(0,0,0,.3)}
      .sr-bot-exec-current span{color:#61efff;font-size:.72rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-exec-current strong{color:#fff;font-size:1.42rem;line-height:1.05}
      .sr-bot-exec-current p{color:rgba(247,251,255,.78);line-height:1.4}
      .sr-bot-exec-current code{display:block;padding:.55rem .65rem;border-radius:.65rem;background:rgba(97,239,255,.08);border:1px solid rgba(97,239,255,.16);color:#dffbff;font:800 .76rem/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:normal;overflow-wrap:anywhere}
      .sr-bot-console-feed{position:relative;margin:0;min-height:8.7rem;max-height:10rem;overflow:hidden;padding:.8rem;border-radius:.9rem;border:1px solid rgba(154,254,143,.18);background:rgba(0,0,0,.46);color:#eaffdf;font:800 .75rem/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
      .sr-bot-console-feed:after{content:"";display:inline-block;width:.52rem;height:1rem;margin-left:.25rem;vertical-align:-.16rem;background:#9afe8f;animation:srBotBlink .8s steps(2,end) infinite}
      @keyframes srBotBlink{50%{opacity:0}}
      .sr-bot-phase-rail{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.42rem;margin-top:.8rem}
      .sr-bot-phase{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:.42rem;min-height:2.75rem;padding:.38rem .45rem;border-radius:.72rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);color:rgba(247,251,255,.68);transition:transform .2s ease,border-color .2s ease,background .2s ease}
      .sr-bot-phase i{display:grid;place-items:center;width:1.3rem;height:1.3rem;border-radius:999px;background:rgba(255,255,255,.08);color:#dffbff;font-style:normal;font-size:.68rem;font-weight:1000}
      .sr-bot-phase b{font-size:.7rem;line-height:1.05}
      .sr-bot-phase.seen{border-color:rgba(97,239,255,.2);background:rgba(97,239,255,.07);color:#dffbff}
      .sr-bot-phase.active{transform:translateY(-2px);border-color:rgba(154,254,143,.55);background:linear-gradient(135deg,rgba(154,254,143,.22),rgba(97,239,255,.12));color:#fff;box-shadow:0 0 0 1px rgba(154,254,143,.12),0 10px 24px rgba(0,0,0,.22)}
      .sr-bot-phase.active i{background:#9afe8f;color:#07101d;box-shadow:0 0 18px rgba(154,254,143,.55)}
      .sr-bot-live-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(16rem,.95fr);gap:.8rem;align-items:stretch}
      .sr-bot-code,.sr-bot-data,.sr-bot-page{display:grid;align-content:start;gap:.65rem}
      .sr-bot-code pre,.sr-bot-data pre{max-height:24rem;min-height:18rem;overflow:auto;margin:0;padding:.85rem;border-radius:.75rem;border:1px solid rgba(97,239,255,.16);background:rgba(0,0,0,.42);color:#dffbff;font:700 .78rem/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
      .sr-bot-deck{display:grid;gap:.65rem}
      .sr-bot-slide{min-height:7.25rem;padding:.85rem;border:1px solid rgba(97,239,255,.16);border-radius:.85rem;background:linear-gradient(135deg,rgba(255,255,255,.075),rgba(97,239,255,.045));box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
      .sr-bot-slide span{display:block;color:#61efff;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;font-weight:1000}
      .sr-bot-slide strong{display:block;margin:.3rem 0;color:#fff;font-size:1.28rem;line-height:1.05}
      .sr-bot-slide p,.sr-bot-slide small{color:rgba(247,251,255,.72);line-height:1.35}
      .sr-bot-meter,.sr-bot-score{position:relative;height:.75rem;margin:.65rem 0 .35rem;border-radius:999px;overflow:hidden;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1)}
      .sr-bot-meter i,.sr-bot-score i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#61efff,#9afe8f)}
      .sr-bot-score em{position:absolute;inset:0;display:grid;place-items:center;color:#07101d;font-size:.62rem;font-style:normal;font-weight:1000;text-transform:uppercase}
      .sr-bot-bars{display:grid;gap:.45rem;margin-top:.55rem}
      .sr-bot-bar{display:grid;grid-template-columns:minmax(5.8rem,.85fr) minmax(5rem,1.4fr) 1.6rem;align-items:center;gap:.45rem}
      .sr-bot-bar b{color:#dffbff;font-size:.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .sr-bot-bar i{height:.58rem;border-radius:999px;background:linear-gradient(90deg,#61efff,#9afe8f);box-shadow:0 0 18px rgba(97,239,255,.2)}
      .sr-bot-bar em{color:#9ff9ff;font-size:.72rem;font-style:normal;font-weight:1000;text-align:right}
      .sr-bot-pipeline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.35rem;margin:.65rem 0}
      .sr-bot-pipeline b{display:grid;gap:.2rem;place-items:center;min-height:3.4rem;padding:.45rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055);color:#dffbff;text-align:center;font-size:.7rem;text-transform:uppercase;letter-spacing:.04em}
      .sr-bot-pipeline b.active{border-color:rgba(97,239,255,.4);background:rgba(97,239,255,.13)}
      .sr-bot-pipeline em{font-style:normal;color:#9afe8f;font-size:1rem}
      .sr-bot-empty{color:rgba(247,251,255,.72)}
      .sr-bot-preview-card{padding:.85rem;border-radius:.8rem;border:1px solid rgba(97,239,255,.2);background:rgba(97,239,255,.08)}
      .sr-bot-preview-card span{display:block;color:#61efff;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;font-weight:1000}
      .sr-bot-preview-card strong{display:block;margin:.35rem 0;color:#fff;font-size:1.05rem}
      .sr-bot-preview-card p{color:rgba(247,251,255,.78);line-height:1.4}
      .sr-bot-preview-card a{display:inline-flex;margin-top:.45rem;color:#07101d;background:#61efff;border-radius:.65rem;padding:.45rem .7rem;font-weight:1000;text-decoration:none}
      .sr-bot-live-frame{width:100%;height:17rem;border:1px solid rgba(255,255,255,.12);border-radius:.8rem;background:#07101d}
      .sr-bot-queue .sr-global-grid{max-height:32rem;overflow:auto;padding-right:.15rem}
      .sr-bot-queue small{display:block;margin-top:.5rem;color:#9ff9ff;line-height:1.35}
      @media(max-width:1120px){.sr-bot-live-grid,.sr-bot-exec-main,.sr-bot-builder-grid,.sr-bot-placement,.sr-bot-attention-map,.sr-bot-diversify-board,.sr-traffic-head,.sr-traffic-grid,.sr-traffic-presentation,.sr-traffic-report,.sr-traffic-manual,.sr-bot-site-live{grid-template-columns:1fr}.sr-traffic-actions{justify-content:flex-start}.sr-bot-builder-head{display:grid}.sr-bot-builder-meter{justify-items:start}.sr-bot-orbit{margin:auto}.sr-bot-live-frame{height:22rem}.sr-bot-pipeline{grid-template-columns:repeat(2,minmax(0,1fr))}.sr-bot-phase-rail,.sr-bot-placement-grid,.sr-bot-attention-spokes,.sr-bot-diversify-targets,.sr-traffic-feed,.sr-bot-site-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sr-traffic-windows{grid-template-columns:repeat(3,minmax(0,1fr))}.sr-traffic-report-chart{grid-template-columns:repeat(4,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function bindEvents(){
    if (root.__globalSweepEventsBound) return;
    root.__globalSweepEventsBound = true;
    document.addEventListener('click', event=>{
      if (event.target.closest('[data-global-sweep-run]')) {
        event.preventDefault();
        runGlobalSweep();
      }
      if (event.target.closest('[data-outreach-run]')) {
        event.preventDefault();
        refreshOutreachMovements(true);
      }
      if (event.target.closest('[data-followup-run]')) {
        event.preventDefault();
        queueSmartFollowup();
      }
      const approveFollowup = event.target.closest('[data-followup-approve]');
      if (approveFollowup) {
        event.preventDefault();
        approveSmartFollowup(approveFollowup.getAttribute('data-followup-approve'));
      }
      if (event.target.closest('[data-traffic-ping]')) {
        event.preventDefault();
        toggleTrafficPing();
      }
      if (event.target.closest('[data-traffic-refresh]')) {
        event.preventDefault();
        refreshTrafficSummary(false);
      }
      if (event.target.closest('[data-save-shopify-manual]')) {
        event.preventDefault();
        saveManualShopifySessions();
      }
      if (event.target.closest('[data-copy-shopify-pixel]')) {
        event.preventDefault();
        const snippet = read().trafficSummary?.pixel_snippet || '';
        if (navigator.clipboard && snippet) navigator.clipboard.writeText(snippet).catch(()=>null);
        trafficBeep(35);
      }
    });
  }

  function liveBotStep(){
    const state = read();
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    if (!movements.length) return;
    const next = {
      ...state,
      outreachActiveIndex: (Number(state.outreachActiveIndex || 0) + 1) % movements.length,
      outreachLivePhase: 0,
      outreachDraftCursor: 0,
      outreachLiveTick: Number(state.outreachLiveTick || 0) + 1
    };
    write(next);
    if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
  }

  function liveBotPhaseStep(){
    const state = read();
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    if (!movements.length) return;
    const phases = executionPhasesFor(currentMovement(state));
    const active = currentMovement(state);
    const draftLength = Math.max(1, fullDraftFor(active).length);
    const step = Math.max(9, Math.round(draftLength / 18));
    const next = {
      ...state,
      outreachLivePhase: (Number(state.outreachLivePhase || 0) + 1) % Math.max(1, phases.length),
      outreachDraftCursor: (Number(state.outreachDraftCursor || 0) + step) % (draftLength + 28),
      outreachLiveTick: Number(state.outreachLiveTick || 0) + 1,
      outreachLastPulseAt: new Date().toISOString()
    };
    write(next);
    if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
  }

  function initGlobalSweep(){
    installBotStyles();
    patchGlobalTrackerRender();
    bindEvents();
    loadGlobalSweep();
    refreshOutreachMovements(false);
    refreshTrafficSummary(false);
    if (root.__globalSweepTimer) clearInterval(root.__globalSweepTimer);
    root.__globalSweepTimer = setInterval(loadGlobalSweep, SWEEP_MS);
    if (root.__globalBotLiveTimer) clearInterval(root.__globalBotLiveTimer);
    root.__globalBotLiveTimer = setInterval(liveBotStep, BOT_LIVE_MS);
    if (root.__globalBotPhaseTimer) clearInterval(root.__globalBotPhaseTimer);
    root.__globalBotPhaseTimer = setInterval(liveBotPhaseStep, BOT_PHASE_MS);
    if (root.__globalBotFetchTimer) clearInterval(root.__globalBotFetchTimer);
    root.__globalBotFetchTimer = setInterval(()=>refreshOutreachMovements(false), BOT_FETCH_MS);
    if (root.__globalTrafficTimer) clearInterval(root.__globalTrafficTimer);
    root.__globalTrafficTimer = setInterval(()=>refreshTrafficSummary(false), TRAFFIC_FETCH_MS);
  }

  root.runGlobalSweep = runGlobalSweep;
  root.refreshGlobalSweepOpportunities = refreshOpportunities;
  root.refreshOutreachMovements = refreshOutreachMovements;
  root.refreshTrafficSummary = refreshTrafficSummary;
  root.initGlobalSweep = initGlobalSweep;
})();
