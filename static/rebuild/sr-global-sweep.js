(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const STORE_KEY = 'srGlobalSweepV1';
  const SWEEP_MS = 10 * 60 * 1000;
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
          personal,
          shopify,
          score: exact.length,
          at: new Date().toISOString()
        });
      });
    });
    return matches.sort((a,b)=>b.score-a.score).slice(0,100);
  }

  async function runGlobalSweep(){
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
      matches
    };
    write(next);
    try { root.bumpCommerceRank?.('makingMoney', matches.length || 1); } catch {}
    try {
      if (document.querySelector('[data-panel="globaltracker"]')) root.renderFunctionalPanel?.('globaltracker');
    } catch {}
    return next;
  }

  function renderSweepMarkup(){
    const state = read();
    const matches = Array.isArray(state.matches) ? state.matches : [];
    return `
      <section class="sr-global-band" data-global-sweep-panel>
        <div class="sr-global-band-head">
          <span>10 Minute Exact-Match Sweep</span>
          <strong>${esc(state.matchCount || 0)} exact matches</strong>
        </div>
        <p class="sr-global-note">Runs every 10 minutes while the app is open. For true server-side background sweeps, add matching Flask/API endpoints and a Render cron/background worker.</p>
        <div class="sr-global-grid compact">
          <article class="sr-global-card"><span>Personal tracker</span><strong>${esc(state.personalCount || 0)}</strong><p>${esc(state.personalSource || 'waiting')}</p></article>
          <article class="sr-global-card"><span>Shopify tracker</span><strong>${esc(state.shopifyCount || 0)}</strong><p>${esc(state.shopifySource || 'waiting')}</p></article>
          <article class="sr-global-card"><span>Last run</span><strong>${state.lastRun ? new Date(state.lastRun).toLocaleTimeString() : 'Not yet'}</strong><p>${state.lastRun ? new Date(state.lastRun).toLocaleDateString() : 'Sweep waiting.'}</p></article>
          <article class="sr-global-card"><span>Next run</span><strong>${state.nextRun ? new Date(state.nextRun).toLocaleTimeString() : 'After load'}</strong><p>Interval: 10 minutes</p></article>
        </div>
        <div class="sr-global-actions"><button class="sr-buy-btn" type="button" data-global-sweep-run>Run Sweep Now</button></div>
        <div class="sr-global-table historic" role="table">
          <div class="sr-global-row head" role="row"><span>Score</span><span>Exact tokens</span><span>Personal row</span><span>Shopify row</span><span>Time</span><span>Status</span></div>
          ${matches.slice(0,12).map((m,i)=>`<div class="sr-global-row" role="row"><strong>${esc(m.score)}</strong><span>${esc((m.exact||[]).slice(0,3).join(', '))}</span><span>#${esc(m.personalIndex)}</span><span>#${esc(m.shopifyIndex)}</span><span>${esc(new Date(m.at).toLocaleTimeString())}</span><strong>Exact</strong></div>`).join('') || '<div class="sr-global-row" role="row"><span>0</span><span>No exact matches yet</span><span>--</span><span>--</span><span>--</span><strong>Waiting</strong></div>'}
        </div>
      </section>
    `;
  }

  function patchGlobalTrackerRender(){
    if (root.__globalSweepPatched) return;
    root.__globalSweepPatched = true;
    const previous = root.renderGlobalTrackerMarkup;
    root.renderGlobalTrackerMarkup = function(){
      const base = previous ? previous() : '';
      return String(base).replace('</section>', `${renderSweepMarkup()}</section>`);
    };
  }

  function bindEvents(){
    if (root.__globalSweepEventsBound) return;
    root.__globalSweepEventsBound = true;
    document.addEventListener('click', event=>{
      if (event.target.closest('[data-global-sweep-run]')) {
        event.preventDefault();
        runGlobalSweep();
      }
    });
  }

  function initGlobalSweep(){
    patchGlobalTrackerRender();
    bindEvents();
    runGlobalSweep();
    if (root.__globalSweepTimer) clearInterval(root.__globalSweepTimer);
    root.__globalSweepTimer = setInterval(runGlobalSweep, SWEEP_MS);
  }

  root.runGlobalSweep = runGlobalSweep;
  root.initGlobalSweep = initGlobalSweep;
})();