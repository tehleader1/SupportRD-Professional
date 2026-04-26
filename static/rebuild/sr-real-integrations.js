/**
 * SupportRD — Pass 29 — Real Integrations
 * Auth0 OAuth · Shopify Storefront Cart API · Webcam Live Room
 * Camera Hair Analysis (free browser/local analysis) · TikTok Embed · Map Perks
 * All remote functions connect back to the account backbone.
 *
 * ENVIRONMENT VARIABLES (set on Render dashboard):
 *   AUTH0_DOMAIN           e.g. your-tenant.us.auth0.com
 *   AUTH0_CLIENT_ID        SPA client id from Auth0 dashboard
 *   AUTH0_AUDIENCE         API audience (optional, set if using RBAC)
 *   SHOPIFY_STORE_DOMAIN   e.g. your-store.myshopify.com
 *   SHOPIFY_STOREFRONT_TOKEN  public Storefront API access token
 *   SHOPIFY_LIVE_TIP_VARIANT_ID  optional Shopify variant id for Diary live guest tips
 *   SHOPIFY_LIVE_TIP_PRODUCT_URL optional Shopify product URL fallback for Diary live guest tips
 *
 * These are injected as window.SRConfig by the Render server (see
 * sr-config-inject.js pattern at the bottom of this file).
 * In dev you can set window.SRConfig manually or via a .env + Vite/WP.
 */
