(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};

  const VOICE_KEY = 'srVoiceAssistantStateV25';
  const RECOGNITION = window.SpeechRecognition || window.webkitSpeechRecognition;

  const DEFAULT_STATE = {
    activeAssistant: '',
    status: 'idle',
    transcript: '',
    reply: '',
    lastStartedAt: '',
    history: []
  };

  let recognition = null;
  let silenceTimer = null;
  let active = false;

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

  function speak(text, onEnd){
    try {
      if (!('speechSynthesis' in window)) {
        if (onEnd) setTimeout(onEnd, 400);
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.96;
      utter.pitch = 1.02;
      utter.volume = 1;
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
    const body = {
      assistant: id,
      transcript,
      context: {
        route: document.querySelector('.sr-nav-btn.active')?.dataset.route || '',
        state: root.getAppState?.() || {}
      }
    };
    try {
      const res = await fetch('/api/assistant/voice', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body)
      });
      if (!res.ok) throw new Error('assistant endpoint unavailable');
      const data = await res.json();
      return data.reply || data.text || buildFallbackReply(id, transcript);
    } catch {
      return buildFallbackReply(id, transcript);
    }
  }

  function stopRecognition(){
    active = false;
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = null;
    try { recognition?.stop?.(); } catch {}
  }

  function beginSilenceCountdown(id){
    if (silenceTimer) clearTimeout(silenceTimer);
    patch({ status:'3 second open mic listening window' });
    silenceTimer = setTimeout(()=>{
      if (!active) return;
      patch({ status:'transcribing listening' });
    }, 3200);
  }

  function startRecognition(id){
    active = true;
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
        stopRecognition();
        patch({ status:'thinking', transcript:finalText.trim() });
        const reply = await askBackend(id, finalText.trim());
        const state = read();
        const history = [{ assistant:id, transcript:finalText.trim(), reply, at:new Date().toISOString() }, ...(state.history || [])].slice(0, 50);
        patch({ status:'ai reply', reply, history });
        try{ window.SupportRDRebuild?.recordDiaryAssistantHistory?.(id, finalText.trim(), reply); }catch{}
        speak(reply, ()=>{
          playTone('outro');
          patch({ status:'complete' });
          const latest = read();
          if (latest.handsFree) setTimeout(()=>startRecognition(latest.activeAssistant || assistant), 500);
        });
      }
    };

    recognition.onerror = async (event)=>{
      const err = event?.error || 'unknown';
      if (err === 'no-speech' || err === 'audio-capture' || err === 'network') {
        const state = read();
        const id = state.activeAssistant || 'aria';
        const reply = buildFallbackReply(id, state.transcript || 'hair damage support');
        stopRecognition();
        patch({ status:'ai reply', reply });
        try{ window.SupportRDRebuild?.recordDiaryAssistantHistory?.(id, state.transcript || 'hair damage support', reply); }catch{}
        speak(reply, ()=>{ playTone('outro'); patch({ status:'complete' }); });
        return;
      }
      stopRecognition();
      playTone('error');
      const msg = err === 'not-allowed'
        ? 'Microphone permission was blocked. Allow mic access in the browser to use ARIA or Jake voice.'
        : `Mic issue: ${err}.`;
      patch({ status:'mic error', reply:msg });
      speak(msg, ()=>patch({ status:'complete' }));
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
      lastStartedAt:new Date().toISOString()
    });

    const intro = assistant === 'jake'
      ? 'Jake online. How may I help you with Studio?'
      : 'ARIA online. How may I help you?';

    setTimeout(()=>{
      patch({ status:'How may I help you?', reply:intro });
      speak(intro, ()=>setTimeout(()=>startRecognition(assistant), 150));
    }, 260);
  }

  function renderVoiceAssistantPanel(container){
    const target = container || document.querySelector('#srVoiceAssistantPanel');
    if (!target) return false;
    const state = read();
    const name = assistantName(state.activeAssistant || 'aria');
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
        <div class="${state.status === 'ai reply' ? 'active' : ''}">6. AI reply + outro</div>
      </div>
      <details class="sr-voice-box sr-transcript-hidden">
        <summary>Voice details</summary>
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
