// Source section: 02-ui-products.js
function setProfileTab(tab, button) {
  document.querySelectorAll('.profile-pane').forEach(p => p.hidden = p.id !== 'profilePane-' + tab);
  document.querySelectorAll('.profile-tab').forEach(b => {
    const active = b === button;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}
// ─── RENDER ──────────────────────────────────────────────────────
function render(lang) {
  const t = T[lang] || T.en;
  const isRTL = lang === 'ar' || lang === 'he';

  // Language selector sync
  const sel = document.getElementById('langSelect');
  if (sel) sel.value = lang;

  // Currency selector sync
  const curSel = document.getElementById('currencySelect');
  if (curSel) curSel.value = currentCurrency;

  // Tagline
  document.getElementById('tagline').textContent = t.tagline;

  // RTL — set the dir attribute (not just CSS direction) so [dir=rtl] style
  // overrides can mirror the slide-in panels for Arabic/Hebrew.
  const dir = isRTL ? 'rtl' : 'ltr';
  document.getElementById('phone').style.direction = dir;
  document.getElementById('phone').setAttribute('dir', dir);
  document.body.setAttribute('dir', dir);

  // Localize the native date picker (format + calendar popup) to the
  // selected language. The <input type="date"> follows the element's
  // lang attribute, so set it to the BCP-47 tag for this language.
  const bcp = speechLang[lang] || lang;
  document.documentElement.setAttribute('lang', bcp);
  const pDate = document.getElementById('pDate');
  if (pDate) pDate.setAttribute('lang', bcp);

  // The food-loop actions (used / froze / wasted / to buy) used to sit in an
  // always-on 4-button strip here. They now live where the hand already is:
  // swipe a card (right = used, left = wasted), tap it to edit/freeze, and the
  // shopping list is one tap away on the floating cart — so Home stays uncluttered.

  // Floating buttons carry their labels as tooltips/aria only. The mini one is
  // the shopping list ("To buy") sitting above the manual-add +.
  const fabAdd = document.getElementById('fabAdd'), fabShop = document.getElementById('fabShop');
  if (fabAdd) { fabAdd.title = l('addManually'); fabAdd.setAttribute('aria-label', l('addManually')); }
  if (fabShop) { fabShop.title = l('cBuy'); fabShop.setAttribute('aria-label', l('cBuy')); }

  // Nav tabs (use nav[0..3] from T)
  const navKeys = ['home','coupons','deals','profile'];
  const tNav = t.nav || T.en.nav;
  navKeys.forEach((k, i) => {
    const node = document.getElementById('nav-' + k);
    if (node) node.textContent = k === 'deals' ? l('navDiscover') : k === 'coupons' ? l('navCoupons') : (tNav[i] || T.en.nav[i]);
  });
  // The scan button is icon-only — its name lives in the aria-label.
  const scanBtn = document.querySelector('.scan-center');
  if (scanBtn) scanBtn.setAttribute('aria-label', l('scan'));
  const gsBtn = document.getElementById('gsBtn');
  if (gsBtn) { gsBtn.title = l('scanSearchPh'); gsBtn.setAttribute('aria-label', l('scanSearchPh')); }

  // Fridge label: the hero gauge carries it on Home, other tabs set their own.
  const fridgeLabel = document.getElementById('fridgeLabel');
  if (fridgeLabel && currentTab === 'home') fridgeLabel.textContent = '';

  // Modal labels
  document.getElementById('modalTitleText').textContent = l('addProduct');
  document.getElementById('pName').placeholder = l('productName');
  document.getElementById('pBrand').placeholder = l('brandLbl');
  document.getElementById('pStore').placeholder = l('whereFrom');
  const pb = document.getElementById('pPhotoBtn');
  if (pb) { pb.title = l('photoLbl'); pb.setAttribute('aria-label', l('photoLbl')); }
  const locLbl = document.getElementById('pLocLbl');
  if (locLbl) locLbl.textContent = l('locLbl');
  syncLocSeg();   // relabel the place buttons in the new language
  document.getElementById('pPrice').placeholder = l('priceOpt') + ' (' + curSym() + ')';
  document.getElementById('pQty').placeholder = l('qtyLbl');
  { const e = document.getElementById('pScanDateLbl'); if (e) e.textContent = l('scanDate'); }
  { const pm = document.getElementById('pMore'); if (pm) setAddMore(pm.style.display !== 'none'); }
  document.getElementById('btnCancelModal').textContent = l('cancel');
  document.getElementById('btnSaveModal').textContent = l('save');
  const bDel = document.getElementById('btnDeleteModal');
  bDel.textContent = '🗑 ' + l('deleteItem');
  bDel.setAttribute('aria-label', l('deleteItem'));
  document.getElementById('multiTitle').textContent = l('multiAdd');
  document.getElementById('multiText').placeholder = l('multiAddPh');
  document.getElementById('btnCancelMulti').textContent = l('cancel');
  document.getElementById('btnAddMulti').textContent = l('addAll');

  // Settings panel labels
  const setTxt = (id, key) => { const n = document.getElementById(id); if (n) n.textContent = l(key); };
  setTxt('setTitle', 'settings');
  setTxt('setTheme', 'theme');
  setTxt('setAccent', 'accent');
  setTxt('setBg', 'background');
  const ccl = document.querySelector('#accentSwatches .custom');
  if (ccl) { ccl.title = l('accentCustom'); ccl.setAttribute('aria-label', l('accentCustom')); }
  const bpt = document.querySelector('#bgSwatches .bg-photo');
  if (bpt) { bpt.title = l('bgPhoto'); bpt.setAttribute('aria-label', l('bgPhoto')); }
  setTxt('setMoodTheme', 'moodTheme');
  syncMoodToggle();
  setTxt('setDark', 'themeDark');
  setTxt('setLight', 'themeLight');
  setTxt('setLang', 'language');
  setTxt('setCurr', 'currency');
  setTxt('setNotif', 'notifications');
  renderAllergenPicker();   // chip names are localized (picker now on Profile)
  setTxt('menuClear', 'clearAll');
  setTxt('menuGuide', 'menuGuide');
  setTxt('menuAbout', 'about');
  setTxt('menuRefresh', 'menuRefresh');
  setTxt('menuDemo', 'demoExit');
  const demoRow = document.getElementById('demoRow');
  if (demoRow) demoRow.style.display = demoActive() ? '' : 'none';
  renderHouseRow();
  setTxt('setUnits', 'unitsLbl');
  const um = document.querySelector('#unitsSeg [data-u="metric"] .seg-tx');
  const ui = document.querySelector('#unitsSeg [data-u="imperial"] .seg-tx');
  if (um) um.textContent = l('unitMetric');
  if (ui) ui.textContent = l('unitImperial');
  syncUnitsSeg();
  applyNotifPref();

  // Scanner buttons
  document.getElementById('btnCancelScan').textContent = l('cancelScan');
  document.getElementById('btnUploadScan').textContent = l('uploadImg');
  document.getElementById('btnReadLabel').textContent = '🤖 ' + l('readLabel');
  document.getElementById('scanStatus').textContent = l('scanning');
  const scanX = document.getElementById('btnCloseScanX');
  scanX.title = l('cancelScan');
  scanX.setAttribute('aria-label', l('cancelScan'));

  // Notifications panel
  document.getElementById('notifTitle').textContent = l('notifTitle');

  renderContent();
  // The pear's floating briefing card and speech bubble are built once, in the
  // language that was live at the time — a language switch must dismiss them so
  // they never linger in the old tongue (they reappear, translated, on the next
  // trigger). renderContent() above already rebuilt everything else.
  closePearBrief();
  hidePearBubble();
}

let _contentRenderSeq = 0;
function setLang(lang) {
  currentLang = lang;
  saveState(false); // a preference change is local; do not sync the fridge blob
  render(lang);
}

function setCurrency(code) {
  currentCurrency = code;
  saveState(false);
  render(currentLang);
}

function setTheme(theme, btn) {
  const prev = currentTheme;
  currentTheme = theme;
  saveState(false);
  if (_ready && prev !== theme) pearReact('wiggle', null, theme === 'light' ? '☀️' : '🌙', 1200);
  document.getElementById('phone').className = 'phone ' + theme;
  document.querySelectorAll('#themeSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  // Keep the mobile status-bar tint in sync with the active theme.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F1F8E9' : '#12251A');
  // The <body> shows as letterboxing beside the max-520px phone on wide screens
  // and behind overscroll; keep it matching the theme so a light app never sits
  // in a dark frame (and vice versa).
  // Match the app's own --bg so on desktop the side margins blend seamlessly
  // into the app instead of framing it in a contrasting void.
  document.body.style.background = theme === 'light' ? '#F5F6F3' : '#151A17';
  // Re-derive the accent tokens for the new mode — the same accent may need
  // a visibility nudge in dark that it doesn't need in light (and vice versa).
  applyColorMode();
}

// ─── ACCENT COLOUR ───────────────────────────────────────────────
// Preset fruit accents; the last swatch is a custom colour picker.
const ACCENTS = [
  ['#6E9E80', 'Sage'], ['#5B93B8', 'Blueberry'], ['#8A7BC8', 'Grape'],
  ['#C86E93', 'Berry'], ['#CC6B5A', 'Tomato'], ['#C79256', 'Carrot'], ['#C7A94A', 'Lemon'],
];
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function relLum([r, g, b]) {
  const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function darken([r, g, b], f) { return [r, g, b].map(v => Math.round(v * (1 - f))); }
function mixRgb(rgb, target, f) { return rgb.map((v, i) => Math.round(v + (target[i] - v) * f)); }
// Recolour the whole app from a single accent hex. Inline vars on #phone win
// over the .dark/.light class tokens, so this rides on top of either mode.
// The accent is nudged toward visibility for the ACTIVE mode: a near-black
// custom accent would otherwise vanish in dark mode (near-white in light),
// leaving invisible buttons and borders after a theme switch.
function setBrandVars(hex) {
  let rgb = hexToRgb(hex);
  if (rgb.some(isNaN)) rgb = hexToRgb('#8BC34A');
  if (currentTheme === 'light') { while (relLum(rgb) > 0.70) rgb = mixRgb(rgb, [0, 0, 0], 0.12); }
  // In dark mode the accent doubles as the "on/active" fill for toggles and the
  // theme segment; too dark an accent makes an ON switch read as OFF. Lift it to
  // a floor that stays clearly visible over the dark surface (0.14 sits below
  // every preset, so only near-black custom picks are nudged).
  else { while (relLum(rgb) < 0.14) rgb = mixRgb(rgb, [255, 255, 255], 0.12); }
  const eff = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
  const p = document.getElementById('phone');
  p.style.setProperty('--brand', eff);
  p.style.setProperty('--brand-2', `rgb(${darken(rgb, 0.15).join(',')})`);
  // Text on brand: whichever of dark/white actually contrasts more (WCAG ratio).
  const lum = relLum(rgb);
  const darkInk = relLum(hexToRgb('#10240F'));
  const onBrand = (lum + 0.05) / (darkInk + 0.05) >= (1.05) / (lum + 0.05) ? '#10240F' : '#ffffff';
  p.style.setProperty('--on-brand', onBrand);
  p.style.setProperty('--border', `rgba(${rgb.join(',')},0.20)`);
  p.style.setProperty('--border-strong', `rgba(${rgb.join(',')},0.40)`);
}
function markAccentActive(hex) {
  document.querySelectorAll('#accentSwatches .swatch').forEach(s =>
    s.classList.toggle('active', !moodTheme && (s.dataset.accent || '').toLowerCase() === (hex || '').toLowerCase()));
  const ci = document.getElementById('accentCustom');
  if (ci && hex) ci.value = hex;
}
// The pear's mood colour, used to tint the app when "Match freshness" is on.
const MOOD_COLOR = { fresh: '#6E9E80', warn: '#CFA24E', rotten: '#9a8f56' };
function applyMoodTheme() { setBrandVars(MOOD_COLOR[fridgeMood()] || MOOD_COLOR.fresh); }
// Whichever colour source is active right now (mood or the chosen accent).
function applyColorMode() {
  if (moodTheme) applyMoodTheme(); else setBrandVars(currentAccent);
  markAccentActive(currentAccent);
  syncMoodToggle();
}
function syncMoodToggle() {
  const t = document.getElementById('moodThemeToggle');
  if (t) t.checked = moodTheme;
}
function setMoodTheme(on) {
  moodTheme = !!on;
  saveState(false);
  applyColorMode();
}
// Picking an accent opts out of mood-follow so the choice actually shows.
function applyAccent(hex) {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return;
  currentAccent = hex;
  moodTheme = false;
  saveState(false);
  setBrandVars(hex);
  markAccentActive(hex);
  syncMoodToggle();
  pearSpin();
}
function buildAccentSwatches() {
  const wrap = document.getElementById('accentSwatches');
  if (!wrap) return;
  wrap.innerHTML = '';
  ACCENTS.forEach(([hex, name]) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.dataset.accent = hex;
    b.style.background = hex;
    b.title = name;
    b.setAttribute('aria-label', name);
    b.onclick = () => applyAccent(hex);
    wrap.appendChild(b);
  });
  const custom = document.createElement('label');
  custom.className = 'swatch custom';
  custom.title = l('accentCustom');
  custom.setAttribute('aria-label', l('accentCustom'));
  custom.innerHTML = '<span>🎨</span>';
  const input = document.createElement('input');
  input.type = 'color';
  input.id = 'accentCustom';
  input.value = currentAccent;
  input.oninput = e => applyAccent(e.target.value);
  custom.appendChild(input);
  wrap.appendChild(custom);
}

// ─── BACKGROUND ──────────────────────────────────────────────────
// All layers reference theme/accent vars (--bg, --border, --border-strong),
// so each background adapts to the current mode and accent automatically.
const BGS = [
  ['plain',   'var(--bg)', 'Plain'],
  ['glow',    'radial-gradient(100% 70% at 50% -8%, var(--border-strong), transparent 72%), var(--bg)', 'Glow'],
  ['mesh',    'radial-gradient(60% 55% at 12% 8%, var(--border-strong), transparent 60%), radial-gradient(55% 50% at 88% 18%, var(--border), transparent 62%), var(--bg)', 'Mesh'],
  ['dots',    'radial-gradient(var(--border-strong) 1.4px, transparent 1.5px) 0 0 / 22px 22px, var(--bg)', 'Dots'],
  ['stripes', 'repeating-linear-gradient(45deg, var(--border) 0 2px, transparent 2px 15px), var(--bg)', 'Stripes'],
];
function markBgActive(id) {
  document.querySelectorAll('#bgSwatches .bg-swatch').forEach(s =>
    s.classList.toggle('active', s.dataset.bg === id));
}
function applyBackground(id) {
  const p = document.getElementById('phone');
  if (id === 'photo' && currentPhoto) {
    currentBg = 'photo';
    saveState(false);
    // A translucent scrim (color-mix keeps it in step with the active theme)
    // sits over the photo so the UI stays readable.
    const scrim = 'color-mix(in srgb, var(--bg) 55%, transparent)';
    p.style.background = `linear-gradient(${scrim}, ${scrim}), url("${currentPhoto}") center / cover no-repeat`;
    markBgActive('photo');
    pearSpin();
    return;
  }
  const o = BGS.find(b => b[0] === id) || BGS[0];
  currentBg = o[0];
  saveState(false);
  p.style.background = o[1];
  markBgActive(o[0]);
  pearSpin();
}
function refreshPhotoTile() {
  const t = document.querySelector('#bgSwatches .bg-photo');
  if (!t) return;
  t.classList.toggle('has-photo', !!currentPhoto);
  t.style.backgroundImage = currentPhoto ? `url("${currentPhoto}")` : '';
}
// Downscale the chosen photo (a phone shot can be several MB) before storing,
// stepping smaller if it won't fit in localStorage.
function loadPhotoBackground(file) {
  const fr = new FileReader();
  fr.onload = ev => {
    const img = new Image();
    img.onload = () => storeScaledPhoto(img);
    img.onerror = () => alert(l('photoTooBig'));
    img.src = ev.target.result;
  };
  fr.readAsDataURL(file);
}
function storeScaledPhoto(img) {
  for (const [max, q] of [[1280, 0.72], [960, 0.66], [720, 0.6]]) {
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    let data;
    try { data = c.toDataURL('image/jpeg', q); } catch (_) { break; }
    try {
      localStorage.setItem('kulpio-bg-photo', data);
      currentPhoto = data;
      applyBackground('photo');
      refreshPhotoTile();
      return;
    } catch (err) { /* quota exceeded — retry smaller */ }
  }
  alert(l('photoTooBig'));
}
function buildBgSwatches() {
  const wrap = document.getElementById('bgSwatches');
  if (!wrap) return;
  wrap.innerHTML = '';
  BGS.forEach(([id, css, name]) => {
    const b = document.createElement('button');
    b.className = 'bg-swatch';
    b.dataset.bg = id;
    b.style.background = css;
    b.title = name;
    b.setAttribute('aria-label', name);
    b.onclick = () => applyBackground(id);
    wrap.appendChild(b);
  });
  // "Your photo" tile: opens a file picker, shows the chosen image as a thumb.
  const photo = document.createElement('label');
  photo.className = 'bg-swatch bg-photo';
  photo.dataset.bg = 'photo';
  photo.title = l('bgPhoto');
  photo.setAttribute('aria-label', l('bgPhoto'));
  photo.innerHTML = '<span>📷</span>';
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = e => { if (e.target.files && e.target.files[0]) loadPhotoBackground(e.target.files[0]); };
  photo.appendChild(inp);
  wrap.appendChild(photo);
  refreshPhotoTile();
}

function switchTab(name, el) {
  currentTab = name;
  document.querySelectorAll('.tab').forEach(t => {
    const on = t === el;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  // he glances down at the tab you just tapped
  if (el && _ready) {
    const r = el.getBoundingClientRect();
    pearGlance(r.left + r.width / 2, r.top, 650);
  }
  renderContent();
  // Each tab opens at its top — don't inherit the previous tab's scroll position
  // (and tapping the tab you're already on scrolls back up, like a native app).
  const sa = document.getElementById('scrollArea');
  if (sa) sa.scrollTop = 0;
}

// ─── FOOD EMOJIS ─────────────────────────────────────────────────
// One emoji per canonical ingredient in FOOD_SYNONYMS, so a product only gets
// an icon when it CONFIDENTLY maps to a known food (via productToIngredients,
// which handles all 33 languages). Anything unrecognised shows no emoji at all
// — no generic fallback.
const FOOD_EMOJI = {
  milk:'🥛', egg:'🥚', cheese:'🧀', butter:'🧈', yogurt:'🥛', cream:'🥛',
  bread:'🍞', chicken:'🍗', beef:'🥩', pork:'🍖', ham:'🍖', bacon:'🥓',
  sausage:'🌭', fish:'🐟', salmon:'🐟', tuna:'🐟', shrimp:'🦐', rice:'🍚',
  pasta:'🍝', potato:'🥔', tomato:'🍅', onion:'🧅', garlic:'🧄', carrot:'🥕',
  pepper:'🫑', mushroom:'🍄', spinach:'🥬', cucumber:'🥒', corn:'🌽',
  beans:'🫘', apple:'🍎', banana:'🍌', lemon:'🍋', flour:'🌾', sugar:'🍬',
  honey:'🍯', oil:'🫒', chocolate:'🍫', salt:'🧂', water:'💧',
  orange:'🍊', grape:'🍇', strawberry:'🍓', blueberry:'🫐', watermelon:'🍉',
  pineapple:'🍍', peach:'🍑', pear:'🍐', cherry:'🍒', avocado:'🥑', mango:'🥭',
  kiwi:'🥝', coconut:'🥥', lettuce:'🥬', broccoli:'🥦', cabbage:'🥬',
  eggplant:'🍆', zucchini:'🥒', peas:'🫛', ginger:'🫚', chili:'🌶️',
  peanut:'🥜', olive:'🫒', turkey:'🦃', coffee:'☕', tea:'🍵', juice:'🧃',
  wine:'🍷', beer:'🍺',
};
function foodEmoji(name) {
  for (const ing of productToIngredients(name)) if (FOOD_EMOJI[ing]) return FOOD_EMOJI[ing];
  return '';   // unknown product → no icon
}

// ─── PRODUCT PHOTOS (Open Food Facts) ────────────────────────────
// A pack shot makes "Casuta Mea unt" instantly recognisable on the card.
// Photos come from Open Food Facts — a community food database with an
// open, CORS-enabled API (store sites like Linella can't be scraped from a
// browser app). Barcode scans take the scanned product's own photo; typed
// names are searched by text. Results are cached per name ('' = already
// searched, nothing found) so each product costs at most one request.
const _imgCache = safeParse(localStorage.getItem('kulpio-img'), {});
function _imgSave() {
  try {
    const keys = Object.keys(_imgCache);
    if (keys.length > 300) for (const k of keys.slice(0, keys.length - 300)) delete _imgCache[k];
    localStorage.setItem('kulpio-img', JSON.stringify(_imgCache));
  } catch {}
}
async function fetchProductImage(name, brand) {
  const prodKey = String(name || '').trim().toLowerCase();
  if (!prodKey || !navigator.onLine) return;
  // Query chain, most→least specific. The English ingredient translation
  // matters a lot: the database is indexed in English/Romanian, so
  // "casuta mea масло" finds nothing while "casuta mea butter" does.
  const b = String(brand || '').trim().toLowerCase();
  const en = (productToIngredients(name)[0] || '');
  const queries = [...new Set([
    b && `${b} ${prodKey}`,
    b && en && en !== prodKey && `${b} ${en}`,
    prodKey,
  ].filter(Boolean))];
  for (const q of queries) {
    let url;
    if (q in _imgCache) {
      url = _imgCache[q];
    } else {
      const data = await fetchJSON('https://world.openfoodfacts.org/cgi/search.pl?search_terms='
        + encodeURIComponent(q) + '&search_simple=1&action=process&json=1&page_size=3&fields=image_front_small_url', 9000);
      if (!data) return;   // network failure → try again another time, don't cache
      // First hit isn't always photographed — take the first result that is.
      url = ((data.products || []).find(p => p.image_front_small_url) || {}).image_front_small_url || '';
      _imgCache[q] = url;
      _imgSave();
    }
    if (url) { applyProductImage(prodKey, url); return; }
  }
  // The database has nothing — search the actual web through the AI proxy
  // (server-side, so no CORS). Finds shop/marketplace photos of exactly
  // this product ("casuta mea unt" → the real pack from a store listing).
  const proxy = aiProxyUrl();
  if (!proxy) return;
  const wq = queries[0];
  const wk = 'web:' + wq;
  let url = _imgCache[wk];
  if (url === undefined) {
    const r = await postJSON(proxy, { imageSearch: wq }, 15000);
    if (!r) return;
    url = String(r.url || '');
    _imgCache[wk] = url;
    _imgSave();
    }
  if (url) applyProductImage(prodKey, url);
}
// ── INGREDIENT PHOTOS ────────────────────────────────────────────
// Recipe ingredients normally show a food emoji, but the emoji table can't
// cover everything ("pecorino", "tahini", "star anise"…). For those rows we
// pull a real Open Food Facts photo instead of a bare "·", reusing the shared
// _imgCache so each term is fetched at most once. Offline / no hit → the dot
// stays, so nothing ever breaks or blocks.
const INGREDIENT_ALIASES = {
  'vegetable milk': ['oat milk', 'soy milk', 'almond milk'],
  'garlic bulb': ['garlic'], 'hot smoked paprika': ['paprika', 'smoked paprika'],
  'balsamic vinegar': ['balsamic vinegar', 'vinegar'], 'scallions': ['spring onion', 'green onion'],
  'cilantro': ['coriander'], 'cloves': ['clove'], 'brown sugar': ['sugar'],
};
async function ingredientPhoto(term) {
  const q = String(term || '').trim().toLowerCase();
  if (!q || !navigator.onLine) return '';
  const key = 'ing:' + q;
  if (key in _imgCache) return _imgCache[key];
  const candidates = [...new Set([q, ...(INGREDIENT_ALIASES[q] || [])])];
  let url = '';
  for (const candidate of candidates) {
    url = await offIngredientPhoto(candidate);
    if (url) break;
  }
  if (!url) {
    const mealName = (INGREDIENT_ALIASES[q] || [q])[0];
    url = `https://www.themealdb.com/images/ingredients/${encodeURIComponent(mealName)}-Small.png`;
  }
  _imgCache[key] = url;
  _imgSave();
  return url;
}
async function offIngredientPhoto(term) {
  const q = String(term || '').trim().toLowerCase();
  if (!q || !navigator.onLine) return '';
  const key = 'ing:' + q;
  if (key in _imgCache) return _imgCache[key];
  const data = await fetchJSON('https://world.openfoodfacts.org/cgi/search.pl?search_terms='
    + encodeURIComponent(q) + '&search_simple=1&action=process&json=1&page_size=3&fields=image_front_small_url', 9000);
  if (!data) return '';   // network failure → don't cache a miss, retry later
  const url = ((data.products || []).find(p => p.image_front_small_url) || {}).image_front_small_url || '';
  _imgCache[key] = url;
  _imgSave();
  return url;
}
// Fill every emoji-less ingredient row in the open recipe with an OFF photo.
async function fillIngredientPhotos() {
  const slots = [...document.querySelectorAll('.rd-emoji[data-ing]')];
  for (const el of slots) {
    if (!document.body.contains(el)) continue;   // recipe closed while we fetched
    const term = el.dataset.ing;
    let url = '';
    try { url = await ingredientPhoto(term); } catch {}
    if (!url || !document.body.contains(el)) continue;
    const img = new Image();
    img.className = 'rd-photo';
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => { img.replaceWith(el); };   // fall back to the dot
    img.src = url;
    el.replaceWith(img);
  }
}
// The user's OWN photo of the item — the most "real" picture possible, and
// the only guaranteed one for local products no database knows. Scaled to a
// small square JPEG data-URI so a whole fridge of photos stays well inside
// the localStorage quota (~10 KB each).
function fileToThumb(file, size = 112, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const s = Math.min(img.width, img.height);
        const c = document.createElement('canvas');
        c.width = c.height = size;
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', quality));
      } catch (e) { reject(e); }
      finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}
async function onProductPhoto(input) {
  if (!input.files || !input.files[0]) return;
  try {
    document.getElementById('productModal').dataset.img = await fileToThumb(input.files[0]);
    updatePhotoPreview();
  } catch {}
  input.value = '';
}
function updatePhotoPreview() {
  const btn = document.getElementById('pPhotoBtn');
  if (!btn) return;
  const img = document.getElementById('productModal').dataset.img || '';
  btn.innerHTML = img ? `<img src="${esc(img)}" alt="">` : '📷';
}

function applyProductImage(key, url) {
  if (!url) return;
  const p = state.products.find(x => (x.name || '').trim().toLowerCase() === key && !x.img);
  if (!p) return;
  p.img = url;
  saveState();
  // Refresh only the card list — not the whole tab — so an in-focus search
  // field doesn't lose the keyboard.
  const box = document.getElementById('fridgeItems');
  if (box && currentTab === 'home') box.innerHTML = fridgeItemsHtml();
}
function hydrateMissingProductImages() {
  if (!navigator.onLine) return;
  state.products.filter(p => p && !p.img).slice(0, 20).forEach(p => fetchProductImage(p.name, p.brand));
}

// ─── PRODUCT CARDS ───────────────────────────────────────────────
// Share of an item's usual shelf life still ahead (0..1), or null without a
// date. An approximation by design — the denominator is the food's estimated
// life (90 days frozen), so a hand-picked far-off date just reads full.
function itemLifeFrac(p) {
  const days = p.exp ? daysUntil(p.exp) : null;
  if (days == null) return null;
  return Math.max(0, Math.min(1, days / Math.max(p.frozen ? 90 : estimateShelfDays(p.name) || 7, 1)));
}
function productCard(pr, idx) {
  const sub = [];
  if (pr.brand) sub.push(`<b style="font-weight:600">${esc(pr.brand)}</b>`);
  if (pr.store) sub.push(esc(pr.store));
  if (pr.price > 0) {   // (trend marker appended below)
    // ▲/▼ when the last re-buy cost more/less than the time before.
    const prev = parseFloat(pr.prevPrice) || 0, cur = parseFloat(pr.price) || 0;
    // With two recorded points the marker becomes a button opening the chart.
    const chart = ((pr.pHist || []).filter(h => h && h.v > 0).length >= 2);
    const trend = prev > 0 && prev !== cur
      ? (chart
        ? ` <button class="ptrend ${cur > prev ? 'up' : 'dn'}" onclick="event.stopPropagation();openPriceHist(${idx})" title="${esc(l('pHistTitle'))}" aria-label="${esc(l('pHistTitle'))}: ${esc(pr.name)}">${cur > prev ? '▲' : '▼'}</button>`
        : ` <span class="ptrend ${cur > prev ? 'up' : 'dn'}" title="${esc(l('priceWas'))} ${esc(formatPrice(prev))}">${cur > prev ? '▲' : '▼'}</span>`)
      : '';
    // Nowrap so a narrow screen never orphans the ▲/▼ onto its own line.
    sub.push(`<span style="white-space:nowrap"><b style="color:var(--brand-ink);font-weight:600">${esc(formatPrice(pr.price))}</b>${trend}</span>`);
  }
  // Place and pack-state live in the sub row as worded chips; the expiry
  // badge is left to say only the time. (Grid tiles keep the icon-in-badge
  // form — they have no sub row to speak in.)
  if (pr.frozen) sub.push(`❄️ ${esc(l('locFreezer'))}`);
  else if (pr.loc === 'pantry') sub.push(`🥫 ${esc(l('locPantry'))}`);
  if (pr.opened && !pr.frozen) sub.push(`🔓 ${esc(l('openedToggle'))}`);
  if (pr.code) sub.push('<span class="quality-tag" title="Product facts from Open Food Facts">OFF verified data</span>');
  else if (pr.exp) sub.push('<span class="quality-tag" title="Shelf life is based on your date or a Kulpio estimate">Local date / estimate</span>');
  const badge = String(pr.badge || '').replace(/^(?:❄️|🥫|🔓)\s*/u, '');
  // Freshness ring: remaining shelf life drawn as an arc around the item's
  // photo/emoji (activity-ring style). Items without a date keep the plain
  // dot + art — no ring pretending to know something it doesn't.
  const life = itemLifeFrac(pr);
  const emoji = foodEmoji(pr.name);
  const art = pr.img
    ? `<img class="${life == null ? 'pimg' : 'pimg-r'} pgrab" src="${esc(pr.img)}" alt="" loading="lazy" draggable="false" onerror="this.remove()">`
    : emoji ? `<span class="pemoji pgrab" aria-hidden="true">${emoji}</span>` : '';
  const lead = life == null
    ? `<div class="pd ${pr.dot}"></div>${art}`
    : `<span class="pring ${pr.dot}" aria-hidden="true"><svg viewBox="0 0 42 42"><circle class="pr-track" cx="21" cy="21" r="18.6"/><circle class="pr-fill" cx="21" cy="21" r="18.6" pathLength="100" stroke-dasharray="${Math.round(life * 100)} 100"/></svg>${art}</span>`;
  return `<div class="swipe-wrap">
    <div class="swipe-bg" aria-hidden="true"><span>✅</span><span>🗑️</span></div>
    <div class="prod-item${_flashNames.has((pr.name || '').trim().toLowerCase()) ? ' flash' : ''}" data-idx="${idx}" role="button" tabindex="0" aria-label="${esc(pr.name)} — ${esc(pr.badge)}. ${esc(l('editProduct'))}" onclick="editProductPrompt(${idx})">
      ${lead}
      <div style="flex:1;min-width:0">
        <div class="pname">${esc(pr.name)}${(pr.qty || 1) > 1 ? ` <span class="pqty">×${pr.qty}</span>` : ''}</div>
        <div class="pstore">${sub.join(' · ')}</div>
      </div>
      <span class="pbadge ${pr.cls}">${esc(badge)}</span>
    </div>
  </div>`;
}
function schoolModeCard() {
  const goal = localStorage.getItem('kulpio-school-goal') || '';
  if (!goal) return `<div class="sv-card school-card"><div class="card-title">🏫 School & organization mode</div><div class="card-sub">Set a shared food-waste goal for your class, club or team.</div><button type="button" class="mini-btn" style="margin-top:10px" onclick="openSchoolMode()">Set a team goal</button></div>`;
  const saved = Math.max(0, Math.round((impactStats().used || 0)));
  const match = goal.match(/\d+/);
  const target = match ? Math.max(1, parseInt(match[0], 10)) : 30;
  const pct = Math.min(100, Math.round(saved / target * 100));
  return `<div class="sv-card school-card"><div class="card-title">🏫 Team goal</div><div class="card-sub">${esc(goal)}</div><div class="school-progress"><i style="width:${pct}%"></i></div><div class="school-meta"><span>${saved} meals saved</span><b>${pct}%</b></div><button type="button" class="mini-btn" style="margin-top:10px" onclick="openSchoolMode()">Edit goal</button></div>`;
}

// Compact grid tile: photo or big emoji, name, freshness badge. Tap opens
// the editor; swipe actions stay in the list view.
function productCardGrid(pr, idx) {
  const emoji = foodEmoji(pr.name);
  const art = pr.img
    ? `<img class="pgimg pgrab" src="${esc(pr.img)}" alt="" loading="lazy" draggable="false" onerror="this.remove()">`
    : `<span class="pgemoji${emoji ? ' pgrab' : ''}" aria-hidden="true">${emoji || '·'}</span>`;
  return `<div class="pgrid-item" data-idx="${idx}" role="button" tabindex="0" aria-label="${esc(pr.name)} — ${esc(pr.badge)}. ${esc(l('editProduct'))}" onclick="editProductPrompt(${idx})">
      <div class="pd ${pr.dot}"></div>
      ${art}
      <div class="pgname">${esc(pr.name)}${(pr.qty || 1) > 1 ? ` <span class="pqty">×${pr.qty}</span>` : ''}</div>
      <span class="pbadge ${pr.cls}">${esc(pr.badge)}</span>
    </div>`;
}

// ── PRICE HISTORY (sparkline) ────────────────────────────────────
// Every observed price change (re-buy merge, manual price edit) appends to a
// small per-product trail; the ▲/▼ marker opens it as a chart once there are
// two points to draw.
function pushPriceHist(p, v) {
  v = parseFloat(v) || 0;
  if (v <= 0) return;
  p.pHist = p.pHist || [];
  const last = p.pHist[p.pHist.length - 1];
  if (last && last.v === v) return;        // unchanged price → no new point
  p.pHist.push({ d: daysToDateInput(0), v });
  if (p.pHist.length > 12) p.pHist = p.pHist.slice(-12);
}
function priceSparkSvg(hist) {
  const vs = hist.map(h => h.v);
  const min = Math.min(...vs), max = Math.max(...vs);
  const W = 280, H = 72, P = 8;
  const x = i => P + i * (W - 2 * P) / (hist.length - 1);
  const y = v => max === min ? H / 2 : P + (max - v) * (H - 2 * P) / (max - min);
  const pts = hist.map((h, i) => `${x(i).toFixed(1)},${y(h.v).toFixed(1)}`).join(' ');
  // One series, identity color; the delta chip (icon + amount) carries
  // the cheaper/pricier judgement, so the line never signals color-alone.
  return `<svg class="price-spark" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <polyline points="${pts}" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${hist.map((h, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(h.v).toFixed(1)}" r="3.5" fill="var(--brand)"><title>${esc(formatPrice(h.v))}</title></circle>`).join('')}
  </svg>`;
}
function openPriceHist(idx) {
  const p = state.products[idx];
  const hist = p && (p.pHist || []).filter(h => h && h.v > 0);
  if (!hist || hist.length < 2) return;
  const df = new Intl.DateTimeFormat(speechLang[currentLang] || currentLang, { day: 'numeric', month: 'short' });
  const rows = hist.slice().reverse().map(h =>
    `<div class="price-row"><span>${esc(df.format(new Date(h.d + 'T12:00:00')))}</span><b>${esc(formatPrice(h.v))}</b></div>`).join('');
  const d = hist[hist.length - 1].v - hist[0].v;
  const delta = d ? `<div class="price-delta ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'} ${esc(formatPrice(Math.abs(d)))}</div>` : '';
  document.getElementById('priceKicker').textContent = l('pHistTitle');
  document.getElementById('priceTitle').textContent = `${foodEmoji(p.name) || '🏷️'} ${p.name}`;
  document.getElementById('priceBody').innerHTML = priceSparkSvg(hist) + delta + `<div class="price-rows">${rows}</div>`;
  ensureOverlayHistory();
  document.getElementById('priceModal').classList.add('show');
}
function closePriceModal() { document.getElementById('priceModal').classList.remove('show'); }

// ── PRICE INTELLIGENCE ───────────────────────────────────────────
// A local price book: for each food (grouped by its canonical ingredient so
// brands compare), keep a rolling recent average of what it cost at each
// store. Fed from the user's own buys, so "where it's cheapest" works offline
// and without a barcode. Community per-barcode prices stay a separate layer.
function priceKeyOf(name) {
  const ing = productToIngredients(name)[0];
  return (ing || String(name || '').trim().toLowerCase()).trim();
}
function recordPrice(name, store, price) {
  price = parseFloat(price) || 0;
  store = String(store || '').trim();
  const item = priceKeyOf(name);
  if (!item || !store || price <= 0) return;
  state.priceBook = state.priceBook || {};
  const book = state.priceBook[item] || (state.priceBook[item] = { label: capitalize(name.trim()), stores: {} });
  book.label = capitalize(name.trim());   // keep the friendliest/most recent name
  const sk = store.toLowerCase();
  const s = book.stores[sk] || (book.stores[sk] = { store, sum: 0, n: 0 });
  s.store = store;                          // freshest casing
  s.sum += price; s.n += 1;
  if (s.n > 8) { s.sum *= 8 / s.n; s.n = 8; }   // decay so recent prices win
  s.last = price; s.lastDate = daysToDateInput(0);
  const keys = Object.keys(state.priceBook);   // bound the book
  if (keys.length > 80) delete state.priceBook[keys[0]];
}
// Per-item cheapest store, richest comparisons first.
function cheapestInsights() {
  const out = [];
  const book = state.priceBook || {};
  for (const item in book) {
    const b = book[item];
    const stores = Object.values(b.stores || {})
      .map(s => ({ store: s.store, avg: s.n ? s.sum / s.n : 0, n: s.n }))
      .filter(s => s.avg > 0).sort((a, z) => a.avg - z.avg);
    if (!stores.length) continue;
    const best = stores[0], worst = stores[stores.length - 1];
    out.push({ item, label: b.label || capitalize(item), emoji: foodEmoji(b.label || item) || '🏷️',
      best, multi: stores.length > 1, saving: worst.avg - best.avg, obs: stores.reduce((s, x) => s + x.n, 0) });
  }
  out.sort((a, z) => (z.multi - a.multi) || (z.saving - a.saving) || (z.obs - a.obs));
  return out;
}
// ── DEALS & COUPONS TAB ── your saved discount cards + where each food is
// cheapest, built from your own price history. Tap a card to show its barcode.
function couponsHtml() {
  const cards = state.cards || [];
  const cardChips = cards.length
    ? cards.map(c => `<button type="button" class="coupon-card" style="--cc:${esc(c.color || '#3a7d5d')}" onclick="showCard('${esc(c.id)}')">💳 ${esc(c.name || l('cardUnnamed'))}</button>`).join('')
    : `<div class="coupon-empty">${esc(l('cardsEmpty'))}</div>`;
  const insights = cheapestInsights().slice(0, 15);
  const deals = insights.length
    ? insights.map(x => `<div class="coupon-deal">
        <span class="coupon-deal-emo">${x.emoji}</span>
        <span class="coupon-deal-txt"><b>${esc(x.label)}</b><span>${esc(l('couponsCheapAt'))} ${esc(x.best.store || '—')}</span></span>
        ${x.multi && x.saving > 0 ? `<span class="coupon-save">−${esc(formatPrice(x.saving))}</span>` : ''}
      </div>`).join('')
    : `<div class="coupon-empty">${esc(l('couponsDealsEmpty'))}</div>`;
  return `<div class="coupons-wrap">
    <div class="coupon-lbl">💳 ${esc(l('discountCards'))}</div>
    <div class="coupon-cards">${cardChips}<button type="button" class="coupon-add" onclick="openWallet()">＋ ${esc(l('cardAdd'))}</button></div>
    <div class="coupon-lbl">🏷️ ${esc(l('couponsDealsH'))}</div>
    ${deals}
  </div>`;
}
// The cheapest store on file for a food, or null — used to tag shopping items.
function bestStoreFor(name) {
  const b = state.priceBook && state.priceBook[priceKeyOf(name)];
  if (!b) return null;
  const s = Object.values(b.stores || {}).map(x => ({ store: x.store, avg: x.n ? x.sum / x.n : 0 }))
    .filter(x => x.avg > 0).sort((a, z) => a.avg - z.avg)[0];
  return s ? s.store : null;
}
// A quick "usually ≈ X at Store" hint while adding, from the cheapest store on file.
function updatePriceHint(name) {
  const el = document.getElementById('priceHint');
  if (!el) return;
  const b = state.priceBook && state.priceBook[priceKeyOf(name || '')];
  const stores = b ? Object.values(b.stores || {}).map(s => ({ store: s.store, avg: s.n ? s.sum / s.n : 0 }))
    .filter(s => s.avg > 0).sort((a, z) => a.avg - z.avg) : [];
  if (String(name || '').trim().length < 2 || !stores.length) { el.textContent = ''; el.style.display = 'none'; return; }
  el.textContent = '💡 ' + l('priceHintUsual').replace('{price}', formatPrice(stores[0].avg)).replace('{store}', stores[0].store);
  el.style.display = '';
}

// ── PRODUCT HELPERS ──────────────────────────────────────────────
// Build a product from just a name, with an auto-estimated expiry.
function makeProduct(name, store = '', price = 0) {
  const days = estimateShelfDays(name);
  return { name, store, badge: freshnessBadge(days), cls: days <= 1 ? 'br' : days <= 5 ? 'ba' : 'bg', dot: days <= 1 ? 'dr' : days <= 5 ? 'da' : 'dg', price, exp: daysToDateInput(days), loc: 'fridge' };
}
// v142: the 10-item demo cap is gone (the user asked) — nothing refuses an
// add anymore. FRIDGE_COMFY is only the hero gauge's visual scale: a bar
// that reads "well stocked" around 20 items, never a limit.
const FRIDGE_COMFY = 20;
// Adding something already in the fridge refreshes that card (new expiry,
// plus price/store when given) instead of creating a duplicate.
// Returns true when a new card was added, false when an existing one merged.
const _flashNames = new Set();   // refreshed cards pulse on the next render
function mergeOrPush(p) {
  const key = p.name.trim().toLowerCase();
  const ex = state.products.find(x => (x.name || '').trim().toLowerCase() === key);
  if (ex) {
    ex.exp = p.exp; ex.badge = p.badge; ex.cls = p.cls; ex.dot = p.dot;
    ex.qty = (ex.qty || 1) + (p.qty || 1);   // bought another one → count it
    if (p.price > 0) {
      const old = parseFloat(ex.price) || 0;
      if (old > 0 && old !== p.price) ex.prevPrice = old;   // re-bought at a new price → ▲/▼ trend
      if (old > 0 && !ex.pHist) pushPriceHist(ex, old);     // start the trail at the price we knew
      ex.price = p.price;
      pushPriceHist(ex, p.price);
    }
    if (p.store) ex.store = p.store;
    if (p.brand) ex.brand = p.brand;
    if (p.img) ex.img = p.img;
    recordPrice(ex.name, ex.store, ex.price);
    if (p.code) ex.code = p.code;   // a scanned re-buy teaches the card its barcode
    if (p.price > 0) logPriceCloud(ex);   // a priced re-buy is a real observation
    delete ex.frozen;   // a re-bought item is fresh, not still in the freezer
    delete ex.opened;   // …and it's a sealed pack again
    // …but a pantry staple you re-buy still lives in the pantry.
    if (ex.loc === 'freezer') ex.loc = 'fridge';
    _flashNames.add(key);
    houseLogEvent('add', ex.name);
    return false;
  }
  state.products.push(p);
  houseLogEvent('add', p.name);
  return true;
}

// ── FRIDGE SEARCH, FILTER & SORT (Home tab; session-only, resets on reload) ──
let fridgeQuery = '', fridgeFilter = 'all', fridgeSort = 'expiry';
// "Week ahead" strip: 'YYYY-MM-DD' of the tapped day, 'expired', or null.
let fridgeDay = null;
// List ↔ grid presentation of the fridge; sticks across sessions.
let fridgeView = localStorage.getItem('kulpio-view') || 'list';
// One button opens a compact menu holding both the filter and sort choices.
const FILTER_KEYS = { all: 'fAll', expiring: 'fExpiring', fresh: 'fFresh' };
const SORT_KEYS = { expiry: 'sortExpiry', az: 'sortAZ', store: 'sortStore', category: 'sortCat' };

// ── WHERE IT'S KEPT ──────────────────────────────────────────────
// The freezer already existed as the `frozen` flag (it pauses the clock and
// keeps items out of the pear's mood), so `loc` stays in lockstep with it:
// loc 'freezer' ⇔ frozen === true. Everything downstream keeps working.
const LOCS = { fridge: '🧊', freezer: '❄️', pantry: '🥫' };
const LOC_KEYS = { fridge: 'locFridge', freezer: 'locFreezer', pantry: 'locPantry' };
function productLoc(p) { return p.frozen ? 'freezer' : (p.loc === 'pantry' ? 'pantry' : 'fridge'); }
function setProductLoc(p, loc) {
  p.loc = loc;
  p.frozen = loc === 'freezer';
  if (p.frozen) delete p.opened;   // the freezer pauses the opened-pack clock
}
let fridgeLoc = 'all';   // session-only place filter
function setFridgeLoc(v) {
  fridgeLoc = v;
  syncFilterUi();
  const box = document.getElementById('fridgeItems');
  if (box) box.innerHTML = fridgeItemsHtml();
}

// ── FOOD CATEGORIES ──────────────────────────────────────────────
// Category per canonical ingredient (the FOOD_EMOJI keys), so the fridge
// can group like a real one. Frozen items live in the freezer regardless.
const CAT_OF = {};
[['catDairy', ['milk','egg','cheese','butter','yogurt','cream']],
 ['catMeat', ['chicken','beef','pork','ham','bacon','sausage','fish','salmon','tuna','shrimp','turkey']],
 ['catProduce', ['potato','tomato','onion','garlic','carrot','pepper','mushroom','spinach','cucumber','corn','beans','apple','banana','lemon','orange','grape','strawberry','blueberry','watermelon','pineapple','peach','pear','cherry','avocado','mango','kiwi','coconut','lettuce','broccoli','cabbage','eggplant','zucchini','peas','ginger','chili','olive']],
 ['catBakery', ['bread']],
 ['catDrinks', ['coffee','tea','juice','wine','beer','water']],
 ['catPantry', ['rice','pasta','flour','sugar','oil','salt','honey','chocolate','peanut']],
].forEach(([cat, list]) => list.forEach(i => CAT_OF[i] = cat));
const CAT_ORDER = ['catProduce','catDairy','catMeat','catBakery','catDrinks','catPantry','catFrozen','catOther'];
const CAT_EMOJI = { catProduce:'🥕', catDairy:'🥛', catMeat:'🍗', catBakery:'🍞', catDrinks:'🧃', catPantry:'🥫', catFrozen:'❄️', catOther:'🍽️' };
function foodCategory(p) {
  if (p.frozen) return 'catFrozen';
  for (const ing of productToIngredients(p.name)) if (CAT_OF[ing]) return CAT_OF[ing];
  return 'catOther';
}
// ── OPENED-PACK SHELF LIFE ───────────────────────────────────────
// Once a pack is opened its real shelf life shrinks, whatever the label
// says. Days it keeps after opening, per fridge category.
const OPEN_LIFE = { catDairy: 5, catMeat: 3, catProduce: 5, catBakery: 4, catDrinks: 4, catPantry: 45, catOther: 5 };
function openShelfDays(p) { return OPEN_LIFE[foodCategory(p)] || 5; }
function filterMenuHtml() {
  // The place row only earns its space once the fridge actually holds items in
  // more than one place — with everything in the fridge it would filter nothing.
  const places = new Set(state.products.map(productLoc));
  const placeRow = places.size > 1 ? `<div class="fm-title">${esc(l('locFilter'))}</div>
    <div class="fm-row">
      <button class="fchip ${fridgeLoc === 'all' ? 'active' : ''}" data-loc="all" onclick="setFridgeLoc('all')">${esc(l('fAll'))}</button>
      ${Object.entries(LOC_KEYS).filter(([k]) => places.has(k)).map(([k, s]) =>
        `<button class="fchip ${fridgeLoc === k ? 'active' : ''}" data-loc="${k}" onclick="setFridgeLoc('${k}')">${LOCS[k]} ${esc(l(s))}</button>`).join('')}
    </div>` : '';
  return `<div class="fm-title">${esc(l('filterLbl'))}</div>
    <div class="fm-row">${Object.entries(FILTER_KEYS).map(([f, k]) =>
      `<button class="fchip ${fridgeFilter === f ? 'active' : ''}" data-f="${f}" onclick="setFridgeFilter('${f}')">${esc(l(k))}</button>`).join('')}</div>
    ${placeRow}
    <div class="fm-title">${esc(l('sortLbl'))}</div>
    <div class="fm-row">${Object.entries(SORT_KEYS).map(([s, k]) =>
      `<button class="fchip ${fridgeSort === s ? 'active' : ''}" data-s="${s}" onclick="setFridgeSort('${s}')">↕ ${esc(l(k))}</button>`).join('')}</div>
    <div class="fm-title">${esc(l('viewLbl'))}</div>
    <div class="fm-row">
      <button class="fchip ${fridgeView === 'list' ? 'active' : ''}" data-v="list" onclick="setFridgeView('list')">☰ ${esc(l('listView'))}</button>
      <button class="fchip ${fridgeView === 'grid' ? 'active' : ''}" data-v="grid" onclick="setFridgeView('grid')">▦ ${esc(l('gridView'))}</button>
    </div>`;
}
// Set the fridge view from the filter menu; refresh the list and the menu's
// active states in place (the menu stays open, like the filter/sort chips).
function setFridgeView(v) {
  fridgeView = v;
  localStorage.setItem('kulpio-view', fridgeView);
  const box = document.getElementById('fridgeItems');
  if (box) box.innerHTML = fridgeItemsHtml();
  const m = document.getElementById('filterMenu');
  if (m) m.innerHTML = filterMenuHtml();
}
function filterBtnLabel() {
  // A place filter is easy to forget you left on, so the button says so.
  return (fridgeLoc === 'all' ? '⚙ ' : LOCS[fridgeLoc] + ' ') + l(FILTER_KEYS[fridgeFilter]);
}
function toggleFilterMenu() {
  const m = document.getElementById('filterMenu');
  if (m) m.classList.toggle('show');
}
function syncFilterUi() {
  const btn = document.getElementById('filterBtn');
  if (btn) btn.textContent = filterBtnLabel();
  const m = document.getElementById('filterMenu');
  if (m) m.innerHTML = filterMenuHtml();   // refresh active states, keep it open
}
function fridgeItemsHtml() {
  const q = fridgeQuery.trim().toLowerCase();
  const items = state.products.map((p, i) => ({ ...p, _i: i }))
    .filter(p => !q || p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q) || (p.store || '').toLowerCase().includes(q))
    .filter(p => fridgeFilter === 'all' || (fridgeFilter === 'fresh' ? p.cls === 'bg' : p.cls !== 'bg'))
    .filter(p => fridgeLoc === 'all' || productLoc(p) === fridgeLoc)
    .filter(p => !fridgeDay || (fridgeDay === 'expired' ? (p.exp && (daysUntil(p.exp) ?? 1) < 0) : p.exp === fridgeDay))
    .sort((a, b) => {
      if (fridgeSort === 'az') return a.name.localeCompare(b.name);
      if (fridgeSort === 'store') return (a.store || '').localeCompare(b.store || '') || a.name.localeCompare(b.name);
      const d = x => daysUntil(x.exp) ?? 999;
      return d(a) - d(b);
    });
  // Category view: section headers like fridge shelves, soonest-expiring
  // first inside each shelf (the expiry sort above already did that).
  const card = fridgeView === 'grid' ? productCardGrid : productCard;
  let inner;
  if (fridgeSort === 'category' && items.length) {
    const groups = new Map(CAT_ORDER.map(c => [c, []]));
    items.forEach(p => groups.get(foodCategory(p)).push(p));
    inner = '';
    for (const [cat, its] of groups) {
      if (!its.length) continue;
      inner += `<div class="cat-head">${CAT_EMOJI[cat]} ${esc(l(cat))}</div>` + its.map(p => card(p, p._i)).join('');
    }
  } else if (fridgeSort === 'expiry' && fridgeFilter === 'all' && !q && !fridgeDay) {
    // Default view: shelf headers split what needs eating soon from the rest
    // (same ≤2-days rule as the pear's mood). Headers only when both exist.
    const soon = items.filter(p => p.exp && !p.frozen && (daysUntil(p.exp) ?? 99) <= 2);
    const rest = items.filter(p => !soon.includes(p));
    inner = soon.length && rest.length
      ? `<div class="cat-head hot">${esc(l('fExpiring'))} · ${soon.length}</div>` + soon.map(p => card(p, p._i)).join('')
      + `<div class="cat-head">${esc(l('fFresh'))} · ${rest.length}</div>` + rest.map(p => card(p, p._i)).join('')
      : items.map(p => card(p, p._i)).join('');
  } else {
    inner = items.map(p => card(p, p._i)).join('');
  }
  // No in-list add buttons — the floating + handles adding (v95).
  const html = !items.length
    ? `<div style="text-align:center;padding:28px 20px ${fridgeQuery ? '10px' : '20px'};opacity:.5;font-size:13px">${esc(l('noMatches'))}</div>`
      + (fridgeQuery ? `<div style="text-align:center;padding:0 20px 20px">
          <button type="button" class="qadd-chip" style="display:inline-flex" onclick="addSearchedProduct(${jsArg(fridgeQuery)})">➕ ${esc(fridgeQuery)}</button>
        </div>` : '')
    : `<div class="${fridgeView === 'grid' ? 'fridge-grid' : 'fridge-list'}">
        ${inner}
      </div>`;
  _flashNames.clear();   // pulses are one-shot
  return html;
}
// Only the card list re-renders on each keystroke, so the input keeps focus.
const _eggWords = ['kulpio', 'pear', 'hello pear', 'abracadabra', 'magic'];
function onFridgeSearch(v) {
  fridgeQuery = v;
  const box = document.getElementById('fridgeItems');
  if (box) box.innerHTML = fridgeItemsHtml();
  // Secret egg: whisper a magic word into the search box.
  if (_eggWords.includes((v || '').trim().toLowerCase()) && foundEgg('word')) {
    pearReact('spin', null, '✨', 1400);
    pearSay(l('eggWordSay'));
  }
}
function setFridgeFilter(f) {
  fridgeFilter = f;
  syncFilterUi();
  const box = document.getElementById('fridgeItems');
  if (box) box.innerHTML = fridgeItemsHtml();
}
function setFridgeSort(s) {
  fridgeSort = s;
  syncFilterUi();
  const box = document.getElementById('fridgeItems');
  if (box) box.innerHTML = fridgeItemsHtml();
}

