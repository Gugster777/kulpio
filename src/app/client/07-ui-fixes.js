// Small UI recovery layer for the current app shell.
// Keeps the product filter discoverable on Home, exposes the existing comparison
// engine outside the scanner, and turns the old "Kulpio toolkit" bucket into
// focused Profile actions.
(function installUiFixes() {
  const originalRenderContent = window.renderContent;
  if (typeof originalRenderContent !== 'function') return;

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
        + '<p class="card-sub" id="homeCompareHint"></p>'
        + '<div id="homeCompareList" style="display:grid;gap:8px"></div>'
        + '<button type="button" class="modal-btn btn-save" id="homeCompareGo" disabled></button>'
        + '</div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
      modal.querySelector('#homeCompareClose').onclick = () => modal.classList.remove('show');
    }

    const title = modal.querySelector('#homeCompareTitle');
    const hint = modal.querySelector('#homeCompareHint');
    const list = modal.querySelector('#homeCompareList');
    const go = modal.querySelector('#homeCompareGo');
    title.textContent = typeof l === 'function' ? l('cmpTitle') : 'Compare products';
    hint.textContent = 'Choose 2 products.';
    go.textContent = 'Compare';

    list.innerHTML = products.map((p, i) => {
      const label = String(p.name || 'Product');
      const brand = p.brand ? ' · ' + p.brand : '';
      return '<label style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:12px;cursor:pointer">'
        + `<input type="checkbox" class="home-cmp-choice" value="${i}" style="width:18px;height:18px">`
        + `<span style="font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}${esc(brand)}</span>`
        + '</label>';
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
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fchip filter-btn';
    button.id = 'homeCompareBtn';
    button.textContent = '⚖️ Compare';
    button.setAttribute('aria-label', 'Compare products');
    button.onclick = openProductComparePicker;
    row.appendChild(button);
  }

  function ensureHomeShortcuts() {
    if (typeof currentTab !== 'undefined' && currentTab !== 'home') return;
    const list = document.getElementById('fridgeItems');
    if (!list || !list.parentElement) return;

    const existingFilter = document.getElementById('filterBtn');
    if (existingFilter) {
      addCompareButton(existingFilter.parentElement);
      return;
    }
    if (document.getElementById('homeQuickTools')) return;

    const row = document.createElement('div');
    row.id = 'homeQuickTools';
    row.className = 'fridge-tools';
    row.style.marginBottom = '8px';
    row.innerHTML = '<div class="fridge-row" style="grid-template-columns:minmax(0,1fr) auto">'
      + '<button type="button" class="fchip active filter-btn" id="homeFilterBtn" onclick="toggleFilterMenu()" aria-haspopup="true" aria-controls="filterMenu">⚙ Filter</button>'
      + '</div>'
      + '<div class="filter-menu" id="filterMenu">' + (typeof filterMenuHtml === 'function' ? filterMenuHtml() : '') + '</div>';
    list.parentElement.insertBefore(row, list);
    addCompareButton(row.querySelector('.fridge-row'));
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
      + '<button type="button" class="mini-btn" onclick="openTour()">ⓘ App tour</button>'
      + '</div>';
  }

  function refreshUi() {
    setTimeout(() => {
      ensureHomeShortcuts();
      ensureProfileActions();
    }, 0);
  }

  window.renderContent = function (...args) {
    const result = originalRenderContent.apply(this, args);
    refreshUi();
    return result;
  };

  window.openProductComparePicker = openProductComparePicker;
  refreshUi();
})();
