(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};

  const ASSETS = {
    packageCouple:'/static/images/pass24/package_couple.jpg',
    studioJake:'/static/images/pass24/studio_jake_robe.jpg',
    proGirl:'/static/images/pass24/support_model.jpg',
    premiumPro:'/static/images/pass24/premium_pro_jewels.jpg',
    productFamily:'/static/images/pass24/product_family.jpeg',
    brightDroplets:'/static/images/pass24/bright_droplets.jpeg',
    fastDropper:'/static/images/pass24/fast_dropper.jpg',
    formulaExclusive:'/static/images/pass24/formula_exclusive.jpg',
    lacceador:'/static/images/pass24/lacceador.jpg',
    mask:'/static/images/pass24/mask.jpg',
    shampoo:'/static/images/pass24/shampoo.jpg',
    dayparty:'/static/images/pass24/dayparty.jpg',
    artists:'/static/images/pass24/artists.jpg',
    healthyHair:'/static/images/pass24/healthy_hair.jpeg',
    hijaFelix:'/static/images/pass24/hija_felix.jpeg',
    lezawli:'/static/images/pass24/lezawli.jpeg'
  };

  const PRODUCTS = [
    {id:'shampoo', title:'Shampoo', price:'Catalog', img:ASSETS.shampoo, desc:'Daily cleansing lane with SupportRD product energy.', tag:'Hair product'},
    {id:'formula', title:'Formula Exclusiva Anti-Fall', price:'Catalog', img:ASSETS.formulaExclusive, desc:'Premium formula lane for serious hair support.', tag:'Anti-fall'},
    {id:'gotero', title:'Fast Dropper / Gotero', price:'Catalog', img:ASSETS.fastDropper, desc:'Scalp movement and dropper-focused product lane.', tag:'Scalp'},
    {id:'bright', title:'Bright Droplets', price:'Catalog', img:ASSETS.brightDroplets, desc:'Shine and evenness lane for styling finish.', tag:'Shine'},
    {id:'lacceador', title:'Lacceador Crece', price:'Catalog', img:ASSETS.lacceador, desc:'Restructuring and softness product lane.', tag:'Styling'},
    {id:'mask', title:'Mascarilla / Mask', price:'Catalog', img:ASSETS.mask, desc:'Deep natural blender and avocado mask lane.', tag:'Condition'}
  ];

  const PACKAGES = [
    {id:'studio-jake', title:'Studio Jake Premium', price:'$100/mo', img:ASSETS.studioJake, desc:'Jake studio lane for exports, FX, adlibs, beat-to-vocal alignment, and motherboard-ready .wav work.', buy:'Buy Studio'},
    {id:'premium', title:'Premium Inner Circle', price:'$35/mo', img:ASSETS.premiumPro, desc:'Inner Circle access with premium ARIA support, profile credibility, and guided hair/account flow.', buy:'Buy Premium'},
    {id:'pro', title:'Professional / Making Money Pro', price:'$50/mo', img:ASSETS.proGirl, desc:'Aria Voice professional tier for serious users building Professional and Making Money rank.', buy:'Buy Pro'},
    {id:'catalog', title:'SupportRD Product Catalog', price:'Shop', img:ASSETS.productFamily, desc:'Natural hair product catalog with Shampoo, Gotero, Formula, Mask, Lacceador, and Bright Droplets.', buy:'Open Catalog'}
  ];

  const PANELS = {
    diary: {
      eyebrow:'Live feature',
      title:'Diary',
      image:ASSETS.healthyHair,
      body:'Live posting, hands-free ARIA conversation, hair-analysis history, social posting, and tip movement in one serious lane.',
      features:[
        ['Live Feature','Go live with comments, support, and tip movement.'],
        ['Post to Social','Prepare posts for X, Facebook, Instagram, Reddit, Tumblr, TikTok and add images/videos.'],
        ['Hands Free','Mic-first ARIA mode so the conversation keeps moving.'],
        ['History','Aria/Jake conversations and hair-analysis history stay connected.']
      ]
    },
    studio: {
      eyebrow:'Motherboard creation',
      title:'Studio',
      image:ASSETS.studioJake,
      body:'Studio is tuned for creation: .wav export, FX memory, adlib checks, beat-to-vocal alignment, and Jake execution support.',
      features:[
        ['.wav Export','Make clean export behavior central.'],
        ['Adlib Check','Confirm adlibs before final output.'],
        ['Beat/Vocal Alignment','Keep vocal timing serious.'],
        ['FX Memory','Remember the effect before export.']
      ]
    },
    profile: {
      eyebrow:'Professional identity',
      title:'Profile',
      image:ASSETS.proGirl,
      body:'Profile is the serious professional lane: AI prep, hair analysis, credibility, account seriousness, and profile image strength.',
      features:[
        ['AI Prep','Prepare identity and route behavior.'],
        ['Hair Analysis','Keep analysis history connected to Diary.'],
        ['Serious Image','Professional image surface for trust/background-check style review.'],
        ['Rank Signal','Professional and Making Money scores build here.']
      ]
    },
    faq: {
      eyebrow:'SEO/social proof',
      title:'FAQ Lounge',
      image:ASSETS.dayparty,
      body:'FAQ Lounge carries human proof, comments, recent work, featured mentions, reels, map story, and the SEO/TikTok bridge.',
      features:[
        ['Developer Feed','Comments and real feedback.'],
        ['Recent Works','Show activity from other sites and projects.'],
        ['Featured Mentions','Keep external proof visible.'],
        ['Map Story','Interactive origin story for each map.']
      ]
    },
    map: {
      eyebrow:'Perks and worlds',
      title:'Map Change',
      image:ASSETS.hijaFelix,
      body:'Map Change changes the behavior of the app: Swimming Hole, Snow Mountain, Autumn Trail, Desert Cliff, Blissful Geysers, and Chocolate Factory.',
      features:[
        ['Perks','Each map changes what the page does.'],
        ['Account Reflection','Serious usage builds Professional/Making Money contact rank.'],
        ['Surface Effects','Diary, Studio, Profile, FAQ and Payments react to the map.'],
        ['CLS Safe','Effects happen inside stable panels.']
      ]
    },
    market: {
      eyebrow:'Market reader',
      title:'Laser Reader',
      image:ASSETS.artists,
      body:'Separate website markets run through reader identifiers: workday SEO laser, Shopify finance reader, public pulse reader, map-surface laser, and catalog-payment reader.',
      features:[
        ['workday-seo-laser','Reads workday SEO rhythm and market tone.'],
        ['shopify-finance-reader','Reads Shopify balance/payout readiness when the endpoint is live.'],
        ['map-surface-laser','Reads active map, perk, and surface behavior.'],
        ['catalog-payment-reader','Reads product intent and Making Money seriousness.']
      ]
    },
    catalog: {
      eyebrow:'Purchase lane',
      title:'Catalog / Payments',
      image:ASSETS.productFamily,
      body:'SupportRD is also a purchasing website. Products and packages stay visible, professional, and ready for Shopify/live checkout.',
      features:[
        ['Products','Shampoo, Formula, Gotero, Bright Droplets, Lacceador and Mask.'],
        ['Packages','Studio Jake, Premium Inner Circle, Pro Professional/Making Money.'],
        ['Fast Pay','Payment intent and support movement.'],
        ['Rank','Money movement affects seriousness.']
      ]
    },
    aria: {
      eyebrow:'AI voice',
      title:'ARIA Assistant',
      image:ASSETS.premiumPro,
      body:'ARIA is the hair, map, profile, Diary history, and Making Money guidance assistant. Free-roam mode moves her around the screen to get attention.',
      features:[
        ['Hair Guidance','Routine, conditioner, wet-care, and map guidance.'],
        ['Voice Lane','Aria Voice supports Professional/Making Money tier.'],
        ['Diary History','Sends users back to history and analysis.'],
        ['Rank Support','Serious interactions build account value.']
      ]
    },
    jake: {
      eyebrow:'Execution AI',
      title:'Jake Assistant',
      image:ASSETS.studioJake,
      body:'Jake is the Studio assistant for exports, FX, adlibs, beat-to-vocal alignment, and making sure the correct file gets delivered.',
      features:[
        ['Studio Check','Confirm the session is ready.'],
        ['Export Guard','Push .wav/correct file discipline.'],
        ['FX Memory','Remember effects.'],
        ['Execution','Keep the user moving.']
      ]
    },
    settings: {
      eyebrow:'Account control',
      title:'Settings',
      image:ASSETS.lezawli,
      body:'Settings holds account choices, option history, ratings, seriousness, and admin-visible proof of who is taking the program seriously.',
      features:[
        ['Options','Every important button should reflect somewhere.'],
        ['History','Account option changes become history.'],
        ['Ratings','Admin rates seriousness by surface.'],
        ['Protection','Making-money account protection status.']
      ]
    }
  };

  function getState(){
    try { return JSON.parse(localStorage.getItem('srCommerceRankState') || '{}'); } catch { return {}; }
  }
  function saveState(state){
    localStorage.setItem('srCommerceRankState', JSON.stringify(state || {}));
  }
  function bump(kind, amount){
    const state = getState();
    state[kind] = Number(state[kind] || 0) + Number(amount || 1);
    state.history = [{kind, amount, at:new Date().toISOString()}, ...(state.history || [])].slice(0,50);
    saveState(state);
    renderRankStrip();
    return state;
  }

  async function refreshShopifyStatus(){
    const state = getState();
    state.shopify = state.shopify || {status:'watch', balance:'Live endpoint pending', updatedAt:''};
    try {
      const res = await fetch('/api/finance/shopify-status', {cache:'no-store'});
      if (res.ok) {
        const data = await res.json();
        state.shopify = {
          status:'connected',
          balance:data.balance || data.summary || 'Connected',
          updatedAt:new Date().toISOString()
        };
      }
    } catch {
      state.shopify = {
        status:'fallback',
        balance:'Static preview. Verify Shopify endpoint live.',
        updatedAt:new Date().toISOString()
      };
    }
    saveState(state);
    renderRankStrip();
  }

  function renderAds(){
    const top = document.querySelector('#topAdStrip');
    const side = document.querySelector('#rightAdStrip');
    if (top) top.innerHTML = PACKAGES.map(p=>`
      <article class="sr-ad-card">
        <img src="${p.img}" alt="${p.title}" loading="lazy">
        <div><span>${p.price}</span><strong>${p.title}</strong><p>${p.desc}</p></div>
        <button class="sr-buy-btn" data-buy="${p.id}">${p.buy}</button>
      </article>
    `).join('');
    const sideItems = [
      ...PACKAGES,
      {id:'dayparty', title:'Dayparty Visibility', price:'Promo', img:ASSETS.dayparty, desc:'Run culture, reels, and live proof around the Remote.', buy:'Boost'},
      {id:'artists', title:'Artist Market', price:'SEO', img:ASSETS.artists, desc:'Market reader follows the public pulse and music culture lane.', buy:'Scan'}
    ];
    if (side) side.innerHTML = sideItems.map(p=>`
      <article class="sr-side-ad">
        <img src="${p.img}" alt="${p.title}" loading="lazy">
        <div><span>${p.price}</span><h3>${p.title}</h3><p>${p.desc}</p><button class="sr-buy-btn" data-buy="${p.id}">${p.buy}</button></div>
      </article>
    `).join('');
  }

  function productGrid(){
    return `<div class="sr-product-grid">${PRODUCTS.map(p=>`
      <article class="sr-product-card">
        <img src="${p.img}" alt="${p.title}" loading="lazy">
        <span>${p.tag}</span>
        <h3>${p.title}</h3>
        <p>${p.desc}</p>
        <button class="sr-buy-btn" data-product="${p.id}">Buy / View ${p.title}</button>
      </article>
    `).join('')}</div>`;
  }

  function renderPanel(route='diary'){
    const panel = PANELS[route] || PANELS.diary;
    const stage = document.querySelector('#remoteStage');
    if (!stage) return;
    document.querySelectorAll('[data-route]').forEach(btn=>btn.classList.toggle('active', btn.dataset.route === route));
    const extra = route === 'catalog' ? productGrid() : '';
    stage.innerHTML = `
      <section class="sr-panel" data-panel="${route}">
        <div class="sr-panel-media" style="background-image:url('${panel.image}')"></div>
        <div class="sr-panel-copy">
          <span>${panel.eyebrow}</span>
          <h2>${panel.title}</h2>
          <p>${panel.body}</p>
          <div class="sr-feature-grid">
            ${panel.features.map(([title, body])=>`<article><strong>${title}</strong><small>${body}</small></article>`).join('')}
          </div>
          ${extra}
          <div class="sr-assistant-actions">
            <button class="sr-buy-btn" data-action="serious" data-route-action="${route}">Mark Serious</button>
            <button class="sr-mini-btn" data-route="catalog">Open Catalog</button>
            <button class="sr-mini-btn sr-settings-btn" data-route="settings">Settings</button>
          </div>
        </div>
      </section>
    `;
    bump(route === 'catalog' ? 'makingMoney' : 'professional', 1);
  }

  function renderRankStrip(){
    const state = getState();
    const el = document.querySelector('#rankStrip');
    if (!el) return;
    const pro = Number(state.professional || 0);
    const money = Number(state.makingMoney || 0);
    const serious = Number(state.serious || 0);
    const shopify = state.shopify || {status:'watch', balance:'Verify live'};
    el.innerHTML = `
      <article><span>#1 Professional</span><strong>${pro}</strong><small>ARIA rank contact score</small></article>
      <article><span>#1 Making Money</span><strong>${money}</strong><small>Catalog/payment seriousness</small></article>
      <article><span>Seriousness</span><strong>${serious}</strong><small>Admin visible usage signal</small></article>
      <article><span>Shopify</span><strong>${shopify.status || 'watch'}</strong><small>${shopify.balance || 'Verify endpoint'}</small></article>
    `;
  }

  function bind(){
    document.addEventListener('click', event=>{
      const routeBtn = event.target.closest('[data-route]');
      if (routeBtn) {
        renderPanel(routeBtn.dataset.route);
        return;
      }
      const buy = event.target.closest('[data-buy], [data-product]');
      if (buy) {
        bump('makingMoney', 5);
        renderPanel('catalog');
        return;
      }
      const serious = event.target.closest('[data-action="serious"]');
      if (serious) {
        bump('serious', 3);
        bump('professional', 2);
      }
    });
  }

  function initCommerceRank(){
    renderAds();
    renderPanel('diary');
    renderRankStrip();
    bind();
    refreshShopifyStatus();
  }

  root.assets = ASSETS;
  root.products = PRODUCTS;
  root.packages = PACKAGES;
  root.renderPanel = renderPanel;
  root.renderAds = renderAds;
  root.renderRankStrip = renderRankStrip;
  root.bumpCommerceRank = bump;
  root.refreshShopifyStatus = refreshShopifyStatus;
  root.initCommerceRank = initCommerceRank;
  window.renderPanel = renderPanel;
})();
