(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};

  const AS = {
    faqHouse:'/static/images/pass33/faq-house.jpg',
    studioPink:'/static/images/pass33/studio-pink-hair.jpg',
    catalogHealthy:'/static/images/pass33/catalog-healthy.jpg',
    proWoman:'/static/images/pass33/pro-woman-support.jpg',
    premiumWhite:'/static/images/pass33/premium-white-shirt.jpg',
    studioJakeTirame:'/static/images/pass33/studio-jake-tirame.jpg',
    diaryRedSuit:'/static/images/pass33/diary-red-suit.jpg',
    profileBeedie:'/static/images/pass33/profile-beedie.jpg',
    wholeBg:'/static/images/pass33/whole-bg-waking.jpg'
  };

  const FALLBACK = {
    faqHouse:'/static/images/pass24/dayparty.jpg',
    studioPink:'/static/images/pass24/artists.jpg',
    catalogHealthy:'/static/images/pass24/healthy_hair.jpeg',
    proWoman:'/static/images/pass24/hija_felix.jpeg',
    premiumWhite:'/static/images/pass24/support_model.jpg',
    studioJakeTirame:'/static/images/pass24/lezawli.jpeg',
    diaryRedSuit:'/static/images/pass24/studio_jake_robe.jpg',
    profileBeedie:'/static/images/pass24/premium_pro_jewels.jpg',
    wholeBg:'/static/images/pass24/package_couple.jpg'
  };

  const Studio = { tracks:[], undo:[], selected:0, recorder:null, stream:null, chunks:[], playing:null, fx:'clean' };

  function esc(v){ return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function img(key){ return AS[key] || FALLBACK[key]; }
  function saveUndo(){ Studio.undo.unshift(Studio.tracks.map(t=>({...t}))); Studio.undo = Studio.undo.slice(0,10); }
  function account(event,payload){ try{ root.recordJakeStudioHistory?.({event,...(payload||{})}); }catch{} }

  function applyAssets(){
    root.assets = root.assets || {};
    root.assets.dayparty = img('faqHouse');
    root.assets.artists = img('studioPink');
    root.assets.productFamily = img('catalogHealthy');
    root.assets.hijaFelix = img('proWoman');
    root.assets.supportModel = img('premiumWhite');
    root.assets.lezawli = img('studioJakeTirame');
    root.assets.healthyHair = img('diaryRedSuit');
    root.assets.studioJake = img('studioPink');
    root.assets.proGirl = img('profileBeedie');
    root.assets.premiumPro = img('profileBeedie');
    if(Array.isArray(root.packages)){
      root.packages = root.packages.map(p=>{
        if(p.id==='studio-jake') return {...p,img:img('studioJakeTirame')};
        if(p.id==='premium-inner'||p.id==='premium') return {...p,img:img('premiumWhite')};
        if(p.id==='pro-making-money'||p.id==='pro') return {...p,img:img('proWoman')};
        if(p.id==='catalog') return {...p,img:img('catalogHealthy')};
        return p;
      });
    }
    document.body.classList.add('sr-pass33-bg');
  }

  function shell(route, eyebrow, title, body, inner, picture){
    return `<section class="sr-panel sr-functional-panel" data-panel="${esc(route)}"><div class="sr-panel-media sr-functional-media" style="background-image:url('${esc(picture)}')"></div><div class="sr-panel-copy sr-functional-copy"><span>${esc(eyebrow)}</span><h2>${esc(title)}</h2><p>${esc(body)}</p>${inner}</div></section>`;
  }

  function renderStudio(){
    return shell('studio','Record / Edit / Export','Studio Motherboard','Record vocals, import MP3/M4A/WAV, move/delete motherboard files, undo changes, playback tracks, choose FX, and export a clean browser-safe motherboard package.',`
      <section class="sr-room-grid">
        <article class="sr-room-card" style="grid-column:1/-1"><h3>Motherboard Files</h3><input id="p33StudioImport" type="file" accept="audio/*,.mp3,.m4a,.wav" multiple><div class="sr-room-actions"><button class="sr-buy-btn" data-p33-rec-start type="button">Record Vocal</button><button class="sr-mini-btn" data-p33-rec-stop type="button">Stop Record</button><button class="sr-mini-btn" data-p33-play type="button">Playback Selected</button><button class="sr-mini-btn" data-p33-stop type="button">Stop</button><button class="sr-mini-btn" data-p33-undo type="button">Undo</button><button class="sr-buy-btn" data-p33-export type="button">Export Motherboard</button></div><canvas id="p33Wave" height="140"></canvas><div id="p33TrackList" class="sr-track-list"></div></article>
        <article class="sr-room-card"><h3>FX Board</h3><div class="sr-room-actions"><button class="sr-mini-btn" data-p33-fx="clean">Clean</button><button class="sr-mini-btn" data-p33-fx="reverb">Reverb</button><button class="sr-mini-btn" data-p33-fx="delay">Delay</button><button class="sr-mini-btn" data-p33-fx="radio">Radio</button></div><p>FX saves to Jake history. True MP3/M4A export needs a server encoder; browser export saves a clean motherboard manifest and keeps source files playable.</p></article>
        <article class="sr-room-card"><h3>Account Access</h3><div class="sr-output-box">Imports, recordings, moves, deletes, undo, FX, playback and export are saved to Account Backbone / Jake history.</div></article>
      </section>`, img('studioPink'));
  }

  function renderFaq(){
    return shell('faq','10 Second Reel + FAQ','FAQ Lounge','FAQ now has a visible 10-second hair reel, real questions, developer feed comments, ratings, and mentions saved to account.',`
      <section class="sr-room-grid"><article class="sr-room-card sr-reel-card"><h3>10 Second TikTok Hair Reel</h3><div class="sr-reel-stage" id="p33Reel"><img src="${img('catalogHealthy')}" onerror="this.src='${FALLBACK.catalogHealthy}'" alt="SupportRD reel"><strong>0-2s: Have healthy hair — it makes you more you.</strong></div><button class="sr-buy-btn" data-p33-reel-play type="button">Play 10s Reel</button></article><article class="sr-room-card"><h3>Frequently Asked Questions</h3><div class="sr-faq-list"><details open><summary>What is SupportRD?</summary><p>A full hair/product remote with Diary, Profile, Studio, FAQ, Catalog, Map perks, Market Laser, Aria, and Jake.</p></details><details><summary>How do live payments work?</summary><p>Diary uses Shopify support checkout for guests to support the live room.</p></details><details><summary>How does hair analysis work?</summary><p>Profile opens the camera, captures left/right frames, estimates texture and damage indicators locally, speaks the result, and saves it to account history.</p></details><details><summary>What is Studio Jake?</summary><p>Jake helps record, organize, playback, edit, and export motherboard audio sessions.</p></details><details><summary>What is Market Laser?</summary><p>It links SupportRD with the market website, account access, and market signal view.</p></details></div></article><article class="sr-room-card"><h3>Developer Feed</h3><textarea data-faq-dev-text placeholder="Post developer comment, mention, or proof..."></textarea><input data-faq-rating type="number" min="1" max="5" placeholder="Rating 1-5"><button class="sr-buy-btn" data-faq-dev-post type="button">Post to Developer Feed</button></article></section>`, img('faqHouse'));
  }

  function render(route){
    const stage=document.querySelector('#remoteStage'); if(!stage) return false;
    document.querySelectorAll('[data-route]').forEach(btn=>btn.classList.toggle('active',btn.dataset.route===route));
    if(route==='studio'){ stage.innerHTML=renderStudio(); setTimeout(refresh,0); return true; }
    if(route==='faq'){ stage.innerHTML=renderFaq(); return true; }
    return false;
  }

  function wrap(){ const old=root.renderFunctionalPanel||root.renderPanel; root.renderFunctionalPanel=function(route){ applyAssets(); if(render(route)) return; return old?.(route); }; root.renderPanel=root.renderFunctionalPanel; window.renderPanel=root.renderFunctionalPanel; }
  function draw(){ const c=document.querySelector('#p33Wave'); if(!c) return; const w=c.width=Math.max(600,c.offsetWidth||700),h=c.height=140,ctx=c.getContext('2d'); ctx.clearRect(0,0,w,h); ctx.fillStyle='rgba(3,8,19,.55)'; ctx.fillRect(0,0,w,h); const count=Math.max(Studio.tracks.length,1); Studio.tracks.forEach((t,i)=>{ const y=(i+.5)*(h/count); ctx.strokeStyle=i===Studio.selected?'#b8f7ff':'#a9cf43'; ctx.lineWidth=i===Studio.selected?3:2; ctx.beginPath(); for(let x=0;x<w;x++){ const yy=y+Math.sin(x*.04+i)*18+Math.sin(x*.015)*8; if(x===0)ctx.moveTo(x,yy); else ctx.lineTo(x,yy); } ctx.stroke(); ctx.fillStyle='rgba(255,255,255,.9)'; ctx.fillText(t.name,12,Math.max(16,y-22)); }); }
  function refresh(){ const list=document.querySelector('#p33TrackList'); if(!list) return; list.innerHTML=Studio.tracks.map((t,i)=>`<article class="sr-track-card ${i===Studio.selected?'active':''}"><strong>${i+1}. ${esc(t.name)}</strong><small>${esc(t.kind)} · ${esc(t.fx||Studio.fx)}</small><div class="sr-room-actions"><button class="sr-mini-btn" data-p33-select="${i}">Select</button><button class="sr-mini-btn" data-p33-up="${i}">↑</button><button class="sr-mini-btn" data-p33-down="${i}">↓</button><button class="sr-mini-btn" data-p33-del="${i}">Delete</button></div></article>`).join('')||'<p>No motherboard files yet. Import or record audio.</p>'; draw(); }
  function addFiles(files){ saveUndo(); [...files].forEach(file=>{ const url=URL.createObjectURL(file); Studio.tracks.push({name:file.name,url,kind:'import',fx:Studio.fx,size:file.size,at:new Date().toISOString()}); try{root.recordStudioImport?.({file:file.name,kind:'import'});}catch{} }); Studio.selected=Math.max(0,Studio.tracks.length-1); refresh(); account('import',{count:files.length}); }
  async function recordStart(){ try{ Studio.stream=await navigator.mediaDevices.getUserMedia({audio:true}); Studio.chunks=[]; Studio.recorder=new MediaRecorder(Studio.stream); Studio.recorder.ondataavailable=e=>{if(e.data.size)Studio.chunks.push(e.data)}; Studio.recorder.onstop=()=>{ saveUndo(); const blob=new Blob(Studio.chunks,{type:Studio.recorder.mimeType||'audio/webm'}); const name=`recorded-vocal-${Date.now()}.webm`; Studio.tracks.push({name,url:URL.createObjectURL(blob),kind:'recording',fx:Studio.fx,size:blob.size,at:new Date().toISOString()}); Studio.selected=Studio.tracks.length-1; try{root.recordStudioImport?.({file:name,kind:'recording'});}catch{} refresh(); account('recording-saved',{file:name}); }; Studio.recorder.start(); account('record-start'); }catch(e){ alert('Record error: '+e.message); } }
  function recordStop(){ try{Studio.recorder?.stop()}catch{} Studio.stream?.getTracks?.().forEach(t=>t.stop()); Studio.stream=null; account('record-stop'); }
  function play(){ stop(); const t=Studio.tracks[Studio.selected]||Studio.tracks[0]; if(!t) return alert('Import or record a motherboard file first.'); Studio.playing=new Audio(t.url); Studio.playing.play(); account('playback',{file:t.name}); }
  function stop(){ try{Studio.playing?.pause?.()}catch{} Studio.playing=null; }
  function undo(){ const prev=Studio.undo.shift(); if(!prev) return; Studio.tracks=prev; Studio.selected=Math.min(Studio.selected,Math.max(0,Studio.tracks.length-1)); refresh(); account('undo'); }
  function move(i,d){ const n=i+d; if(n<0||n>=Studio.tracks.length) return; saveUndo(); const [x]=Studio.tracks.splice(i,1); Studio.tracks.splice(n,0,x); Studio.selected=n; refresh(); account('move-track',{from:i,to:n}); }
  function del(i){ if(i<0||i>=Studio.tracks.length) return; saveUndo(); const [x]=Studio.tracks.splice(i,1); Studio.selected=Math.max(0,Math.min(Studio.selected,Studio.tracks.length-1)); refresh(); account('delete-track',{file:x.name}); }
  function exportMix(){ if(!Studio.tracks.length) return alert('No motherboard files to export.'); const manifest={createdAt:new Date().toISOString(),fx:Studio.fx,tracks:Studio.tracks.map((t,i)=>({order:i+1,name:t.name,kind:t.kind,fx:t.fx||Studio.fx,size:t.size||0}))}; const blob=new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`support-rd-motherboard-export-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href); try{root.recordStudioExport?.({file:a.download,tracks:Studio.tracks.length,fx:Studio.fx});}catch{} account('export-motherboard',{tracks:Studio.tracks.length,fx:Studio.fx}); alert('Motherboard export downloaded. True one-file MP3/M4A needs a server encoder; this preserves the clean motherboard package and account history.'); }
  function reel(){ const el=document.querySelector('#p33Reel'); if(!el) return; const frames=[[img('catalogHealthy'),'0-2s: Have healthy hair — it makes you more you.'],[img('proWoman'),'2-4s: Pro package — Professional / Making Money.'],[img('premiumWhite'),'4-6s: Premium Inner Circle — guided ARIA support.'],[img('diaryRedSuit'),'6-8s: Diary live room — comments and support.'],[img('profileBeedie'),'8-10s: Profile analysis — confirmed hair status.']]; let i=0; const tick=()=>{ const f=frames[i++]; el.innerHTML=`<img src="${f[0]}" onerror="this.src='${FALLBACK.catalogHealthy}'"><strong>${esc(f[1])}</strong>`; if(i<frames.length) setTimeout(tick,2000);}; tick(); try{root.recordDeveloperFeed?.({text:'10 second FAQ reel played',source:'FAQ Lounge'});}catch{} }
  function bind(){ if(window.__srP33Bound) return; window.__srP33Bound=true; document.addEventListener('change',e=>{ if(e.target?.id==='p33StudioImport') addFiles(e.target.files); }); document.addEventListener('click',e=>{ if(e.target.closest('[data-p33-rec-start]')) recordStart(); if(e.target.closest('[data-p33-rec-stop]')) recordStop(); if(e.target.closest('[data-p33-play]')) play(); if(e.target.closest('[data-p33-stop]')) stop(); if(e.target.closest('[data-p33-undo]')) undo(); if(e.target.closest('[data-p33-export]')) exportMix(); if(e.target.closest('[data-p33-reel-play]')) reel(); const s=e.target.closest('[data-p33-select]'); if(s){Studio.selected=+s.dataset.p33Select; refresh();} const u=e.target.closest('[data-p33-up]'); if(u) move(+u.dataset.p33Up,-1); const d=e.target.closest('[data-p33-down]'); if(d) move(+d.dataset.p33Down,1); const x=e.target.closest('[data-p33-del]'); if(x) del(+x.dataset.p33Del); const fx=e.target.closest('[data-p33-fx]'); if(fx){Studio.fx=fx.dataset.p33Fx; account('fx-selected',{fx:Studio.fx}); refresh();} }); }
  function style(){ if(document.querySelector('#srP33Css')) return; const el=document.createElement('style'); el.id='srP33Css'; el.textContent=`body.sr-pass33-bg{background-image:linear-gradient(145deg,rgba(3,8,19,.78),rgba(6,16,31,.86)),url('${img('wholeBg')}')!important;background-size:cover!important;background-position:center!important;background-attachment:fixed!important}.sr-track-list{display:grid;gap:.55rem;margin-top:.8rem}.sr-track-card{padding:.7rem;border-radius:.85rem;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06)}.sr-track-card.active{outline:2px solid rgba(184,247,255,.55);background:rgba(19,183,199,.12)}#p33Wave{width:100%;height:140px;border-radius:1rem;border:1px solid rgba(255,255,255,.14);background:rgba(3,8,19,.55);margin-top:.7rem}.sr-reel-stage img{width:100%;height:18rem;object-fit:cover;border-radius:1rem;display:block}`; document.head.appendChild(el); }
  function init(){ style(); applyAssets(); wrap(); bind(); setTimeout(()=>{try{root.renderAds?.()}catch{}},80); }
  root.initPass33StudioPolish=init;
  document.addEventListener('DOMContentLoaded',init);
})();
