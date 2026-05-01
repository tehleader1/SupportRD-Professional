(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const KEY = 'srUnifiedAccountBackboneV28';

  const DEFAULT_ACCOUNT = {
    username: 'DYGENRJE',
    email: 'zzzanthony123@gmail.com',
    tier: 'Premium / Pro',
    confirmed: true,
    market: {
      linked: false,
      url: 'https://lasersmarket.com/',
      tier: 'Live Signals',
      price: 25000,
      paid: false,
      loginEmail: ''
    },
    diary: { assistantHistory: [], livePayments: [], liveRoomEvents: [] },
    profile: { hairAnalyses: [], confirmedHairStatus: '', profileImages: [] },
    faq: { developerFeed: [], ratings: [], mentions: [] },
    mapChange: { recentMap: '', perks: [] },
    studio: { imports: [], exports: [], jakeHistory: [] },
    updatedAt: ''
  };

  function read(){
    try { return deepMerge(DEFAULT_ACCOUNT, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch { return structuredCloneFallback(DEFAULT_ACCOUNT); }
  }

  function structuredCloneFallback(value){
    return JSON.parse(JSON.stringify(value));
  }

  function deepMerge(base, next){
    const out = Array.isArray(base) ? [...base] : { ...base };
    Object.entries(next || {}).forEach(([key, value])=>{
      if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
        out[key] = deepMerge(base[key], value);
      } else {
        out[key] = value;
      }
    });
    return out;
  }

  function write(account){
    const next = deepMerge(DEFAULT_ACCOUNT, account || {});
    next.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(next));
    renderAccountBackbonePanel();
    return next;
  }

  function patch(section, value){
    const account = read();
    account[section] = { ...(account[section] || {}), ...(value || {}) };
    return write(account);
  }

  function push(section, listKey, item, limit = 50){
    const account = read();
    const sectionData = account[section] || {};
    const current = Array.isArray(sectionData[listKey]) ? sectionData[listKey] : [];
    sectionData[listKey] = [{ ...item, at: item.at || new Date().toISOString() }, ...current].slice(0, limit);
    account[section] = sectionData;
    return write(account);
  }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function recordDiaryAssistantHistory(assistant, transcript, reply){
    return push('diary', 'assistantHistory', { assistant, transcript, reply });
  }

  function recordLivePayment(payment){
    return push('diary', 'livePayments', payment);
  }

  function recordLiveRoomEvent(event){
    return push('diary', 'liveRoomEvents', event);
  }

  function recordHairAnalysis(analysis){
    push('profile', 'hairAnalyses', analysis);
    return patch('profile', { confirmedHairStatus: analysis.status || analysis.summary || 'Hair analysis recorded' });
  }

  function recordProfileImage(image){
    return push('profile', 'profileImages', { image });
  }

  function recordDeveloperFeed(item){
    return push('faq', 'developerFeed', item);
  }

  function recordFaqRating(rating){
    return push('faq', 'ratings', rating);
  }

  function recordMention(mention){
    return push('faq', 'mentions', mention);
  }

  function recordMapChoice(map, perk){
    const account = read();
    account.mapChange = account.mapChange || {};
    account.mapChange.recentMap = map;
    account.mapChange.perks = [{ map, perk, at: new Date().toISOString() }, ...(account.mapChange.perks || [])].slice(0, 50);
    return write(account);
  }

  function recordStudioImport(file){
    return push('studio', 'imports', file, 3);
  }

  function recordStudioExport(file){
    return push('studio', 'exports', file, 3);
  }

  function recordJakeStudioHistory(item){
    return push('studio', 'jakeHistory', item);
  }

  function linkMarketAccount(email, paid){
    const account = read();
    account.market = {
      ...(account.market || {}),
      linked: true,
      loginEmail: email || account.email,
      paid: !!paid,
      tier: 'Live Signals',
      price: 25000,
      url: 'https://lasersmarket.com/',
      at: new Date().toISOString()
    };
    return write(account);
  }

  function renderAccountBackbonePanel(container){
    const target = container || document.querySelector('#srAccountBackbonePanel');
    if (!target) return false;
    const account = read();
    target.innerHTML = `
      <div class="sr-account-backbone-head">
        <span>Account Backbone</span>
        <strong>^^ ${esc(account.username || 'DYGENRJE')}</strong>
        <p>${esc(account.email || '')} · ${esc(account.tier || '')}</p>
      </div>
      <div class="sr-account-backbone-grid">
        <article><span>Diary</span><strong>${(account.diary?.assistantHistory || []).length}</strong><small>Aria/Jake history</small><small>${(account.diary?.livePayments || []).length} live payments</small></article>
        <article><span>Profile</span><strong>${(account.profile?.hairAnalyses || []).length}</strong><small>${esc(account.profile?.confirmedHairStatus || 'No confirmed hair status')}</small></article>
        <article><span>FAQ</span><strong>${(account.faq?.developerFeed || []).length}</strong><small>${(account.faq?.ratings || []).length} ratings · ${(account.faq?.mentions || []).length} mentions</small></article>
        <article><span>Map</span><strong>${esc(account.mapChange?.recentMap || 'None')}</strong><small>${(account.mapChange?.perks || []).length} perk events</small></article>
        <article><span>Studio</span><strong>${(account.studio?.exports || []).length}</strong><small>${(account.studio?.imports || []).length} imports · last 3 exports</small></article>
        <article><span>Market</span><strong>${account.market?.linked ? 'linked' : 'not linked'}</strong><small>${account.market?.paid ? '$25,000 live signals active' : '$25,000 live signals pending'}</small></article>
      </div>
    `;
    return true;
  }

  function injectAccountBackbonePanel(){
    if (document.querySelector('#srAccountBackbonePanel')) return;
    const panel = document.createElement('section');
    panel.id = 'srAccountBackbonePanel';
    panel.className = 'sr-account-backbone-panel';
    const remote = document.querySelector('.sr-remote');
    if (remote) remote.appendChild(panel);
    else document.body.appendChild(panel);
    renderAccountBackbonePanel(panel);
  }

  function initAccountBackbone(){
    const login = (()=>{ try { return JSON.parse(localStorage.getItem('srLoginPanelV27') || '{}'); } catch { return {}; }})();
    const account = read();
    if (login.email) {
      account.username = login.username || account.username;
      account.email = login.email || account.email;
      account.tier = login.tier || account.tier;
      account.confirmed = true;
    }
    write(account);
    injectAccountBackbonePanel();
  }

  root.getAccountBackbone = read;
  root.patchAccountBackbone = patch;
  root.recordDiaryAssistantHistory = recordDiaryAssistantHistory;
  root.recordLivePayment = recordLivePayment;
  root.recordLiveRoomEvent = recordLiveRoomEvent;
  root.recordHairAnalysis = recordHairAnalysis;
  root.recordProfileImage = recordProfileImage;
  root.recordDeveloperFeed = recordDeveloperFeed;
  root.recordFaqRating = recordFaqRating;
  root.recordMention = recordMention;
  root.recordMapChoice = recordMapChoice;
  root.recordStudioImport = recordStudioImport;
  root.recordStudioExport = recordStudioExport;
  root.recordJakeStudioHistory = recordJakeStudioHistory;
  root.linkMarketAccount = linkMarketAccount;
  root.renderAccountBackbonePanel = renderAccountBackbonePanel;
  root.initAccountBackbone = initAccountBackbone;
})();
