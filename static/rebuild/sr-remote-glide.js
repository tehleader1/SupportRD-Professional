(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const assistants = [
    { id:'aria', label:'ARIA', detail:'Hair voice' },
    { id:'jake', label:'Jake', detail:'Studio voice' }
  ];
  let moveTimer = null;

  function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function nextPosition(index){
    const width = Math.max(window.innerWidth || 1200, 360);
    const height = Math.max(window.innerHeight || 760, 520);
    const t = Date.now() / 1000;
    const baseX = index ? width * 0.78 : width * 0.14;
    const baseY = index ? height * 0.62 : height * 0.34;
    const x = clamp(baseX + Math.sin(t * 0.28 + index * 1.7) * width * 0.08, 18, width - 132);
    const y = clamp(baseY + Math.cos(t * 0.22 + index * 1.2) * height * 0.1, 84, height - 112);
    return { x, y };
  }

  function move(){
    document.querySelectorAll('.sr-roam-assistant').forEach((btn, index)=>{
      const pos = nextPosition(index);
      btn.style.left = `${pos.x}px`;
      btn.style.top = `${pos.y}px`;
    });
  }

  function syncVoiceState(state){
    const active = state?.activeAssistant || '';
    const status = state?.status || 'ready';
    document.querySelectorAll('.sr-roam-assistant').forEach(btn=>{
      const isActive = btn.dataset.route === active;
      btn.classList.toggle('listening', isActive && /mic|listening|transcribing|thinking|reply|intro|help/i.test(status));
      const statusNode = btn.querySelector('.sr-roam-status');
      if (statusNode) statusNode.textContent = isActive ? status : 'click to talk';
    });
  }

  function ensureGlide(){
    let dock = document.querySelector('#srRoamDock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'srRoamDock';
      dock.setAttribute('aria-label', 'SupportRD free roaming assistants');
      document.body.appendChild(dock);
    }
    assistants.forEach((assistant, index)=>{
      if (document.querySelector(`#srRoam-${assistant.id}`)) return;
      const btn = document.createElement('button');
      btn.id = `srRoam-${assistant.id}`;
      btn.className = `sr-roam-assistant sr-roam-assistant--${assistant.id}`;
      btn.type = 'button';
      btn.dataset.route = assistant.id;
      btn.innerHTML = `
        <span class="sr-roam-avatar">${assistant.label.slice(0, 1)}</span>
        <span class="sr-roam-copy">
          <strong>${assistant.label}</strong>
          <small>${assistant.detail}</small>
          <em class="sr-roam-status">click to talk</em>
        </span>
      `;
      dock.appendChild(btn);
      const pos = nextPosition(index);
      btn.style.left = `${pos.x}px`;
      btn.style.top = `${pos.y}px`;
    });
    move();
    if (!moveTimer) moveTimer = setInterval(move, 3600);
  }

  function initRemoteGlide(){
    ensureGlide();
    window.addEventListener('resize', move);
    window.addEventListener('sr-voice-state', event=>syncVoiceState(event.detail || {}));
    try {
      const voice = JSON.parse(localStorage.getItem('srVoiceAssistantStateV25') || '{}');
      syncVoiceState(voice);
    } catch {}
  }

  root.initRemoteGlide = initRemoteGlide;
})();
