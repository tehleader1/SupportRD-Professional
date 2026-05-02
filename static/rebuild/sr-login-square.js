(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const KEY = 'srLoginPanelV27';
  const OWNER_EMAILS = ['zzzanthony123@gmail.com'];
  const OWNER_PHONES = ['9802306202','7044533983'];
  const OWNER_NAME = 'Main Developer Anthony';
  const PLAN_LINKS = {
    free: { label:'Free', tier:'Free', href:'/' },
    premium: { label:'Premium', tier:'Premium', price:'$35/mo', variant:'42287767289936', href:'https://shop.supportrd.com/products/aria-ai-voice-inner-circle-tier-premium-account', short:'Inner Circle Access', desc:'Diary, Profile, ARIA and premium account routing.' },
    pro: { label:'Professional', tier:'Pro', price:'$50/mo', variant:'42287767355472', href:'https://shop.supportrd.com/products/aria-professional-making-money-tier-professional-account', short:'Professional / Making Money', desc:'Professional access with making-money account signals.' },
    studio: { label:'Studio Jake', tier:'Studio Jake', price:'$100/mo', variant:'42287767781456', href:'https://shop.supportrd.com/products/jake-in-the-studio-studio-tier-professional-studio-account', short:'Real Premium FX Features', desc:'Jake studio lane with premium FX, exports, and motherboard support.' }
  };
  const STATE = {
    mode: 'rail',
    provider: '',
    productCollapsed: localStorage.getItem('srProductCollapsed') === 'true',
    includeStudio: localStorage.getItem('srIncludeStudioJake') === 'true',
    routePlan: ''
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
  function displayName(l){if(isOwner(l?.email,l?.phone||l?.email))return OWNER_NAME;const n=String(l.username||'').trim();if(n)return n;const email=String(l.email||'').trim();if(email&&email.includes('@'))return email.split('@')[0]||'Member';const ph=phone(l.phone||l.email);return ph?`Phone ${ph.slice(-4)}`:'SupportRD Member';}
  function statusText(text){const el=document.querySelector('#srLoginStatus');if(el){el.textContent=text;el.style.display='block';}}
  function fieldName(){return document.querySelector('[data-popup-name]')?.value.trim()||document.querySelector('[data-login-name]')?.value.trim()||read().username||'';}
  function fieldEmail(){return document.querySelector('[data-popup-email]')?.value.trim()||document.querySelector('[data-login-email]')?.value.trim()||read().email||'';}
  function fieldPassword(){return document.querySelector('[data-popup-password]')?.value||document.querySelector('[data-login-password]')?.value||'';}
  function preserveDraft(email, name){
    if(name)document.querySelectorAll('[data-popup-name],[data-login-name]').forEach(input=>{input.value=name;});
    if(email)document.querySelectorAll('[data-popup-email],[data-login-email]').forEach(input=>{input.value=email;});
  }
  function makeCode(v){
    const raw=String(v||'support-rd-member');
    let hash=0;
    for(let i=0;i<raw.length;i++)hash=((hash<<5)-hash)+raw.charCodeAt(i)|0;
    return Math.abs(hash).toString(36).toUpperCase().padStart(6,'0').slice(0,6);
  }
  function diaryCode(l){return l.diaryLiveCode||makeCode(l.email||l.phone||l.username||l.at);}
  function diaryUrl(l){return l.diaryLiveUrl||`https://supportrd.com/accounts/${diaryCode(l)}`;}
  function accountStatus(l){
    if(isOwner(l.email,l.phone))return 'Owner Studio';
    if(l.shopifyVerified||l.serverVerified)return `${PLAN_LINKS[planKey(l.membershipPlan||l.tier)].label} Active`;
    if(l.checkoutPending)return `${PLAN_LINKS[planKey(l.pendingPlan)].label} Product Page`;
    if(l.verificationSent)return 'Free · Email Sent';
    if(l.emailVerified)return 'Free · Verified';
    return l.confirmed?'Free Account':'Guest';
  }
  function flashPanel(text, tone){
    document.querySelector('#srSmartLoginFlash')?.remove();
    const el=document.createElement('aside');
    el.id='srSmartLoginFlash';
    el.className=`sr-smart-flash ${tone||''}`;
    el.textContent=text;
    document.body.appendChild(el);
    setTimeout(()=>el.classList.add('show'),20);
    setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),360);},2300);
  }
  function flashSequence(items){
    items.forEach((item,i)=>setTimeout(()=>flashPanel(item.text,item.tone),i*1350));
  }
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
  function cartPermalink(keys){
    return `https://shop.supportrd.com/cart/${keys.map(key=>`${PLAN_LINKS[planKey(key)].variant}:1`).join(',')}?storefront=true`;
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
      .sr-login-square,.sr-product-pop,.sr-smart-flash{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f8fafc}
      .sr-login-square{position:fixed;right:0;top:64px;z-index:7000;width:154px;max-height:calc(100dvh - 76px);overflow:visible;box-sizing:border-box}.sr-login-square.is-rail,.sr-login-square.is-account,.sr-login-square.is-open{width:154px}
      .sr-login-shell,.sr-product-pop,.sr-smart-flash{box-sizing:border-box;border:1px solid rgba(148,163,184,.3);border-right:0;border-radius:8px 0 0 8px;background:linear-gradient(180deg,rgba(15,23,32,.88),rgba(8,13,21,.84));backdrop-filter:blur(20px);box-shadow:0 10px 28px rgba(0,0,0,.24)}
      .sr-login-shell{padding:6px}.sr-login-square *,.sr-product-pop *{box-sizing:border-box}.sr-login-head{display:grid;grid-template-columns:22px 1fr;align-items:center;gap:5px;margin-bottom:5px}.sr-login-mark{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;background:linear-gradient(135deg,#10a37f,#7dd3fc);color:#06101f;font-weight:1000;font-size:.56rem;overflow:hidden}.sr-login-avatar{background-size:cover!important;background-position:center!important;color:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.45)}.sr-login-title strong{display:block;font-size:.62rem;line-height:1;font-weight:1000}.sr-login-title span{display:block;color:#94a3b8;font-size:.48rem;line-height:1.1}
      .sr-field input,.sr-popup-fields input{width:100%;height:27px;margin:0 0 4px;padding:0 7px;border-radius:7px;border:1px solid rgba(148,163,184,.24);background:rgba(2,6,13,.5);color:#f8fafc;font-size:.62rem;outline:0}.sr-field input:focus,.sr-popup-fields input:focus{border-color:rgba(16,163,127,.82);box-shadow:0 0 0 2px rgba(16,163,127,.18)}
      .sr-login-square button,.sr-product-pop button,.sr-product-pop a{min-height:27px;border-radius:999px;border:1px solid rgba(148,163,184,.22);font-size:.56rem;font-weight:1000;cursor:pointer;text-decoration:none}.sr-login-square button{width:100%;margin-top:4px;background:rgba(255,255,255,.045);color:#f7fbff}.sr-login-square .primary{background:#10a37f;color:#fff;border-color:#10a37f}.sr-login-row{display:grid;grid-template-columns:1fr 1fr;gap:4px}.sr-login-row button{margin-top:0;border-radius:7px}.sr-login-row.slim-bottom{grid-template-columns:1fr 30px;margin-top:4px}.sr-cart-btn{display:grid!important;place-items:center!important;width:30px!important;min-width:30px!important;padding:0!important}.sr-cart-btn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
      .sr-login-status{display:none;margin-top:5px;border:1px solid rgba(16,163,127,.28);border-radius:7px;background:rgba(16,163,127,.08);padding:5px;color:#b7f7dc;font-size:.5rem;line-height:1.18}.sr-login-square .ghost{background:rgba(255,255,255,.03);color:#d7e1ed}
      .sr-account-summary{display:grid;gap:4px}.sr-account-summary div{border:1px solid rgba(148,163,184,.18);border-radius:7px;background:rgba(2,6,13,.38);padding:5px}.sr-account-summary span{display:block;color:#91a5b8;font-size:.48rem;font-weight:900;line-height:1.05;text-transform:uppercase}.sr-account-summary strong{display:block;color:#f8fafc;font-size:.58rem;line-height:1.15;overflow-wrap:anywhere}.sr-account-summary .status strong{color:#b7f7dc}
      .sr-product-pop{position:fixed;right:154px;top:64px;z-index:6999;width:326px;padding:10px}.sr-product-pop.is-collapsed{display:none}.sr-product-pop strong{display:block;font-size:.85rem}.sr-product-pop p{margin:4px 0 8px;color:#b7c7d8;font-size:.62rem;line-height:1.3}.sr-product-actions{display:grid;gap:6px}.sr-provider-row{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:6px 0}.sr-provider-row button{margin-top:0;background:#f8fafc!important;color:#07101f!important;border-radius:7px!important}.sr-product-pop a,.sr-product-pop button{display:flex;align-items:center;justify-content:space-between;gap:6px;background:rgba(255,255,255,.045);color:#fff;padding:0 9px;border-radius:7px}.sr-product-pop a b,.sr-product-pop button b{font-size:.58rem;color:#8ea0b4}.sr-product-pop .checkout{background:rgba(16,163,127,.14);border-color:rgba(16,163,127,.38);color:#dcfce7}.sr-product-pop .free{background:rgba(125,211,252,.08);border-color:rgba(125,211,252,.28);color:#e0f7ff}
      .sr-upgrade-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:7px 0}.sr-upgrade-card{align-items:flex-start!important;min-height:102px!important;display:flex!important;flex-direction:column;justify-content:flex-start!important;border-radius:11px!important;padding:9px!important}.sr-upgrade-card span{font-size:.72rem}.sr-upgrade-card em{font-style:normal;color:#e2e8f0;font-size:.58rem;font-weight:1000}.sr-upgrade-card small{display:block;color:#91a5b8;font-size:.52rem;line-height:1.2;font-weight:800}.sr-upgrade-card.is-combo{background:rgba(16,163,127,.18)!important;border-color:rgba(16,163,127,.46)!important}.sr-combo-note{display:block;border:1px solid rgba(125,211,252,.22);border-radius:9px;background:rgba(125,211,252,.07);padding:6px;color:#c9f4ff;font-size:.52rem;line-height:1.22;font-weight:900}.sr-studio-addon{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:7px;border:1px solid rgba(148,163,184,.22);border-radius:11px;background:rgba(255,255,255,.045);padding:8px;margin:6px 0}.sr-studio-dot{width:19px;height:19px;border-radius:50%;border:1px solid rgba(148,163,184,.55);background:rgba(2,6,13,.72);box-shadow:inset 0 0 0 4px rgba(2,6,13,.9)}.sr-studio-addon.is-on .sr-studio-dot{background:#10a37f;box-shadow:inset 0 0 0 4px #06101f,0 0 14px rgba(16,163,127,.42)}.sr-studio-addon strong{font-size:.65rem!important}.sr-studio-addon small{display:block;color:#91a5b8;font-size:.5rem;line-height:1.18;font-weight:800}.sr-studio-addon a{min-height:24px!important;font-size:.5rem!important;border-radius:999px!important}
      .sr-popup-fields{display:grid;gap:0;margin:8px 0 7px;padding:7px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(0,0,0,.18)}.sr-popup-note{display:block;margin-top:4px;color:#8ea0b4;font-size:.52rem;line-height:1.2}
      .sr-smart-flash{position:fixed;right:162px;top:70px;z-index:7200;width:248px;padding:12px 14px;border-right:1px solid rgba(148,163,184,.3);border-radius:10px;opacity:0;transform:translateY(-8px);transition:opacity .26s ease,transform .26s ease;font-size:.82rem;font-weight:1000;text-align:center}.sr-smart-flash.show{opacity:1;transform:translateY(0)}.sr-smart-flash.welcome{border-color:rgba(16,163,127,.45);color:#dcfce7}.sr-smart-flash.holo{border-color:rgba(125,211,252,.5);color:#e0f7ff;background:radial-gradient(circle at 30% 20%,rgba(125,211,252,.2),transparent 44%),linear-gradient(180deg,rgba(15,23,42,.92),rgba(2,6,13,.9))}
      .sr-account-grid,.sr-account-note{display:none}
      @media(max-width:560px){.sr-login-square,.sr-login-square.is-rail,.sr-login-square.is-account,.sr-login-square.is-open{top:56px;width:146px}.sr-product-pop{right:146px;top:56px;width:min(244px,calc(100vw - 150px))}.sr-product-pop p{display:none}.sr-upgrade-grid{grid-template-columns:1fr}.sr-smart-flash{right:8px;top:104px;width:220px}}
    `;
    document.head.appendChild(s);
  }

  function productPopupHtml(){
    const provider = STATE.provider ? ` for ${esc(STATE.provider)}` : '';
    const l = read();
    const email = fieldEmail();
    const studio = PLAN_LINKS.studio;
    const studioOn = STATE.includeStudio;
    return `<aside class="sr-product-pop ${STATE.productCollapsed?'is-collapsed':''}" id="srProductPop">
      <strong>${l.confirmed?'Upgrade Account':'Register + Upgrade'}</strong>
      <p>Register${provider} with email/password, then choose Premium or Professional. Studio Jake is an optional add-on checkout.</p>
      <div class="sr-popup-fields">
        <input data-popup-name type="text" placeholder="Profile name" value="${esc(l.username||fieldName())}" autocomplete="name">
        <input data-popup-email type="email" placeholder="Register email" value="${esc(email)}" autocomplete="email">
        <input data-popup-password type="password" placeholder="Register password" autocomplete="new-password">
        <button class="free" type="button" data-popup-register-email><span>Register Account</span><b>Auto login</b></button>
        <span class="sr-popup-note">Use the same email on the Shopify product page so the webhook can activate the account after purchase.</span>
      </div>
      <div class="sr-provider-row"><button type="button" data-provider="Google">Google Login</button><button type="button" data-provider="Microsoft">Microsoft</button></div>
      <div class="sr-upgrade-grid">
        ${['premium','pro'].map(key=>{
          const href=studioOn?cartPermalink([key,'studio']):PLAN_LINKS[key].href;
          const label=studioOn?`${PLAN_LINKS[key].label} + Studio Jake`:PLAN_LINKS[key].label;
          const price=studioOn?`${PLAN_LINKS[key].price} + ${studio.price}`:PLAN_LINKS[key].price;
          const desc=studioOn?'One Shopify cart with both items under the same purchase email.':PLAN_LINKS[key].desc;
          return `<a class="checkout sr-upgrade-card ${studioOn?'is-combo':''}" href="${esc(href)}" target="_blank" rel="noopener" data-sr-checkout-plan="${key}" data-combo-cart="${studioOn?'true':'false'}"><span>${esc(label)}</span><em>${esc(price)}</em><b>${esc(PLAN_LINKS[key].short)}</b><small>${esc(desc)}</small></a>`;
        }).join('')}
      </div>
      <div class="sr-studio-addon ${studioOn?'is-on':''}" data-studio-addon>
        <button class="sr-studio-dot" type="button" data-studio-toggle aria-label="${studioOn?'Remove':'Include'} Studio Jake"></button>
        <div><strong>${esc(studio.label)} · ${esc(studio.price)}</strong><small>${esc(studio.short)}. ${esc(studio.desc)}</small></div>
        <a href="${esc(studio.href)}" target="_blank" rel="noopener" data-sr-checkout-plan="studio">${studioOn?'Selected':'View'}</a>
      </div>
      ${studioOn?'<span class="sr-combo-note">Studio Jake is included: Premium/Professional now opens one Shopify cart with both products.</span>':''}
      <div class="sr-product-actions">
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
    const register=STATE.mode==='register';
    if(l.confirmed && !register && STATE.mode!=='login'){
      const name=displayName(l);
      const email=l.email||l.phone||'Email saved';
      return `<div class="sr-login-shell">
        <div class="sr-login-head">${markHtml()}<div class="sr-login-title"><strong>Account</strong><span>${esc(accountStatus(l))}</span></div></div>
        <div class="sr-account-summary">
          <div><span>Name</span><strong>${esc(name)}</strong></div>
          <div><span>Email</span><strong>${esc(email)}</strong></div>
          <div><span>Diary Live Code</span><strong>${esc(diaryCode(l))}</strong></div>
          <div><span>Diary Live URL</span><strong>${esc(diaryUrl(l))}</strong></div>
          <div class="status"><span>Account Status</span><strong>${esc(accountStatus(l))}</strong></div>
        </div>
        <div class="sr-login-row slim-bottom"><button class="ghost" type="button" data-sr-upgrade-open>Upgrade</button><button class="sr-cart-btn" type="button" data-sr-cart aria-label="Open SupportRD catalog">${cartIcon()}</button></div>
        <div id="srLoginStatus" class="sr-login-status"></div>
      </div>`;
    }
    return `<div class="sr-login-shell">
      <div class="sr-login-head">${markHtml()}<div class="sr-login-title"><strong>${register?'Register':'Login'}</strong><span>${l.confirmed?verificationLine(l):'SupportRD account'}</span></div></div>
      ${register?`<label class="sr-field"><input data-login-name type="text" placeholder="Name" value="${esc(l.username||'')}" autocomplete="name"></label>`:''}
      <label class="sr-field"><input data-login-email type="email" placeholder="Email" value="${esc(l.email||'')}" autocomplete="email"></label>
      <label class="sr-field"><input data-login-password type="password" placeholder="Password" autocomplete="${register?'new-password':'current-password'}"></label>
      <div class="sr-login-row"><button class="primary" type="button" ${register?'data-login-register':'data-login-save'}>${register?'Register':'Login'}</button><button type="button" ${register?'data-login-open':'data-login-register'}>${register?'Login':'Register'}</button></div>
      <div class="sr-login-row slim-bottom"><button class="ghost" type="button" data-forgot-password>Forgot Password</button><button class="sr-cart-btn" type="button" data-sr-cart aria-label="Open SupportRD catalog">${cartIcon()}</button></div>
      <div id="srLoginStatus" class="sr-login-status"></div>
    </div>`;
  }

  function render(){
    css();
    let box=document.querySelector('#srLoginSquare');
    if(!box){box=document.createElement('aside');box.id='srLoginSquare';box.className='sr-login-square';document.body.appendChild(box);}
    const l=read();
    box.className=`sr-login-square is-rail ${l.confirmed?'is-account':''}`;
    box.innerHTML=railHtml();
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
    const email=fieldEmail();
    const pw=fieldPassword();
    const ph=phone(email);
    const owner=isOwner(email,ph);
    const key=owner?'studio':planKey(plan);
    const suppliedName=fieldName();
    const username=owner?OWNER_NAME:(suppliedName||displayName({email,phone:ph}));
    const code=makeCode(email||ph||username);
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
      diaryLiveCode: code,
      diaryLiveUrl: `https://supportrd.com/accounts/${code}`,
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
    const email=fieldEmail();
    if(!email){statusText('Enter an email or the approved phone number first.');return;}
    finish(baseLogin('free',{emailVerified:isOwner(email,email), provider:'email'}));
    flashPanel('Confirm Log In');
  }

  async function registerFree(){
    const email=fieldEmail();
    const pw=fieldPassword();
    if(!email||!pw){
      STATE.mode='register';
      STATE.productCollapsed=false;
      localStorage.removeItem('srProductCollapsed');
      render();
      preserveDraft(email, fieldName());
      statusText('Enter email and password to register.');
      flashPanel('Email + password first','holo');
      return;
    }
    STATE.mode='account';
    STATE.provider='';
    STATE.productCollapsed=true;
    localStorage.setItem('srProductCollapsed','true');
    const login=baseLogin('free',{emailVerified:false,verificationSent:true,provider:'email'});
    finish(login);
    await accountEmail('confirm',email);
    flashSequence([{text:`Email verification sent to ${email}`,tone:'holo'},{text:'Welcome new member!',tone:'welcome'}]);
    statusText(`Registered. Verification sent to ${email}. Continue free, or choose Premium, Professional, or Studio Jake from the popup.`);
  }

  function chooseProduct(plan){
    const key=planKey(plan);
    const existing=read();
    const email=cleanEmail(fieldEmail()||existing.email||'');
    if(!email){
      STATE.mode='register';
      STATE.productCollapsed=false;
      localStorage.removeItem('srProductCollapsed');
      render();
      statusText(`Register an email first, then ${PLAN_LINKS[key].label} product page can open.`);
      flashPanel('Register email first','welcome');
      return false;
    }
    STATE.mode='account';
    const login=Object.assign(baseLogin('free',{
      emailVerified:!!existing.emailVerified,
      provider:existing.provider||STATE.provider||'email',
      email:email||existing.email||'',
    }),{
      membershipPlan:'free',
      tier:'Free',
      pendingPlan:key,
      studioAddonPending:STATE.includeStudio&&key!=='studio',
      checkoutPending:true,
      checkoutLinked:true,
      comboCart:STATE.includeStudio&&key!=='studio',
      shopifyVerified:false,
      serverVerified:false,
      paymentLink:PLAN_LINKS[key].href,
      paymentReturnStatus:`Pending ${PLAN_LINKS[key].label}`,
      statusMessage: email ? `${STATE.includeStudio&&key!=='studio'?'Combined Shopify cart':'Product page'} opened. Waiting for verified Shopify paid-order webhook${STATE.includeStudio&&key!=='studio'?' · Studio Jake included':''}.` : 'Use the same email at checkout, then log in here and refresh status.'
    });
    finish(login);
    statusText(login.statusMessage);
    flashPanel(`${PLAN_LINKS[key].label}${STATE.includeStudio&&key!=='studio'?' + Studio cart':' product page'} ready`,'welcome');
    return true;
  }

  function providerAuth(provider){
    STATE.provider=provider;
    STATE.mode='register';
    STATE.productCollapsed=false;
    localStorage.removeItem('srProductCollapsed');
    const email=fieldEmail();
    if(provider==='Google' && OWNER_EMAILS.includes(email.toLowerCase())){
      finish(baseLogin('studio',{provider:'google',emailVerified:true,owner:true}));
    } else {
      finish(baseLogin('free',{provider:provider.toLowerCase(),emailVerified:false,verificationSent:false}));
    }
    flashPanel('Confirm Log In');
    STATE.productCollapsed=false;
    renderProductPopup(true);
    statusText(`${provider} login ready. Choose Premium, Pro, or Studio Jake to upgrade.`);
  }

  async function accountEmail(kind, forcedEmail){
    const l=read();
    const email=forcedEmail || fieldEmail() || l.email || '';
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
    if(e.target.closest('[data-sr-upgrade-open]')){STATE.mode='account';STATE.productCollapsed=false;localStorage.removeItem('srProductCollapsed');renderProductPopup(true);return;}
    if(e.target.closest('[data-login-register]')){STATE.mode='register';STATE.productCollapsed=false;localStorage.removeItem('srProductCollapsed');registerFree();return;}
    if(e.target.closest('[data-popup-register-email]')){registerFree();return;}
    const provider=e.target.closest('[data-provider]');
    if(provider){providerAuth(provider.dataset.provider);return;}
    if(e.target.closest('[data-sr-cart]')){root.renderFunctionalPanel?.('catalog') || root.navigateTo?.('catalog');document.getElementById('srProductPop')?.remove();return;}
    if(e.target.closest('[data-sync-subscription]')){syncServerStatus(true);return;}
    if(e.target.closest('[data-sr-collapse-products]')){STATE.productCollapsed=true;localStorage.setItem('srProductCollapsed','true');document.getElementById('srProductPop')?.remove();return;}
    if(e.target.closest('[data-sr-free-account]')){finish(baseLogin('free',{emailVerified:false,verificationSent:STATE.mode==='register',provider:(STATE.provider||'email').toLowerCase()}));flashPanel(`Welcome new member ${fieldEmail()||'SupportRD'}!`,'welcome');return;}
    if(e.target.closest('[data-studio-toggle]')){STATE.includeStudio=!STATE.includeStudio;STATE.productCollapsed=false;localStorage.setItem('srIncludeStudioJake',STATE.includeStudio?'true':'false');localStorage.removeItem('srProductCollapsed');renderProductPopup(true);return;}
    const checkout=e.target.closest('[data-sr-checkout-plan]');
    if(checkout){
      const selected=planKey(checkout.dataset.srCheckoutPlan);
      const ok=chooseProduct(selected);
      if(!ok){
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      return;
    }
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