// ── "WEEK AHEAD" EXPIRY STRIP (Home tab) ─────────────────────────
// A cell per day for the next 7 days (plus an Expired cell when needed)
// showing what runs out when; tapping a day narrows the list to it.
function weekDayKey(offset) {
  const d = new Date(Date.now() + offset * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function weekCellHtml(key, name, items, urg, today) {
  const emo = items.map(p => foodEmoji(p.name)).filter(Boolean).slice(0, 2).join('');
  const cls = ['wday', key === 'expired' ? 'w-exp' : '', items.length ? urg : 'empty', fridgeDay === key ? 'selected' : '', today ? 'today' : ''].filter(Boolean).join(' ');
  const aria = (today ? l('today') + ', ' : '') + name + ': ' + items.length;
  // A planned dinner (meal planner, Saved recipes) peeks out under the count.
  const meal = key !== 'expired' && mealPlan[key];
  return `<button type="button" class="${cls}" ${items.length ? `onclick="setFridgeDay('${key}')" aria-pressed="${fridgeDay === key}"` : 'disabled'} aria-label="${esc(aria)}${meal ? ' · 📅 ' + esc(meal.title) : ''}">
      <span class="wd-name">${esc(name)}</span>
      <span class="wd-food">${emo || (items.length ? '•' : '·')}</span>
      <span class="wd-count">${items.length || ''}</span>
      ${meal ? `<span class="wd-meal" title="${esc(meal.title)}">📅${meal.emoji || '🍽️'}</span>` : ''}
    </button>`;
}
function weekStripHtml() {
  const expired = state.products.filter(p => p.exp && (daysUntil(p.exp) ?? 1) < 0);
  const byDay = [];
  for (let o = 0; o < 7; o++) {
    const key = weekDayKey(o);
    byDay.push([key, state.products.filter(p => p.exp === key)]);
  }
  // Deselect a day that no longer has items (last one eaten/tossed/edited).
  if (fridgeDay && !(fridgeDay === 'expired' ? expired.length : (byDay.find(([k]) => k === fridgeDay) || [0, []])[1].length)) fridgeDay = null;
  // A fridge with nothing due this week doesn't need the calendar at all.
  if (!expired.length && byDay.every(([, its]) => !its.length)) return '';
  const wdFmt = new Intl.DateTimeFormat(speechLang[currentLang] || currentLang, { weekday: 'short' });
  const cells = expired.length ? [weekCellHtml('expired', l('expired'), expired, 'w-red', false)] : [];
  byDay.forEach(([key, its], o) => {
    // Weekday names for every cell — "today" spelled out overflows in many
    // languages; the first cell is marked as today by colour instead.
    const name = wdFmt.format(new Date(Date.now() + o * 86400000));
    cells.push(weekCellHtml(key, name, its, o <= 1 ? 'w-red' : o <= 5 ? 'w-amber' : '', o === 0));
  });
  // Collapsed by default: the calendar is a planning tool, not something you
  // need in your face every time you open the app. The summary line still
  // tells you how much is due, so folding it away costs no information.
  const due = expired.length + byDay.reduce((n, [, its]) => n + its.length, 0);
  return `<div class="week-strip">
    <button class="week-head" onclick="toggleWeek()" aria-expanded="${weekOpen}" aria-controls="weekDays">
      <span class="wk-t">${esc(l('weekAhead'))}</span>
      <span class="wk-n">${due}</span>
      <span class="wk-chev${weekOpen ? ' open' : ''}" aria-hidden="true">▾</span>
    </button>
    ${weekOpen ? `<div class="week-days" id="weekDays">${cells.join('')}</div>` : ''}
  </div>`;
}
// Remembering the choice matters: someone who uses the planner shouldn't have
// to reopen it every launch, and someone who doesn't never sees it again.
let weekOpen = localStorage.getItem('kulpio-week') === '1';
function toggleWeek() {
  weekOpen = !weekOpen;
  try { localStorage.setItem('kulpio-week', weekOpen ? '1' : '0'); } catch {}
  // Folding the calendar away must also drop the day filter it set, or the
  // list stays narrowed with nothing on screen explaining why.
  if (!weekOpen && fridgeDay) {
    fridgeDay = null;
    const items = document.getElementById('fridgeItems');
    if (items) items.innerHTML = fridgeItemsHtml();
  }
  const box = document.getElementById('weekStrip');
  if (box) box.innerHTML = weekStripHtml();
}
function setFridgeDay(k) {
  fridgeDay = fridgeDay === k ? null : k;
  const strip = document.getElementById('weekStrip');
  if (strip) strip.innerHTML = weekStripHtml();
  const box = document.getElementById('fridgeItems');
  if (box) box.innerHTML = fridgeItemsHtml();
}
// Share the month recap via the native share sheet; copy it when the
// browser has no share sheet (desktop) and let the pear confirm.
function shareRecap() {
  const ev = (state.history || []).filter(e => (e.t || '').startsWith(new Date().toISOString().slice(0, 7)));
  const used = ev.filter(e => e.k === 'used');
  const saved = used.reduce((s, e) => s + (parseFloat(e.price) || 0), 0);
  const mName = capitalize(new Intl.DateTimeFormat(speechLang[currentLang] || currentLang, { month: 'long' }).format(new Date()));
  const text = `🍐 Kulpio · ${mName}\n✅ ${used.length} ${l('recapEaten')}\n🗑️ ${ev.length - used.length} ${l('recapWasted')}`
    + (saved > 0 ? `\n💚 ${formatPrice(saved)}` : '')
    + `\n🔥 ${wasteStreakDays()} ${l('days')}`;
  if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => pearSay('📋 ' + l('recapCopied')), () => {});
}

// ── IMPACT ── the waste-reduction evidence: a summary the user can read and a
// CSV of the raw event log for aggregating an impact study across participants.
function impactStats() {
  const hist = state.history || [];
  const used = hist.filter(e => e.k === 'used');
  const wasted = hist.filter(e => e.k === 'wasted');
  const total = used.length + wasted.length;
  const rate = total ? Math.round(used.length / total * 100) : 0;
  const saved = used.reduce((s, e) => s + (parseFloat(e.price) || 0), 0);
  const lost = wasted.reduce((s, e) => s + (parseFloat(e.price) || 0), 0);
  const days = Math.max(1, Math.floor((Date.now() - new Date((state.firstUse || new Date().toISOString().slice(0, 10)) + 'T00:00:00').getTime()) / 864e5) + 1);
  return { usedN: used.length, wastedN: wasted.length, total, rate, saved, lost, days };
}
// Used vs wasted for the last N ISO weeks (oldest→newest), for the mini chart.
function impactWeeks(n) {
  const wk = {};
  for (const e of (state.history || [])) {
    if (e.k !== 'used' && e.k !== 'wasted') continue;
    const d = new Date((e.t || '') + 'T12:00:00'); if (isNaN(d)) continue;
    const key = weekKey(d);
    (wk[key] = wk[key] || { used: 0, wasted: 0 })[e.k]++;
  }
  const keys = Object.keys(wk).sort().slice(-n);
  return keys.map(k => ({ k, ...wk[k] }));
}
function weekKey(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day);   // Monday
  return t.toISOString().slice(0, 10);
}
function openImpact() {
  document.getElementById('impactTitleT').textContent = l('impactTitle');
  renderImpact();
  ensureOverlayHistory();
  document.getElementById('impactModal').classList.add('show');
}
function closeImpact() { document.getElementById('impactModal').classList.remove('show'); }
function renderImpact() {
  const s = impactStats();
  const weeks = impactWeeks(8);
  const reportMonth = new Intl.DateTimeFormat(speechLang[currentLang] || currentLang, { month: 'long', year: 'numeric' }).format(new Date());
  const generated = new Intl.DateTimeFormat(speechLang[currentLang] || currentLang, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const max = Math.max(1, ...weeks.map(w => w.used + w.wasted));
  const bars = weeks.length ? `<div class="impact-weeks">${weeks.map(w => {
    const uh = Math.round(w.used / max * 60), wh = Math.round(w.wasted / max * 60);
    const lbl = new Intl.DateTimeFormat(speechLang[currentLang] || currentLang, { day: 'numeric', month: 'short' }).format(new Date(w.k + 'T12:00:00'));
    return `<div class="impact-wk"><div class="impact-bar"><i class="ib-w" style="height:${wh}px"></i><i class="ib-u" style="height:${uh}px"></i></div><span>${esc(lbl)}</span></div>`;
  }).join('')}</div>
    <div class="impact-legend"><span><i class="ib-u"></i> ${esc(l('recapEaten'))}</span><span><i class="ib-w"></i> ${esc(l('recapWasted'))}</span></div>` : '';
  document.getElementById('impactBody').innerHTML = s.total ? `
    <div class="impact-report-meta"><b>Monthly impact report</b><span>${esc(reportMonth)} · generated ${esc(generated)}</span></div>
    <div class="impact-sub">${s.days} ${esc(l('lifeDays'))}</div>
    <div class="life-grid" style="margin-bottom:14px">
      <div class="life-tile"><b>${s.rate}%</b><span>♻️ ${esc(l('impactRate'))}</span></div>
      <div class="life-tile"><b>${s.usedN}</b><span>✅ ${esc(l('recapEaten'))}</span></div>
      <div class="life-tile"><b>${s.wastedN}</b><span>🗑️ ${esc(l('recapWasted'))}</span></div>
      <div class="life-tile"><b>${s.saved > 0 ? esc(formatPrice(s.saved)) : '—'}</b><span>💚 ${esc(l('statMoney'))}</span></div>
    </div>
    ${s.lost > 0 ? `<div class="impact-lost">💸 ${esc(l('impactLost'))}: <b>${esc(formatPrice(s.lost))}</b></div>` : ''}
    ${bars}
    <button type="button" class="auth-submit" style="margin-top:14px" onclick="exportImpactCsv()">📄 ${esc(l('impactCsv'))}</button>`
    : `<div class="house-empty">${esc(l('impactEmpty'))}</div>`;
}
// CSV of every logged event — the raw data for an impact study (open in Excel).
function exportImpactCsv() {
  const rows = [['date', 'action', 'item', 'price', 'currency']];
  rows.push(['report_period', new Date().toISOString().slice(0, 7), 'generated_at', new Date().toISOString(), currentCurrency]);
  for (const e of (state.history || [])) rows.push([e.t || '', e.k || '', (e.name || '').replace(/"/g, '""'), (parseFloat(e.price) || 0), currentCurrency]);
  const csv = rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${c}"` : c).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'kulpio-monthly-impact-report.csv';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  if (typeof toast === 'function') toast(l('dataExported'));
}

// The "Money at risk" card jumps straight to the expiring items on Home.
function goRescue() {
  fridgeQuery = '';
  fridgeDay = null;
  fridgeFilter = 'expiring';
  fridgeSort = 'expiry';
  switchTab('home', document.getElementById('tab-home'));
}

// The "Opened" pill lives only in the EDIT modal (a brand-new item is
// sealed by definition). State rides on the modal's dataset so save can
// tell "was already opened" from "just flipped it now".
function syncOpenedBtn(visible) {
  const b = document.getElementById('pOpened');
  if (visible !== undefined) b.style.display = visible ? 'block' : 'none';
  const on = !!document.getElementById('productModal').dataset.opened;
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', on);
  b.textContent = (on ? '🔓 ' : '📦 ') + l('openedToggle');
}
function toggleModalOpened() {
  const m = document.getElementById('productModal');
  m.dataset.opened = m.dataset.opened ? '' : (m.dataset.openedWas || 'new');
  syncOpenedBtn();
}

// ── "MORE DETAILS" fold (product modal) ──────────────────────────
// Brand / where-from / price / quantity hide behind this so the add sheet
// stays light; it opens automatically when editing an item that has them.
function setAddMore(open) {
  const box = document.getElementById('pMore');
  const btn = document.getElementById('pMoreToggle');
  const lbl = document.getElementById('pMoreLbl');
  if (!box || !btn) return;
  box.style.display = open ? '' : 'none';
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (btn.firstChild) btn.firstChild.nodeValue = open ? '－ ' : '＋ ';
  if (lbl) lbl.textContent = open ? l('lessDetails') : l('moreDetails');
}
function toggleAddMore() {
  setAddMore(document.getElementById('pMore').style.display === 'none');
}

// ── "WHERE IS IT?" CONTROL (product modal) ───────────────────────
// The chosen place rides on the modal's dataset until save, like `opened`.
function syncLocSeg(loc) {
  const m = document.getElementById('productModal');
  const seg = document.getElementById('pLocSeg');
  if (!seg) return;
  if (loc) m.dataset.loc = loc;
  const cur = m.dataset.loc || 'fridge';
  seg.innerHTML = Object.entries(LOC_KEYS).map(([k, key]) =>
    `<button type="button" class="loc-btn ${cur === k ? 'on' : ''}" data-loc="${k}" aria-pressed="${cur === k}"
      onclick="syncLocSeg('${k}')">${LOCS[k]}<span>${esc(l(key))}</span></button>`).join('');
  // Freezing from here means the same thing as the freezer sheet: the pack is
  // sealed again and the clock is paused, so "opened" no longer applies.
  const op = document.getElementById('pOpened');
  if (op) op.style.display = (cur === 'freezer' || !m.dataset.editIdx) ? 'none' : 'block';
}

function editProductPrompt(idx) {
  if (Date.now() < _blockCardClick) return;   // that click was the end of a feed-drag
  const p = state.products[idx];
  if (!p) return;
  // He looks over at whatever you just picked up.
  const card = document.querySelector(`.prod-item[data-idx="${idx}"]`);
  if (card && _ready) { const r = card.getBoundingClientRect(); pearGlance(r.left + r.width / 2, r.top, 700); }
  const m = document.getElementById('productModal');
  m.dataset.openedWas = p.opened || '';
  m.dataset.opened = p.opened || '';
  syncOpenedBtn(true);
  document.getElementById('pName').value = p.name;
  document.getElementById('pBrand').value = p.brand || '';
  document.getElementById('brandSugg').innerHTML = '';
  { const m = document.getElementById('pScanDateMsg'); if (m) { m.textContent = ''; m.className = 'scan-date-msg'; } }
  document.getElementById('pStore').value = p.store || '';
  document.getElementById('pPrice').value = p.price || '';
  document.getElementById('pQty').value = (p.qty || 1) > 1 ? p.qty : '';
  // Show the folded fields straight away if this item already uses any of them.
  setAddMore(!!(p.brand || p.store || (p.price > 0) || (p.qty || 1) > 1));
  updatePriceHint(p.name);
  document.getElementById('modalTitleText').textContent = l('editProduct');
  setDateVisible(true);   // editing shows the item's real date
  const dateEl = document.getElementById('pDate');
  document.getElementById('productModal').dataset.editIdx = idx;
  document.getElementById('productModal').dataset.img = p.img || '';
  document.getElementById('btnDeleteRow').style.display = '';
  syncLocSeg(productLoc(p));
  updatePhotoPreview();
  ensureOverlayHistory();
  document.getElementById('productModal').classList.add('show');
  if (p.exp) {
    // Show the item's real saved expiry date; don't silently re-estimate it.
    dateEl.value = p.exp;
    dateEl.dataset.userset = '1';
  } else {
    dateEl.value = '';
    delete dateEl.dataset.userset;
    queueAiEstimate(p.name);   // estimate applies silently on save
  }
}

function removeProduct(idx) {
  const p = state.products[idx];
  if (!p) return;
  const snap = snapshotState();
  state.products.splice(idx, 1);
  recipeCacheKey = '';   // fridge changed → refresh recipe suggestions
  _noCelebrate = true;   // deleting an item isn't a win to celebrate
  saveState();
  renderContent();
  _noCelebrate = false;
  showUndoToast('✖ ' + p.name, snap);   // a mis-tap must be recoverable
}

function actionCard(icon, title, sub, meta, actionId) {
  return `<div class="action-card">
    <div class="card-icon">${icon}</div>
    <div><div class="card-title">${esc(title)}</div><div class="card-sub">${esc(sub)}</div></div>
    <button class="card-meta" onclick="handleAction('${actionId}')">${esc(meta)}</button>
  </div>`;
}

function handleAction(actionId) {
  if (actionId === 'route') window.open('https://maps.google.com/?q=supermarket+near+me', '_blank');
  else if (actionId === 'scan') switchTab('scan', document.querySelector('.scan-center'));   // the tab IS the scanner now
  else if (actionId === 'open') switchTab('profile', document.getElementById('tab-profile'));
}

// ─── SAVINGS TAB ─────────────────────────────────────────────────
// One question first: am I winning? Everything under the hero explains that
// answer — what's still rescuable, where the money goes, whether it's getting
// better. Cards that have nothing to say don't appear at all.
// ── NUTRITION DASHBOARD ──────────────────────────────────────────
// Rough macros for ONE typical serving of each canonical food, [kcal, protein,
// fat, carbs] in grams. Deliberately offline and approximate — a weekly "what
// you ate" gauge, not a food diary. Unknown foods just don't contribute.
const NUTRI = {
  milk:[120,8,5,12], egg:[78,6,5,1], cheese:[110,7,9,1], butter:[72,0,8,0], yogurt:[90,8,4,8], cream:[90,1,9,1],
  bread:[160,6,2,30], chicken:[240,45,5,0], beef:[300,39,15,0], pork:[350,39,21,0], ham:[75,9,4,1], bacon:[160,10,14,0],
  sausage:[230,12,20,2], fish:[200,35,6,0], salmon:[280,34,16,0], tuna:[130,28,1,0], shrimp:[100,20,1,1], turkey:[220,42,5,0],
  rice:[200,4,0,44], pasta:[270,10,2,52], potato:[130,3,0,30], beans:[170,11,1,30], peas:[65,5,0,11], corn:[100,3,1,22],
  tomato:[22,1,0,5], onion:[24,1,0,6], garlic:[10,0,0,2], carrot:[25,1,0,6], pepper:[30,1,0,7], mushroom:[18,2,0,3],
  spinach:[14,2,0,2], cucumber:[16,1,0,4], lettuce:[8,1,0,1], broccoli:[30,3,0,6], cabbage:[22,1,0,5], eggplant:[25,1,0,6],
  zucchini:[17,1,0,3], ginger:[5,0,0,1], chili:[5,0,0,1], olive:[45,0,4,1],
  apple:[95,0,0,25], banana:[105,1,0,27], lemon:[17,1,0,5], orange:[62,1,0,15], grape:[69,1,0,18], strawberry:[33,1,0,8],
  blueberry:[57,1,0,14], watermelon:[45,1,0,11], pineapple:[50,1,0,13], peach:[58,1,0,14], pear:[100,1,0,27], cherry:[63,1,0,16],
  avocado:[160,2,15,9], mango:[100,1,0,25], kiwi:[42,1,0,10], coconut:[140,1,13,6], peanut:[170,7,14,6],
  flour:[110,3,0,23], sugar:[40,0,0,10], honey:[60,0,0,17], oil:[90,0,10,0], chocolate:[160,2,9,18], salt:[0,0,0,0],
  water:[0,0,0,0], coffee:[2,0,0,0], tea:[2,0,0,0], juice:[110,1,0,26], wine:[125,0,0,4], beer:[140,1,0,11],
};
function itemMacros(name) {
  for (const ing of productToIngredients(name)) if (NUTRI[ing]) {
    const [kcal, p, f, c] = NUTRI[ing];
    return { kcal, p, f, c };
  }
  return null;
}
// Aggregate the last 7 days of "used" (eaten) events into macro totals.
function weekMacros() {
  const since = Date.now() - 7 * 864e5;
  const tot = { kcal: 0, p: 0, f: 0, c: 0 };
  const byFood = {};
  let known = 0, total = 0;
  for (const e of state.history || []) {
    if (e.k !== 'used' || !e.name) continue;
    const t = new Date((e.t || '') + 'T12:00:00').getTime();
    if (isNaN(t) || t < since) continue;
    total++;
    const m = itemMacros(e.name);
    if (!m) continue;
    known++;
    tot.kcal += m.kcal; tot.p += m.p; tot.f += m.f; tot.c += m.c;
    const k = (e.name || '').trim().toLowerCase();
    (byFood[k] = byFood[k] || { name: e.name, kcal: 0 }).kcal += m.kcal;
  }
  const top = Object.values(byFood).sort((a, b) => b.kcal - a.kcal).slice(0, 3);
  return { ...tot, known, total, top };
}
function nutriCardHtml() {
  const w = weekMacros();
  if (!w.known) return '';   // nothing eaten (that we can estimate) this week
  const perDay = Math.round(w.kcal / 7), pd = v => Math.round(v / 7);
  // Calorie split across the macros (protein & carbs 4 kcal/g, fat 9 kcal/g).
  const pC = w.p * 4, fC = w.f * 9, cC = w.c * 4, mC = pC + fC + cC || 1;
  const pct = v => Math.round(v / mC * 100);
  const topStr = w.top.map(t => `${foodEmoji(t.name) || '•'} ${esc(capitalize(t.name))}`).join(' · ');
  return `<div class="action-card" style="display:block">
    <div class="card-title" style="margin-bottom:2px">${esc(l('nutriWeek'))}</div>
    <div class="card-sub" style="margin-bottom:12px">${perDay} ${esc(l('kcalDay'))} · ${esc(l('nutriEst'))}</div>
    <div class="nutri-split" aria-hidden="true">
      <span class="ns-p" style="width:${pct(pC)}%"></span>
      <span class="ns-c" style="width:${pct(cC)}%"></span>
      <span class="ns-f" style="width:${pct(fC)}%"></span>
    </div>
    <div class="nutri-legend">
      <span><i class="ns-dot ns-p"></i>${esc(l('protein'))} ${pd(w.p)}g</span>
      <span><i class="ns-dot ns-c"></i>${esc(l('carbs'))} ${pd(w.c)}g</span>
      <span><i class="ns-dot ns-f"></i>${esc(l('fat'))} ${pd(w.f)}g</span>
    </div>
    ${topStr ? `<div class="nutri-top">${topStr}</div>` : ''}
  </div>`;
}

// ── DISCOVER TAB ─────────────────────────────────────────────────
// The community shelf, full-screen: the products most people are scanning
// right now, with their Nutri-Score. Tap one to open its card — ratings and
// the prices others paid load there. Fetched async into the shell below.
// Seeded starter content so Discover is never empty, even offline / day one.
const DISCOVER_RECIPES = [
  { title: 'Spaghetti alla Carbonara', emoji: '🍝' }, { title: 'Vegetable Stir Fry', emoji: '🥦' },
  { title: 'Banana Pancakes', emoji: '🥞' }, { title: 'Greek Salad', emoji: '🥗' },
  { title: 'Tomato Soup', emoji: '🍅' }, { title: 'Cheese Omelette', emoji: '🍳' },
  { title: 'Chicken Ramen', emoji: '🍜' }, { title: 'Beef Tacos', emoji: '🌮' },
  { title: 'Chicken Curry', emoji: '🍛' }, { title: 'Margherita Pizza', emoji: '🍕' },
  { title: 'Garlic Butter Shrimp', emoji: '🍤' }, { title: 'Falafel Wrap', emoji: '🥙' },
  { title: 'Hearty Beef Stew', emoji: '🍲' }, { title: 'Egg Fried Rice', emoji: '🍚' },
  { title: 'Roast Chicken', emoji: '🍗' }, { title: 'Baked Salmon', emoji: '🐟' },
  { title: 'Mushroom Risotto', emoji: '🍄' }, { title: 'Caesar Salad', emoji: '🥬' },
  { title: 'Beef Burrito', emoji: '🌯' }, { title: 'Classic Apple Pie', emoji: '🥧' },
  { title: 'Avocado Toast', emoji: '🥑' }, { title: 'Pumpkin Soup', emoji: '🎃' },
  { title: 'Chocolate Chip Cookies', emoji: '🍪' }, { title: 'Veggie Buddha Bowl', emoji: '🥗' },
];
// A curated set of REAL Open Food Facts products (real barcodes, real photos,
// real Nutri-Score) so the top of the leaderboard shows genuine product images
// instead of emoji. Loaded live from OFF's CDN with an emoji fallback offline.
const OFFIMG = c => `https://images.openfoodfacts.org/images/products/${c}`;
// Five real seed products, all with a real OFF photo — the shelf shows exactly
// these (ranked by scans) on a young deploy. Real community scans (each carrying
// its own photo) merge in above and can grow the list past 20.
const DISCOVER_FEATURED = [
  { name: 'Coca-Cola', grade: 'e', emoji: '🥤', code: '5449000000996', img: OFFIMG('544/900/000/0996/front_en.1107.200.jpg') },
  { name: 'Nutella', grade: 'e', emoji: '🍫', code: '3017620422003', img: OFFIMG('301/762/042/2003/front_en.879.200.jpg') },
  { name: 'Nesquik', grade: 'd', emoji: '🍫', code: '3033710065967', img: OFFIMG('303/371/006/5967/front_en.472.200.jpg') },
  { name: 'Barilla Pasta', grade: 'a', emoji: '🍝', code: '8076809513692', img: OFFIMG('807/680/951/3692/front_en.204.200.jpg') },
  { name: 'Sparkling Water', grade: 'a', emoji: '💧', code: '3068320123264', img: OFFIMG('306/832/012/3264/front_fr.100.200.jpg') },
];
// Deterministic per-name scan count (~120–900) so the seeded fallback reads like
// a real early-stage community — honest hundreds, not implausible tens of
// thousands. Real usage from the worker's scanTop overrides this once it exists.
function seededScans(name) {
  let h = 2166136261; const s = String(name);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 120 + (h >>> 0) % 780;
}
function openDiscRecipe(i) {
  const r = DISCOVER_RECIPES[i];
  if (r) openRecipeDetail({ title: r.title, emoji: r.emoji, source: 'TheMealDB' });
}
function scrollDiscRecipes(direction) {
  const rail = document.getElementById('discRecipes');
  if (!rail) return;
  rail.scrollBy({ left: direction * Math.max(rail.clientWidth * 0.78, 260), behavior: 'smooth' });
}
async function hydrateDiscoverRecipeImages() {
  if (!navigator.onLine) {
    document.querySelectorAll('.disc-recipe[data-recipe-title]').forEach(tile => tile.remove());
    return;
  }
  const tiles = [...document.querySelectorAll('.disc-recipe[data-recipe-title]')];
  await Promise.all(tiles.map(async tile => {
    const title = tile.dataset.recipeTitle;
    if (!title || tile.querySelector('img')) return;
    const data = await fetchJSON('https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(title), 9000);
    const image = data?.meals?.[0]?.strMealThumb;
    if (!image || !document.body.contains(tile)) { if (document.body.contains(tile)) tile.remove(); return; }
    const old = tile.querySelector('.disc-recipe-emo');
    if (!old) { tile.remove(); return; }
    const img = document.createElement('img');
    img.className = 'disc-recipe-photo';
    img.alt = title;
    img.loading = 'lazy';
    img.src = image;
    img.onerror = () => tile.remove();
    old.replaceWith(img);
  }));
}
function discPopRow(t, i, seeded) {
  const g = String(t.grade || '').toLowerCase();
  const users = parseInt(t.users, 10) || parseInt(t.n, 10) || 1;
  const meta = esc(l('discScans').replace('{n}', users.toLocaleString()));
  const tappable = !seeded && t.code;
  const tap = tappable ? ` onclick="openPopular(${jsArg(t.code)})"` : '';
  const emo = t.emoji || foodEmoji(t.name) || '🛒';
  // Real Open Food Facts product photo when we have one, with the emoji as a
  // graceful fallback (offline, or if the image 404s).
  const icon = t.img
    ? `<img class="disc-photo" src="${esc(t.img)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'disc-emoji',textContent:'${emo}'}))">`
    : `<span class="disc-emoji">${emo}</span>`;
  return `<button class="disc-row"${tap}${tappable ? '' : ' style="cursor:default"'}>
    <span class="disc-rank">${i + 1}</span>
    ${icon}
    <span class="disc-info"><span class="disc-name">${esc(t.name)}</span><span class="disc-meta">${meta}</span></span>
    ${/^[a-e]$/.test(g) ? `<span class="alt-grade g-${g}">${g.toUpperCase()}</span>` : ''}
    ${tappable ? '<span class="disc-chev">›</span>' : ''}
  </button>`;
}
function discoverShellHtml() {
  return `<div class="panel-grid disc-wrap">
    <div class="disc-head">
      <div class="sv-kicker">🧭 ${esc(l('discTitle'))}</div>
      <div class="disc-sub">${esc(l('discSub'))}</div>
    </div>
    <div class="disc-lbl">🍳 ${esc(l('discRecipesH'))}</div>
    <div class="disc-recipe-rail"><button type="button" class="disc-recipe-nav" aria-label="Previous recipes" onclick="scrollDiscRecipes(-1)">‹</button><div class="disc-recipes" id="discRecipes">${DISCOVER_RECIPES.map((r, i) =>
      `<button class="disc-recipe" data-recipe-title="${esc(r.title)}" onclick="openDiscRecipe(${i})"><span class="disc-recipe-emo">${r.emoji}</span><span class="disc-recipe-t">${esc(r.title)}</span></button>`).join('')}</div>
      <button type="button" class="disc-recipe-nav" aria-label="More recipes" onclick="scrollDiscRecipes(1)">›</button></div>
    <div class="disc-lbl">🔥 ${esc(l('discPopH'))}</div>
    <div id="discList"><div class="disc-loading">${esc(l('discLoading'))}</div></div>
  </div>`;
}
async function fillDiscover() {
  const box = document.getElementById('discList');
  if (!box) return;
  const url = aiProxyUrl();
  let top = _popCache;
  if (url && (!top || Date.now() - _popAt > 600000)) {
    const r = await postJSON(url, { scanTop: 1 }, 10000);
    top = (r && Array.isArray(r.top)) ? r.top.filter(x => x && x.code && x.name) : null;
    if (top) { _popCache = top; _popAt = Date.now(); }
  }
  const el = document.getElementById('discList');
  if (!el || currentTab !== 'deals') return;   // tab changed while we fetched
  // Always show a FULL leaderboard, in every build — not just the demo. Real
  // community rows (genuinely scanned) come first, then the seeded shelf is
  // padded in and deduped, so Discover is never a lonely row or two on a young
  // deploy and never empty offline / on day one.
  const real = (top || []).map(t => ({ ...t, _real: true }));
  const seenC = new Set(real.map(t => String(t.code || '')));
  const seenN = new Set(real.map(t => String(t.name || '').toLowerCase()));
  const seed = DISCOVER_FEATURED
    .filter(p => !seenC.has(String(p.code || '')) && !seenN.has(String(p.name || '').toLowerCase()))
    .map(p => ({ ...p, users: seededScans(p.name) }))
    .sort((a, b) => b.users - a.users);   // ranked by scans
  // Real community scans (each with its own photo) on top, then the seed —
  // five icon products now, with headroom to grow past 20 as real scans land.
  const rows = real.concat(seed).slice(0, 24);
  el.innerHTML = rows.map((t, i) => discPopRow(t, i, !t._real)).join('')
    + (url && !real.length ? `<button class="mini-btn disc-retry" onclick="fillDiscover()">↻ ${esc(l('retry'))}</button>` : '');
}

function savingsHtml() {
  const products = state.products;
  const savedV = state.saved || 0, wastedV = state.wasted || 0;
  const balTot = savedV + wastedV;
  const balNet = savedV - wastedV;
  const spent = products.reduce((s, p) => s + (parseFloat(p.price) || 0) * (p.qty || 1), 0);

  // ── WHERE IT'S CHEAPEST: per-item best store from the price book. Built up
  //    here because it's worth showing even on an empty fridge (planning a shop).
  const insights = cheapestInsights().slice(0, 6);
  const cheapest = insights.length ? `<div class="sv-card">
    <div class="sv-kicker">💡 ${esc(l('cheapTitle'))}</div>
    ${insights.map(it => `<div class="cheap-row">
      <span class="cheap-item">${it.emoji} ${esc(it.label)}</span>
      <span class="cheap-store">${it.multi ? '🏆 ' : ''}${esc(it.best.store)} · <b>${esc(formatPrice(it.best.avg))}</b></span>
      ${it.multi && it.saving > 0 ? `<span class="cheap-save">−${esc(formatPrice(it.saving))}</span>` : ''}
    </div>`).join('')}
  </div>` : '';

  // Nothing has happened yet: say so once, don't stack six empty cards — but a
  // populated price book still earns the cheapest-store card on its own.
  if (!balTot && !spent && !products.length) {
    return cheapest ? `<div class="panel-grid">${cheapest}</div>`
      : `<div class="sv-empty">💰<span>${esc(l('noStoreData'))}</span></div>`;
  }

  // ── HERO: the balance, and whether this month beats the last one ──
  const hist = monthlyHistory();
  const thisM = hist[0], lastM = hist[1];
  const trend = thisM && lastM && (lastM.used + lastM.wasted)
    ? thisM.wasted - lastM.wasted    // fewer wasted items than last month = winning
    : null;
  const pct = balTot ? Math.round(savedV / balTot * 100) : 100;
  const hero = `<div class="sv-hero">
    <div class="sv-kicker">⚖️ ${esc(l('balTitle'))}</div>
    <div class="bal-net ${balNet >= 0 ? 'pos' : 'neg'}">${balNet >= 0 ? '+' : '−'}${esc(formatPrice(Math.abs(balNet)))}</div>
    <div class="bal-bar"><div class="bal-fill" style="width:${pct}%"></div></div>
    <div class="bal-legend">
      <span>💚 ${esc(formatPrice(savedV))}</span>
      ${trend !== null && trend !== 0
        ? `<span class="sv-trend ${trend < 0 ? 'good' : 'bad'}">${trend < 0 ? '▼' : '▲'} 🗑️ ${Math.abs(trend)}</span>` : ''}
      <span>🗑️ ${esc(formatPrice(wastedV))}</span>
    </div>
  </div>`;

  // ── AT RISK: the only number here you can still do something about ──
  const riskItems = products.filter(p => {
    if (!p.exp || p.frozen) return false;
    const d = daysUntil(p.exp);
    return d != null && d >= 0 && d <= 2;
  });
  const riskVal = riskItems.reduce((s, p) => s + (parseFloat(p.price) || 0) * (p.qty || 1), 0);
  const risk = riskVal > 0 ? `<button class="sv-risk" onclick="goRescue()" aria-label="${esc(l('moneyAtRisk'))}: ${esc(formatPrice(riskVal))}">
    <span class="sv-risk-l">
      <b>⚠️ ${esc(l('moneyAtRisk'))}</b>
      <small>${riskItems.slice(0, 3).map(p => esc(p.name)).join(', ')}${riskItems.length > 3 ? ` +${riskItems.length - 3}` : ''}</small>
    </span>
    <span class="sv-risk-r">
      <b>${esc(formatPrice(riskVal))}</b>
      <small>⏰ ${esc(l('fExpiring'))} →</small>
    </span>
  </button>` : '';

  // ── GLANCE: the lifetime numbers, as tiles rather than three fat cards ──
  const eco = state.usedCount || 0;
  const w = fmtWeight(eco * 0.9);
  const vol = fmtVolume(eco * 250);
  const glance = `<div class="life-grid">
    ${spent > 0 ? `<div class="life-tile"><b>${esc(formatPrice(spent))}</b><span>🧾 ${esc(l('totalSpent'))}</span></div>` : ''}
    ${products.length ? `<div class="life-tile"><b>${products.length}</b><span>📦 ${esc(l('purchases'))}</span></div>` : ''}
    ${eco > 0 ? `<div class="life-tile"><b style="color:var(--ok)">${w.v < 10 ? w.v.toFixed(1) : Math.round(w.v)} ${w.u}</b><span>🌍 ${esc(l('co2Saved'))}</span></div>` : ''}
    ${eco > 0 ? `<div class="life-tile"><b style="color:var(--water)">${Math.round(vol.v).toLocaleString()} ${vol.u}</b><span>💧 ${esc(l('waterSaved'))}</span></div>` : ''}
  </div>`;

  // ── STORES: one card, not two. Which shop is cheapest, and how much of
  //    the fridge came from each — the old tab asked these separately.
  const agg = {};
  products.forEach(p => {
    const s = (p.store || '').trim(), pr = parseFloat(p.price) || 0;
    if (!s) return;
    (agg[s] = agg[s] || { sum: 0, n: 0, items: 0 });
    agg[s].items += 1;
    if (pr > 0) { agg[s].sum += pr * (p.qty || 1); agg[s].n += (p.qty || 1); }
  });
  const rows = Object.entries(agg)
    .map(([s, a]) => ({ s, avg: a.n ? a.sum / a.n : 0, share: Math.round(a.items / products.length * 100) }))
    .sort((a, b) => (a.avg || 1e9) - (b.avg || 1e9));
  const priced = rows.filter(r => r.avg > 0);
  const maxAvg = priced.length ? Math.max(...priced.map(r => r.avg)) : 0;
  const stores = rows.length ? `<div class="sv-card">
    <div class="sv-kicker">🏷️ ${esc(l('avgPriceStore'))}</div>
    ${rows.map((r, i) => `<div class="store-bar-row">
        <span class="sv-store">${priced.length >= 2 && i === 0 && r.avg > 0 ? '🏆 ' : ''}${esc(r.s)}</span>
        <div class="store-bar-track"><div class="store-bar-fill" style="width:${r.avg > 0 && maxAvg ? Math.max(8, Math.round(r.avg / maxAvg * 100)) : 0}%"></div></div>
        <span class="store-bar-pct sv-avg">${r.avg > 0 ? esc(formatPrice(r.avg)) : '—'}</span>
        <span class="sv-share">${r.share}%</span>
      </div>`).join('')}
  </div>` : '';

  // ── TREND: months, used vs wasted, with the money each month kept ──
  const maxCnt = Math.max(1, ...hist.map(h => Math.max(h.used, h.wasted)));
  const mFmt = new Intl.DateTimeFormat(speechLang[currentLang] || currentLang, { month: 'short' });
  const months = !hist.length ? '' : `<div class="sv-card">
    <div class="sv-kicker">📅 ${esc(l('histMonths'))}</div>
    ${hist.map(h => `<div class="hist-row">
        <span class="hist-month">${esc(mFmt.format(h.date))}</span>
        <div class="hist-bars">
          <div class="hist-bar hb-used" style="width:${Math.round(h.used / maxCnt * 100)}%"></div>
          <div class="hist-bar hb-wasted" style="width:${Math.round(h.wasted / maxCnt * 100)}%"></div>
        </div>
        <span class="hist-nums">✅ ${h.used}${h.wasted ? ` · 🗑️ ${h.wasted}` : ''}${h.usedV > 0 ? `<br>💚 ${esc(formatPrice(h.usedV))}` : ''}</span>
      </div>`).join('')}
  </div>`;

  // ── WHERE THE WASTE COMES FROM (two events minimum — one isn't a pattern) ──
  const wEv = (state.history || []).filter(e => e.k === 'wasted');
  let waste = '';
  if (wEv.length >= 2) {
    const byCat = {}, byItem = {};
    wEv.forEach(e => {
      const c = foodCategory({ name: e.name });
      byCat[c] = (byCat[c] || 0) + 1;
      const k = (e.name || '').trim().toLowerCase();
      if (k) (byItem[k] = byItem[k] || { name: e.name, n: 0 }).n++;
    });
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const topItem = Object.values(byItem).sort((a, b) => b.n - a.n)[0];
    const usedN = (state.history || []).filter(e => e.k === 'used').length;
    const rate = Math.round(wEv.length / (wEv.length + usedN) * 100);
    waste = `<div class="sv-card">
      <div class="sv-kicker">🔍 ${esc(l('winsTitle'))}</div>
      <div class="recap-rows">
        <span>${CAT_EMOJI[topCat[0]]} ${esc(l('winsCat'))}: <b>${esc(l(topCat[0]))}</b> ×${topCat[1]}</span>
        ${topItem ? `<span>${foodEmoji(topItem.name) || '🗑️'} ${esc(l('winsItem'))}: <b>${esc(capitalize(topItem.name))}</b> ×${topItem.n}</span>` : ''}
        <span>📉 ${esc(l('winsRate'))}: <b>${rate}%</b></span>
      </div>
    </div>`;
  }

  return `<div class="panel-grid">
    ${hero}
    ${risk}
    ${glance}
    ${cheapest}
    ${stores}
    ${months}
    ${waste}
    ${actionCard('🗺️', l('nearbyStore'), l('nearbyStoreSub'), l('route'), 'route')}
  </div>`;
}

// ─── RENDER CONTENT ──────────────────────────────────────────────
async function renderContent() {
  const renderId = ++_contentRenderSeq;
  const renderLang = currentLang;
  refreshFreshness();   // keep expiry badges/colours live as time passes
  const t = T[currentLang] || T.en;
  const label = document.getElementById('fridgeLabel');
  const list = document.getElementById('productList');

  // The scan tab hosts the REAL viewfinder nodes (see dockScanBox). They must
  // return home before any innerHTML below would destroy them for good.
  undockScanBox();

  // The floating + belongs to Home only — and an empty fridge already puts two
  // big add buttons on screen, so it would be the third and fourth way to add.
  const fabWrap = document.getElementById('fabWrap');
  const fabOn = currentTab === 'home' && state.products.length;
  if (fabWrap) fabWrap.style.display = fabOn ? '' : 'none';

  // The pear's hero card reports the FRIDGE — it only belongs on Home. On the
  // other tabs it just repeated the same "N expiring" panel and pushed each
  // tab's real content down, so it's hidden there (freeing the space for it).
  const heroCard = document.getElementById('heroCard');
  if (heroCard) heroCard.style.display = currentTab === 'home' ? '' : 'none';
  // Reserve bottom room so the last card never sits under the floating +/🛒.
  const scrollArea = document.getElementById('scrollArea');
  if (scrollArea) scrollArea.classList.toggle('has-fab', !!fabOn);

  // ── HOME TAB ──
  if (currentTab === 'home') {
    label.textContent = '';   // the hero gauge is the fridge label now
    const recipesBtn = `<button type="button" class="home-recipes" onclick="switchTab('recipes', document.getElementById('tab-home'))">🍳 ${esc(l('navRecipesBtn'))}</button>`;
    if (state.products.length === 0) {
      list.innerHTML = `${backupNudgeHtml()}<div style="text-align:center;padding:40px 20px;opacity:0.5;font-size:13px;line-height:1.6">${esc(l('emptyFridge'))}</div>
        ${addBtnHtml()}${recipesBtn}${quickAddHtml()}`;
    } else {
      // Search/view/filter earn their row only once the fridge is big enough
      // to need them (or mid-search); small fridges stay clean.
      const tools = state.products.length >= 7 || fridgeQuery;
      if (!tools) fridgeFilter = 'all';   // an invisible filter must not keep narrowing the list
      list.innerHTML = `${backupNudgeHtml()}<div id="weekStrip">${weekStripHtml()}</div>
      ${recipesBtn}
      ${quickAddHtml()}
      ${tools ? `<div class="fridge-tools">
        <div class="fridge-row">
          <input id="fridgeSearch" class="fridge-search" type="search" autocomplete="off" placeholder="${esc(l('searchFridge'))}" aria-label="${esc(l('searchFridge'))}" value="${esc(fridgeQuery)}" oninput="onFridgeSearch(this.value)">
          <button class="fchip active filter-btn" id="filterBtn" onclick="toggleFilterMenu()" aria-haspopup="true" aria-controls="filterMenu">${esc(filterBtnLabel())}</button>
        </div>
        <div class="filter-menu" id="filterMenu">${filterMenuHtml()}</div>
      </div>` : ''}
      <div id="fridgeItems">${fridgeItemsHtml()}</div>`;
      hydrateMissingProductImages();
    }
    return;
  }

  // ── SCAN TAB ── camera-first: the tab IS the viewfinder (Rate&Goods
  // style), with search and past scans waiting under it. The camera starts
  // by itself; denied/unavailable shows the placeholder + reason in place.
  if (currentTab === 'scan') {
    label.textContent = l('scan');
    list.innerHTML = scanHubHtml();
    dockScanBox();
    document.getElementById('scanStatus').textContent = l('scanning');
    startBarcodeScanner();
    fillHubPopular();   // community shelf arrives when the Worker answers
    return;
  }

  // ── DEALS & COUPONS TAB ── your discount cards + where each food is
  // cheapest (from your own price history) — one place to save money.
  if (currentTab === 'coupons') {
    label.textContent = '';   // nav + the "Discount cards" heading already name this tab
    list.innerHTML = couponsHtml();
    return;
  }

  // ── RECIPES TAB ── (reached from the Home button now, not a nav tab) ──
  if (currentTab === 'recipes') {
    label.textContent = l('navRecipesBtn');
    // Saved view: works offline and with an empty fridge — the recipes carry
    // their own ingredients and instructions.
    if (recipesView === 'fav') {
      shownRecipes = favRecipes;
      list.innerHTML = recipeChipsHtml() + planStripHtml() + (favRecipes.length
        ? `<div class="panel-grid">${favRecipes.map((r, i) => recipeCard(r, i)).join('')}</div>`
        : `<div style="text-align:center;padding:36px 18px;font-size:13px;color:var(--muted);line-height:1.6">${esc(l('favEmpty'))}</div>`);
      return;
    }
    if (state.products.length === 0) {
      list.innerHTML = recipeChipsHtml() + recipeSearchRowHtml() + chefRowHtml() +`<div style="text-align:center;padding:40px 20px;opacity:0.5;font-size:13px">${esc(l('addForRecipes'))}</div>`;
      return;
    }
    const locals = buildLocalRecipes();
    shownRecipes = locals;
    // Show instant content (fridge ideas, or a spinner) while real recipes load.
    list.innerHTML = recipeChipsHtml() + recipeSearchRowHtml() + chefRowHtml() +`<div style="font-size:12px;color:var(--faint);margin-bottom:10px">${esc(l('searchRecipes'))}</div>
      ${locals.length
        ? `<div class="panel-grid">${locals.map((r, i) => recipeCard(r, i)).join('')}</div>`
        : `<div class="rd-loading">${esc(l('loadingRecipe'))}</div>`}`;

    try { await loadInternetRecipes(); } catch { internetRecipes = []; }
    // A language/tab switch may have started a newer render while the network
    // recipe request was in flight. Never let this old render put English (or
    // another previous language) back over the current screen.
    if (renderId !== _contentRenderSeq || currentLang !== renderLang || currentTab !== 'recipes' || recipesView !== 'sugg') return;
    // A search or surprise result is on screen — don't stomp on it.
    const rs = document.getElementById('recipeSearch');
    if (rs && rs.value.trim()) return;

    // Prefer real recipes with photos; fall back to quick fridge ideas offline.
    shownRecipes = internetRecipes.length ? internetRecipes : buildLocalRecipes();
    if (shownRecipes.length) {
      // Fallback ideas aren't a search in progress: say offline when we are,
      // and stay quiet when the web simply had nothing (cards carry a source).
      const note = internetRecipes.length || navigator.onLine ? ''
        : `<div style="font-size:12px;color:var(--faint);margin-bottom:10px">📡 ${esc(l('offlineRecipes'))}</div>`;
      list.innerHTML = recipeChipsHtml() + recipeSearchRowHtml() + chefRowHtml() +note + `<div class="panel-grid">${shownRecipes.map((r, i) => recipeCard(r, i)).join('')}</div>`;
      translateCardTitles(renderLang);          // translate titles into the selected language
      localizeRecipeIngredients(renderLang);    // …and the fridge-match / buy lists
    } else {
      // Never leave the tab blank — explain and offer a retry.
      list.innerHTML = recipeChipsHtml() + recipeSearchRowHtml() + chefRowHtml() +`<div style="text-align:center;padding:36px 18px;line-height:1.6">
        <div style="font-size:13px;color:var(--muted);margin-bottom:16px">${esc(l('noRecipesFound'))}</div>
        <button class="mini-btn" style="padding:11px 20px;font-size:14px" onclick="reloadRecipes()">↻ ${esc(l('retry'))}</button>
      </div>`;
    }
    return;
  }

  // ── DISCOVER TAB ── (replaced the retrospective Savings stats)
  if (currentTab === 'deals') {
    label.textContent = '';   // the in-content "🧭 Discover" heading already titles this tab
    list.innerHTML = discoverShellHtml();
    hydrateDiscoverRecipeImages();
    fillDiscover();   // community shelf arrives when the Worker answers
    return;
  }

  // ── PROFILE TAB ──
  label.textContent = '';   // nav highlights Profile; the Account card leads the content
  const products = state.products;
  // An emptied fridge is an achievement, not an empty profile — only true
  // fresh installs (no history, no badges either) get the placeholder.
  if (products.length === 0 && !(state.history || []).length && !Object.keys(state.badges || {}).length) {
    // Still surface the account card AND the allergen picker here — a fresh
    // "without account" user must be able to sign in and set allergens from
    // Profile even before adding anything.
    list.innerHTML = `<div class="panel-grid">
      ${accountCardHtml(1)}
      <div class="action-card" style="display:block">
        <div class="card-title" style="margin-bottom:9px">⚠️ ${esc(l('myAllergens'))}</div>
        <div class="swatches" id="allergenChips" role="group" aria-label="${esc(l('myAllergens'))}"></div>
      </div>
    </div>
      <div style="text-align:center;padding:22px 20px 8px;font-size:13px;line-height:1.6;color:var(--muted)">${esc(l('emptyProfile'))}</div>`;
    renderAllergenPicker();
    return;
  }

  // Level hero: XP from monotonic good-habit counters (see playerXp), so a
  // level once earned is never lost. Level n → n+1 costs 100·n XP.
  const badgeN = BADGES.filter(b => state.badges && state.badges[b.id]).length;
  const xp = playerXp();
  const lvl = playerLevel(xp);
  const lvlBase = 50 * (lvl - 1) * lvl, lvlNext = 50 * lvl * (lvl + 1);
  const lvlEmoji = lvlTierEmoji(lvl);
  const lvlHtml = `<div class="action-card" style="display:block">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
      <div class="card-title">${lvlEmoji} ${esc(lvlTierTitle(lvl))}</div>
      <span class="card-sub">${esc(l('lvlTitle'))} ${lvl} · ${xp - lvlBase}/${lvlNext - lvlBase} XP</span>
    </div>
    <div class="lvl-bar"><div class="lvl-fill" style="width:${Math.round((xp - lvlBase) / (lvlNext - lvlBase) * 100)}%"></div></div>
  </div>`;

  // Lifetime tiles: the whole journey in four numbers.
  const lifeUsedN = (state.history || []).filter(e => e.k === 'used').length;
  const lifeWastedN = (state.history || []).length - lifeUsedN;
  const lifeRate = lifeUsedN + lifeWastedN > 0 ? Math.round(lifeUsedN / (lifeUsedN + lifeWastedN) * 100) + '%' : '—';
  const lifeDays = Math.max(1, Math.floor((Date.now() - new Date(state.firstUse + 'T00:00:00').getTime()) / 864e5) + 1);
  const lifeHtml = `<div class="action-card" style="display:block">
    <div class="life-grid">
      <div class="life-tile"><b>${state.usedCount || 0}</b><span>✅ ${esc(l('recapEaten'))}</span></div>
      <div class="life-tile"><b>${lifeRate}</b><span>📉 ${esc(l('lifeRate'))}</span></div>
      <div class="life-tile"><b>${isNaN(lifeDays) ? 1 : lifeDays}</b><span>📅 ${esc(l('lifeDays'))}</span></div>
      <div class="life-tile"><b>${badgeN}/${BADGES.length}</b><span>🏆 ${esc(l('achTitle'))}</span></div>
    </div>
  </div>`;

  const fresh = products.filter(p => p.cls === 'bg').length;
  const warn = products.filter(p => p.cls === 'ba').length;
  const crit = products.filter(p => p.cls === 'br').length;
  const total = products.length;

  // Headline stats that replaced the old cards: money saved (value of food
  // used in time), used-vs-wasted rate (reuses lifeRate), how many items are
  // about to expire, and what's in the kitchen right now split by section.
  const moneySaved = (state.history || []).filter(e => e.k === 'used')
    .reduce((s, e) => s + (parseFloat(e.price) || 0), 0);
  const soonN = products.filter(p => p.exp && !p.frozen && (daysUntil(p.exp) ?? 99) <= 3).length;
  const locF = products.filter(p => productLoc(p) === 'fridge').length;
  const locZ = products.filter(p => productLoc(p) === 'freezer').length;
  const locP = products.filter(p => productLoc(p) === 'pantry').length;
  const statHtml = `<div class="action-card" style="display:block">
    <div class="life-grid">
      <div class="life-tile"><b>${moneySaved > 0 ? esc(formatPrice(moneySaved)) : '—'}</b><span>💚 ${esc(l('statMoney'))}</span></div>
      <div class="life-tile"><b>${lifeRate}</b><span>♻️ ${esc(l('statRatio'))}</span></div>
      <div class="life-tile"><b>${soonN}</b><span>⏳ ${esc(l('statSoon'))}</span></div>
      <div class="life-tile"><b>${total}</b><span>🧺 ${esc(l('statKitchen'))}</span></div>
    </div>
  </div>`;
  // Discount cards were removed from Profile — they live on the Deals tab now.

  // Account lives on Profile now (moved out of Settings). The level tier badge
  // rides along as a customizable title that levels up with you.
  const acctBtn = accountCardHtml(lvl);
  // My allergens picker, also moved from Settings to Profile.
  const allergenCard = `<div class="action-card" style="display:block">
    <div class="card-title" style="margin-bottom:9px">⚠️ ${esc(l('myAllergens'))}</div>
    <div class="swatches" id="allergenChips" role="group" aria-label="${esc(l('myAllergens'))}"></div>
  </div>`;

  const storeCounts2 = {};
  products.forEach(p => { const s = (p.store||'?').trim(); storeCounts2[s] = (storeCounts2[s]||0)+1; });
  const topStore2 = Object.entries(storeCounts2).sort((a,b)=>b[1]-a[1])[0];

  // Freshness percentages for bar
  const freshPct = total > 0 ? Math.round(fresh/total*100) : 0;
  const warnPct = total > 0 ? Math.round(warn/total*100) : 0;
  const critPct = total > 0 ? Math.round(crit/total*100) : 0;

  // This-month recap from the event log — a shareable mini "wrapped".
  // Hidden until something has actually happened this month.
  const mEv = (state.history || []).filter(e => (e.t || '').startsWith(new Date().toISOString().slice(0, 7)));
  const mUsed = mEv.filter(e => e.k === 'used');
  const mSaved = mUsed.reduce((s, e) => s + (parseFloat(e.price) || 0), 0);
  const mCnt = {};
  mUsed.forEach(e => { const k = (e.name || '').trim(); if (k) mCnt[k] = (mCnt[k] || 0) + 1; });
  const mTop = Object.entries(mCnt).sort((a, b) => b[1] - a[1])[0];
  const mName = capitalize(new Intl.DateTimeFormat(speechLang[currentLang] || currentLang, { month: 'long' }).format(new Date()));
  const recapHtml = mEv.length ? `<div class="action-card" style="display:block">
    <div class="card-title" style="margin-bottom:10px">${esc(l('recapTitle'))} · ${esc(mName)}</div>
    <div class="recap-rows">
      <span>✅ ${mUsed.length} ${esc(l('recapEaten'))}</span>
      <span>🗑️ ${mEv.length - mUsed.length} ${esc(l('recapWasted'))}</span>
      ${mSaved > 0 ? `<span>💚 ${esc(formatPrice(mSaved))}</span>` : ''}
      ${mTop ? `<span>${foodEmoji(mTop[0]) || '⭐'} ${esc(l('recapTop'))}: ${esc(capitalize(mTop[0]))}${mTop[1] > 1 ? ' ×' + mTop[1] : ''}</span>` : ''}
    </div>
    <button class="mini-btn" style="margin-top:10px" onclick="shareRecap()">📤 ${esc(l('recapShare'))}</button>
  </div>` : '';

  list.innerHTML = `<div class="panel-grid">
    <div class="profile-tabs" role="tablist" aria-label="Profile sections">
      <button type="button" class="profile-tab active" role="tab" aria-selected="true" onclick="setProfileTab('overview', this)">Overview</button>
      <button type="button" class="profile-tab" role="tab" aria-selected="false" onclick="setProfileTab('insights', this)">Insights</button>
      <button type="button" class="profile-tab" role="tab" aria-selected="false" onclick="setProfileTab('tools', this)">Tools</button>
    </div>
    <section id="profilePane-overview" class="profile-pane" role="tabpanel">
      ${acctBtn}
      ${lvlHtml}
      ${lifeHtml}
    </section>
    <section id="profilePane-insights" class="profile-pane" role="tabpanel" hidden>
      <div class="profile-more-body">
    ${allergenCard}
    ${recapHtml}
    ${nutriCardHtml()}
    ${(() => { const ts = products.reduce((s, p) => s + (parseFloat(p.price) || 0) * (p.qty || 1), 0); return ts > 0 ? `<div class="profile-stat">
      <div>
        <div class="card-title">${esc(l('totalSpent'))}</div>
        <div class="card-sub">${total} ${esc(l('purchases'))}</div>
      </div>
      <div class="profile-value">${esc(formatPrice(ts))}</div>
    </div>` : ''; })()}
    ${topStore2 ? `<div class="profile-stat">
      <div>
        <div class="card-title">${esc(l('topStore'))}</div>
        <div class="card-sub">${topStore2[1]} ${l('purchases')} · ${Math.round(topStore2[1]/total*100)}%</div>
      </div>
      <div class="profile-value" style="font-size:16px">${esc(topStore2[0])}</div>
    </div>` : ''}
    <button type="button" class="action-card ach-open" onclick="openAchievements()">🏆 ${esc(l('achTitle'))} · ${BADGES.filter(b => state.badges && state.badges[b.id]).length}/${BADGES.length}</button>
    <button type="button" class="action-card ach-open" onclick="openImpact()">📊 ${esc(l('impactTitle'))}</button>
    <button type="button" class="action-card wrap-open" onclick="openWrap()">${esc(l('wrapTitle'))}</button>
      </div>
    </section>
    <section id="profilePane-tools" class="profile-pane" role="tabpanel" hidden>
      ${schoolModeCard()}
    <div class="sv-card" style="display:grid;gap:8px">
      <div class="card-title">Kulpio toolkit</div>
      <div class="card-sub">Reports, feedback and organization goals.</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <button type="button" class="mini-btn" onclick="openSheet('shop')">🛒 Shopping list</button>
        <button type="button" class="mini-btn" onclick="openTour()">ⓘ App tour</button>
        <button type="button" class="mini-btn" onclick="openFeedback()">✉ Feedback</button>
        <button type="button" class="mini-btn" onclick="openSchoolMode()">🏫 School mode</button>
      </div>
      </div>
    </section>
  </div>`;
  renderAllergenPicker();   // fill the allergen chips now that the box exists
}

// ── KULPIO WRAPPED ── the shareable "my food year" card, drawn straight
// onto a canvas (no libraries): gradient, confetti, the pear, the numbers
// that matter, the podium of most-eaten foods, the wordmark.
function drawWrapped(cv) {
  const W = cv.width = 1080, H = cv.height = 1350;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#12301a');
  g.addColorStop(1, '#2c5e33');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.globalAlpha = .16;   // faint confetti field
  const dots = ['#8BC34A', '#ffd166', '#ff8fb0', '#6fc3ff'];
  for (let i = 0; i < 42; i++) {
    x.fillStyle = dots[i % 4];
    x.beginPath();
    x.arc(((i * 263) % (W - 80)) + 40, ((i * 389) % (H - 80)) + 40, 6 + (i % 3) * 5, 0, 7);
    x.fill();
  }
  x.globalAlpha = 1;
  x.textAlign = 'center';
  x.font = '190px serif';
  x.fillText('🍐', W / 2, 285);
  x.fillStyle = '#eaf6dd';
  x.font = '700 62px system-ui, sans-serif';
  x.fillText(l('wrapTitle'), W / 2, 415);
  x.fillStyle = 'rgba(234,246,221,.65)';
  x.font = '400 34px system-ui, sans-serif';
  x.fillText((state.firstUse || '') + ' →', W / 2, 472);
  const wCo2 = fmtWeight((state.usedCount || 0) * 0.9);
  const vH2o = fmtVolume((state.usedCount || 0) * 250);
  const rows = [
    ['🍽️', String(state.usedCount || 0)],
    ['💚', formatPrice(state.saved || 0)],
    ['🔥', String(state.bestStreak || 0)],
    ['🌍', `${Math.round(wCo2.v)} ${wCo2.u}`],
    ['💧', `${Math.round(vH2o.v)} ${vH2o.u}`],
  ];
  let y = 568;
  for (const [emo, val] of rows) {
    x.textAlign = 'left';
    x.font = '58px serif';
    x.fillStyle = '#eaf6dd';
    x.fillText(emo, 190, y);
    x.textAlign = 'right';
    x.font = '800 68px system-ui, sans-serif';
    x.fillText(val, W - 190, y);
    y += 104;
  }
  // most-eaten podium
  const eaten = {};
  for (const e of state.history || []) {
    if (e.k !== 'used') continue;
    const k = (e.name || '').trim();
    if (k) eaten[k] = (eaten[k] || 0) + 1;
  }
  const top = Object.entries(eaten).sort((a, b) => b[1] - a[1]).slice(0, 3);
  x.textAlign = 'center';
  y += 8;
  for (const [name, n] of top) {
    x.font = '400 40px system-ui, sans-serif';
    x.fillStyle = 'rgba(234,246,221,.85)';
    x.fillText(`${foodEmoji(name) || '🍽️'} ${name} ×${n}`, W / 2, y);
    y += 58;
  }
  x.font = '700 42px system-ui, sans-serif';
  x.fillStyle = '#8BC34A';
  x.fillText('kulpio', W / 2, H - 62);
}
function openWrap() {
  drawWrapped(document.getElementById('wrapCanvas'));
  document.getElementById('wrapShare').textContent = '📤 ' + l('recapShare');
  ensureOverlayHistory();
  document.getElementById('wrapModal').classList.add('show');
}
function closeWrap() {
  const m = document.getElementById('wrapModal');
  if (m) m.classList.remove('show');
}
function shareWrapped() {
  document.getElementById('wrapCanvas').toBlob(async blob => {
    if (!blob) return;
    const file = new File([blob], 'kulpio-wrapped.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch {}
    }
    // No file sharing (desktop): the card downloads instead.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kulpio-wrapped.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}

function addBtnHtml() {
  return `<button class="add-manual-btn" onclick="addProductManually()">${esc(l('addManually'))}</button>
    <button class="add-manual-btn" style="opacity:.85;margin-top:6px" onclick="openMultiAdd()">📝 ${esc(l('multiAdd'))}</button>`;
}
// ── MULTI-ADD: paste a list, one item per line ───────────────────
function openMultiAdd() {
  const t = document.getElementById('multiText');
  if (t) t.value = '';
  ensureOverlayHistory();
  document.getElementById('multiModal').classList.add('show');
  setTimeout(() => t && t.focus(), 60);
}
function closeMultiModal() {
  document.getElementById('multiModal').classList.remove('show');
}
function saveMultiAdd() {
  const lines = (document.getElementById('multiText').value || '')
    .split('\n').map(s => s.trim()).filter(Boolean).filter(s => !isBadName(s)).slice(0, 100);
  closeMultiModal();
  if (!lines.length) return;
  lines.forEach(name => mergeOrPush(makeProduct(name)));
  recipeCacheKey = '';
  saveState();
  renderContent();
  lines.slice(0, 25).forEach(name => fetchProductImage(name));   // pack photos, politely capped
  pearReact('hop', 'pearAdd', '😋', 700);
  if (lines.length >= 5) setTimeout(pearConfetti, 450);   // a real haul!
}
