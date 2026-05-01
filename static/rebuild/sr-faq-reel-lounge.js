(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const KEY='srFaqReelLoungeV2';

  let LIVE_REELS = [];

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
  function write(next){localStorage.setItem(KEY,JSON.stringify({...read(),...next}));return read()}
  function account(){try{return root.getAccountBackbone?.()||{}}catch{return {}}}

  async function fetchReels(category){
    const res = await fetch(`/api/faq/reels?category=${category}`);
    const data = await res.json();
    return data.items || [];
  }

  async function loadLive(category){
    LIVE_REELS = await fetchReels(category);
  }

  function current(){const s=read();return {category:s.category||'salon',index:s.index||0}}

  function reel(){const c=current();return LIVE_REELS[c.index % LIVE_REELS.length] || {}};

  function reelUrl(){const r=reel();return r.clip || r.link || ''}

  function ariaAnalysis(){
    const r = reel();
    return `ARIA Analysis:\nReel: ${r.title || 'Hair clip'}\nSource: ${r.source || ''}\n\nThis video shows potential hair condition signals. ARIA is evaluating dryness, frizz, breakage, shine levels, and style structure. If issues are present, a moisture routine, proper shampoo selection, and protective styling may be recommended.`;
  }

  function html(){const c=current();const r=reel();return `<div class="sr-faq-youtube">
  <div class="sr-reel-stage">
    <video class="sr-reel-video" data-faq-reel-video muted autoplay loop controls>
      <source src="${esc(reelUrl())}" type="video/mp4">
    </video>
    <div class="sr-reel-overlay">
      <h3>${esc(r.title||'Hair Reel')}</h3>
      <p>${esc(r.source||'Live feed')}</p>
    </div>
  </div>
  <aside class="sr-reel-side">
    <div class="sr-reel-card">
      <h3>Categories</h3>
      ${['salon','meme','professional','random'].map(x=>`<button data-cat="${x}">${x}</button>`).join('')}
    </div>
    <div class="sr-reel-card">
      <h3>Comments</h3>
      <div>${(read().comments||[]).map(c=>`<div>${esc(c.text)}</div>`).join('')}</div>
      <input data-name placeholder="Name">
      <textarea data-text placeholder="Comment"></textarea>
      <button data-post>Post</button>
    </div>
    <div class="sr-reel-card">
      <button data-aria>ARIA Analyze</button>
      <div>${esc(read().analysis||'')}</div>
    </div>
  </aside>
</div>`}

  async function mount(){
    const c=current();
    await loadLive(c.category);
    const box=document.querySelector('#srTikTokReelContainer');
    if(!box)return;
    box.innerHTML=html();
  }

  document.addEventListener('click',async e=>{
    if(e.target.dataset.cat){write({category:e.target.dataset.cat,index:0});await mount();}
    if(e.target.dataset.post){
      const text=document.querySelector('[data-text]').value;
      const r=reel();
      write({comments:[{text,reel:r.title,link:r.link},...(read().comments||[])]});
      mount();
    }
    if(e.target.dataset.aria){
      write({analysis:ariaAnalysis()});
      mount();
    }
  });

  root.initFaqReelLounge=function(){setTimeout(mount,0)};
})();