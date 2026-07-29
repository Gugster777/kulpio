// Source section: 06-ui-init.js
// ─── PRODUCT MODAL ───────────────────────────────────────────────
function addProductManually() {
  document.getElementById('modalTitleText').textContent = l('addProduct');
  document.getElementById('pName').value = '';
  document.getElementById('pBrand').value = '';
  document.getElementById('brandSugg').innerHTML = '';
  document.getElementById('pStore').value = '';
  updatePriceHint('');   // no price hint until a name is typed
  updateShelfHint('');   // …and no shelf-life hint until then either
  const dateEl = document.getElementById('pDate');
  dateEl.value = '';
  delete dateEl.dataset.userset;
  setDateVisible(false);   // no "estimated date" UI while adding
  _aiDays = null;
  document.getElementById('pPrice').value = '';
  document.getElementById('pQty').value = '';
  setAddMore(false);   // fresh add starts light — secondary fields folded away
  document.getElementById('productModal').dataset.editIdx = '';
  document.getElementById('productModal').dataset.img = '';
  { const m = document.getElementById('pScanDateMsg'); if (m) { m.textContent = ''; m.className = 'scan-date-msg'; } }
  document.getElementById('productModal').dataset.opened = '';
  document.getElementById('productModal').dataset.openedWas = '';
  delete document.getElementById('productModal').dataset.teachCode;
  delete document.getElementById('productModal').dataset.scanCode;
  document.getElementById('btnDeleteRow').style.display = 'none';
  syncOpenedBtn(false);
  syncLocSeg('fridge');   // a new item goes in the fridge unless you say otherwise
  updatePhotoPreview();
  ensureOverlayHistory();
  document.getElementById('productModal').classList.add('show');
  // Start typing right away — no extra tap into the name field.
  setTimeout(() => { const n = document.getElementById('pName'); if (n) n.focus(); }, 60);
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('show');
  document.getElementById('productModal').dataset.editIdx = '';
  // A teach/scan code must not outlive its modal — the next save isn't it.
  delete document.getElementById('productModal').dataset.teachCode;
  delete document.getElementById('productModal').dataset.scanCode;
}

// Delete from the edit modal (the only delete path in grid view, where
// tiles have no ×). Goes through removeProduct so the undo toast applies.
function deleteFromModal() {
  const idx = parseInt(document.getElementById('productModal').dataset.editIdx, 10);
  closeProductModal();
  if (!isNaN(idx)) removeProduct(idx);
}

// ── NAME DECENCY GUARD ───────────────────────────────────────────
// A food tracker shouldn't accept slurs or crude joke names. Reject the most
// blatant ones (whole-word match, plus a substring check for a small core set
// so "penis123" is caught too). Best-effort, not exhaustive — real food names
// are never affected because matching is token-based.
const BAD_WORDS = new Set([
  'penis','penes','dick','dickhead','cock','cocks','pussy','vagina','vagina','cunt','clit','clitoris','dildo',
  'boob','boobs','tit','tits','titty','scrotum','testicle','testicles','ballsack','nutsack',
  'fuck','fucker','fucking','motherfucker','shit','bullshit','bitch','bastard','ass','asshole','arse','arsehole',
  'wank','wanker','cum','jizz','semen','ejaculate','porn','porno','pornhub','sex','anal','blowjob','handjob',
  'nigger','nigga','faggot','fag','retard','whore','slut','rape','rapist','nazi','hitler','kys',
  'хуй','хуи','хер','пизда','пизде','ебать','ебал','ебаный','блядь','бля','сука','член','залупа','гандон',
  'пидор','пидорас','мудак','дрочить','дрочка','порно','секс','жопа','говно','срать','гондон',
  'pula','pulă','pizda','pizdă','muie','coaie','futu','cacat','curva',
]);
const BAD_SUBSTR = ['penis','vagina','pussy','dick','cunt','fuck','porn','хуй','пизда','ебать','pula','pizda'];
function isBadName(s) {
  const low = String(s || '').toLowerCase();
  const tokens = low.split(/[^\p{L}]+/u).filter(Boolean);
  if (tokens.some(t => BAD_WORDS.has(t))) return true;
  const collapsed = low.replace(/[^\p{L}]+/gu, '');
  return BAD_SUBSTR.some(w => collapsed.includes(w));
}
function rejectBadName(el) {
  if (el) { el.textContent = '🚫 ' + l('badName'); el.style.display = ''; }
  try { navigator.vibrate && navigator.vibrate(40); } catch {}
}

