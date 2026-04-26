(function(){
  function installPanelExecutionFix(){
    const root = window.SupportRDRebuild = window.SupportRDRebuild || {};

    function esc(value){
      return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function productCard(product){
      return `
        <article class="sr-product-card">
          <img src="${esc(product.img)}" alt="${esc(product.title)}" loading="lazy" onerror="this.style.display='none'">
          <span>${esc(product.tag || 'Product')} · ${esc(product.price || 'Shop')}</span>
          <h3>${esc(product.title)}</h3>
          <p>${esc(product.desc || '')}</p>
          <a class="sr-buy-btn" href="${esc(product.href || '#')}" target="_blank" rel="noopener" data-product="${esc(product.id || '')}">Buy / View ${esc(product.title)}</a>
        </article>
      `;
    }

    function renderCatalogRoom(){
      const stage = document.querySelector('#remoteStage');
      if (!stage) return;
      const assets = root.assets || {};
      const products = Array.isArray(root.products) ? root.products : [];
      const packages = Array.isArray(root.packages) ? root.packages : [];
      document.querySelectorAll('[data-route]').forEach(btn => btn.classList.toggle('active', btn.dataset.route === 'catalog'));
      stage.innerHTML = `
        <section class="sr-panel sr-functional-panel" data-panel="catalog">
          <div class="sr-panel-media sr-functional-media" style="background-image:url('${esc(assets.productFamily || '')}')"></div>
          <div class="sr-panel-copy sr-functional-copy">
            <span>Purchase lane</span>
            <h2>Catalog / Payments</h2>
            <p>SupportRD product and digital package checkout. Buy buttons open Shopify product pages, and configured Shopify cart variants can move into checkout.</p>
            <div class="sr-room-grid">
              <article class="sr-room-card" style="grid-column:1/-1">
                <h3>Digital Packages</h3>
                <div class="sr-product-grid">
                  ${packages.map(productCard).join('')}
                </div>
              </article>
              <article class="sr-room-card" style="grid-column:1/-1">
                <h3>Hair Products</h3>
                <div class="sr-product-grid">
                  ${products.map(productCard).join('')}
                </div>
              </article>
            </div>
          </div>
        </section>
      `;
      try { root.bumpCommerceRank?.('makingMoney', 1); } catch {}
    }

    function executeRoute(route){
      if (!route) return;
      if (route === 'catalog') {
        renderCatalogRoom();
      } else if (typeof root.renderFunctionalPanel === 'function') {
        root.renderFunctionalPanel(route);
      } else if (typeof root.renderPanel === 'function') {
        root.renderPanel(route);
      }

      if (route === 'aria' || route === 'jake') {
        setTimeout(() => {
          try { root.startAssistantSequence?.(route); } catch {}
        }, 120);
      }
    }

    if (!window.__srPanelExecutionFixInstalled) {
      window.__srPanelExecutionFixInstalled = true;
      document.addEventListener('click', event => {
        const btn = event.target.closest?.('[data-route]');
        if (!btn) return;
        const route = btn.dataset.route;
        if (!route) return;

        const insideSupportRemote = btn.closest('.sr-remote, .sr-roam, .sr-page');
        if (!insideSupportRemote) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        executeRoute(route);
      }, true);
    }

    root.renderCatalogRoom = renderCatalogRoom;
    root.executeRemoteRoute = executeRoute;
  }

  document.addEventListener('DOMContentLoaded', () => {
    installPanelExecutionFix();

    const root = window.SupportRDRebuild || {};
    root.initCommerceRank?.();
    root.initAccountBackbone?.();
    root.initFunctionalSurfaces?.();
    root.initVoiceAssistants?.();

    // After every subsystem initializes, make sure the actual functional Diary room is the first visible panel.
    setTimeout(() => {
      try { root.renderFunctionalPanel?.('diary'); } catch {}
    }, 0);
  });
})();
