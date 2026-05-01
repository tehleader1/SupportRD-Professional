(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const ACCOUNT_KEY = 'srUnifiedAccountBackboneV28';
  const VIEW_KEY = 'srDiaryLiveViewsV1';
  const COMMENT_KEY = 'srDiaryAccountCommentsV2';
  const EVENT_KEY = 'srDiaryLiveCelebrationsV2';
  const DEFAULT_TAG = 'DYGENRJE';
  const DEFAULT_CLIPS = [
    '/static/videos/reel-1.mp4',
    '/static/videos/reel-2.mp4',
    '/static/videos/sample-10s.mp4'
  ];
  const CELEBRATIONS = [
    { type:'countdown', label:'3 2 1 Explosion!', aria:'ARIA premium sound good to go. Three, two, one, explosion.' },
    { type:'bomb', label:'Bomb explosion full stream screen', aria:'ARIA premium sound good to go. Big live moment.' },
    { type:'confetti', label:'Confetti explosion full stream screen', aria:'ARIA premium sound good to go. Confetti live.' },
    { type:'hearts', label:'Bunch of hearts full stream screen', aria:'ARIA premium sound good to go. Hearts are live.' }
  ];
  let latestEventByTag = {};
  let guestPollTimer = null;

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function cleanTag(value){
    return String(value || DEFAULT_TAG).replace(/[^a-z0-9_-]/gi, '').toUpperCase() || DEFAULT_TAG;
  }

  function getAccount(){
    try {
      return root.getAccountBackbone?.() || JSON.parse(localStorage.getItem(ACCOUNT_KEY) || '{}');
    } catch {
      return { username:DEFAULT_TAG, email:'zzzanthony123@gmail.com', tier:'Premium / Pro' };
    }
  }

  function accountTag(){
    return cleanTag(getAccount().username || DEFAULT_TAG);
  }

  function accountUrl(tag){
    return `${location.origin}/accounts/${encodeURIComponent(cleanTag(tag || accountTag()))}`;
  }

  function clipSources(){
    const configured = (window.SR_REAL_HAIR_CLIPS || root.realHairClips || []).filter(Boolean);
    return configured.length ? configured : DEFAULT_CLIPS;
  }

  function incrementViews(tag){
    const key = `${VIEW_KEY}:${cleanTag(tag)}`;
    const current = Number(localStorage.getItem(key) || '0') || 0;
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return next;
  }

  function currentViews(tag){
    return Number(localStorage.getItem(`${VIEW_KEY}:${cleanTag(tag)}`) || '0') || 0;
  }

  function isGuestAccountRoute(){
    return /^\/accounts\/[^/]+/i.test(location.pathname || '');
  }

  function routeTag(){
    const match = (location.pathname || '').match(/^\/accounts\/([^/]+)/i);
    return match ? cleanTag(decodeURIComponent(match[1])) : '';
  }

  function addStyles(){
    if (document.querySelector('#srDiaryBacklinkVideoCss')) return;
    const style = document.createElement('style');
    style.id = 'srDiaryBacklinkVideoCss';
    style.textContent = `
      .sr-channel-link-card{border:1px solid rgba(114,247,255,.28);border-radius:1rem;padding:.85rem;margin:.75rem 0;background:rgba(114,247,255,.08)}
      .sr-channel-link-card code{display:block;word-break:break-all;margin:.4rem 0;padding:.45rem;border-radius:.6rem;background:rgba(0,0,0,.28)}
      .sr-real-hair-video{width:100%;aspect-ratio:9/16;max-height:420px;object-fit:cover;border-radius:1rem;background:#020813;border:1px solid rgba(255,255,255,.14)}
      .sr-video-note{font-size:.85rem;opacity:.78}
      .sr-view-badge{display:inline-flex;gap:.35rem;align-items:center;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:.25rem .55rem;margin:.2rem .2rem .2rem 0}
      .sr-streamer-private-controls{background:linear-gradient(135deg,rgba(97,239,255,.11),rgba(169,207,67,.1));border-color:rgba(169,207,67,.35)}
      .sr-celebration-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;margin:.65rem 0}
      .sr-celebration-grid button{text-align:left;min-height:2.85rem}
      .sr-streamer-private-pop{display:none;position:fixed;right:1rem;top:1rem;z-index:2147483001;width:min(22rem,calc(100vw - 2rem));padding:.85rem;border-radius:1rem;border:1px solid rgba(169,207,67,.42);background:rgba(3,8,19,.9);box-shadow:0 18px 54px rgba(0,0,0,.38);backdrop-filter:blur(14px)}
      .sr-streamer-private-pop.active{display:block}
      body.sr-diary-popout{margin:0;overflow:hidden;background:#020813}
      body.sr-diary-popout .sr-page,body.sr-diary-popout #srVoiceAssistantPanel,body.sr-diary-popout #srRoamDock{display:none!important}
      .sr-diary-popout-shell{position:fixed;inset:0;z-index:2147483000;background:#020813;color:#fff;overflow:hidden}
      .sr-diary-popout-stream{position:absolute;inset:0;background:#020813}
      .sr-diary-popout-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#020813}
      .sr-diary-popout-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.45),transparent 32%,rgba(0,0,0,.62));pointer-events:none}
      .sr-diary-popout-top{position:absolute;left:1rem;right:1rem;top:1rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;pointer-events:none}
      .sr-diary-popout-top strong,.sr-diary-popout-top span{display:inline-flex;align-items:center;gap:.35rem;padding:.42rem .65rem;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(0,0,0,.32);backdrop-filter:blur(10px)}
      .sr-diary-popout-comments{position:absolute;left:1rem;bottom:6.9rem;width:min(28rem,calc(100vw - 2rem));max-height:42vh;display:flex;flex-direction:column;gap:.42rem;overflow:hidden;pointer-events:none}
      .sr-popout-comment{padding:.48rem .62rem;border:1px solid rgba(255,255,255,.16);border-radius:.75rem;background:rgba(0,0,0,.36);backdrop-filter:blur(9px);box-shadow:0 10px 30px rgba(0,0,0,.22)}
      .sr-popout-comment strong{display:block;font-size:.76rem;color:#9ff9ff}.sr-popout-comment span{font-size:.9rem;line-height:1.35}
      .sr-popout-comment.support{border-color:rgba(169,207,67,.42);background:rgba(49,68,13,.42)}
      .sr-guest-compose{position:absolute;left:1rem;right:1rem;bottom:1rem;display:grid;grid-template-columns:8rem minmax(0,1fr) auto;gap:.45rem;align-items:center;padding:.55rem;border:1px solid rgba(255,255,255,.16);border-radius:1rem;background:rgba(0,0,0,.38);backdrop-filter:blur(14px)}
      .sr-guest-compose input{min-width:0;border:1px solid rgba(255,255,255,.18);border-radius:.72rem;background:rgba(255,255,255,.08);color:#fff;padding:.7rem}
      .sr-guest-compose button,.sr-diary-popout-pay a{border:0;border-radius:.72rem;padding:.72rem .9rem;background:#72f7ff;color:#06101f;font-weight:900;text-decoration:none;cursor:pointer}
      .sr-diary-popout-pay{position:absolute;right:1rem;bottom:6.9rem;width:min(18rem,calc(100vw - 2rem));display:grid;gap:.45rem;padding:.65rem;border:1px solid rgba(255,255,255,.16);border-radius:1rem;background:rgba(0,0,0,.36);backdrop-filter:blur(14px)}
      .sr-diary-popout-pay span{font-size:.78rem;opacity:.82}.sr-diary-popout-pay a:nth-child(3){background:#a9cf43}
      .sr-live-celebration-layer{position:fixed;inset:0;z-index:2147483002;pointer-events:none;display:grid;place-items:center;overflow:hidden;opacity:0;transition:opacity .2s ease}
      .sr-live-celebration-layer.active{opacity:1}
      .sr-celebration-core{position:relative;z-index:3;font-size:clamp(3rem,10vw,9rem);font-weight:1000;text-align:center;text-shadow:0 12px 45px rgba(0,0,0,.55)}
      .sr-celebration-caption{position:absolute;left:50%;bottom:12vh;transform:translateX(-50%);z-index:4;padding:.55rem .9rem;border-radius:999px;background:rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(10px);font-weight:900}
      .sr-live-celebration-bomb{background:radial-gradient(circle,rgba(255,246,170,.94),rgba(255,80,34,.56) 24%,rgba(0,0,0,.05) 62%,rgba(0,0,0,.72))}
      .sr-live-celebration-confetti{background:rgba(3,8,19,.18)}
      .sr-live-celebration-hearts{background:radial-gradient(circle,rgba(255,120,190,.22),rgba(3,8,19,.12) 58%,rgba(0,0,0,.32))}
      .sr-live-celebration-countdown{background:radial-gradient(circle,rgba(114,247,255,.28),rgba(0,0,0,.26))}
      .sr-particle{position:absolute;left:50%;top:50%;width:.55rem;height:1.1rem;border-radius:.12rem;background:hsl(calc(var(--i) * 31),90%,62%);transform:translate(-50%,-50%);animation:srConfetti 3.2s ease-out forwards;animation-delay:calc(var(--d) * 1ms)}
      .sr-live-celebration-bomb .sr-particle{width:.8rem;height:.8rem;border-radius:999px;background:#ffd36e;box-shadow:0 0 18px #fff;animation-name:srBurst}
      .sr-live-celebration-hearts .sr-particle{width:auto;height:auto;background:transparent;color:#ff6fbd;font-size:clamp(1.2rem,3vw,2.4rem);animation-name:srHearts}
      @keyframes srConfetti{to{transform:translate(calc(-50% + var(--x) * 1vw),calc(-50% + var(--y) * 1vh)) rotate(720deg);opacity:0}}
      @keyframes srBurst{to{transform:translate(calc(-50% + var(--x) * 1vw),calc(-50% + var(--y) * 1vh)) scale(.2);opacity:0}}
      @keyframes srHearts{to{transform:translate(calc(-50% + var(--x) * 1vw),calc(-50% + var(--y) * 1vh)) scale(1.8);opacity:0}}
      @media(max-width:760px){.sr-celebration-grid{grid-template-columns:1fr}.sr-diary-popout-pay{left:1rem;right:1rem;bottom:11.4rem;width:auto;grid-template-columns:1fr 1fr}.sr-diary-popout-pay span{grid-column:1/-1}.sr-diary-popout-comments{bottom:20rem;max-height:28vh}.sr-guest-compose{grid-template-columns:1fr}.sr-diary-popout-top{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function videoMarkup(context){
    const clips = clipSources();
    return `<div class="sr-channel-link-card" data-real-hair-video="${esc(context)}"><h3>10 Second Real Hair Motivation Clip</h3><video class="sr-real-hair-video" muted playsinline controls preload="metadata" data-real-hair-player><source src="${esc(clips[0])}" type="video/mp4"></video><div class="sr-room-actions"><button class="sr-mini-btn" type="button" data-hair-clip-prev>Prev Clip</button><button class="sr-buy-btn" type="button" data-hair-clip-play>Play 10s Clip</button><button class="sr-mini-btn" type="button" data-hair-clip-next>Next Clip</button></div><p class="sr-video-note">Use this clip as motivation to share your Diary backlink. Replace the bundled reel files with your real MP4 hair clips when ready.</p></div>`;
  }

  function celebrationButtons(tag){
    return CELEBRATIONS.map(item => `<button class="sr-mini-btn" type="button" data-diary-celebrate="${esc(item.type)}" data-diary-tag="${esc(tag)}">${esc(item.label)}</button>`).join('');
  }

  function streamerControlsMarkup(tag){
    return `<div class="sr-channel-link-card sr-streamer-private-controls" data-streamer-diary-controls><h3>Streamer Only Pop-Up Controls</h3><p class="sr-video-note">These celebration controls are only shown to the streamer in the owner Diary panel. Guests see the effect over the live pop-out stream.</p><div class="sr-celebration-grid">${celebrationButtons(tag)}</div><div class="sr-streamer-private-pop" data-streamer-private-pop><strong>Streamer action</strong><p data-streamer-private-text>Choose a celebration to send to the guest pop-out.</p></div></div>`;
  }

  function diaryBacklinkMarkup(tag){
    const url = accountUrl(tag);
    const views = currentViews(tag);
    return `<div class="sr-channel-link-card" data-diary-channel-card><h3>Diary Live Backlink</h3><span class="sr-view-badge">Current views: <strong data-diary-view-count>${views}</strong></span><span class="sr-view-badge">Channel: <strong>^^ ${esc(tag)}</strong></span><code>${esc(url)}</code><div class="sr-room-actions"><button class="sr-buy-btn" type="button" data-open-diary-popout="${esc(url)}">Open Diary Live Pop-Out</button><button class="sr-mini-btn" type="button" data-copy-diary-link="${esc(url)}">Copy Backlink</button><a class="sr-mini-btn" href="${esc(url)}" target="_blank" rel="noopener">Guest Link</a></div><p class="sr-video-note">Share this link when you want guests to see the stream-first pop-out view with transparent comments and Premium/Pro checkout routing.</p></div>`;
  }

  const oldRender = root.renderFunctionalPanel;
  root.renderFunctionalPanel = function(route){
    oldRender?.(route);
    addStyles();
    setTimeout(()=>{
      if (route === 'diary') enhanceDiary();
      if (route === 'faq') enhanceFaq();
    }, 0);
  };
  window.renderPanel = root.renderFunctionalPanel;

  function enhanceDiary(){
    const tag = isGuestAccountRoute() ? routeTag() : accountTag();
    const live = document.querySelector('#srDiaryLiveRoom') || document.querySelector('[data-panel="diary"] .sr-room-card');
    if (live && !document.querySelector('[data-diary-channel-card]')) {
      live.insertAdjacentHTML('afterend', diaryBacklinkMarkup(tag) + streamerControlsMarkup(tag) + videoMarkup('diary'));
    }
    updateViewBadge(tag);
  }

  function enhanceFaq(){
    const reel = document.querySelector('#srTikTokReelContainer') || document.querySelector('[data-panel="faq"] .sr-reel-card');
    if (reel && !document.querySelector('[data-real-hair-video="faq"]')) reel.innerHTML = videoMarkup('faq');
  }

  function updateViewBadge(tag){
    const el = document.querySelector('[data-diary-view-count]');
    if (el) el.textContent = currentViews(tag);
  }

  function commentKey(tag){
    return `${COMMENT_KEY}:${cleanTag(tag)}`;
  }

  function readLocalComments(tag){
    try { return JSON.parse(localStorage.getItem(commentKey(tag)) || '[]'); }
    catch { return []; }
  }

  function saveLocalComment(tag, comment){
    const rows = [comment, ...readLocalComments(tag)].slice(0, 40);
    localStorage.setItem(commentKey(tag), JSON.stringify(rows));
    return rows;
  }

  function rememberEvent(tag, event){
    latestEventByTag[cleanTag(tag)] = event?.id || '';
    try { localStorage.setItem(`${EVENT_KEY}:${cleanTag(tag)}`, JSON.stringify(event || {})); } catch {}
  }

  function readRememberedEvent(tag){
    try { return JSON.parse(localStorage.getItem(`${EVENT_KEY}:${cleanTag(tag)}`) || '{}'); }
    catch { return {}; }
  }

  async function fetchAccountFeed(tag){
    try {
      const response = await fetch(`/api/diary/account-feed?tag=${encodeURIComponent(cleanTag(tag))}&ts=${Date.now()}`, { cache:'no-store' });
      if (!response.ok) throw new Error('feed unavailable');
      return await response.json();
    } catch {
      return { ok:true, tag:cleanTag(tag), event:readRememberedEvent(tag), comments:readLocalComments(tag) };
    }
  }

  function renderComments(comments){
    const rows = Array.isArray(comments) && comments.length ? comments : [
      { author_name:'SupportRD', comment_text:'Welcome to the Diary Live stream. Comments appear over the video.', comment_kind:'system' }
    ];
    return rows.slice(-8).reverse().map(comment => {
      const support = /support|premium|pro|checkout|celebration/.test(String(comment.comment_kind || '').toLowerCase());
      const label = comment.amount_label ? ` · ${esc(comment.amount_label)}` : '';
      return `<div class="sr-popout-comment ${support ? 'support' : ''}"><strong>${esc(comment.author_name || 'Guest')}${label}</strong><span>${esc(comment.comment_text || '')}</span></div>`;
    }).join('');
  }

  function setPopoutComments(comments){
    const deck = document.querySelector('[data-popout-comments]');
    if (deck) deck.innerHTML = renderComments(comments || []);
  }

  async function postAccountComment(tag, payload){
    const body = {
      tag: cleanTag(tag),
      author_name: payload.author_name || 'Guest',
      comment_text: payload.comment_text || '',
      comment_kind: payload.comment_kind || 'comment',
      amount_label: payload.amount_label || ''
    };
    try {
      const response = await fetch('/api/diary/account-comment', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body)
      });
      if (!response.ok) throw new Error('comment unavailable');
      const data = await response.json();
      setPopoutComments(data.comments || []);
      return data;
    } catch {
      const comments = saveLocalComment(tag, { ...body, created_at:new Date().toISOString() });
      setPopoutComments(comments);
      return { ok:true, comments };
    }
  }

  function speakAriaLine(line){
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(line || 'ARIA premium sound good to go.');
      const voices = window.speechSynthesis.getVoices?.() || [];
      const voice = voices.find(v => /aria|jenny|samantha|zira|ava/i.test(`${v.name} ${v.voiceURI}`)) || voices.find(v => /^en/i.test(v.lang || ''));
      if (voice) utter.voice = voice;
      utter.lang = voice?.lang || 'en-US';
      utter.rate = .96;
      utter.pitch = 1.08;
      window.speechSynthesis.speak(utter);
    } catch {}
  }

  function particleMarkup(type){
    const count = type === 'hearts' ? 44 : type === 'bomb' ? 60 : 80;
    return Array.from({ length:count }, (_, i) => {
      const x = Math.round(Math.cos(i * 2.41) * (18 + (i % 7) * 9));
      const y = Math.round(Math.sin(i * 2.11) * (16 + (i % 9) * 7));
      const d = (i % 12) * 20;
      const content = type === 'hearts' ? '&hearts;' : '';
      return `<span class="sr-particle" style="--i:${i};--x:${x};--y:${y};--d:${d}">${content}</span>`;
    }).join('');
  }

  function renderCelebration(event){
    const type = (event?.event_type || event?.type || 'confetti').toLowerCase();
    const label = event?.label || CELEBRATIONS.find(item => item.type === type)?.label || 'Live celebration';
    const layer = document.createElement('div');
    layer.className = `sr-live-celebration-layer sr-live-celebration-${esc(type)}`;
    layer.innerHTML = `<div class="sr-celebration-core">${type === 'countdown' ? '3 2 1' : esc(label.split(' ')[0] || 'Live')}</div><div class="sr-celebration-caption">${esc(label)}</div>${particleMarkup(type)}`;
    document.body.appendChild(layer);
    requestAnimationFrame(()=>layer.classList.add('active'));
    if (type === 'countdown') {
      const core = layer.querySelector('.sr-celebration-core');
      ['3','2','1','Explosion!'].forEach((text, index)=>setTimeout(()=>{ if (core) core.textContent = text; }, index * 620));
    }
    speakAriaLine(event?.aria_line || CELEBRATIONS.find(item => item.type === type)?.aria);
    setTimeout(()=>layer.remove(), 4300);
  }

  function showStreamerToast(text){
    const pop = document.querySelector('[data-streamer-private-pop]');
    const copy = document.querySelector('[data-streamer-private-text]');
    if (!pop) return;
    if (copy) copy.textContent = text;
    pop.classList.add('active');
    setTimeout(()=>pop.classList.remove('active'), 2600);
  }

  async function sendCelebration(tag, type){
    const spec = CELEBRATIONS.find(item => item.type === type) || CELEBRATIONS[2];
    const localEvent = { id:`local-${Date.now()}`, tag:cleanTag(tag), event_type:spec.type, label:spec.label, aria_line:spec.aria, created_at:new Date().toISOString() };
    rememberEvent(tag, localEvent);
    renderCelebration(localEvent);
    showStreamerToast(`${spec.label} sent to ^^ ${cleanTag(tag)}.`);
    try {
      const response = await fetch('/api/diary/live-event', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ tag:cleanTag(tag), event_type:spec.type, label:spec.label, aria_line:spec.aria })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.event) rememberEvent(tag, data.event);
      }
    } catch {}
  }

  function renderGuestPopout(tag, views){
    if (document.querySelector('[data-diary-popout-shell]')) return;
    const clips = clipSources();
    document.body.classList.add('sr-diary-popout');
    document.body.dataset.srGuestAccount = cleanTag(tag);
    document.body.insertAdjacentHTML('beforeend', `
      <main class="sr-diary-popout-shell" data-diary-popout-shell data-popout-tag="${esc(cleanTag(tag))}">
        <section class="sr-diary-popout-stream">
          <video class="sr-diary-popout-video" muted playsinline autoplay loop preload="metadata" data-popout-video><source src="${esc(clips[0])}" type="video/mp4"></video>
          <div class="sr-diary-popout-shade"></div>
          <div class="sr-diary-popout-top"><strong>^^ ${esc(cleanTag(tag))} Diary Live</strong><span>Views ${views}</span></div>
          <section class="sr-diary-popout-comments" data-popout-comments>${renderComments([])}</section>
          <section class="sr-diary-popout-pay">
            <span>Guest support routes through checkout. No card numbers are typed into the stream.</span>
            <a href="/products/premium" target="_blank" rel="noopener" data-guest-support-kind="premium">Premium debit/credit</a>
            <a href="/products/pro" target="_blank" rel="noopener" data-guest-support-kind="pro">Pro debit/credit</a>
          </section>
          <form class="sr-guest-compose" data-guest-comment-form>
            <input name="author" autocomplete="name" placeholder="Guest name">
            <input name="comment" autocomplete="off" placeholder="Comment on the stream">
            <button type="submit">Send</button>
          </form>
        </section>
      </main>
    `);
    const video = document.querySelector('[data-popout-video]');
    try { video?.play?.(); } catch {}
    fetchAccountFeed(tag).then(feed => {
      setPopoutComments(feed.comments || []);
      if (feed.event?.id) {
        latestEventByTag[cleanTag(tag)] = feed.event.id;
      }
    });
  }

  async function pollGuest(tag){
    const feed = await fetchAccountFeed(tag);
    setPopoutComments(feed.comments || []);
    const event = feed.event || {};
    if (event.id && latestEventByTag[cleanTag(tag)] !== event.id) {
      latestEventByTag[cleanTag(tag)] = event.id;
      rememberEvent(tag, event);
      renderCelebration(event);
    }
  }

  function bootGuestMode(){
    addStyles();
    if (!isGuestAccountRoute()) return;
    const tag = routeTag() || DEFAULT_TAG;
    const views = incrementViews(tag);
    renderGuestPopout(tag, views);
    if (guestPollTimer) clearInterval(guestPollTimer);
    guestPollTimer = setInterval(()=>pollGuest(tag), 2200);
    setTimeout(()=>root.renderFunctionalPanel?.('diary'), 250);
  }

  function initDiaryBacklinkVideo(){
    addStyles();
    if (isGuestAccountRoute()) bootGuestMode();
    if (document.querySelector('[data-panel="diary"]')) enhanceDiary();
  }

  document.addEventListener('click', async event => {
    const copy = event.target.closest('[data-copy-diary-link]');
    if (copy) {
      event.preventDefault();
      try {
        await navigator.clipboard.writeText(copy.dataset.copyDiaryLink);
        copy.textContent = 'Copied Backlink';
      } catch {
        prompt('Copy Diary backlink', copy.dataset.copyDiaryLink);
      }
    }
    const popout = event.target.closest('[data-open-diary-popout]');
    if (popout) {
      event.preventDefault();
      const url = popout.dataset.openDiaryPopout || accountUrl(accountTag());
      const child = window.open(url, 'SupportRDDiaryLive', 'popup=yes,width=430,height=760,noopener,noreferrer');
      if (!child) window.open(url, '_blank', 'noopener,noreferrer');
      showStreamerToast(`Diary Live pop-out opened for ^^ ${accountTag()}.`);
    }
    const celebrate = event.target.closest('[data-diary-celebrate]');
    if (celebrate) {
      event.preventDefault();
      sendCelebration(celebrate.dataset.diaryTag || accountTag(), celebrate.dataset.diaryCelebrate);
    }
    const support = event.target.closest('[data-guest-support-kind]');
    if (support) {
      const tag = routeTag() || accountTag();
      postAccountComment(tag, {
        author_name:'Guest',
        comment_text:`Opened ${support.dataset.guestSupportKind} debit/credit checkout from Diary Live.`,
        comment_kind:'support',
        amount_label:support.dataset.guestSupportKind
      });
    }
    const play = event.target.closest('[data-hair-clip-play]');
    if (play) {
      const box = play.closest('[data-real-hair-video]');
      const video = box?.querySelector('video');
      if (video) {
        video.currentTime = 0;
        video.play();
        setTimeout(()=>{ try { video.pause(); } catch {} }, 10000);
      }
    }
    const next = event.target.closest('[data-hair-clip-next],[data-hair-clip-prev]');
    if (next) {
      const box = next.closest('[data-real-hair-video]');
      const video = box?.querySelector('video');
      const source = video?.querySelector('source');
      if (video && source) {
        const clips = clipSources();
        let index = clips.indexOf(source.getAttribute('src'));
        index = next.matches('[data-hair-clip-prev]') ? Math.max(0, index - 1) : (index + 1) % clips.length;
        source.src = clips[index];
        video.load();
      }
    }
  }, true);

  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-guest-comment-form]');
    if (!form) return;
    event.preventDefault();
    const tag = routeTag() || accountTag();
    const author = form.elements.author?.value || 'Guest';
    const comment = form.elements.comment?.value || '';
    if (!comment.trim()) return;
    form.elements.comment.value = '';
    postAccountComment(tag, { author_name:author, comment_text:comment, comment_kind:'comment' });
  }, true);

  document.addEventListener('DOMContentLoaded', bootGuestMode, { once:true });
  if (document.readyState !== 'loading') bootGuestMode();
  root.getDiaryAccountUrl = () => accountUrl(accountTag());
  root.initDiaryBacklinkVideo = initDiaryBacklinkVideo;
})();
