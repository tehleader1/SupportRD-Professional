(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const STORE_KEY = 'srGlobalTrackerV1';

  const DEFAULT_STATE = {
    vipConfirmed: false,
    compactIntake: 'Waiting for the next intake. Paste a large note, compress it, and route it into live vs historic tracking.',
    marketUpdatedAt: '',
    plantLayer: 'Inner Charlotte',
    marketLive: [
      { slot:'A', symbol:'Ticker A', market:'Nasdaq', captured:'Overnight watch', price:'--', premium:'--', calls:'--', puts:'--', bias:'Waiting', route:'20-40 min', liveScore:72 },
      { slot:'B', symbol:'Ticker B', market:'S&P 500', captured:'Pre-market watch', price:'--', premium:'--', calls:'--', puts:'--', bias:'Waiting', route:'30-60 min', liveScore:68 },
      { slot:'C', symbol:'Ticker C', market:'NYSE', captured:'Opening watch', price:'--', premium:'--', calls:'--', puts:'--', bias:'Waiting', route:'10:00 / 2:00 check', liveScore:64 },
      { slot:'D', symbol:'Ticker D', market:'Nasdaq', captured:'Went-away tracker', price:'--', premium:'--', calls:'--', puts:'--', bias:'Re-check', route:'1 hour', liveScore:59 }
    ],
    historicRows: [
      { symbol:'Ticker A', tenDay:'7/10 trend holds', oneMonth:'Range compression', sixMonth:'Volume route repeats', wentAway:'Low', rating:84 },
      { symbol:'Ticker B', tenDay:'5/10 trend holds', oneMonth:'Fakeout prone', sixMonth:'Morning route improves', wentAway:'Medium', rating:73 },
      { symbol:'Ticker C', tenDay:'6/10 trend holds', oneMonth:'Afternoon stronger', sixMonth:'Index confirmation needed', wentAway:'Low', rating:77 },
      { symbol:'Ticker D', tenDay:'4/10 trend holds', oneMonth:'Falls off reader', sixMonth:'Use as caution row', wentAway:'High', rating:58 }
    ],
    visitorCohorts: [
      { label:'Just landed', count:194, intent:'Low intent - reading first screen, no feature lock yet.' },
      { label:'Feature interest', count:142, intent:'Potential buyer - repeating Catalog, Studio, Profile, FAQ, or Map actions.' },
      { label:'Premium/backlink builder', count:71, intent:'Confirmed account route - match account code to /accounts/****** backlink.' },
      { label:'Hurry hair solution', count:119, intent:'High urgency - route to Profile scan, ARIA, Catalog, and support checkout.' },
      { label:'Project supporter', count:96, intent:'Wants to support the company, not necessarily buy hair products today.' },
      { label:'Staff question', count:78, intent:'Needs a person, contact form, developer feed, or ARIA/Jake handoff.' }
    ],
    plantRows: [
      { layer:'Inner Charlotte', package:'Basic package', range:'1-10 plants', route:'Local delivery / pickup', contact:'Call 980-230-6202 for developer or plant order questions.' },
      { layer:'Inner Charlotte', package:'Jumbo package', range:'20-100 plants', route:'Schedule delivery window', contact:'Collect name, phone or email, and preferred payment route.' },
      { layer:'Regional outward', package:'Seller percentage', range:'Partner sales', route:'Wholesale or commission lead', contact:'Track area, seller proof, and plant list before terms.' },
      { layer:'USA dropship', package:'Compliance check', range:'State-to-state', route:'Verify state restrictions before shipment', contact:'No shipment until plant legality and live-arrival terms are checked.' }
    ]
  };

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function read(){
    try {
      return { ...clone(DEFAULT_STATE), ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') };
    } catch {
      return clone(DEFAULT_STATE);
    }
  }

  function write(state){
    localStorage.setItem(STORE_KEY, JSON.stringify(state || DEFAULT_STATE));
    return state;
  }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function compactText(value){
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (!clean) return DEFAULT_STATE.compactIntake;
    return clean.length > 260 ? `${clean.slice(0, 257)}...` : clean;
  }

  function marketTable(rows, historic = false){
    return `
      <div class="sr-global-table ${historic ? 'historic' : 'live'}" role="table">
        <div class="sr-global-row head" role="row">
          ${(historic ? ['Symbol','10 day','1 month','6 month','Away','Rating'] : ['Slot','Symbol','Market','Captured','Price','Premium','Calls/Puts','Bias','Route','Score']).map(item=>`<span role="columnheader">${item}</span>`).join('')}
        </div>
        ${rows.map(row=> historic ? `
          <div class="sr-global-row" role="row">
            <span>${esc(row.symbol)}</span><span>${esc(row.tenDay)}</span><span>${esc(row.oneMonth)}</span><span>${esc(row.sixMonth)}</span><span>${esc(row.wentAway)}</span><strong>${esc(row.rating)}</strong>
          </div>` : `
          <div class="sr-global-row" role="row">
            <span>${esc(row.slot)}</span><strong>${esc(row.symbol)}</strong><span>${esc(row.market)}</span><span>${esc(row.captured)}</span><span>${esc(row.price)}</span><span>${esc(row.premium)}</span><span>${esc(row.calls)} / ${esc(row.puts)}</span><span>${esc(row.bias)}</span><span>${esc(row.route)}</span><strong>${esc(row.liveScore)}</strong>
          </div>`).join('')}
      </div>
    `;
  }

  function renderVisitorCohorts(state){
    const total = state.visitorCohorts.reduce((sum, item)=>sum + Number(item.count || 0), 0);
    return `
      <section class="sr-global-band">
        <div class="sr-global-band-head">
          <span>SupportRD.com Motion</span>
          <strong>${total} visitor signals</strong>
        </div>
        <div class="sr-global-grid compact">
          ${state.visitorCohorts.map(item=>`
            <article class="sr-global-card">
              <span>${esc(item.label)}</span>
              <strong>${esc(item.count)}</strong>
              <p>${esc(item.intent)}</p>
            </article>
          `).join('')}
        </div>
        <div class="sr-global-note">Public view masks IP address, personal address, individual revenue, repeat-customer identity, and ARIA/Jake transcript detail. Use confirmed account codes like <strong>/accounts/******</strong> instead of exposing private identity.</div>
      </section>
    `;
  }

  function renderPlantTracker(state){
    return `
      <section class="sr-global-band">
        <div class="sr-global-band-head">
          <span>Plant Escapes Tracker</span>
          <strong>${esc(state.plantLayer)} layer active</strong>
        </div>
        <div class="sr-global-actions">
          <button class="sr-mini-btn" type="button" data-global-action="plant-layer" data-layer="Inner Charlotte">Inner Charlotte</button>
          <button class="sr-mini-btn" type="button" data-global-action="plant-layer" data-layer="Regional outward">Regional</button>
          <button class="sr-mini-btn" type="button" data-global-action="plant-layer" data-layer="USA dropship">USA Dropship</button>
          <button class="sr-mini-btn" type="button" data-global-action="plant-layer" data-layer="International watch">International</button>
        </div>
        <div class="sr-global-grid plant">
          ${state.plantRows.map(row=>`
            <article class="sr-global-card ${row.layer === state.plantLayer ? 'active' : ''}">
              <span>${esc(row.layer)}</span>
              <strong>${esc(row.package)}</strong>
              <p>${esc(row.range)} - ${esc(row.route)}</p>
              <small>${esc(row.contact)}</small>
            </article>
          `).join('')}
        </div>
        <div class="sr-global-note">
          Basic dropship rules starter: check USDA APHIS, state nursery laws, quarantine areas, permits/certificates, and growing-media limits before shipment; avoid prohibited or invasive plants; document live-arrival terms, weather holds, delivery scans, customer contact, and 30-day delivery lock. If a shipped plant order does not arrive within 30 days, route refund review plus a comeback discount. <a href="https://www.aphis.usda.gov/plant-protection-quarantine" target="_blank" rel="noopener">USDA APHIS plant protection</a>
        </div>
        <div class="sr-global-payment">Accepted routes: debit/card through Shopify checkout, cash in person, Venmo, CashApp. If using Venmo or CashApp, collect name plus an accommodating email or phone number for order routing.</div>
      </section>
    `;
  }

  function renderGlobalTrackerMarkup(){
    const state = read();
    return `
      <section class="sr-global-tracker" data-panel="globaltracker">
        <header class="sr-global-hero">
          <span>SupportRD Global Tracker</span>
          <h2>VIP market watch, website motion, plant delivery, and in-person order routing.</h2>
          <p>Research-only market routing, privacy-safe visitor cohorts, plant package layers, and payment/delivery intake in one visible company dashboard.</p>
          <div class="sr-global-actions">
            <a class="sr-buy-btn" href="https://market-do8p.onrender.com/" target="_blank" rel="noopener">Open Market Reader</a>
            <a class="sr-mini-btn" href="https://www.theplantmaninc.com/" target="_blank" rel="noopener">Open Plant Site</a>
            <button class="sr-mini-btn" type="button" data-global-action="vip-confirm">${state.vipConfirmed ? 'VIP Confirmed' : 'Confirm $25,000 VIP View'}</button>
          </div>
        </header>

        <section class="sr-global-band">
          <div class="sr-global-band-head">
            <span>Instant Intake</span>
            <strong>Compact before routing</strong>
          </div>
          <textarea id="srGlobalIntake" placeholder="Paste large intake or live note. It will be compacted before the tracker separates live data from historic data."></textarea>
          <div class="sr-global-actions">
            <button class="sr-buy-btn" type="button" data-global-action="compact-intake">Compact Intake</button>
            <button class="sr-mini-btn" type="button" data-global-action="refresh-market">Refresh Tracker Sample</button>
          </div>
          <div class="sr-output-box">${esc(state.compactIntake)}</div>
        </section>

        <section class="sr-global-band vip">
          <div class="sr-global-band-head">
            <span>$25,000 Inner Circle Market Group</span>
            <strong>${state.vipConfirmed ? 'Confirmed local VIP dashboard' : 'Locked until account confirmation'}</strong>
          </div>
          <p class="sr-global-disclaimer">Market rows are analytics and research only. They do not execute trades, guarantee performance, or recommend a buy/sell decision. Live options feeds require approved market-data provider keys before real calls/puts/prices replace placeholders.</p>
          <h3>Live tracked feed - 4 to 5 at a time</h3>
          ${marketTable(state.marketLive)}
          <h3>Historical values - separate 10 day competition</h3>
          ${marketTable(state.historicRows, true)}
          <div class="sr-global-note">Labels compare Nasdaq, S&P 500, and NYSE confirmation. Route windows watch 20, 30, 40, and 60 minute arrival behavior, plus 10:00 and 2:00 check-in moments after fakeouts calm down.</div>
        </section>

        ${renderVisitorCohorts(state)}
        ${renderPlantTracker(state)}

        <section class="sr-global-band">
          <div class="sr-global-band-head">
            <span>Admin Privacy Screen</span>
            <strong>Masked public data</strong>
          </div>
          <div class="sr-global-grid compact">
            <article class="sr-global-card"><span>IP / region</span><strong>Masked</strong><p>Show clean aggregate region only; never publish raw IP addresses in public UI.</p></article>
            <article class="sr-global-card"><span>Revenue per person</span><strong>Admin only</strong><p>Public dashboard uses cohort value ranges, not individual money totals.</p></article>
            <article class="sr-global-card"><span>Address / contact</span><strong>Hidden</strong><p>Collect only when needed for delivery or support, then keep it behind admin access.</p></article>
            <article class="sr-global-card"><span>Developer feed</span><strong>Content review</strong><p>Mentions and comments are readable by admin, with personal information blurred from public view.</p></article>
          </div>
        </section>
      </section>
    `;
  }

  function refreshMarketSample(){
    const state = read();
    const labels = ['Nasdaq','S&P 500','NYSE'];
    state.marketLive = state.marketLive.map((row, index)=>({
      ...row,
      market: labels[(index + Date.now()) % labels.length],
      captured: ['Overnight watch','Pre-market watch','10:00 route','2:00 route','Went-away tracker'][index % 5],
      price: (95 + Math.random() * 380).toFixed(2),
      premium: (1.15 + Math.random() * 8.4).toFixed(2),
      calls: (0.8 + Math.random() * 5.5).toFixed(2),
      puts: (0.8 + Math.random() * 5.5).toFixed(2),
      bias: ['Bullish watch','Bearish watch','Opposite move watch','Fakeout clearing'][Math.floor(Math.random() * 4)],
      liveScore: Math.round(55 + Math.random() * 38)
    }));
    state.marketUpdatedAt = new Date().toISOString();
    write(state);
  }

  function bindEvents(){
    if (root.__globalTrackerEventsBound) return;
    root.__globalTrackerEventsBound = true;
    document.addEventListener('click', event=>{
      const btn = event.target.closest?.('[data-global-action]');
      if (!btn) return;
      const state = read();
      const action = btn.dataset.globalAction;
      if (action === 'vip-confirm') {
        state.vipConfirmed = true;
        state.compactIntake = 'VIP view confirmed locally. Connect this to paid Shopify/Auth0 account verification before using it as real access control.';
        write(state);
      }
      if (action === 'compact-intake') {
        state.compactIntake = compactText(document.querySelector('#srGlobalIntake')?.value || '');
        write(state);
      }
      if (action === 'refresh-market') refreshMarketSample();
      if (action === 'plant-layer') {
        state.plantLayer = btn.dataset.layer || state.plantLayer;
        write(state);
      }
      if (document.querySelector('[data-panel="globaltracker"]')) {
        root.renderFunctionalPanel?.('globaltracker');
      }
    });
  }

  function installStyles(){
    if (document.getElementById('srGlobalTrackerCss')) return;
    const style = document.createElement('style');
    style.id = 'srGlobalTrackerCss';
    style.textContent = `
      .sr-global-tracker{display:grid;gap:1rem;min-width:0;max-width:100%;overflow:hidden}
      .sr-global-hero,.sr-global-band{min-width:0;padding:1rem;border:1px solid rgba(255,255,255,.14);border-radius:1rem;background:rgba(3,8,19,.72);box-shadow:0 18px 46px rgba(0,0,0,.22)}
      .sr-global-hero span,.sr-global-band-head span,.sr-global-card span{color:var(--cyan,#61efff);font-size:.74rem;text-transform:uppercase;letter-spacing:.12em;font-weight:1000}
      .sr-global-hero h2{margin:.25rem 0;font-size:clamp(1.8rem,3vw,3.2rem);line-height:.98}
      .sr-global-hero p,.sr-global-disclaimer,.sr-global-note,.sr-global-payment,.sr-global-card p{color:rgba(247,251,255,.72);line-height:1.45}
      .sr-global-band-head{display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap;margin-bottom:.7rem}
      .sr-global-band-head strong{font-size:1.05rem}.sr-global-actions{display:flex;gap:.55rem;flex-wrap:wrap;align-items:center}
      .sr-global-band textarea{width:100%;min-height:5.8rem;padding:.85rem;border-radius:.8rem;border:1px solid rgba(255,255,255,.15);background:rgba(3,8,19,.74);color:#fff;resize:vertical;margin-bottom:.7rem}
      .sr-global-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;min-width:0}
      .sr-global-grid.compact{grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))}
      .sr-global-grid.plant{grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))}
      .sr-global-card{min-width:0;padding:.85rem;border:1px solid rgba(255,255,255,.13);border-radius:.85rem;background:rgba(255,255,255,.06);overflow-wrap:anywhere}
      .sr-global-card.active{box-shadow:0 0 0 2px rgba(97,239,255,.58)}
      .sr-global-table{display:block;max-width:100%;min-width:0;overflow-x:auto;overflow-y:hidden;padding-bottom:.25rem}
      .sr-global-row{width:66rem;max-width:none;display:grid;grid-template-columns:repeat(10,minmax(5.2rem,1fr));gap:.4rem;padding:.5rem;border:1px solid rgba(255,255,255,.1);border-radius:.65rem;background:rgba(255,255,255,.045);align-items:center}
      .sr-global-table.historic .sr-global-row{width:48rem;grid-template-columns:repeat(6,minmax(7rem,1fr))}
      .sr-global-row + .sr-global-row{margin-top:.35rem}.sr-global-row.head{background:rgba(97,239,255,.13);font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;font-weight:1000}
      .sr-global-row span,.sr-global-row strong{font-size:.78rem;overflow-wrap:anywhere}.sr-global-band h3{margin:.85rem 0 .45rem}
      @media(max-width:860px){.sr-global-grid{grid-template-columns:1fr}.sr-global-row{width:58rem}.sr-global-table.historic .sr-global-row{width:44rem}.sr-global-hero h2{font-size:1.8rem}}
    `;
    document.head.appendChild(style);
  }

  function initGlobalTracker(){
    if (!localStorage.getItem(STORE_KEY)) write(clone(DEFAULT_STATE));
    installStyles();
    bindEvents();
  }

  root.initGlobalTracker = initGlobalTracker;
  root.renderGlobalTrackerMarkup = renderGlobalTrackerMarkup;
})();
