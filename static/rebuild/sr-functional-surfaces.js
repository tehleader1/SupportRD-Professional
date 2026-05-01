(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const KEY = 'srFunctionalRoomsAdvancedV1';

  function read(){ try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
  function write(next){ localStorage.setItem(KEY, JSON.stringify({ ...read(), ...(next || {}) })); return read(); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function account(){ try { return root.getAccountBackbone?.() || {}; } catch { return {}; } }
  function savedCounts(){ const a=account(); const s=a.savedFiles||{}; return {profile:(s.profile||[]).length,diary:(s.diary||[]).length,studio:(s.studio||[]).length,map:(s.mapChange||[]).length}; }

  function shell(route, eyebrow, title, body, inner, image){
    const img = image || root.assets?.healthyHair || '';
    return `<section class="sr-panel sr-functional-panel sr-advanced-panel" data-panel="${esc(route)}"><div class="sr-panel-media sr-functional-media" style="background-image:url('${esc(img)}')"></div><div class="sr-panel-copy sr-functional-copy"><span>${esc(eyebrow)}</span><h2>${esc(title)}</h2><p>${esc(body)}</p>${inner}</div></section>`;
  }

  function card(title, body, extra=''){
    return `<article class="sr-room-card"><h3>${esc(title)}</h3><p>${body}</p>${extra}</article>`;
  }

  function renderDiary(){
    const a=account();
    const channel = (a.username || 'DYGENRJE').toString().toUpperCase();
    return shell('diary','LIVE DIARY CHANNEL','Diary Live Room',`Your live room, guest backlink, comments, payment routing, and ARIA/Jake history stay attached to ^^ ${channel}.`,`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-live-room" style="grid-column:1/-1">
          <h3>Live Webcam + Guest Theater</h3>
          <div id="srDiaryLiveRoom" class="sr-real-room-mount"><video id="srDiaryLiveVideo" playsinline muted></video><div class="sr-room-actions"><button class="sr-buy-btn" type="button" data-diary-open-webcam>Open Webcam</button><button class="sr-mini-btn" type="button" data-diary-close-webcam>Close Webcam</button><button class="sr-mini-btn" type="button" data-diary-record-start>Record Live MP4</button><button class="sr-mini-btn" type="button" data-diary-record-stop>Stop / Save to Account</button></div></div>
          <div class="sr-output-box"><strong>Backlink:</strong> <a href="/accounts/${esc(channel)}" target="_blank" rel="noopener">supportrd.com/accounts/${esc(channel)}</a><br>Current views and live guest comments attach to this account lane.</div>
        </article>
        ${card('Guest Support + Comments','Guests can like, heart, comment, and support the live room. Paid/pro live receiving should be verified by backend entitlement.',`<button class="sr-mini-btn" type="button" data-live-like>Like</button><button class="sr-mini-btn" type="button" data-live-heart>Heart</button><input data-comment-name placeholder="Guest name"><textarea data-comment-text placeholder="Write live comment..."></textarea><button class="sr-buy-btn" data-comment-add type="button">Post Comment</button><input data-pay-amount type="number" min="1" step="1" placeholder="Support amount"><button class="sr-buy-btn" data-diary-shopify-tip type="button">Support Live Room</button>`)}
        ${card('ARIA / Jake History','Hands-free assistant history is saved to Diary and Profile so reads become more personal over time.',`<button class="sr-buy-btn" data-voice-start="aria" data-hands-free="true" type="button">Hands-Free ARIA</button><button class="sr-mini-btn" data-voice-start="jake" data-hands-free="true" type="button">Hands-Free Jake</button><div class="sr-output-box" id="diaryAssistantHistory">Saved assistant history: ${(a.diary?.assistantHistory||[]).length}</div>`)}
      </section>`, root.assets?.healthyHair);
  }

  function renderProfile(){
    const c=savedCounts();
    return shell('profile','PREMIUM / PRO HAIR READ','Profile Hair Intelligence','Upload a profile picture, run the hair camera scan, and save Premium/Pro ARIA hair reads into account history.',`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-profile-camera" style="grid-column:1/-1"><h3>Hair Scan Camera</h3><div id="srHairAnalysisRoom" class="sr-real-room-mount"><video id="srHairVideo" playsinline muted></video><canvas id="srHairCanvas" hidden></canvas><div class="sr-room-actions"><button class="sr-buy-btn" type="button" data-hair-open-camera>Open Camera</button><button class="sr-mini-btn" type="button" data-hair-run-analysis>Analyze + Save Premium/Pro Read</button><button class="sr-mini-btn" type="button" data-hair-close-camera>Close Camera</button></div></div></article>
        ${card('Intelligent Profile Picture','The profile photo is used as an identity anchor and produces two qualities about the person and their hair.',`<input class="sr-file-input" type="file" accept="image/*" data-profile-image><div class="sr-preview-box" id="profileScanPreview">Upload profile picture. Saved profile files: ${c.profile}</div>`)}
        ${card('Confirmed Hair Summary','Save visible hair concerns, ARIA notes, and the confirmed summary into Profile and Diary.',`<textarea data-profile-notes placeholder="Hair problem: dry, oily, tangly, color dullness, wedding/event prep..."></textarea><button class="sr-buy-btn" type="button" data-profile-prep>Save Hair Summary</button><div class="sr-output-box">Premium/Pro read links back to account history.</div>`)}
      </section>`, root.assets?.proGirl);
  }

  function renderStudio(){
    const c=savedCounts();
    return shell('studio','PREMIUM JAKE STUDIO','Studio Motherboard','Record, import MP3/M4A/WAV, build waveform clips, use free FX, and unlock Premium Jake FX based on account tier.',`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-studio-full" style="grid-column:1/-1"><h3>4-Lane Motherboard Studio</h3><div id="srMotherboardContainer" class="sr-real-room-mount"><input type="file" accept="audio/*,.mp3,.m4a,.wav" data-studio-audio><canvas id="srStudioWaveform" height="150"></canvas><div class="sr-room-actions"><button class="sr-mini-btn" type="button" data-studio-rewind>⏪</button><button class="sr-buy-btn" type="button" data-studio-play>▶</button><button class="sr-mini-btn" type="button" data-studio-pause>⏸</button><button class="sr-mini-btn" type="button" data-studio-record>●</button><button class="sr-mini-btn" type="button" data-studio-forward>⏩</button><button class="sr-mini-btn" type="button" data-studio-cut>Cut</button><button class="sr-mini-btn" type="button" data-studio-delete>Delete</button><button class="sr-mini-btn" type="button" data-studio-redo>Redo</button><button class="sr-mini-btn" type="button" data-studio-export-wav>Export</button></div></div></article>
        ${card('Free FX + Premium Jake FX','Choose an FX, adjust strength, and apply to the highlighted clip. Premium FX should be backend-gated later.',`<select data-studio-fx><option>Clean Vocal</option><option>Warm Reverb</option><option>Delay Echo</option><option>Premium Jake: Laser Polish</option><option>Premium Jake: Radio Master</option><option>Premium Jake: Vocal Glue</option></select><input type="range" min="0" max="100" value="40" data-studio-fx-strength><button class="sr-buy-btn" type="button" data-studio-apply-fx>Apply FX</button><button class="sr-mini-btn" data-voice-start="jake" type="button">Ask Jake</button>`)}
        ${card('Saved Studio Files',`Saved songs / exports: <strong>${c.studio}</strong>. Recent imports and Jake studio notes stay attached to the account.`,``)}
      </section>`, root.assets?.studioJake);
  }

  function renderFaq(){
    return shell('faq','LIVE HAIR REELS + COMMUNITY','FAQ Lounge','Mini YouTube-style FAQ Lounge with live hair short-video feeds, 5 community channels, comments, and ARIA reel reads.',`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-reel-card" style="grid-column:1/-1"><h3>Play 10 Second Clip</h3><div id="srTikTokReelContainer" class="sr-real-room-mount"></div></article>
        ${card('Frequently Asked Questions','Common SupportRD questions stay below the live reel system.',`<div class="sr-faq-list"><details open><summary>What does SupportRD do?</summary><p>SupportRD connects hair products, Profile hair scans, Diary Live, Studio Jake, Map perks, Catalog, and account memory.</p></details><details><summary>How does ARIA help?</summary><p>ARIA reads hair concerns, remembers Profile/Diary history, and can analyze FAQ reels for Pro users.</p></details><details><summary>How does Jake help?</summary><p>Jake supports Studio motherboard sessions, waveform editing, FX, and saved exports.</p></details></div>`)}
        ${card('Developer Feed','Post mentions, ratings, and community notes back into the account feed.',`<textarea data-faq-dev-text placeholder="Post developer feed note..."></textarea><input data-faq-rating type="number" min="1" max="5" placeholder="Rating 1-5"><button class="sr-buy-btn" data-faq-dev-post type="button">Post to Developer Feed</button>`)}
      </section>`, root.assets?.dayparty);
  }

  function renderMap(){
    const c=savedCounts();
    const mapNames = root.mapPerks?.getMapNames?.() || ['Swimming Hole','Snow Mountain Pass','Autumn Trail','Desert Cliff','Blissful Geysers','Chocolate Factory'];
    return shell('map','MAP PERKS + ACCOUNT DISCOUNTS','Map Change','Choose a theme map and save perk usage to the account so discounts and used perks can be checked later.',`
      <section class="sr-room-grid"><article class="sr-room-card" style="grid-column:1/-1"><h3>Map Themes</h3><div class="sr-map-choice-grid">${mapNames.map(name=>`<button class="sr-mini-btn" type="button" data-map-choice="${esc(name)}">${esc(name)}</button>`).join('')}</div><details open class="sr-map-perks-details"><summary>Premium / Pro Perks + Saved Usage (${c.map})</summary><div id="srMapPerksContainer" class="sr-real-room-mount"></div></details></article></section>`, root.assets?.hijaFelix);
  }

  function productCard(product){ return `<article class="sr-product-card"><img src="${esc(product.img || root.assets?.healthyHair || '')}" alt="${esc(product.title)}" loading="lazy" onerror="this.style.display='none'"><span>${esc(product.tag || product.price || 'Shop')}</span><h3>${esc(product.title)}</h3><p>${esc(product.desc || '')}</p><a class="sr-buy-btn" href="${esc(product.href || 'https://shop.supportrd.com')}" target="_blank" rel="noopener" data-buy="${esc(product.id || '')}">${esc(product.buy || `Buy / View ${product.title}`)}</a></article>`; }
  function renderCatalog(){
    const packages=Array.isArray(root.packages)?root.packages:[]; const products=Array.isArray(root.products)?root.products:[];
    return shell('catalog','CATALOG / PAYMENTS','Have Healthy Hair Catalog','Health hair promo opens directly into the catalog lane, not the full product line confusion.',`<section class="sr-room-grid"><article class="sr-room-card" style="grid-column:1/-1"><h3>Digital Packages</h3><div class="sr-product-grid">${packages.map(productCard).join('')||'<p>Digital package links are loading.</p>'}</div></article><article class="sr-room-card" style="grid-column:1/-1"><h3>Hair Products</h3><div class="sr-product-grid">${products.map(productCard).join('')||'<p>Product links are loading.</p>'}</div></article></section>`, root.assets?.productFamily);
  }

  function renderSettings(){
    const login=(()=>{try{return JSON.parse(localStorage.getItem('srLoginPanelV27')||'{}')}catch{return {}}})(); const c=savedCounts();
    return shell('settings','ACCOUNT CONTROL CENTER','Settings','Settings controls login, assistant mode, push alerts, Studio default format, and all saved feature files.',`
      <section class="sr-room-grid">
        ${card('Login / Verified State','Login state should become verified after register/login and attach to all rooms.',`<input data-login-username placeholder="Username / tag" value="${esc(login.username||'')}"><input data-login-email placeholder="Email" value="${esc(login.email||'')}"><select data-login-tier><option ${login.tier==='Free'?'selected':''}>Free</option><option ${login.tier==='Premium'?'selected':''}>Premium</option><option ${login.tier==='Pro'?'selected':''}>Pro</option><option ${login.tier==='Premium / Pro'?'selected':''}>Premium / Pro</option></select><button class="sr-buy-btn" data-login-save type="button">Save Login</button>`)}
        ${card('Assistant Defaults','Set ARIA/Jake style for Greeting, Advanced, Inner Circle, or Professional/Making Money.',`<select data-sr-setting="assistantMode"><option>Greeting</option><option>Advanced</option><option>Inner Circle</option><option>Professional / Making Money</option></select><button class="sr-mini-btn" data-build-alert type="button">Preview Push Alert</button><p data-alert-preview>Push alerts will be built backend/device-side next.</p>`)}
        ${card('Studio Default Format','Set default export preference.',`<select data-sr-setting="studioFormat"><option>MP3</option><option>M4A</option></select>`)}
        ${card('Saved Files',`Profile scans/pictures: ${c.profile}<br>Diary live saves/events: ${c.diary}<br>Studio songs/exports: ${c.studio}<br>Map perk uses: ${c.map}`,``)}
      </section>`, root.assets?.lezawli);
  }

  function renderAria(){ return shell('aria','VOICE AI','ARIA Assistant','ARIA handles hair analysis, Profile/Diary history, family hair situations, product guidance, and account-aware reads.',`<section class="sr-room-grid">${card('ARIA Voice','Start ARIA and ask hair, product, family/event, or Profile questions.',`<button class="sr-buy-btn" type="button" data-voice-start="aria">Start ARIA Mic</button><button class="sr-mini-btn" type="button" data-voice-start="aria" data-hands-free="true">Hands-Free ARIA</button>`)}</section>`, root.assets?.premiumPro); }
  function renderJake(){ return shell('jake','VOICE AI','Jake Assistant','Jake handles Studio motherboard sessions, FX, exports, and account-aware premium/pro studio coaching.',`<section class="sr-room-grid">${card('Jake Voice','Start Jake for studio and execution guidance.',`<button class="sr-buy-btn" type="button" data-voice-start="jake">Start Jake Mic</button><button class="sr-mini-btn" type="button" data-voice-start="jake" data-hands-free="true">Hands-Free Jake</button>`)}</section>`, root.assets?.studioJake); }

  function renderPanel(route='diary'){
    const stage=document.querySelector('#remoteStage'); if(!stage)return;
    if(route==='market'||route==='globaltracker')route='settings';
    document.querySelectorAll('[data-route]').forEach(btn=>{if(btn.dataset.route==='market'||btn.dataset.route==='globaltracker'){btn.dataset.route='settings';btn.textContent='Settings'}btn.classList.toggle('active',btn.dataset.route===route)});
    const map={profile:renderProfile,diary:renderDiary,studio:renderStudio,faq:renderFaq,map:renderMap,catalog:renderCatalog,settings:renderSettings,aria:renderAria,jake:renderJake};
    stage.innerHTML=(map[route]||renderDiary)();
    if(route==='faq')setTimeout(()=>root.initFaqReelLounge?.(),50);
    try{root.bumpCommerceRank?.(route==='catalog'?'makingMoney':'professional',1)}catch{}
  }

  function bind(){
    if(root.__advancedPanelBind)return; root.__advancedPanelBind=true;
    document.addEventListener('change',e=>{
      const profile=e.target.closest('[data-profile-image]'); if(profile&&profile.files?.[0]){const reader=new FileReader();reader.onload=()=>{write({profileImage:reader.result});try{root.recordProfileImage?.(reader.result)}catch{}renderPanel('profile')};reader.readAsDataURL(profile.files[0]);}
      const studio=e.target.closest('[data-studio-audio]'); if(studio&&studio.files?.[0]){write({studioAudioName:studio.files[0].name});try{root.recordStudioImport?.({file:studio.files[0].name})}catch{}renderPanel('studio')}
    },true);
    document.addEventListener('click',e=>{
      const mapChoice=e.target.closest('[data-map-choice]'); if(mapChoice){try{root.mapPerks?.chooseMap?.(mapChoice.dataset.mapChoice,document.querySelector('#srMapPerksContainer'));root.recordMapChoice?.(mapChoice.dataset.mapChoice,'premium/pro perk tracked')}catch{}return;}
      if(e.target.closest('[data-profile-prep]')){const notes=document.querySelector('[data-profile-notes]')?.value||'';const summary=`Confirmed Hair Summary: ${notes||'No notes added.'} ARIA should compare this with future Diary and FAQ reel history.`;write({profileSummary:summary});try{root.recordHairAnalysis?.({status:'Confirmed Hair Status',summary,notes})}catch{}renderPanel('profile')}
      if(e.target.closest('[data-comment-add]')){const name=document.querySelector('[data-comment-name]')?.value||'Guest';const text=document.querySelector('[data-comment-text]')?.value||'';if(text.trim())try{root.recordLiveRoomEvent?.({type:'comment',name,text})}catch{}renderPanel('diary')}
      if(e.target.closest('[data-login-save]')){const username=document.querySelector('[data-login-username]')?.value||'Member';const email=document.querySelector('[data-login-email]')?.value||'';const tier=document.querySelector('[data-login-tier]')?.value||'Free';localStorage.setItem('srLoginPanelV27',JSON.stringify({username,email,tier,confirmed:true,at:new Date().toISOString()}));renderPanel('settings')}
      if(e.target.closest('[data-faq-dev-post]')){const text=document.querySelector('[data-faq-dev-text]')?.value||'';const rating=document.querySelector('[data-faq-rating]')?.value||'';if(text.trim())try{root.recordDeveloperFeed?.({text,source:'FAQ Lounge'})}catch{}if(rating)try{root.recordFaqRating?.({rating,surface:'FAQ Lounge'})}catch{}renderPanel('faq')}
    },true);
  }

  function init(){ root.renderPanel=renderPanel; root.renderFunctionalPanel=renderPanel; window.renderPanel=renderPanel; bind(); renderPanel('diary'); }
  root.initFunctionalSurfaces=init;
  root.renderFunctionalPanel=renderPanel;
})();