function saveProductManual() {
  const name = document.getElementById('pName').value.trim();
  if (!name) return;
  if (isBadName(name)) { rejectBadName(document.getElementById('pNameMsg')); document.getElementById('pName').focus(); return; }
  const brand = document.getElementById('pBrand').value.trim() || '';
  const store = document.getElementById('pStore').value.trim() || '';
  // Persist the expiry DATE (not just a day count) so freshness recomputes
  // correctly every time the app is opened. The field stays empty unless the
  // user set a date — an empty field gets the silent estimate (AI answer for
  // this name if one arrived, offline shelf-life table otherwise).
  const exp = document.getElementById('pDate').value || estimatedExpiry(name);
  const price = parseFloat(document.getElementById('pPrice').value) || 0;
  const qty = Math.max(1, Math.min(999, parseInt(document.getElementById('pQty').value, 10) || 1));
  const days = daysUntil(exp) ?? 7;

  const badge = freshnessBadge(days);
  const cls = days <= 1 ? 'br' : days <= 5 ? 'ba' : 'bg';
  const dot = days <= 1 ? 'dr' : days <= 5 ? 'da' : 'dg';

  const editIdx = document.getElementById('productModal').dataset.editIdx;
  const product = {name, brand, store, badge, cls, dot, price, exp, qty};
  const img = document.getElementById('productModal').dataset.img || '';
  if (img) product.img = img;
  // The barcode survives: from the scan that opened this form (only while
  // the modal is really on screen — same rule as the place control), or
  // carried over from the card being edited.
  const scanCode = document.getElementById('productModal').classList.contains('show')
    ? (document.getElementById('productModal').dataset.scanCode || '') : '';
  const priorCode = editIdx !== '' && state.products[editIdx] ? state.products[editIdx].code : '';
  if (scanCode || priorCode) product.code = scanCode || priorCode;

  // "Opened" survives the rebuild; flipping it ON right now shrinks the
  // shelf life to the opened-pack allowance for this kind of food.
  const openedWas = document.getElementById('productModal').dataset.openedWas || '';
  const openedNow = document.getElementById('productModal').dataset.opened || '';
  let justOpened = false;
  if (openedNow) {
    product.opened = openedWas || new Date().toISOString().slice(0, 10);
    if (!openedWas) {
      justOpened = true;
      const cap = daysToDateInput(openShelfDays(product));
      if (!product.exp || cap < product.exp) {
        product.exp = cap;
        const d2 = daysUntil(cap) ?? 7;
        product.badge = freshnessBadge(d2);
        product.cls = d2 <= 1 ? 'br' : d2 <= 5 ? 'ba' : 'bg';
        product.dot = d2 <= 1 ? 'dr' : d2 <= 5 ? 'da' : 'dg';
      }
    }
  }

  // Where it's kept. The place control decides `frozen` on save: picking the
  // freezer freezes it (and extends the date the way the freezer sheet does),
  // picking fridge/pantry takes it back out. Only trust the control when the
  // modal is actually on screen — a save driven from code must not be steered
  // by a leftover choice, or it would silently thaw a frozen item.
  const _m = document.getElementById('productModal');
  const _cur = editIdx !== '' && state.products[editIdx];
  const locNow = _m.classList.contains('show')
    ? (_m.dataset.loc || 'fridge')
    : (_cur ? productLoc(_cur) : 'fridge');
  const wasFrozen = !!(_cur && _cur.frozen);
  setProductLoc(product, locNow);
  if (product.frozen && !wasFrozen && !document.getElementById('pDate').dataset.userset) {
    product.exp = daysToDateInput(90);   // just put in the freezer → freezer life
    const d3 = 90;
    product.badge = freshnessBadge(d3);
    product.cls = 'bg';
    product.dot = 'dg';
  }

  if (editIdx !== '' && editIdx !== undefined && state.products[editIdx]) {
    // Keep the price trend across edits; a new price observed = new trend.
    const oldPrice = parseFloat(state.products[editIdx].price) || 0;
    if (oldPrice > 0 && price > 0 && oldPrice !== price) product.prevPrice = oldPrice;
    else if (state.products[editIdx].prevPrice) product.prevPrice = state.products[editIdx].prevPrice;
    // The price trail survives edits; a new price observed = a new point.
    if (state.products[editIdx].pHist) product.pHist = state.products[editIdx].pHist;
    if (price > 0) {
      if (oldPrice > 0 && !product.pHist) pushPriceHist(product, oldPrice);
      pushPriceHist(product, price);
    }
    state.products[parseInt(editIdx)] = product;
    recordPrice(product.name, product.store, product.price);
  } else {
    mergeOrPush(product);   // same name already in the fridge → refresh that card
  }

  // Saving a product that came from an unknown barcode teaches Kulpio the
  // code — the next scan of it answers instantly, offline included.
  const teach = _m.classList.contains('show') ? (_m.dataset.teachCode || '') : '';
  if (teach) {
    teachProduct(teach, { name, brand, store, img });
    delete _m.dataset.teachCode;
  }
  delete _m.dataset.scanCode;   // spent — a later save must not inherit it
  if (product.code) logPriceCloud(product);   // priced + coded + stored → a crowd observation

  recipeCacheKey = '';   // new/edited product → refresh recipe suggestions
  saveState();
  closeProductModal();
  switchTab('home', document.getElementById('tab-home'));
  if (!img) fetchProductImage(name, brand);   // look up a pack photo in the background
  if (editIdx === '' || editIdx === undefined) {
    pearReact('hop', 'pearAdd', '😋', 700);
    maybeWasteWarn(name);   // …unless this food has a history of hitting the bin
  }
  else if (justOpened) pearSay('🔓 ' + l('openedNote'));
}

// ─── MENU / NOTIFS ───────────────────────────────────────────────
// The dimmed backdrop shows whenever a slide-in panel is open; tapping it
// (i.e. any "empty" spot beside the panel) closes everything.
function syncPanelBackdrop() {
  const open = document.getElementById('sideMenu').classList.contains('show')
            || document.getElementById('notifPanel').classList.contains('show');
  document.getElementById('panelBackdrop').classList.toggle('show', open);
}
function closePanels() {
  document.getElementById('sideMenu').classList.remove('show');
  document.getElementById('notifPanel').classList.remove('show');
  syncPanelBackdrop();
  releaseOverlayHistory();
}
function toggleMenu() {
  const el = document.getElementById('sideMenu');
  el.classList.toggle('show');
  syncPanelBackdrop();
  if (el.classList.contains('show')) ensureOverlayHistory(); else releaseOverlayHistory();
}

function toggleNotifs() {
  if (!notifsEnabled) return;        // bell is hidden when alerts are off
  requestNotifPermissionIfNeeded();  // opting to view alerts implies wanting them
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('show');
  syncPanelBackdrop();
  if (panel.classList.contains('show')) ensureOverlayHistory(); else releaseOverlayHistory();
  refreshFreshness();   // alerts reflect today's expiry state
  const risky = state.products.filter(p => p.cls === 'br' || p.cls === 'ba').slice(0, 6);
  document.getElementById('notifList').innerHTML = risky.length
    ? risky.map(p => `<div class="notif-item">⏰ ${esc(p.name)} · ${esc(p.badge)}${p.store ? ' · ' + esc(p.store) : ''}</div>`).join('')
    : `<div class="notif-item">${esc(l('noAlerts'))}</div>`;
}

// ─── SYSTEM BACK BUTTON ──────────────────────────────────────────
// Opening any overlay (panel, modal, sheet, scanner) pushes ONE history
// entry, so the Android/browser Back button closes what's on screen instead
// of exiting the installed app. UI closes deliberately leave the entry in
// place (going back then just consumes it silently) — calling history.back()
// from a close handler would race against the next overlay opening.
let _ovDepth = 0;
function anyOverlayOpen() {
  return ['sideMenu', 'notifPanel', 'productModal', 'multiModal', 'receiptModal', 'recipeModal', 'actionSheet', 'scanOverlay', 'priceModal', 'planModal', 'cmpModal', 'searchModal', 'wrapModal', 'walletModal', 'houseModal', 'impactModal', 'feedbackModal', 'cardShowModal', 'achModal', 'authModal', 'legalModal', 'welcomeModal']
    .some(id => { const el = document.getElementById(id); return el && el.classList.contains('show'); });
}

// Desktop mice: the app lives in an internal scroll container (.scroll-area),
// so the wheel only worked while the cursor sat exactly over the list — dead
// over the pear, the header, the nav and the empty space beside the column.
// Forward the wheel to the scroll area whenever nothing under the cursor
// scrolls natively; overlays and modals keep handling their own scrolling.
window.addEventListener('wheel', e => {
  if (anyOverlayOpen()) return;   // modal/panel content scrolls itself
  const tour = document.getElementById('tourModal');
  if (tour && tour.classList.contains('show')) return;
  let el = e.target instanceof Element ? e.target : null;
  while (el) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll') return;   // native scrolling handles it
    }
    el = el.parentElement;
  }
  const sa = document.querySelector('.scroll-area');
  if (!sa) return;
  // deltaMode 1 = lines (Firefox with a plain wheel) — scale to pixels.
  sa.scrollTop += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
}, { passive: true });
function ensureOverlayHistory() {
  if (_ovDepth === 0) { try { history.pushState({ kulpio: 'overlay' }, ''); _ovDepth = 1; } catch {} }
}
function releaseOverlayHistory() { /* history entry stays; see note above */ }
window.addEventListener('popstate', () => {
  if (_ovDepth > 0) {
    _ovDepth = 0;
    if (anyOverlayOpen()) closeAllOverlays();
  }
});
function closeAllOverlays() {
  closeRecipeModal();
  closeProductModal();
  closeMultiModal();
  closeReceiptReview();
  closeTour();
  closePriceModal();
  closeCmpModal();
  closeWrap();
  closePearPlan();
  closeSheet();
  closeGlobalSearch();
  closeLegal();
  closeCardShow();
  closeWallet();
  closeHouseModal();
  closeImpact();
  closeAchievements();
  closeAuth();
  if (document.getElementById('scanOverlay').classList.contains('show')) closeScanner();
  document.getElementById('sideMenu').classList.remove('show');
  document.getElementById('notifPanel').classList.remove('show');
  syncPanelBackdrop();
  const fm = document.getElementById('filterMenu');
  if (fm) fm.classList.remove('show');
  hideUndoToast();
}