(function () {
  'use strict';

  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const cfg  = window.SRConfig || {};

  /* ─────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────── */
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(msg, type = 'info') {
    let el = document.getElementById('srToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'srToast';
      el.style.cssText = 'position:fixed;bottom:1.4rem;left:50%;transform:translateX(-50%);' +
        'background:#111;color:#fff;padding:.6rem 1.2rem;border-radius:8px;font-size:.85rem;' +
        'z-index:9999;transition:opacity .3s;pointer-events:none;max-width:90vw;text-align:center;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    if (type === 'error') el.style.background = '#c0392b';
    else if (type === 'success') el.style.background = '#27ae60';
    else el.style.background = '#111';
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 3400);
  }

  /* ─────────────────────────────────────────────
     1. AUTH0 REAL OAUTH (PKCE SPA FLOW)
     Uses Auth0 Universal Login — no password in your code.
     Docs: https://auth0.com/docs/quickstart/spa/vanillajs
  ───────────────────────────────────────────── */
  const AUTH = {
    domain:   cfg.AUTH0_DOMAIN   || '',
    clientId: cfg.AUTH0_CLIENT_ID || '',
    audience: cfg.AUTH0_AUDIENCE  || '',
    redirectUri: window.location.origin + '/',
    _token: null,
    _user:  null,

    _b64url(buf) {
      return btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    },

    async _sha256(plain) {
      const enc = new TextEncoder().encode(plain);
      return crypto.subtle.digest('SHA-256', enc);
    },

    async _pkce() {
      const verifier = this._b64url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = this._b64url(await this._sha256(verifier));
      return { verifier, challenge };
    },

    async login() {
      if (!this.domain || !this.clientId) {
        toast('Auth0 domain/clientId not configured. Set AUTH0_DOMAIN + AUTH0_CLIENT_ID on Render.', 'error');
        return;
      }
      const { verifier, challenge } = await this._pkce();
      sessionStorage.setItem('pkce_verifier', verifier);
      const state = this._b64url(crypto.getRandomValues(new Uint8Array(12)));
      sessionStorage.setItem('auth_state', state);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        scope: 'openid profile email',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        ...(this.audience ? { audience: this.audience } : {})
      });
      window.location.href = `https://${this.domain}/authorize?${params}`;
    },

    async handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code  = params.get('code');
      const state = params.get('state');
      if (!code || !this.domain || !this.clientId) return false;

      if (state !== sessionStorage.getItem('auth_state')) {
        toast('Auth state mismatch — possible CSRF.', 'error');
        return false;
      }
      const verifier = sessionStorage.getItem('pkce_verifier');
      try {
        const res = await fetch(`https://${this.domain}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: this.clientId,
            code_verifier: verifier,
            code,
            redirect_uri: this.redirectUri
          })
        });
        const data = await res.json();
        if (data.access_token) {
          this._token = data.access_token;
          sessionStorage.setItem('sr_access_token', data.access_token);
          if (data.id_token) {
            const payload = JSON.parse(atob(data.id_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
            this._user = { email: payload.email, name: payload.name || payload.nickname, picture: payload.picture, sub: payload.sub };
            sessionStorage.setItem('sr_user', JSON.stringify(this._user));
          }
          // sync to account backbone
          const ab = root.getAccountBackbone?.();
          if (ab && this._user) {
            ab.email    = this._user.email || ab.email;
            ab.username = this._user.name  || ab.username;
            ab.confirmed = true;
            root.patchAccountBackbone?.({}, ab);
            localStorage.setItem('srLoginPanelV27', JSON.stringify({ email: ab.email, username: ab.username, tier: ab.tier, confirmed: true }));
          }
          // clean URL
          window.history.replaceState({}, '', window.location.pathname);
          toast('Logged in successfully!', 'success');
          return true;
        }
      } catch (e) {
        toast('Auth0 token exchange failed: ' + e.message, 'error');
      }
      return false;
    },

    getToken() {
      return this._token || sessionStorage.getItem('sr_access_token') || '';
    },

    getUser() {
      if (this._user) return this._user;
      try { return JSON.parse(sessionStorage.getItem('sr_user') || 'null'); } catch { return null; }
    },

    logout() {
      sessionStorage.removeItem('sr_access_token');
      sessionStorage.removeItem('sr_user');
      this._token = null;
      this._user  = null;
      if (this.domain && this.clientId) {
        window.location.href = `https://${this.domain}/v2/logout?client_id=${this.clientId}&returnTo=${encodeURIComponent(window.location.origin)}`;
      } else {
        window.location.reload();
      }
    },

    isLoggedIn() {
      return !!this.getToken();
    }
  };

  // Auto-handle callback on load
  if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
    AUTH.handleCallback();
  }

  root.auth = AUTH;

  /* ─────────────────────────────────────────────
     2. SHOPIFY STOREFRONT CART API
     Real add-to-cart via Storefront API v2024-01.
     Docs: https://shopify.dev/docs/api/storefront
  ───────────────────────────────────────────── */
  const SHOPIFY = {
    domain: cfg.SHOPIFY_STORE_DOMAIN || '',
    token:  cfg.SHOPIFY_STOREFRONT_TOKEN || '',
    _cartId: null,

    get endpoint() {
      return `https://${this.domain}/api/2024-01/graphql.json`;
    },

    async _gql(query, variables = {}) {
      if (!this.domain || !this.token) throw new Error('Shopify not configured. Set SHOPIFY_STORE_DOMAIN + SHOPIFY_STOREFRONT_TOKEN on Render.');
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.token
        },
        body: JSON.stringify({ query, variables })
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      return json.data;
    },

    async createCart() {
      const data = await this._gql(`
        mutation cartCreate {
          cartCreate {
            cart { id checkoutUrl }
            userErrors { field message }
          }
        }
      `);
      const cart = data.cartCreate.cart;
      this._cartId = cart.id;
      localStorage.setItem('srShopifyCartId', cart.id);
      return cart;
    },

    async getOrCreateCart() {
      const stored = this._cartId || localStorage.getItem('srShopifyCartId');
      if (stored) {
        // validate it still exists
        try {
          const data = await this._gql(`query($id:ID!){ cart(id:$id){ id checkoutUrl } }`, { id: stored });
          if (data.cart) { this._cartId = stored; return data.cart; }
        } catch {}
      }
      return this.createCart();
    },

    async addToCart(variantId, quantity = 1) {
      const cart = await this.getOrCreateCart();
      const data = await this._gql(`
        mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { id checkoutUrl totalQuantity }
            userErrors { field message }
          }
        }
      `, {
        cartId: cart.id,
        lines: [{ merchandiseId: variantId, quantity }]
      });
      const updated = data.cartLinesAdd.cart;
      toast(`Added to cart! (${updated.totalQuantity} item${updated.totalQuantity !== 1 ? 's' : ''})`, 'success');
      this._renderCartBadge(updated.totalQuantity);
      return updated;
    },

    async goToCheckout() {
      const cart = await this.getOrCreateCart();
      window.open(cart.checkoutUrl, '_blank');
    },

    _renderCartBadge(count) {
      let badge = document.getElementById('srCartBadge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'srCartBadge';
        badge.style.cssText = 'position:fixed;top:1rem;right:1rem;background:#b19c7d;color:#fff;' +
          'border-radius:50px;padding:.3rem .85rem;font-weight:700;font-size:.85rem;cursor:pointer;z-index:9990;';
        badge.title = 'View Cart / Checkout';
        badge.addEventListener('click', () => this.goToCheckout());
        document.body.appendChild(badge);
      }
      badge.textContent = `🛒 ${count}`;
      badge.style.display = count > 0 ? '' : 'none';
    },

    // Wire up all [data-shopify-variant] buy buttons in the DOM
    wireAllBuyButtons() {
      document.querySelectorAll('[data-shopify-variant]').forEach(btn => {
        if (btn._shopifyWired) return;
        btn._shopifyWired = true;
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const vid = btn.dataset.shopifyVariant;
          const qty = parseInt(btn.dataset.shopifyQty || '1', 10);
          btn.disabled = true;
          btn.textContent = 'Adding…';
          try {
            await SHOPIFY.addToCart(vid, qty);
          } catch (err) {
            toast('Shopify error: ' + err.message, 'error');
          } finally {
            btn.disabled = false;
            btn.textContent = btn.dataset.shopifyLabel || 'Add to Cart';
          }
        });
      });
    }
  };

  root.shopify = SHOPIFY;

  /* ─────────────────────────────────────────────
     3. DIARY — LIVE WEBCAM ROOM
     Real getUserMedia webcam, live comments, Shopify guest tips
  ───────────────────────────────────────────── */
  const DIARY_LIVE = {
    _stream: null,
    _mediaRecorder: null,
    _chunks: [],

    async openWebcam(videoEl) {
      if (!videoEl) return;
      try {
        this._stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoEl.srcObject = this._stream;
        await videoEl.play();
        toast('Webcam live!', 'success');
        root.recordLiveRoomEvent?.({ type: 'webcam_open', at: new Date().toISOString() });
      } catch (e) {
        toast('Webcam error: ' + e.message, 'error');
      }
    },

    closeWebcam(videoEl) {
      if (this._stream) {
        this._stream.getTracks().forEach(t => t.stop());
        this._stream = null;
      }
      if (videoEl) videoEl.srcObject = null;
      root.recordLiveRoomEvent?.({ type: 'webcam_close', at: new Date().toISOString() });
    },

    startRecording() {
      if (!this._stream) { toast('Open webcam first.', 'error'); return; }
      this._chunks = [];
      this._mediaRecorder = new MediaRecorder(this._stream);
      this._mediaRecorder.ondataavailable = e => { if (e.data.size) this._chunks.push(e.data); };
      this._mediaRecorder.onstop = () => {
        const blob = new Blob(this._chunks, { type: 'video/webm' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `diary-live-${Date.now()}.webm`; a.click();
        root.recordLiveRoomEvent?.({ type: 'recording_saved', at: new Date().toISOString() });
        toast('Recording saved!', 'success');
      };
      this._mediaRecorder.start();
      toast('Recording started…');
    },

    stopRecording() {
      this._mediaRecorder?.stop();
    },

    /* Guest Shopify support/tip checkout.
       Preferred: set SHOPIFY_LIVE_TIP_VARIANT_ID to a Shopify product variant made for "Live Support / Tip".
       Fallback: set SHOPIFY_LIVE_TIP_PRODUCT_URL or use Support Full Product Line URL. */
    async openGuestTip(amount = '') {
      const variantId = cfg.SHOPIFY_LIVE_TIP_VARIANT_ID || cfg.SHOPIFY_TIP_VARIANT_ID || '';
      const productUrl = cfg.SHOPIFY_LIVE_TIP_PRODUCT_URL ||
        cfg.SHOPIFY_TIP_PRODUCT_URL ||
        'https://shop.supportrd.com/products/support-full-product-line';

      try {
        if (variantId && root.shopify?.addToCart) {
          await root.shopify.addToCart(variantId, 1);
          await root.shopify.goToCheckout();
          root.recordLivePayment?.({ source: 'shopify_cart', amount, variantId, at: new Date().toISOString() });
          toast('Guest support added through Shopify checkout.', 'success');
          return;
        }
      } catch (err) {
        toast('Shopify live support cart failed, opening product page.', 'error');
      }

      const url = amount ? `${productUrl}?support_amount=${encodeURIComponent(amount)}` : productUrl;
      window.open(url, '_blank');
      root.recordLivePayment?.({ source: 'shopify_product_link', amount, url, at: new Date().toISOString() });
    }
  };

  root.diaryLive = DIARY_LIVE;

  /* ─────────────────────────────────────────────
     4. PROFILE — CAMERA HAIR ANALYSIS
     Uses getUserMedia camera, captures frame,
     sends to free browser/canvas analysis,
     returns spoken hair analysis without API keys.
  ───────────────────────────────────────────── */
  const HAIR_ANALYSIS = {
    _stream: null,
    _stage: 'idle',   // idle | look-left | look-right | analyzing

    HAIR_CONDITIONS: ['Tangly', 'Oily', 'Damaged', 'Burned', 'Not Bouncy', 'Dry', 'Lack of Color'],

    async openCamera(videoEl) {
      try {
        this._stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        videoEl.srcObject = this._stream;
        await videoEl.play();
        this._stage = 'look-left';
        toast('Camera open — look LEFT for first capture.', 'info');
        return true;
      } catch (e) {
        toast('Camera error: ' + e.message, 'error');
        return false;
      }
    },

    captureFrame(videoEl, canvasEl) {
      canvasEl.width  = videoEl.videoWidth  || 640;
      canvasEl.height = videoEl.videoHeight || 480;
      const ctx = canvasEl.getContext('2d');
      ctx.drawImage(videoEl, 0, 0);
      return canvasEl.toDataURL('image/jpeg', 0.85).split(',')[1]; // base64
    },

    async runAnalysis(videoEl, canvasEl, onResult) {
      if (!this._stream) { toast('Open camera first.', 'error'); return; }

      // Capture look-left
      this._stage = 'look-left';
      toast('📸 Capturing LOOK LEFT…');
      await new Promise(r => setTimeout(r, 800));
      const leftB64  = this.captureFrame(videoEl, canvasEl);

      // Capture look-right
      this._stage = 'look-right';
      toast('📸 Now look RIGHT — capturing…');
      await new Promise(r => setTimeout(r, 1600));
      const rightB64 = this.captureFrame(videoEl, canvasEl);

      this._stage = 'analyzing';
      toast('🔍 Analyzing your hair…');

      try {
        const analysis = await this._runFreeLocalAnalysis(leftB64, rightB64);
        this._stage = 'idle';

        // Save to account backbone
        root.recordHairAnalysis?.({
          summary: analysis.summary,
          status:  analysis.conditions.join(', '),
          conditions: analysis.conditions,
          texture: analysis.texture,
          at: new Date().toISOString()
        });

        // Speak the result
        this._speak(analysis.spoken);

        if (onResult) onResult(analysis);
        return analysis;
      } catch (e) {
        this._stage = 'idle';
        toast('Hair analysis error: ' + e.message, 'error');
      }
    },

    async _runFreeLocalAnalysis(leftB64, rightB64) {
      const stats = await this._imageStats([leftB64, rightB64]);
      const conditions = [];
      if (stats.brightness < 92) conditions.push('Lack of Color');
      if (stats.contrast > 72) conditions.push('Dry');
      if (stats.edgeDensity > 0.18) conditions.push('Tangly');
      if (stats.warmth > 18) conditions.push('Oily');
      if (stats.dullness > 0.58) conditions.push('Not Bouncy');
      if (stats.damageScore > 0.62) conditions.push('Damaged');
      if (stats.brightness < 58 && stats.contrast > 90) conditions.push('Burned');

      const finalConditions = [...new Set(conditions)].slice(0, 4);
      if (!finalConditions.length) finalConditions.push('Healthy / Balanced');

      const texture = stats.edgeDensity > 0.22 ? 'coarse / curly-visible'
        : stats.edgeDensity > 0.12 ? 'medium'
        : 'fine / smooth-visible';

      const summary = `Free local scan detected ${finalConditions.join(', ')} indicators with ${texture} texture. This is a browser estimate, not a medical diagnosis.`;
      const spoken = `Your free hair scan is complete. I see ${finalConditions.join(', ')} indicators and ${texture} texture. I saved this to your Profile and account history.`;

      return { conditions: finalConditions, texture, summary, spoken, metrics: stats, engine: 'free-browser-canvas' };
    },

    async _imageStats(images) {
      const results = [];
      for (const b64 of images) results.push(await this._singleImageStats(b64));
      const avg = key => results.reduce((sum, item) => sum + item[key], 0) / Math.max(results.length, 1);
      const brightness = avg('brightness');
      const contrast = avg('contrast');
      const saturation = avg('saturation');
      const edgeDensity = avg('edgeDensity');
      const warmth = avg('warmth');
      const dullness = Math.max(0, Math.min(1, (120 - saturation) / 120));
      const damageScore = Math.max(0, Math.min(1, (contrast / 120) * 0.55 + edgeDensity * 1.4 + dullness * 0.25));
      return { brightness, contrast, saturation, edgeDensity, warmth, dullness, damageScore };
    },

    _singleImageStats(b64) {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const w = canvas.width = 96;
          const h = canvas.height = 96;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          let brightnessSum = 0, satSum = 0, warmSum = 0;
          const grays = [];
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const max = Math.max(r,g,b), min = Math.min(r,g,b);
            const bright = (r + g + b) / 3;
            brightnessSum += bright;
            satSum += max - min;
            warmSum += r - b;
            grays.push(bright);
          }
          const mean = brightnessSum / grays.length;
          const variance = grays.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / grays.length;
          let edges = 0;
          for (let y = 1; y < h; y++) {
            for (let x = 1; x < w; x++) {
              const i = y * w + x;
              const diff = Math.abs(grays[i] - grays[i-1]) + Math.abs(grays[i] - grays[i-w]);
              if (diff > 42) edges++;
            }
          }
          resolve({ brightness: mean, contrast: Math.sqrt(variance), saturation: satSum / grays.length, warmth: warmSum / grays.length, edgeDensity: edges / (w*h) });
        };
        img.onerror = () => resolve({ brightness: 110, contrast: 40, saturation: 55, warmth: 0, edgeDensity: 0.08 });
        img.src = `data:image/jpeg;base64,${b64}`;
      });
    },

    _speak(text) {
      if (!('speechSynthesis' in window) || !text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 1.05; u.volume = 1;
      window.speechSynthesis.speak(u);
    },

    closeCamera(videoEl) {
      this._stream?.getTracks().forEach(t => t.stop());
      this._stream = null;
      if (videoEl) videoEl.srcObject = null;
    }
  };

  root.hairAnalysis = HAIR_ANALYSIS;

  /* ─────────────────────────────────────────────
     5. STUDIO — MP3/M4A IMPORT·EXPORT + MOTHERBOARD
     Real Web Audio playback, waveform highlight, cut/delete, export
  ───────────────────────────────────────────── */
  const STUDIO = {
    _audioCtx: null,
    _buffer:   null,
    _source:   null,
    _fileName: '',
    _cutStart: 0,
    _cutEnd:   null,
    _playing:  false,

    _getCtx() {
      if (!this._audioCtx || this._audioCtx.state === 'closed') {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return this._audioCtx;
    },

    async importFile(file, canvasEl, onLoaded) {
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['mp3', 'm4a', 'wav', 'ogg', 'webm'].includes(ext)) {
        toast('Supported formats: mp3, m4a, wav, ogg, webm', 'error');
        return;
      }
      this._fileName = file.name;
      const ab = await file.arrayBuffer();
      try {
        const ctx = this._getCtx();
        this._buffer = await ctx.decodeAudioData(ab);
        this._cutStart = 0;
        this._cutEnd   = this._buffer.duration;
        this._drawWaveform(canvasEl);
        toast(`Loaded: ${file.name} (${this._buffer.duration.toFixed(1)}s)`, 'success');
        root.recordStudioImport?.({ name: file.name, duration: this._buffer.duration, at: new Date().toISOString() });
        if (onLoaded) onLoaded(this._buffer);
      } catch (e) {
        toast('Audio decode error: ' + e.message, 'error');
      }
    },

    _drawWaveform(canvasEl, highlightStart, highlightEnd) {
      if (!canvasEl || !this._buffer) return;
      const W = canvasEl.width  = canvasEl.offsetWidth  || 640;
      const H = canvasEl.height = canvasEl.offsetHeight || 120;
      const ctx = canvasEl.getContext('2d');
      const data = this._buffer.getChannelData(0);
      const step = Math.ceil(data.length / W);
      const mid  = H / 2;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, W, H);

      const dur = this._buffer.duration;
      const hS  = highlightStart ?? this._cutStart;
      const hE  = highlightEnd   ?? this._cutEnd ?? dur;

      for (let x = 0; x < W; x++) {
        let min = 0, max = 0;
        for (let i = 0; i < step; i++) {
          const v = data[x * step + i] || 0;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const timeAtX = (x / W) * dur;
        const inHighlight = timeAtX >= hS && timeAtX <= hE;
        ctx.strokeStyle = inHighlight ? '#b19c7d' : '#444';
        ctx.lineWidth   = inHighlight ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x, mid + min * mid);
        ctx.lineTo(x, mid + max * mid);
        ctx.stroke();
      }

      // Draw cut markers
      const sX = (hS / dur) * W;
      const eX = (hE / dur) * W;
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(sX, 0); ctx.lineTo(sX, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(eX, 0); ctx.lineTo(eX, H); ctx.stroke();
      ctx.setLineDash([]);
    },

    setCutRegion(startRatio, endRatio) {
      if (!this._buffer) return;
      const dur = this._buffer.duration;
      this._cutStart = Math.max(0, startRatio * dur);
      this._cutEnd   = Math.min(dur, endRatio * dur);
    },

    play(startOffset) {
      if (!this._buffer) { toast('Import audio first.', 'error'); return; }
      this.stop();
      const ctx = this._getCtx();
      const src = ctx.createBufferSource();
      src.buffer = this._buffer;
      src.connect(ctx.destination);
      const offset = startOffset ?? this._cutStart;
      src.start(0, offset, (this._cutEnd || this._buffer.duration) - offset);
      this._source  = src;
      this._playing = true;
      src.onended = () => { this._playing = false; };
      toast('▶ Playing…');
    },

    stop() {
      try { this._source?.stop(); } catch {}
      this._source  = null;
      this._playing = false;
    },

    deleteCutRegion(canvasEl) {
      if (!this._buffer) return;
      const sr  = this._buffer.sampleRate;
      const ch  = this._buffer.numberOfChannels;
      const s   = Math.floor(this._cutStart * sr);
      const e   = Math.floor((this._cutEnd || this._buffer.duration) * sr);
      const len = this._buffer.length - (e - s);
      if (len <= 0) { toast('Nothing to keep after cut.', 'error'); return; }
      const ctx     = this._getCtx();
      const newBuf  = ctx.createBuffer(ch, len, sr);
      for (let c = 0; c < ch; c++) {
        const old  = this._buffer.getChannelData(c);
        const newD = newBuf.getChannelData(c);
        newD.set(old.subarray(0, s), 0);
        newD.set(old.subarray(e), s);
      }
      this._buffer   = newBuf;
      this._cutStart = 0;
      this._cutEnd   = newBuf.duration;
      this._drawWaveform(canvasEl);
      toast('Region deleted.', 'success');
    },

    async exportMp3(fileName, onExport) {
      /* Export as WAV (universal browser). MP3 encoding needs lamejs.
         We export WAV and let the user rename. Include lamejs CDN for real MP3. */
      if (!this._buffer) { toast('Nothing to export.', 'error'); return; }
      this.stop();
      const start  = Math.floor(this._cutStart * this._buffer.sampleRate);
      const end    = Math.floor((this._cutEnd || this._buffer.duration) * this._buffer.sampleRate);
      const len    = end - start;
      const ctx    = this._getCtx();
      const out    = ctx.createBuffer(this._buffer.numberOfChannels, len, this._buffer.sampleRate);
      for (let c = 0; c < this._buffer.numberOfChannels; c++) {
        out.getChannelData(c).set(this._buffer.getChannelData(c).subarray(start, end));
      }
      const wav  = this._bufferToWav(out);
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const name = (fileName || this._fileName.replace(/\.[^.]+$/, '') || 'studio-export') + '.wav';
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      const exportRecord = { name, duration: out.duration, at: new Date().toISOString() };
      root.recordStudioExport?.(exportRecord);
      toast(`Exported: ${name}`, 'success');
      if (onExport) onExport(exportRecord);
    },

    _bufferToWav(buffer) {
      const numCh = buffer.numberOfChannels;
      const sr    = buffer.sampleRate;
      const len   = buffer.length * numCh * 2;
      const ab    = new ArrayBuffer(44 + len);
      const view  = new DataView(ab);
      const write = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
      write(0, 'RIFF'); view.setUint32(4, 36 + len, true);
      write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); view.setUint16(22, numCh, true);
      view.setUint32(24, sr, true); view.setUint32(28, sr * numCh * 2, true);
      view.setUint16(32, numCh * 2, true); view.setUint16(34, 16, true);
      write(36, 'data'); view.setUint32(40, len, true);
      let offset = 44;
      for (let i = 0; i < buffer.length; i++) {
        for (let c = 0; c < numCh; c++) {
          const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          offset += 2;
        }
      }
      return ab;
    }
  };

  root.studio = STUDIO;

  /* ─────────────────────────────────────────────
     6. STUDIO MOTHERBOARD UI
     Clickable track lanes with highlight, cut, delete, playback
  ───────────────────────────────────────────── */
  function buildMotherboard(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="sr-motherboard">
        <div class="sr-mb-toolbar">
          <button class="sr-mini-btn" id="mbImportBtn">📂 Import MP3/M4A</button>
          <input type="file" id="mbFileInput" accept="audio/mp3,audio/m4a,.mp3,.m4a,audio/*" style="display:none">
          <button class="sr-mini-btn" id="mbPlayBtn">▶ Play</button>
          <button class="sr-mini-btn" id="mbStopBtn">⏹ Stop</button>
          <button class="sr-mini-btn" id="mbDeleteBtn">✂ Delete Region</button>
          <button class="sr-buy-btn" id="mbExportBtn">⬇ Export</button>
        </div>
        <canvas id="mbWaveform" style="width:100%;height:120px;border-radius:8px;cursor:crosshair;display:block;"></canvas>
        <div class="sr-mb-tracks" id="mbTracks">
          ${['Track 1 — Vocals', 'Track 2 — Beats', 'Track 3 — Adlib', 'Track 4 — FX'].map((t, i) =>
            `<div class="sr-mb-track" data-track="${i}" style="background:${['#1a1a2e','#16213e','#0f3460','#533483'][i]};padding:.5rem 1rem;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:.75rem;margin-top:.4rem;">
              <span style="color:#b19c7d;font-weight:700;min-width:150px;">${t}</span>
              <div class="sr-mb-track-bar" style="flex:1;height:28px;background:#222;border-radius:4px;position:relative;">
                <div class="sr-mb-track-fill" style="position:absolute;left:0;top:0;bottom:0;width:0%;background:#b19c7d44;transition:width .2s;"></div>
              </div>
            </div>`
          ).join('')}
        </div>
        <div class="sr-mb-status" id="mbStatus" style="font-size:.8rem;color:#888;margin-top:.5rem;min-height:1.4em;"></div>
      </div>
    `;

    const canvas   = document.getElementById('mbWaveform');
    const fileInput = document.getElementById('mbFileInput');
    const status   = document.getElementById('mbStatus');

    // Import
    document.getElementById('mbImportBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async e => {
      const f = e.target.files[0];
      if (!f) return;
      status.textContent = 'Loading…';
      await root.studio.importFile(f, canvas, buf => {
        status.textContent = `Loaded: ${f.name} — ${buf.duration.toFixed(1)}s — drag waveform to set cut region`;
      });
    });

    // Waveform click/drag for cut region
    let dragStart = null;
    canvas.addEventListener('mousedown', e => {
      dragStart = e.offsetX / canvas.offsetWidth;
    });
    canvas.addEventListener('mousemove', e => {
      if (dragStart === null) return;
      const end = e.offsetX / canvas.offsetWidth;
      const s = Math.min(dragStart, end);
      const en = Math.max(dragStart, end);
      root.studio.setCutRegion(s, en);
      root.studio._drawWaveform(canvas);
    });
    canvas.addEventListener('mouseup', () => { dragStart = null; });

    // Playback
    document.getElementById('mbPlayBtn').addEventListener('click', () => {
      root.studio.play();
      // animate tracks
      document.querySelectorAll('.sr-mb-track-fill').forEach((bar, i) => {
        bar.style.width = `${[85, 60, 45, 30][i]}%`;
      });
    });
    document.getElementById('mbStopBtn').addEventListener('click', () => {
      root.studio.stop();
      document.querySelectorAll('.sr-mb-track-fill').forEach(bar => bar.style.width = '0%');
    });

    // Delete region
    document.getElementById('mbDeleteBtn').addEventListener('click', () => {
      root.studio.deleteCutRegion(canvas);
    });

    // Export
    document.getElementById('mbExportBtn').addEventListener('click', async () => {
      const name = prompt('Export file name (no extension):', 'studio-export') || 'studio-export';
      await root.studio.exportMp3(name);
    });

    // Track click → highlight track and set playback from that region
    document.querySelectorAll('.sr-mb-track').forEach(track => {
      track.addEventListener('click', () => {
        document.querySelectorAll('.sr-mb-track').forEach(t => t.style.outline = '');
        track.style.outline = '2px solid #b19c7d';
        status.textContent = `Selected: ${track.querySelector('span').textContent}`;
      });
    });
  }

  root.buildMotherboard = buildMotherboard;

  /* ─────────────────────────────────────────────
     7. FAQ — TIKTOK EMBED + DEVELOPER FEED + RATINGS
  ───────────────────────────────────────────── */
  const FAQ_LOUNGE = {
    /* Embed a real TikTok video (10s reel).
       Pass the TikTok video URL or ID.
       TikTok oEmbed API: https://www.tiktok.com/oembed?url=...
       For a real hair reel set cfg.TIKTOK_REEL_URL */
    renderTikTokReel(container) {
      const url = cfg.TIKTOK_REEL_URL || '';
      if (!container) return;
      if (!url) {
        container.innerHTML = `
          <div style="background:#111;border-radius:12px;padding:2rem;text-align:center;color:#888;">
            <p>🎵 Set <strong>TIKTOK_REEL_URL</strong> on Render to embed your 10-second hair reel.</p>
            <p style="font-size:.8rem">Example: https://www.tiktok.com/@yourhandle/video/123456789</p>
          </div>`;
        return;
      }
      // TikTok blockquote embed
      const videoId = url.split('/video/')[1]?.split('?')[0] || '';
      container.innerHTML = `
        <blockquote class="tiktok-embed" cite="${esc(url)}" data-video-id="${esc(videoId)}"
          style="max-width:325px;min-width:325px;border-left:0;margin:0 auto;">
          <section><a href="${esc(url)}" target="_blank" rel="noopener">View on TikTok</a></section>
        </blockquote>`;
      // Load TikTok embed script
      if (!document.getElementById('tiktok-embed-script')) {
        const s = document.createElement('script');
        s.id  = 'tiktok-embed-script';
        s.src = 'https://www.tiktok.com/embed.js';
        s.async = true;
        document.body.appendChild(s);
      } else if (window.tiktok) {
        window.tiktok?.render?.();
      }
    },

    postToDeveloperFeed(text, rating, author) {
      if (!text?.trim()) { toast('Enter a comment first.', 'error'); return; }
      const item = { text, rating: parseInt(rating) || 0, author: author || 'Dev', at: new Date().toISOString() };
      root.recordDeveloperFeed?.(item);
      root.recordFaqRating?.({ rating: item.rating, at: item.at });
      toast('Posted to Developer Feed!', 'success');
      return item;
    },

    renderFeedItems(container) {
      if (!container) return;
      const account = root.getAccountBackbone?.();
      const feed = account?.faq?.developerFeed || [];
      if (!feed.length) { container.innerHTML = '<p style="color:#888">No developer feed posts yet.</p>'; return; }
      container.innerHTML = feed.slice(0, 20).map(item => `
        <div style="border-bottom:1px solid #222;padding:.6rem 0;">
          <strong style="color:#b19c7d">${esc(item.author || 'Dev')}</strong>
          ${'⭐'.repeat(Math.max(0, Math.min(5, item.rating || 0)))}
          <p style="margin:.25rem 0;color:#ddd;">${esc(item.text)}</p>
          <small style="color:#666">${esc(item.at?.slice(0, 10) || '')}</small>
        </div>
      `).join('');
    }
  };

  root.faqLounge = FAQ_LOUNGE;

  /* ─────────────────────────────────────────────
     8. MAP PERKS — ACCOUNT-CONNECTED
     Map choice + perk rewards connect to backbone
  ───────────────────────────────────────────── */
  const MAP_PERKS = {
    MAPS: {
      'Wellness Map':    { perk: 'Free hair mask sample', icon: '🌿' },
      'Studio Map':     { perk: '10% off next studio export order', icon: '🎙' },
      'Market Map':     { perk: 'Market signal preview (1 free)', icon: '📊' },
      'Diary Map':      { perk: 'Live room guest pass', icon: '📹' },
      'Premium Map':    { perk: 'Priority ARIA/Jake response', icon: '⭐' }
    },

    chooseMap(mapName, container) {
      const entry = this.MAPS[mapName];
      if (!entry) { toast('Unknown map.', 'error'); return; }
      root.recordMapChoice?.(mapName, entry.perk);
      toast(`Map: ${entry.icon} ${mapName} — Perk: ${entry.perk}`, 'success');
      this.renderPerks(container);
    },

    renderPerks(container) {
      if (!container) return;
      const account = root.getAccountBackbone?.();
      const perks   = account?.mapChange?.perks || [];
      const recent  = account?.mapChange?.recentMap || '';
      container.innerHTML = `
        <div style="margin-bottom:.75rem;">
          <strong style="color:#b19c7d">Current Map:</strong> ${esc(recent || 'None selected')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.75rem;margin-bottom:1rem;">
          ${Object.entries(this.MAPS).map(([name, info]) => `
            <button class="sr-mini-btn" style="text-align:left;${recent === name ? 'outline:2px solid #b19c7d;' : ''}"
              onclick="window.SupportRDRebuild.mapPerks.chooseMap('${esc(name)}', document.getElementById('srMapPerksHistory'))">
              ${esc(info.icon)} <strong>${esc(name)}</strong><br>
              <small style="color:#999">${esc(info.perk)}</small>
            </button>
          `).join('')}
        </div>
        <div id="srMapPerksHistory">
          ${perks.length ? `<strong style="color:#888">Perk History</strong>` +
            perks.slice(0, 10).map(p => `
              <div style="border-bottom:1px solid #1a1a1a;padding:.4rem 0;font-size:.85rem;">
                <span style="color:#b19c7d">${esc(p.map)}</span> — ${esc(p.perk)}
                <small style="color:#555;display:block">${esc(p.at?.slice(0, 10) || '')}</small>
              </div>`).join('') :
            '<p style="color:#666;font-size:.85rem">No perk history yet. Choose a map!</p>'}
        </div>`;
    }
  };

  root.mapPerks = MAP_PERKS;

  /* ─────────────────────────────────────────────
     9. MARKET LASER — LINKED ACCOUNT + PAID SIGNALS
  ───────────────────────────────────────────── */
  const MARKET_LASER = {
    MARKET_URL: 'https://market-do8p.onrender.com/',

    link(email, paid) {
      root.linkMarketAccount?.(email, paid);
      toast(paid
        ? '✅ $25,000 Live Signals account linked!'
        : `Market account linked: ${email}`, 'success');
    },

    openMarket() {
      window.open(this.MARKET_URL, '_blank', 'noopener');
      root.recordLiveRoomEvent?.({ type: 'market_open', at: new Date().toISOString() });
    },

    renderStatus(container) {
      if (!container) return;
      const account = root.getAccountBackbone?.();
      const m = account?.market || {};
      container.innerHTML = `
        <div style="padding:.75rem;background:#0d0d0d;border-radius:10px;">
          <p><strong style="color:#b19c7d">Market Link:</strong> ${m.linked ? '✅ Linked' : '❌ Not linked'}</p>
          <p><strong style="color:#b19c7d">Email:</strong> ${esc(m.loginEmail || '—')}</p>
          <p><strong style="color:#b19c7d">Signals Tier:</strong>
            ${m.paid
              ? '<span style="color:#27ae60">$25,000 Live Signals — ACTIVE</span>'
              : '<span style="color:#888">Pending — $25,000 to activate</span>'}
          </p>
          <p><strong style="color:#b19c7d">URL:</strong>
            <a href="${esc(this.MARKET_URL)}" target="_blank" rel="noopener" style="color:#b19c7d">
              ${esc(this.MARKET_URL)}
            </a>
          </p>
        </div>`;
    }
  };

  root.marketLaser = MARKET_LASER;

  /* ─────────────────────────────────────────────
     10. PROFILE — HAIR ANALYSIS ROOM UI BUILDER
  ───────────────────────────────────────────── */
  function buildHairAnalysisRoom(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="sr-room-grid">
        <article class="sr-room-card">
          <h3>Open Camera — Hair Analysis</h3>
          <video id="hairVideo" autoplay muted playsinline style="width:100%;border-radius:8px;background:#000;max-height:220px;"></video>
          <canvas id="hairCanvas" style="display:none;"></canvas>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;">
            <button class="sr-mini-btn" id="hairOpenBtn">📷 Open Camera</button>
            <button class="sr-buy-btn" id="hairAnalyzeBtn">🔍 Analyze Hair</button>
            <button class="sr-mini-btn" id="hairCloseBtn">✖ Close</button>
          </div>
          <div id="hairAnalysisResult" style="margin-top:.75rem;min-height:2rem;font-size:.9rem;color:#b19c7d;"></div>
        </article>
        <article class="sr-room-card">
          <h3>Confirmed Hair Status</h3>
          <div id="hairConfirmedStatus" style="padding:.75rem;background:#0d0d0d;border-radius:8px;"></div>
          <h3 style="margin-top:1rem;">Hair Analysis History</h3>
          <div id="hairHistory" style="max-height:220px;overflow-y:auto;"></div>
        </article>
        <article class="sr-room-card">
          <h3>Optional Hair Profile Picture</h3>
          <input type="file" id="hairProfilePic" accept="image/*" style="margin-bottom:.5rem;">
          <div id="hairProfilePicPreview" style="max-width:160px;border-radius:8px;overflow:hidden;"></div>
          <button class="sr-mini-btn" id="hairProfilePicSave" style="margin-top:.5rem;">💾 Save Profile Picture</button>
        </article>
      </div>
    `;

    const video    = document.getElementById('hairVideo');
    const canvas   = document.getElementById('hairCanvas');
    const result   = document.getElementById('hairAnalysisResult');
    const status   = document.getElementById('hairConfirmedStatus');
    const history  = document.getElementById('hairHistory');

    function refreshStatus() {
      const account = root.getAccountBackbone?.();
      const analyses = account?.profile?.hairAnalyses || [];
      status.innerHTML = account?.profile?.confirmedHairStatus
        ? `<strong style="color:#27ae60">✅ ${esc(account.profile.confirmedHairStatus)}</strong>`
        : '<span style="color:#888">No confirmed status yet.</span>';
      history.innerHTML = analyses.slice(0, 10).map(a => `
        <div style="border-bottom:1px solid #1a1a1a;padding:.4rem 0;font-size:.82rem;">
          <strong style="color:#b19c7d">${esc(a.status || '')}</strong>
          <p style="margin:.2rem 0;color:#ccc;">${esc(a.summary || '')}</p>
          <small style="color:#555">${esc(a.at?.slice(0, 10) || '')}</small>
        </div>`).join('') || '<p style="color:#666;font-size:.85rem">No analyses yet.</p>';
    }
    refreshStatus();

    document.getElementById('hairOpenBtn').addEventListener('click', () => {
      root.hairAnalysis.openCamera(video);
    });

    document.getElementById('hairAnalyzeBtn').addEventListener('click', async () => {
      result.textContent = 'Analyzing…';
      const analysis = await root.hairAnalysis.runAnalysis(video, canvas, a => {
        result.innerHTML = `
          <strong>Texture:</strong> ${esc(a.texture)}<br>
          <strong>Conditions:</strong> ${esc((a.conditions || []).join(', '))}<br>
          <strong>Summary:</strong> ${esc(a.summary)}`;
        refreshStatus();
      });
    });

    document.getElementById('hairCloseBtn').addEventListener('click', () => {
      root.hairAnalysis.closeCamera(video);
    });

    // Profile picture
    const picInput   = document.getElementById('hairProfilePic');
    const picPreview = document.getElementById('hairProfilePicPreview');
    picInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        picPreview.innerHTML = `<img src="${esc(ev.target.result)}" style="width:100%;border-radius:8px;">`;
      };
      reader.readAsDataURL(f);
    });
    document.getElementById('hairProfilePicSave').addEventListener('click', () => {
      const img = picPreview.querySelector('img');
      if (!img) { toast('Choose a photo first.', 'error'); return; }
      root.recordProfileImage?.(img.src);
      toast('Profile picture saved!', 'success');
    });
  }

  root.buildHairAnalysisRoom = buildHairAnalysisRoom;

  /* ─────────────────────────────────────────────
     11. DIARY LIVE ROOM UI BUILDER
  ───────────────────────────────────────────── */
  function buildDiaryLiveRoom(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="sr-room-grid">
        <article class="sr-room-card sr-live-room">
          <h3>📹 Live Webcam Room</h3>
          <div class="sr-live-badge">LIVE</div>
          <video id="diaryVideo" autoplay muted playsinline style="width:100%;border-radius:8px;background:#000;max-height:200px;"></video>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;">
            <button class="sr-mini-btn" id="diaryOpenCam">📷 Open Webcam</button>
            <button class="sr-mini-btn" id="diaryRecord">⏺ Record</button>
            <button class="sr-mini-btn" id="diaryStopRec">⏹ Stop & Save</button>
            <button class="sr-mini-btn" id="diaryCloseCam">✖ Close</button>
          </div>
        </article>
        <article class="sr-room-card">
          <h3>💬 Live Comments</h3>
          <div id="diaryComments" style="max-height:180px;overflow-y:auto;margin-bottom:.5rem;"></div>
          <input id="diaryCommentName" placeholder="Your name" style="width:100%;margin-bottom:.3rem;">
          <textarea id="diaryCommentText" placeholder="Write a comment…" rows="2" style="width:100%;resize:vertical;"></textarea>
          <button class="sr-buy-btn" id="diaryCommentPost" style="margin-top:.3rem;">Post Comment</button>
        </article>
        <article class="sr-room-card">
          <h3>💸 Guest Tip / Support</h3>
          <p style="font-size:.85rem;color:#888">Send real money to the live streamer via Shopify.</p>
          <input id="diaryTipAmount" type="number" min="1" step="1" placeholder="Amount ($)" style="width:100%;margin-bottom:.5rem;">
          <button class="sr-buy-btn" id="diaryTipBtn">💳 Send Tip (Shopify)</button>
          <div id="diaryPaymentHistory" style="margin-top:.75rem;max-height:140px;overflow-y:auto;"></div>
        </article>
        <article class="sr-room-card">
          <h3>🤖 Aria/Jake History</h3>
          <div id="diaryAssistantHistory" style="max-height:200px;overflow-y:auto;"></div>
          <button class="sr-mini-btn" style="margin-top:.5rem;" onclick="window.SupportRDRebuild?.navigateTo?.('aria')">🎙 Hands-Free ARIA</button>
        </article>
      </div>
    `;

    const diaryVideo = document.getElementById('diaryVideo');

    function refreshDiaryHistory() {
      const account = root.getAccountBackbone?.();
      const comments = account?.diary?.liveRoomEvents?.filter(e => e.comment) || [];
      const payments = account?.diary?.livePayments || [];
      const assistH  = account?.diary?.assistantHistory || [];

      const commentsEl = document.getElementById('diaryComments');
      if (commentsEl) commentsEl.innerHTML = comments.slice(0, 20).map(c =>
        `<div style="border-bottom:1px solid #1a1a1a;padding:.3rem 0;font-size:.85rem;"><strong style="color:#b19c7d">${esc(c.name)}</strong><p style="margin:.1rem 0">${esc(c.comment)}</p><small style="color:#555">${esc(c.at?.slice(0,10)||'')}</small></div>`
      ).join('') || '<p style="color:#666;font-size:.83rem">No comments yet.</p>';

      const payEl = document.getElementById('diaryPaymentHistory');
      if (payEl) payEl.innerHTML = payments.slice(0, 10).map(p =>
        `<div style="font-size:.83rem;border-bottom:1px solid #1a1a1a;padding:.25rem 0;"><strong style="color:#27ae60">$${esc(p.amount||'?')}</strong> — ${esc(p.source||'')}<small style="display:block;color:#555">${esc(p.at?.slice(0,10)||'')}</small></div>`
      ).join('') || '<p style="color:#666;font-size:.83rem">No tips yet.</p>';

      const ahEl = document.getElementById('diaryAssistantHistory');
      if (ahEl) ahEl.innerHTML = assistH.slice(0, 8).map(h =>
        `<div style="border-bottom:1px solid #1a1a1a;padding:.3rem 0;font-size:.83rem;"><strong style="color:#b19c7d">${esc(h.assistant)}</strong>: ${esc(h.transcript)}<p style="margin:.1rem 0;color:#aaa;">${esc(h.reply)}</p></div>`
      ).join('') || '<p style="color:#666;font-size:.83rem">No assistant history yet.</p>';
    }
    refreshDiaryHistory();

    document.getElementById('diaryOpenCam').addEventListener('click', () => root.diaryLive.openWebcam(diaryVideo));
    document.getElementById('diaryRecord').addEventListener('click', () => root.diaryLive.startRecording());
    document.getElementById('diaryStopRec').addEventListener('click', () => root.diaryLive.stopRecording());
    document.getElementById('diaryCloseCam').addEventListener('click', () => root.diaryLive.closeWebcam(diaryVideo));

    document.getElementById('diaryCommentPost').addEventListener('click', () => {
      const name = document.getElementById('diaryCommentName').value.trim() || 'Guest';
      const text = document.getElementById('diaryCommentText').value.trim();
      if (!text) { toast('Write a comment first.', 'error'); return; }
      root.recordLiveRoomEvent?.({ type: 'comment', name, comment: text, at: new Date().toISOString() });
      document.getElementById('diaryCommentText').value = '';
      toast('Comment posted!', 'success');
      refreshDiaryHistory();
    });

    document.getElementById('diaryTipBtn').addEventListener('click', () => {
      const amount = document.getElementById('diaryTipAmount').value;
      root.diaryLive.openGuestTip(amount);
      refreshDiaryHistory();
    });
  }

  root.buildDiaryLiveRoom = buildDiaryLiveRoom;

  /* ─────────────────────────────────────────────
     12. INIT — wire everything on DOMContentLoaded
  ───────────────────────────────────────────── */
  function initRealIntegrations() {
    // Auth0 login/logout buttons
    document.querySelectorAll('[data-auth0-login]').forEach(btn => {
      btn.addEventListener('click', () => root.auth.login());
    });
    document.querySelectorAll('[data-auth0-logout]').forEach(btn => {
      btn.addEventListener('click', () => root.auth.logout());
    });

    // Shopify buy buttons
    SHOPIFY.wireAllBuyButtons();

    // Update auth UI state
    const user = root.auth.getUser();
    if (user) {
      document.querySelectorAll('[data-auth-name]').forEach(el => { el.textContent = user.name || user.email; });
      document.querySelectorAll('[data-auth-email]').forEach(el => { el.textContent = user.email; });
    }

    // Wire FAQ developer feed if present
    const faqPostBtn = document.getElementById('srFaqDevPostBtn');
    if (faqPostBtn) {
      faqPostBtn.addEventListener('click', () => {
        const text   = document.getElementById('srFaqDevText')?.value;
        const rating = document.getElementById('srFaqRating')?.value;
        const author = root.auth.getUser()?.name || 'Dev';
        const item   = root.faqLounge.postToDeveloperFeed(text, rating, author);
        if (item) {
          root.faqLounge.renderFeedItems(document.getElementById('srFaqFeedList'));
          if (document.getElementById('srFaqDevText')) document.getElementById('srFaqDevText').value = '';
        }
      });
    }

    // TikTok reel
    const reelContainer = document.getElementById('srTikTokReelContainer');
    if (reelContainer) root.faqLounge.renderTikTokReel(reelContainer);

    // Market status
    const marketStatus = document.getElementById('srMarketStatus');
    if (marketStatus) root.marketLaser.renderStatus(marketStatus);

    // Map perks
    const mapPerksContainer = document.getElementById('srMapPerksContainer');
    if (mapPerksContainer) root.mapPerks.renderPerks(mapPerksContainer);

    // Motherboard
    const mbContainer = document.getElementById('srMotherboardContainer');
    if (mbContainer) buildMotherboard(mbContainer);

    // Hair analysis room
    const hairContainer = document.getElementById('srHairAnalysisRoom');
    if (hairContainer) buildHairAnalysisRoom(hairContainer);

    // Diary live room
    const diaryContainer = document.getElementById('srDiaryLiveRoom');
    if (diaryContainer) buildDiaryLiveRoom(diaryContainer);

    // Observe DOM for dynamically injected panels (functional surfaces re-render)
    const observer = new MutationObserver(() => {
      SHOPIFY.wireAllBuyButtons();
      const mb = document.getElementById('srMotherboardContainer');
      if (mb && !mb._wired) { mb._wired = true; buildMotherboard(mb); }
      const hair = document.getElementById('srHairAnalysisRoom');
      if (hair && !hair._wired) { hair._wired = true; buildHairAnalysisRoom(hair); }
      const diary = document.getElementById('srDiaryLiveRoom');
      if (diary && !diary._wired) { diary._wired = true; buildDiaryLiveRoom(diary); }
      const tt = document.getElementById('srTikTokReelContainer');
      if (tt && !tt._wired) { tt._wired = true; root.faqLounge.renderTikTokReel(tt); }
      const ms = document.getElementById('srMarketStatus');
      if (ms && !ms._wired) { ms._wired = true; root.marketLaser.renderStatus(ms); }
      const mp = document.getElementById('srMapPerksContainer');
      if (mp && !mp._wired) { mp._wired = true; root.mapPerks.renderPerks(mp); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  root.initRealIntegrations = initRealIntegrations;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRealIntegrations);
  } else {
    initRealIntegrations();
  }

})();

/*
═══════════════════════════════════════════════════════════════
  RENDER SERVER — sr-config-inject snippet

  You still inject public Auth0 + Shopify config into index.html.
  No Shopify variable is needed.
  No free local browser/Free Local key is needed for Pass 30 hair analysis.

  app.get('/', (req, res) => {
    const html = fs.readFileSync('./static/index.html', 'utf8');
    const config = JSON.stringify({
      AUTH0_DOMAIN:                 process.env.AUTH0_DOMAIN || '',
      AUTH0_CLIENT_ID:              process.env.AUTH0_CLIENT_ID || '',
      AUTH0_AUDIENCE:               process.env.AUTH0_AUDIENCE || '',
      SHOPIFY_STORE_DOMAIN:         process.env.SHOPIFY_STORE_DOMAIN || '',
      SHOPIFY_STOREFRONT_TOKEN:     process.env.SHOPIFY_STOREFRONT_TOKEN || '',
      SHOPIFY_LIVE_TIP_VARIANT_ID:  process.env.SHOPIFY_LIVE_TIP_VARIANT_ID || '',
      SHOPIFY_LIVE_TIP_PRODUCT_URL: process.env.SHOPIFY_LIVE_TIP_PRODUCT_URL || '',
      TIKTOK_REEL_URL:              process.env.TIKTOK_REEL_URL || '',
    });
    const injected = html.replace('</head>', `<script>window.SRConfig=${config};</script></head>`);
    res.send(injected);
  });

  Hair analysis is now free/local in the browser using camera frames + canvas metrics.
  It saves the spoken result and confirmed hair status back to account history.
═══════════════════════════════════════════════════════════════
*/
