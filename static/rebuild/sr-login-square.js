(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const KEY = 'srLoginPanelV27';
  const OWNER_EMAILS = ['zzzanthony123@gmail.com'];
  const OWNER_PHONES = ['9802306202','7044533983'];
  const PLAN_LINKS = {
    free: { label:'Free', tier:'Free', href:'/' },
    premium: { label:'Premium', tier:'Premium', href:'https://shop.supportrd.com/products/aria-ai-voice-inner-circle-tier-premium-account' },
    pro: { label:'Pro', tier:'Pro', href:'https://shop.supportrd.com/products/aria-professional-making-money-tier-professional-account' },
    studio: { label:'Studio Jake', tier:'Studio Jake', href:'https://shop.supportrd.com/products/jake-in-the-studio-studio-tier-professional-studio-account' }
  };
  const PLAN_META = {
    free: { short:'Start account', tag:'Free', detail:'Basic route with saved settings.' },
    premium: { short:'Diary, Profile, ARIA', tag:'Premium', detail:'Paid live, celebrations, hair reads.' },
    pro: { short:'Pro account perks', tag:'Pro', detail:'Premium access plus stronger account perks.' },
    studio: { short:'Optional Studio Jake', tag:'Studio', detail:'Studio tools and premium FX routing.' }
  };

  function esc(v){return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function phone(v){return String(v||'').replace(/[^0-9]/g,'');}
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return {};}}
  function isOwner(email,ph){return OWNER_EMAILS.includes(String(email||'').toLowerCase())||OWNER_PHONES.includes(phone(ph));}
  function planKey(v){const raw=String(v||'free').toLowerCase();if(raw.includes('studio'))return 'studio';if(raw.includes('pro'))return 'pro';if(raw.includes('premium'))return 'premium';return PLAN_LINKS[raw]?raw:'free';}
  function tierFor(plan, owner){return owner?'Premium / Pro / Studio Jake':PLAN_LINKS[planKey(plan)].tier;}
  function paidPlan(plan){return /premium|pro|studio|signals/i.test(String(plan||''));}
  function hasAccess(){const l=read();if(isOwner(l.email,l.phone))return true;return !!l.confirmed&&!!l.emailVerified&&paidPlan(l.tier||l.membershipPlan);}
  function hasStudio(){const l=read();return isOwner(l.email,l.phone)||/studio|pro/i.test(String(l.tier||l.membershipPlan||''));}
  function statusText(text){const el=document.querySelector('#srLoginStatus');if(el)el.textContent=text;}

  function featureFlags(plan, owner){
    const key = owner ? 'studio' : planKey(plan);
    const premium = owner || ['premium','pro','studio'].includes(key);
    const pro = owner || ['pro','studio'].includes(key);
    return {
      diaryPaidLive: premium,
      ariaCelebrations: premium,
      profilePremiumReadings: premium,
      profileSummaryReadings: premium,
      studioPremiumFx: pro,
      studioJake: owner || key === 'studio',
      mapPerksSavedToAccount: premium,
      faqRealNamePosting: !!premium
    };
  }

  function paymentLinks(){
    return `<div class="sr-link-head">Account routes</div>${['free','premium','pro','studio'].map(key=>`<a class="sr-login-link ${key==='free'?'free':''}" href="${esc(PLAN_LINKS[key].href)}" ${key==='free'?'':'target="_blank" rel="noopener"'}><span>${key==='free'?'Free Register':esc(PLAN_LINKS[key].label)}</span><small>${key==='free'?'No checkout':'Checkout'}</small></a>`).join('')}`;
  }

  function selectedPlan(){
    const box=document.querySelector('#srLoginSquare');
    return planKey(box?.dataset.plan || read().membershipPlan || 'free');
  }

  function planCards(){
    const selected = selectedPlan();
    return `<div class="sr-plan-head"><span>Choose access</span><em>${esc(PLAN_LINKS[selected].tier)}</em></div><div class="sr-plan-grid">${Object.entries(PLAN_LINKS).map(([key, plan])=>{const meta=PLAN_META[key];return `<button class="sr-plan-card ${selected===key?'active':''}" type="button" data-plan-pick="${esc(key)}" aria-pressed="${selected===key?'true':'false'}"><span class="sr-plan-dot"></span><span class="sr-plan-copy"><strong>${esc(plan.label)}</strong><small>${esc(meta.short)}</small></span><span class="sr-plan-tag">${esc(meta.tag)}</span></button>`;}).join('')}</div><div class="sr-plan-detail">${esc(PLAN_META[selected].detail)}</div>`;
  }

  function field(dataAttr,type,label,value,placeholder,auto){
    return `<label class="sr-field"><span>${esc(label)}</span><input ${dataAttr} type="${esc(type)}" placeholder="${esc(placeholder||label)}" value="${esc(value||'')}" autocomplete="${esc(auto||'off')}"></label>`;
  }

  function css(){
    if(document.querySelector('#srLoginSquareCss'))return;
    const s=document.createElement('style');
    s.id='srLoginSquareCss';
    s.textContent='.sr-login-square{position:fixed;right:0;top:64px;z-index:7000;width:min(260px,calc(100vw - 92px));max-height:calc(100dvh - 76px);overflow:auto;box-sizing:border-box;border:1px solid rgba(148,163,184,.3);border-right:0;border-left:3px solid rgba(16,163,127,.86);border-radius:8px 0 0 8px;background:linear-gradient(180deg,rgba(15,23,32,.86),rgba(8,13,21,.82));backdrop-filter:blur(20px);color:#f8fafc;padding:8px;box-shadow:0 10px 28px rgba(0,0,0,.24);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.sr-login-square *{box-sizing:border-box}.sr-login-square::-webkit-scrollbar{width:6px}.sr-login-square::-webkit-scrollbar-thumb{background:rgba(148,163,184,.35);border-radius:999px}.sr-login-head{display:grid;grid-template-columns:30px 1fr;gap:7px;align-items:center;margin-bottom:7px}.sr-login-mark{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:linear-gradient(135deg,#10a37f,#7dd3fc);color:#06101f;font-weight:900;font-size:.72rem;box-shadow:inset 0 1px rgba(255,255,255,.38)}.sr-login-title h3{margin:0;font-size:.82rem;line-height:1.1}.sr-login-title p{margin:2px 0 0;color:#94a3b8;font-size:.6rem;line-height:1.2}.sr-login-chip,.sr-login-access{grid-column:1/-1;display:inline-flex;align-items:center;justify-content:flex-start;min-height:22px;border:1px solid rgba(16,163,127,.38);border-radius:999px;padding:0 7px;color:#b7f7dc;background:rgba(16,163,127,.12);font-size:.58rem;font-weight:800;white-space:nowrap}.sr-login-copy{margin:0 0 7px;padding:6px;border:1px solid rgba(148,163,184,.18);border-radius:8px;background:rgba(255,255,255,.035);color:#cbd5e1;font-size:.58rem;line-height:1.25}.sr-login-fields{display:grid;gap:5px}.sr-field{display:block}.sr-field span{display:block;margin:0 0 2px;color:#a7b3c5;font-size:.58rem;font-weight:800;text-transform:uppercase}.sr-field input{width:100%;height:32px;border:1px solid rgba(148,163,184,.24);border-radius:8px;background:rgba(2,6,13,.48);color:#f8fafc;padding:0 8px;font-size:.74rem;outline:0;transition:border-color .16s ease,box-shadow .16s ease,background .16s ease}.sr-field input:focus{border-color:rgba(16,163,127,.82);box-shadow:0 0 0 2px rgba(16,163,127,.18);background:rgba(2,6,13,.72)}.sr-field input::placeholder{color:#64748b}.sr-plan-head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:7px 0 5px}.sr-plan-head span{color:#dbeafe;font-size:.64rem;font-weight:900}.sr-plan-head em{font-style:normal;color:#86efac;font-size:.58rem;font-weight:900}.sr-plan-grid{display:grid;grid-template-columns:1fr;gap:5px}.sr-plan-card{position:relative;display:grid;grid-template-columns:10px 1fr;align-items:center;gap:6px;min-height:40px;margin:0;padding:6px;border:1px solid rgba(148,163,184,.2);border-radius:8px;background:rgba(255,255,255,.04);color:#e5edf7;text-align:left;cursor:pointer}.sr-plan-card:hover{border-color:rgba(125,211,252,.45);background:rgba(125,211,252,.07)}.sr-plan-card.active{border-color:rgba(16,163,127,.9);background:linear-gradient(180deg,rgba(16,163,127,.18),rgba(16,163,127,.07));box-shadow:0 0 0 1px rgba(16,163,127,.2)}.sr-plan-dot{width:8px;height:8px;border:2px solid rgba(148,163,184,.55);border-radius:50%;display:block}.sr-plan-card.active .sr-plan-dot{border-color:#10a37f;background:#10a37f;box-shadow:inset 0 0 0 2px #0f1720}.sr-plan-copy strong{display:block;font-size:.68rem;line-height:1.1}.sr-plan-copy small{display:block;margin-top:1px;color:#9caec1;font-size:.55rem;font-weight:700;line-height:1.1}.sr-plan-tag{display:none}.sr-plan-detail{margin-top:6px;border-left:3px solid #10a37f;padding:5px 6px;background:rgba(16,163,127,.08);border-radius:0 8px 8px 0;color:#b6c7d9;font-size:.58rem;line-height:1.25}.sr-provider-row{display:grid;grid-template-columns:1fr;gap:5px;margin-top:7px}.sr-login-square button{min-height:32px;border:1px solid rgba(148,163,184,.2);border-radius:8px;background:rgba(255,255,255,.055);color:#f8fafc;font-weight:850;font-size:.68rem;cursor:pointer;transition:transform .14s ease,border-color .14s ease,background .14s ease}.sr-login-square button:hover{transform:translateY(-1px);border-color:rgba(125,211,252,.46);background:rgba(125,211,252,.08)}.sr-login-actions{display:grid;grid-template-columns:1fr;gap:5px;margin-top:7px}.sr-login-actions button{margin:0;padding:0 8px}.sr-login-actions button[data-login-save]{min-height:34px;background:#10a37f;border-color:#10a37f;color:#fff;font-size:.72rem;box-shadow:0 8px 22px rgba(16,163,127,.18)}.sr-login-actions .ghost{background:rgba(255,255,255,.03);color:#d7e1ed}.sr-login-links{display:grid;grid-template-columns:1fr;gap:5px;margin-top:7px}.sr-link-head{grid-column:1/-1;color:#94a3b8;font-size:.58rem;font-weight:900;text-transform:uppercase}.sr-login-link{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:32px;border:1px solid rgba(148,163,184,.2);border-radius:8px;padding:5px 7px;color:#f8fafc;text-decoration:none;background:rgba(255,255,255,.04);font-size:.62rem;font-weight:900}.sr-login-link small{color:#8ea0b4;font-size:.55rem;font-weight:800}.sr-login-link.free{border-color:rgba(134,239,172,.35);background:rgba(34,197,94,.12);color:#dcfce7}.sr-login-status{border:1px solid rgba(148,163,184,.18);border-radius:8px;background:rgba(255,255,255,.035);padding:6px;margin-top:7px;color:#b9c6d6;font-size:.58rem;line-height:1.25}.sr-account-grid{display:grid;grid-template-columns:1fr;gap:5px;margin:7px 0}.sr-account-stat{border:1px solid rgba(148,163,184,.18);border-radius:8px;background:rgba(255,255,255,.035);padding:6px}.sr-account-stat span{display:block;color:#94a3b8;font-size:.58rem;font-weight:900;text-transform:uppercase}.sr-account-stat strong{display:block;margin-top:2px;color:#f8fafc;font-size:.68rem}.sr-login-note{font-size:.62rem;color:#b9c6d6;line-height:1.25;margin:6px 0}.sr-login-name{color:#fff;font-weight:900}@media(max-width:390px){.sr-login-square{top:54px;width:min(238px,calc(100vw - 104px));max-height:calc(100dvh - 64px);padding:8px}}';
    document.head.appendChild(s);
  }

  function html(){
    const l=read();
    if(l.confirmed){
      const flags=featureFlags(l.membershipPlan||l.tier,isOwner(l.email,l.phone));
      return `<div class="sr-login-head"><div class="sr-login-mark">SR</div><div class="sr-login-title"><h3>Account Access</h3><p>SupportRD routes, perks, and saved features.</p></div><span class="sr-login-access">${hasAccess()?'Premium / Pro active':'Free account'}</span></div><p class="sr-login-note"><span class="sr-login-name">${esc(l.username||'DYGENRJE')}</span><br>${esc(l.email||'')} ${l.phone?`<br>${esc(l.phone)}`:''}<br>${l.emailVerified?'Verified email account':'Email confirmation pending'}</p><div class="sr-account-grid"><div class="sr-account-stat"><span>Diary Live</span><strong>${flags.diaryPaidLive?'Active':'Locked'}</strong></div><div class="sr-account-stat"><span>Profile Reads</span><strong>${flags.profilePremiumReadings?'Premium':'Free'}</strong></div><div class="sr-account-stat"><span>Studio FX</span><strong>${flags.studioPremiumFx?'Premium':'Free'}</strong></div><div class="sr-account-stat"><span>Map Perks</span><strong>${flags.mapPerksSavedToAccount?'Saved':'Basic'}</strong></div></div><div class="sr-login-links">${paymentLinks()}</div><div class="sr-login-actions"><button data-login-edit>Update Login</button><button class="ghost" data-email-confirm>Verify Email</button><button class="ghost" data-forgot-password>Forgot Password</button></div><div id="srLoginStatus" class="sr-login-status">Account features are saved to this browser and account backbone.</div>`;
    }
    return `<div class="sr-login-head"><div class="sr-login-mark">SR</div><div class="sr-login-title"><h3>SupportRD Login</h3><p>Clean account routing for free, Premium, Pro, and Studio Jake.</p></div><span class="sr-login-chip">Smart access</span></div><p class="sr-login-copy">Email confirms registration. Password confirmation is only used for register or reset, not normal login.</p><div class="sr-login-fields">${field('data-login-name','text','Profile name',l.username||'','Your public name','name')}${field('data-login-email','email','Email',l.email||'','you@example.com','email')}${field('data-login-phone','tel','Phone number',l.phone||'','Optional contact number','tel')}${field('data-login-password','password','Password','','Enter password','new-password')}${field('data-login-password-confirm','password','Confirm password','','Only for reset/register','new-password')}</div>${planCards()}<div class="sr-provider-row"><button data-provider="gmail">Gmail</button><button data-provider="microsoft">Microsoft</button><button data-provider="apple">Apple</button></div><div class="sr-login-actions"><button data-login-save>Login</button><button class="ghost" data-email-confirm>Email Confirmation</button><button class="ghost" data-forgot-password>Forgot Password</button></div><div class="sr-login-links">${paymentLinks()}</div><div id="srLoginStatus" class="sr-login-status">Login saves the account name, selected plan, and feature access popout.</div>`;
  }

  function render(){
    css();
    let box=document.querySelector('#srLoginSquare');
    if(!box){box=document.createElement('aside');box.id='srLoginSquare';box.className='sr-login-square';document.body.appendChild(box);}
    if(!box.dataset.plan)box.dataset.plan=planKey(read().membershipPlan||read().tier||'free');
    box.innerHTML=html();
  }

  function applyAccountFeatures(login, owner){
    const flags=featureFlags(login.membershipPlan, owner);
    const cycle=new Date().toISOString().slice(0,10);
    try {
      root.patchAccountBackbone?.('membership',{ plan:login.membershipPlan, tier:login.tier, verifiedEmail:!!login.emailVerified, paymentLinks:PLAN_LINKS });
      root.patchAccountBackbone?.('features',flags);
      root.patchAccountBackbone?.('diary',{ paidLive:flags.diaryPaidLive, ariaCelebrations:flags.ariaCelebrations });
      root.patchAccountBackbone?.('profile',{ displayName:login.username, premiumHistoricalReadings:flags.profilePremiumReadings, summaryReadings:flags.profileSummaryReadings });
      root.patchAccountBackbone?.('studio',{ premiumFx:flags.studioPremiumFx, studioJake:flags.studioJake });
      root.patchAccountBackbone?.('mapChange',{ savedToAccount:flags.mapPerksSavedToAccount, perkCycle:cycle });
      root.patchAccountBackbone?.('faq',{ realNamePosting:flags.faqRealNamePosting, displayName:login.username });
      root.patchAccountBackbone?.('market',{ linked:owner, paid:owner, price:25000, url:'https://lasersmarket.com/' });
      root.initAccountBackbone?.();
    } catch {}
  }

  function save(){
    const email=document.querySelector('[data-login-email]')?.value.trim()||'';
    const ph=document.querySelector('[data-login-phone]')?.value||'';
    const name=document.querySelector('[data-login-name]')?.value.trim()||'';
    const pw=document.querySelector('[data-login-password]')?.value||'';
    const confirm=document.querySelector('[data-login-password-confirm]')?.value||'';
    if(pw&&confirm&&pw!==confirm){statusText('Password confirmation does not match.');return;}
    const owner=isOwner(email,ph);
    const plan=owner?'studio':selectedPlan();
    const login={username:owner?'DYGENRJE':(name||email.split('@')[0]||'Member'),email,phone:ph,tier:tierFor(plan,owner),membershipPlan:plan,confirmed:true,emailVerified:owner||!!email,provider:document.querySelector('#srLoginSquare')?.dataset.provider||'',features:featureFlags(plan,owner),paymentLink:PLAN_LINKS[plan].href,at:new Date().toISOString()};
    localStorage.setItem(KEY,JSON.stringify(login));
    if(owner)localStorage.setItem('srSignalsGroupPaid','true');
    applyAccountFeatures(login,owner);
    render();
  }

  async function accountEmail(kind){
    const l=read();
    const email=document.querySelector('[data-login-email]')?.value.trim()||l.email||'';
    if(!email){statusText('Enter an email first.');return;}
    const endpoint=kind==='reset'?'/api/account/password-reset/request':'/api/account/email-confirmation';
    statusText(kind==='reset'?'Sending password reset route...':'Sending email confirmation route...');
    try {
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,display_name:document.querySelector('[data-login-name]')?.value||l.username||'SupportRD Member'})});
      const data=await res.json();
      if(data.ok) statusText(data.email_sent?'Email sent. Check the inbox for the confirmation route.':`Confirmation route ready: ${data.confirmation_url||data.reset_url||'server returned a token route'}`);
      else statusText(data.error||'Email route could not be created yet.');
    } catch {
      statusText('Email route endpoint is not reachable on this deploy yet.');
    }
  }

  document.addEventListener('click',e=>{
    const plan=e.target.closest('[data-plan-pick]');
    if(plan){document.querySelector('#srLoginSquare').dataset.plan=plan.dataset.planPick;render();return;}
    if(e.target.closest('[data-login-edit]')){localStorage.removeItem(KEY);render();return;}
    const p=e.target.closest('[data-provider]');
    if(p){document.querySelector('#srLoginSquare').dataset.provider=p.dataset.provider;statusText(`${p.dataset.provider} selected. OAuth can be connected server-side.`);return;}
    if(e.target.closest('[data-email-confirm]')){accountEmail('confirm');return;}
    if(e.target.closest('[data-forgot-password]')){accountEmail('reset');return;}
    if(e.target.closest('[data-login-save]'))save();
  },true);

  root.hasPremiumEntitlement=hasAccess;
  root.hasStudioJakeEntitlement=hasStudio;
  root.getLoginAccount=read;
  root.activateLoginFeatures=applyAccountFeatures;
  root.initLoginSquare=render;
  render();
})();