function clearStorage() {
  localStorage.removeItem('kulpio-products');
  state.products = [];
  recipeCacheKey = '';
  internetRecipes = [];
  saveState();
  renderContent();
}

// Guard the destructive "Clear all" with a confirmation — a single menu tap
// must not silently wipe every tracked product.
function confirmClearAll() {
  if (state.products.length === 0 || confirm(l('confirmClear'))) {
    clearStorage();
    toggleMenu();
  }
}
// A proper About screen: what Kulpio is, what it does, how the expiry logic
// works, privacy, the tech, and your own live numbers — instead of an alert().
const APP_VERSION = '3.0';

function showAbout() {
const items = (state.products || []).length;
  const used = state.usedCount || 0;
  const saved = state.saved || 0;
  const langs = Object.keys(L).length;
  const stat = (v, lbl) => `<div class="ab-stat"><b>${esc(String(v))}</b><span>${esc(lbl)}</span></div>`;
  document.getElementById('aboutTitleT').textContent = l('about');
  document.getElementById('aboutBody').innerHTML = `
    <div class="ab-hero">
      <div class="ab-logo" aria-hidden="true">🍐</div>
      <div>
        <div class="ab-name">Kulpio</div>
        <div class="ab-tag">${esc(l('aboutTagline'))} · ${esc(l('abVer'))} ${APP_VERSION}</div>
      </div>
    </div>
    <div class="ab-stats">
      ${stat(items, l('abStItems'))}
      ${stat(used, l('abStUsed'))}
      ${stat(formatPrice(saved), l('abStSaved'))}
      ${stat(langs, l('abStLang'))}
    </div>
    <h4>${esc(l('abWhat'))}</h4>
    <p>${esc(l('abWhatT'))}</p>
    <h4>${esc(l('abFeat'))}</h4>
    <ul class="ab-list">
      <li>📷 ${esc(l('abF1'))}</li>
      <li>🧊 ${esc(l('abF2'))}</li>
      <li>🍳 ${esc(l('abF3'))}</li>
      <li>👥 ${esc(l('abF4'))}</li>
      <li>🏆 ${esc(l('abF5'))}</li>
    </ul>
    <h4>${esc(l('abHow'))}</h4>
    <p>${esc(l('abHowT'))}</p>
    <h4>${esc(l('abPriv'))}</h4>
    <p>${esc(l('abPrivT'))}</p>
    <h4>${esc(l('abTech'))}</h4>
    <p>${esc(l('abTechT'))}</p>
    <p class="ab-credit">${esc(l('abMade'))}<br>
      <a href="https://github.com/Gugster777/kulpio" target="_blank" rel="noopener">github.com/Gugster777/kulpio</a>
      · <a href="#" onclick="event.preventDefault();closeAbout();openLegal()">${esc(l('menuLegal'))}</a></p>`;
  ensureOverlayHistory();
  document.getElementById('aboutModal').classList.add('show');
}
function closeAbout() {
  document.getElementById('aboutModal').classList.remove('show');
}


// ─── FIRST-RUN TOUR ──────────────────────────────────────────────
// A five-card walk-through the pear gives new users on first open;
// replayable any time from Settings → Guide.
const TOUR = [
  { e: '🍐', t: 'tT1', b: 'tB1' },
  { e: '➕', t: 'tT2', b: 'tB2' },
  { e: '⏰', t: 'tT3', b: 'tB3' },
  { e: '✅', t: 'tT4', b: 'tB4' },
  { e: '🏆', t: 'tT5', b: 'tB5' },
];
let tourStep = 0;
function openTour() {
  tourStep = 0;
  renderTour();
  ensureOverlayHistory();
  document.getElementById('tourModal').classList.add('show');
}
function renderTour() {
  const s = TOUR[tourStep];
  const last = tourStep === TOUR.length - 1;
  document.getElementById('tourEmoji').textContent = s.e;
  document.getElementById('tourTitle').textContent = l(s.t);
  document.getElementById('tourBody').textContent = l(s.b);
  document.getElementById('tourDots').innerHTML = TOUR.map((_, i) => `<span class="tdot${i === tourStep ? ' on' : ''}"></span>`).join('');
  document.getElementById('tourSkip').textContent = l('tSkip');
  document.getElementById('tourSkip').style.visibility = last ? 'hidden' : 'visible';
  document.getElementById('tourNext').textContent = last ? '🎉 ' + l('tDone') : l('tNext') + ' →';
}
function tourNext() {
  if (tourStep < TOUR.length - 1) {
    tourStep++;
    renderTour();
    pearReact('hop', null, TOUR[tourStep].e, 500);
  } else closeTour();
}
function closeTour() {
  const m = document.getElementById('tourModal');
  if (!m.classList.contains('show')) return;
  localStorage.setItem('kulpio-toured', '1');
  m.classList.remove('show');
}

// ─── BACKUP / RESTORE ────────────────────────────────────────────
// Everything Kulpio knows lives under the "kulpio-" localStorage prefix.
// Export bundles it into one JSON file; import replaces it wholesale so a
// wiped browser cache no longer means a lost fridge, savings, or shopping list.
function exportData() {
  saveState();   // flush any in-memory state first
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    // Demo-mode scaffolding never rides into a backup.
    if (k && k.startsWith('kulpio-') && k !== 'kulpio-demo' && k !== 'kulpio-predemo-backup') data[k] = localStorage.getItem(k);
  }
  const payload = { app: 'kulpio', version: 1, exported: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kulpio-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importData(input) {
  const file = input.files && input.files[0];
  input.value = '';   // allow re-picking the same file later
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); } catch { alert(l('importErr')); return; }
    const data = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : null;
    const keys = data ? Object.keys(data).filter(k => k.startsWith('kulpio-')) : [];
    if (!keys.length) { alert(l('importErr')); return; }
    if (!confirm(l('importConfirm'))) return;
    // Clear existing kulpio- keys, then restore the backup's.
    Object.keys(localStorage).filter(k => k.startsWith('kulpio-')).forEach(k => localStorage.removeItem(k));
    keys.forEach(k => localStorage.setItem(k, data[k]));
    alert(l('importOk'));
    location.reload();
  };
  reader.onerror = () => alert(l('importErr'));
  reader.readAsText(file);
}

