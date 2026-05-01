(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};

  const ASSETS = {
    packageCouple:'/static/images/package_couple.jpg',
    studioJake:'/static/images/studio_jake_robe.jpg',
    proGirl:'/static/images/support_model.jpg',
    premiumPro:'/static/images/premium_pro_jewels.jpg',
    productFamily:'/static/images/product_family.jpeg',
    brightDroplets:'/static/images/bright_droplets.jpeg',
    fastDropper:'/static/images/fast_dropper.jpg',
    formulaExclusive:'/static/images/formula_exclusive.jpg',
    lacceador:'/static/images/lacceador.jpg',
    mask:'/static/images/mask.jpg',
    shampoo:'/static/images/shampoo.jpg',
    dayparty:'/static/images/dayparty.jpg',
    artists:'/static/images/artists.jpg',
    healthyHair:'/static/images/healthy_hair.jpeg',
    hijaFelix:'/static/images/hija_felix.jpeg',
    lezawli:'/static/images/lezawli.jpeg'
  };

  const PRODUCTS = [
    {id:'bright', title:'Bright Droplets', price:'Shop', href:'https://shop.supportrd.com/products/bright-droplets', img:ASSETS.brightDroplets, desc:'Shine, softness and finish support.', tag:'Shine'},
    {id:'formula', title:'Exclusive Formula Anti-Fall', price:'Shop', href:'https://shop.supportrd.com/products/exclusive-formula-anti-fall', img:ASSETS.formulaExclusive, desc:'Anti-fall support lane for serious hair care.', tag:'Anti-fall'},
    {id:'lacceador', title:'Lacceador Crece', price:'Shop', href:'https://shop.supportrd.com/products/lacceador-crece', img:ASSETS.lacceador, desc:'Restructuring, growth support and softness lane.', tag:'Styling'},
    {id:'shampoo', title:'Shampoo', price:'Shop', href:'https://shop.supportrd.com/products/shampoo', img:ASSETS.shampoo, desc:'Cleanse, condition and daily hair support.', tag:'Wash'},
    {id:'mask', title:'Mascarilla / Mask', price:'Shop', href:'https://shop.supportrd.com/products/mascarilla', img:ASSETS.mask, desc:'Deep conditioner mask lane.', tag:'Condition'},
    {id:'full-line', title:'Support Full Product Line', price:'Shop', href:'https://shop.supportrd.com/products/support-full-product-line', img:ASSETS.productFamily, desc:'Full SupportRD product family.', tag:'Bundle'}
  ];

  const PACKAGES = [
    {id:'studio-jake', title:'Studio Jake Premium', price:'$100/mo', href:'https://shop.supportrd.com/products/jake-in-the-studio-studio-tier-professional-studio-account', img:ASSETS.studioJake, desc:'Jake studio lane for exports, FX, adlibs, beat-to-vocal alignment, and motherboard-ready .wav work.', buy:'Buy Studio'},
    {id:'premium-inner', title:'Premium Inner Circle', price:'$35/mo', href:'https://shop.supportrd.com/products/aria-ai-voice-inner-circle-tier-premium-account', img:ASSETS.premiumPro, desc:'Inner Circle access with premium ARIA support, profile credibility, and guided hair/account flow.', buy:'Buy Premium'},
    {id:'pro-making-money', title:'Professional / Making Money Pro', price:'$50/mo', href:'https://shop.supportrd.com/products/aria-professional-making-money-tier-professional-account', img:ASSETS.proGirl, desc:'Aria Voice professional tier for serious users building Professional and Making Money rank.', buy:'Buy Pro'},
    {id:'catalog', title:'SupportRD Product Catalog', price:'Shop', href:'https://shop.supportrd.com/products/support-full-product-line', img:ASSETS.productFamily, desc:'Natural hair product catalog with Shampoo, Gotero, Formula, Mask, Lacceador, and Bright Droplets.', buy:'Open Catalog'}
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
    if (top) {
      const uniquePackages = PACKAGES.filter((p, index, arr)=>arr.findIndex(x=>x.id===p.id)===index);
      top.innerHTML = uniquePackages.map(p=>`
        <article class="sr-ad-card" data-ad-id="${p.id}">
          <img src="${p.img}" alt="${p.title}" loading="lazy" onerror="this.style.display='none'">
          <div><span>${p.price}</span><strong>${p.title}</strong><p>${p.desc}</p></div>
          <a class="sr-buy-btn" href="${p.href || '#'}" target="_blank" rel="noopener" data-buy="${p.id}">${p.buy}</a>
        </article>
      `).join('');
    }
    const sideItems = [
      {id:'bright-droplets', title:'Bright Droplets', price:'Shop', img:ASSETS.brightDroplets, desc:'Shine and finish product lane.', href:'https://shop.supportrd.com/products/bright-droplets', buy:'Buy'},
      {id:'formula-anti-fall', title:'Exclusive Formula Anti-Fall', price:'Shop', img:ASSETS.formulaExclusive, desc:'Anti-fall product lane.', href:'https://shop.supportrd.com/products/exclusive-formula-anti-fall', buy:'Buy'},
      {id:'lacceador-crece', title:'Lacceador Crece', price:'Shop', img:ASSETS.lacceador, desc:'Styling and elasticity support.', href:'https://shop.supportrd.com/products/lacceador-crece', buy:'Buy'},
      {id:'shampoo', title:'Shampoo', price:'Shop', img:ASSETS.shampoo, desc:'Daily wash lane.', href:'https://shop.supportrd.com/products/shampoo', buy:'Buy'},
      {id:'mask', title:'Mascarilla', price:'Shop', img:ASSETS.mask, desc:'Conditioning mask lane.', href:'https://shop.supportrd.com/products/mascarilla', buy:'Buy'},
      {id:'market-laser', title:'Market Laser', price:'Live', img:ASSETS.artists, desc:'Open SupportRD market reader.', href:'https://lasersmarket.com/', buy:'Open'}
    ];
    if (side) side.innerHTML = sideItems.map(p=>`
      <article class="sr-side-ad" data-ad-id="${p.id}">
        <img src="${p.img}" alt="${p.title}" loading="lazy" onerror="this.style.display='none'">
        <div><span>${p.price}</span><h3>${p.title}</h3><p>${p.desc}</p><a class="sr-buy-btn" href="${p.href}" target="_blank" rel="noopener" data-buy="${p.id}">${p.buy}</a></div>
      </article>
    `).join('');
  }


  function productGrid(){
    return `<div class="sr-product-grid">${PRODUCTS.map(p=>`
      <article class="sr-product-card">
        <img src="${p.img}" alt="${p.title}" loading="lazy">
        <span>${p.tag} · ${p.price}</span>
        <h3>${p.title}</h3>
        <p>${p.desc}</p>
        <a class="sr-buy-btn" href="${p.href}" target="_blank" rel="noopener" data-product="${p.id}">Buy / View ${p.title}</a>
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
