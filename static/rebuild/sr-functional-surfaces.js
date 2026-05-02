(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const KEY = 'srFunctionalRoomsAdvancedV2';
  const SETTINGS_KEY = 'srAccountSettingsV1';
  const CART_KEY = 'srCatalogCartV1';
  const DEFAULT_ARIA_PROFILE = '/static/images/woman-waking-up12.jpg';

  function read(){ try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
  function write(next){ localStorage.setItem(KEY, JSON.stringify({ ...read(), ...(next || {}) })); return read(); }
  function settings(){ try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; } }
  function saveSettings(next){ localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings(), ...(next || {}), updatedAt:new Date().toISOString() })); return settings(); }
  function cart(){ try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; } }
  function saveCart(items){ localStorage.setItem(CART_KEY, JSON.stringify((items || []).filter(Boolean))); return cart(); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function account(){ try { return root.getAccountBackbone?.() || {}; } catch { return {}; } }
  function loginState(){ try { return JSON.parse(localStorage.getItem('srLoginPanelV27') || '{}'); } catch { return {}; } }
  function asset(name, fallback){ return root.assets?.[name] || fallback || '/static/images/healthy_hair.jpeg'; }
  function count(list){ return Array.isArray(list) ? list.length : 0; }
  function savedCounts(){
    const a = account();
    const files = a.savedFiles || {};
    return {
      profile: count(a.profile?.hairAnalyses) + count(a.profile?.profileImages) + count(files.profile),
      diary: count(a.diary?.assistantHistory) + count(a.diary?.livePayments) + count(a.diary?.liveRoomEvents) + count(files.diary),
      studio: count(a.studio?.imports) + count(a.studio?.exports) + count(a.studio?.jakeHistory) + count(files.studio),
      map: count(a.mapChange?.perks) + count(files.mapChange),
      faq: count(a.faq?.developerFeed) + count(a.faq?.ratings) + count(a.faq?.mentions)
    };
  }

  function shell(route, eyebrow, title, body, inner, image){
    const img = image || asset('healthyHair');
    return `
      <section class="sr-panel sr-functional-panel sr-advanced-panel" data-panel="${esc(route)}">
        <div class="sr-panel-media sr-functional-media" style="background-image:url('${esc(img)}')"></div>
        <div class="sr-panel-copy sr-functional-copy">
          <span>${esc(eyebrow)}</span>
          <h2>${esc(title)}</h2>
          <p>${esc(body)}</p>
          ${inner}
        </div>
      </section>
    `;
  }

  function card(title, body, extra=''){
    return `<article class="sr-room-card"><h3>${esc(title)}</h3><p>${body}</p>${extra}</article>`;
  }

  function output(title, rows){
    const list = Array.isArray(rows) ? rows : [];
    return `
      <div class="sr-output-box">
        <strong>${esc(title)}</strong>
        ${list.length ? list.slice(0, 5).map(item=>`<div>${esc(item)}</div>`).join('') : '<div>No saved rows yet.</div>'}
      </div>
    `;
  }

  function tierLabel(){
    const a = account();
    const l = loginState();
    return l.tier || a.tier || 'Free';
  }

  function accountTag(){
    const a = account();
    const l = loginState();
    return String(l.username || a.username || 'DYGENRJE').replace(/[^a-z0-9_-]/gi, '').toUpperCase() || 'DYGENRJE';
  }

  function renderDiary(){
    const a = account();
    const tag = accountTag();
    const url = `${location.origin}/accounts/${encodeURIComponent(tag)}`;
    const events = (a.diary?.liveRoomEvents || []).slice(0, 4).map(evt=>`${evt.type || 'event'} ${evt.name ? '- ' + evt.name : ''}`);
    const payments = (a.diary?.livePayments || []).slice(0, 3).map(p=>`$${p.amount || '?'} through ${p.source || 'checkout'}`);
    return shell('diary','DIARY LIVE ROOM','Diary Live Webcam Room',
      `Live webcam, routed guest backlink, comments, Premium/Pro purchase routing, and hands-free ARIA/Jake history stay attached to ^^ ${tag}.`,
      `
      <section class="sr-room-grid">
        <article class="sr-room-card sr-live-room" style="grid-column:1/-1">
          <h3>Live Webcam + Recording</h3>
          <div id="srDiaryLiveRoom" class="sr-real-room-mount"></div>
        </article>
        ${card('Routed Guest Link','Every live room has a clean share link and account code for comments, support, and history.',
          `<div class="sr-output-box"><strong>Backlink</strong><a href="/accounts/${esc(tag)}" target="_blank" rel="noopener">supportrd.com/accounts/${esc(tag)}</a><code>${esc(url)}</code></div><button class="sr-mini-btn" type="button" data-copy-diary-link="${esc(url)}">Copy Link</button>`)}
        ${card('Paid Account + Debit/Credit Checkout','Premium, Pro, and Studio Jake purchases route through checkout. Do not type raw card numbers into SupportRD panels.',
          `<div class="sr-room-actions"><a class="sr-buy-btn" href="/products/premium">Premium</a><a class="sr-mini-btn" href="/products/pro">Pro</a><a class="sr-mini-btn" href="/products/studio-jake">Studio Jake</a><a class="sr-mini-btn" href="https://shop.supportrd.com/account" target="_blank" rel="noopener">Update Payment</a></div>`)}
        ${card('Hands-Free Mode + History','Open mic waits for a quiet pause, transcribes, gets the AI response, plays intro/outro tones, and saves back to Diary.',
          `<div class="sr-room-actions"><button class="sr-buy-btn" data-voice-start="aria" data-hands-free="true" type="button">Hands-Free ARIA</button><button class="sr-mini-btn" data-voice-start="jake" data-hands-free="true" type="button">Hands-Free Jake</button></div>${output('Recent live events', events)}${output('Recent support payments', payments)}`)}
      </section>`, asset('healthyHair'));
  }

  function renderProfile(){
    const a = account();
    const s = read();
    const latest = (a.profile?.hairAnalyses || [])[0] || {};
    const profileImage = s.profileImage || a.profile?.latestProfileImage || DEFAULT_ARIA_PROFILE;
    const hasCustomProfileImage = !!(s.profileImage || a.profile?.latestProfileImage);
    const qualities = s.profileQualities || latest.qualities || {
      quality1: latest.quality1 || 'hair confidence signal',
      quality2: latest.quality2 || 'routine readiness signal'
    };
    return shell('profile','PREMIUM / PRO HAIR READ','Profile Hair Analysis',
      'Profile runs the camera hair analysis, saves the profile picture, stores two hair/person qualities, and routes the spoken read back into ARIA/Jake account history.',
      `
      <section class="sr-room-grid">
        <article class="sr-room-card sr-profile-camera" style="grid-column:1/-1">
          <h3>Camera Hair Analysis + ARIA Readback</h3>
          <div id="srHairAnalysisRoom" class="sr-real-room-mount"></div>
        </article>
        ${card('Editable Profile Picture','Use this as the account identity anchor. The image and two qualities save into Profile history.',
          `<input class="sr-file-input" type="file" accept="image/*" data-profile-image><div class="sr-preview-box" id="profileScanPreview"><img src="${esc(profileImage)}" alt="${hasCustomProfileImage?'Profile preview':'ARIA default profile preview'}" style="width:100%;max-width:180px;aspect-ratio:1/1;object-fit:cover;border-radius:.8rem;"><small>${hasCustomProfileImage?'Profile picture saved.':'ARIA default is showing until a profile picture is uploaded.'}</small></div>`)}
        ${card('Two Saved Qualities','Save the two clean signals ARIA/Jake should remember about this person and their hair.',
          `<input data-profile-quality-one placeholder="Quality 1" value="${esc(qualities.quality1)}"><input data-profile-quality-two placeholder="Quality 2" value="${esc(qualities.quality2)}"><textarea data-profile-notes placeholder="Hair problem, event, routine, product concern, or confirmed scan note...">${esc(s.profileNotes || latest.summary || '')}</textarea><div class="sr-room-actions"><button class="sr-buy-btn" type="button" data-profile-prep>Save Hair Summary</button><button class="sr-mini-btn" type="button" data-profile-speak>Speak Analysis</button><button class="sr-mini-btn" type="button" data-voice-start="aria">Ask ARIA</button><button class="sr-mini-btn" type="button" data-voice-start="jake">Ask Jake</button></div>`)}
      </section>`, profileImage);
  }

  function renderStudio(){
    return shell('studio','STUDIO JAKE MOTHERBOARD','Studio Motherboard',
      'The full 4-lane Studio Jake motherboard is loaded by the studio engine. If you see this fallback, refresh once so the engine can mount.',
      `<section class="sr-room-grid"><article class="sr-room-card" style="grid-column:1/-1"><h3>Studio Engine Mount</h3><div id="srMotherboardContainer" class="sr-real-room-mount"></div></article></section>`,
      asset('studioJake'));
  }

  function renderFaq(){
    return shell('faq','FAQ REEL LOUNGE','FAQ Lounge',
      'Hair Memes Style, Professional Hair Style, Home Hair Style, Salon Hair Style, and Family Hair Style use API-backed 10 second clips plus a SupportRD comment feed per section.',
      `
      <section class="sr-room-grid">
        <article class="sr-room-card sr-reel-card" style="grid-column:1/-1">
          <h3>YouTube-Style Hair Categories</h3>
          <div id="srTikTokReelContainer" class="sr-real-room-mount"></div>
        </article>
        ${card('FAQ APIs Checked','The lounge calls /api/faq/reels for clips, /api/faq/magic-hour/status for generated reel readiness, and /api/local-remote/faq/posts for developer/community posts.',
          `<div class="sr-room-actions"><button class="sr-mini-btn" type="button" data-faq-api-check>Check Reel APIs</button><button class="sr-mini-btn" type="button" data-reel-play>Play 10 Second Clip</button></div><div class="sr-output-box" id="srFaqApiStatus">API status will appear here.</div>`)}
        ${card('SupportRD General Comment Section','Post readable community notes back into the developer feed without exposing private account details.',
          `<textarea data-faq-dev-text placeholder="Post a SupportRD FAQ lounge note..."></textarea><input data-faq-rating type="number" min="1" max="5" placeholder="Rating 1-5"><button class="sr-buy-btn" data-faq-dev-post type="button">Post to Developer Feed</button>`)}
      </section>`, asset('dayparty'));
  }

  function renderMap(){
    const mapNames = root.mapPerks?.getMapNames?.() || ['Swimming Hole','Snow Mountain Pass','Autumn Trail','Desert Cliff','Blissful Geysers','Chocolate Factory'];
    return shell('map','MAP PERKS + DISCOUNTS','Map Change',
      'Each map changes the full background, panel colors, and active perk. Discount perks open Shopify with the actual active code.',
      `<section class="sr-room-grid"><article class="sr-room-card" style="grid-column:1/-1"><h3>Map Themes</h3><div class="sr-map-choice-grid">${mapNames.map(name=>`<button class="sr-mini-btn" type="button" data-map-choice="${esc(name)}">${esc(name)}</button>`).join('')}</div><div id="srMapPerksContainer" class="sr-real-room-mount"></div></article></section>`,
      asset('hijaFelix'));
  }

  function productCard(product){
    return `<article class="sr-product-card" data-catalog-item="${esc(product.id || '')}"><img src="${esc(product.img || asset('healthyHair'))}" alt="${esc(product.title)}" loading="lazy" onerror="this.style.display='none'"><span>${esc(product.tag || product.price || 'Shop')}</span><h3>${esc(product.title)}</h3><p>${esc(product.desc || '')}</p><div class="sr-room-actions"><button class="sr-mini-btn" type="button" data-cart-add="${esc(product.id || '')}">Add To Cart</button><a class="sr-buy-btn" href="${esc(product.href || 'https://shop.supportrd.com')}" target="_blank" rel="noopener" data-buy="${esc(product.id || '')}">${esc(product.buy || `Buy / View ${product.title}`)}</a></div></article>`;
  }

  function catalogItems(packages, products){
    const productFamily = products.find(p=>p.id === 'full-line') || products[products.length - 1] || {};
    const premium = packages.find(p=>/premium/i.test(p.id || p.title || '')) || {};
    const pro = packages.find(p=>/pro/i.test(p.id || p.title || '')) || {};
    const studio = packages.find(p=>/studio/i.test(p.id || p.title || '')) || {};
    const bundles = [
      { id:'bundle-premium-hair', title:'Premium Hair Support Bundle', price:'Bundle', tag:'Premium + products', href:premium.href || productFamily.href, img:productFamily.img || premium.img, desc:'Premium ARIA account status plus the full physical product catalog route.', buy:'Open Premium Bundle', checkoutLinks:[premium.href, productFamily.href].filter(Boolean) },
      { id:'bundle-pro-hair', title:'Pro Growth + Product Bundle', price:'Bundle', tag:'Pro + products', href:pro.href || productFamily.href, img:pro.img || productFamily.img, desc:'Pro account status with the physical product lane for serious hair support.', buy:'Open Pro Bundle', checkoutLinks:[pro.href, productFamily.href].filter(Boolean) },
      { id:'bundle-studio-jake-hair', title:'Studio Jake Creator Bundle', price:'Bundle', tag:'Studio + products', href:studio.href || productFamily.href, img:studio.img || productFamily.img, desc:'Studio Jake access, premium FX lane, and the SupportRD product catalog route.', buy:'Open Studio Bundle', checkoutLinks:[studio.href, productFamily.href].filter(Boolean) }
    ];
    const all = [...bundles, ...packages, ...products].filter(item=>item && item.id);
    root.__srCatalogItems = all;
    return { bundles, all };
  }

  function cartRows(){
    const items = cart();
    if (!items.length) return '<p>Your SupportRD cart is ready. Add products, Premium/Pro, or Studio Jake bundles.</p>';
    return items.map(item=>`
      <div class="sr-cart-row" data-cart-row="${esc(item.id)}">
        <span><strong>${esc(item.title)}</strong><small>${esc(item.tag || item.price || 'SupportRD')}</small></span>
        <div class="sr-cart-actions">
          <button class="sr-mini-btn" type="button" data-cart-dec="${esc(item.id)}">-</button>
          <b>${item.qty || 1}</b>
          <button class="sr-mini-btn" type="button" data-cart-inc="${esc(item.id)}">+</button>
          <button class="sr-mini-btn" type="button" data-cart-remove="${esc(item.id)}">Remove</button>
        </div>
      </div>
    `).join('');
  }

  function cartPanel(){
    const items = cart();
    const links = items.flatMap(item=>item.checkoutLinks?.length ? item.checkoutLinks : [item.href]).filter(Boolean);
    return `<article class="sr-room-card" style="grid-column:1/-1"><h3>SupportRD Cart</h3><div class="sr-output-box sr-cart-box">${cartRows()}</div><div class="sr-room-actions"><button class="sr-buy-btn" type="button" data-cart-checkout="${esc(links[0] || 'https://shop.supportrd.com/products/support-full-product-line')}">Checkout Cart</button><button class="sr-mini-btn" type="button" data-cart-clear>Clear Cart</button><a class="sr-mini-btn" href="https://shop.supportrd.com/collections/all" target="_blank" rel="noopener">Open Full Shop</a></div>${links.length > 1 ? `<div class="sr-output-box"><strong>Bundle checkout links</strong>${links.slice(0,5).map((href,index)=>`<a href="${esc(href)}" target="_blank" rel="noopener">Checkout link ${index + 1}</a>`).join('')}</div>` : ''}</article>`;
  }

  function ensureCartCss(){
    if (document.querySelector('#srCatalogCartCss')) return;
    const style = document.createElement('style');
    style.id = 'srCatalogCartCss';
    style.textContent = '.sr-cart-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.6rem;align-items:center;border:1px solid rgba(255,255,255,.12);border-radius:.7rem;padding:.55rem;margin:.45rem 0;background:rgba(255,255,255,.035)}.sr-cart-row strong{display:block}.sr-cart-row small{display:block;color:#aebbd0}.sr-cart-actions{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap}.sr-cart-actions b{min-width:1.5rem;text-align:center}.sr-cart-box p{margin:.25rem 0;color:#cbd5e1}.sr-product-card .sr-room-actions{margin-top:.65rem}';
    document.head.appendChild(style);
  }

  function findCatalogItem(id){
    return (root.__srCatalogItems || []).find(item=>String(item.id) === String(id));
  }

  function addCartItem(id){
    const item = findCatalogItem(id);
    if (!item) return;
    const items = cart();
    const existing = items.find(row=>row.id === item.id);
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else items.unshift({ id:item.id, title:item.title, tag:item.tag || item.price || 'SupportRD', href:item.href, checkoutLinks:item.checkoutLinks || [], qty:1 });
    saveCart(items);
  }

  function updateCartQty(id, delta){
    const items = cart().map(item=>item.id === id ? { ...item, qty:Math.max(0, (item.qty || 1) + delta) } : item).filter(item=>(item.qty || 0) > 0);
    saveCart(items);
  }

  function renderCatalog(){
    const packages = Array.isArray(root.packages) ? root.packages : [];
    const products = Array.isArray(root.products) ? root.products : [];
    const catalog = catalogItems(packages, products);
    ensureCartCss();
    return shell('catalog','CATALOG / PAYMENTS','Have Healthy Hair Catalog',
      'Catalog keeps products, packages, debit/credit checkout, and SupportRD hair solutions on the main domain path.',
      `<section class="sr-room-grid">${cartPanel()}<article class="sr-room-card" style="grid-column:1/-1"><h3>Smart Bundles</h3><div class="sr-product-grid">${catalog.bundles.map(productCard).join('')}</div></article><article class="sr-room-card" style="grid-column:1/-1"><h3>Digital Packages</h3><div class="sr-product-grid">${packages.map(productCard).join('') || '<p>Digital package links are loading.</p>'}</div></article><article class="sr-room-card" style="grid-column:1/-1"><h3>Hair Products</h3><div class="sr-product-grid">${products.map(productCard).join('') || '<p>Product links are loading.</p>'}</div></article></section>`,
      asset('productFamily'));
  }

  function renderSettings(){
    const l = loginState();
    const s = settings();
    const c = savedCounts();
    const a = account();
    return shell('settings','ACCOUNT CONTROL CENTER','Settings',
      'Settings connects the whole app: saved live recordings, perks, studio sessions, hair analysis, push reminders, payment status, password changes, and account tier.',
      `
      <section class="sr-room-grid">
        ${card('Login + Status','Confirmed identity controls Premium, Pro, Studio Jake, and Global Tracker access.',
          `<input data-login-username placeholder="Username / tag" value="${esc(l.username || a.username || '')}"><input data-login-email placeholder="Email" value="${esc(l.email || a.email || '')}"><input data-login-phone placeholder="Phone" value="${esc(l.phone || '')}"><select data-login-tier><option ${tierLabel()==='Free'?'selected':''}>Free</option><option ${/premium/i.test(tierLabel())?'selected':''}>Premium</option><option ${/^pro$/i.test(tierLabel())?'selected':''}>Pro</option><option ${/studio/i.test(tierLabel())?'selected':''}>Studio Jake</option><option ${/premium \/ pro/i.test(tierLabel())?'selected':''}>Premium / Pro</option></select><button class="sr-buy-btn" data-login-save type="button">Save Login</button><div class="sr-output-box"><strong>Status:</strong> ${esc(tierLabel())}</div>`)}
        ${card('Push Settings','ARIA reminder presets are saved now; native device push still needs browser permission/service worker wiring.',
          `<label><input type="checkbox" data-sr-toggle="pushHairReminders" ${s.pushHairReminders ? 'checked' : ''}> Hair issue reminders</label><label><input type="checkbox" data-sr-toggle="pushRoutineReminders" ${s.pushRoutineReminders ? 'checked' : ''}> Routine reminders</label><select data-sr-setting="assistantMode"><option ${s.assistantMode==='Greeting'?'selected':''}>Greeting</option><option ${s.assistantMode==='Advanced'?'selected':''}>Advanced</option><option ${s.assistantMode==='Inner Circle'?'selected':''}>Inner Circle</option><option ${s.assistantMode==='Professional / Making Money'?'selected':''}>Professional / Making Money</option></select><button class="sr-mini-btn" data-build-alert type="button">Preview ARIA Reminder</button><p data-alert-preview>ARIA reminders are ready to preview.</p>`)}
        ${card('Password + Payment','Password and payment changes route through account/checkout systems, not raw card storage inside this panel.',
          `<div class="sr-room-actions"><a class="sr-mini-btn" href="/login">Change Password</a><a class="sr-buy-btn" href="https://shop.supportrd.com/account" target="_blank" rel="noopener">Update Payment Information</a><a class="sr-mini-btn" href="/products/premium">Premium</a><a class="sr-mini-btn" href="/products/pro">Pro</a><a class="sr-mini-btn" href="/products/studio-jake">Studio Jake</a></div>`)}
        ${card('Saved App History',`Live recordings/events: <strong>${c.diary}</strong><br>Saved perks: <strong>${c.map}</strong><br>Studio sessions: <strong>${c.studio}</strong><br>Hair analysis/profile: <strong>${c.profile}</strong><br>FAQ/community feed: <strong>${c.faq}</strong>`,
          `<button class="sr-buy-btn" type="button" data-save-settings>Save Settings To Backend</button><div class="sr-output-box" id="srSettingsSyncStatus">Local settings are saved in this browser.</div>`)}
      </section>`, asset('lezawli'));
  }

  function renderMarket(){
    return shell('market','MARKET LINK','Market Premium Signals',
      'Market stays separate from Settings. Link the outside reader, account status, and Premium/Pro interest without breaking the remote panels.',
      `<section class="sr-room-grid"><article class="sr-room-card" style="grid-column:1/-1"><h3>Market Account Status</h3><div id="srMarketStatus" class="sr-real-room-mount"></div><div class="sr-room-actions"><a class="sr-buy-btn" href="https://lasersmarket.com/" target="_blank" rel="noopener">Open Market Reader</a><button class="sr-mini-btn" type="button" data-market-link>Mark Market Interest</button><button class="sr-mini-btn" type="button" data-route="globaltracker">Open Global Tracker</button></div></article></section>`,
      asset('premiumPro'));
  }

  function renderGlobalTracker(){
    return root.renderGlobalTrackerMarkup?.() || shell('globaltracker','GLOBAL TRACKER','Global Tracker',
      'The Global Tracker module is loading. Refresh if this fallback remains visible.',
      '<section class="sr-room-grid"><article class="sr-room-card"><h3>Loading tracker</h3><p>Tracker data mounts here.</p></article></section>',
      asset('premiumPro'));
  }

  function renderAria(){
    return shell('aria','VOICE AI','ARIA Assistant',
      'ARIA handles hair analysis, Profile/Diary history, product guidance, Premium/Pro reads, and account-aware support.',
      `<section class="sr-room-grid">${card('ARIA Voice','Start ARIA and ask hair, product, family/event, Profile, or payment routing questions.',
      `<button class="sr-buy-btn" type="button" data-voice-start="aria">Start ARIA Mic</button><button class="sr-mini-btn" type="button" data-voice-start="aria" data-hands-free="true">Hands-Free ARIA</button>`)}</section>`,
      asset('premiumPro'));
  }

  function renderJake(){
    return shell('jake','VOICE AI','Jake Assistant',
      'Jake handles Studio motherboard sessions, FX, exports, and account-aware Studio Jake coaching.',
      `<section class="sr-room-grid">${card('Jake Voice','Start Jake for studio, FX, recording, and export guidance.',
      `<button class="sr-buy-btn" type="button" data-voice-start="jake">Start Jake Mic</button><button class="sr-mini-btn" type="button" data-voice-start="jake" data-hands-free="true">Hands-Free Jake</button>`)}</section>`,
      asset('studioJake'));
  }

  function afterRender(route){
    if (route === 'faq') setTimeout(()=>root.initFaqReelLounge?.(), 50);
    if (route === 'map') setTimeout(()=>root.mapPerks?.renderPerks?.(document.querySelector('#srMapPerksContainer')), 50);
    if (route === 'market') setTimeout(()=>root.marketLaser?.renderStatus?.(document.querySelector('#srMarketStatus')), 50);
    const moneyRoute = route === 'catalog' ? 'catalog' : route === 'market' ? 'marketFinancial' : route === 'globaltracker' ? 'botOutreach' : '';
    try {
      root.bumpCommerceRank?.(route === 'catalog' || route === 'market' || route === 'globaltracker' ? 'makingMoney' : 'professional', 1, {
        route,
        source:`functional-${route}`,
        moneyRoute
      });
    } catch {}
  }

  function renderPanel(route='diary'){
    const stage = document.querySelector('#remoteStage');
    if (!stage) return;
    const cleanRoute = String(route || 'diary').toLowerCase();
    document.querySelectorAll('[data-route]').forEach(btn=>btn.classList.toggle('active', btn.dataset.route === cleanRoute));
    const map = {
      profile:renderProfile,
      diary:renderDiary,
      studio:renderStudio,
      faq:renderFaq,
      map:renderMap,
      catalog:renderCatalog,
      settings:renderSettings,
      market:renderMarket,
      globaltracker:renderGlobalTracker,
      aria:renderAria,
      jake:renderJake
    };
    stage.innerHTML = (map[cleanRoute] || renderDiary)();
    afterRender(cleanRoute);
  }

  function speakText(text){
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch {}
  }

  async function checkFaqApis(){
    const box = document.querySelector('#srFaqApiStatus');
    if (box) box.textContent = 'Checking FAQ reel APIs...';
    try {
      const [reels, magic, posts] = await Promise.all([
        fetch('/api/faq/reels?category=home&ts=' + Date.now(), { cache:'no-store' }).then(r=>r.json()),
        fetch('/api/faq/magic-hour/status', { cache:'no-store' }).then(r=>r.json()),
        fetch('/api/local-remote/faq/posts?limit=3', { cache:'no-store' }).then(r=>r.json()).catch(()=>({ok:false}))
      ]);
      if (box) box.innerHTML = `<strong>Reels:</strong> ${esc(reels.provider || 'ready')} (${count(reels.items)} clips)<br><strong>Magic Hour:</strong> ${magic.configured ? 'configured' : 'prepared'}<br><strong>Comments:</strong> ${posts.ok ? 'backend feed ready' : 'local feed only'}`;
    } catch (error) {
      if (box) box.textContent = `FAQ API check failed: ${error.message}`;
    }
  }

  async function syncSettings(){
    const box = document.querySelector('#srSettingsSyncStatus');
    if (box) box.textContent = 'Saving settings to backend...';
    const l = loginState();
    const s = settings();
    try {
      const res = await fetch('/api/local-remote/preferences', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          account_username:l.username || accountTag(),
          account_email:l.email || account().email || '',
          account_phone:l.phone || '',
          membership_plan:l.tier || account().tier || '',
          push_notifications:!!s.pushHairReminders,
          aria_response_level:s.assistantMode || 'balanced'
        })
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      if (box) box.textContent = 'Settings saved to backend preferences.';
    } catch (error) {
      if (box) box.textContent = `Backend save unavailable, local settings are still saved. ${error.message}`;
    }
  }

  function bind(){
    if (root.__advancedPanelBind) return;
    root.__advancedPanelBind = true;
    function handleRouteIntent(e){
      const routeBtn = e.target.closest('[data-route]');
      if (!routeBtn) return false;
      const route = routeBtn.dataset.route || 'diary';
      const last = root.__srRouteGuard || {};
      const now = Date.now();
      e.preventDefault();
      e.stopImmediatePropagation();
      if (last.route === route && now - last.at < 250) return true;
      root.__srRouteGuard = { route, at:now };
      (root.renderFunctionalPanel || renderPanel)(route);
      root.navigateTo = root.renderFunctionalPanel || renderPanel;
      if (route === 'aria' || route === 'jake') setTimeout(()=>root.startAssistantSequence?.(route, !!routeBtn.dataset.handsFree), 80);
      return true;
    }
    document.addEventListener('change', e=>{
      const profile = e.target.closest('[data-profile-image]');
      if (profile && profile.files?.[0]) {
        const reader = new FileReader();
        reader.onload = () => {
          write({ profileImage:reader.result });
          try { root.recordProfileImage?.(reader.result); } catch {}
          renderPanel('profile');
        };
        reader.readAsDataURL(profile.files[0]);
      }
      const setting = e.target.closest('[data-sr-setting]');
      if (setting) saveSettings({ [setting.dataset.srSetting]:setting.value });
      const toggle = e.target.closest('[data-sr-toggle]');
      if (toggle) saveSettings({ [toggle.dataset.srToggle]:!!toggle.checked });
    }, true);

    document.addEventListener('pointerdown', e=>{
      handleRouteIntent(e);
    }, true);

    document.addEventListener('click', async e=>{
      if (handleRouteIntent(e)) return;
      const addCart = e.target.closest('[data-cart-add]');
      if (addCart) {
        e.preventDefault();
        addCartItem(addCart.dataset.cartAdd);
        renderPanel('catalog');
        return;
      }
      const incCart = e.target.closest('[data-cart-inc]');
      if (incCart) {
        updateCartQty(incCart.dataset.cartInc, 1);
        renderPanel('catalog');
        return;
      }
      const decCart = e.target.closest('[data-cart-dec]');
      if (decCart) {
        updateCartQty(decCart.dataset.cartDec, -1);
        renderPanel('catalog');
        return;
      }
      const removeCart = e.target.closest('[data-cart-remove]');
      if (removeCart) {
        saveCart(cart().filter(item=>item.id !== removeCart.dataset.cartRemove));
        renderPanel('catalog');
        return;
      }
      if (e.target.closest('[data-cart-clear]')) {
        saveCart([]);
        renderPanel('catalog');
        return;
      }
      const checkoutCart = e.target.closest('[data-cart-checkout]');
      if (checkoutCart) {
        window.open(checkoutCart.dataset.cartCheckout || 'https://shop.supportrd.com/products/support-full-product-line', '_blank', 'noopener');
        return;
      }
      const mapChoice = e.target.closest('[data-map-choice]');
      if (mapChoice) {
        try {
          root.mapPerks?.chooseMap?.(mapChoice.dataset.mapChoice, document.querySelector('#srMapPerksContainer'));
          root.recordMapChoice?.(mapChoice.dataset.mapChoice, 'premium/pro perk tracked');
        } catch {}
        return;
      }
      if (e.target.closest('[data-profile-prep]')) {
        const notes = document.querySelector('[data-profile-notes]')?.value || '';
        const quality1 = document.querySelector('[data-profile-quality-one]')?.value || 'hair confidence signal';
        const quality2 = document.querySelector('[data-profile-quality-two]')?.value || 'routine readiness signal';
        const summary = `Confirmed Hair Summary: ${notes || 'No notes added.'} Quality 1: ${quality1}. Quality 2: ${quality2}.`;
        write({ profileNotes:notes, profileQualities:{ quality1, quality2 }, profileSummary:summary });
        try {
          root.recordHairAnalysis?.({ status:'Confirmed Hair Status', summary, notes, quality1, quality2, qualities:{ quality1, quality2 } });
          root.recordDiaryAssistantHistory?.('ARIA', 'Profile hair summary saved', summary);
        } catch {}
        renderPanel('profile');
        return;
      }
      if (e.target.closest('[data-profile-speak]')) {
        const a = account();
        const latest = (a.profile?.hairAnalyses || [])[0] || {};
        const text = read().profileSummary || latest.premiumRead || latest.summary || 'ARIA has not saved a hair analysis yet. Open the camera and run analysis first.';
        try { root.recordDiaryAssistantHistory?.('ARIA', 'Speak saved hair analysis', text); } catch {}
        speakText(text);
        return;
      }
      if (e.target.closest('[data-comment-add]')) {
        const name = document.querySelector('[data-comment-name]')?.value || 'Guest';
        const text = document.querySelector('[data-comment-text]')?.value || '';
        if (text.trim()) try { root.recordLiveRoomEvent?.({ type:'comment', name, comment:text, text }); } catch {}
        renderPanel('diary');
        return;
      }
      if (e.target.closest('[data-login-save]')) {
        const username = document.querySelector('[data-login-username]')?.value || 'Member';
        const email = document.querySelector('[data-login-email]')?.value || '';
        const phone = document.querySelector('[data-login-phone]')?.value || '';
        const tier = document.querySelector('[data-login-tier]')?.value || 'Free';
        const lowerTier = String(tier).toLowerCase();
        const membershipPlan = lowerTier.includes('studio') ? 'studio' : lowerTier.includes('pro') ? 'pro' : lowerTier.includes('premium') ? 'premium' : 'free';
        const premium = /premium|pro|studio/i.test(tier);
        const pro = /pro|studio/i.test(tier);
        const login = {
          username,
          email,
          phone,
          tier,
          membershipPlan,
          confirmed:true,
          emailVerified:!!email,
          features:{
            diaryPaidLive:premium,
            ariaCelebrations:premium,
            profilePremiumReadings:premium,
            profileSummaryReadings:premium,
            studioPremiumFx:pro,
            studioJake:membershipPlan === 'studio',
            mapPerksSavedToAccount:premium,
            faqRealNamePosting:premium
          },
          at:new Date().toISOString()
        };
        localStorage.setItem('srLoginPanelV27', JSON.stringify(login));
        try { root.activateLoginFeatures?.(login, false); } catch {}
        try { root.patchAccountBackbone?.('market', { linked:/premium|pro|studio|signals/i.test(tier), paid:/premium|pro|studio|signals/i.test(tier), loginEmail:email }); } catch {}
        renderPanel('settings');
        return;
      }
      if (e.target.closest('[data-build-alert]')) {
        const messages = [
          'ARIA reminder: update your profile hair picture before the next scan.',
          'ARIA reminder: dryness or breakage notes are saved. Check Catalog and ask ARIA before wash day.',
          'Jake reminder: your Studio session history is saved. Open Studio Jake when you are ready to record.'
        ];
        const p = document.querySelector('[data-alert-preview]');
        if (p) p.textContent = messages[Math.floor(Math.random() * messages.length)];
        return;
      }
      if (e.target.closest('[data-save-settings]')) {
        await syncSettings();
        return;
      }
      if (e.target.closest('[data-faq-api-check]')) {
        await checkFaqApis();
        return;
      }
      if (e.target.closest('[data-faq-dev-post]')) {
        const text = document.querySelector('[data-faq-dev-text]')?.value || '';
        const rating = document.querySelector('[data-faq-rating]')?.value || '';
        if (text.trim()) {
          try { root.recordDeveloperFeed?.({ text, source:'FAQ Lounge' }); } catch {}
          try {
            await fetch('/api/local-remote/faq/posts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:text, rating, display_name:accountTag() }) });
          } catch {}
        }
        if (rating) try { root.recordFaqRating?.({ rating, surface:'FAQ Lounge' }); } catch {}
        renderPanel('faq');
        return;
      }
      if (e.target.closest('[data-market-link]')) {
        try { root.linkMarketAccount?.(account().email || loginState().email || '', /premium|pro|signals/i.test(tierLabel())); } catch {}
        renderPanel('market');
      }
    }, true);
  }

  function routeFromPath(){
    const path = String(window.location.pathname || '').toLowerCase();
    if (path.includes('globaltracker')) return 'globaltracker';
    if (path.includes('settings')) return 'settings';
    if (path.includes('studio')) return 'studio';
    if (path.includes('profile')) return 'profile';
    if (path.includes('faq')) return 'faq';
    if (path.includes('map')) return 'map';
    if (path.includes('market')) return 'market';
    if (path.includes('catalog') || path.includes('products')) return 'catalog';
    return 'diary';
  }

  function init(){
    root.renderPanel = renderPanel;
    root.renderFunctionalPanel = renderPanel;
    root.navigateTo = renderPanel;
    window.renderPanel = renderPanel;
    bind();
    renderPanel(routeFromPath());
  }

  root.initFunctionalSurfaces = init;
  root.renderFunctionalPanel = renderPanel;
  root.renderFunctionalPanelBase = renderPanel;
})();
