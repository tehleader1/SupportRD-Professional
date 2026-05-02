(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const STORE_KEY = 'srGlobalBotFocus20260502b';
  const RESET_SENTINEL_KEY = 'srGlobalBotFocus20260502bDone';
  const SWEEP_MS = 10 * 60 * 1000;
  const SERVER_STATUS_ENDPOINT = '/api/global-sweep/status';
  const SERVER_RUN_ENDPOINT = '/api/global-sweep/run';
  const VIRAL_ENDPOINT = '/api/viral-engine/opportunities';
  const OUTREACH_MOVEMENTS_ENDPOINT = '/api/outreach/movements';
  const OUTREACH_TICK_ENDPOINT = '/api/outreach/tick';
  const OUTREACH_EXPAND_ENDPOINT = '/api/outreach/expand';
  const OUTREACH_FOLLOWUPS_ENDPOINT = '/api/outreach/followups';
  const OUTREACH_OWNED_POSTS_ENDPOINT = '/api/outreach/owned-posts';
  const OUTREACH_CONNECT_STATUS_ENDPOINT = '/api/outreach/connect/status';
  const OUTREACH_CONNECT_SUBMIT_ENDPOINT = '/api/outreach/connect/submit';
  const OUTREACH_OWNER_TOKEN_KEY = 'srOutreachOwnerToken';
  const OUTREACH_AUTO_APPROVE_KEY = 'srOutreachAutoApproveConnected';
  const OUTREACH_AUTO_APPROVE_MS = 45 * 1000;
  const OUTREACH_AUTO_APPROVE_HISTORY_LIMIT = 80;
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

  function resetLegacyGlobalTrackerState(){
    try {
      if (localStorage.getItem(RESET_SENTINEL_KEY) === '1') return;
      [
        'srGlobalSweepV1',
        'srGlobalSweepV2',
        'srPersonalTracker',
        'srShopifyTracker',
        'srGlobalSweepFresh20260502a',
        'srTrafficLastAlertAt',
        'srTrafficFirstBotReturnKey',
        'srTrafficClientId'
      ].forEach(key => localStorage.removeItem(key));
      localStorage.setItem(RESET_SENTINEL_KEY, '1');
    } catch {}
  }

  resetLegacyGlobalTrackerState();

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

  function outreachOwnerToken(){
    try { return localStorage.getItem(OUTREACH_OWNER_TOKEN_KEY) || ''; }
    catch { return ''; }
  }

  function outreachAuthHeaders(json){
    const headers = { 'Accept':'application/json' };
    if (json) headers['Content-Type'] = 'application/json';
    const token = outreachOwnerToken();
    if (token) headers['X-Outreach-Admin-Token'] = token;
    return headers;
  }

  function saveOutreachOwnerToken(reason){
    const promptText = reason
      ? `${reason}\n\nPaste the outreach admin token.`
      : 'Paste the outreach admin token for SupportRD approvals.';
    const token = window.prompt(promptText);
    if (token === null) return false;
    try {
      const clean = String(token || '').trim();
      if (clean) localStorage.setItem(OUTREACH_OWNER_TOKEN_KEY, clean);
      else localStorage.removeItem(OUTREACH_OWNER_TOKEN_KEY);
      return true;
    } catch {
      return false;
    }
  }

  function autoApproveEnabled(){
    try { return localStorage.getItem(OUTREACH_AUTO_APPROVE_KEY) === '1'; }
    catch { return false; }
  }

  function writeAutoApproveStatus(status){
    const state = read();
    const next = {
      ...state,
      outreachAutoApproveStatus: {
        ...(state.outreachAutoApproveStatus || {}),
        ...status,
        at: new Date().toISOString()
      }
    };
    write(next);
    if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
    return next;
  }

  function setAutoApproveEnabled(enabled){
    try {
      if (enabled) localStorage.setItem(OUTREACH_AUTO_APPROVE_KEY, '1');
      else localStorage.removeItem(OUTREACH_AUTO_APPROVE_KEY);
    } catch {}
    writeAutoApproveStatus({
      ok: !!enabled,
      status: enabled ? 'auto_approve_enabled' : 'auto_approve_paused',
      title: enabled ? 'Auto-click approval is live' : 'Auto-click approval is paused'
    });
    if (enabled) setTimeout(()=>runAutoApproveTick(), 250);
  }

  function toggleAutoApprove(){
    setAutoApproveEnabled(!autoApproveEnabled());
  }

  async function postOutreachAdmin(url, body){
    const options = {
      method:'POST',
      cache:'no-store',
      headers: outreachAuthHeaders(!!body)
    };
    if (body) options.body = JSON.stringify(body);
    let res = await fetch(url, options);
    if ((res.status === 401 || res.status === 403) && saveOutreachOwnerToken('Owner approval token is required for this button.')) {
      const retry = {
        method:'POST',
        cache:'no-store',
        headers: outreachAuthHeaders(!!body)
      };
      if (body) retry.body = JSON.stringify(body);
      res = await fetch(url, retry);
    }
    return res;
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
        await postOutreachAdmin(OUTREACH_EXPAND_ENDPOINT).catch(()=>null);
        await postOutreachAdmin(OUTREACH_TICK_ENDPOINT).catch(()=>null);
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
        outreachBotSwarm: payload.botSwarm || payload.settings?.bot_swarm || state.outreachBotSwarm || null,
        outreachTrafficMath: payload.trafficMath || payload.settings?.traffic_math || payload.botSwarm?.traffic_math || state.outreachTrafficMath || null,
        outreachSeoGuidelines: payload.settings?.seo_guidelines || payload.botSwarm?.seo_guidelines || state.outreachSeoGuidelines || null,
        outreachConnectedSubmissions: Array.isArray(payload.connectedSubmissions) ? payload.connectedSubmissions.slice(0, 20) : state.outreachConnectedSubmissions || [],
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
      const res = await postOutreachAdmin(OUTREACH_FOLLOWUPS_ENDPOINT, {
        id: active.id,
        key: active.key,
        context: context || active.draft || active.movement || active.focus_reason || ''
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
      await postOutreachAdmin(`${OUTREACH_FOLLOWUPS_ENDPOINT}/${encodeURIComponent(id)}/approve`);
    } catch {}
    return refreshOutreachMovements(false);
  }

  async function refreshOwnedPosts(){
    try {
      const res = await fetch(OUTREACH_OWNED_POSTS_ENDPOINT, {
        cache:'no-store',
        headers:{ 'Accept':'application/json' }
      });
      if (!res.ok) return null;
      const payload = await res.json();
      const state = read();
      const next = {
        ...state,
        outreachOwnedPosts: Array.isArray(payload.posts) ? payload.posts.slice(0, 12) : [],
        outreachOwnedStatus: {
          posting_mode: payload.posting_mode || 'draft_only',
          owned_posting_enabled: !!payload.owned_posting_enabled,
          auto_approval_scope: payload.auto_approval_scope || 'SupportRD-owned public surfaces',
          external_channel_status: payload.external_channel_status || '',
          public_url: payload.public_url || 'https://supportrd.com/FAQ',
          surface_label: payload.surface_label || 'SupportRD FAQ Lounge / Developer Feed',
          visibility: payload.visibility || 'public_support_rd_owned_surface'
        },
        outreachOwnedPublicUrl: payload.public_url || 'https://supportrd.com/FAQ',
        outreachOwnedUpdatedAt: new Date().toISOString()
      };
      write(next);
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return next;
    } catch {
      return null;
    }
  }

  async function publishOwnedPost(item){
    const state = read();
    const active = item || currentMovement(state);
    const payload = {
      title: active.title || 'SupportRD growth update',
      message: fullDraftFor(active),
      movement: active.movement || '',
      source: active.key || active.id || active.category || '',
      campaign: websiteTargetFor(active).campaign || '',
      surface: 'SupportRD FAQ Lounge / Developer Feed'
    };
    try {
      let res = await fetch(`${OUTREACH_OWNED_POSTS_ENDPOINT}/publish`, {
        method:'POST',
        cache:'no-store',
        headers: outreachAuthHeaders(true),
        body: JSON.stringify(payload)
      });
      if ((res.status === 401 || res.status === 403) && saveOutreachOwnerToken('Publishing to SupportRD-owned public surfaces needs your owner token.')) {
        res = await fetch(`${OUTREACH_OWNED_POSTS_ENDPOINT}/publish`, {
          method:'POST',
          cache:'no-store',
          headers: outreachAuthHeaders(true),
          body: JSON.stringify(payload)
        });
      }
      const data = await res.json().catch(()=>({ ok:false, error:`http_${res.status}` }));
      const next = {
        ...read(),
        outreachOwnedPublishResult: {
          ok: !!data.ok,
          status: data.status || data.error || `http_${res.status}`,
          title: data.title || payload.title,
          public_url: data.public_url || 'https://supportrd.com/FAQ',
          at: new Date().toISOString()
        },
        outreachOwnedPublicUrl: data.public_url || read().outreachOwnedPublicUrl || 'https://supportrd.com/FAQ',
        outreachOwnedPosts: Array.isArray(data.posts) ? data.posts.slice(0,12) : (read().outreachOwnedPosts || [])
      };
      write(next);
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return data;
    } catch {
      const next = {
        ...read(),
        outreachOwnedPublishResult: {
          ok:false,
          status:'publish_request_failed',
          title: payload.title,
          at: new Date().toISOString()
        }
      };
      write(next);
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return null;
    }
  }

  async function refreshConnectedSubmitStatus(){
    try {
      const res = await fetch(OUTREACH_CONNECT_STATUS_ENDPOINT, {
        cache:'no-store',
        headers:{ 'Accept':'application/json' }
      });
      if (!res.ok) return null;
      const payload = await res.json();
      const state = read();
      const next = {
        ...state,
        outreachConnectedStatus: payload.connected || null,
        outreachConnectedSubmissions: Array.isArray(payload.recent_submissions) ? payload.recent_submissions.slice(0, 20) : state.outreachConnectedSubmissions || [],
        outreachConnectedUpdatedAt: new Date().toISOString()
      };
      write(next);
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return next;
    } catch {
      return null;
    }
  }

  async function submitThroughConnectedAPI(item){
    const active = item || currentMovement(read());
    const site = websiteTargetFor(active);
    const provider = connectedProviderForSite(site);
    write({
      ...read(),
      outreachConnectSubmitResult: {
        ok:false,
        status: isOwnedSupportRDSurface(site) ? 'publishing_public_support_rd_surface' : 'submitting_to_permitted_connected_api',
        provider,
        title: active.title || 'SupportRD connected submission',
        at: new Date().toISOString()
      }
    });
    if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
    if (isOwnedSupportRDSurface(site)) {
      const ownedResult = await publishOwnedPost(active);
      const next = {
        ...read(),
        outreachConnectSubmitResult: {
          ok: !!ownedResult?.ok,
          status: ownedResult?.status || 'public_support_rd_publish_requested',
          provider: 'owned_support_rd',
          title: active.title || 'SupportRD public post',
          at: new Date().toISOString()
        }
      };
      write(next);
      refreshConnectedSubmitStatus();
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return ownedResult;
    }
    const body = {
      id: active.id || '',
      key: active.key || '',
      provider: site.connected_provider || provider || '',
      title: active.title || '',
      website_target: site
    };
    try {
      const res = await postOutreachAdmin(OUTREACH_CONNECT_SUBMIT_ENDPOINT, body);
      const data = await res.json().catch(()=>({ ok:false, status:`http_${res.status}` }));
      const next = {
        ...read(),
        outreachConnectSubmitResult: {
          ok: !!data.ok,
          status: data.status || data.error || `http_${res.status}`,
          provider: data.provider || site.connected_provider || 'connect_api',
          title: active.title || 'SupportRD connected submission',
          target: data.target || site,
          response: data.response || {},
          at: new Date().toISOString()
        },
        outreachConnectedSubmissions: data.submission_id
          ? [{ id:data.submission_id, provider:data.provider, status:data.status, target:data.target, draft:data.draft, response:data.response, created_at:new Date().toISOString() }, ...((read().outreachConnectedSubmissions || []).filter(Boolean))].slice(0, 20)
          : read().outreachConnectedSubmissions || []
      };
      write(next);
      refreshConnectedSubmitStatus();
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return data;
    } catch {
      const next = {
        ...read(),
        outreachConnectSubmitResult: {
          ok:false,
          status:'connected_submit_failed',
          provider: site.connected_provider || provider || 'connect_api',
          title: active.title || 'SupportRD connected submission',
          at: new Date().toISOString()
        }
      };
      write(next);
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
      return null;
    }
  }

  async function runAutoApproveTick(){
    if (!autoApproveEnabled()) return null;
    const state = read();
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    const start = Math.max(0, Number(state.outreachActiveIndex || 0));
    const ordered = movements.length
      ? movements.slice(start).concat(movements.slice(0, start))
      : [currentMovement(state)];
    const candidate = ordered
      .filter(item=>isAutoApproveEligible(item, state))
      .sort((a,b)=>autoApproveSortScore(b) - autoApproveSortScore(a))[0];
    if (!candidate) {
      writeAutoApproveStatus({
        ok:false,
        status:'watching_for_permitted_channel',
        title:'Auto-click approval is watching',
        provider:'connect_api'
      });
      return null;
    }
    const fingerprint = autoApproveFingerprint(candidate);
    const info = connectedApprovalInfoFor(candidate);
    writeAutoApproveStatus({
      ok:false,
      status: info.owned ? 'auto_clicking_public_support_rd_post' : 'auto_clicking_permitted_connected_channel',
      title: candidate.title || candidate.category || 'SupportRD movement',
      provider: info.provider,
      domain: info.site.domain || info.site.label || ''
    });
    const result = await submitThroughConnectedAPI(candidate);
    recordAutoApproval(candidate, result || {}, fingerprint);
    refreshConnectedSubmitStatus();
    return result;
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

  function formatTrafficInterval(minutes){
    const value = Number(minutes || 0);
    if (!value) return 'waiting';
    if (value < 1) return `${Math.max(1, Math.round(value * 60))} sec`;
    if (value < 90) return `${Math.round(value)} min`;
    const hours = value / 60;
    if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} hr`;
    return `${(hours / 24).toFixed(1)} days`;
  }

  function formatTrafficStamp(value){
    if (!value) return 'waiting';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 24);
    return date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }

  function formatTrafficAge(value){
    if (!value) return 'waiting';
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return 'saved report';
    const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
    if (seconds < 8) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 90) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    return `${hours}h ago`;
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
      const response = await fetch(TRAFFIC_PIXEL_ENDPOINT, {
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
          sr_bot: params.get('sr_bot') || params.get('sr_campaign') || '',
          dashboard_ping: true
        })
      }).catch(()=>null);
      const payload = response && response.ok ? await response.json().catch(()=>null) : null;
      const state = read();
      write({
        ...state,
        trafficLastPingAt: payload?.recorded?.created_at || new Date().toISOString(),
        trafficLastPingStatus: payload?.ok ? 'sent' : 'sent_no_payload',
        trafficLastPingPath: payload?.recorded?.path || `${location.pathname || '/'}${location.search || ''}`
      });
      return payload;
    } catch {
      const state = read();
      write({
        ...state,
        trafficLastPingAt: new Date().toISOString(),
        trafficLastPingStatus: 'failed',
        trafficLastPingPath: `${location.pathname || '/'}${location.search || ''}`
      });
      return null;
    }
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
      try {
        root.bumpCommerceRank?.('makingMoney', serverSweep.matchCount || 1, {
          moneyRoute:'botOutreach',
          source:'server-global-sweep',
          matches: serverSweep.matchCount || 0
        });
      } catch {}
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
    try {
      root.bumpCommerceRank?.('makingMoney', matches.length || 1, {
        moneyRoute:'botOutreach',
        source:'local-global-sweep',
        matches: matches.length || 0
      });
    } catch {}
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
      tracking_url: 'https://supportrd.com',
      public_url: 'https://supportrd.com',
      internal_campaign: `utm_source=supportrd_bot&utm_medium=outreach&sr_bot=1&utm_campaign=${slugify(`${label}-${item?.title || item?.category || ''}`)}`,
      permission_note: 'Research/draft target only. Owner approval is required before external action.'
    };
  }

  function isOwnedSupportRDSurface(site){
    const domain = String(site?.domain || '').toLowerCase();
    const url = String(site?.url || '').toLowerCase();
    return domain === 'supportrd.com'
      || domain.endsWith('.supportrd.com')
      || url.includes('://supportrd.com')
      || url.includes('://shop.supportrd.com');
  }

  function connectedProviderForSite(site){
    const domain = String(site?.domain || '').toLowerCase();
    if (isOwnedSupportRDSurface(site)) return 'owned_support_rd';
    if (domain.includes('wordpress')) return 'wordpress_api';
    if (['linkedin.com','instagram.com','youtube.com','tiktok.com','nextdoor.com','facebook.com','pinterest.com'].includes(domain)) return 'social_platform_api';
    if (domain.includes('cpcc.edu') || domain.includes('ncworks.gov') || domain.includes('charlotteworks.com') || domain.includes('charlotte.edu') || domain.includes('joinhandshake.com')) return 'email_or_form_api';
    if (domain.includes('patch.com') || domain.includes('medium.com') || domain.includes('substack.com') || domain.includes('featured.com') || domain.includes('producthunt.com')) return 'publisher_api';
    if (domain.includes('eventbrite.com') || domain.includes('meetup.com')) return 'event_listing_api';
    if (domain.includes('yelp.com') || domain.includes('google.com/business')) return 'business_listing_api';
    return 'connect_api';
  }

  function connectedChannelForProvider(provider){
    const status = read().outreachConnectedStatus || {};
    const channels = Array.isArray(status.channels) ? status.channels : [];
    return channels.find(channel=>channel.provider === provider)
      || channels.find(channel=>channel.provider === 'connect_api')
      || { provider, connected:false, status:'connect_api_required', label:'Connected API', scope:'Connect API required.' };
  }

  function connectedMissingText(provider, channel){
    const label = channel?.label || provider || 'Connected API';
    if (provider === 'social_platform_api') {
      return `Missing webhook bridge for Social/comment platform. Set SUPPORTRD_CONNECT_API_URL or SUPPORTRD_SOCIAL_PLATFORM_API_URL.`;
    }
    return `Missing webhook bridge for ${label}. Set SUPPORTRD_CONNECT_API_URL or a provider-specific API URL.`;
  }

  function connectedResultText(result, provider, channel){
    if (!result?.status) return '';
    if (result.status === 'connect_api_missing') {
      const needed = result.provider || provider || 'connect_api';
      return `connect_api_missing for ${needed}`;
    }
    return `${result.status} · ${result.provider || provider || channel?.provider || 'connect_api'}`;
  }

  function connectedApprovalInfoFor(item){
    const site = websiteTargetFor(item);
    const provider = connectedProviderForSite(site);
    const channel = connectedChannelForProvider(provider);
    const owned = isOwnedSupportRDSurface(site);
    return {
      site,
      provider,
      channel,
      owned,
      ready: owned || !!channel.connected
    };
  }

  function autoApproveFingerprint(item){
    const info = connectedApprovalInfoFor(item);
    const windowId = Number(info.site.random_window_seconds || 0)
      ? Math.floor(Date.now() / (Number(info.site.random_window_seconds || 1) * 1000))
      : '';
    return [
      item?.id || item?.key || item?.title || item?.category || 'movement',
      info.site.domain || info.site.label || 'target',
      info.site.campaign || info.site.tracking_url || '',
      info.site.found_at || windowId || ''
    ].join('|');
  }

  function autoApprovedFingerprints(state){
    const raw = Array.isArray(state.outreachAutoApprovedKeys) ? state.outreachAutoApprovedKeys : [];
    return raw.map(item=>typeof item === 'string' ? item : item?.fingerprint).filter(Boolean);
  }

  function isAutoApproveEligible(item, state){
    if (!item) return false;
    const info = connectedApprovalInfoFor(item);
    if (!info.ready) return false;
    const status = String(item.status || info.site.status || '').toLowerCase();
    if (status.includes('reject') || status.includes('block') || status.includes('failed')) return false;
    return !autoApprovedFingerprints(state).includes(autoApproveFingerprint(item));
  }

  function autoApproveSortScore(item){
    const info = connectedApprovalInfoFor(item);
    const text = JSON.stringify(item || {}).toLowerCase();
    let score = 0;
    if (info.owned) score += 1000;
    if (info.channel?.connected) score += 260;
    if (info.provider === 'connect_api') score += 80;
    if (info.provider === 'publisher_api') score += 72;
    if (info.provider === 'email_or_form_api') score += 68;
    if (info.provider === 'event_listing_api') score += 62;
    if (info.provider === 'business_listing_api') score += 60;
    if (info.provider === 'wordpress_api') score += 58;
    if (info.provider === 'social_platform_api') score += 52;
    if (text.includes('owned') || text.includes('supportrd faq lounge')) score += 120;
    if (text.includes('post') || text.includes('comment') || text.includes('story')) score += 36;
    score += Number(item?.attention_score || item?.score || item?.focus_rank || 0);
    return score;
  }

  function recordAutoApproval(item, result, fingerprint){
    const state = read();
    const info = connectedApprovalInfoFor(item);
    const entry = {
      fingerprint,
      ok: !!result?.ok,
      status: result?.status || result?.error || 'submitted_to_connected_api',
      provider: result?.provider || info.provider,
      title: item?.title || item?.category || 'SupportRD movement',
      domain: info.site.domain || info.site.label || 'supportrd.com',
      at: new Date().toISOString()
    };
    const history = [entry, ...((state.outreachAutoApproveHistory || []).filter(row=>row?.fingerprint !== fingerprint))]
      .slice(0, OUTREACH_AUTO_APPROVE_HISTORY_LIMIT);
    write({
      ...state,
      outreachAutoApprovedKeys: history.map(row=>row.fingerprint).filter(Boolean),
      outreachAutoApproveHistory: history,
      outreachAutoApproveLastResult: entry,
      outreachAutoApproveCount: Number(state.outreachAutoApproveCount || 0) + 1,
      outreachAutoApproveStatus: entry
    });
    if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
  }

  function renderWebsiteEntryBoard(state, active){
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    const rows = (movements.length ? movements : [active]).slice(0, 16).map((item, index)=>({
      item,
      site: websiteTargetFor(item),
      active: item.key && item.key === active.key || index === Number(state.outreachActiveIndex || 0)
    }));
    const current = websiteTargetFor(active);
    const currentOwned = isOwnedSupportRDSurface(current);
    const provider = connectedProviderForSite(current);
    const channel = connectedChannelForProvider(provider);
    const submitResult = state.outreachConnectSubmitResult || {};
    const autoOn = autoApproveEnabled();
    const autoStatus = state.outreachAutoApproveStatus || state.outreachAutoApproveLastResult || {};
    const autoCount = Number(state.outreachAutoApproveCount || 0);
    const autoLast = state.outreachAutoApproveLastResult || {};
    return `
      <section class="sr-global-band sr-bot-websites">
        <div class="sr-global-band-head">
          <span>Websites Visited / Entered</span>
          <strong>${esc(current.domain || current.label || 'review target')}</strong>
        </div>
        <div class="sr-bot-site-live">
          <div>
            <span>Current Website Target</span>
            <strong>${esc(current.label || current.domain || 'Target website')}</strong>
            <p>${esc(currentOwned ? 'SupportRD-owned public surface. This creates crawlable proof content for ads, comments, emails, and pitches to point back to. Outside websites only run through permitted connected channels.' : (current.randomized ? `Random found target. Search route: ${current.search_query || current.purpose || 'fresh website discovery'}` : (current.purpose || 'The bot is preparing a draft/review route for this website lane.')))}</p>
            <code>${esc(current.public_url || current.tracking_url || 'https://supportrd.com')}</code>
          </div>
          <a href="${esc(current.url || 'https://supportrd.com')}" target="_blank" rel="noopener">${currentOwned ? 'Open Public Feed' : 'Open Website'}</a>
        </div>
        <div class="sr-connect-submit-rail">
          <div>
            <span>Permitted Auto-Click Approval</span>
            <strong>${esc(channel.connected || currentOwned ? 'Ready for owner-approved submit' : 'Connect API needed')}</strong>
            <p>${esc(currentOwned ? 'This one is owned by SupportRD, so approving can publish a public SupportRD post now.' : (channel.connected ? `This exact random target will hand off through permitted ${channel.label || provider}.` : connectedMissingText(provider, channel)))}</p>
            <small>${esc(provider)} · ${esc(channel.status || 'status pending')}</small>
          </div>
          <button type="button" data-connected-submit>${currentOwned ? 'Publish Owned' : 'Approve Through Connected API'}</button>
          <button type="button" class="${autoOn ? 'active' : ''}" data-connected-auto-approve>${autoOn ? 'Auto-Click On' : 'Auto-Click Approval'}</button>
          <button type="button" data-connected-refresh>Refresh API</button>
          ${submitResult.status ? `<b class="${submitResult.ok ? 'ok' : 'warn'}">${esc(connectedResultText(submitResult, provider, channel))}</b>` : ''}
          <small class="sr-auto-approve-status">
            ${esc(autoOn ? `Auto-clicks 1 permitted target every ${Math.round(OUTREACH_AUTO_APPROVE_MS / 1000)}s: SupportRD public post or connected API handoff` : 'Auto approval paused')}
            · ${esc(autoCount)} sent
            ${autoStatus.status ? ` · ${esc(autoStatus.status)}` : ''}
            ${autoLast.domain ? ` · ${esc(autoLast.domain)}` : ''}
          </small>
        </div>
        <div class="sr-bot-site-grid">
          ${rows.map(({item, site, active: isActive})=>{
            const owned = isOwnedSupportRDSurface(site);
            const rowProvider = connectedProviderForSite(site);
            const rowChannel = connectedChannelForProvider(rowProvider);
            const status = owned ? 'public owned surface live' : (site.status || item.status || 'queued');
            const action = owned ? 'open public feed' : 'review target';
            return `
            <article class="${isActive ? 'active' : ''}">
              <span>${esc(site.lane || item.placement_lane || placementLaneFor(item).label)}</span>
              <strong>${esc(site.label || site.domain || 'Target website')}</strong>
              <p>${esc(owned ? 'Public SupportRD route that becomes proof content for outside traffic.' : (site.randomized ? `Random found website candidate. ${site.purpose || ''}` : (site.purpose || item.target || 'Owner-review placement route')))}</p>
              <div>
                <b>${esc(site.domain || 'supportrd.com')}</b>
                <em>${esc(site.randomized ? 'random found' : status)}</em>
              </div>
              <small>${esc(rowProvider)} · ${esc(owned || rowChannel.connected ? 'connected-ready' : 'needs connect API')}</small>
              ${site.search_query ? `<small>search: ${esc(site.search_query)}</small>` : ''}
              <small>${esc(item.title || item.category || 'SupportRD movement')}</small>
              <a href="${esc(site.url || 'https://supportrd.com')}" target="_blank" rel="noopener">${esc(action)}</a>
            </article>
          `}).join('')}
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

  function renderLiveBotChat(state, active){
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    const tick = Number(state.outreachLiveTick || 0);
    const phaseIndex = Number(state.outreachLivePhase || 0);
    const phases = executionPhasesFor(active);
    const phase = phases.length ? phases[phaseIndex % phases.length] : { label:'Plan', status:'Planning next safe movement', detail:'Waiting for queue data.' };
    const parts = messagePartsFor(active);
    const part = parts.length ? parts[tick % parts.length] : { label:'Draft', text:active.draft || active.hook || 'Waiting for draft text.' };
    const placement = placementLaneFor(active);
    const website = websiteTargetFor(active);
    const attention = active.attention_routes || {};
    const messages = [
      {
        who:'Bot',
        role:'planner',
        title:'Planning',
        text:`I am selecting ${active.title || active.category || 'the next SupportRD movement'} because it belongs to ${placement.label}.`,
        meta:`queue ${movements.length} · score ${active.attention_score || active.score || 0}`
      },
      {
        who:'Bot',
        role:'processor',
        title:'Processing',
        text:`Current phase: ${phase.status}. ${phase.detail}`,
        meta:`phase ${(phaseIndex % Math.max(1, phases.length)) + 1}/${Math.max(1, phases.length)}`
      },
      {
        who:'Bot',
        role:'writer',
        title:`Writing ${part.label}`,
        text:part.text,
        meta:`draft cursor ${Number(state.outreachDraftCursor || 0)}`
      },
      {
        who:'Route',
        role:'route',
        title:'Website lane',
        text:`Route this through ${website.label || website.domain || 'the review target'} for ${website.purpose || placement.detail}.`,
        meta:website.tracking_url || 'tracking route pending'
      },
      {
        who:'Guard',
        role:'guard',
        title:'Approval check',
        text:active.approval_boundary || website.permission_note || 'Draft, queue, and review only before any outside platform action.',
        meta:active.status || 'queued'
      },
      {
        who:'Next',
        role:'next',
        title:'Next move',
        text:active.next_action || 'Keep generating safe queued opportunities and live route details.',
        meta:`attention ${attention.score || active.attention_score || 0}/100`
      }
    ];
    const current = messages[tick % messages.length];
    return `
      <section class="sr-global-band sr-bot-chat-live" aria-live="polite">
        <div class="sr-bot-chat-head">
          <div>
            <span>Live Bot Chat</span>
            <strong>Planning and processing in real time</strong>
            <p>Operational chat view of what the backend bot is doing now: planning, drafting, routing, checking approval, and queueing.</p>
          </div>
          <div class="sr-bot-chat-status">
            <b>${esc(current.title)}</b>
            <small>${esc(new Date(state.outreachUpdatedAt || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }))}</small>
          </div>
        </div>
        <div class="sr-bot-chat-window">
          ${messages.map((message, index)=>`
            <article class="${index === tick % messages.length ? 'active' : ''} ${esc(message.role)}">
              <div>
                <span>${esc(message.who)}</span>
                <strong>${esc(message.title)}</strong>
              </div>
              <p>${esc(message.text)}</p>
              <small>${esc(message.meta)}</small>
            </article>
          `).join('')}
        </div>
        <div class="sr-bot-chat-compose">
          <b>${esc(current.who)} is typing</b>
          <span>${esc(current.text).slice(0, Math.min(140, 28 + (tick % 8) * 18))}</span><i></i>
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

  function renderAttentionScoreDetails(active, stats, activeAttention){
    const detail = active.attention_routes || active.attentionRoutes || {};
    const placement = placementLaneFor(active);
    const routes = Array.isArray(detail.routes) && detail.routes.length
      ? detail.routes
      : [
        { label:'Base outreach read', points:40, detail:'Every queued movement starts with baseline opportunity weight.' },
        { label:placement.label, points:Math.max(0, Number(activeAttention || 0) - 40), detail:placement.detail || 'Active lane relevance.' }
      ];
    const raw = Number(detail.raw_total ?? routes.reduce((sum, route)=>sum + Number(route.points || 0), 0));
    const score = Number(detail.score ?? activeAttention ?? 0);
    const status = detail.status || active.attention_status || (score >= 78 ? 'strong_attention' : score >= 62 ? 'warming_attention' : 'low_attention_diversify');
    const lane = detail.lane || placement.label;
    const strongest = [...routes].sort((a,b)=>Number(b.points || 0) - Number(a.points || 0)).slice(0,4);
    return `
      <div class="sr-bot-attention-detail-board">
        <div class="sr-bot-attention-detail-head">
          <div>
            <span>Attention Core Route Details</span>
            <strong>${esc(score)} / 100 ${raw > 100 ? `(raw ${esc(raw)} capped)` : ''}</strong>
            <p>${esc(detail.summary || 'Attention Core is a capped quality/attention-read score, not a visitor count.')}</p>
          </div>
          <div>
            <b>${esc(status.replaceAll('_',' '))}</b>
            <small>${esc(lane)}</small>
          </div>
        </div>
        <div class="sr-bot-attention-route-grid">
          ${routes.map(route=>`
            <article class="${Number(route.points || 0) < 0 ? 'negative' : ''}">
              <span>${esc(route.label || route.id || 'attention route')}</span>
              <strong>${Number(route.points || 0) > 0 ? '+' : ''}${esc(route.points || 0)}</strong>
              <p>${esc(route.detail || 'Score route detail')}</p>
            </article>
          `).join('')}
        </div>
        <div class="sr-bot-attention-proof-strip">
          ${strongest.map(route=>`<b>${esc(route.label || 'route')} <em>${Number(route.points || 0) > 0 ? '+' : ''}${esc(route.points || 0)}</em></b>`).join('')}
          <b>visible lanes <em>${esc(stats.length)}</em></b>
          <b>active lane <em>${esc(lane)}</em></b>
        </div>
      </div>
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
        ${renderAttentionScoreDetails(active, stats, activeAttention)}
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

  function renderBotSwarmPanel(state, active){
    const settings = state.outreachSettings || {};
    const swarm = state.outreachBotSwarm || settings.bot_swarm || {};
    const workers = Array.isArray(swarm.workers) && swarm.workers.length ? swarm.workers : [];
    const tick = Number(state.outreachLiveTick || 0);
    const activeWorker = active.swarm_worker || workers[tick % Math.max(1, workers.length)] || {};
    const ownedPolicy = swarm.public_owned_surface_policy || 'SupportRD-owned public pages are the proof hub the outside outreach points back to.';
    const autoScope = swarm.auto_publish_scope || 'Auto-click publishes on SupportRD-owned public pages and submits only through permitted connected channels.';
    const antiBan = swarm.anti_ban_policy || 'No account rotation, proxy tricks, speed hacks, fake engagement, or random-site autoposting.';
    const trafficMath = swarm.traffic_math || settings.traffic_math || state.outreachTrafficMath || {};
    const arrival = trafficMath.arrival_estimate || {};
    const trafficInstruction = swarm.traffic_instruction || settings.traffic_math_instruction || 'Traffic math is loading into the swarm.';
    const seoGuidelines = swarm.seo_guidelines || settings.seo_guidelines || state.outreachSeoGuidelines || {};
    const seoRules = Array.isArray(seoGuidelines.rules) ? seoGuidelines.rules.slice(0, 4) : [];
    const seoSources = Array.isArray(seoGuidelines.sources) ? seoGuidelines.sources : [];
    return `
      <section class="sr-global-band sr-bot-swarm">
        <div class="sr-bot-swarm-head">
          <div>
            <span>Safe Bot Swarm</span>
            <strong>${esc(swarm.name || 'SupportRD Safe Growth Swarm')}</strong>
            <p>${esc(swarm.strategy || 'Specialist lanes draft, route, and submit through safe public SupportRD pages or permitted outside connectors.')}</p>
          </div>
          <div class="sr-bot-swarm-active">
            <span>Now Working</span>
            <strong>${esc(activeWorker.name || 'Attention Router')}</strong>
            <p>${esc(activeWorker.role || 'Chooses the strongest route and keeps weak attention lanes diverse.')}</p>
            <b>${esc(activeWorker.active_movements || 0)} active moves</b>
          </div>
        </div>
        <div class="sr-bot-swarm-grid">
          ${workers.map(worker=>`
            <article class="${worker.id === activeWorker.id ? 'active' : ''}">
              <span>${esc(worker.lane || 'growth lane')}</span>
              <strong>${esc(worker.name || 'Swarm worker')}</strong>
              <p>${esc(worker.role || 'Builds a SupportRD growth route.')}</p>
              <small>${esc(worker.cadence || 'safe cadence')}</small>
              <b>${worker.can_auto_publish ? 'Auto on permitted lane' : 'Draft / connector only'}</b>
              ${worker.traffic_math_view?.worker_focus ? `<em>${esc(worker.traffic_math_view.worker_focus)}</em>` : ''}
            </article>
          `).join('') || `
            <article class="active">
              <span>growth lane</span>
              <strong>Attention Router</strong>
              <p>Waiting for the backend swarm payload.</p>
              <small>safe cadence</small>
              <b>Draft / connector only</b>
            </article>
          `}
        </div>
        <div class="sr-bot-swarm-traffic">
          <article>
            <span>Swarm Traffic Math</span>
            <strong>${esc(trafficMath.weak_point || 'engagement')} focus</strong>
            <p>${esc(trafficMath.bot_summary || 'Waiting for visitor, product-interest, cart, buyer, and bounce math.')}</p>
          </article>
          <article>
            <span>What The Bots Change</span>
            <strong>${esc(trafficInstruction)}</strong>
            <p>${arrival.ok ? `Visitor ${esc(arrival.visitor_interval_label || 'waiting')} · product interest ${esc(arrival.product_interest_interval_label || 'waiting')} · cart ${esc(arrival.add_to_cart_interval_label || 'waiting')} · buyer ${esc(arrival.conversion_interval_label || 'waiting')}.` : 'The swarm will tighten copy once the Shopify baseline is saved.'}</p>
          </article>
        </div>
        <div class="sr-bot-swarm-traffic sr-bot-swarm-seo">
          <article>
            <span>Google / Microsoft SEO</span>
            <strong>${esc(seoGuidelines.status || settings.seo_guideline_status || 'active')} - ${esc(seoGuidelines.focus || settings.seo_guideline_mode || 'health-hair care')}</strong>
            <p>${esc(seoGuidelines.bot_instruction || settings.seo_instruction || 'People-first search rules are loading into the backend bot.')}</p>
          </article>
          <article>
            <span>Hair Care Claim Guardrail</span>
            <strong>${esc(seoGuidelines.health_hair_claim_boundary || 'Guidance and product education, not medical diagnosis or cure claims.')}</strong>
            <p>${esc(seoRules.length ? seoRules.join(' | ') : 'Helpful content, crawlable links, truthful structured data, no spam, no fake authority.')}</p>
            <small>${esc(seoSources.length ? `${seoSources.length} official search guideline sources loaded` : 'Official source list waiting for refresh')}</small>
          </article>
        </div>
        <div class="sr-bot-swarm-guardrails">
          <b>Public SupportRD purpose: ${esc(ownedPolicy)}</b>
          <b>Auto-click rule: ${esc(settings.auto_click_meaning || autoScope)}</b>
          <b>Outside-site rule: only permitted connected APIs/forms/accounts can receive automatic handoff.</b>
          <b>Account safety: ${esc(antiBan)}</b>
        </div>
      </section>
    `;
  }

  function renderOwnedPostingPanel(state, active){
    const settings = state.outreachSettings || {};
    const owned = state.outreachOwnedStatus || {};
    const enabled = !!(owned.owned_posting_enabled || settings.owned_posting_enabled);
    const mode = owned.posting_mode || settings.posting_mode || 'draft_only';
    const posts = Array.isArray(state.outreachOwnedPosts) ? state.outreachOwnedPosts : [];
    const result = state.outreachOwnedPublishResult || {};
    const currentDraft = fullDraftFor(active);
    const publicUrl = owned.public_url || state.outreachOwnedPublicUrl || result.public_url || 'https://supportrd.com/FAQ';
    return `
      <section class="sr-global-band sr-bot-owned-posting ${enabled ? 'live' : 'locked'}">
        <div class="sr-global-band-head">
          <span>Public Owned Publishing</span>
          <strong>${enabled ? 'SupportRD public auto-approval is live' : 'SupportRD public posting is locked'}</strong>
        </div>
        <div class="sr-bot-owned-grid">
          <article>
            <span>Current Mode</span>
            <strong>${esc(mode)}</strong>
            <p>${esc(owned.auto_approval_scope || settings.auto_approval_scope || 'SupportRD-owned public surfaces only')}</p>
            <small>${esc(owned.external_channel_status || settings.permission_open_scope || 'Outside websites/social channels stay ready until a permitted connected channel exists.')}</small>
            <div class="sr-bot-owned-actions">
              <button type="button" data-owned-publish>${enabled ? 'Publish Current Public Post' : 'Test Publish Setup'}</button>
              <button type="button" data-owned-refresh>Refresh Public Feed</button>
              <a href="${esc(publicUrl)}" target="_blank" rel="noopener">Open Public Feed</a>
              <button type="button" data-owned-token>${outreachOwnerToken() ? 'Update Token' : 'Set Token'}</button>
            </div>
            ${result.status ? `<b class="sr-bot-owned-result ${result.ok ? 'ok' : 'bad'}">${esc(result.status)} · ${esc(result.title || '')}</b>` : ''}
          </article>
          <article>
            <span>Post Being Prepared</span>
            <strong>${esc(active.title || 'SupportRD growth update')}</strong>
            <pre>${esc(currentDraft.slice(0, 900))}</pre>
          </article>
          <article>
            <span>Live Public SupportRD Feed</span>
            <strong>${esc(posts.length)} recent public posts</strong>
            <div class="sr-bot-owned-list">
              ${posts.map(post=>`
                <section>
                  <b>${esc(post.display_name || 'SupportRD')}</b>
                  <p>${esc(post.message || '')}</p>
                  <small>${esc(post.created_at || '')}</small>
                </section>
              `).join('') || '<section><b>No public bot posts yet</b><p>When enabled, the bot can publish approved SupportRD updates into the public FAQ/developer feed.</p></section>'}
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function renderTrafficPingPanel(state){
    const summary = state.trafficSummary || {};
    const shopify = Array.isArray(summary.shopify) ? summary.shopify : [];
    const local = Array.isArray(summary.local) ? summary.local : [];
    const sessionsReport = summary.sessions_report || null;
    const manualSessionsReport = summary.manual_sessions_report || {};
    const five = trafficFive(summary);
    const waveScore = Math.max(0, Math.min(100, Number(summary.wave_score || 0)));
    const jump = summary.traffic_jump || {};
    const arrival = summary.arrival_estimate || manualSessionsReport.arrival_estimate || {};
    const enabled = trafficPingEnabled();
    const pulse = Math.max(0.18, 1.32 - (waveScore / 100) * 1.02).toFixed(2);
    const heartbeat = shopify.find(item=>Number(item.window_minutes) === 5) || {};
    const showSessionsReport = !!sessionsReport || !!manualSessionsReport.ok;
    const reportSessions = Number(sessionsReport?.total_sessions || 0);
    const reportVisitors = Number(sessionsReport?.total_online_store_visitors || 0);
    const reportHeadline = sessionsReport?.configured
      ? (sessionsReport.ok ? `${reportVisitors || reportSessions} visitors` : 'Scope check')
      : 'Admin token';
    const botReturns = Array.isArray(summary.latest_bot_returns) ? summary.latest_bot_returns : [];
    const latestEvents = Array.isArray(summary.latest_events) ? summary.latest_events : [];
    const latestDashboardPings = Array.isArray(summary.latest_dashboard_pings) ? summary.latest_dashboard_pings : [];
    const latestDashboardPing = latestDashboardPings[0] || {};
    const liveUpdatedAt = summary.updated_at || state.trafficUpdatedAt || '';
    const reportUpdatedAt = sessionsReport?.updated_at || manualSessionsReport.updated_at || '';
    const lastPingAt = latestDashboardPing.created_at || state.trafficLastPingAt || '';
    const lastPingStatus = state.trafficLastPingStatus || (latestDashboardPing.created_at ? 'seen' : 'waiting');
    const botMath = state.outreachTrafficMath || state.outreachBotSwarm?.traffic_math || state.outreachSettings?.traffic_math || {};
    const botArrival = botMath.arrival_estimate || {};
    const mathSource = sessionsReport?.ok ? 'Shopify Admin report' : (manualSessionsReport.ok ? 'Manual Shopify report baseline' : 'Waiting for Shopify report baseline');
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
            <p>Live refresh ${esc(formatTrafficAge(liveUpdatedAt))}. Ping button is ${enabled ? 'armed and updating' : 'off'}. Dashboard pings are heartbeat checks only. Real visitors come from Shopify pixel events or campaign links.</p>
          </div>
          <div class="sr-traffic-actions">
            <button class="sr-buy-btn" type="button" data-traffic-ping>${enabled ? 'Ping Armed' : 'Ping Me On Waves'}</button>
            <button class="sr-buy-btn" type="button" data-outreach-run>Push Bot Movement</button>
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
            <span>Ping Heartbeat</span>
            <strong>${esc(heartbeat.dashboard_events || 0)} pings</strong>
            <p>${esc(lastPingStatus)} · last ping ${esc(formatTrafficAge(lastPingAt))}. These keep the live board awake and are separated from real visitor traffic.</p>
          </article>
          <article class="sr-traffic-card ${jump.significant ? 'hot' : ''}">
            <span>Significant Jump</span>
            <strong>${jump.significant ? 'Jump detected' : `${esc(jump.score || 0)} jump score`}</strong>
            <p>${esc(jump.five_minute_visitors || 0)} visitors / ${esc(jump.five_minute_events || 0)} events in 5m · ${esc(jump.visitor_multiplier || 0)}x visitor baseline.</p>
          </article>
          ${showSessionsReport ? `<article class="sr-traffic-card">
            <span>Shopify Sessions Report</span>
            <strong>${esc(reportHeadline)}</strong>
            <p>${sessionsReport?.ok ? `${esc(reportSessions)} sessions from private Shopify Analytics.` : esc(sessionsReport?.message || 'Needs Shopify Admin API read_reports access.')}</p>
          </article>` : ''}
        </div>

        <div class="sr-traffic-live-readout">
          <article class="hero">
            <span>Where This Is Live</span>
            <strong>Globaltracker / Actual Traffic Reader</strong>
            <p>This panel refreshes every ${esc(Math.round(TRAFFIC_FETCH_MS / 1000))} seconds. Live pixel rows, bot-return rows, jump score, and ping heartbeat move automatically.</p>
            <small>Last live pull: ${esc(formatTrafficStamp(liveUpdatedAt))} · ping: ${esc(formatTrafficStamp(lastPingAt))}</small>
          </article>
          <article>
            <span>Report Math Source</span>
            <strong>${esc(mathSource)}</strong>
            <p>${arrival.ok ? `${esc(arrival.visitors || 0)} visitors over ${esc(arrival.window_days || 0)} days = 1 visitor about every ${esc(formatTrafficInterval(arrival.visitor_interval_minutes))}.` : 'Paste/update the Shopify report to refresh the baseline math.'}</p>
            <small>${reportUpdatedAt ? `Report saved ${esc(formatTrafficAge(reportUpdatedAt))}` : 'No saved report timestamp yet'}</small>
          </article>
          <article>
            <span>Bot Math Feed</span>
            <strong>${esc(botMath.weak_point || 'engagement')}</strong>
            <p>${esc(botMath.bot_summary || 'The bot will receive the same visitor/cart/bounce math after the outreach payload refreshes.')}</p>
            <small>${esc(state.outreachSettings?.traffic_math_instruction || state.outreachBotSwarm?.traffic_instruction || 'Bot instruction waiting for refresh.')}</small>
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

        <div class="sr-traffic-forecast">
          <article class="hero">
            <span>Customer Arrival Forecast</span>
            <strong>${arrival.ok ? `1 new visitor about every ${esc(formatTrafficInterval(arrival.visitor_interval_minutes))}` : 'Waiting for Shopify baseline'}</strong>
            <p>${arrival.ok ? `${esc(arrival.visitors || 0)} visitors / ${esc(arrival.sessions || 0)} sessions across ${esc(arrival.window_days || 0)} day report window. This is an average arrival rate, not an exact clock.` : 'Paste or connect Shopify sessions plus conversion/bounce/duration to calculate timing.'}</p>
          </article>
          <article>
            <span>Engaged Visitor Timing</span>
            <strong>${arrival.engaged_sessions ? `about every ${esc(formatTrafficInterval(arrival.engaged_interval_minutes))}` : 'needs bounce rate'}</strong>
            <p>${arrival.engaged_sessions ? `${esc(arrival.engaged_sessions)} non-bounced sessions using ${esc(arrival.bounce_rate_percent)}% bounce rate.` : 'Bounce rate lets the tracker estimate when a visitor is actually staying.'}</p>
          </article>
          <article>
            <span>Product Interest Timing</span>
            <strong>${arrival.product_interest_count ? `about every ${esc(formatTrafficInterval(arrival.product_interest_interval_minutes))}` : 'needs product interest'}</strong>
            <p>${arrival.product_interest_count ? `${esc(arrival.product_interest_count)} product-interest signals in this Shopify window.` : 'Product interest tells the bot when people are inspecting products before cart.'}</p>
          </article>
          <article>
            <span>Cart Intent Timing</span>
            <strong>${arrival.expected_add_to_carts ? `about every ${esc(formatTrafficInterval(Number(arrival.add_to_cart_interval_hours || 0) * 60))}` : 'needs cart rate'}</strong>
            <p>${arrival.expected_add_to_carts ? `${esc(arrival.expected_add_to_carts)} expected add-to-cart signals at ${esc(arrival.added_to_cart_rate_percent)}%.` : 'Added-to-cart rate catches serious product intent before checkout.'}</p>
          </article>
          <article>
            <span>Buyer Timing</span>
            <strong>${arrival.expected_conversions ? `about every ${esc(formatTrafficInterval(Number(arrival.conversion_interval_hours || 0) * 60))}` : 'needs conversion rate'}</strong>
            <p>${arrival.expected_conversions ? `${esc(arrival.expected_conversions)} expected buyers/orders at ${esc(arrival.conversion_rate_percent)}% conversion.` : 'Conversion rate turns visitors into a rough customer/order clock.'}</p>
          </article>
          <article>
            <span>Live Jump Guard</span>
            <strong>${jump.significant ? 'Spike mode' : 'steady mode'}</strong>
            <p>${esc(jump.message || 'The newest 5 minutes are compared against 15m and 60m baselines.')}</p>
          </article>
        </div>

        ${showSessionsReport ? renderShopifySessionsReport(sessionsReport, manualSessionsReport) : ''}

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

  function renderVisitorBlockerDiagnosis(state){
    const summary = state.trafficSummary || {};
    const movements = Array.isArray(state.outreachMovements) ? state.outreachMovements : [];
    const settings = state.outreachSettings || {};
    const botReturns = Number(summary.bot_return_total || 0);
    const oneDay = (summary.shopify || []).find(row=>Number(row.window_minutes) === 1440) || {};
    const latestEvents = Array.isArray(summary.latest_events) ? summary.latest_events : [];
    const queued = movements.filter(item=>String(item.status || 'queued') === 'queued').length;
    const ownedPosting = Boolean(settings.owned_posting_enabled);
    const draftOnly = settings.posting_mode === 'draft_only' || settings.draft_mode_only !== false;
    const blockers = [
      {
        label:'No bot-return clicks',
        value:botReturns,
        status:botReturns > 0 ? 'ok' : 'blocked',
        detail:botReturns > 0 ? 'At least one campaign link came back.' : 'No visitor has landed with sr_bot / bot campaign tracking yet.'
      },
      {
        label:'Draft-only mode',
        value:draftOnly ? 'on' : 'off',
        status:draftOnly ? 'blocked' : 'ok',
        detail:draftOnly ? 'The bot is creating drafts and queueing them, but not distributing them.' : 'Owned posting mode is allowed for SupportRD-owned surfaces.'
      },
      {
        label:'Owned posting',
        value:ownedPosting ? 'enabled' : 'off',
        status:ownedPosting ? 'ok' : 'blocked',
        detail:ownedPosting ? 'SupportRD-owned public surfaces can receive approved public posts.' : 'Even owned SupportRD surfaces are not auto-publishing right now.'
      },
      {
        label:'Queued movement',
        value:queued,
        status:queued ? 'watch' : 'blocked',
        detail:queued ? 'The bot has material, but the material is waiting in queue.' : 'No queued movements are available.'
      }
    ];
    const diagnosis = botReturns > 0
      ? 'Visitors are starting to return from tracked bot links. Next issue is conversion.'
      : queued > 0
        ? 'The bot is producing high-score drafts, but the drafts are not getting placed where people can click.'
        : 'The bot needs fresh movement before it can generate tracked visitors.';
    const botVoice = botReturns > 0
      ? `I brought ${botReturns} tracked visitor${botReturns === 1 ? '' : 's'} back through a bot link. Now I need to tighten the page they landed on and push them toward hair help, product interest, account signup, or checkout.`
      : queued > 0 && draftOnly
        ? `I have ${queued} strong drafts ready, but I am still boxed into draft-only mode. I am preparing the routes, the words, and the tracking links, but nobody can click them until they are published, manually posted, or sent through a permitted channel.`
        : queued > 0
          ? `I have ${queued} moves queued. My weak spot is not copy quality right now; it is distribution. Give me a public SupportRD surface or permitted connected channel and I can turn these drafts into real tracked visits.`
          : 'I do not have enough fresh movements yet. Push a new wave, then I can build tracked routes and measure who comes back.';
    return `
      <section class="sr-global-band sr-visitor-diagnosis">
        <div class="sr-global-band-head">
          <span>Why No Visitors Yet</span>
          <strong>${esc(diagnosis)}</strong>
        </div>
        <div class="sr-bot-says">
          <span>Bot says</span>
          <p>${esc(botVoice)}</p>
        </div>
        <div class="sr-visitor-diagnosis-grid">
          ${blockers.map(item=>`
            <article class="${esc(item.status)}">
              <span>${esc(item.label)}</span>
              <strong>${esc(item.value)}</strong>
              <p>${esc(item.detail)}</p>
            </article>
          `).join('')}
        </div>
        <div class="sr-visitor-fix-route">
          <div>
            <span>What The Bot Is Doing Wrong</span>
            <strong>It is scoring and drafting, not creating real exposure.</strong>
            <p>Attention Core 100 means the copy is relevant. It does not mean people saw it. Real visitors only happen after a tracked link is posted, shared, submitted, emailed with permission, or published on a SupportRD-owned public surface.</p>
          </div>
          <ol>
            <li>Publish the best owned drafts to SupportRD-owned public surfaces first: FAQ Lounge, Growth Hub, hair-problems, and product help pages.</li>
            <li>Use the tracking links already generated in each movement before posting anywhere manually.</li>
            <li>Connect one permitted external channel at a time instead of letting drafts pile up.</li>
            <li>Watch for <code>sr_bot=1</code> in Bot Returns; that is the first proof the bot brought somebody back.</li>
          </ol>
        </div>
        <div class="sr-visitor-last-signal">
          <b>Last 24h reader: ${esc(Number(oneDay.visitors || 0))} visitor / ${esc(Number(oneDay.events || 0))} event</b>
          <small>${latestEvents.length ? esc(`${latestEvents[0].event_name || 'event'} on ${latestEvents[0].path || '/'}`) : 'No latest traffic event yet.'}</small>
        </div>
      </section>
    `;
  }

  function readCommerceRankState(){
    try { return JSON.parse(localStorage.getItem('srCommerceRankState') || '{}'); }
    catch { return {}; }
  }

  function renderMoneyIntentReading(state, active){
    const commerce = readCommerceRankState();
    const routes = commerce.moneyRoutes || {};
    const history = Array.isArray(commerce.moneyRouteHistory) ? commerce.moneyRouteHistory.slice(0, 8) : [];
    const summary = state.trafficSummary || {};
    const money = Number(commerce.makingMoney || 0);
    const routeRows = [
      ['visitor', 'Human Visitor', 'Real visible site movement.'],
      ['search', 'Search / SEO Entry', 'Hair-problem and search-entry movement.'],
      ['catalog', 'Catalog Browsing', 'Product catalog interest before checkout.'],
      ['checkout', 'Checkout Intent', 'Cart, buy, and checkout starts.'],
      ['premium', 'Premium / Pro Interest', 'Premium, Professional, upgrade, and account tier movement.'],
      ['studio', 'Studio Jake Interest', 'Studio, FX, export, and Jake movement.'],
      ['profileScanner', 'Hair Scanner / Profile', 'Hair analysis, scanner, profile, and issue movement.'],
      ['diaryLive', 'Diary Live', 'Live/backlink and paid stream movement.'],
      ['botOutreach', 'Bot Outreach Route', 'Globaltracker, story, family, college, career, and comment route movement.'],
      ['repeatAccount', 'Repeat Account', 'Returning account and saved identity movement.'],
      ['marketFinancial', 'Financial / Market', 'Financial reader and Lasersmarket movement.'],
      ['confirmedMoney', 'Confirmed Money', 'Paid order, webhook, or verified purchase confirmation.']
    ];
    const tracked = routeRows.reduce((sum, [key])=>sum + Number(routes[key] || 0), 0);
    const legacy = Math.max(0, money - tracked);
    const botReturns = Number(summary.bot_return_total || 0);
    const oneDay = (summary.shopify || []).find(row=>Number(row.window_minutes) === 1440) || {};
    const activeSite = websiteTargetFor(active);
    const topRoute = routeRows
      .map(([key, label, hint])=>({ key, label, hint, value:Number(routes[key] || 0) }))
      .sort((a,b)=>b.value-a.value)[0] || { label:'No routed source yet', hint:'Waiting for commercial-intent movement.', value:0 };
    return `
      <section class="sr-global-band sr-money-live-reading">
        <div class="sr-global-band-head">
          <span>#1 Making Money Updated Reading</span>
          <strong>${esc(money)} Commercial Intent Momentum</strong>
        </div>
        <div class="sr-money-live-grid">
          <article class="hero">
            <span>What This Number Is</span>
            <strong>Commercial Intent Momentum</strong>
            <p>This is an internal SupportRD intent score stored in the browser rank memory. It rises when the site sees buyer-like movement: product routes, checkout intent, premium/pro interest, Studio Jake interest, hair scanner/profile movement, bot outreach routing, repeat accounts, market routes, and confirmed purchases.</p>
          </article>
          <article>
            <span>Source Of The Climb</span>
            <strong>${esc(topRoute.label)} · ${esc(topRoute.value)}</strong>
            <p>${esc(topRoute.hint)} The steady climb usually means SupportRD is repeatedly detecting money-related paths, not that this exact number is live visitor count.</p>
          </article>
          <article>
            <span>People Proof</span>
            <strong>${esc(botReturns)} bot returns</strong>
            <p>${esc(Number(oneDay.visitors || 0))} visitor / ${esc(Number(oneDay.events || 0))} event in the 24 hour traffic reader. This is the real proof lane; the money score by itself is intent momentum, not a guaranteed person.</p>
          </article>
          <article>
            <span>Active Route Feeding It</span>
            <strong>${esc(activeSite.domain || activeSite.label || 'supportRD route')}</strong>
            <p>${esc(active.title || active.category || 'Current backend bot movement')} is currently being used as the bot outreach source.</p>
          </article>
        </div>
        <div class="sr-money-live-routes">
          ${routeRows.map(([key, label, hint])=>`
            <article class="${Number(routes[key] || 0) > 0 ? 'active' : ''}">
              <span>${esc(label)}</span>
              <strong>${esc(Number(routes[key] || 0))}</strong>
              <p>${esc(hint)}</p>
            </article>
          `).join('')}
          <article class="${legacy > 0 ? 'active legacy' : 'legacy'}">
            <span>Legacy Mixed</span>
            <strong>${esc(legacy)}</strong>
            <p>Older blended climb before exact routing was added.</p>
          </article>
        </div>
        <div class="sr-money-live-history">
          <span>Latest Score Movements</span>
          ${history.map(item=>`<b>${esc(item.label || item.route || 'route')} <em>+${esc(item.amount || 0)} · ${esc(item.source || 'source')}</em></b>`).join('') || '<b>No route history yet <em>waiting</em></b>'}
        </div>
      </section>
    `;
  }

  function renderBotOnlyMarkup(){
    const state = read();
    const active = currentMovement(state);
    return `
      <section class="sr-global-tracker sr-bot-console" data-panel="globaltracker" data-outreach-movements>
        ${renderTrafficPingPanel(state)}

        ${renderBotSwarmPanel(state, active)}

        ${renderOwnedPostingPanel(state, active)}

        ${renderWebsiteEntryBoard(state, active)}

        ${renderLiveMessageBuilder(state, active)}

        ${renderAttentionDiagram(state, active)}

        ${renderMoneyIntentReading(state, active)}
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
      .sr-money-live-reading{border-color:rgba(255,210,122,.24);background:radial-gradient(circle at 6% 6%,rgba(255,210,122,.15),transparent 18rem),linear-gradient(135deg,rgba(4,10,22,.96),rgba(23,19,8,.88))}
      .sr-money-live-grid{display:grid;grid-template-columns:1.15fr repeat(3,minmax(0,.85fr));gap:.7rem;margin-bottom:.75rem}
      .sr-money-live-grid article,.sr-money-live-routes article{padding:.75rem;border:1px solid rgba(255,255,255,.1);border-radius:.85rem;background:rgba(255,255,255,.045)}
      .sr-money-live-grid article.hero{border-color:rgba(255,210,122,.25);background:rgba(255,210,122,.08)}
      .sr-money-live-grid span,.sr-money-live-routes span,.sr-money-live-history span{display:block;color:#ffdf8d;font-size:.7rem;font-weight:1000;text-transform:uppercase;letter-spacing:.06em}
      .sr-money-live-grid strong{display:block;margin:.25rem 0;color:#fff;font-size:1.28rem;line-height:1.08}
      .sr-money-live-grid p,.sr-money-live-routes p{color:rgba(247,251,255,.72);line-height:1.36}
      .sr-money-live-routes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.45rem}
      .sr-money-live-routes article.active{border-color:rgba(154,254,143,.28);background:rgba(154,254,143,.08)}
      .sr-money-live-routes article.legacy{border-color:rgba(97,239,255,.14)}
      .sr-money-live-routes strong{display:block;margin:.18rem 0;color:#fff;font-size:1.05rem}
      .sr-money-live-history{margin-top:.75rem;padding:.7rem;border-radius:.85rem;border:1px solid rgba(255,210,122,.16);background:rgba(0,0,0,.2)}
      .sr-money-live-history b{display:flex;justify-content:space-between;gap:.5rem;margin-top:.35rem;padding:.45rem .55rem;border-radius:.55rem;background:rgba(255,255,255,.045);color:#fff;font-size:.78rem}
      .sr-money-live-history em{color:#9ff9ff;font-style:normal}
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
      .sr-traffic-card.hot{border-color:rgba(255,210,122,.38);background:linear-gradient(135deg,rgba(255,210,122,.13),rgba(255,77,92,.08))}
      .sr-traffic-card span,.sr-traffic-paths span{display:block;color:#61efff;font-size:.68rem;font-weight:1000;text-transform:uppercase}
      .sr-traffic-card strong{display:block;margin:.3rem 0;color:#fff;font-size:1.32rem}
      .sr-traffic-card p{color:rgba(247,251,255,.72);line-height:1.34}
      .sr-traffic-live-readout{display:grid;grid-template-columns:1.08fr 1fr 1.25fr;gap:.65rem;margin-top:.75rem}
      .sr-traffic-live-readout article{padding:.82rem;border-radius:.9rem;border:1px solid rgba(97,239,255,.16);background:linear-gradient(135deg,rgba(97,239,255,.08),rgba(255,255,255,.035))}
      .sr-traffic-live-readout article.hero{border-color:rgba(154,254,143,.3);background:linear-gradient(135deg,rgba(154,254,143,.12),rgba(97,239,255,.06))}
      .sr-traffic-live-readout span{display:block;color:#ffcf74;font-size:.68rem;font-weight:1000;text-transform:uppercase}
      .sr-traffic-live-readout strong{display:block;margin:.24rem 0;color:#fff;font-size:1.08rem}
      .sr-traffic-live-readout p{color:rgba(247,251,255,.74);line-height:1.34}
      .sr-traffic-live-readout small{display:block;margin-top:.45rem;color:#9afe8f;font-weight:900;line-height:1.32}
      .sr-traffic-presentation{display:grid;grid-template-columns:1.2fr .9fr .9fr;gap:.65rem;margin-top:.75rem}
      .sr-traffic-forecast{display:grid;grid-template-columns:1.2fr repeat(5,minmax(0,.82fr));gap:.65rem;margin-top:.75rem}
      .sr-traffic-forecast article{min-height:7.7rem;padding:.78rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22)}
      .sr-traffic-forecast article.hero{border-color:rgba(154,254,143,.28);background:linear-gradient(135deg,rgba(154,254,143,.12),rgba(97,239,255,.07))}
      .sr-traffic-forecast span{display:block;color:#9afe8f;font-size:.68rem;font-weight:1000;text-transform:uppercase}
      .sr-traffic-forecast strong{display:block;margin:.25rem 0;color:#fff;font-size:1.2rem;line-height:1.08}
      .sr-traffic-forecast p{color:rgba(247,251,255,.72);line-height:1.34}
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
      .sr-visitor-diagnosis{border-color:rgba(255,210,122,.24);background:linear-gradient(135deg,rgba(255,210,122,.09),rgba(5,12,25,.92))}
      .sr-bot-says{margin:.75rem 0;padding:.85rem 1rem;border-radius:.95rem;border:1px solid rgba(154,254,143,.28);background:linear-gradient(135deg,rgba(154,254,143,.13),rgba(97,239,255,.07));box-shadow:inset 0 0 28px rgba(154,254,143,.05)}
      .sr-bot-says span{display:block;color:#9afe8f;font-size:.72rem;font-weight:1000;text-transform:uppercase;letter-spacing:.1em}
      .sr-bot-says p{margin:.35rem 0 0;color:#f7fbff;font-size:1.02rem;line-height:1.42;font-weight:800}
      .sr-visitor-diagnosis-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55rem}
      .sr-visitor-diagnosis-grid article{padding:.75rem;border-radius:.82rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22)}
      .sr-visitor-diagnosis-grid article.blocked{border-color:rgba(255,110,110,.32);background:rgba(255,80,80,.08)}
      .sr-visitor-diagnosis-grid article.ok{border-color:rgba(154,254,143,.3);background:rgba(154,254,143,.08)}
      .sr-visitor-diagnosis-grid article.watch{border-color:rgba(255,210,122,.28);background:rgba(255,210,122,.07)}
      .sr-visitor-diagnosis-grid span{display:block;color:#ffcf74;font-size:.68rem;font-weight:1000;text-transform:uppercase}
      .sr-visitor-diagnosis-grid strong{display:block;margin:.25rem 0;color:#fff;font-size:1.35rem;line-height:1}
      .sr-visitor-diagnosis-grid p{color:rgba(247,251,255,.72);font-size:.76rem;line-height:1.3}
      .sr-visitor-fix-route{display:grid;grid-template-columns:minmax(14rem,.45fr) minmax(0,1fr);gap:.75rem;margin-top:.75rem;padding:.85rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045)}
      .sr-visitor-fix-route span{color:#61efff;font-size:.7rem;font-weight:1000;text-transform:uppercase}
      .sr-visitor-fix-route strong{display:block;margin:.2rem 0;color:#fff;font-size:1.06rem}
      .sr-visitor-fix-route p,.sr-visitor-fix-route li{color:rgba(247,251,255,.73);line-height:1.35}
      .sr-visitor-fix-route ol{margin:.1rem 0 0;padding-left:1.2rem}
      .sr-visitor-fix-route code{color:#9afe8f}
      .sr-visitor-last-signal{display:flex;justify-content:space-between;gap:.75rem;margin-top:.65rem;padding:.58rem .7rem;border-radius:.72rem;background:rgba(0,0,0,.2);color:#dffbff}
      .sr-visitor-last-signal small{color:rgba(247,251,255,.68)}
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
      .sr-bot-attention-detail-board{margin-top:.85rem;padding:.85rem;border-radius:.95rem;border:1px solid rgba(97,239,255,.2);background:linear-gradient(135deg,rgba(97,239,255,.08),rgba(0,0,0,.18));box-shadow:inset 0 0 30px rgba(97,239,255,.04)}
      .sr-bot-attention-detail-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(10rem,.28fr);gap:.75rem;align-items:start}
      .sr-bot-attention-detail-head span{color:#61efff;font-size:.7rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-attention-detail-head strong{display:block;margin:.18rem 0;color:#fff;font-size:1.12rem}
      .sr-bot-attention-detail-head p{color:rgba(247,251,255,.72);line-height:1.35}
      .sr-bot-attention-detail-head b{display:block;padding:.55rem .65rem;border-radius:.72rem;background:#9afe8f;color:#07101d;text-transform:capitalize;text-align:center;font-size:.8rem}
      .sr-bot-attention-detail-head small{display:block;margin-top:.35rem;color:#dffbff;text-align:center;line-height:1.25}
      .sr-bot-attention-route-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.45rem;margin-top:.7rem;max-height:18rem;overflow:auto;padding-right:.12rem}
      .sr-bot-attention-route-grid article{min-height:7.1rem;padding:.58rem;border-radius:.72rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045)}
      .sr-bot-attention-route-grid article.negative{border-color:rgba(255,155,120,.22);background:rgba(255,155,120,.08)}
      .sr-bot-attention-route-grid span{display:block;color:#61efff;font-size:.62rem;font-weight:1000;text-transform:uppercase;line-height:1.15}
      .sr-bot-attention-route-grid strong{display:block;margin:.2rem 0;color:#fff;font-size:1.05rem}
      .sr-bot-attention-route-grid p{color:rgba(247,251,255,.68);font-size:.7rem;line-height:1.25}
      .sr-bot-attention-proof-strip{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.7rem}
      .sr-bot-attention-proof-strip b{padding:.4rem .55rem;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2);color:#fff;font-size:.72rem}
      .sr-bot-attention-proof-strip em{color:#9afe8f;font-style:normal}
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
      .sr-bot-swarm{position:relative;overflow:hidden;border-color:rgba(154,254,143,.26);background:linear-gradient(135deg,rgba(5,13,25,.96),rgba(10,27,34,.9));box-shadow:0 24px 70px rgba(0,0,0,.26)}
      .sr-bot-swarm:before{content:"";position:absolute;left:-20%;right:-20%;top:0;height:2px;background:linear-gradient(90deg,transparent,#9afe8f,#61efff,#ffd27a,transparent);animation:srBotRail 2.6s linear infinite}
      .sr-bot-swarm-head{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(18rem,.42fr);gap:.85rem;align-items:stretch}
      .sr-bot-swarm-head span,.sr-bot-swarm-grid span{display:block;color:#9afe8f;font-size:.7rem;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}
      .sr-bot-swarm-head strong{display:block;margin:.22rem 0;color:#fff;font-size:1.35rem;line-height:1.05}
      .sr-bot-swarm-head p,.sr-bot-swarm-grid p{color:rgba(247,251,255,.74);line-height:1.36}
      .sr-bot-swarm-active{padding:.78rem;border-radius:.82rem;border:1px solid rgba(154,254,143,.24);background:rgba(154,254,143,.08)}
      .sr-bot-swarm-active b{display:inline-flex;margin-top:.45rem;padding:.38rem .55rem;border-radius:999px;background:#9afe8f;color:#07101d;font-size:.72rem}
      .sr-bot-swarm-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5rem;margin-top:.75rem}
      .sr-bot-swarm-grid article{min-height:9.6rem;padding:.68rem;border-radius:.78rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045)}
      .sr-bot-swarm-grid article.active{border-color:rgba(154,254,143,.44);background:linear-gradient(135deg,rgba(154,254,143,.15),rgba(97,239,255,.08));box-shadow:0 12px 28px rgba(0,0,0,.18)}
      .sr-bot-swarm-grid strong{display:block;margin:.18rem 0;color:#fff;font-size:.95rem;line-height:1.06}
      .sr-bot-swarm-grid small{display:block;margin:.35rem 0;color:#dffbff;font-size:.68rem;line-height:1.2}
      .sr-bot-swarm-grid b{display:inline-flex;padding:.34rem .5rem;border-radius:999px;border:1px solid rgba(97,239,255,.2);background:rgba(97,239,255,.08);color:#dffbff;font-size:.64rem}
      .sr-bot-swarm-grid em{display:block;margin-top:.45rem;color:#9afe8f;font-style:normal;font-size:.68rem;line-height:1.25}
      .sr-bot-swarm-traffic{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1.2fr;gap:.52rem;margin-top:.72rem}
      .sr-bot-swarm-traffic article{padding:.72rem;border-radius:.78rem;border:1px solid rgba(97,239,255,.18);background:rgba(97,239,255,.055)}
      .sr-bot-swarm-traffic span{display:block;color:#61efff;font-size:.68rem;font-weight:1000;text-transform:uppercase}
      .sr-bot-swarm-traffic strong{display:block;margin:.2rem 0;color:#fff;font-size:.94rem;line-height:1.16}
      .sr-bot-swarm-traffic p{color:rgba(247,251,255,.72);line-height:1.32}
      .sr-bot-swarm-guardrails{position:relative;z-index:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;margin-top:.72rem}
      .sr-bot-swarm-guardrails b{padding:.55rem .65rem;border-radius:.68rem;border:1px solid rgba(255,210,122,.18);background:rgba(255,210,122,.07);color:#ffefb3;font-size:.72rem;line-height:1.28}
      .sr-bot-owned-posting{position:relative;overflow:hidden;border-color:rgba(97,239,255,.22);background:linear-gradient(135deg,rgba(5,12,25,.96),rgba(9,24,33,.9))}
      .sr-bot-owned-posting.live{border-color:rgba(154,254,143,.34);box-shadow:0 0 0 1px rgba(154,254,143,.08),0 24px 70px rgba(0,0,0,.26)}
      .sr-bot-owned-posting:before{content:"";position:absolute;left:-20%;right:-20%;top:0;height:2px;background:linear-gradient(90deg,transparent,#61efff,#9afe8f,transparent);animation:srBotRail 2.4s linear infinite}
      .sr-bot-owned-grid{position:relative;z-index:1;display:grid;grid-template-columns:minmax(15rem,.8fr) minmax(0,1.05fr) minmax(16rem,.9fr);gap:.75rem}
      .sr-bot-owned-grid article{padding:.82rem;border-radius:.82rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.25);min-width:0}
      .sr-bot-owned-grid span{display:block;color:#61efff;font-size:.72rem;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}
      .sr-bot-owned-grid strong{display:block;margin:.3rem 0;color:#fff;font-size:1.15rem;line-height:1.05}
      .sr-bot-owned-grid p,.sr-bot-owned-grid small{color:rgba(247,251,255,.72);line-height:1.35}
      .sr-bot-owned-grid pre{max-height:17rem;overflow:auto;margin:.6rem 0 0;padding:.7rem;border-radius:.68rem;border:1px solid rgba(97,239,255,.16);background:rgba(0,0,0,.4);color:#dffbff;font:800 .78rem/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}
      .sr-bot-owned-actions{display:flex;flex-wrap:wrap;gap:.45rem;margin:.7rem 0}
      .sr-bot-owned-actions button,.sr-bot-owned-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:2.25rem;padding:.48rem .68rem;border-radius:.62rem;border:1px solid rgba(97,239,255,.22);background:rgba(97,239,255,.12);color:#dffbff;font-weight:1000;cursor:pointer;text-decoration:none}
      .sr-bot-owned-actions button:first-child{background:#9afe8f;color:#07101d;border-color:#9afe8f}
      .sr-bot-owned-result{display:block;margin-top:.55rem;padding:.5rem .62rem;border-radius:.62rem;border:1px solid rgba(255,255,255,.12);font-size:.72rem;line-height:1.25}
      .sr-bot-owned-result.ok{color:#eaffdf;background:rgba(154,254,143,.12);border-color:rgba(154,254,143,.3)}
      .sr-bot-owned-result.bad{color:#ffd6d6;background:rgba(255,90,90,.12);border-color:rgba(255,90,90,.28)}
      .sr-bot-owned-list{display:grid;gap:.45rem;max-height:19rem;overflow:auto;padding-right:.1rem}
      .sr-bot-owned-list section{padding:.55rem;border-radius:.62rem;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045)}
      .sr-bot-owned-list b{display:block;color:#fff;font-size:.78rem}
      .sr-bot-owned-list p{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;margin:.25rem 0;color:rgba(247,251,255,.75);font-size:.75rem}
      .sr-connect-submit-rail{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:.55rem;align-items:center;margin:.65rem 0 .8rem;padding:.7rem;border-radius:.85rem;border:1px solid rgba(154,254,143,.22);background:linear-gradient(135deg,rgba(154,254,143,.1),rgba(97,239,255,.06))}
      .sr-connect-submit-rail span{display:block;color:#9afe8f;font-size:.68rem;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}
      .sr-connect-submit-rail strong{display:block;margin:.16rem 0;color:#fff;font-size:1rem;line-height:1.08}
      .sr-connect-submit-rail p,.sr-connect-submit-rail small{color:rgba(247,251,255,.72);line-height:1.32}
      .sr-connect-submit-rail button{min-height:2.35rem;padding:.5rem .75rem;border-radius:.65rem;border:1px solid rgba(97,239,255,.24);background:rgba(97,239,255,.13);color:#dffbff;font-weight:1000;cursor:pointer;white-space:nowrap}
      .sr-connect-submit-rail button:first-of-type{background:#9afe8f;color:#07101d;border-color:#9afe8f}
      .sr-connect-submit-rail button.active{background:linear-gradient(135deg,#9afe8f,#61efff);color:#07101d;border-color:#9afe8f;box-shadow:0 0 0 1px rgba(154,254,143,.22),0 0 22px rgba(154,254,143,.38);animation:srAutoApprovePulse 1.15s ease-in-out infinite}
      .sr-connect-submit-rail .sr-auto-approve-status{grid-column:1/-1;display:block;padding:.48rem .6rem;border-radius:.62rem;border:1px solid rgba(154,254,143,.18);background:rgba(154,254,143,.08);color:#dffbff;font-weight:900}
      @keyframes srAutoApprovePulse{50%{filter:brightness(1.12);transform:translateY(-1px);box-shadow:0 0 0 1px rgba(154,254,143,.32),0 0 34px rgba(154,254,143,.5)}}
      .sr-connect-submit-rail>b{display:block;padding:.48rem .58rem;border-radius:.62rem;border:1px solid rgba(255,255,255,.12);font-size:.7rem;line-height:1.2;text-transform:uppercase;letter-spacing:.04em}
      .sr-connect-submit-rail>b.ok{color:#eaffdf;background:rgba(154,254,143,.12);border-color:rgba(154,254,143,.3)}
      .sr-connect-submit-rail>b.warn{color:#ffe4a6;background:rgba(255,210,122,.1);border-color:rgba(255,210,122,.26)}
      .sr-bot-queue .sr-global-grid{max-height:32rem;overflow:auto;padding-right:.15rem}
      .sr-bot-queue small{display:block;margin-top:.5rem;color:#9ff9ff;line-height:1.35}
      @media(max-width:1120px){.sr-bot-live-grid,.sr-bot-owned-grid,.sr-bot-swarm-head,.sr-bot-swarm-traffic,.sr-bot-exec-main,.sr-bot-builder-grid,.sr-bot-placement,.sr-bot-attention-map,.sr-bot-diversify-board,.sr-bot-attention-detail-head,.sr-visitor-fix-route,.sr-traffic-head,.sr-traffic-grid,.sr-traffic-live-readout,.sr-traffic-presentation,.sr-traffic-forecast,.sr-traffic-report,.sr-traffic-manual,.sr-bot-site-live,.sr-money-live-grid,.sr-connect-submit-rail{grid-template-columns:1fr}.sr-traffic-actions{justify-content:flex-start}.sr-bot-builder-head{display:grid}.sr-bot-builder-meter{justify-items:start}.sr-bot-orbit{margin:auto}.sr-bot-live-frame{height:22rem}.sr-bot-pipeline{grid-template-columns:repeat(2,minmax(0,1fr))}.sr-bot-phase-rail,.sr-bot-placement-grid,.sr-bot-attention-spokes,.sr-bot-diversify-targets,.sr-traffic-feed,.sr-bot-site-grid,.sr-bot-attention-route-grid,.sr-visitor-diagnosis-grid,.sr-money-live-routes,.sr-bot-swarm-grid,.sr-bot-swarm-guardrails{grid-template-columns:repeat(2,minmax(0,1fr))}.sr-traffic-windows{grid-template-columns:repeat(3,minmax(0,1fr))}.sr-traffic-report-chart{grid-template-columns:repeat(4,minmax(0,1fr))}}
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
      if (event.target.closest('[data-owned-publish]')) {
        event.preventDefault();
        publishOwnedPost();
      }
      if (event.target.closest('[data-owned-refresh]')) {
        event.preventDefault();
        refreshOwnedPosts();
      }
      if (event.target.closest('[data-owned-token]')) {
        event.preventDefault();
        saveOutreachOwnerToken();
        refreshOwnedPosts();
      }
      if (event.target.closest('[data-connected-submit]')) {
        event.preventDefault();
        submitThroughConnectedAPI();
      }
      if (event.target.closest('[data-connected-auto-approve]')) {
        event.preventDefault();
        toggleAutoApprove();
      }
      if (event.target.closest('[data-connected-refresh]')) {
        event.preventDefault();
        refreshConnectedSubmitStatus();
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
    refreshOwnedPosts();
    refreshConnectedSubmitStatus();
    refreshTrafficSummary(trafficPingEnabled());
    if (root.__globalSweepTimer) clearInterval(root.__globalSweepTimer);
    root.__globalSweepTimer = setInterval(loadGlobalSweep, SWEEP_MS);
    if (root.__globalBotLiveTimer) clearInterval(root.__globalBotLiveTimer);
    root.__globalBotLiveTimer = setInterval(liveBotStep, BOT_LIVE_MS);
    if (root.__globalBotPhaseTimer) clearInterval(root.__globalBotPhaseTimer);
    root.__globalBotPhaseTimer = setInterval(liveBotPhaseStep, BOT_PHASE_MS);
    if (root.__globalBotFetchTimer) clearInterval(root.__globalBotFetchTimer);
    root.__globalBotFetchTimer = setInterval(()=>refreshOutreachMovements(false), BOT_FETCH_MS);
    if (root.__globalOwnedPostsTimer) clearInterval(root.__globalOwnedPostsTimer);
    root.__globalOwnedPostsTimer = setInterval(refreshOwnedPosts, BOT_FETCH_MS);
    if (root.__globalConnectStatusTimer) clearInterval(root.__globalConnectStatusTimer);
    root.__globalConnectStatusTimer = setInterval(refreshConnectedSubmitStatus, BOT_FETCH_MS);
    if (root.__globalAutoApproveTimer) clearInterval(root.__globalAutoApproveTimer);
    root.__globalAutoApproveTimer = setInterval(runAutoApproveTick, OUTREACH_AUTO_APPROVE_MS);
    if (autoApproveEnabled()) setTimeout(()=>runAutoApproveTick(), 1500);
    if (root.__globalTrafficTimer) clearInterval(root.__globalTrafficTimer);
    root.__globalTrafficTimer = setInterval(()=>refreshTrafficSummary(trafficPingEnabled()), TRAFFIC_FETCH_MS);
  }

  root.runGlobalSweep = runGlobalSweep;
  root.refreshGlobalSweepOpportunities = refreshOpportunities;
  root.refreshOutreachMovements = refreshOutreachMovements;
  root.refreshOwnedPosts = refreshOwnedPosts;
  root.publishOwnedPost = publishOwnedPost;
  root.refreshConnectedSubmitStatus = refreshConnectedSubmitStatus;
  root.submitThroughConnectedAPI = submitThroughConnectedAPI;
  root.runOutreachAutoApproveTick = runAutoApproveTick;
  root.toggleOutreachAutoApprove = toggleAutoApprove;
  root.refreshTrafficSummary = refreshTrafficSummary;
  root.initGlobalSweep = initGlobalSweep;
})();