// ─── FOOD-LOOP SHEETS (Used it / Froze it / To buy) ──────────────
// The three chips under the tagline record what happens to your food —
// the part the rest of the app doesn't track. "Used it" credits real money
// saved; "Froze it" extends an item's life; "To buy" is a shopping list.
let sheetKind = null;
function openSheet(kind) {
  sheetKind = kind;
  renderSheet();
  ensureOverlayHistory();
  document.getElementById('actionSheet').classList.add('show');
  if (kind === 'shop') {
    setTimeout(() => { const i = document.getElementById('shopInput'); if (i) i.focus(); }, 50);
    housePull();   // the partner may have added things since we last looked
  }
}
function closeSheet() {
  document.getElementById('actionSheet').classList.remove('show');
  sheetKind = null;
}
function openFeedback() {
  const m = document.getElementById('feedbackModal');
  if (!m) return;
  document.getElementById('feedbackText').value = '';
  m.classList.add('show');
  setTimeout(() => document.getElementById('feedbackText')?.focus(), 50);
}
function closeFeedback() { document.getElementById('feedbackModal')?.classList.remove('show'); }
function sendFeedback() {
  const text = String(document.getElementById('feedbackText')?.value || '').trim();
  if (!text) return;
  const subject = encodeURIComponent('Kulpio feedback');
  const body = encodeURIComponent(text + '\n\nApp version: 3.0.0');
  window.location.href = `mailto:kulpio.support@gmail.com?subject=${subject}&body=${body}`;
  closeFeedback();
}
function openSchoolMode() {
  const current = localStorage.getItem('kulpio-school-goal') || '';
  const goal = prompt('Set a shared food-waste goal for your class or organization (for example: 30 meals saved).', current);
  if (goal == null) return;
  localStorage.setItem('kulpio-school-goal', String(goal).trim().slice(0, 100));
  toast('Organization goal saved locally');
}
function renderSheet() {
  if (!sheetKind) return;
  refreshFreshness();
  const title = document.getElementById('sheetTitle');
  const body = document.getElementById('sheetBody');

  if (sheetKind === 'used') {
    title.textContent = '✅ ' + l('cUsed');
    body.innerHTML = state.products.length
      ? state.products.map((p, i) => `<div class="sheet-row" onclick="markUsed(${i})">
          <span class="sheet-act">✅</span>
          <span class="sheet-name">${esc(p.name)}${(p.qty || 1) > 1 ? ` <span class="pqty">×${p.qty}</span>` : ''}</span>
          <span class="sheet-meta">${p.price > 0 ? esc(formatPrice(p.price)) : ''}</span>
        </div>`).join('')
      : `<div class="sheet-empty">${esc(l('emptyFridge'))}</div>`;

  } else if (sheetKind === 'freeze') {
    title.textContent = '❄️ ' + l('cFroze');
    const fresh = state.products.filter(p => !p.frozen);
    body.innerHTML = fresh.length
      ? state.products.map((p, i) => p.frozen ? '' : `<div class="sheet-row" onclick="freezeItem(${i})">
          <span class="sheet-act">❄️</span>
          <span class="sheet-name">${esc(p.name)}</span>
          <span class="sheet-meta">${esc(p.badge || '')}</span>
        </div>`).join('')
      : `<div class="sheet-empty">${esc(l('emptyFridge'))}</div>`;

  } else if (sheetKind === 'waste') {
    title.textContent = '🗑️ ' + l('cWasted');
    body.innerHTML = state.products.length
      ? state.products.map((p, i) => `<div class="sheet-row" onclick="markWasted(${i})">
          <span class="sheet-act">🗑️</span>
          <span class="sheet-name">${esc(p.name)}${(p.qty || 1) > 1 ? ` <span class="pqty">×${p.qty}</span>` : ''}</span>
          <span class="sheet-meta">${p.price > 0 ? esc(formatPrice(p.price)) : ''}</span>
        </div>`).join('')
      : `<div class="sheet-empty">${esc(l('emptyFridge'))}</div>`;

  } else if (sheetKind === 'shop') {
    title.textContent = '🛒 ' + l('cBuy');
    const list = state.shopping || [];
    // Price hints from what each item cost last time, so the list carries a
    // cost estimate for the whole trip before you leave. Each row also names
    // the cheapest store on file, so the list doubles as a where-to-buy guide;
    // ticked items sink to the bottom, the way you'd cross them off in-store.
    const order = list.map((it, i) => ({ it, i })).sort((a, b) => (a.it.done ? 1 : 0) - (b.it.done ? 1 : 0));
    const rows = list.length
      ? order.map(({ it, i }) => { const pr = lastKnownPrice(it.name); const bs = bestStoreFor(it.name); return `<div class="sheet-row ${it.done ? 'done' : ''}">
          <span class="sheet-act" onclick="toggleShopItem(${i})">${it.done ? '☑' : '☐'}</span>
          <span class="sheet-name" onclick="toggleShopItem(${i})">${esc(it.name)}${bs && !it.done ? `<span class="shop-store">🏆 ${esc(bs)}</span>` : ''}</span>
          ${pr > 0 ? `<span class="sheet-meta">≈${esc(formatPrice(pr))}</span>` : ''}
          ${it.done ? `<button class="shop-fridge" onclick="shopToFridge(${i})">🧊 ${esc(l('toFridge'))}</button>` : ''}
          <button class="prod-del" onclick="removeShopItem(${i})" aria-label="${esc(l('deleteItem'))}" title="${esc(l('deleteItem'))}">×</button>
        </div>`; }).join('')
      : `<div class="sheet-empty">${esc(l('emptyBuy'))}</div>`;
    const est = list.reduce((s, it) => s + lastKnownPrice(it.name), 0);
    const estHtml = est > 0 ? `<div class="shop-est">💳 ${esc(l('estTotal'))}: <b>≈${esc(formatPrice(est))}</b></div>` : '';
    const inShop = new Set(list.map(s => (s.name || '').trim().toLowerCase()));
    const inFridge = new Set(state.products.map(p => (p.name || '').trim().toLowerCase()));
    // Running low: what's in the fridge but about to be gone (expiring ≤2 days,
    // not frozen) — buy a replacement before you run out.
    const low = state.products
      .filter(p => !p.frozen && p.exp && (daysUntil(p.exp) ?? 9) <= 2 && !inShop.has((p.name || '').trim().toLowerCase()))
      .filter((p, i, a) => a.findIndex(x => (x.name || '').trim().toLowerCase() === (p.name || '').trim().toLowerCase()) === i)
      .slice(0, 4);
    const lowHtml = !low.length ? '' : `<div class="shop-sugg">
        <div class="shop-sugg-title">${esc(l('lowTitle'))}</div>
        ${low.map(p => `<button class="fchip" onclick="addShopItemByName(${jsArg(p.name)})">+ ${esc(p.name)}</button>`).join('')}
      </div>`;
    // Frequent buys you use up (or waste) and don't currently have.
    const counts = {};
    for (const e of state.history || []) {
      const k = (e.name || '').trim().toLowerCase();
      if (!k || inShop.has(k) || inFridge.has(k)) continue;
      (counts[k] = counts[k] || { name: e.name, n: 0 }).n++;
    }
    const sugg = Object.values(counts).filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 4);
    const suggHtml = !sugg.length ? '' : `<div class="shop-sugg">
        <div class="shop-sugg-title">${esc(l('freqSuggest'))}</div>
        ${sugg.map(x => `<button class="fchip" onclick="addShopItemByName(${jsArg(x.name)})">+ ${esc(x.name)}</button>`).join('')}
      </div>`;
    body.innerHTML = `<form class="sheet-add" onsubmit="addShopItem(event)">
        <input id="shopInput" autocomplete="off" placeholder="${esc(l('buyPh'))}">
        <button type="submit" aria-label="Add">+</button>
      </form>${lowHtml}${suggHtml}${estHtml}${rows}`;
  }
}
// Best guess at an item's price: what it costs in the fridge right now,
// else what it cost the last time it was used or tossed (newest first).
function lastKnownPrice(name) {
  const k = (name || '').trim().toLowerCase();
  if (!k) return 0;
  const inFridge = state.products.find(p => (p.name || '').trim().toLowerCase() === k && parseFloat(p.price) > 0);
  if (inFridge) return parseFloat(inFridge.price);
  const h = state.history || [];
  for (let i = h.length - 1; i >= 0; i--) {
    if ((h[i].name || '').trim().toLowerCase() === k && parseFloat(h[i].price) > 0) return parseFloat(h[i].price);
  }
  return 0;
}
// ─── UNDO ────────────────────────────────────────────────────────
// One-level undo for the destructive taps (delete / used / wasted): a toast
// offers to restore the exact prior state, plus a one-tap "buy again" that
// drops the item on the shopping list (used up or spoiled → probably rebuy).
let _undoSnap = null, _undoTimer = null, _undoBuyName = '';
function snapshotState() {
  return {
    products: JSON.parse(JSON.stringify(state.products)),
    shopping: JSON.parse(JSON.stringify(state.shopping || [])),
    history: (state.history || []).slice(),
    saved: state.saved, wasted: state.wasted,
    usedCount: state.usedCount, lastWaste: state.lastWaste
  };
}
function showUndoToast(msg, snap, buyName) {
  _undoSnap = snap; _undoBuyName = buyName || '';
  const el = document.getElementById('undoToast');
  if (!el) return;
  document.getElementById('undoMsg').textContent = msg;
  document.getElementById('undoBtn').textContent = '↩ ' + l('undo');
  document.getElementById('undoBuyLbl').textContent = l('buyAgain');
  document.getElementById('undoBuyBtn').style.display = buyName ? '' : 'none';
  el.classList.add('show');
  clearTimeout(_undoTimer);
  _undoTimer = setTimeout(hideUndoToast, 6000);
}
function hideUndoToast() {
  clearTimeout(_undoTimer);
  _undoSnap = null; _undoBuyName = '';
  const el = document.getElementById('undoToast');
  if (el) el.classList.remove('show');
}
function undoLast() {
  const s = _undoSnap;
  hideUndoToast();
  if (!s) return;
  Object.assign(state, s);
  recipeCacheKey = '';
  _noCelebrate = true;   // silently putting things back isn't a party
  saveState();
  renderContent();
  if (sheetKind) renderSheet();
  _noCelebrate = false;
}
function undoBuyAgain() {
  const name = _undoBuyName;
  hideUndoToast();
  if (!name) return;
  addShopItemByName(name);
  pearReact('hop', null, '🛒', 700);
}

