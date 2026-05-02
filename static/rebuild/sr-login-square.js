(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const KEY = 'srLoginPanelV27';
  const OWNER_EMAILS = ['zzzanthony123@gmail.com'];
  const OWNER_PHONES = ['9802306202','7044533983'];
  const PLAN_LINKS = {
    free: { label:'Free', tier:'Free', href:'/' },
    premium: { label:'Premium', tier:'Premium', href:'https://shop.supportrd.com/products/aria-ai-voice-inner-circle-tier-premium-account', short:'Diary, Profile, ARIA' },
    pro: { label:'Pro', tier:'Pro', href:'https://shop.supportrd.com/products/aria-professional-making-money-tier-professional-account', short:'Premium perks plus pro routing' },
    studio: { label:'Studio Jake', tier:'Studio Jake', href:'https://shop.supportrd.com/products/jake-in-the-studio-studio-tier-professional-studio-account', short:'Studio Jake and premium FX' }
  };
  const STATE = {
    mode: 'rail',
    provider: '',
    productCollapsed: localStorage.getItem('srProductCollapsed') === 'true'
  };
  const DEFAULT_ARIA_PROFILE = '/static/images/woman-waking-up12.jpg';

  function esc(v){return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function phone(v){return String(v||'').replace(/[^0-9]/g,'');}
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return {};}}
  function write(data){localStorage.setItem(KEY,JSON.stringify(data));}
  function cleanEmail(v){const email=String(v||'').trim().toLowerCase();return email.includes('@')?email:'';}
  function isOwner(email,ph){return OWNER_EMAILS.includes(String(email||'').toLowerCase())||OWNER_PHONES.includes(phone(ph));}
  function planKey(v){const raw=String(v||'free').toLowerCase();if(raw.includes('studio'))return 'studio';if(raw.includes('pro'))return 'pro';if(raw.includes('premium'))return 'premium';return PLAN_LINKS[raw]?raw:'free';}
  function paidPlan(plan){return /premium|pro|studio|signals/i.test(String(plan||''));}
  function tierFor(plan, owner){return owner?'Premium / Pro / Studio Jake':PLAN_LINKS[planKey(plan)].tier;}
  function verifiedPaid(l){return !!(l?.shopifyVerified||l?.serverVerified||String(l?.verifiedSource||l?.source||'').includes('shopify_webhook'))&&paidPlan(l?.tier||l?.membershipPlan);}
  function hasAccess(){const l=read();if(isOwner(l.email,l.phone))return true;return !!l.confirmed&&!!l.emailVerified&&verifiedPaid(l);}
  function hasStudio(){const l=read();return isOwner(l.email,l.phone)||(verifiedPaid(l)&&/studio|pro/i.test(String(l.tier||l.membershipPlan||'')));}
  function displayName(l){const n=String(l.username||'').trim();if(n)return n;const email=String(l.email||'').trim();if(email&&email.includes('@'))return email.split('@')[0]||'Member';const ph=phone(l.phone||l.email);return ph?`Phone ${ph.slice(-4)}`:'SupportRD Member';}
  function statusText(text){const el=document.querySelector('#srLoginStatus');if(el){el.textContent=text;el.style.display='block';}}
  function verificationLine(l){
    if(l.shopifyVerified||l.serverVerified)return `Shopify payment verified${l.orderId?` · ${l.orderId}`:''}`;
    if(l.checkoutPending)return `Waiting for Shopify verification${l.pendingPlan?` · ${PLAN_LINKS[planKey(l.pendingPlan)].label}`:''}`;
    if(l.emailVerified)return 'Verified email account';
    if(l.verificationSent)return 'Verification sent to email';
    return 'Free account saved';
  }
  function currentProfileImage(){
    try {
      const room = JSON.parse(localStorage.getItem('srFunctionalRoomsAdvancedV2') || '{}');
      const account = root.getAccountBackbone?.() || {};
      return room.profileImage || account.profile?.latestProfileImage || DEFAULT_ARIA_PROFILE;
    } catch {
      return DEFAULT_ARIA_PROFILE;
    }
  }
  function markHtml(){
    return `<div class="sr-login-mark sr-login-avatar" style="background-image:url('${esc(currentProfileImage())}')" aria-label="ARIA profile image"></div>`;
  }
  function cartIcon(){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.7"></circle><circle cx="18" cy="20" r="1.7"></circle><path d="M3 4h2.6l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4l1.3-5.4H7.1"></path></svg>';
  }

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

  function css(){
    if(document.querySelector('#srLoginSquareCss'))return;
    const s=document.createElement('style');
    s.id='srLoginSquareCss';
    s.textContent=`
      .sr-login-square,.sr-product-pop{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f8fafc}
      .sr-login-square{position:fixed;right:0;top:64px;z-index:7000;max-height:calc(100dvh - 76px);overflow:auto;box-sizing:border-box}.sr-login-square.is-rail,.sr-login-square.is-account{width:252px}.sr-login-square.is-open{width:190px}
      .sr-login-shell,.sr-product-pop{box-sizing:border-box;border:1px solid rgba(148,163,184,.3);border-right:0;border-radius:8px 0 0 8px;background:linear-gradient(180deg,rgba(15,23,32,.86),rgba(8,13,21,.82));backdrop-filter:blur(20px);box-shadow:0 10px 28px rgba(0,0,0,.24)}
      .sr-login-shell{padding:7px}.sr-login-square *,.sr-product-pop *{box-sizing:border-box}.sr-login-square::-webkit-scrollbar{width:6px}.sr-login-square::-webkit-scrollbar-thumb{background:rgba(148,163,184,.35);border-radius:999px}
      .sr-login-head,.sr-rail-row{display:flex;align-items:center;gap:6px;margin-bottom:6px}.sr-rail-row{display:grid;grid-template-columns:24px 1fr auto auto;margin-bottom:0;min-height:34px}.sr-login-mark{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:linear-gradient(135deg,#10a37f,#7dd3fc);color:#06101f;font-weight:1000;font-size:.62rem;overflow:hidden}.sr-login-avatar{background-size:cover!important;background-position:center!important;color:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.45)}.sr-login-title strong,.sr-rail-label{display:block;font-size:.68rem;line-height:1.05;font-weight:1000}.sr-login-title span,.sr-rail-sub{display:block;color:#94a3b8;font-size:.52rem;line-height:1.12}
      .sr-field input{width:100%;height:29px;margin:0 0 5px;padding:0 7px;border-radius:7px;border:1px solid rgba(148,163,184,.24);background:rgba(2,6,13,.48);color:#f8fafc;font-size:.68rem;outline:0}.sr-field input:focus{border-color:rgba(16,163,127,.82);box-shadow:0 0 0 2px rgba(16,163,127,.18)}
      .sr-login-square button,.sr-product-pop button,.sr-product-pop a{min-height:29px;border-radius:999px;border:1px solid rgba(148,163,184,.22);font-size:.62rem;font-weight:1000;cursor:pointer;text-decoration:none}.sr-login-square button{width:100%;margin-top:4px;background:rgba(255,255,255,.045);color:#f7fbff}.sr-login-square .primary{background:#10a37f;color:#fff;border-color:#10a37f}.sr-login-row{display:grid;grid-template-columns:1fr 1fr;gap:4px}.sr-login-row button{margin-top:0;border-radius:7px}.sr-provider-row{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px}.sr-provider-row button{margin-top:0;background:#f8fafc;color:#07101f;border-radius:7px}.sr-product-toggle{display:block;width:100%;margin-top:5px;border:1px solid rgba(125,211,252,.28)!important;background:rgba(125,211,252,.08)!important;color:#dff7ff!important}.sr-login-square.is-rail .sr-product-toggle{margin-top:0;width:auto;padding:0 9px}.sr-cart-btn{display:grid!important;place-items:center!important;width:31px!important;min-width:31px!important;padding:0!important}.sr-cart-btn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
      .sr-login-status{display:none;margin-top:5px;border:1px solid rgba(16,163,127,.28);border-radius:7px;background:rgba(16,163,127,.08);padding:5px;color:#b7f7dc;font-size:.54rem;line-height:1.22}
      .sr-product-pop{position:fixed;right:252px;top:64px;z-index:6999;width:232px;padding:8px}.sr-product-pop.is-collapsed{display:none}.sr-product-pop strong{display:block;font-size:.78rem}.sr-product-pop p{margin:4px 0 7px;color:#b7c7d8;font-size:.58rem;line-height:1.24}.sr-product-actions{display:grid;gap:5px}.sr-product-pop a,.sr-product-pop button{display:flex;align-items:center;justify-content:space-between;gap:6px;background:rgba(255,255,255,.045);color:#fff;padding:0 8px;border-radius:7px}.sr-product-pop a b,.sr-product-pop button b{font-size:.58rem;color:#8ea0b4}.sr-product-pop .checkout{background:rgba(16,163,127,.14);border-color:rgba(16,163,127,.38);color:#dcfce7}.sr-product-pop .free{background:rgba(125,211,252,.08);border-color:rgba(125,211,252,.28);color:#e0f7ff}
      .sr-account-grid{display:grid;gap:5px;margin-top:5px}.sr-account-stat{display:flex;justify-content:space-between;gap:5px;border:1px solid rgba(255,255,255,.12);border-radius:7px;background:rgba(255,255,255,.04);padding:5px;font-size:.54rem}.sr-account-stat b{color:#f8fafc}.sr-account-note{color:#9fb0c4;font-size:.54rem;line-height:1.22;margin:4px 0}.sr-login-square .ghost{background:rgba(255,255,255,.03);color:#d7e1ed}
      @media(max-width:560px){.sr-login-square{top:56px}.sr-login-square.is-rail,.sr-login-square.is-account{width:226px}.sr-login-square.is-open{width:168px}.sr-product-pop{right:226px;top:56px;width:178px}.sr-login-title span,.sr-rail-sub{display:none}.sr-product-pop p{display:none}}
    `;
    document.head.appendChild(s);
  }

  function productPopupHtml(){
    const provider = STATE.provider ? ` for ${esc(STATE.provider)}` : '';
    return `<aside class="sr-product-pop ${STATE.productCollapsed?'is-collapsed':''}" id="srProductPop">
      <strong>Account Status</strong>
      <p>Register${provider} free, or choose Premium, Pro, or Studio Jake. Paid status unlocks after Shopify sends a verified paid-order webhook.</p>
      <div class="sr-product-actions">
        ${['premium','pro','studio'].map(key=>`<a class="checkout" href="${esc(PLAN_LINKS[key].href)}" target="_blank" rel="noopener" data-sr-checkout-plan="${key}"><span>${esc(PLAN_LINKS[key].label)}</span><b>${esc(PLAN_LINKS[key].short)}</b></a>`).join('')}
        <button type="button" data-sync-subscription><span>Refresh Status</span><b>Shopify verified</b></button>
        <button class="free" type="button" data-sr-free-account><span>Continue Free</span><b>Saved account</b></button>
        <button type="button" data-sr-collapse-products><span>Collapse</span><b>Reopen anytime</b></button>
      </div>
    </aside>`;
  }

  function renderProductPopup(show){
    document.getElementById('srProductPop')?.remove();
    if(!show || STATE.productCollapsed)return;
    document.body.insertAdjacentHTML('beforeend',productPopupHtml());
  }

  let syncTimer = 0;
  function scheduleServerSync(){
    const l=read();
    if(!l.confirmed||!cleanEmail(l.email)||isOwner(l.email,l.phone))return;
    const age=Date.now()-(Number(l.subscriptionSyncedAt)||0);
    if(age<15000)return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>syncServerStatus(false),180);
  }

  async function syncServerStatus(force){
    const l=read();
    const email=cleanEmail(l.email);
    if(!email){statusText('Log in with the same email used at Shopify checkout, then refresh status.');return;}
    if(!force&&Date.now()-(Number(l.subscriptionSyncedAt)||0)<15000)return;
    try {
      const res=await fetch(`/api/subscription/status?email=${encodeURIComponent(email)}&ts=${Date.now()}`,{cache:'no-store'});
      const data=await res.json();
      if(!data.ok){if(force)statusText(data.error||'Subscription status not ready yet.');return;}
      const sub=planKey(data.subscription);
      const verified=!!data.verified&&sub!=='free';
      const next=Object.assign({},l,{subscriptionSyncedAt:Date.now(), recentPurchases:data.recent_purchases||[]});
      if(verified){
        Object.assign(next,{
          membershipPlan:sub,
          tier:tierFor(sub,false),
          confirmed:true,
          emailVerified:true,
          checkoutPending:false,
          shopifyVerified:true,
          serverVerified:true,
          verifiedSource:data.source||'shopify_webhook_paid',
          orderId:data.order_id||'',
          paymentReturnStatus:`${PLAN_LINKS[sub].label} verified`
        });
      }
      write(next);
      applyAccountFeatures(next,isOwner(next.email,next.phone));
      document.dispatchEvent(new CustomEvent('sr-login-updated',{detail:next}));
      if(force)statusText(verified?`${PLAN_LINKS[sub].label} verified by Shopify webhook.`:'No paid Shopify webhook found for this email yet.');
      if(verified||force)render();
    } catch {
      if(force)statusText('Subscription status endpoint is not reachable yet.');
    }
  }

  function railHtml(){
    const l=read();
    if(STATE.mode==='rail'){
      return `<div class="sr-login-shell"><div class="sr-rail-row">
        ${markHtml()}<div><div class="sr-rail-label">Login</div><span class="sr-rail-sub">SupportRD account</span></div>
        <button class="primary" type="button" data-login-open>Login</button><button type="button" data-login-register>Register</button>
      </div><div class="sr-login-row" style="margin-top:5px;grid-template-columns:1fr 31px"><button class="sr-product-toggle" type="button" data-sr-products>Account Status</button><button class="sr-cart-btn" type="button" data-sr-cart aria-label="Open SupportRD catalog">${cartIcon()}</button></div></div>`;
    }
    const register=STATE.mode==='register';
    return `<div class="sr-login-shell">
      <div class="sr-login-head">${markHtml()}<div class="sr-login-title"><strong>${register?'Register':'Login'}</strong><span>${register?'Verify email in background':'Free, Premium, Pro, Studio'}</span></div></div>
      <label class="sr-field"><input data-login-email type="email" placeholder="Email" value="${esc(l.email||'')}" autocomplete="email"></label>
      <label class="sr-field"><input data-login-password type="password" placeholder="Password" autocomplete="${register?'new-password':'current-password'}"></label>
      <div class="sr-login-row"><button class="primary" type="button" ${register?'data-login-register':'data-login-save'}>${register?'Register':'Login'}</button><button type="button" ${register?'data-login-open':'data-login-register'}>${register?'Login':'Register'}</button></div>
      <div class="sr-provider-row"><button type="button" data-provider="Google">Google</button><button type="button" data-provider="Microsoft">Microsoft</button></div>
      <div class="sr-login-row" style="grid-template-columns:1fr 31px"><button class="sr-product-toggle" type="button" data-sr-products>Account Status</button><button class="sr-cart-btn" type="button" data-sr-cart aria-label="Open SupportRD catalog">${cartIcon()}</button></div>
      <button class="ghost" type="button" data-forgot-password>Forgot Password</button>
      <div id="srLoginStatus" class="sr-login-status"></div>
    </div>`;
  }

  function accountHtml(){
    const l=read();
    const owner=isOwner(l.email,l.phone);
    const access=hasAccess();
    const flags=featureFlags(access?l.membershipPlan||l.tier:'free',owner);
    return `<div class="sr-login-shell">
      <div class="sr-login-head">${markHtml()}<div class="sr-login-title"><strong>${esc(displayName(l))}</strong><span>${esc(access?tierFor(l.membershipPlan,owner):'Free account')}</span></div></div>
      <p class="sr-account-note">${esc(l.email||l.phone||'Local account')}<br>${esc(verificationLine(l))}</p>
      <div class="sr-account-grid">
        <div class="sr-account-stat"><span>Account Status</span><b>${access?'Verified':'Free'}</b></div>
        <div class="sr-account-stat"><span>Diary Live</span><b>${flags.diaryPaidLive?'Active':'Locked'}</b></div>
        <div class="sr-account-stat"><span>Profile</span><b>${flags.profilePremiumReadings?'Premium':'Free'}</b></div>
        <div class="sr-account-stat"><span>Studio FX</span><b>${flags.studioPremiumFx?'Premium':'Free'}</b></div>
        <div class="sr-account-stat"><span>Studio Jake</span><b>${flags.studioJake?'Active':'Optional'}</b></div>
      </div>
      <div class="sr-login-row" style="grid-template-columns:1fr 31px"><button class="sr-product-toggle" type="button" data-sr-products>Account Status</button><button class="sr-cart-btn" type="button" data-sr-cart aria-label="Open SupportRD catalog">${cartIcon()}</button></div>
      <button class="ghost" type="button" data-sync-subscription>Refresh Shopify Status</button>
      <button type="button" data-login-edit>Login</button>
      <button class="ghost" type="button" data-email-confirm>Verify Email</button>
      <button class="ghost" type="button" data-forgot-password>Forgot Password</button>
      <div id="srLoginStatus" class="sr-login-status"></div>
    </div>`;
  }

  function render(){
    css();
    let box=document.querySelector('#srLoginSquare');
    if(!box){box=document.createElement('aside');box.id='srLoginSquare';box.className='sr-login-square';document.body.appendChild(box);}
    const l=read();
    box.className=`sr-login-square ${l.confirmed?'is-account':STATE.mode==='rail'?'is-rail':'is-open'}`;
    box.innerHTML=l.confirmed?accountHtml():railHtml();
    renderProductPopup(STATE.mode==='register'||!!STATE.provider);
    scheduleServerSync();
  }

  function applyAccountFeatures(login, owner){
    const flags=featureFlags((owner||verifiedPaid(login))?login.membershipPlan:'free', owner);
    const cycle=new Date().toISOString().slice(0,10);
    try {
      root.patchAccountBackbone?.('membership',{ plan:verifiedPaid(login)||owner?login.membershipPlan:'free', pendingPlan:login.pendingPlan||'', tier:verifiedPaid(login)||owner?login.tier:'Free', verifiedEmail:!!login.emailVerified, shopifyVerified:!!(login.shopifyVerified||login.serverVerified), checkoutPending:!!login.checkoutPending, paymentLink:login.paymentLink, orderId:login.orderId||'', paymentLinks:PLAN_LINKS });
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

  function baseLogin(plan, extra){
    const email=document.querySelector('[data-login-email]')?.value.trim() || read().email || '';
    const pw=document.querySelector('[data-login-password]')?.value || '';
    const ph=phone(email);
    const owner=isOwner(email,ph);
    const key=owner?'studio':planKey(plan);
    const username=owner?'DYGENRJE':displayName({email,phone:ph});
    return Object.assign({
      username,
      email: ph === email ? '' : email,
      phone: ph === email ? ph : '',
      passwordSet: !!pw,
      tier: tierFor(key,owner),
      membershipPlan: key,
      confirmed: true,
      emailVerified: owner,
      provider: STATE.provider || 'email',
      features: featureFlags(key,owner),
      paymentLink: PLAN_LINKS[key].href,
      at: new Date().toISOString()
    }, extra || {});
  }

  function finish(login){
    const owner=isOwner(login.email,login.phone);
    write(login);
    if(owner)localStorage.setItem('srSignalsGroupPaid','true');
    applyAccountFeatures(login,owner);
    document.dispatchEvent(new CustomEvent('sr-login-updated',{detail:login}));
    render();
    setTimeout(()=>syncServerStatus(false),300);
  }

  function saveLogin(){
    const email=document.querySelector('[data-login-email]')?.value.trim() || '';
    if(!email){statusText('Enter an email or the approved phone number first.');return;}
    finish(baseLogin('free',{emailVerified:isOwner(email,email), provider:'email'}));
  }

  async function registerFree(){
    const email=document.querySelector('[data-login-email]')?.value.trim() || '';
    if(!email){statusText('Enter an email first so verification can be sent.');return;}
    STATE.mode='register';
    STATE.provider='';
    STATE.productCollapsed=false;
    localStorage.removeItem('srProductCollapsed');
    const login=baseLogin('free',{emailVerified:false,verificationSent:true,provider:'email'});
    finish(login);
    await accountEmail('confirm',email);
    statusText(`Verification sent to ${email}. Continue free, or open Account Status for Premium, Pro, or Studio Jake.`);
  }

  function chooseProduct(plan){
    const key=planKey(plan);
    const existing=read();
    const email=cleanEmail(document.querySelector('[data-login-email]')?.value||existing.email||'');
    const login=Object.assign(baseLogin('free',{
      emailVerified:!!existing.emailVerified,
      provider:existing.provider||STATE.provider||'email',
      email:email||existing.email||'',
    }),{
      membershipPlan:'free',
      tier:'Free',
      pendingPlan:key,
      checkoutPending:true,
      checkoutLinked:true,
      shopifyVerified:false,
      serverVerified:false,
      paymentLink:PLAN_LINKS[key].href,
      paymentReturnStatus:`Pending ${PLAN_LINKS[key].label}`,
      statusMessage: email ? 'Waiting for verified Shopify paid-order webhook.' : 'Use the same email at checkout, then log in here and refresh status.'
    });
    finish(login);
    statusText(login.statusMessage);
  }

  function providerAuth(provider){
    STATE.provider=provider;
    STATE.mode='register';
    STATE.productCollapsed=false;
    localStorage.removeItem('srProductCollapsed');
    render();
    const email=document.querySelector('[data-login-email]')?.value.trim() || '';
    if(provider==='Google' && OWNER_EMAILS.includes(email.toLowerCase())){
      finish(baseLogin('studio',{provider:'google',emailVerified:true,owner:true}));
      return;
    }
    statusText(`${provider} selected. Choose a product checkout or continue with a free account.`);
  }

  async function accountEmail(kind, forcedEmail){
    const l=read();
    const email=forcedEmail || document.querySelector('[data-login-email]')?.value.trim() || l.email || '';
    if(!email){statusText('Enter an email first.');return;}
    const endpoint=kind==='reset'?'/api/account/password-reset/request':'/api/account/email-confirmation';
    statusText(kind==='reset'?'Sending password reset route...':'Sending email confirmation route...');
    try {
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,display_name:displayName(l)})});
      const data=await res.json();
      if(data.ok) statusText(data.email_sent?'Email sent. Check the inbox for the route.':`Route ready: ${data.confirmation_url||data.reset_url||'server returned a token route'}`);
      else statusText(data.error||'Email route could not be created yet.');
    } catch {
      statusText('Email route endpoint is not reachable on this deploy yet.');
    }
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-login-open]')){STATE.mode='login';STATE.provider='';render();return;}
    if(e.target.closest('[data-login-save]')){saveLogin();return;}
    if(e.target.closest('[data-login-register]')){if(STATE.mode!=='register'){STATE.mode='register';render();return;} registerFree();return;}
    const provider=e.target.closest('[data-provider]');
    if(provider){providerAuth(provider.dataset.provider);return;}
    if(e.target.closest('[data-sr-products]')){STATE.productCollapsed=false;localStorage.removeItem('srProductCollapsed');renderProductPopup(true);return;}
    if(e.target.closest('[data-sr-cart]')){root.renderFunctionalPanel?.('catalog') || root.navigateTo?.('catalog');document.getElementById('srProductPop')?.remove();return;}
    if(e.target.closest('[data-sync-subscription]')){syncServerStatus(true);return;}
    if(e.target.closest('[data-sr-collapse-products]')){STATE.productCollapsed=true;localStorage.setItem('srProductCollapsed','true');document.getElementById('srProductPop')?.remove();return;}
    if(e.target.closest('[data-sr-free-account]')){finish(baseLogin('free',{emailVerified:false,verificationSent:STATE.mode==='register',provider:(STATE.provider||'email').toLowerCase()}));return;}
    const checkout=e.target.closest('[data-sr-checkout-plan]');
    if(checkout){chooseProduct(checkout.dataset.srCheckoutPlan);return;}
    if(e.target.closest('[data-login-edit]')){localStorage.removeItem(KEY);STATE.mode='login';STATE.provider='';render();return;}
    if(e.target.closest('[data-email-confirm]')){accountEmail('confirm');return;}
    if(e.target.closest('[data-forgot-password]')){accountEmail('reset');return;}
  },true);

  root.hasPremiumEntitlement=hasAccess;
  root.hasStudioJakeEntitlement=hasStudio;
  root.getLoginAccount=read;
  root.activateLoginFeatures=applyAccountFeatures;
  root.syncShopifySubscriptionStatus=syncServerStatus;
  root.initLoginSquare=render;
  render();
})();
