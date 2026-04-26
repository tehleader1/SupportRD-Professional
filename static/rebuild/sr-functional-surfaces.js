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
    const state = read();
    const summary = state.profileSummary || 'Upload or scan a hair image to create an AI prep summary. This builds Profile credibility and can route back to Diary history.';
    return panelShell('profile','AI PREP + HAIR SCANNER','Profile Scanner Room','Profile is now a working prep room: hair image scan, AI prep summary, seriousness image, and profile notes.',`
      <section class="sr-room-grid">
        <article class="sr-room-card">
          <h3>Actual Hair Scanner</h3>
          <input class="sr-file-input" type="file" accept="image/*" data-profile-image>
          <div class="sr-preview-box" id="profileScanPreview">${state.profileImage ? `<img src="${state.profileImage}" alt="Hair scan preview">` : 'No scan image yet.'}</div>
          <button class="sr-buy-btn" type="button" data-profile-scan>Run Hair Scan</button>
        </article>
        <article class="sr-room-card">
          <h3>AI Prep Summary Room</h3>
          <textarea data-profile-notes placeholder="Describe hair condition, goals, products used, scalp/wet/dry condition...">${esc(state.profileNotes || '')}</textarea>
          <button class="sr-mini-btn" type="button" data-profile-prep>Generate Prep Summary</button>
          <div class="sr-output-box" id="profilePrepSummary">${esc(summary)}</div>
        </article>
        <article class="sr-room-card">
          <h3>Serious Profile Image</h3>
          <p>This image can be used as a serious trust/profile review surface. Use it for credibility, not false identity/background claims.</p>
          <button class="sr-mini-btn sr-settings-btn" type="button" data-route="diary">Open Hair History in Diary</button>
        </article>
      </section>
    `, root.assets?.proGirl);
  }

  function renderDiary(){
    const state = read();
    const comments = state.diaryComments || [];
    const payments = state.diaryPayments || [];
    return panelShell('diary','LIVE ROOM + GUEST PAYMENTS','Diary Live Room','Diary now works like a live room: guests can comment, add support payments, and prepare social posts with files.',`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-live-room">
          <h3>Live Feature</h3>
          <div class="sr-live-badge">LIVE READY</div>
          <p>Open comments, support/tip intent, social posting prep, and hands-free ARIA history.</p>
          <input type="file" multiple accept="image/*,video/*" data-diary-files>
          <textarea data-social-post placeholder="Write a post for X, FB, IG, Reddit, Tumblr, TikTok...">${esc(state.socialPost || '')}</textarea>
          <button class="sr-buy-btn" data-social-save type="button">Save Social Post + Files</button>
        </article>
        <article class="sr-room-card">
          <h3>Guest Comments</h3>
          <div class="sr-comment-list" id="diaryCommentList">${comments.map(c=>`<div><strong>${esc(c.name)}</strong><p>${esc(c.text)}</p><small>${esc(c.at)}</small></div>`).join('') || '<p>No comments yet.</p>'}</div>
          <input data-comment-name placeholder="Guest name">
          <textarea data-comment-text placeholder="Write comment..."></textarea>
          <button class="sr-mini-btn" data-comment-add type="button">Post Comment</button>
        </article>
        <article class="sr-room-card">
          <h3>Guest Payments / Tips</h3>
          <div class="sr-payment-list">${payments.map(p=>`<div><strong>$${esc(p.amount)}</strong><span>${esc(p.name)} — ${esc(p.reason)}</span></div>`).join('') || '<p>No support payments yet.</p>'}</div>
          <input data-pay-name placeholder="Guest name">
          <input data-pay-amount type="number" min="1" step="1" placeholder="Amount">
          <input data-pay-reason placeholder="Reason: tip/support/product">
          <button class="sr-buy-btn" data-pay-add type="button">Add Guest Payment</button>
        </article>
        <article class="sr-room-card">
          <h3>Aria/Jake Conversation History</h3>
          <div class="sr-output-box">${(JSON.parse(localStorage.getItem('srVoiceAssistantStateV25') || '{}').history || []).slice(0,5).map(h=>`<div><b>${esc(h.assistant)}</b>: ${esc(h.transcript)}<br><small>${esc(h.reply)}</small></div>`).join('') || 'No assistant history yet.'}</div>
          <button class="sr-mini-btn" data-route="aria" type="button">Hands-Free ARIA</button>
        </article>
      </section>
    `, root.assets?.healthyHair);
  }

  function renderStudio(){
    const state = read();
    const checks = state.studioChecks || {};
    return panelShell('studio','FINISHED STUDIO ROOM','.wav Studio Export Room','Studio is now a working creation room: motherboard creation notes, audio import, adlib/beat alignment, FX memory, and export checklist.',`
      <section class="sr-room-grid">
        <article class="sr-room-card">
          <h3>Audio Session</h3>
          <input type="file" accept="audio/*,.wav" data-studio-audio>
          <div class="sr-output-box">${state.studioAudioName ? `Loaded: ${esc(state.studioAudioName)}` : 'No audio loaded yet.'}</div>
          <textarea data-studio-notes placeholder="Motherboard creation notes, session goal, export name...">${esc(state.studioNotes || '')}</textarea>
        </article>
        <article class="sr-room-card">
          <h3>Jake Export Checklist</h3>
          ${['adlib','beatVocal','fx','wav','correctFile'].map(key=>`
            <label class="sr-check-row"><input type="checkbox" data-studio-check="${key}" ${checks[key]?'checked':''}> ${{
              adlib:'Adlib confirmed',
              beatVocal:'Beat-to-vocal lined up',
              fx:'FX effect remembered',
              wav:'.wav export ready',
              correctFile:'Correct file exported'
            }[key]}</label>
          `).join('')}
          <button class="sr-buy-btn" data-studio-save type="button">Save Studio Session</button>
        </article>
        <article class="sr-room-card">
          <h3>Export Summary</h3>
          <div class="sr-output-box" id="studioExportSummary">${esc(state.studioSummary || 'Complete checklist and save to generate the export summary.')}</div>
          <button class="sr-mini-btn" data-route="jake" type="button">Ask Jake</button>
        </article>
      </section>
    `, root.assets?.studioJake);
  }

  function renderFaq(){
    const faqs = [
      ['What is SupportRD?', 'A hair solution remote for products, AI guidance, Diary, Studio, Profile, FAQ, Catalog, and Market Reader.'],
      ['What does ARIA do?', 'ARIA handles hair guidance, prep summaries, map behavior, and hands-free conversation.'],
      ['What does Jake do?', 'Jake handles Studio execution, FX memory, adlib checks, alignment, and export discipline.'],
      ['Can guests pay someone live?', 'Diary has guest support payment intent; connect Shopify/payment backend for real transactions.'],
      ['How does Market Laser work?', 'It reads Workday SEO, Shopify finance, public pulse, map behavior, and catalog payment intent.']
    ];
    return panelShell('faq','10 SECOND REEL + ACTUAL FAQS','FAQ Lounge','FAQ Lounge now has a 10-second TikTok-style hair reel storyboard and real FAQ cards.',`
      <section class="sr-room-grid">
        <article class="sr-room-card sr-reel-card">
          <h3>10 Second TikTok Hair Reel</h3>
          <div class="sr-reel-stage" id="reelStage">
            <img src="${root.assets?.brightDroplets || ''}" alt="Hair reel visual">
            <strong id="reelText">0-2s: Hook — Have healthy hair.</strong>
          </div>
          <button class="sr-buy-btn" data-reel-play type="button">Play 10s Reel</button>
        </article>
        <article class="sr-room-card">
          <h3>Actual FAQs</h3>
          <div class="sr-faq-list">${faqs.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
        </article>
        <article class="sr-room-card">
          <h3>Recent Works / Mentions</h3>
          <p>Use this lane for TikTok, reels, featured mentions, and proof from other websites. Keep unverified mentions out until confirmed.</p>
          <button class="sr-mini-btn" data-route="market" type="button">Scan Market Laser</button>
        </article>
      </section>
    `, root.assets?.dayparty);
  }

  function renderMarket(){
    return panelShell('market','RENDER MARKET LINK','Market Laser','Market Laser now points at the live Render market app and keeps the reader identifiers visible.',`
      <section class="sr-room-grid">
        <article class="sr-room-card">
          <h3>Live Market App</h3>
          <p>Target market system:</p>
          <a class="sr-buy-btn" href="${MARKET_URL}" target="_blank" rel="noopener">Open market-do8p.onrender.com</a>
          <p class="sr-small-note">Some hosts block iframe embedding. Open in new tab is the safest live behavior.</p>
        </article>
        <article class="sr-room-card">
          <h3>Laser Identifiers</h3>
          <div class="sr-faq-list">
            <details open><summary>workday-seo-laser</summary><p>Reads workday SEO rhythm and posting direction.</p></details>
            <details><summary>shopify-finance-reader</summary><p>Reads Shopify endpoint/payment readiness once connected.</p></details>
            <details><summary>public-pulse-reader</summary><p>Reads public signal fallback.</p></details>
            <details><summary>map-surface-laser</summary><p>Reads active map, perk, and surface behavior.</p></details>
            <details><summary>catalog-payment-reader</summary><p>Reads product intent and Making Money seriousness.</p></details>
          </div>
        </article>
        <article class="sr-room-card sr-market-frame-card">
          <h3>Market Preview</h3>
          <iframe src="${MARKET_URL}" title="Market Laser Preview" loading="lazy"></iframe>
        </article>
      </section>
    `, root.assets?.artists);
  }

  function renderSettings(){
    return panelShell('settings','ACCOUNT + ADMIN','Settings','Settings controls account options, history, seriousness ratings, protection status, and admin visibility.',`
      <section class="sr-room-grid">
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
    else if (route === 'map' && root.renderPanel) return root.renderPanel('map');
    else stage.innerHTML = renderDiary();
    try { root.bumpCommerceRank?.(route === 'catalog' ? 'makingMoney' : 'professional', 1); } catch {}
  }

  function bindFunctionalRooms(){
    document.addEventListener('change', event=>{
      const profileFile = event.target.closest('[data-profile-image]');
      if (profileFile && profileFile.files?.[0]) {
        const reader = new FileReader();
        reader.onload = () => { patch({ profileImage: reader.result }); functionalRenderPanel('profile'); };
        reader.readAsDataURL(profileFile.files[0]);
      }
      const studioFile = event.target.closest('[data-studio-audio]');
      if (studioFile && studioFile.files?.[0]) {
        patch({ studioAudioName: studioFile.files[0].name });
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
      if (event.target.closest('[data-profile-scan]')) {
        const state = read();
        const notes = document.querySelector('[data-profile-notes]')?.value || state.profileNotes || '';
        patch({ profileNotes:notes, profileSummary:`AI Prep Summary: hair image/notes reviewed. Focus on ${notes || 'hair condition, credibility, and next Diary history check'}. Recommended next step: save analysis in Diary and review product fit in Catalog.` });
        functionalRenderPanel('profile');
      }

      if (event.target.closest('[data-profile-prep]')) {
        const notes = document.querySelector('[data-profile-notes]')?.value || '';
        patch({ profileNotes:notes, profileSummary:`Prep Room Summary: ${notes || 'No notes added yet.'} ARIA should ask follow-up questions, check wet/dry condition, and route serious findings to Diary history.` });
        functionalRenderPanel('profile');
      }

      if (event.target.closest('[data-comment-add]')) {
        const state = read();
        const name = document.querySelector('[data-comment-name]')?.value || 'Guest';
        const text = document.querySelector('[data-comment-text]')?.value || '';
        if (text.trim()) {
          patch({ diaryComments:[{name,text,at:new Date().toLocaleString()}, ...((state.diaryComments)||[])].slice(0,50) });
          functionalRenderPanel('diary');
        }
      }

      if (event.target.closest('[data-pay-add]')) {
        const state = read();
        const name = document.querySelector('[data-pay-name]')?.value || 'Guest';
        const amount = document.querySelector('[data-pay-amount]')?.value || '0';
        const reason = document.querySelector('[data-pay-reason]')?.value || 'support';
        patch({ diaryPayments:[{name,amount,reason,at:new Date().toISOString()}, ...((state.diaryPayments)||[])].slice(0,50) });
        try { root.bumpCommerceRank?.('makingMoney', Number(amount) || 1); } catch {}
        functionalRenderPanel('diary');
      }

      if (event.target.closest('[data-social-save]')) {
        patch({ socialPost:document.querySelector('[data-social-post]')?.value || '' });
        alert('Social post draft saved locally. Connect platform APIs for direct posting.');
      }

      if (event.target.closest('[data-studio-save]')) {
        const state = read();
        const checks = state.studioChecks || {};
        const complete = ['adlib','beatVocal','fx','wav','correctFile'].filter(k=>checks[k]).length;
        patch({ studioNotes:document.querySelector('[data-studio-notes]')?.value || '', studioSummary:`Studio export summary: ${complete}/5 checks complete. ${complete === 5 ? 'Ready for .wav final export.' : 'Ask Jake to finish missing checks.'}` });
        functionalRenderPanel('studio');
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
