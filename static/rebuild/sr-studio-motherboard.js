(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const STORE_KEY = 'srStudioMotherboardV41';
  const LANE_COUNT = 4;
  const PALETTE = ['#46a8ff', '#71f7c8', '#f6d15f', '#ff7ba8', '#b78cff', '#ff9f52'];
  const FX_LIST = [
    { id:'normalize', tier:'free', name:'Normalize', note:'Audacity-style loudness leveling before export.' },
    { id:'compressor', tier:'free', name:'Compressor', note:'Smooth vocal peaks so the lane sits tighter.' },
    { id:'limiter', tier:'free', name:'Limiter', note:'Master protection against clipping when all motherboards play.' },
    { id:'noise-gate', tier:'free', name:'Noise Gate', note:'Reduce room noise between vocal phrases.' },
    { id:'eq-curve', tier:'free', name:'Filter Curve EQ', note:'Blue-highlight EQ shaping for tone cleanup.' },
    { id:'bass-treble', tier:'free', name:'Bass / Treble', note:'Quick low-end or brightness movement.' },
    { id:'reverb', tier:'free', name:'Reverb', note:'Space and room around dry vocals or instruments.' },
    { id:'delay', tier:'free', name:'Delay', note:'Timed repeat for adlibs or hook emphasis.' },
    { id:'echo', tier:'free', name:'Echo', note:'Classic repeat effect on a selected highlight.' },
    { id:'fade', tier:'free', name:'Fade In / Fade Out', note:'Soft entrance and exit on the highlighted clip area.' },
    { id:'sr-vocal-polish', tier:'paid', name:'SupportRD Vocal Polish', note:'Premium shine, presence, and de-harsh pass.' },
    { id:'sr-caribbean-room', tier:'paid', name:'Caribbean Room Reverb', note:'Wide room sound for hooks and spoken intros.' },
    { id:'sr-auto-tune-lite', tier:'paid', name:'Jake Pitch Assist', note:'Premium pitch-stability lane for vocals.' },
    { id:'sr-master-chain', tier:'paid', name:'Motherboard Master Chain', note:'Paid master stack: compressor, EQ, limiter, stereo width.' },
    { id:'sr-radio-sweep', tier:'paid', name:'Radio Sweep / Phone FX', note:'Paid transition texture for edits and intros.' }
  ];
  const SEED_CLIPS = [
    { name:'Vocal Scratch Take', kind:'starter vocal recording', type:'triangle', frequency:240, duration:4.2, position:3, width:28, fx:'Noise Gate' },
    { name:'Beat Motherboard Loop', kind:'starter beat recording', type:'square', frequency:110, duration:4.8, position:11, width:34, fx:'Compressor' },
    { name:'Instrument Hook Visual', kind:'starter instrument recording', type:'sine', frequency:330, duration:3.8, position:21, width:31, fx:'Reverb' },
    { name:'FX Board Sweep', kind:'starter fx board recording', type:'sawtooth', frequency:190, duration:3.2, position:37, width:26, fx:'Delay' },
    { name:'Adlib Texture Lane', kind:'starter adlib recording', type:'triangle', frequency:420, duration:2.9, position:52, width:24, fx:'Echo' },
    { name:'Master Preview Print', kind:'starter master recording', type:'sine', frequency:150, duration:5, position:64, width:30, fx:'Limiter' }
  ];

  const studio = {
    lanes: Array.from({ length: LANE_COUNT }, (_, index)=>({
      id: `lane-${index + 1}`,
      name: `Lane ${index + 1} Audio Recording`,
      clips: []
    })),
    seeded: false,
    selectedLane: 0,
    selectedClip: 0,
    highlightStart: 12,
    highlightEnd: 68,
    recorder: null,
    stream: null,
    analyser: null,
    audioCtx: null,
    liveClip: null,
    raf: 0,
    playing: [],
    undo: []
  };

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function readSaved(){
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
  }

  function persist(){
    const payload = {
      lanes: studio.lanes.map(lane=>({
        id: lane.id,
        name: lane.name,
        clips: lane.clips.map(clip=>({
          id: clip.id,
          name: clip.name,
          kind: clip.kind,
          color: clip.color,
          peaks: clip.peaks,
          fxStack: clip.fxStack,
          generated: clip.generated,
          duration: clip.duration,
          position: clip.position,
          width: clip.width,
          highlightStart: clip.highlightStart,
          highlightEnd: clip.highlightEnd
        }))
      })),
      selectedLane: studio.selectedLane,
      selectedClip: studio.selectedClip,
      seeded: studio.seeded
    };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(payload)); } catch {}
  }

  function snapshot(){
    try {
      studio.undo.unshift(JSON.stringify({
        lanes: studio.lanes,
        selectedLane: studio.selectedLane,
        selectedClip: studio.selectedClip
      }));
      studio.undo = studio.undo.slice(0, 20);
    } catch {}
  }

  function restoreUndo(){
    const raw = studio.undo.shift();
    if (!raw) return alert('Nothing to undo yet.');
    try {
      const saved = JSON.parse(raw);
      studio.lanes = saved.lanes.map((lane, index)=>({
        id: lane.id || `lane-${index + 1}`,
        name: lane.name || `Lane ${index + 1} Audio Recording`,
        clips: Array.isArray(lane.clips) ? lane.clips.map(clip=>({
          ...clip,
          peaks: Array.isArray(clip.peaks) ? clip.peaks : makePeaks(index + 1),
          fxStack: Array.isArray(clip.fxStack) ? clip.fxStack : []
        })) : []
      }));
      while (studio.lanes.length < LANE_COUNT) {
        const index = studio.lanes.length;
        studio.lanes.push({ id:`lane-${index + 1}`, name:`Lane ${index + 1} Audio Recording`, clips:[] });
      }
      studio.lanes = studio.lanes.slice(0, LANE_COUNT);
      studio.selectedLane = Math.max(0, Math.min(LANE_COUNT - 1, Number(saved.selectedLane || 0)));
      studio.selectedClip = Math.max(0, Number(saved.selectedClip || 0));
      persist();
      renderLanes();
      syncPanelLabels();
      recordAccount('studio-undo');
    } catch {
      alert('Undo snapshot could not be restored.');
    }
  }

  function restoreSaved(){
    const saved = readSaved();
    if (!Array.isArray(saved.lanes)) return;
    studio.lanes = saved.lanes.slice(0, LANE_COUNT).map((lane, index)=>({
      id: lane.id || `lane-${index + 1}`,
      name: lane.name || `Lane ${index + 1} Audio Recording`,
      clips: Array.isArray(lane.clips) ? lane.clips.map(clip=>({
        ...clip,
        url: '',
        peaks: Array.isArray(clip.peaks) ? clip.peaks : makePeaks(index + 1),
        fxStack: Array.isArray(clip.fxStack) ? clip.fxStack : []
      })) : []
    }));
    while (studio.lanes.length < LANE_COUNT) {
      const index = studio.lanes.length;
      studio.lanes.push({ id:`lane-${index + 1}`, name:`Lane ${index + 1} Audio Recording`, clips:[] });
    }
    studio.seeded = Boolean(saved.seeded);
    studio.selectedLane = Math.max(0, Math.min(LANE_COUNT - 1, Number(saved.selectedLane || 0)));
    studio.selectedClip = Math.max(0, Number(saved.selectedClip || 0));
  }

  function recordAccount(event, payload){
    try { root.recordJakeStudioHistory?.({ event, ...(payload || {}), at:new Date().toISOString() }); } catch {}
  }

  function makePeaks(seed = 1){
    return Array.from({ length: 180 }, (_, index)=>{
      const a = Math.abs(Math.sin(index * 0.09 + seed));
      const b = Math.abs(Math.sin(index * 0.031 + seed * 1.7));
      return Math.max(0.03, Math.min(1, (a * 0.6) + (b * 0.28) + 0.04));
    });
  }

  function seedStudioLanes(){
    if (studio.seeded) return;
    studio.lanes.forEach((lane, laneIndex)=>{
      if (lane.clips.length) return;
      const seed = SEED_CLIPS[laneIndex % SEED_CLIPS.length];
      lane.clips.push({
        id: `seed-${laneIndex + 1}`,
        name: seed.name,
        kind: seed.kind,
        url: '',
        generated: { type:seed.type, frequency:seed.frequency, duration:seed.duration },
        peaks: makePeaks(laneIndex + 1.35),
        fxStack: [{ id:'seed-preview', name:seed.fx, tier:'free', strength:42, start:18, end:74, at:new Date().toISOString() }],
        color: PALETTE[laneIndex % PALETTE.length],
        duration: seed.duration,
        position: seed.position,
        width: seed.width,
        highlightStart: studio.highlightStart,
        highlightEnd: studio.highlightEnd
      });
    });
    studio.seeded = true;
    persist();
  }

  function selectedLane(){
    return studio.lanes[studio.selectedLane] || studio.lanes[0];
  }

  function selectedClip(){
    const lane = selectedLane();
    return lane?.clips?.[studio.selectedClip] || lane?.clips?.[0] || null;
  }

  function newClip({ name, kind, url = '', peaks, generated = null, duration = 4 }){
    const lane = selectedLane();
    const count = lane.clips.length;
    return {
      id: `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      kind,
      url,
      generated,
      peaks: peaks || makePeaks(count + studio.selectedLane + 1),
      fxStack: [],
      color: PALETTE[studio.selectedLane % PALETTE.length],
      duration,
      position: Math.min(76, count * 15),
      width: 24,
      highlightStart: studio.highlightStart,
      highlightEnd: studio.highlightEnd
    };
  }

  function ensureAudioContext(){
    if (!studio.audioCtx || studio.audioCtx.state === 'closed') {
      studio.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return studio.audioCtx;
  }

  async function peaksFromAudioFile(file){
    try {
      const ctx = ensureAudioContext();
      const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
      const data = buffer.getChannelData(0);
      const buckets = 180;
      const peaks = [];
      for (let i = 0; i < buckets; i++) {
        const start = Math.floor((i / buckets) * data.length);
        const end = Math.floor(((i + 1) / buckets) * data.length);
        let max = 0;
        for (let j = start; j < end; j++) max = Math.max(max, Math.abs(data[j] || 0));
        peaks.push(Math.max(0.02, Math.min(1, max)));
      }
      return { peaks, duration: buffer.duration || 4 };
    } catch {
      return { peaks: makePeaks(Math.random() * 4), duration: 4 };
    }
  }

  function transformedPeaks(clip, fxId, start, end, strength){
    const peaks = [...(clip.peaks || [])];
    const from = Math.floor((Math.min(start, end) / 100) * peaks.length);
    const to = Math.max(from + 1, Math.floor((Math.max(start, end) / 100) * peaks.length));
    const amount = Math.max(0, Math.min(1, strength / 100));
    for (let i = from; i < to; i++) {
      const current = peaks[i] || 0.04;
      if (fxId === 'normalize') peaks[i] = Math.min(1, current * (1.08 + amount * 0.32));
      else if (fxId === 'compressor') peaks[i] = Math.min(0.78, current * (0.9 + amount * 0.12));
      else if (fxId === 'limiter') peaks[i] = Math.min(0.68 + amount * 0.18, current);
      else if (fxId === 'noise-gate') peaks[i] = current < (0.18 + amount * 0.16) ? 0.025 : current;
      else if (fxId === 'eq-curve') peaks[i] = Math.min(1, current * (0.94 + Math.sin(i * 0.08) * amount * 0.22 + amount * 0.18));
      else if (fxId === 'bass-treble') peaks[i] = Math.min(1, current * (1 + Math.sin(i * 0.03) * amount * 0.28));
      else if (fxId === 'fade') peaks[i] = current * ((i - from) / Math.max(1, to - from));
      else if (fxId.includes('reverb') || fxId.includes('delay') || fxId === 'echo') peaks[i] = Math.min(1, current * 0.88 + Math.abs(Math.sin(i * 0.18)) * amount * 0.28);
      else peaks[i] = Math.min(1, current * (1.02 + amount * 0.18));
    }
    return peaks;
  }

  function renderStudio(){
    const stage = document.querySelector('#remoteStage');
    if (!stage) return;
    document.querySelectorAll('[data-route]').forEach(btn=>btn.classList.toggle('active', btn.dataset.route === 'studio'));
    stage.innerHTML = `
      <section class="sr-studio-board" data-panel="studio">
        <header class="sr-studio-board__head">
          <div>
            <span>Studio Jake Motherboard</span>
            <h2>Four stacked motherboards with real lane controls.</h2>
            <p>Choose a lane, record vocals or room sound, import MP3/M4A/WAV, add generated instrument sound visuals, highlight clips in blue, move or cut the clip, then apply free or paid FX.</p>
          </div>
          <div class="sr-studio-board__meters">
            <strong id="srStudioSelectedLabel">Lane 1 Audio Recording</strong>
            <small id="srStudioClipLabel">No clip selected</small>
          </div>
        </header>

        <div class="sr-studio-toolbar">
          <label class="sr-studio-file">
            <input id="srStudioFileInput" type="file" accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg" multiple>
            <span>Import MP3 / M4A / WAV</span>
          </label>
          <button class="sr-mini-btn" type="button" data-studio-rewind>Rewind</button>
          <button class="sr-mini-btn" type="button" data-studio-undo>Undo</button>
          <button class="sr-buy-btn" type="button" data-studio-play-selected>Play</button>
          <button class="sr-mini-btn" type="button" data-studio-stop-all>Stop</button>
          <button class="sr-buy-btn" type="button" data-studio-record>Record</button>
          <button class="sr-mini-btn" type="button" data-studio-stop-record>Stop Record</button>
          <button class="sr-mini-btn" type="button" data-studio-forward>Forward</button>
          <button class="sr-mini-btn" type="button" data-studio-fastforward>Fastforward</button>
          <button class="sr-mini-btn" type="button" data-studio-add-instrument>Add Instrument Visual</button>
          <button class="sr-mini-btn" type="button" data-studio-play-lane>Play Selected Lane</button>
          <button class="sr-buy-btn" type="button" data-studio-play-all>Play All Motherboards</button>
        </div>

        <div class="sr-studio-layout">
          <section class="sr-studio-lanes" id="srStudioLanes"></section>
          <aside class="sr-studio-fx">
            <h3>FX Board</h3>
            <label>Free and paid FX</label>
            <select id="srStudioFxSelect">
              ${FX_LIST.map(fx=>`<option value="${esc(fx.id)}">${esc(fx.tier.toUpperCase())} - ${esc(fx.name)}</option>`).join('')}
            </select>
            <p id="srStudioFxNote">${esc(FX_LIST[0].note)}</p>
            <label>Highlight start</label>
            <input id="srStudioHighlightStart" type="range" min="0" max="99" value="${studio.highlightStart}">
            <label>Highlight end</label>
            <input id="srStudioHighlightEnd" type="range" min="1" max="100" value="${studio.highlightEnd}">
            <label>FX strength</label>
            <input id="srStudioFxStrength" type="range" min="0" max="100" value="58">
            <button class="sr-buy-btn" type="button" data-studio-apply-fx>Apply FX To Blue Highlight</button>
            <button class="sr-mini-btn" type="button" data-studio-cut-highlight>Cut Highlight To New Clip</button>
            <button class="sr-mini-btn" type="button" data-studio-trim-highlight>Trim Visual To Highlight</button>
            <button class="sr-mini-btn" type="button" data-studio-move-left>Move Clip Left</button>
            <button class="sr-mini-btn" type="button" data-studio-move-right>Move Clip Right</button>
            <button class="sr-mini-btn" type="button" data-studio-delete-clip>Delete Selected Clip</button>
            <button class="sr-buy-btn" type="button" data-studio-export>Export Motherboard Manifest</button>
            <div class="sr-output-box" id="srStudioFxStack">Select a clip to see FX history.</div>
          </aside>
        </div>
      </section>
    `;
    renderLanes();
    syncPanelLabels();
  }

  function renderLanes(){
    const mount = document.querySelector('#srStudioLanes');
    if (!mount) return;
    mount.innerHTML = studio.lanes.map((lane, laneIndex)=>`
      <article class="sr-studio-lane ${laneIndex === studio.selectedLane ? 'selected' : ''}" data-studio-lane="${laneIndex}">
        <div class="sr-studio-lane__label">
          <strong>${esc(lane.name)}</strong>
          <small>${lane.clips.length} clip${lane.clips.length === 1 ? '' : 's'}</small>
        </div>
        <canvas class="sr-studio-lane__canvas" data-studio-canvas="${laneIndex}" width="900" height="96"></canvas>
        <div class="sr-studio-clips">
          ${lane.clips.map((clip, clipIndex)=>`
            <button class="sr-studio-clip ${laneIndex === studio.selectedLane && clipIndex === studio.selectedClip ? 'selected' : ''}" type="button" data-studio-clip-lane="${laneIndex}" data-studio-clip="${clipIndex}" style="left:${clip.position || 0}%;width:${clip.width || 24}%;">
              <span>${esc(clip.name)}</span>
            </button>
          `).join('')}
        </div>
      </article>
    `).join('');
    studio.lanes.forEach((lane, laneIndex)=>drawLane(laneIndex));
  }

  function drawLane(laneIndex){
    const canvas = document.querySelector(`[data-studio-canvas="${laneIndex}"]`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth || 900;
    const height = canvas.height = canvas.offsetHeight || 96;
    const lane = studio.lanes[laneIndex];
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020813';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    lane.clips.forEach((clip, clipIndex)=>{
      const startX = ((clip.position || 0) / 100) * width;
      const clipW = ((clip.width || 24) / 100) * width;
      const selected = laneIndex === studio.selectedLane && clipIndex === studio.selectedClip;
      const peaks = clip.peaks || [];
      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, 0, clipW, height);
      ctx.clip();
      ctx.fillStyle = selected ? 'rgba(70,168,255,.18)' : 'rgba(255,255,255,.045)';
      ctx.fillRect(startX, 0, clipW, height);
      ctx.strokeStyle = selected ? '#46a8ff' : (clip.color || PALETTE[laneIndex % PALETTE.length]);
      ctx.shadowColor = selected ? '#46a8ff' : 'transparent';
      ctx.shadowBlur = selected ? 12 : 0;
      ctx.lineWidth = selected ? 2.6 : 1.8;
      ctx.beginPath();
      peaks.forEach((value, index)=>{
        const x = startX + (index / Math.max(1, peaks.length - 1)) * clipW;
        const y = (height / 2) - (value * height * 0.42);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.beginPath();
      peaks.forEach((value, index)=>{
        const x = startX + (index / Math.max(1, peaks.length - 1)) * clipW;
        const y = (height / 2) + (value * height * 0.42);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      if (selected) {
        const hStart = Math.min(clip.highlightStart ?? studio.highlightStart, clip.highlightEnd ?? studio.highlightEnd);
        const hEnd = Math.max(clip.highlightStart ?? studio.highlightStart, clip.highlightEnd ?? studio.highlightEnd);
        const hx = startX + (hStart / 100) * clipW;
        const hw = Math.max(5, ((hEnd - hStart) / 100) * clipW);
        ctx.fillStyle = 'rgba(70,168,255,.36)';
        ctx.fillRect(hx, 0, hw, height);
        ctx.strokeStyle = '#8fd2ff';
        ctx.strokeRect(hx, 1, hw, height - 2);
      }
      ctx.restore();
    });
  }

  function syncPanelLabels(){
    const lane = selectedLane();
    const clip = selectedClip();
    const label = document.querySelector('#srStudioSelectedLabel');
    const clipLabel = document.querySelector('#srStudioClipLabel');
    const fxStack = document.querySelector('#srStudioFxStack');
    if (label) label.textContent = lane?.name || 'Lane 1 Audio Recording';
    if (clipLabel) clipLabel.textContent = clip ? `${clip.name} / ${clip.kind} / ${clip.fxStack?.length || 0} FX` : 'No clip selected';
    if (fxStack) {
      fxStack.innerHTML = clip
        ? `<strong>${esc(clip.name)}</strong><p>${(clip.fxStack || []).map(fx=>`${esc(fx.name)} (${esc(fx.tier)}) ${fx.strength}% on ${fx.start}-${fx.end}%`).join('<br>') || 'No FX placed yet.'}</p>`
        : 'Select a clip to see FX history.';
    }
    const start = document.querySelector('#srStudioHighlightStart');
    const end = document.querySelector('#srStudioHighlightEnd');
    if (start && clip) start.value = clip.highlightStart ?? studio.highlightStart;
    if (end && clip) end.value = clip.highlightEnd ?? studio.highlightEnd;
  }

  async function importFiles(files){
    const lane = selectedLane();
    snapshot();
    for (const file of Array.from(files || [])) {
      const decoded = await peaksFromAudioFile(file);
      const clip = newClip({
        name: file.name,
        kind: file.type?.includes('audio') ? 'audio import' : 'import',
        url: URL.createObjectURL(file),
        peaks: decoded.peaks,
        duration: decoded.duration
      });
      lane.clips.push(clip);
      studio.selectedClip = lane.clips.length - 1;
      try { root.recordStudioImport?.({ file:file.name, kind:'import', lane:lane.name }); } catch {}
    }
    persist();
    renderLanes();
    syncPanelLabels();
    recordAccount('studio-import', { lane:lane.name, count:files?.length || 0 });
  }

  function addInstrument(){
    const lane = selectedLane();
    snapshot();
    const instrumentNames = ['Synth Keys', 'Island Pluck', '808 Pulse', 'Warm Pad', 'Hi Hat Texture', 'Bass Motif'];
    const name = `${instrumentNames[(lane.clips.length + studio.selectedLane) % instrumentNames.length]} ${Date.now().toString().slice(-4)}`;
    const clip = newClip({
      name,
      kind:'generated instrument',
      generated:{ type:'sine', frequency:180 + (studio.selectedLane * 60), duration:3.5 },
      peaks:makePeaks(studio.selectedLane + lane.clips.length + 2),
      duration:3.5
    });
    lane.clips.push(clip);
    studio.selectedClip = lane.clips.length - 1;
    persist();
    renderLanes();
    syncPanelLabels();
    recordAccount('studio-instrument-visual', { lane:lane.name, file:name });
  }

  async function startRecording(){
    if (studio.recorder?.state === 'recording') return;
    try {
      snapshot();
      const ctx = ensureAudioContext();
      studio.stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const source = ctx.createMediaStreamSource(studio.stream);
      studio.analyser = ctx.createAnalyser();
      studio.analyser.fftSize = 512;
      source.connect(studio.analyser);
      const chunks = [];
      const lane = selectedLane();
      const clip = newClip({
        name:`recording-${lane.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.webm`,
        kind:'live vocal recording',
        peaks:Array(180).fill(0.03),
        duration:0
      });
      clip.live = true;
      lane.clips.push(clip);
      studio.selectedClip = lane.clips.length - 1;
      studio.liveClip = clip;
      studio.recorder = new MediaRecorder(studio.stream);
      studio.recorder.ondataavailable = event=>{ if (event.data?.size) chunks.push(event.data); };
      studio.recorder.onstop = ()=>{
        const blob = new Blob(chunks, { type:studio.recorder.mimeType || 'audio/webm' });
        clip.url = URL.createObjectURL(blob);
        clip.live = false;
        clip.duration = Math.max(1, clip.duration || 1);
        try { studio.stream?.getTracks?.().forEach(track=>track.stop()); } catch {}
        studio.stream = null;
        studio.liveClip = null;
        cancelAnimationFrame(studio.raf);
        persist();
        renderLanes();
        syncPanelLabels();
        try { root.recordStudioImport?.({ file:clip.name, kind:'recording', lane:lane.name }); } catch {}
        recordAccount('studio-record-finished', { lane:lane.name, file:clip.name });
      };
      studio.recorder.start();
      visualizeRecording();
      renderLanes();
      syncPanelLabels();
      recordAccount('studio-record-start', { lane:lane.name });
    } catch (error) {
      alert(`Microphone permission needed to record the selected lane: ${error.message}`);
    }
  }

  function visualizeRecording(){
    if (!studio.analyser || !studio.liveClip) return;
    const data = new Uint8Array(studio.analyser.frequencyBinCount);
    studio.analyser.getByteTimeDomainData(data);
    let max = 0;
    for (const sample of data) max = Math.max(max, Math.abs((sample - 128) / 128));
    studio.liveClip.peaks.push(Math.max(0.03, max));
    studio.liveClip.peaks = studio.liveClip.peaks.slice(-180);
    studio.liveClip.duration = Number(studio.liveClip.duration || 0) + 0.06;
    drawLane(studio.selectedLane);
    studio.raf = requestAnimationFrame(visualizeRecording);
  }

  function stopRecording(){
    try {
      if (studio.recorder?.state === 'recording') studio.recorder.stop();
      else studio.stream?.getTracks?.().forEach(track=>track.stop());
    } catch {}
    cancelAnimationFrame(studio.raf);
    recordAccount('studio-record-stop', { lane:selectedLane()?.name });
  }

  function stopAll(){
    studio.playing.forEach(item=>{
      try { item.pause?.(); } catch {}
      try { item.stop?.(); } catch {}
      try { item.disconnect?.(); } catch {}
    });
    studio.playing = [];
    studio.lanes.forEach(lane=>lane.clips.forEach(clip=>{ clip.playing = false; }));
    renderLanes();
    recordAccount('studio-stop-all');
  }

  function playGenerated(clip){
    const ctx = ensureAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = clip.generated?.type || 'sine';
    osc.frequency.value = clip.generated?.frequency || 240;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (clip.generated?.duration || 3));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (clip.generated?.duration || 3.2));
    studio.playing.push(osc);
  }

  function playClip(clip){
    if (!clip) return;
    clip.playing = true;
    if (clip.url) {
      const audio = new Audio(clip.url);
      audio.onended = ()=>{ clip.playing = false; renderLanes(); };
      audio.play();
      studio.playing.push(audio);
    } else if (clip.generated) {
      playGenerated(clip);
      setTimeout(()=>{ clip.playing = false; renderLanes(); }, (clip.generated.duration || 3) * 1000);
    }
  }

  function playSelected(){
    const clip = selectedClip();
    if (!clip) return alert('Select a clip first or import/record audio on this lane.');
    playClip(clip);
    recordAccount('studio-play-selected', { lane:selectedLane()?.name, file:clip.name });
  }

  function playLane(){
    const lane = selectedLane();
    if (!lane?.clips?.length) return alert('This lane has no motherboard clips yet.');
    lane.clips.forEach(playClip);
    recordAccount('studio-play-lane', { lane:lane.name, clips:lane.clips.length });
  }

  function playAll(){
    const clips = studio.lanes.flatMap(lane=>lane.clips);
    if (!clips.length) return alert('Add or record clips before playing all motherboards.');
    clips.forEach(playClip);
    recordAccount('studio-play-all', { clips:clips.length });
  }

  function rewind(){
    stopAll();
    recordAccount('studio-rewind');
  }

  function applyFx(){
    const clip = selectedClip();
    if (!clip) return alert('Select a clip first.');
    snapshot();
    const fxId = document.querySelector('#srStudioFxSelect')?.value || 'normalize';
    const fx = FX_LIST.find(item=>item.id === fxId) || FX_LIST[0];
    const strength = Number(document.querySelector('#srStudioFxStrength')?.value || 58);
    const start = Number(document.querySelector('#srStudioHighlightStart')?.value || studio.highlightStart);
    const end = Number(document.querySelector('#srStudioHighlightEnd')?.value || studio.highlightEnd);
    clip.highlightStart = Math.min(start, end);
    clip.highlightEnd = Math.max(start, end);
    clip.peaks = transformedPeaks(clip, fxId, clip.highlightStart, clip.highlightEnd, strength);
    clip.fxStack = [
      ...(clip.fxStack || []),
      { id:fx.id, name:fx.name, tier:fx.tier, strength, start:clip.highlightStart, end:clip.highlightEnd, at:new Date().toISOString() }
    ].slice(-12);
    persist();
    renderLanes();
    syncPanelLabels();
    recordAccount('studio-apply-fx', { lane:selectedLane()?.name, file:clip.name, fx:fx.name, tier:fx.tier, strength });
  }

  function trimHighlight(){
    const clip = selectedClip();
    if (!clip) return alert('Select a clip first.');
    snapshot();
    const start = Math.min(Number(document.querySelector('#srStudioHighlightStart')?.value || 0), Number(document.querySelector('#srStudioHighlightEnd')?.value || 100));
    const end = Math.max(Number(document.querySelector('#srStudioHighlightStart')?.value || 0), Number(document.querySelector('#srStudioHighlightEnd')?.value || 100));
    const from = Math.floor((start / 100) * clip.peaks.length);
    const to = Math.max(from + 1, Math.floor((end / 100) * clip.peaks.length));
    clip.peaks = clip.peaks.slice(from, to);
    clip.name = `${clip.name} highlight`;
    clip.highlightStart = 0;
    clip.highlightEnd = 100;
    clip.width = Math.max(10, ((end - start) / 100) * (clip.width || 24));
    persist();
    renderLanes();
    syncPanelLabels();
    recordAccount('studio-trim-highlight', { lane:selectedLane()?.name, file:clip.name, start, end });
  }

  function cutHighlight(){
    const lane = selectedLane();
    const clip = selectedClip();
    if (!lane || !clip) return alert('Select a clip first.');
    snapshot();
    const start = Math.min(Number(document.querySelector('#srStudioHighlightStart')?.value || 0), Number(document.querySelector('#srStudioHighlightEnd')?.value || 100));
    const end = Math.max(Number(document.querySelector('#srStudioHighlightStart')?.value || 0), Number(document.querySelector('#srStudioHighlightEnd')?.value || 100));
    const from = Math.floor((start / 100) * (clip.peaks || []).length);
    const to = Math.max(from + 1, Math.floor((end / 100) * (clip.peaks || []).length));
    const cut = {
      ...clip,
      id: `cut-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: `${clip.name} cut ${start}-${end}`,
      peaks: (clip.peaks || []).slice(from, to),
      position: Math.min(88, (clip.position || 0) + Math.max(4, ((end - start) / 100) * (clip.width || 24)) + 2),
      width: Math.max(8, ((end - start) / 100) * (clip.width || 24)),
      highlightStart: 0,
      highlightEnd: 100,
      fxStack: [
        ...(clip.fxStack || []),
        { id:'cut', name:'Blue Highlight Cut', tier:'free', strength:100, start, end, at:new Date().toISOString() }
      ]
    };
    lane.clips.splice(studio.selectedClip + 1, 0, cut);
    studio.selectedClip = studio.selectedClip + 1;
    persist();
    renderLanes();
    syncPanelLabels();
    recordAccount('studio-cut-highlight', { lane:lane.name, file:clip.name, start, end });
  }

  function moveClip(delta){
    const clip = selectedClip();
    if (!clip) return alert('Select a clip first.');
    snapshot();
    clip.position = Math.max(0, Math.min(92, Number(clip.position || 0) + delta));
    persist();
    renderLanes();
    syncPanelLabels();
    recordAccount('studio-move-clip', { lane:selectedLane()?.name, file:clip.name, position:clip.position });
  }

  function forward(amount = 5){
    const clip = selectedClip();
    if (clip) {
      moveClip(amount);
      return;
    }
    recordAccount('studio-forward', { amount });
  }

  function deleteClip(){
    const lane = selectedLane();
    const clip = selectedClip();
    if (!lane || !clip) return;
    snapshot();
    lane.clips.splice(studio.selectedClip, 1);
    studio.selectedClip = Math.max(0, Math.min(studio.selectedClip, lane.clips.length - 1));
    persist();
    renderLanes();
    syncPanelLabels();
    recordAccount('studio-delete-clip', { lane:lane.name, file:clip.name });
  }

  function exportManifest(){
    const manifest = {
      createdAt:new Date().toISOString(),
      lanes: studio.lanes.map((lane, laneIndex)=>({
        lane: laneIndex + 1,
        name: lane.name,
        clips: lane.clips.map((clip, clipIndex)=>({
          clip: clipIndex + 1,
          name: clip.name,
          kind: clip.kind,
          duration: clip.duration,
          highlightStart: clip.highlightStart,
          highlightEnd: clip.highlightEnd,
          fxStack: clip.fxStack || [],
          hasPlayableBrowserUrl: !!clip.url,
          generated: clip.generated || null
        }))
      }))
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type:'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `supportrd-studio-motherboard-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    try { root.recordStudioExport?.({ file:link.download, lanes:LANE_COUNT }); } catch {}
    recordAccount('studio-export-motherboard', { file:link.download });
  }

  function bindStudioEvents(){
    if (window.__srStudioMotherboardBound) return;
    window.__srStudioMotherboardBound = true;
    document.addEventListener('change', event=>{
      if (event.target?.id === 'srStudioFileInput') {
        importFiles(event.target.files);
        event.target.value = '';
      }
      if (event.target?.id === 'srStudioFxSelect') {
        const fx = FX_LIST.find(item=>item.id === event.target.value) || FX_LIST[0];
        const note = document.querySelector('#srStudioFxNote');
        if (note) note.textContent = fx.note;
      }
    });
    document.addEventListener('input', event=>{
      const clip = selectedClip();
      if (!clip) return;
      if (event.target?.id === 'srStudioHighlightStart' || event.target?.id === 'srStudioHighlightEnd') {
        const start = Number(document.querySelector('#srStudioHighlightStart')?.value || studio.highlightStart);
        const end = Number(document.querySelector('#srStudioHighlightEnd')?.value || studio.highlightEnd);
        clip.highlightStart = Math.min(start, end);
        clip.highlightEnd = Math.max(start, end);
        drawLane(studio.selectedLane);
        syncPanelLabels();
      }
    });
    document.addEventListener('click', event=>{
      const laneBtn = event.target.closest?.('[data-studio-lane]');
      if (laneBtn && !event.target.closest('[data-studio-clip]')) {
        studio.selectedLane = Number(laneBtn.dataset.studioLane || 0);
        studio.selectedClip = 0;
        renderLanes();
        syncPanelLabels();
      }
      const clipBtn = event.target.closest?.('[data-studio-clip]');
      if (clipBtn) {
        studio.selectedLane = Number(clipBtn.dataset.studioClipLane || 0);
        studio.selectedClip = Number(clipBtn.dataset.studioClip || 0);
        renderLanes();
        syncPanelLabels();
      }
      if (event.target.closest?.('[data-studio-record]')) startRecording();
      if (event.target.closest?.('[data-studio-stop-record]')) stopRecording();
      if (event.target.closest?.('[data-studio-add-instrument]')) addInstrument();
      if (event.target.closest?.('[data-studio-play-selected]')) playSelected();
      if (event.target.closest?.('[data-studio-play-lane]')) playLane();
      if (event.target.closest?.('[data-studio-play-all]')) playAll();
      if (event.target.closest?.('[data-studio-stop-all]')) stopAll();
      if (event.target.closest?.('[data-studio-rewind]')) rewind();
      if (event.target.closest?.('[data-studio-undo]')) restoreUndo();
      if (event.target.closest?.('[data-studio-forward]')) forward(5);
      if (event.target.closest?.('[data-studio-fastforward]')) forward(12);
      if (event.target.closest?.('[data-studio-apply-fx]')) applyFx();
      if (event.target.closest?.('[data-studio-cut-highlight]')) cutHighlight();
      if (event.target.closest?.('[data-studio-trim-highlight]')) trimHighlight();
      if (event.target.closest?.('[data-studio-move-left]')) moveClip(-5);
      if (event.target.closest?.('[data-studio-move-right]')) moveClip(5);
      if (event.target.closest?.('[data-studio-delete-clip]')) deleteClip();
      if (event.target.closest?.('[data-studio-export]')) exportManifest();
    });
  }

  function installStyles(){
    if (document.querySelector('#srStudioMotherboardCss')) return;
    const style = document.createElement('style');
    style.id = 'srStudioMotherboardCss';
    style.textContent = `
      .sr-studio-board{display:grid;gap:1rem;padding:1rem;border-radius:1.25rem;background:rgba(3,8,19,.62);border:1px solid rgba(255,255,255,.12)}
      .sr-studio-board__head,.sr-studio-toolbar{display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap}
      .sr-studio-board__head span{display:block;color:#61efff;font-size:.75rem;text-transform:uppercase;letter-spacing:.14em;font-weight:1000}
      .sr-studio-board__head h2{margin:.15rem 0;font-size:clamp(1.6rem,3vw,3rem);line-height:.96}
      .sr-studio-board__head p{margin:0;max-width:56rem;color:rgba(247,251,255,.72);line-height:1.5}
      .sr-studio-board__meters{min-width:14rem;padding:.8rem;border-radius:1rem;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06)}
      .sr-studio-board__meters strong,.sr-studio-board__meters small{display:block}
      .sr-studio-file input{position:absolute;opacity:0;pointer-events:none}.sr-studio-file span{display:inline-flex;align-items:center;min-height:2.8rem;padding:0 1rem;border-radius:.9rem;background:linear-gradient(135deg,#14b7c7,#9ff9ff);color:#06101f;font-weight:1000;cursor:pointer}
      .sr-studio-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(17rem,.34fr);gap:1rem;align-items:start}
      .sr-studio-lanes{display:grid;gap:.7rem}.sr-studio-lane{position:relative;min-height:7.6rem;border:1px solid rgba(97,239,255,.24);border-radius:1rem;background:#020813;overflow:hidden;cursor:pointer}.sr-studio-lane.selected{outline:2px solid rgba(113,247,200,.8)}
      .sr-studio-lane__label{position:absolute;left:.75rem;top:.55rem;z-index:3;display:flex;gap:.7rem;align-items:center;pointer-events:none}.sr-studio-lane__label strong{font-size:.82rem}.sr-studio-lane__label small{color:rgba(247,251,255,.66)}
      .sr-studio-lane__canvas{display:block;width:100%;height:7.6rem}.sr-studio-clips{position:absolute;inset:0;pointer-events:none}.sr-studio-clip{position:absolute;top:2.4rem;height:3.3rem;border:2px solid rgba(113,247,200,.8);border-radius:.7rem;background:rgba(113,247,200,.11);color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:auto;cursor:pointer;text-align:left;padding:.35rem .5rem;font-weight:900}.sr-studio-clip.selected{border-color:#46a8ff;background:rgba(70,168,255,.28);box-shadow:0 0 26px rgba(70,168,255,.42)}
      .sr-studio-clip span{font-size:.72rem;line-height:1.1}.sr-studio-fx{display:grid;gap:.55rem;padding:1rem;border:1px solid rgba(255,255,255,.14);border-radius:1rem;background:rgba(255,255,255,.065)}.sr-studio-fx h3{margin:0}.sr-studio-fx label{font-size:.75rem;color:#61efff;text-transform:uppercase;letter-spacing:.12em;font-weight:1000}.sr-studio-fx select,.sr-studio-fx input{width:100%}.sr-studio-fx select{padding:.75rem;border-radius:.8rem;border:1px solid rgba(255,255,255,.16);background:#06101f;color:#fff}
      #srStudioFxNote{margin:0;color:rgba(247,251,255,.72);line-height:1.4}.sr-studio-toolbar .sr-buy-btn,.sr-studio-toolbar .sr-mini-btn{min-height:2.8rem}
      @media(max-width:980px){.sr-studio-layout{grid-template-columns:1fr}.sr-studio-board__head{align-items:flex-start}.sr-studio-toolbar>*{flex:1 1 12rem}.sr-studio-file span{width:100%;justify-content:center}}
    `;
    document.head.appendChild(style);
  }

  function wrapStudioRoute(){
    const previous = root.renderFunctionalPanel || root.renderPanel;
    root.renderFunctionalPanel = function(route = 'diary'){
      if (route === 'studio') {
        renderStudio();
        return;
      }
      return previous?.(route);
    };
    root.renderPanel = root.renderFunctionalPanel;
    window.renderPanel = root.renderFunctionalPanel;
  }

  function initStudioMotherboard(){
    restoreSaved();
    seedStudioLanes();
    installStyles();
    bindStudioEvents();
    wrapStudioRoute();
  }

  root.initStudioMotherboard = initStudioMotherboard;
  root.renderStudioMotherboard = renderStudio;
})();