// "Used it" → consume one unit (remove the card when it's the last one) and
// credit its price to real money saved.
function markUsed(i) {
  const p = state.products[i];
  if (!p) return;
  maybeHiccup();   // three helpings in a minute → a little hiccup
  const snap = snapshotState();
  state.saved = (state.saved || 0) + (parseFloat(p.price) || 0);
  state.usedCount = (state.usedCount || 0) + 1;
  state.history.push({ t: new Date().toISOString().slice(0, 10), k: 'used', name: p.name, price: parseFloat(p.price) || 0 });
  houseLogEvent('used', p.name);
  if ((p.qty || 1) > 1) p.qty -= 1;
  else state.products.splice(i, 1);
  recipeCacheKey = '';
  saveState();
  renderSheet();
  renderContent();
  showUndoToast('✅ ' + p.name, snap, p.name);
  pearEat(p.name);
  checkLevelUp();
  if (state.usedCount % 5 === 0) setTimeout(pearCool, 450);   // milestone: shades after the chomp
  // Secret egg: a big round tally of food used in time.
  if ([100, 250, 500, 1000].includes(state.usedCount) && foundEgg('milestone'))
    setTimeout(() => { pearReact('proud', null, '🎯', 1600); pearSay(l('eggMileSay')); }, 1000);
}
// "Wasted it" → discard one unit and count its price as money lost to waste.
function markWasted(i) {
  const p = state.products[i];
  if (!p) return;
  const snap = snapshotState();
  state.wasted = (state.wasted || 0) + (parseFloat(p.price) || 0);
  state.lastWaste = new Date().toISOString().slice(0, 10);   // resets the waste-free streak
  state.history.push({ t: state.lastWaste, k: 'wasted', name: p.name, price: parseFloat(p.price) || 0 });
  houseLogEvent('wasted', p.name);
  if ((p.qty || 1) > 1) p.qty -= 1;
  else state.products.splice(i, 1);
  recipeCacheKey = '';
  _noCelebrate = true;                 // don't throw a party for throwing food away
  saveState();
  renderSheet();
  renderContent();
  _noCelebrate = false;
  showUndoToast('🗑️ ' + p.name, snap, p.name);
  pearReact('sad', 'pearWasted', '🥲');
}
// "Froze it" → move to the freezer: extend the expiry ~90 days, mark frozen.
function freezeItem(i) {
  const p = state.products[i];
  if (!p) return;
  setProductLoc(p, 'freezer');
  p.exp = daysToDateInput(90);
  saveState();
  renderSheet();
  renderContent();
  pearReact('shiver', 'pearFroze', '❄️');
}
// Add by name unless it's already on the list (case-insensitive).
function addShopItemByName(name) {
  state.shopping = state.shopping || [];
  const key = String(name || '').trim().toLowerCase();
  if (!key || isBadName(name)) return;
  if (!state.shopping.some(s => (s.name || '').trim().toLowerCase() === key))
    state.shopping.push({ name: String(name).trim(), done: false });
  saveState();
  if (sheetKind) renderSheet();
}
function addShopItem(e) {
  e.preventDefault();
  const inp = document.getElementById('shopInput');
  const name = (inp.value || '').trim();
  if (!name) return;
  if (isBadName(name)) { inp.value = ''; try { navigator.vibrate && navigator.vibrate(40); } catch {} return; }
  state.shopping = state.shopping || [];
  state.shopping.push({ name, done: false });
  maybeWasteWarn(name);   // cheaper to hear it before buying than after binning
  saveState();
  renderSheet();
  const again = document.getElementById('shopInput');
  if (again) again.focus();
}
function toggleShopItem(i) {
  const it = state.shopping[i];
  if (!it) return;
  it.done = !it.done;
  saveState();
  renderSheet();
  // He shops along with you: a nod per item, a hop when the list is done.
  if (it.done) {
    const left = state.shopping.filter(s => !s.done).length;
    left ? pearSpark(foodEmoji(it.name) || '🛒')
         : pearReact('hop', null, '🎉', 700);
  }
}
function removeShopItem(i) {
  state.shopping.splice(i, 1);
  saveState();
  renderSheet();
}
// A bought item goes straight into the fridge with an auto-estimated expiry —
// closes the shopping-list → fridge loop.
function shopToFridge(i) {
  const it = state.shopping[i];
  if (!it) return;
  mergeOrPush(makeProduct(it.name));
  state.shopping.splice(i, 1);
  recipeCacheKey = '';
  saveState();
  renderSheet();
  renderContent();
  fetchProductImage(it.name);
  pearReact('hop', 'pearAdd', '😋', 700);
}

