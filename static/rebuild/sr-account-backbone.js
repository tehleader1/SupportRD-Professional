(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const KEY = 'srUnifiedAccountBackboneV28';

  const DEFAULT_ACCOUNT = {
    username: 'DYGENRJE',
    email: 'zzzanthony123@gmail.com',
    tier: 'Premium / Pro',
    confirmed: true,
    membership: {
      plan: 'premium',
      tier: 'Premium / Pro',
      verifiedEmail: true,
      paymentLinks: {}
    },
    features: {
      diaryPaidLive: true,
      ariaCelebrations: true,
      profilePremiumReadings: true,
      profileSummaryReadings: true,
      studioPremiumFx: true,
      studioJake: true,
      mapPerksSavedToAccount: true,
      faqRealNamePosting: true
    },
    market: {
      linked: false,
      url: 'https://lasersmarket.com/',
      tier: 'Live Signals',
      price: 25000,
      paid: false,
      loginEmail: ''
    },
    diary: { assistantHistory: [], livePayments: [], liveRoomEvents: [], paidLive: true, ariaCelebrations: true },
    profile: { hairAnalyses: [], confirmedHairStatus: '', profileImages: [], displayName: 'DYGENRJE', profileQualityOne: '', profileQualityTwo: '', latestProfileImage: '', premiumHistoricalReadings: true, summaryReadings: true },
    faq: { developerFeed: [], ratings: [], mentions: [], realNamePosting: true, displayName: 'DYGENRJE' },
    mapChange: { recentMap: '', perks: [], savedToAccount: true, perkCycle: '' },
    studio: { imports: [], exports: [], jakeHistory: [], premiumFx: true, studioJake: true },
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
    return patch('profile', {
      confirmedHairStatus: analysis.status || analysis.summary || 'Hair analysis recorded',
      profileQualityOne: analysis.quality1 || analysis.qualities?.quality1 || '',
      profileQualityTwo: analysis.quality2 || analysis.qualities?.quality2 || ''
    });
  }

  function recordProfileImage(image){
    push('profile', 'profileImages', { image });
    return patch('profile', { latestProfileImage: image });
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
    const verified = account.membership?.verifiedEmail ? 'verified email' : 'email pending';
    target.innerHTML = `
      <div class="sr-account-backbone-head">
        <span>Account Backbone</span>
        <strong>^^ ${esc(account.username || 'DYGENRJE')}</strong>
        <p>${esc(account.email || '')} · ${esc(account.tier || '')} · ${verified}</p>
      </div>
      <div class="sr-account-backbone-grid">
        <article><span>Diary</span><strong>${(account.diary?.assistantHistory || []).length}</strong><small>${account.diary?.paidLive ? 'paid live active' : 'free live'}</small><small>${account.diary?.ariaCelebrations ? 'ARIA celebrations active' : 'celebrations locked'}</small></article>
        <article><span>Profile</span><strong>${(account.profile?.hairAnalyses || []).length}</strong><small>${esc(account.profile?.confirmedHairStatus || 'No confirmed hair status')}</small><small>${esc(account.profile?.profileQualityOne || 'quality 1 pending')} · ${esc(account.profile?.profileQualityTwo || 'quality 2 pending')}</small></article>
        <article><span>FAQ</span><strong>${(account.faq?.developerFeed || []).length}</strong><small>${(account.faq?.ratings || []).length} ratings · ${(account.faq?.mentions || []).length} mentions</small><small>${account.faq?.realNamePosting ? `real-name posts as ${esc(account.faq?.displayName || account.username)}` : 'guest posting'}</small></article>
        <article><span>Map</span><strong>${esc(account.mapChange?.recentMap || 'None')}</strong><small>${(account.mapChange?.perks || []).length} perk events</small><small>${account.mapChange?.savedToAccount ? `saved cycle ${esc(account.mapChange?.perkCycle || 'ready')}` : 'not saved yet'}</small></article>
        <article><span>Studio</span><strong>${(account.studio?.exports || []).length}</strong><small>${(account.studio?.imports || []).length} imports · last 3 exports</small><small>${account.studio?.premiumFx ? 'Premium FX active' : 'Free FX only'}</small></article>
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
      const f = login.features || account.features || {};
      account.membership = { ...(account.membership || {}), plan: login.membershipPlan || account.membership?.plan || 'free', tier: login.tier || account.tier, verifiedEmail: !!login.emailVerified };
      account.features = { ...(account.features || {}), ...f };
      account.diary = { ...(account.diary || {}), paidLive: !!f.diaryPaidLive, ariaCelebrations: !!f.ariaCelebrations };
      account.profile = { ...(account.profile || {}), displayName: login.username || account.username, premiumHistoricalReadings: !!f.profilePremiumReadings, summaryReadings: !!f.profileSummaryReadings };
      account.studio = { ...(account.studio || {}), premiumFx: !!f.studioPremiumFx, studioJake: !!f.studioJake };
      account.mapChange = { ...(account.mapChange || {}), savedToAccount: !!f.mapPerksSavedToAccount, perkCycle: account.mapChange?.perkCycle || new Date().toISOString().slice(0,10) };
      account.faq = { ...(account.faq || {}), realNamePosting: !!f.faqRealNamePosting, displayName: login.username || account.username };
    }
    write(account);
    injectAccountBackbonePanel();
  }

  root.getAccountBackbone = read;
  root.writeAccountBackbone = write;
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
