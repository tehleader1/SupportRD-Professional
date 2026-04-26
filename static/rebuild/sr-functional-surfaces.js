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
    return panelShell('profile','CAMERA HAIR ANALYSIS','Profile — Open Camera Hair Analysis','Look left and look right — your camera runs live AI hair analysis, gives spoken results, and saves confirmed hair status to your account history.',`
      <div id="srHairAnalysisRoom" style="min-height:200px;"><p style="color:#888;padding:1rem;">Loading hair analysis room…</p></div>
    `, root.assets?.proGirl);
  }

  function renderDiary(){
    return panelShell('diary','LIVE WEBCAM ROOM','Diary — Live Room','Real webcam, live comments, hearts, Stripe guest tips linked to your account, hands-free ARIA, and Aria/Jake history in Diary history.',`
      <div id="srDiaryLiveRoom" style="min-height:200px;"><p style="color:#888;padding:1rem;">Loading live room…</p></div>
    `, root.assets?.healthyHair);
  }

  function renderStudio(){
    return panelShell('studio','STUDIO MOTHERBOARD','Studio — Import/Export/Play','Real MP3/M4A import, waveform motherboard with clickable tracks, highlight/cut/delete, export, and last 3 exports saved to your account.',`
      <div id="srMotherboardContainer" style="min-height:200px;"><p style="color:#888;padding:1rem;">Loading studio…</p></div>
    `, root.assets?.studioJake);
  }

  function renderFaq(){
    const faqs = [
      ['What is SupportRD?', 'A hair solution remote for products, AI guidance, Diary, Studio, Profile, FAQ, Catalog, and Market Laser.'],
      ['What does ARIA do?', 'ARIA handles hair guidance, prep summaries, map behavior, and hands-free conversation.'],
      ['What does Jake do?', 'Jake handles Studio execution, FX memory, adlib checks, alignment, and export discipline.'],
      ['Can guests pay live?', 'Yes — Diary has a real Stripe guest tip link that records payments to your account.'],
      ['How does Market Laser work?', 'Links to market-do8p.onrender.com. Paid $25,000 Live Signals account gets live signal access.'],
      ['How does hair analysis work?', 'Profile opens your camera. Look left and right — Claude AI analyzes your hair, speaks results, and saves to account history.'],
      ['What maps are available?', 'Wellness, Studio, Market, Diary, and Premium maps — each gives an account perk.'],
      ['Is everything account-connected?', 'Yes. Diary, Profile, FAQ, Studio, Map, and Market all connect back to your account backbone.']
    ];
    return panelShell('faq','FAQ + TIKTOK REEL + DEVS FEED','FAQ Lounge','Real FAQs, 10-second TikTok hair reel, and Developer Feed — post comments and ratings, all saved to your account.',`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-reel-card">
          <h3>10-Second TikTok Hair Reel</h3>
          <div id="srTikTokReelContainer" style="min-height:180px;display:flex;align-items:center;justify-content:center;">
            <p style="color:#888;font-size:.85rem;">Loading reel…</p>
          </div>
        </article>
        <article class="sr-room-card">
          <h3>Actual FAQs</h3>
          <div class="sr-faq-list">${faqs.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
        </article>
        <article class="sr-room-card">
          <h3>Developer Feed + Mentions</h3>
          <textarea id="srFaqDevText" placeholder="Post live developer comment or SupportRD mention found online…" rows="3" style="width:100%;resize:vertical;margin-bottom:.4rem;"></textarea>
          <input id="srFaqRating" type="number" min="1" max="5" placeholder="Rating 1-5" style="width:100%;margin-bottom:.4rem;">
          <button id="srFaqDevPostBtn" class="sr-buy-btn" type="button">Post to Developer Feed</button>
          <div id="srFaqFeedList" style="margin-top:.75rem;max-height:200px;overflow-y:auto;"></div>
        </article>
      </section>
    `, root.assets?.dayparty);
  }

  function renderMarket(){
    return panelShell('market','MARKET LASER — LIVE SIGNALS','Market Laser — Connect Your Account','Link your market-do8p.onrender.com account. Paid $25,000 Live Signals tier unlocks live signals. Account link and map perks are saved to your backbone.',`
      <section class="sr-room-grid">
        <article class="sr-room-card">
          <h3>Connect Market Login</h3>
          <input data-market-email placeholder="Market login email" style="width:100%;margin-bottom:.4rem;">
          <label class="sr-check-row"><input data-market-paid type="checkbox"> $25,000 Live Signals paid account</label>
          <button class="sr-buy-btn" style="margin-top:.5rem;" type="button" data-market-login-save>Connect Market Login</button>
          <button class="sr-mini-btn" style="margin-top:.4rem;" type="button" onclick="window.SupportRDRebuild&&window.SupportRDRebuild.marketLaser&&window.SupportRDRebuild.marketLaser.openMarket()">Open market-do8p.onrender.com</button>
        </article>
        <article class="sr-room-card">
          <h3>Account Link Status</h3>
          <div id="srMarketStatus"><p style="color:#888;font-size:.85rem;">Loading status…</p></div>
        </article>
        <article class="sr-room-card">
          <h3>Map Perks (Account Linked)</h3>
          <div id="srMapPerksContainer"><p style="color:#888;font-size:.85rem;">Loading perks…</p></div>
        </article>
      </section>
    `, root.assets?.artists);
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
    const map = { profile:renderProfile, diary:renderDiary, studio:renderStudio, faq:renderFaq, market:renderMarket, settings:renderSettings, aria:renderAria, jake:renderJake };
    if (map[route]) stage.innerHTML = map[route]();
    else if (route === 'catalog' && root.renderPanel) return root.renderPanel('catalog');
    else if (route === 'map' && root.renderPanel) { try{ root.recordMapChoice?.('Map Change opened', 'recent map/perks reviewed'); }catch{} return root.renderPanel('map'); }
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