// ─── SETTINGS PANEL ──────────────────────────────────────────────
// The 4-squares button opens this panel. The theme / language / currency
// controls are the same live elements as before — moved into the panel so
// everything lives in one place.
function relocateSettings() {
  const move = (slotId, elId) => {
    const slot = document.getElementById(slotId), el = document.getElementById(elId);
    if (slot && el && el.parentElement !== slot) slot.appendChild(el);
  };
  move('themeSlot', 'themeSeg');
  move('langSlot', 'langSelect');
  move('currSlot', 'currencySelect');
}

// Notifications toggle: when off, hide the bell and suppress expiry alerts.
function setNotifs(on) {
  notifsEnabled = !!on;
  saveState();
  applyNotifPref();
  if (on) requestNotifPermissionIfNeeded();
  else disablePush();
}

// Ask the browser for notification permission the first time the user opts in
// (via the toggle or by opening the bell). Once granted, surface any expiring
// items straight away so the feature feels alive — and register for real
// server pushes so alerts land even with the app closed.
function requestNotifPermissionIfNeeded() {
  if (!notifsEnabled || !('Notification' in window)) return;
  if (Notification.permission === 'granted') { enablePush(); return; }
  if (Notification.permission === 'default') {
    try {
      Notification.requestPermission().then(p => {
        maybeNotifyExpiring(true);
        if (p === 'granted') enablePush();
      });
    } catch {}
  }
}

// ─── WEB PUSH ────────────────────────────────────────────────────
// Real pushes from the worker's daily cron, so "milk expires tomorrow"
// arrives even when the app is closed. Privacy-first: the server stores
// ONLY the push endpoint and one timestamp (when the soonest item
// expires); the push itself is empty, and the notification text is
// pre-written locally in the user's language.
function nextExpiryMs() {
  let min = 0;
  for (const p of state.products) {
    if (!p.exp || p.frozen) continue;   // freezer items don't nag
    const t = new Date(p.exp + 'T23:59:59').getTime();
    if (!isNaN(t) && (min === 0 || t < min)) min = t;
  }
  return min;
}
function b64uToBytes(s) {
  const pad = '='.repeat((4 - s.length % 4) % 4);
  return Uint8Array.from(atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
// Localized copy the service worker shows when a payload-free push lands.
// Smart notification copy: name what's about to go and point at the payoff
// — cook it before it's wasted. Shared by the open-app alert and the cached
// push copy so both say the same actionable thing.
function expiryNotifCopy(items) {
  if (!items || !items.length) return { title: '🍐 ' + l('notifHeadline'), body: l('notifHeadline') };
  const names = items.slice(0, 3).map(p => p.name).join(', ');
  const extra = items.length > 3 ? ' +' + (items.length - 3) : '';
  const soonest = Math.min(...items.map(p => daysUntil(p.exp) ?? 9));
  const when = soonest < 0 ? l('expired').toLowerCase()
    : soonest === 0 ? l('today').toLowerCase()
    : soonest === 1 ? l('tomorrow').toLowerCase()
    : l('notifSoon');
  return { title: '🍐 ' + l('notifHeadline'), body: `${names}${extra} · ${when} — ${l('notifCook')} 🍳` };
}
async function cachePushCopy() {
  try {
    refreshFreshness();
    const risky = state.products.filter(p => !p.frozen && (p.cls === 'br' || p.cls === 'ba'));
    const c = await caches.open('kulpio-push-copy');
    await c.put('./push-copy.json', new Response(JSON.stringify(expiryNotifCopy(risky)),
      { headers: { 'content-type': 'application/json' } }));
  } catch {}
}
async function enablePush() {
  try {
    const url = aiProxyUrl();
    if (!url || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const data = await postJSON(url, { pushKey: 1 });
    if (!data || !data.key) return;   // push not configured on this deploy
    // getRegistration(), never .ready: .ready NEVER resolves when the SW
    // couldn't register (file://, private mode) and would hang this forever.
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !reg.pushManager) return;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(data.key) });
    await cachePushCopy();
    await postJSON(url, { pushSet: { sub: sub.toJSON(), nextExp: nextExpiryMs() } });
    localStorage.setItem('kulpio-push', 'on');
    localStorage.setItem('kulpio-push-exp', String(nextExpiryMs()));
  } catch {}
}
async function disablePush() {
  try {
    localStorage.removeItem('kulpio-push');
    localStorage.removeItem('kulpio-push-exp');
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !reg.pushManager) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const url = aiProxyUrl();
      if (url) postJSON(url, { pushDel: { endpoint: sub.endpoint } });
      await sub.unsubscribe();
    }
  } catch {}
}
// Fridge changed → tell the server the new soonest-expiry time. Debounced
// and skipped when nothing changed, so the flood of saveState() calls
// costs at most one tiny request per edit burst.
let _pushSyncT = null;
function schedulePushSync() {
  if (localStorage.getItem('kulpio-push') !== 'on') return;
  clearTimeout(_pushSyncT);
  _pushSyncT = setTimeout(async () => {
    try {
      const url = aiProxyUrl();
      if (!url || !('serviceWorker' in navigator)) return;
      const nx = nextExpiryMs();
      if (String(nx) === localStorage.getItem('kulpio-push-exp')) return;
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || !reg.pushManager) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      localStorage.setItem('kulpio-push-exp', String(nx));
      cachePushCopy();
      postJSON(url, { pushSet: { sub: sub.toJSON(), nextExp: nx } });
    } catch {}
  }, 4000);
}

// Fire a real system notification listing food that's expiring/expired. Without
// a push server this only fires while the app is open, so we cap it to once a
// day (unless forced right after the user grants permission).
function maybeNotifyExpiring(force) {
  if (!notifsEnabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  refreshFreshness();
  const risky = state.products.filter(p => !p.frozen && (p.cls === 'br' || p.cls === 'ba'));
  if (!risky.length) return;
  const today = new Date().toDateString();
  if (!force && localStorage.getItem('kulpio-last-notif') === today) return;
  localStorage.setItem('kulpio-last-notif', today);
  const { title, body } = expiryNotifCopy(risky);
  const opts = { body, icon: './kulpio-icon.svg', badge: './kulpio-icon.svg', tag: 'kulpio-expiry', lang: speechLang[currentLang] || 'en' };
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready
        .then(reg => reg.showNotification(title, opts))
        .catch(() => { try { new Notification(title, opts); } catch {} });
    } else {
      new Notification(title, opts);
    }
  } catch {}
}
function applyNotifPref() {
  const bell = document.getElementById('notifBell');
  if (bell) bell.style.display = notifsEnabled ? '' : 'none';
  const toggle = document.getElementById('notifToggle');
  if (toggle) toggle.checked = notifsEnabled;
  if (!notifsEnabled) {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.remove('show');
  }
}

