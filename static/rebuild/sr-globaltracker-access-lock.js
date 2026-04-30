(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const TRUSTED_CONTACTS = ['704-453-3983'];
  const SIGNALS_PRICE = 25000;
  const SHOP_URL = 'https://shop.supportrd.com/products/supportrd-market-signals';

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function account(){
    try { return root.getAccountBackbone?.() || {}; }
    catch { return {}; }
  }

  function login(){
    try { return JSON.parse(localStorage.getItem('srLoginPanelV27') || '{}'); }
    catch { return {}; }
  }

  function normalizedPhone(value){
    return String(value || '').replace(/[^0-9]/g, '');
  }

  function trustedContact(){
    const l = login();
    const a = account();
    const known = [l.phone, l.mobile, a.phone, a.mobile, a.contactPhone].map(normalizedPhone);
    return TRUSTED_CONTACTS.map(normalizedPhone).some(phone => phone && known.includes(phone));
  }

  function hasSignalsAccess(){
    const a = account();
    const market = a.market || {};
    const tier = String(a.tier || '').toLowerCase();
    const paid = market.paid === true || localStorage.getItem('srSignalsGroupPaid') === 'true';
    const priceOk = Number(market.price || SIGNALS_PRICE) >= SIGNALS_PRICE;
    const tierOk = tier.includes('signals') || tier.includes('premium') || tier.includes('pro');
    return Boolean(paid && priceOk && (market.linked || tierOk));
  }

  function lockedMarkup(){
    const a = account();
    const l = login();
    const trusted = trustedContact();
    return `
      <section class="sr-panel sr-functional-panel" data-panel="globaltracker">
        <div class="sr-panel-media sr-functional-media" style="background:radial-gradient(circle at 30% 20%,rgba(255,236,110,.22),transparent 35%),linear-gradient(135deg,#06101f,#020713)"></div>
        <div class="sr-panel-copy sr-functional-copy">
          <span>LOCKED ACCESS</span>
          <h2>Global Tracker · $25,000 Signals Group</h2>
          <p>Global Tracker is restricted to accounts that have paid for the $25,000 live signals group and have the Market account linked.</p>
          <section class="sr-room-grid">
            <article class="sr-room-card">
              <h3>Account Status</h3>
              <p><strong>Tag:</strong> ^^ ${esc(a.username || l.username || 'Guest')}</p>
              <p><strong>Email:</strong> ${esc(a.email || l.email || 'not confirmed')}</p>
              <p><strong>Signals status:</strong> ${hasSignalsAccess() ? 'Active' : 'Locked / unpaid'}</p>
              <p><strong>Trusted contact reference:</strong> ${trusted ? '704-453-3983 matched on account' : '704-453-3983 allowlisted, but no matching phone is saved on this account'}</p>
            </article>
            <article class="sr-room-card">
              <h3>Unlock</h3>
              <p>Pay and link the Market Signals account to unlock the Global Tracker.</p>
              <a class="sr-buy-btn" href="${SHOP_URL}" target="_blank" rel="noopener">Buy $25,000 Live Signals Group</a>
              <button class="sr-mini-btn" type="button" data-route="market">Connect Market Account</button>
            </article>
          </section>
        </div>
      </section>
    `;
  }

  function patchRenderer(){
    if (root.__globalTrackerLockInstalled) return;
    root.__globalTrackerLockInstalled = true;
    const previous = root.renderFunctionalPanel;
    root.renderFunctionalPanel = function(route){
      if (route === 'globaltracker' && !hasSignalsAccess()) {
        const stage = document.querySelector('#remoteStage');
        document.querySelectorAll('[data-route]').forEach(btn=>btn.classList.toggle('active', btn.dataset.route === route));
        if (stage) stage.innerHTML = lockedMarkup();
        return;
      }
      return previous?.(route);
    };
    window.renderPanel = root.renderFunctionalPanel;
  }

  function init(){
    patchRenderer();
    const a = account();
    if (!a.allowedContacts) {
      try { root.patchAccountBackbone?.('allowedContacts', { phones: TRUSTED_CONTACTS }); } catch {}
    }
  }

  root.hasSignalsGroupAccess = hasSignalsAccess;
  root.trustedSignalsContacts = TRUSTED_CONTACTS;
  root.initGlobalTrackerAccessLock = init;
  init();
})();