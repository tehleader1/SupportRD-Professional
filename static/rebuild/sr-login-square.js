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
    return ['free','premium','pro','studio'].map(key=>`<a class="sr-login-link ${key==='free'?'free':''}" href="${esc(PLAN_LINKS[key].href)}" ${key==='free'?'':'target="_blank" rel="noopener"'}>${key==='free'?'Free Register':esc(PLAN_LINKS[key].label)}</a>`).join('');
  }

  function selectedPlan(){
    const box=document.querySelector('#srLoginSquare');
    return planKey(box?.dataset.plan || read().membershipPlan || 'free');
  }

  function planCards(){
    const selected = selectedPlan();
    return `<div class="sr-plan-grid">${Object.entries(PLAN_LINKS).map(([key, plan])=>`<button class="${selected===key?'active':''}" type="button" data-plan-pick="${esc(key)}"><strong>${esc(plan.label)}</strong><span>${key==='free'?'Register first':key==='premium'?'Diary/Profile/ARIA':key==='pro'?'Pro account perks':'Optional Studio Jake'}</span></button>`).join('')}</div>`;
  }

  function css(){
    if(document.querySelector('#srLoginSquareCss'))return;
    const s=document.createElement('style');
    s.id='srLoginSquareCss';
    s.textContent='.sr-login-square{position:fixed;left:1rem;bottom:1rem;z-index:7000;width:min(350px,calc(100vw - 2rem));max-height:calc(100vh - 2rem);overflow:auto;border:1px solid rgba(255,255,255,.18);border-radius:1.2rem;background:rgba(6,16,31,.9);backdrop-filter:blur(18px);color:#fff;padding:1rem;box-shadow:0 20px 60px rgba(0,0,0,.35)}.sr-login-square h3{margin:.05rem 0 .45rem}.sr-login-square input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);border-radius:.65rem;background:rgba(0,0,0,.28);color:#fff;padding:.7rem;margin:.26rem 0;font-size:.95rem}.sr-login-square button{border:0;border-radius:.8rem;background:#72f7ff;color:#06101f;font-weight:1000;padding:.75rem .85rem;margin:.18rem;min-height:46px;cursor:pointer}.sr-login-square .ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.18)}.sr-provider-row,.sr-login-actions,.sr-login-links{display:flex;flex-wrap:wrap;gap:.4rem}.sr-provider-row button,.sr-login-actions button{flex:1 1 130px;font-size:.86rem}.sr-login-note{font-size:.82rem;opacity:.76;line-height:1.35}.sr-login-access{display:inline-block;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:.25rem .5rem;margin:.2rem 0;color:#a9cf43}.sr-plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin:.6rem 0}.sr-plan-grid button{margin:0;text-align:left;background:rgba(255,255,255,.06);color:#fff;border:1px solid rgba(255,255,255,.14);min-height:78px;padding:.75rem}.sr-plan-grid button strong{font-size:1rem}.sr-plan-grid button.active{background:#72f7ff;color:#06101f}.sr-plan-grid span{display:block;font-size:.76rem;font-weight:800;opacity:.78;margin-top:.2rem}.sr-login-link{display:inline-flex;align-items:center;justify-content:center;flex:1 1 140px;min-height:46px;border:1px solid rgba(255,255,255,.18);border-radius:.85rem;padding:.55rem .7rem;color:#fff;text-decoration:none;font-size:.88rem;font-weight:1000;background:rgba(255,255,255,.07)}.sr-login-link.free{background:#a9cf43;color:#06101f}.sr-login-status{border:1px solid rgba(255,255,255,.14);border-radius:.75rem;background:rgba(255,255,255,.06);padding:.55rem;margin-top:.55rem;font-size:.8rem;line-height:1.35}';
    document.head.appendChild(s);
  }

  function html(){
    const l=read();
    if(l.confirmed){
      const flags=featureFlags(l.membershipPlan||l.tier,isOwner(l.email,l.phone));
      return `<h3>Account Access</h3><span class="sr-login-access">${hasAccess()?'Premium / Pro active':'Free account'}</span><p class="sr-login-note"><strong>^^ ${esc(l.username||'DYGENRJE')}</strong><br>${esc(l.email||'')}<br>${esc(l.phone||'')}<br>${l.emailVerified?'Verified email account':'Email confirmation pending'}</p><p class="sr-login-note">Diary paid live: ${flags.diaryPaidLive?'active':'locked'}<br>Profile premium reads: ${flags.profilePremiumReadings?'active':'locked'}<br>Studio FX: ${flags.studioPremiumFx?'premium':'free'}</p><div class="sr-login-links">${paymentLinks()}</div><div class="sr-login-actions"><button data-login-edit>Update Login</button><button class="ghost" data-email-confirm>Verify Email</button><button class="ghost" data-forgot-password>Forgot Password</button></div><div id="srLoginStatus" class="sr-login-status">Account features are saved to this browser and account backbone.</div>`;
    }
    return `<h3>SupportRD Login</h3><p class="sr-login-note">Register with email confirmation. Confirmation code is only used from the email route for reset or verified registration, not normal login.</p><input data-login-name placeholder="Profile name" value="${esc(l.username||'')}"><input data-login-email placeholder="Email" value="${esc(l.email||'')}"><input data-login-phone placeholder="Phone number" value="${esc(l.phone||'')}"><input data-login-password type="password" placeholder="Password"><input data-login-password-confirm type="password" placeholder="Confirm password for reset/register">${planCards()}<div class="sr-provider-row"><button data-provider="gmail">Gmail</button><button data-provider="microsoft">Microsoft</button><button data-provider="apple">Apple</button></div><div class="sr-login-actions"><button data-login-save>Register / Login</button><button class="ghost" data-email-confirm>Email Confirmation</button><button class="ghost" data-forgot-password>Forgot Password</button></div><div class="sr-login-links">${paymentLinks()}</div><div id="srLoginStatus" class="sr-login-status">Select a plan, register, then use the payment link if Premium, Pro, or Studio Jake is needed.</div>`;
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