// ── FEED THE PEAR ────────────────────────────────────────────────
// Grab the food icon off a card and drop it on him: he opens his mouth as it
// gets close, chomps it, and the item is marked used (money saved, undoable).
// The most direct thing you can do with food — hand it to the one who eats it.
let _blockCardClick = 0;
(() => {
  const listEl = document.getElementById('productList');
  if (!listEl) return;
  let drag = null;
  const pearEl = () => document.getElementById('pearIcon');
  const nearPear = e => {
    const el = pearEl();
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const pad = 24;   // a generous target: he leans for it
    return e.clientX > r.left - pad && e.clientX < r.right + pad
        && e.clientY > r.top - pad && e.clientY < r.bottom + pad;
  };
  const place = e => {
    drag.ghost.style.left = e.clientX + 'px';
    drag.ghost.style.top = e.clientY + 'px';
  };
  listEl.addEventListener('pointerdown', e => {
    const handle = e.target.closest('.pgrab');
    const card = handle && handle.closest('[data-idx]');
    if (!card) return;
    const idx = parseInt(card.dataset.idx, 10);
    const p = state.products[idx];
    if (!p) return;
    e.preventDefault();
    const ghost = document.createElement('div');
    ghost.className = 'feed-ghost';
    if (p.img) {
      const im = document.createElement('img');
      im.src = p.img;
      ghost.appendChild(im);
    } else {
      ghost.textContent = foodEmoji(p.name) || '🍽️';
    }
    document.body.appendChild(ghost);
    drag = { idx, ghost, moved: false, id: e.pointerId };
    place(e);
    try { listEl.setPointerCapture(e.pointerId); } catch {}
  });
  listEl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.moved = true;
    place(e);
    const on = nearPear(e);
    drag.ghost.classList.toggle('over', on);
    const el = pearEl();
    if (el) el.classList.toggle('hungry', on);
    if (on) pearWake();
  });
  const end = e => {
    if (!drag || (e.pointerId != null && e.pointerId !== drag.id)) return;
    const d = drag;
    drag = null;
    const el = pearEl();
    if (el) el.classList.remove('hungry');
    d.ghost.remove();
    if (!d.moved) return;              // a tap on the icon is just a tap
    _blockCardClick = Date.now() + 400; // …but a drag must not also open the editor
    if (nearPear(e) && state.products[d.idx]) markUsed(d.idx);   // chomp + undo toast
  };
  ['pointerup', 'pointercancel'].forEach(ev => listEl.addEventListener(ev, end));
})();

// ─── INIT ────────────────────────────────────────────────────────
// Seed the price book once from whatever's already in the fridge, so the
// "where it's cheapest" insights and the going-rate hint aren't blank on the
// first run after this update.
if (!Object.keys(state.priceBook || {}).length) {
  for (const p of state.products) recordPrice(p.name, p.store, p.price);
  if (Object.keys(state.priceBook || {}).length) saveState();
}
setTheme(currentTheme);
relocateSettings();   // move theme/language/currency into the Settings panel
restoreSession();     // revalidate a saved account session + pull cloud data
buildAccentSwatches();
applyColorMode();
buildBgSwatches();
applyBackground(currentBg);
applySeason();   // seasonal outfit for today's date
applySky();      // day/night sky behind him
maybeNewYear();  // fireworks if it's New Year
waveHi();   // greet on open
scheduleBlink();
scheduleYawn();
scheduleIdle();
scheduleNapCheck();
scheduleBee();
// Long-press the pear → love reaction (the click that may follow is swallowed).
// Swipe ACROSS him → flip to his next/previous fact, the same left/right
// language the fridge cards use. A swipe cancels both the cuddle and the poke.
// One swipe = flip to his next/previous fact (decided on release, same
// left/right language as the fridge cards). Back-and-forth strokes while the
// finger is down = PETTING. Any real movement cancels the long-press cuddle,
// and every gesture swallows the trailing click so it isn't also a poke.
(() => {
  const el = document.getElementById('pearIcon');
  if (!el) return;
  let sx = 0, sy = 0, down = false, lastX = 0, dir = 0, turns = 0, moved = false, petted = false;
  el.addEventListener('pointerdown', e => {
    down = true; sx = lastX = e.clientX; sy = e.clientY;
    dir = 0; turns = 0; moved = false; petted = false;
    clearTimeout(_pressTimer);
    _pressTimer = setTimeout(pearLove, 550);
  });
  el.addEventListener('pointermove', e => {
    if (!down) return;
    if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) {
      moved = true;
      clearTimeout(_pressTimer);   // a moving hand isn't a long-press cuddle
    }
    const step = e.clientX - lastX;
    if (Math.abs(step) > 6) {
      const d = step > 0 ? 1 : -1;
      if (dir && d !== dir) turns++;
      dir = d;
      lastX = e.clientX;
      if (!petted && turns >= 3) {
        petted = true;
        _suppressPoke = true;
        setTimeout(() => { _suppressPoke = false; }, 700);
        pearPet();
      }
    }
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    el.addEventListener(ev, e => {
      if (!down) return;
      down = false;
      clearTimeout(_pressTimer);
      const ex = typeof e.clientX === 'number' && e.clientX ? e.clientX : lastX;
      const ey = typeof e.clientY === 'number' && e.clientY ? e.clientY : sy;
      const dx = ex - sx;
      if (!petted && moved && Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(ey - sy)) {
        _suppressPoke = true;                       // this gesture isn't a poke
        setTimeout(() => { _suppressPoke = false; }, 700);
        const tips = pearTips();
        if (!tips.length) return;
        if (_tipIdx < 0) _tipIdx = 0;
        _tipIdx = (_tipIdx + (dx > 0 ? 1 : -1) + tips.length) % tips.length;
        const tip = tips[_tipIdx];
        pearReact('wiggle', null, tip.e, 700);
        pearSay(tip.t, tip.a);
        clearTimeout(_tipReset);
        _tipReset = setTimeout(() => { _tipIdx = -1; }, 12000);
      }
    }));
})();
setTimeout(() => pearSay(l(greetKey())), 750);   // time-of-day hello, after the wave
setTimeout(maybeStreakDance, 3400);   // streak-grew dance, after the hello bubble clears
setTimeout(dailyBriefing, 5200);      // …then the day's briefing, if there is one
setTimeout(maybeAnniversary, 7200);   // 🎈 on the app's birthday
setTimeout(maybeHolidayEgg, 8200);    // holiday cameo -> secret date egg
setTimeout(housePull, 2600);          // the household's list, if one is linked
render(currentLang);
applyNotifPref();
maybeNotifyExpiring();   // surface expiring food on open (if permission granted)
// Re-register for server pushes on every open: refreshes the soonest-expiry
// timestamp and heals a subscription the browser may have rotated.
if (notifsEnabled && 'Notification' in window && Notification.permission === 'granted') {
  setTimeout(enablePush, 3500);
}
// Freshness is only recomputed on render, so an installed PWA left open
// overnight would keep yesterday's badges/mood (and never fire the daily
// notification again). Roll it over when the app comes back into view and
// at least hourly — unless the user is mid-typing in a field that a
// re-render would wipe.
function refreshLiveFreshness() {
  const ae = document.activeElement;
  if (ae && ae.matches && ae.matches('input, textarea, select')) return;
  renderContent();
  maybeNotifyExpiring();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshLiveFreshness(); });
