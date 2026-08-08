// Small UI recovery layer for the current app shell.
// Keeps Home shortcuts discoverable, exposes comparison outside the scanner,
// replaces the old Profile toolkit card, and adds the scan-time price entry UI.
(function installUiFixes() {
  const originalRenderContent = window.renderContent;
  if (typeof originalRenderContent !== 'function') return;

  const text = key => typeof l === 'function' ? l(key) : key;

  function productComparePayload(p) {
    const nut = p && p.nutriments || {};
    return {
      name: String(p && p.name || 'Product').trim(),
      brand: String(p && p.brand || '').trim(),
      img: String(p && p.img || '').trim(),
      code: String(p && p.code || ('local-' + Math.random().toString(36).slice(2))),
      grade: String(p && (p.grade || p.nutriscore_grade || '') || '').toLowerCase(),
      nova: Number(p && p.nova) || 0,
      kcal: Number.isFinite(Number(p && p.kcal)) ? Number(p.kcal) : (Number.isFinite(Number(nut['energy-kcal_100g'])) ? Number(nut['energy-kcal_100g']) : null),
      prot: Number.isFinite(Number(p && p.prot)) ? Number(p.prot) : (Number.isFinite(Number(nut.proteins_100g)) ? Number(nut.proteins_100g) : null),
      fat: Number.isFinite(Number(p && p.fat)) ? Number(p.fat) : (Number.isFinite(Number(nut.fat_100g)) ? Number(nut.fat_100g) : null),
      carb: Number.isFinite(Number(p && p.carb)) ? Number(p.carb) : (Number.isFinite(Number(nut.carbohydrates_100g)) ? Number(nut.carbohydrates_100g) : null),
      adds: Array.isArray(p && p.adds) ? p.adds : (Array.isArray(p && p.additives) ? p.additives : null),
    };
  }

  function openProductComparePicker() {
    const products = Array.isArray(state && state.products) ? state.products.filter(Boolean) : [];
    if (products.length < 2) return;
    let modal = document.getElementById('homeComparePicker');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'homeComparePicker';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = '<div class="modal-content" style="max-height:78vh;overflow:auto">'
        + '<div class="set-head"><h2 style="margin:0">⚖️ <span id="homeCompareTitle"></span></h2>'
        + '<button class="side-panel-close" id="homeCompareClose" style="position:static" aria-label="Close">×</button></div>'
        + '<p class="card-sub" id="homeCompareHint"></p><div id="homeCompareList" style="display:grid;gap:8px"></div>'
        + '<button type="button" class="modal-btn btn-save" id="homeCompareGo" disabled></button></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
      modal.querySelector('#homeCompareClose').onclick = () => modal.classList.remove('show');
    }
    const title = modal.querySelector('#homeCompareTitle');
    const hint = modal.querySelector('#homeCompareHint');
    const list = modal.querySelector('#homeCompareList');
    const go = modal.querySelector('#homeCompareGo');
    title.textContent = text('cmpTitle');
    hint.textContent = text('cmpHint') || 'Choose 2 products.';
    go.textContent = text('cmpTitle') || 'Compare';
    list.innerHTML = products.map((p, i) => {
      const label = String(p.name || 'Product');
      const brand = p.brand ? ' · ' + p.brand : '';
      return '<label style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:12px;cursor:pointer">'
        + `<input type="checkbox" class="home-cmp-choice" value="${i}" style="width:18px;height:18px">`
        + `<span style="font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}${esc(brand)}</span></label>`;
    }).join('');
    const update = () => {
      const picked = [...list.querySelectorAll('.home-cmp-choice:checked')];
      go.disabled = picked.length !== 2;
      list.querySelectorAll('.home-cmp-choice').forEach(x => { x.disabled = picked.length >= 2 && !x.checked; });
    };
    list.querySelectorAll('.home-cmp-choice').forEach(x => x.addEventListener('change', update));
    go.onclick = () => {
      const picked = [...list.querySelectorAll('.home-cmp-choice:checked')];
      if (picked.length !== 2 || typeof openCmpModal !== 'function') return;
      const a = productComparePayload(products[Number(picked[0].value)]);
      const b = productComparePayload(products[Number(picked[1].value)]);
      modal.classList.remove('show');
      openCmpModal(a, b);
    };
    update();
    modal.classList.add('show');
  }

  function addCompareButton(row) {
    if (!row || row.querySelector('#homeCompareBtn')) return;
    row.style.gridTemplateColumns = 'minmax(0,1fr) auto auto';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fchip filter-btn';
    button.id = 'homeCompareBtn';
    button.textContent = '⚖️ ' + (text('cmpTitle') || 'Compare');
    button.setAttribute('aria-label', text('cmpTitle') || 'Compare products');
    button.onclick = openProductComparePicker;
    row.appendChild(button);
  }

  function ensureHomeShortcuts() {
    if (typeof currentTab !== 'undefined' && currentTab !== 'home') return;
    const list = document.getElementById('fridgeItems');
    if (!list || !list.parentElement) return;
    const existingFilter = document.getElementById('filterBtn');
    if (existingFilter) {
      const row = existingFilter.parentElement;
      row.style.gridTemplateColumns = 'minmax(0,1fr) auto auto';
      existingFilter.textContent = typeof filterBtnLabel === 'function' ? filterBtnLabel() : '⚙ Filter';
      addCompareButton(row);
      return;
    }
    if (document.getElementById('homeQuickTools')) return;
    const row = document.createElement('div');
    row.id = 'homeQuickTools';
    row.className = 'fridge-tools';
    row.style.marginBottom = '8px';
    row.innerHTML = '<div class="fridge-row" style="grid-template-columns:minmax(0,1fr) auto auto">'
      + '<button type="button" class="fchip active filter-btn" id="homeFilterBtn" onclick="toggleFilterMenu()" aria-haspopup="true" aria-controls="filterMenu">⚙ Filter</button>'
      + '</div><div class="filter-menu" id="filterMenu">' + (typeof filterMenuHtml === 'function' ? filterMenuHtml() : '') + '</div>';
    list.parentElement.insertBefore(row, list);
    addCompareButton(row.querySelector('.fridge-row'));
    const btn = document.getElementById('homeFilterBtn');
    if (btn && typeof filterBtnLabel === 'function') btn.textContent = filterBtnLabel();
  }

  function ensureProfileActions() {
    const pane = document.getElementById('profilePane-tools');
    if (!pane) return;
    const toolkit = [...pane.querySelectorAll('.card-title')].find(el => /kulpio toolkit/i.test(el.textContent || ''));
    if (!toolkit) return;
    const card = toolkit.closest('.sv-card');
    if (!card) return;
    card.innerHTML = '<div class="card-title">💬 Feedback & insights</div>'
      + '<div class="card-sub">Tell us what to improve and see how your fridge is doing.</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px">'
      + '<button type="button" class="mini-btn" onclick="openFeedback()">✉ Feedback</button>'
      + '<button type="button" class="mini-btn" onclick="openImpact()">📊 Insights</button>'
      + '<button type="button" class="mini-btn" onclick="openTour()">ⓘ App tour</button></div>';
  }

  function addScanPriceButton() {
    const f = window._scanFound;
    const anchor = document.getElementById('scardCrowd') || document.getElementById('scardPrice');
    if (!anchor || !f || document.getElementById('scardAddPriceBtn')) return;
    const wrap = document.createElement('div');
    wrap.id = 'scardPriceActions';
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'scardAddPriceBtn';
    btn.className = 'mini-btn';
    btn.textContent = '＋ Add price';
    btn.onclick = () => openScanPriceDialog(window._scanFound);
    wrap.appendChild(btn);
    anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
  }

  function openScanPriceDialog(f) {
    if (!f) return;
    let modal = document.getElementById('scanPriceModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'scanPriceModal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = '<div class="modal-content" style="max-width:430px">'
        + '<div class="set-head"><h2 style="margin:0">💳 Add price</h2><button class="side-panel-close" id="scanPriceClose" style="position:static" aria-label="Close">×</button></div>'
        + '<p class="card-sub" id="scanPriceProduct"></p>'
        + '<label class="field-label">Store<input id="scanPriceStore" class="text-input" autocomplete="organization" maxlength="80"></label>'
        + '<label class="field-label">Price<input id="scanPriceValue" class="text-input" inputmode="decimal" type="number" min="0.01" step="0.01"></label>'
        + '<button type="button" class="modal-btn btn-save" id="scanPriceSave">Save price</button></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
      modal.querySelector('#scanPriceClose').onclick = () => modal.classList.remove('show');
      modal.querySelector('#scanPriceSave').onclick = async () => {
        const product = modal._product;
        const store = modal.querySelector('#scanPriceStore').value.trim();
        const price = parseFloat(modal.querySelector('#scanPriceValue').value);
        if (!product || !store || !(price > 0)) return;
        if (typeof recordPrice === 'function') {
          recordPrice(product.name, store, price);
          if (typeof saveState === 'function') saveState();
        }
        const url = typeof aiProxyUrl === 'function' ? aiProxyUrl() : '';
        if (url && navigator.onLine && product.code) {
          try {
            await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ priceLog: { code: product.code, store, price, cur: currentCurrency, uid: typeof scanUid !== 'undefined' ? scanUid : '' } })
            });
          } catch {}
        }
        modal.classList.remove('show');
        const priceEl = document.getElementById('scardPrice');
        if (priceEl && typeof formatPrice === 'function') {
          priceEl.textContent = '💳 ≈ ' + formatPrice(price);
          priceEl.style.display = '';
        }
        if (typeof queueCrowdPrices === 'function') {
          try { delete window._crowdCache[product.code]; } catch {}
          queueCrowdPrices(product);
        }
      };
    }
    modal._product = f;
    modal.querySelector('#scanPriceProduct').textContent = String(f.name || 'Product');
    modal.querySelector('#scanPriceStore').value = String(f.store || '');
    modal.querySelector('#scanPriceValue').value = '';
    modal.classList.add('show');
    setTimeout(() => modal.querySelector('#scanPriceValue').focus(), 50);
  }

  function refreshUi() {
    setTimeout(() => {
      ensureHomeShortcuts();
      ensureProfileActions();
      addScanPriceButton();
    }, 0);
  }

  window.renderContent = function (...args) {
    const result = originalRenderContent.apply(this, args);
    refreshUi();
    return result;
  };

  // The scan card is updated without renderContent, so watch it for new cards.
  const observer = new MutationObserver(refreshUi);
  observer.observe(document.body, { childList: true, subtree: true });

  window.openProductComparePicker = openProductComparePicker;
  window.openScanPriceDialog = openScanPriceDialog;
  refreshUi();
})();
