(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const KEY = 'srFunctionalRoomsV26';
  const MARKET_URL = 'https://market-do8p.onrender.com/';

  function read(){
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  }

  function write(state){
    localStorage.setItem(KEY, JSON.stringify(state || {}));
    return state;
  }

  function patch(update){
    return write({ ...read(), ...(update || {}) });
  }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, (char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function panelShell(route, eyebrow, title, body, inner, image){
    const img = image || root.assets?.healthyHair || '';
    return `
      <section class="sr-panel sr-functional-panel" data-panel="${route}">
        <div class="sr-panel-media sr-functional-media" style="background-image:url('${img}')"></div>
        <div class="sr-panel-copy sr-functional-copy">
          <span>${eyebrow}</span>
          <h2>${title}</h2>
          <p>${body}</p>
          ${inner}
        </div>
      </section>
    `;
  }

  function renderProfile(){
    return panelShell('profile','OPEN CAMERA HAIR ANALYSIS','Profile Prep Room','Open camera, look left, look right, confirm hair, receive spoken hair analysis for texture and damage indicators, then save confirmed hair status to account history.',`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-profile-camera" style="grid-column:1/-1">
          <h3>Hair Analysis Camera</h3>
          <div id="srHairAnalysisRoom" class="sr-real-room-mount">
            <video id="srHairVideo" playsinline muted></video>
            <canvas id="srHairCanvas" hidden></canvas>
            <div class="sr-room-actions">
              <button class="sr-buy-btn" type="button" data-hair-open-camera>Open Camera</button>
              <button class="sr-mini-btn" type="button" data-hair-run-analysis>Look Left / Right + Analyze</button>
              <button class="sr-mini-btn" type="button" data-hair-close-camera>Close Camera</button>
            </div>
          </div>
        </article>
        <article class="sr-room-card">
          <h3>AI Prep Summary</h3>
          <textarea data-profile-notes placeholder="Hair problem: tangly, oily, damaged, burned, not bouncy, dry, lack of color..."></textarea>
          <button class="sr-buy-btn" type="button" data-profile-prep>Save Prep Summary</button>
          <div class="sr-output-box">Hair analysis response saves to Profile and Aria/Jake history.</div>
        </article>
        <article class="sr-room-card">
          <h3>Optional Hair Profile Picture</h3>
          <input class="sr-file-input" type="file" accept="image/*" data-profile-image>
          <div class="sr-preview-box" id="profileScanPreview">Optional profile hair image.</div>
        </article>
      </section>
    `, root.assets?.proGirl);
  }


  function renderDiary(){
    return panelShell('diary','LIVE WEBCAM ROOM','Diary Live Room','Actual live webcam room with live video, comments, likes/hearts, Shopify guest support checkout, Aria/Jake history, and hands-free mode.',`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-live-room">
          <h3>Live Webcam Room</h3>
          <div id="srDiaryLiveRoom" class="sr-real-room-mount">
            <video id="srDiaryLiveVideo" playsinline muted></video>
            <div class="sr-room-actions">
              <button class="sr-buy-btn" type="button" data-diary-open-webcam>Open Webcam</button>
              <button class="sr-mini-btn" type="button" data-diary-close-webcam>Close Webcam</button>
              <button class="sr-mini-btn" type="button" data-diary-record-start>Record</button>
              <button class="sr-mini-btn" type="button" data-diary-record-stop>Stop / Save</button>
            </div>
          </div>
        </article>
        <article class="sr-room-card">
          <h3>Guest Live Actions</h3>
          <button class="sr-mini-btn" type="button" data-live-like>Like</button>
          <button class="sr-mini-btn" type="button" data-live-heart>Heart</button>
          <input data-comment-name placeholder="Guest name">
          <textarea data-comment-text placeholder="Write live comment..."></textarea>
          <button class="sr-buy-btn" data-comment-add type="button">Post Comment</button>
          <input data-pay-amount type="number" min="1" step="1" placeholder="Support amount">
          <button class="sr-buy-btn" data-diary-shopify-tip type="button">Pay Live Streamer with Shopify</button>
        </article>
        <article class="sr-room-card">
          <h3>Hands-Free + History</h3>
          <button class="sr-buy-btn" data-voice-start="aria" data-hands-free="true" type="button">Hands-Free ARIA</button>
          <button class="sr-mini-btn" data-voice-start="jake" data-hands-free="true" type="button">Hands-Free Jake</button>
          <div class="sr-output-box" id="diaryAssistantHistory">Assistant history is saved to Account Backbone.</div>
        </article>
      </section>
    `, root.assets?.healthyHair);
  }


  function renderStudio(){
    return panelShell('studio','CREATE SONG + MOTHERBOARD','Studio Motherboard','Actual Studio room with MP3/M4A upload, clickable motherboard, playback, waveform highlight, cut/delete, FX board, export, imports/exports history, and Jake history.',`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-studio-full" style="grid-column:1/-1">
          <h3>Motherboard Studio</h3>
          <div id="srMotherboardContainer" class="sr-real-room-mount">
            <input type="file" accept="audio/*,.mp3,.m4a,.wav" data-studio-audio>
            <canvas id="srStudioWaveform" height="120"></canvas>
            <div class="sr-room-actions">
              <button class="sr-buy-btn" type="button" data-studio-play>Playback</button>
              <button class="sr-mini-btn" type="button" data-studio-highlight>Highlight</button>
              <button class="sr-mini-btn" type="button" data-studio-cut>Cut</button>
              <button class="sr-mini-btn" type="button" data-studio-delete>Delete</button>
              <button class="sr-mini-btn" type="button" data-studio-export-wav>Export WAV</button>
            </div>
          </div>
        </article>
        <article class="sr-room-card">
          <h3>Instrument / FX Board</h3>
          <button class="sr-mini-btn" type="button" data-fx="reverb">Reverb</button>
          <button class="sr-mini-btn" type="button" data-fx="delay">Delay</button>
          <button class="sr-mini-btn" type="button" data-fx="clean">Clean Vocal</button>
          <button class="sr-buy-btn" type="button" data-voice-start="jake">Ask Jake</button>
        </article>
        <article class="sr-room-card">
          <h3>Account Studio History</h3>
          <div class="sr-output-box">Imports, last 3 exports, and Jake Studio history save to the account backbone.</div>
        </article>
      </section>
    `, root.assets?.studioJake);
  }


  function renderFaq(){
    return panelShell('faq','10 SECOND REEL + FAQ','FAQ Lounge','Actual FAQ Lounge with TikTok-style 10-second hair reel mount, real frequently asked questions, developer feed comments, ratings, and mentions saved to account.',`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-reel-card">
          <h3>10 Second TikTok Hair Reel</h3>
          <div id="srTikTokReelContainer" class="sr-real-room-mount"></div>
          <button class="sr-buy-btn" data-reel-play type="button">Play 10s Reel</button>
        </article>
        <article class="sr-room-card">
          <h3>Frequently Asked Questions</h3>
          <div class="sr-faq-list">
            <details open><summary>What does SupportRD do?</summary><p>SupportRD connects hair products, AI guidance, live Diary, Studio, Profile, FAQ, Catalog, Map perks, and Market Laser.</p></details>
            <details><summary>How does ARIA help?</summary><p>ARIA answers hair questions, runs voice guidance, routes analysis to Profile/Diary, and helps with product direction.</p></details>
            <details><summary>How does Jake help?</summary><p>Jake handles Studio creation, vocals, FX, playback, export discipline, and motherboard checks.</p></details>
            <details><summary>How can guests pay live?</summary><p>Diary uses Shopify support/tip checkout through the configured live support product variant.</p></details>
            <details><summary>What is Market Laser?</summary><p>Market Laser connects the Render market website, market signals, and account login status.</p></details>
          </div>
        </article>
        <article class="sr-room-card">
          <h3>Developer Feed</h3>
          <textarea data-faq-dev-text placeholder="Post live developer comment, mention, rating, or website mention..."></textarea>
          <input data-faq-rating type="number" min="1" max="5" placeholder="Rating 1-5">
          <button class="sr-buy-btn" data-faq-dev-post type="button">Post to Developer Feed</button>
          <button class="sr-mini-btn" data-route="market" type="button">Scan Market Laser</button>
        </article>
      </section>
    `, root.assets?.dayparty);
  }


  function renderMap(){
    return panelShell('map','MAP CHANGE + PERKS','Map Change','Choose a map to change the whole app background/layout and reveal perks in a collapsible window.',`
      <section class="sr-room-grid">
        <article class="sr-room-card" style="grid-column:1/-1">
          <h3>Change Map</h3>
          <div class="sr-map-choice-grid">
            ${['Swimming Hole','Snow Mountain Pass','Autumn Trail','Desert Cliff','Blissful Geysers','Chocolate Factory'].map(name=>`<button class="sr-mini-btn" type="button" data-map-choice="${name}">${name}</button>`).join('')}
          </div>
          <details open class="sr-map-perks-details">
            <summary>Available Perks</summary>
            <div id="srMapPerksContainer" class="sr-real-room-mount"></div>
          </details>
        </article>
      </section>
    `, root.assets?.hijaFelix);
  }

function renderMarket(){
    return panelShell('market','LIVE MARKET LINK + LASER CHARTS','Market Laser','Market Laser shows the live Render market link, account link status, and laser chart mount for market signals.',`
      <section class="sr-room-grid">
        <article class="sr-room-card">
          <h3>Live Market Website</h3>
          <a class="sr-buy-btn" href="https://market-do8p.onrender.com/" target="_blank" rel="noopener">Open market-do8p.onrender.com</a>
          <input data-market-email placeholder="Market login email">
          <label class="sr-check-row"><input data-market-paid type="checkbox"> $25,000 Live Signals paid account</label>
          <button class="sr-mini-btn" data-market-login-save type="button">Connect Market Account</button>
        </article>
        <article class="sr-room-card" style="grid-column:1/-1">
          <h3>Laser Charts</h3>
          <div id="srMarketStatus" class="sr-real-room-mount"></div>
          <div class="sr-laser-chart-grid">
            <div class="sr-laser-bar" style="--h:75%"><span>SEO</span></div>
            <div class="sr-laser-bar" style="--h:55%"><span>Shopify</span></div>
            <div class="sr-laser-bar" style="--h:82%"><span>Map</span></div>
            <div class="sr-laser-bar" style="--h:64%"><span>Catalog</span></div>
          </div>
        </article>
      </section>
    `, root.assets?.artists);
  }


  function productCard(product){
    return `
      <article class="sr-product-card">
        <img src="${esc(product.img || root.assets?.healthyHair || '')}" alt="${esc(product.title)}" loading="lazy" onerror="this.style.display='none'">
        <span>${esc(product.tag || product.price || 'Shop')}</span>
        <h3>${esc(product.title)}</h3>
        <p>${esc(product.desc || '')}</p>
        <a class="sr-buy-btn" href="${esc(product.href || 'https://shop.supportrd.com')}" target="_blank" rel="noopener" data-buy="${esc(product.id || '')}">${esc(product.buy || `Buy / View ${product.title}`)}</a>
      </article>
    `;
  }

  function renderCatalog(){
    const packages = Array.isArray(root.packages) ? root.packages : [];
    const products = Array.isArray(root.products) ? root.products : [];
    return panelShell('catalog','CATALOG / PAYMENTS','Have Healthy Hair Catalog','Products, digital packages, Shopify purchase links, support payments, and Professional / Making Money intent stay in one clean lane.',`
      <section class="sr-room-grid">
        <article class="sr-room-card" style="grid-column:1/-1">
          <h3>Digital Packages</h3>
          <div class="sr-product-grid">${packages.map(productCard).join('') || '<p>Digital package links are loading.</p>'}</div>
        </article>
        <article class="sr-room-card" style="grid-column:1/-1">
          <h3>Hair Products</h3>
          <div class="sr-product-grid">${products.map(productCard).join('') || '<p>Product links are loading.</p>'}</div>
        </article>
      </section>
    `, root.assets?.productFamily);
  }


  function getLoginState(){
    try { return JSON.parse(localStorage.getItem('srLoginPanelV27') || '{}'); } catch { return {}; }
  }

  function renderSettings(){
    const login = getLoginState();
    const confirmed = login.email ? `^^ ${esc(login.username || 'DYGENRJE')}<br>${esc(login.email)}<br>${esc(login.tier || 'Premium / Pro')}` : 'Not confirmed yet.';
    return panelShell('settings','ACCOUNT ACCESS','Settings / Login','Settings controls account options, history, seriousness ratings, protection status, and admin visibility without blocking the page.',`
      <section class="sr-room-grid">
        <article class="sr-room-card">
          <h3>In-Panel Login</h3>
          <p>This does not block the app. Save account info so SupportRD stays attached while moving around the site.</p>
          <input data-login-username placeholder="Username / tag" value="${esc(login.username || '')}">
          <input data-login-email placeholder="Email address" value="${esc(login.email || '')}">
          <input data-login-password type="password" placeholder="Password" value="${esc(login.password || '')}">
          <select data-login-tier>
            <option ${login.tier === 'Premium' ? 'selected' : ''}>Premium</option>
            <option ${login.tier === 'Pro' ? 'selected' : ''}>Pro</option>
            <option ${login.tier === 'Premium / Pro' ? 'selected' : ''}>Premium / Pro</option>
          </select>
          <button class="sr-buy-btn" data-login-save type="button">Save Login</button>
          <button class="sr-mini-btn" data-login-provider type="button">Confirm Provider</button>
        </article>
        <article class="sr-room-card">
          <h3>Confirmed Account Tag</h3>
          <div class="sr-output-box">${confirmed}</div>
          <p>Once logged in, this confirms Username, Email, and ^^tag confirmed - Premium or Pro.</p>
        </article>
        <article class="sr-room-card">
          <h3>Account Seriousness</h3>
          <button class="sr-buy-btn" data-action="serious" type="button">Mark Taking It Serious</button>
          <button class="sr-mini-btn" data-route="catalog" type="button">Catalog / Payments</button>
        </article>
        <article class="sr-room-card">
          <h3>Protection Guarantee Concept</h3>
          <p>Track protection status as a program/account concept, not a fake financial promise.</p>
        </article>
      </section>
    `, root.assets?.lezawli);
  }

  function renderAria(){
    return panelShell('aria','VOICE AI','ARIA Assistant','Click Start ARIA Mic below or the floating ARIA orb to run the real intro → mic → transcription → reply sequence.',`
      <section class="sr-room-grid">
        <article class="sr-room-card">
          <h3>ARIA Voice</h3>
          <button class="sr-buy-btn" type="button" data-voice-start="aria">Start ARIA Mic</button>
          <p>ARIA handles hair analysis, Diary history, Profile prep, Map perks, and product guidance.</p>
        </article>
      </section>
    `, root.assets?.premiumPro);
  }

  function renderJake(){
    return panelShell('jake','VOICE AI','Jake Assistant','Click Start Jake Mic below or the floating Jake orb to run the real Studio execution assistant sequence.',`
      <section class="sr-room-grid">
        <article class="sr-room-card">
          <h3>Jake Voice</h3>
          <button class="sr-buy-btn" type="button" data-voice-start="jake">Start Jake Mic</button>
          <p>Jake handles .wav export, FX memory, adlibs, alignment, and correct file delivery.</p>
        </article>
      </section>
    `, root.assets?.studioJake);
  }

  function functionalRenderPanel(route='diary'){
    const stage = document.querySelector('#remoteStage');
    if (!stage) return;
    document.querySelectorAll('[data-route]').forEach(btn=>btn.classList.toggle('active', btn.dataset.route === route));
    const map = { profile:renderProfile, diary:renderDiary, studio:renderStudio, faq:renderFaq, market:renderMarket, map:renderMap, catalog:renderCatalog, settings:renderSettings, aria:renderAria, jake:renderJake };
    if (map[route]) stage.innerHTML = map[route]();
    else if (route === 'map') return renderMap();
    else stage.innerHTML = renderDiary();
    try { root.bumpCommerceRank?.(route === 'catalog' ? 'makingMoney' : 'professional', 1); } catch {}
  }

  function bindFunctionalRooms(){
    document.addEventListener('change', event=>{
      const profileFile = event.target.closest('[data-profile-image]');
      if (profileFile && profileFile.files?.[0]) {
        const reader = new FileReader();
        reader.onload = () => { patch({ profileImage: reader.result }); try{ root.recordProfileImage?.(reader.result); }catch{} functionalRenderPanel('profile'); };
        reader.readAsDataURL(profileFile.files[0]);
      }
      const studioFile = event.target.closest('[data-studio-audio]');
      if (studioFile && studioFile.files?.[0]) {
        patch({ studioAudioName: studioFile.files[0].name }); try{ root.recordStudioImport?.({ file:studioFile.files[0].name }); }catch{}
        functionalRenderPanel('studio');
      }
      const check = event.target.closest('[data-studio-check]');
      if (check) {
        const state = read();
        const studioChecks = { ...(state.studioChecks || {}), [check.dataset.studioCheck]: check.checked };
        patch({ studioChecks });
      }
    });

    document.addEventListener('click', event=>{
      if (event.target.closest('[data-market-login-save]')) {
        const email = document.querySelector('[data-market-email]')?.value || '';
        const paid = !!document.querySelector('[data-market-paid]')?.checked;
        try{ root.linkMarketAccount?.(email, paid); }catch{}
        functionalRenderPanel('market');
      }

      if (event.target.closest('[data-profile-scan]')) {
        const state = read();
        const notes = document.querySelector('[data-profile-notes]')?.value || state.profileNotes || '';
        patch({ profileNotes:notes, profileSummary:`AI Prep Summary: hair image/notes reviewed. Focus on ${notes || 'hair condition, credibility, and next Diary history check'}. Recommended next step: save analysis in Diary and review product fit in Catalog.` });
        try{ root.recordHairAnalysis?.({ status:'AI prep summary recorded', summary:read().profileSummary || 'Hair analysis recorded', notes }); }catch{}
        functionalRenderPanel('profile');
      }

      if (event.target.closest('[data-profile-prep]')) {
        const notes = document.querySelector('[data-profile-notes]')?.value || '';
        patch({ profileNotes:notes, profileSummary:`Prep Room Summary: ${notes || 'No notes added yet.'} ARIA should ask follow-up questions, check wet/dry condition, and route serious findings to Diary history.` });
        try{ root.recordHairAnalysis?.({ status:'Confirmed Hair Status: prep complete', summary:read().profileSummary || 'Prep summary recorded', notes }); }catch{}
        functionalRenderPanel('profile');
      }

      if (event.target.closest('[data-comment-add]')) {
        const state = read();
        const name = document.querySelector('[data-comment-name]')?.value || 'Guest';
        const text = document.querySelector('[data-comment-text]')?.value || '';
        if (text.trim()) {
          patch({ diaryComments:[{name,text,at:new Date().toLocaleString()}, ...((state.diaryComments)||[])].slice(0,50) }); try{ root.recordLiveRoomEvent?.({ type:'comment', name, text }); }catch{}
          functionalRenderPanel('diary');
        }
      }

      if (event.target.closest('[data-pay-add]')) {
        const state = read();
        const name = document.querySelector('[data-pay-name]')?.value || 'Guest';
        const amount = document.querySelector('[data-pay-amount]')?.value || '0';
        const reason = document.querySelector('[data-pay-reason]')?.value || 'support';
        patch({ diaryPayments:[{name,amount,reason,at:new Date().toISOString()}, ...((state.diaryPayments)||[])].slice(0,50) }); try{ root.recordLivePayment?.({ name, amount, reason }); }catch{}
        try { root.bumpCommerceRank?.('makingMoney', Number(amount) || 1); } catch {}
        functionalRenderPanel('diary');
      }

      if (event.target.closest('[data-social-save]')) {
        patch({ socialPost:document.querySelector('[data-social-post]')?.value || '' });
        try{ root.recordLiveRoomEvent?.({ type:'social-draft', text:document.querySelector('[data-social-post]')?.value || '' }); }catch{} alert('Social post draft saved locally. Connect platform APIs for direct posting.');
      }

      if (event.target.closest('[data-studio-save]')) {
        const state = read();
        const checks = state.studioChecks || {};
        const complete = ['adlib','beatVocal','fx','wav','correctFile'].filter(k=>checks[k]).length;
        patch({ studioNotes:document.querySelector('[data-studio-notes]')?.value || '', studioSummary:`Studio export summary: ${complete}/5 checks complete. ${complete === 5 ? 'Ready for .wav final export.' : 'Ask Jake to finish missing checks.'}` });
        functionalRenderPanel('studio');
      }

      if (event.target.closest('[data-login-save]') || event.target.closest('[data-login-provider]')) {
        const username = document.querySelector('[data-login-username]')?.value || 'DYGENRJE';
        const email = document.querySelector('[data-login-email]')?.value || 'zzzanthony123@gmail.com';
        const password = document.querySelector('[data-login-password]')?.value || '';
        const tier = document.querySelector('[data-login-tier]')?.value || 'Premium / Pro';
        localStorage.setItem('srLoginPanelV27', JSON.stringify({ username, email, password, tier, confirmed:true, at:new Date().toISOString() }));
        functionalRenderPanel('settings');
      }

      if (event.target.closest('[data-faq-dev-post]')) {
        const text = document.querySelector('[data-faq-dev-text]')?.value || '';
        const rating = document.querySelector('[data-faq-rating]')?.value || '';
        if (text.trim()) {
          try{ root.recordDeveloperFeed?.({ text, source:'FAQ Lounge' }); root.recordMention?.({ text, source:'manual/support-web' }); }catch{}
        }
        if (rating) {
          try{ root.recordFaqRating?.({ rating, surface:'FAQ Lounge' }); }catch{}
        }
        functionalRenderPanel('faq');
      }

      if (event.target.closest('[data-reel-play]')) {
        const steps = [
          ['0-2s: Hook — Have healthy hair.', root.assets?.healthyHair],
          ['2-4s: Product close-up — Bright Droplets / Formula.', root.assets?.brightDroplets],
          ['4-6s: Show confidence and profile credibility.', root.assets?.support_model],
          ['6-8s: Catalog / product family appears.', root.assets?.productFamily],
          ['8-10s: Call to action — Open Catalog / Ask ARIA.', root.assets?.premiumPro]
        ];
        let i = 0;
        const text = document.querySelector('#reelText');
        const img = document.querySelector('#reelStage img');
        const run = () => {
          if (!text || !img) return;
          text.textContent = steps[i][0];
          img.src = steps[i][1] || img.src;
          i += 1;
          if (i < steps.length) setTimeout(run, 2000);
        };
        run();
      }
    });
  }

  function initFunctionalSurfaces(){
    root.renderPanel = functionalRenderPanel;
    window.renderPanel = functionalRenderPanel;
    bindFunctionalRooms();
    functionalRenderPanel('diary');
  }

  root.initFunctionalSurfaces = initFunctionalSurfaces;
  root.renderFunctionalPanel = functionalRenderPanel;
})();
