(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const ACCOUNT_KEY = 'srUnifiedAccountBackboneV28';
  const VIEW_KEY = 'srDiaryLiveViewsV1';
  const DEFAULT_TAG = 'DYGENRJE';
  const DEFAULT_CLIPS = [
    '/static/videos/hair-clip-1.mp4',
    '/static/videos/hair-clip-2.mp4',
    '/static/videos/hair-clip-3.mp4'
  ];

  function esc(value){return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function getAccount(){try{return root.getAccountBackbone?.() || JSON.parse(localStorage.getItem(ACCOUNT_KEY)||'{}')}catch{return {username:DEFAULT_TAG,email:'zzzanthony123@gmail.com',tier:'Premium / Pro'}}}
  function accountTag(){return String(getAccount().username || DEFAULT_TAG).replace(/[^a-z0-9_-]/gi,'').toUpperCase() || DEFAULT_TAG}
  function accountUrl(tag){return `${location.origin}/accounts/${encodeURIComponent(tag || accountTag())}`}
  function clipSources(){
    const configured = (window.SR_REAL_HAIR_CLIPS || root.realHairClips || []).filter(Boolean);
    return configured.length ? configured : DEFAULT_CLIPS;
  }
  function incrementViews(tag){
    const key = `${VIEW_KEY}:${tag}`;
    const current = Number(localStorage.getItem(key) || '0') || 0;
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return next;
  }
  function currentViews(tag){return Number(localStorage.getItem(`${VIEW_KEY}:${tag}`)||'0')||0;}
  function isGuestAccountRoute(){return /^\/accounts\/[^/]+/i.test(location.pathname || '');}
  function routeTag(){const m=(location.pathname||'').match(/^\/accounts\/([^/]+)/i);return m?decodeURIComponent(m[1]).replace(/[^a-z0-9_-]/gi,'').toUpperCase():'';}
  function addStyles(){
    if(document.querySelector('#srDiaryBacklinkVideoCss'))return;
    const s=document.createElement('style');s.id='srDiaryBacklinkVideoCss';
    s.textContent='.sr-channel-link-card{border:1px solid rgba(114,247,255,.28);border-radius:1rem;padding:.85rem;margin:.75rem 0;background:rgba(114,247,255,.08)}.sr-channel-link-card code{display:block;word-break:break-all;margin:.4rem 0;padding:.45rem;border-radius:.6rem;background:rgba(0,0,0,.28)}.sr-real-hair-video{width:100%;aspect-ratio:9/16;max-height:420px;object-fit:cover;border-radius:1rem;background:#020813;border:1px solid rgba(255,255,255,.14)}.sr-video-note{font-size:.85rem;opacity:.78}.sr-view-badge{display:inline-flex;gap:.35rem;align-items:center;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:.25rem .55rem;margin:.2rem .2rem .2rem 0}.sr-guest-mode-banner{position:sticky;top:0;z-index:50;border:1px solid rgba(255,236,110,.35);background:rgba(6,16,31,.92);backdrop-filter:blur(14px);padding:.7rem;border-radius:0 0 1rem 1rem;margin-bottom:.5rem}.sr-guest-mode-banner strong{color:#ffec6e}';
    document.head.appendChild(s);
  }
  function videoMarkup(context){
    const clips=clipSources();
    return `<div class="sr-channel-link-card" data-real-hair-video="${esc(context)}"><h3>10 Second Real Hair Motivation Clip</h3><video class="sr-real-hair-video" muted playsinline controls preload="metadata" data-real-hair-player><source src="${esc(clips[0])}" type="video/mp4"></video><div class="sr-room-actions"><button class="sr-mini-btn" type="button" data-hair-clip-prev>Prev Clip</button><button class="sr-buy-btn" type="button" data-hair-clip-play>Play 10s Clip</button><button class="sr-mini-btn" type="button" data-hair-clip-next>Next Clip</button></div><p class="sr-video-note">Use this clip as motivation to share your Diary backlink. Replace <code>/static/videos/hair-clip-1.mp4</code> with your real MP4 hair clips when ready.</p></div>`;
  }
  function diaryBacklinkMarkup(tag){
    const url=accountUrl(tag), views=currentViews(tag);
    return `<div class="sr-channel-link-card" data-diary-channel-card><h3>Diary Live Backlink</h3><span class="sr-view-badge">Current views: <strong data-diary-view-count>${views}</strong></span><span class="sr-view-badge">Channel: <strong>^^ ${esc(tag)}</strong></span><code>${esc(url)}</code><div class="sr-room-actions"><button class="sr-buy-btn" type="button" data-copy-diary-link="${esc(url)}">Copy Backlink</button><a class="sr-mini-btn" href="${esc(url)}" target="_blank" rel="noopener">Open Guest View</a></div><p class="sr-video-note">Share this link when you want people to view your Diary Live channel.</p></div>`;
  }
  const oldRender = root.renderFunctionalPanel;
  root.renderFunctionalPanel = function(route){
    oldRender?.(route);
    addStyles();
    setTimeout(()=>{
      if(route==='diary') enhanceDiary();
      if(route==='faq') enhanceFaq();
    },0);
  };
  window.renderPanel = root.renderFunctionalPanel;
  function enhanceDiary(){
    const tag = isGuestAccountRoute() ? routeTag() : accountTag();
    const live = document.querySelector('#srDiaryLiveRoom') || document.querySelector('[data-panel="diary"] .sr-room-card');
    if(live && !document.querySelector('[data-diary-channel-card]')){
      live.insertAdjacentHTML('afterend', diaryBacklinkMarkup(tag) + videoMarkup('diary'));
    }
    updateViewBadge(tag);
  }
  function enhanceFaq(){
    const reel = document.querySelector('#srTikTokReelContainer') || document.querySelector('[data-panel="faq"] .sr-reel-card');
    if(reel && !document.querySelector('[data-real-hair-video="faq"]')){
      reel.innerHTML = videoMarkup('faq');
    }
  }
  function updateViewBadge(tag){
    const el=document.querySelector('[data-diary-view-count]');
    if(el)el.textContent=currentViews(tag);
  }
  function bootGuestMode(){
    addStyles();
    if(!isGuestAccountRoute())return;
    const tag=routeTag()||DEFAULT_TAG;
    const views=incrementViews(tag);
    document.body.dataset.srGuestAccount=tag;
    const banner=document.createElement('div');
    banner.className='sr-guest-mode-banner';
    banner.innerHTML=`Viewing <strong>^^ ${esc(tag)}</strong> Diary channel in guest mode · Current views: <strong>${views}</strong>`;
    document.body.prepend(banner);
    setTimeout(()=>{root.renderFunctionalPanel?.('diary');},250);
  }
  document.addEventListener('click',async event=>{
    const copy=event.target.closest('[data-copy-diary-link]');
    if(copy){event.preventDefault();try{await navigator.clipboard.writeText(copy.dataset.copyDiaryLink);copy.textContent='Copied Backlink';}catch{prompt('Copy Diary backlink',copy.dataset.copyDiaryLink)}}
    const play=event.target.closest('[data-hair-clip-play]');
    if(play){const box=play.closest('[data-real-hair-video]');const v=box?.querySelector('video');if(v){v.currentTime=0;v.play();setTimeout(()=>{try{v.pause()}catch{}},10000)}}
    const next=event.target.closest('[data-hair-clip-next],[data-hair-clip-prev]');
    if(next){const box=next.closest('[data-real-hair-video]');const v=box?.querySelector('video');const src=v?.querySelector('source');if(v&&src){const clips=clipSources();let i=clips.indexOf(src.getAttribute('src'));i=next.matches('[data-hair-clip-prev]')?Math.max(0,i-1):(i+1)%clips.length;src.src=clips[i];v.load();}}
  },true);
  document.addEventListener('DOMContentLoaded',bootGuestMode,{once:true});
  if(document.readyState!=='loading')bootGuestMode();
  root.getDiaryAccountUrl=()=>accountUrl(accountTag());
})();