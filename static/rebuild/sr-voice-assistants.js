(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};

  const VOICE_KEY = 'srVoiceAssistantStateV25';
  const RECOGNITION = window.SpeechRecognition || window.webkitSpeechRecognition;

  const DEFAULT_STATE = {
    activeAssistant: '',
    status: 'idle',
    transcript: '',
    reply: '',
    provider: 'local_budget',
    voiceName: '',
    lastStartedAt: '',
    history: []
  };

  let recognition = null;
  let silenceTimer = null;
  let active = false;
  let finalizing = false;
  let voiceCache = { aria: null, jake: null };

  const NATURAL_VOICE_HINTS = {
    aria: [
      'microsoft aria online natural',
      'microsoft jenny online natural',
      'google us english',
      'samantha',
      'ava',
      'zira',
      'allison',
      'victoria',
      'karen'
    ],
    jake: [
      'microsoft guy online natural',
      'microsoft davis online natural',
      'google us english',
      'daniel',
      'david',
      'mark',
      'alex',
      'fred'
    ]
  };

  function read(){
    try { return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(VOICE_KEY) || '{}') }; }
    catch { return { ...DEFAULT_STATE }; }
  }

  function write(next){
    localStorage.setItem(VOICE_KEY, JSON.stringify(next || {}));
    return next;
  }

  function patch(update){
    const next = { ...read(), ...(update || {}) };
    write(next);
    renderVoiceAssistantPanel();
    try { window.dispatchEvent(new CustomEvent('sr-voice-state', { detail: next })); } catch {}
    return next;
  }

  function playTone(type){
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = type === 'outro' ? 392 : type === 'error' ? 160 : 660;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (type === 'intro' ? 0.28 : 0.22));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (type === 'intro' ? 0.32 : 0.26));
      setTimeout(()=>ctx.close?.(), 500);
    } catch {}
  }

  function availableVoices(){
    try { return window.speechSynthesis?.getVoices?.() || []; }
    catch { return []; }
  }

  function pickBrowserVoice(id){
    const assistant = id === 'jake' ? 'jake' : 'aria';
    const voices = availableVoices();
    if (!voices.length) return null;
    const hints = NATURAL_VOICE_HINTS[assistant] || NATURAL_VOICE_HINTS.aria;
    const exact = hints
      .map(hint => voices.find(voice => `${voice.name} ${voice.voiceURI}`.toLowerCase().includes(hint)))
      .find(Boolean);
    if (exact) return exact;
    const enUs = voices.filter(voice => /^en[-_]us$/i.test(voice.lang || ''));
    const natural = enUs.find(voice => /natural|online|premium|enhanced/i.test(`${voice.name} ${voice.voiceURI}`));
    if (natural) return natural;
    return enUs[0] || voices.find(voice => /^en/i.test(voice.lang || '')) || voices[0] || null;
  }

  function getBrowserVoice(id){
    const assistant = id === 'jake' ? 'jake' : 'aria';
    const cached = voiceCache[assistant];
    const voices = availableVoices();
    if (cached && voices.some(voice => voice.name === cached.name && voice.lang === cached.lang)) return cached;
    const picked = pickBrowserVoice(assistant);
    voiceCache[assistant] = picked;
    return picked;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      voiceCache = { aria: null, jake: null };
      const state = read();
      if (state.activeAssistant) patch({ voiceName: getBrowserVoice(state.activeAssistant)?.name || '' });
    };
  }

  function speak(text, onEnd, id){
    try {
      if (!('speechSynthesis' in window)) {
        if (onEnd) setTimeout(onEnd, 400);
        return;
      }
      const assistant = id || read().activeAssistant || 'aria';
      const selectedVoice = getBrowserVoice(assistant);
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = assistant === 'jake' ? 0.92 : 0.98;
      utter.pitch = assistant === 'jake' ? 0.86 : 1.06;
      utter.volume = 1;
      utter.lang = selectedVoice?.lang || 'en-US';
      if (selectedVoice) {
        utter.voice = selectedVoice;
        patch({ voiceName: selectedVoice.name });
      }
      utter.onend = () => { if (onEnd) onEnd(); };
      window.speechSynthesis.speak(utter);
    } catch {
      if (onEnd) setTimeout(onEnd, 400);
    }
  }

  function assistantName(id){
    return id === 'jake' ? 'Jake' : 'ARIA';
  }

  function classifyIntent(transcript){
    const t = String(transcript || '').toLowerCase();
    if (/premium|inner circle|voice|membership/.test(t)) return 'Inner Circle';
    if (/professional|making money|pro|rank|business|sell|payment|shopify|money/.test(t)) return 'Professional/Making Money';
    if (/hair|dry|wet|fall|growth|conditioner|shampoo|mask|dropper|gotero|product|scalp|breakage|dandruff/.test(t)) return 'Advanced';
    return 'Greeting';
  }

  const PRODUCT_PRICES = [
    'Studio Jake Premium: $100/mo',
    'Premium Inner Circle: $35/mo',
    'Professional / Making Money Pro: $50/mo',
    'Support Full Product Line: Shop catalog',
    'Bright Droplets: Shop catalog',
    'Exclusive Formula Anti-Fall: Shop catalog',
    'Lacceador Crece: Shop catalog',
    'Shampoo: Shop catalog',
    'Mascarilla / Mask: Shop catalog'
  ];

  function buildFallbackReply(id, transcript){
    const clean = String(transcript || '').trim();
    const category = classifyIntent(clean);
    const prices = PRODUCT_PRICES.join('; ');
    if (category === 'Greeting') {
      return `${assistantName(id)} Greeting: How may I help you? I can help with hair problems, products, Diary history, Studio, Profile, Catalog, Premium, Inner Circle, or Professional/Making Money. Prices: ${prices}.`;
    }
    if (category === 'Advanced') {
      return `${assistantName(id)} Advanced hair problem response: I heard "${clean || 'your hair concern'}". Tell me if the issue is dry hair, wet-care, hair fall, scalp, growth, shine, or styling. Product prices and links are available in Catalog. Prices: ${prices}.`;
    }
    if (category === 'Inner Circle') {
      return `${assistantName(id)} Inner Circle: Premium Inner Circle is $35/mo and gives premium ARIA support, profile credibility, and guided hair/account flow. I can route you to Catalog now. Prices: ${prices}.`;
    }
    return `${assistantName(id)} Professional/Making Money: Pro is $50/mo and builds Professional/Making Money seriousness with Aria Voice, catalog/payment intent, rank, and business follow-through. Studio Jake Premium is $100/mo. Prices: ${prices}.`;
  }

  async function askBackend(id, transcript){
    const assistantId = id === 'jake' ? 'projake' : 'aria';
    const body = {
      assistant_id: assistantId,
      assistant: id,
      message: transcript,
      transcript,
      route: document.querySelector('.sr-nav-btn.active')?.dataset.route || document.querySelector('[data-panel]')?.dataset.panel || 'home',
      context: root.getAppState?.() || {}
    };
    try {
      const res = await fetch('/api/voice/respond', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body)
      });
      if (!res.ok) throw new Error('assistant endpoint unavailable');
      const data = await res.json();
      return {
        reply: data.reply || data.text || buildFallbackReply(id, transcript),
        provider: data.provider || data.voice_provider || 'local_budget',
        costMode: data.voice_cost_mode || 'local'
      };
    } catch {
      return {
        reply: buildFallbackReply(id, transcript),
        provider: 'browser_fallback',
        costMode: 'local'
      };
    }
  }

  function stopRecognition(){
    active = false;
    finalizing = false;
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = null;
    try { recognition?.stop?.(); } catch {}
  }

  async function finishAssistantTurn(id, transcript, reason = 'final'){
    if (finalizing) return;
    finalizing = true;
    active = false;
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = null;
    try { recognition?.stop?.(); } catch {}
    const clean = String(transcript || '').trim();
    if (!clean) {
      patch({ status:'silent complete', reply:`${assistantName(id)} did not hear anything after the pause. Click again when ready.` });
      playTone('outro');
      finalizing = false;
      return;
    }
    patch({ status: reason === 'silence' ? 'transcribing after silence' : 'thinking', transcript:clean });
    const answer = await askBackend(id, clean);
    const reply = answer.reply;
    const current = read();
    const history = [{ assistant:id, transcript:clean, reply, provider:answer.provider, at:new Date().toISOString() }, ...(current.history || [])].slice(0, 50);
    patch({ status: answer.provider === 'openai' ? 'paid ai reply' : 'free local reply', reply, history, provider:answer.provider, costMode:answer.costMode });
    try{ window.SupportRDRebuild?.recordDiaryAssistantHistory?.(id, clean, reply); }catch{}
    speak(reply, ()=>{
      playTone('outro');
      patch({ status:'complete' });
      const latest = read();
      finalizing = false;
      if (latest.handsFree) setTimeout(()=>startRecognition(latest.activeAssistant || id), 500);
    }, id);
  }

  function beginSilenceCountdown(id){
    if (silenceTimer) clearTimeout(silenceTimer);
    const current = read().transcript || '';
    patch({ status: current ? 'listening for 2-3 second silence' : '3 second open mic listening window' });
    silenceTimer = setTimeout(()=>{
      if (!active) return;
      finishAssistantTurn(id, read().transcript || '', 'silence');
    }, 2800);
  }

  function startRecognition(id){
    active = true;
    finalizing = false;
    patch({ activeAssistant:id, status:'open mic', transcript:'', reply:'' });

    if (!RECOGNITION) {
      patch({ status:'mic unavailable - type fallback' });
      return;
    }

    recognition = new RECOGNITION();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => beginSilenceCountdown(id);

    recognition.onresult = async (event)=>{
      if (silenceTimer) clearTimeout(silenceTimer);
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      const currentText = (finalText || interim || '').trim();
      patch({ status: finalText ? 'transcribing' : 'listening', transcript: currentText });
      if (finalText) {
        finishAssistantTurn(id, finalText.trim(), 'final');
      } else if (currentText) {
        beginSilenceCountdown(id);
      }
    };

    recognition.onerror = async (event)=>{
      const err = event?.error || 'unknown';
      if (err === 'no-speech' || err === 'audio-capture' || err === 'network') {
        const state = read();
        const id = state.activeAssistant || 'aria';
        const reply = buildFallbackReply(id, state.transcript || 'hair damage support');
        stopRecognition();
        patch({ status:'free local reply', reply, provider:'browser_fallback' });
        try{ window.SupportRDRebuild?.recordDiaryAssistantHistory?.(id, state.transcript || 'hair damage support', reply); }catch{}
        speak(reply, ()=>{ playTone('outro'); patch({ status:'complete' }); }, id);
        return;
      }
      stopRecognition();
      playTone('error');
      const msg = err === 'not-allowed'
        ? 'Microphone permission was blocked. Allow mic access in the browser to use ARIA or Jake voice.'
        : `Mic issue: ${err}.`;
      patch({ status:'mic error', reply:msg });
      speak(msg, ()=>patch({ status:'complete' }), id);
    };

    recognition.onend = async ()=>{
      if (!active) return;
      const state = read();
      if (!state.transcript) {
        active = false;
        patch({ status:'silent complete', reply:`${assistantName(id)} did not hear anything after the pause. Click again when ready.` });
        playTone('outro');
      }
    };

    try { recognition.start(); }
    catch {
      patch({ status:'mic start failed', reply:'The browser could not start the mic. Try clicking the assistant again and allow microphone access.' });
    }
  }

  function startAssistantSequence(id, handsFree = false){
    const assistant = id === 'jake' ? 'jake' : 'aria';
    stopRecognition();
    playTone('intro');
    patch({
      activeAssistant:assistant,
      handsFree: !!handsFree,
      status:'intro sound',
      transcript:'',
      reply:'',
      provider:'local_budget',
      voiceName:getBrowserVoice(assistant)?.name || '',
      lastStartedAt:new Date().toISOString()
    });

    const intro = assistant === 'jake'
      ? 'Jake online. How may I help you with Studio?'
      : 'ARIA online. How may I help you?';

    setTimeout(()=>{
      patch({ status:'How may I help you?', reply:intro });
      speak(intro, ()=>setTimeout(()=>startRecognition(assistant), 150), assistant);
    }, 260);
  }

  function renderVoiceAssistantPanel(container){
    const target = container || document.querySelector('#srVoiceAssistantPanel');
    if (!target) return false;
    const state = read();
    const name = assistantName(state.activeAssistant || 'aria');
    const activePanel = !['idle', 'complete', 'stopped', 'silent complete'].includes(String(state.status || 'idle'));
    target.classList.toggle('is-active', activePanel);
    target.classList.toggle('is-idle', !activePanel);
    target.innerHTML = `
      <div class="sr-voice-head">
        <span>Voice Assistant</span>
        <strong>${name}</strong>
        <p>${state.status}</p>
      </div>
      <div class="sr-voice-sequence">
        <div class="${state.status === 'intro sound' ? 'active' : ''}">1. Intro sound</div>
        <div class="${state.status === 'How may I help you?' ? 'active' : ''}">2. “How may I help you?”</div>
        <div class="${state.status === 'open mic' ? 'active' : ''}">3. Open mic</div>
        <div class="${state.status === '3 second open mic listening window' ? 'active' : ''}">4. 3 second open mic</div>
        <div class="${/listening|transcribing/.test(state.status) ? 'active' : ''}">5. Transcribing / listening</div>
        <div class="${/reply/.test(state.status) ? 'active' : ''}">6. Voice reply + outro</div>
      </div>
      <details class="sr-voice-box sr-transcript-hidden">
        <summary>Voice details</summary>
        <b>Cost mode</b><p>${state.provider === 'openai' ? 'Paid OpenAI voice brain' : 'Free browser voice + local SupportRD brain'}</p>
        <b>Browser voice</b><p>${state.voiceName || 'Device default voice'}</p>
        <b>Transcript</b><p>${state.transcript || 'Waiting for microphone input...'}</p>
        <b>Reply</b><p>${state.reply || 'Click ARIA or Jake to begin.'}</p>
      </details>
      <div class="sr-voice-current-reply"><b>Assistant Reply</b><p>${state.reply || 'Click ARIA or Jake to begin.'}</p></div>
      <div class="sr-voice-actions">
        <button class="sr-buy-btn" type="button" data-voice-start="aria">Start ARIA Mic</button>
        <button class="sr-mini-btn" type="button" data-voice-start="jake">Start Jake Mic</button>
        <button class="sr-mini-btn sr-settings-btn" type="button" data-voice-stop>Stop Mic</button>
      </div>
    `;
    return true;
  }

  function ensureVoicePanel(){
    if (document.querySelector('#srVoiceAssistantPanel')) return;
    const panel = document.createElement('section');
    panel.id = 'srVoiceAssistantPanel';
    panel.className = 'sr-voice-assistant-panel';
    document.body.appendChild(panel);
    renderVoiceAssistantPanel(panel);
  }

  function initVoiceAssistants(){
    ensureVoicePanel();

    document.addEventListener('click', event=>{
      const start = event.target.closest('[data-voice-start]');
      if (start) {
        event.preventDefault();
        startAssistantSequence(start.dataset.voiceStart, !!start.dataset.handsFree);
        return;
      }

      const stop = event.target.closest('[data-voice-stop]');
      if (stop) {
        stopRecognition();
        patch({ status:'stopped', reply:'Microphone stopped.' });
        return;
      }

      const route = event.target.closest('[data-route]');
      if (route && (route.dataset.route === 'aria' || route.dataset.route === 'jake')) {
        setTimeout(()=>startAssistantSequence(route.dataset.route, !!route.dataset.handsFree), 60);
      }
    });
  }

  root.startAssistantSequence = startAssistantSequence;
  root.renderVoiceAssistantPanel = renderVoiceAssistantPanel;
  root.initVoiceAssistants = initVoiceAssistants;
})();