setInterval(() => { if (!document.hidden) refreshLiveFreshness(); }, 36e5);
_ready = true;   // from here on, user restyles make him spin
// Seed the celebrated level to wherever the player already is, so existing
// XP never triggers a level-up storm on first open after this update.
state.lvlSeen = Math.max(state.lvlSeen || 1, playerLevel());
// Home-screen app shortcuts (manifest → long-press the icon): launching via
// ?do=add|scan|expiring jumps straight to that action, then strips the
// param so a plain reload is a normal open.
let _shortcutAct = null;
try { _shortcutAct = new URLSearchParams(location.search).get('do'); } catch {}
if (_shortcutAct) {
  try { history.replaceState(null, '', location.pathname); } catch {}
  setTimeout(() => {
    try {
      if (_shortcutAct === 'add') addProductManually();
      else if (_shortcutAct === 'scan') openScanner();
      else if (_shortcutAct === 'expiring') {
        switchTab('home', document.getElementById('tab-home'));
        setFridgeFilter('expiring');
      }
    } catch {}
  }, 350);
}
// First open with an empty fridge → the pear gives the tour. Existing
// users aren't interrupted; they can replay it from Settings → Guide. A
// shortcut launch skips it so we don't cover the action the user asked for.
// First run: the welcome gate (agreement + account) comes first; it hands off
// to the guide. Only a genuinely empty, un-onboarded launch is interrupted.
if (!_shortcutAct && !state.products.length) {
  if (!localStorage.getItem('kulpio-agreed')) setTimeout(openWelcome, 700);
  else if (!localStorage.getItem('kulpio-toured')) setTimeout(openTour, 900);
}
// Emailed reset / verify links (?reset= / ?verify=) — after the shell is up.
setTimeout(handleAuthLinks, 500);
// Esc closes any open overlay (extra way to leave a recipe).
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAllOverlays();
    return;
  }
  // Enter / Space activate non-native clickables (tabs, product rows) so the
  // app is fully keyboard-operable. Skip when focus is on a real control
  // (button/link/field) which already handles its own keyboard activation.
  if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof Element) {
    if (e.target.closest('button, a, input, select, textarea')) return;
    const hit = e.target.closest('.tab, .prod-item');
    if (hit) { e.preventDefault(); hit.click(); }
  }
});
// ── SWIPE ACTIONS on fridge cards ────────────────────────────────
// Right = used it ✅, left = wasted it 🗑️ — the fastest daily loop, and the
// undo toast makes a mis-swipe recoverable. Delegated to the (permanent)
// list container so it survives re-renders; touch-action:pan-y keeps
// vertical scrolling native while horizontal drags come to us.
(() => {
  const listEl = document.getElementById('productList');
  if (!listEl) return;
  let sw = null;            // current gesture
  let blockClickUntil = 0;  // a swipe must not fire the card's edit click
  listEl.addEventListener('pointerdown', e => {
    const card = e.target.closest('.prod-item');
    // .pgrab starts a feed-drag, not a swipe — the two gestures must not both claim it.
    if (!card || !card.dataset.idx || e.target.closest('.prod-del') || e.target.closest('.pgrab')) return;
    sw = { card, wrap: card.parentElement, x: e.clientX, y: e.clientY, dx: 0, active: false, id: e.pointerId };
  });
  listEl.addEventListener('pointermove', e => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.active) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        sw.active = true;
        try { sw.card.setPointerCapture(e.pointerId); } catch {}
        sw.card.classList.add('swiping');
      } else if (Math.abs(dy) > 12) { sw = null; return; }   // it's a scroll
    }
    if (sw && sw.active) {
      sw.dx = dx;
      sw.card.style.transform = `translateX(${dx}px)`;
      sw.wrap.classList.toggle('sw-right', dx > 24);
      sw.wrap.classList.toggle('sw-left', dx < -24);
    }
  });
  const endSwipe = () => {
    if (!sw) return;
    const s = sw; sw = null;
    if (!s.active) return;
    blockClickUntil = Date.now() + 400;
    s.card.classList.remove('swiping');
    const w = s.card.offsetWidth;
    const idx = parseInt(s.card.dataset.idx, 10);
    // Threshold scales with card width but is capped so a wide (desktop) card
    // doesn't demand an absurd 400px drag to register a swipe.
    if (Math.abs(s.dx) > Math.min(Math.max(90, w * 0.33), 170) && !isNaN(idx) && state.products[idx]) {
      // Past the threshold: fly out, then record the action (which re-renders).
      s.card.style.transition = 'transform .18s ease-out,opacity .18s';
      s.card.style.transform = `translateX(${s.dx > 0 ? w : -w}px)`;
      s.card.style.opacity = '0';
      const used = s.dx > 0;
      setTimeout(() => { used ? markUsed(idx) : markWasted(idx); }, 170);
    } else {
      // Not far enough — spring back.
      s.card.style.transition = 'transform .18s';
      s.card.style.transform = '';
      s.wrap.classList.remove('sw-left', 'sw-right');
      setTimeout(() => { s.card.style.transition = ''; }, 220);
    }
  };
  listEl.addEventListener('pointerup', endSwipe);
  listEl.addEventListener('pointercancel', endSwipe);
  // Swallow the click that follows a completed drag (capture phase beats
  // the card's inline onclick).
  listEl.addEventListener('click', e => {
    if (Date.now() < blockClickUntil) { e.stopPropagation(); e.preventDefault(); }
  }, true);
})();

// Tapping anywhere outside the filter menu closes it.
document.addEventListener('click', e => {
  const m = document.getElementById('filterMenu');
  if (m && m.classList.contains('show') && e.target instanceof Element
      && !e.target.closest('#filterMenu, #filterBtn')) m.classList.remove('show');
});
// Enter anywhere in the product form saves it — no reaching for the button.
document.getElementById('productModal').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target instanceof Element && e.target.matches('input')) {
    e.preventDefault();
    saveProductManual();
  }
});
// ── ALWAYS-FRESH ON OPEN ──────────────────────────────────────────
// An installed PWA otherwise keeps running whatever service worker it first
// cached, so new versions stay invisible until a manual refresh. Here we
// re-check for a new worker every time the app is opened or brought back to
// the front; when one activates (the SW calls skipWaiting), the browser fires
// controllerchange and we reload once — so opening the app always lands you on
// the latest build. The first-ever install doesn't trigger this (there was no
// prior controller to replace), so cold starts don't double-load.
if ('serviceWorker' in navigator) {
  const startedControlled = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !startedControlled) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('./service-worker.js').then(reg => {
    const checkForUpdate = () => { if (navigator.onLine) { try { reg.update(); } catch {} } };
    checkForUpdate();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
    window.addEventListener('focus', checkForUpdate);
  }).catch(() => {});
}
