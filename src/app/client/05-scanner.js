// Source section: 05-scanner.js
// ─── BARCODE SCANNER ─────────────────────────────────────────────
// The overlay without a camera: the stage for anything that needs the status
// line or the product card but not the live viewfinder — hub photo decodes,
// search hits, history reopens.
function openScannerShell() {
  ensureOverlayHistory();
  document.getElementById('scanOverlay').classList.add('show');
  document.getElementById('scanStatus').textContent = '';
  document.getElementById('scanVideo').style.display = 'none';
  setScanLive(false);   // no laser until the camera is actually up
  hideScanCard();
  hideScanTeach();
  _scanFound = null;
  renderScanHist();     // Rate&Goods-style: past scans wait under the viewfinder
  const search = document.getElementById('scanSearchIn');
  search.placeholder = '🔍 ' + l('scanSearchPh');
  search.value = '';
  document.getElementById('scanSearchRes').innerHTML = '';
  _searchRes = [];
  document.getElementById('receiptInput').value = '';
}

function openScanner() {
  // camera's out — he strikes a photo pose (shades on, proud)
  if (_ready) {
    const el = document.getElementById('pearIcon');
    if (el) {
      el.classList.add('cool');
      clearTimeout(el._coolT);
      el._coolT = setTimeout(() => el.classList.remove('cool'), 1500);
    }
    pearReact('proud', null, '📸', 900);
  }
  openScannerShell();
  document.getElementById('scanStatus').textContent = l('scanning');
  startBarcodeScanner();
}

// ── CAMERA-FIRST DOCK ── the Scan tab hosts the overlay's REAL viewfinder:
// #scanBox (video, torch, file inputs), #scanStatus and #scanTeach are moved
// into the page while the tab is open, so every decode path keeps its ids.
// They MUST be moved back before a re-render replaces the dock's innerHTML —
// that would destroy the live video and file inputs permanently.
function dockScanBox() {
  const dock = document.getElementById('scanDock');
  if (!dock) return;
  dock.append(document.getElementById('scanBox'), document.getElementById('scanStatus'), document.getElementById('scanTeach'));
  document.getElementById('scanStatus').textContent = '';
  hideScanTeach();
  setScanLive(false);
}
function undockScanBox() {
  const box = document.getElementById('scanBox');
  const overlay = document.getElementById('scanOverlay');
  if (!box || box.parentElement === overlay) return;
  stopBarcodeScanner();   // leaving the tab releases the camera
  document.getElementById('btnCloseScanX').after(box);
  box.after(document.getElementById('scanStatus'));
  document.getElementById('scanStatus').after(document.getElementById('scanTeach'));
  document.getElementById('scanVideo').style.display = 'none';
}
function scanDocked() {
  const dock = document.getElementById('scanDock');
  return !!dock && dock.contains(document.getElementById('scanBox'));
}
// Any scanning surface on screen? (overlay up, or the viewfinder docked in
// the tab) — decode paths bail out when neither is visible anymore.
function scanSurfaceOn() {
  return document.getElementById('scanOverlay').classList.contains('show') || scanDocked();
}
// A denied/stopped docked viewfinder restarts on tap.
function hubCamTap(ev) {
  if (ev.target.closest('#scanTorch, #scanTeach, input, button')) return;
  if (!scannerActive) {
    document.getElementById('scanStatus').textContent = l('scanning');
    startBarcodeScanner();
  }
}

// Hub actions that read a picked photo. Docked: the status line is already
// on the page — just release the camera so the picker (or the phone's camera
// app for "read label") can have it. Elsewhere: open the shell first, so
// "Analyzing…" / "Not found" plays out on the overlay, not in a void.
function hubPick(inputId) {
  if (scanDocked()) {
    stopBarcodeScanner();
    document.getElementById('scanVideo').style.display = 'none';
  } else {
    openScannerShell();
  }
  document.getElementById(inputId).click();
}

// "Live" = a real camera feed is on screen. It drives the laser and the
// placeholder, so the box can never pretend to scan a black rectangle.
function setScanLive(on) {
  const box = document.getElementById('scanBox');
  if (box) box.classList.toggle('live', !!on);
}

// ── TORCH ── dim shop shelves, back of the fridge: phones expose the camera
// light through track capabilities, and the button only appears when it's
// really there (laptops and webcams never show it).
let _torchTrack = null;
function syncTorchBtn(track) {
  const b = document.getElementById('scanTorch');
  _torchTrack = null;
  if (!b) return;
  b.style.display = 'none';
  b.classList.remove('on');
  try {
    if (track && track.getCapabilities && track.getCapabilities().torch) {
      _torchTrack = track;
      b.style.display = '';
      b.title = l('torchLbl');
      b.setAttribute('aria-label', l('torchLbl'));
      b.setAttribute('aria-pressed', 'false');
    }
  } catch {}
}
function toggleTorch() {
  const b = document.getElementById('scanTorch');
  if (!_torchTrack || !b) return;
  const on = !b.classList.contains('on');
  Promise.resolve(_torchTrack.applyConstraints({ advanced: [{ torch: on }] }))
    .then(() => {
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    })
    .catch(() => {});
}

function closeScanner() {
  stopBarcodeScanner();
  if (_cardScan && document.getElementById('scanOverlay').classList.contains('show')) _cardScan = null;   // gave up on a card capture
  document.getElementById('scanOverlay').classList.remove('show');
  document.getElementById('scanVideo').style.display = 'none';
  setScanLive(false);
  hideScanCard();
  hideScanTeach();
  _cmpHold = null;   // a held comparison makes no sense across sessions
  // Back on the hub: the strip of recent scans must include what just happened.
  if (currentTab === 'scan') renderContent();
}

// The decode library comes from a CDN; if that request failed at page load
// (flaky network), inject it again on demand instead of giving up.
function ensureZXing() {
  if (window.ZXing) return Promise.resolve(true);
  if (!ensureZXing._p) {
    ensureZXing._p = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js';
      const done = ok => { ensureZXing._p = null; resolve(ok && !!window.ZXing); };
      s.onload = () => done(true);
      s.onerror = () => done(false);
      setTimeout(() => done(false), 8000);
      document.head.appendChild(s);
    });
  }
  return ensureZXing._p;
}

// Native BarcodeDetector (Android Chrome, Safari 17+): the same engine native
// scanner apps use — snaps codes at an angle, in poor light, within a frame or
// two, no CDN library needed. Desktop Chrome exposes the API on some platforms
// with NO real format support, so the EAN-13 check (the format on practically
// every grocery item) is what decides; ZXing stays as the fallback.
const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];
async function nativeDetector() {
  try {
    if (!('BarcodeDetector' in window)) return null;
    const have = await BarcodeDetector.getSupportedFormats();
    const want = SCAN_FORMATS.filter(f => have.includes(f));
    if (!want.includes('ean_13')) return null;
    return new BarcodeDetector({ formats: want });
  } catch { return null; }
}

let _detectTimer = null;   // native-path polling loop
async function startBarcodeScanner() {
  if (scannerActive) return;
  const video = document.getElementById('scanVideo');
  const status = document.getElementById('scanStatus');

  const det = await nativeDetector();
  if (det) {
    try {
      scannerActive = true;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      // The scanning surface may have gone away while the prompt was up.
      if (!scannerActive || !scanSurfaceOn()) {
        stream.getTracks().forEach(t => t.stop());
        scannerActive = false;
        return;
      }
      video.srcObject = stream;
      video.style.display = 'block';
      // Live (laser on) only once frames actually arrive — same rule as ZXing.
      video.addEventListener('playing', () => {
        setScanLive(true);
        // Phones expose the camera light on the track — offer it when real.
        syncTorchBtn(video.srcObject && video.srcObject.getVideoTracks()[0]);
      }, { once: true });
      await video.play().catch(() => {});
      let busy = false;
      _detectTimer = setInterval(async () => {
        if (busy || !scannerActive || video.readyState < 2) return;
        busy = true;
        try {
          const codes = await det.detect(video);
          if (codes && codes.length && codes[0].rawValue && scannerActive) {
            const barcode = codes[0].rawValue;
            stopBarcodeScanner();
            video.style.display = 'none';
            setScanLive(false);
            if (_cardScan) { const cb = _cardScan; _cardScan = null; closeScanner(); cb(barcode); return; }
            await lookupBarcode(barcode, true);
          }
        } catch {}   // detect can hiccup while the feed warms up
        busy = false;
      }, 130);
      return;
    } catch (e) {
      video.style.display = 'none';
      setScanLive(false);
      scannerActive = false;
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) {
        status.textContent = l('cameraDenied');
        return;   // denied is denied — ZXing would only re-prompt
      }
      // Anything else (no camera, constraint failure): let ZXing have a try.
    }
  }

  if (!await ensureZXing()) {
    status.textContent = l('scanLibFail');
    setScanLive(false);
    return;
  }
  // The scanning surface may have gone away while the library was loading.
  if (!scanSurfaceOn() || scannerActive) return;

  try {
    codeReader = new ZXing.BrowserMultiFormatReader();
    video.style.display = 'block';
    scannerActive = true;
    // Go "live" only when frames actually arrive — not when we merely ASK for
    // the camera. Otherwise a permission prompt (or a denial) leaves the laser
    // sweeping a black box, which is the exact thing the viewfinder must never do.
    video.addEventListener('playing', () => {
      setScanLive(true);
      syncTorchBtn(video.srcObject && video.srcObject.getVideoTracks()[0]);
    }, { once: true });

    const onDecode = async (result) => {
      if (!result) return;
      const barcode = result.getText();
      stopBarcodeScanner();
      video.style.display = 'none';
      setScanLive(false);
      if (_cardScan) { const cb = _cardScan; _cardScan = null; closeScanner(); cb(barcode); return; }
      await lookupBarcode(barcode, true);
    };
    // Barcodes live on the back of products — ask for the rear camera.
    // 'ideal' degrades gracefully on laptops with only a front one.
    if (codeReader.decodeFromConstraints) {
      await codeReader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, video, onDecode);
    } else {
      await codeReader.decodeFromVideoDevice(null, video, onDecode);
    }
  } catch (e) {
    video.style.display = 'none';
    setScanLive(false);   // denied/unavailable: show the camera placeholder, not a fake scan
    status.textContent = (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError'))
      ? l('cameraDenied') : l('cameraUnavailable');
    scannerActive = false;
  }
}

function stopBarcodeScanner() {
  scannerActive = false;
  setScanLive(false);
  syncTorchBtn(null);
  clearInterval(_detectTimer);
  _detectTimer = null;
  if (codeReader) {
    try { codeReader.reset(); } catch {}
    codeReader = null;
  }
  const video = document.getElementById('scanVideo');
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
}

// One OFF product object → the card payload every scanner path shares
// (barcode lookup, healthier picks, text search). Fields a caller's fetch
// didn't request simply come out empty.
function offCardPayload(p, code) {
  const nut = p.nutriments || {};
  const grade = String(p.nutrition_grades || p.nutriscore_grade || '').trim().toLowerCase();
  return {
    name: String(p.product_name_en || p.product_name || p.generic_name || p.product_name_ro || '').trim(),
    brand: String(p.brands || '').split(',')[0].trim(),
    store: String(p.stores || '').trim(),
    // Thumb first: the card shows it at ~100px anyway, and OFF's thumb
    // is a fraction of the "small" size — it arrives noticeably sooner.
    img: p.image_front_thumb_url || p.image_front_small_url || p.image_small_url || '',
    code: String(code || p.code || ''),
    // Composition facts (when OFF has analyzed this product):
    grade: /^[a-e]$/.test(grade) ? grade : '',
    nova: parseInt(p.nova_group, 10) || 0,
    // null = additives unknown; [] = analyzed and clean
    adds: Array.isArray(p.additives_tags)
      ? p.additives_tags.map(t => String(t).replace(/^\w\w:/, '').toUpperCase()).filter(t => /^E\d/.test(t))
      : null,
    kcal: Math.round(nut['energy-kcal_100g'] || 0) || null,
    prot: typeof nut.proteins_100g === 'number' ? nut.proteins_100g : null,
    fat: typeof nut.fat_100g === 'number' ? nut.fat_100g : null,
    carb: typeof nut.carbohydrates_100g === 'number' ? nut.carbohydrates_100g : null,
    // Printed composition, in the UI language when OFF has it
    ing: String(p['ingredients_text_' + currentLang] || p.ingredients_text_en || p.ingredients_text || '').trim().slice(0, 500),
    // Most specific category last — that's the one alternatives search on
    cats: Array.isArray(p.categories_tags) ? p.categories_tags.slice(-2) : [],
    // Diet verdicts from OFF's ingredient analysis — only the four we can
    // say something useful about; "unknown" stays silent on purpose.
    diet: Array.isArray(p.ingredients_analysis_tags)
      ? p.ingredients_analysis_tags.map(t => String(t).replace(/^\w\w:/, ''))
          .filter(t => t === 'vegan' || t === 'vegetarian' || t === 'palm-oil' || t === 'palm-oil-free')
      : [],
    // Declared allergens, normalized to the 14 EU keys we can name
    allg: Array.isArray(p.allergens_tags)
      ? p.allergens_tags.map(t => String(t).replace(/^\w\w:/, '')).filter(t => ALLERGENS[t])
      : []
  };
}

// ── ALLERGENS ── the 14 EU-declared allergens OFF tags products with.
// Emoji + string key; the picker in Settings and the card chips share it.
const ALLERGENS = {
  'gluten': ['🌾', 'alGluten'], 'milk': ['🥛', 'alMilk'], 'eggs': ['🥚', 'alEggs'],
  'nuts': ['🌰', 'alNuts'], 'peanuts': ['🥜', 'alPeanuts'], 'soybeans': ['🫘', 'alSoy'],
  'fish': ['🐟', 'alFish'], 'crustaceans': ['🦐', 'alCrust'], 'molluscs': ['🦪', 'alMolluscs'],
  'celery': ['🥬', 'alCelery'], 'mustard': ['🟡', 'alMustard'], 'sesame-seeds': ['🫓', 'alSesame'],
  'sulphur-dioxide-and-sulphites': ['🧪', 'alSulph'], 'lupin': ['🌼', 'alLupin'],
};
function allergenName(k) {
  const a = ALLERGENS[k];
  return a ? a[0] + ' ' + l(a[1]) : k;
}
// The ones YOU react to — picked in Settings, checked on every scan.
let myAllergens = [];
try { myAllergens = JSON.parse(localStorage.getItem('kulpio-allergens') || '[]'); } catch {}
function toggleAllergen(k) {
  myAllergens = myAllergens.includes(k) ? myAllergens.filter(x => x !== k) : [...myAllergens, k];
  localStorage.setItem('kulpio-allergens', JSON.stringify(myAllergens));
  renderAllergenPicker();
}
function renderAllergenPicker() {
  const box = document.getElementById('allergenChips');
  if (!box) return;
  box.innerHTML = Object.keys(ALLERGENS).map(k =>
    `<button class="fchip${myAllergens.includes(k) ? ' active' : ''}" onclick="toggleAllergen('${k}')"`
    + ` aria-pressed="${myAllergens.includes(k)}">${allergenName(k)}</button>`).join('');
}

// ── TAUGHT PRODUCTS ── Rate&Goods grows because users add the products it
// doesn't know. Single-user edition: when a barcode comes up empty, one tap
// opens the add form, and the code→product mapping is remembered in
// kulpio-mycodes — every later scan of that code answers instantly, offline
// included. Capped at 200, oldest-taught evicted first.
let myCodes = {};
try { myCodes = JSON.parse(localStorage.getItem('kulpio-mycodes') || '{}'); } catch {}
function teachProduct(code, data) {
  // Photo thumbs are data: URLs — too heavy to keep 200 of; the fridge card
  // keeps the photo, the taught mapping keeps only a linkable image.
  if (data.img && data.img.startsWith('data:')) data = Object.assign({}, data, { img: '' });
  myCodes[code] = Object.assign({ t: Date.now() }, data);
  const keys = Object.keys(myCodes);
  if (keys.length > 200) {
    keys.sort((a, b) => (myCodes[a].t || 0) - (myCodes[b].t || 0));
    while (keys.length > 200) delete myCodes[keys.shift()];
  }
  localStorage.setItem('kulpio-mycodes', JSON.stringify(myCodes));
}
let _teachCode = '';
function showScanTeach(code) {
  _teachCode = String(code || '');
  const b = document.getElementById('scanTeach');
  b.textContent = '➕ ' + l('addManually');
  b.style.display = '';
}
function hideScanTeach() {
  _teachCode = '';
  document.getElementById('scanTeach').style.display = 'none';
}
function teachFromScan() {
  const code = _teachCode;
  if (!code) return;
  closeScanner();
  addProductManually();
  document.getElementById('productModal').dataset.teachCode = code;
}

// ── COMMUNITY SCAN LOG ── every REAL barcode scan (camera or photo, not a
// history/popular-tile reopen) is reported to the Worker's D1 table:
// {code, name, grade, anonymous install id}. Fire-and-forget — offline or
// file:// installs simply never send anything.
let scanUid = '';
try {
  scanUid = localStorage.getItem('kulpio-uid') || '';
  if (!scanUid) {
    scanUid = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
    localStorage.setItem('kulpio-uid', scanUid);
  }
} catch {}
function logScanCloud(f) {
  const url = aiProxyUrl();
  if (!url || !f || !f.code || !scanUid || !navigator.onLine) return;
  try {
    fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanLog: { code: f.code, name: f.name || '', grade: f.grade || '', img: f.img || '', uid: scanUid } }),
    }).catch(() => {});
  } catch {}
}

// ── SHARED HOUSEHOLD ── a 6-char code links installs to ONE household —
// the shopping list AND the fridge — through the Worker's D1. Whole-state
// last-write-wins: every local change pushes (debounced), the app pulls on
// open and when the list sheet opens. _houseSent remembers the last
// envelope we pushed OR pulled, so an applied pull never echoes back.
let houseCode = (localStorage.getItem('kulpio-house') || '').toUpperCase();
let _houseSent = '';
let _housePushT = null;
let _houseEvents = [];          // activity waiting to sync to the household
let _houseMemberDirty = false;  // my name/avatar changed → announce it on next push
let _houseMembers = {};         // uid → { name, avatar, ts } from the last pull
let _houseActivity = [];        // recent [{ id, uid, kind, name, ts }]
let _houseMessages = [];        // household chat [{ id, uid, name, text, ts }]
let _houseMsgQueue = [];        // messages waiting to sync
let _houseChatPoll = null;      // interval that keeps the open chat fresh
// Send a household chat message (optimistic; syncs on the next push).
function houseSend(text) {
  text = String(text || '').trim().slice(0, 300);
  if (!text || !houseCode) return;
  const msg = { id: scanUid.slice(0, 8) + '-m' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: houseMyName(), text, ts: Date.now() };
  _houseMsgQueue.push(msg);
  _houseMessages.push({ ...msg, uid: scanUid });
  renderHouseChat(true);
  houseMaybePush();
}

// Who I am to the household: my account name/avatar if signed in, else a
// display name I can set locally (defaults to a friendly label).
function houseMyName() {
  try { return (profileName() || (authUser && authUser.email) || l('houseMe')).slice(0, 40); } catch { return (authUser && authUser.email) || 'Me'; }
}
function houseMyAvatar() {
  // Empty when I haven't picked an emoji, so household cards generate my pfp
  // from my name (same seed as my own profile card → the same avatar everywhere).
  return rawAvatar() || '';
}
function houseSetMyName(v) {
  // Unified with the profile display name so the two never disagree.
  try { const t = String(v || '').trim().slice(0, 40); if (t) localStorage.setItem('kulpio-name', t); else localStorage.removeItem('kulpio-name'); } catch {}
  _houseMemberDirty = true;
  houseMaybePush();
}
function houseMember() { return { name: houseMyName(), avatar: houseMyAvatar() }; }
// Record something I just did so the household sees it in the activity feed.
function houseLogEvent(kind, name) {
  if (!houseCode) return;
  name = String(name || '').trim();
  if (!name) return;
  _houseEvents.push({ id: scanUid.slice(0, 8) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, name, ts: Date.now() });
  if (_houseEvents.length > 40) _houseEvents = _houseEvents.slice(-40);
  houseMaybePush();
}
// Everything the household shares, in one blob. Photos stored as data: URIs
// stay on their own device — they're hundreds of KB and belong to the phone
// that took them; web photo URLs travel fine.
function houseEnvelope() {
  const fridge = (state.products || []).slice(0, 200).map(p => {
    if (p.img && p.img.startsWith('data:')) { const q = { ...p }; delete q.img; return q; }
    return p;
  });
  return { shop: state.shopping || [], fridge };
}
function houseMaybePush() {
  if (!houseCode) return;
  const envStr = JSON.stringify(houseEnvelope());
  // Push when the fridge/list changed, when I have activity or chat to send, or
  // when my member card needs (re)announcing.
  if (envStr === _houseSent && !_houseEvents.length && !_houseMsgQueue.length && !_houseMemberDirty) return;
  clearTimeout(_housePushT);
  const soon = _houseMsgQueue.length ? 200 : 1500;   // chat feels snappier than list sync
  _housePushT = setTimeout(() => {
    const url = aiProxyUrl();
    if (!url || !houseCode || !navigator.onLine) return;
    _houseSent = JSON.stringify(houseEnvelope());
    const events = _houseEvents.splice(0);      // sent now; the server dedups by id
    const messages = _houseMsgQueue.splice(0);
    _houseMemberDirty = false;
    postJSON(url, { houseSet: { code: houseCode, list: houseEnvelope(), uid: scanUid, member: houseMember(), events, messages } }, 12000);
  }, soon);
}
async function housePull() {
  const url = aiProxyUrl();
  if (!houseCode || !url || !navigator.onLine) return;
  const r = await postJSON(url, { houseGet: { code: houseCode } }, 12000);
  if (!r || r.list == null) return;   // unknown code: our first push will create it
  // A partner on an older app version shares only the shopping list, as a
  // bare array — adopt that and leave the fridge alone.
  const inc = Array.isArray(r.list) ? { shop: r.list, fridge: null } : r.list;
  if (!inc) return;
  // Members, activity + chat always refresh, even when the fridge is unchanged.
  _houseMembers = (inc.members && typeof inc.members === 'object') ? inc.members : {};
  _houseActivity = Array.isArray(inc.activity) ? inc.activity : [];
  // Adopt the server's chat, then re-append any of my messages still in flight.
  const serverMsgs = Array.isArray(inc.messages) ? inc.messages : [];
  const haveIds = new Set(serverMsgs.map(m => m && m.id));
  _houseMessages = serverMsgs.concat(_houseMsgQueue.filter(m => !haveIds.has(m.id)).map(m => ({ ...m, uid: scanUid })));
  if (document.getElementById('houseModal') && document.getElementById('houseModal').classList.contains('show')) renderHouseModal();
  if (!Array.isArray(inc.shop)) return;
  const before = JSON.stringify(houseEnvelope());
  state.shopping = inc.shop;
  if (Array.isArray(inc.fridge)) {
    // An incoming card without a photo keeps THIS device's local photo of
    // the same product, so my snapshots survive the partner's edits.
    for (const np of inc.fridge) {
      if (!np.img) {
        const mine = (state.products || []).find(p => p.name === np.name && p.img);
        if (mine) np.img = mine.img;
      }
    }
    state.products = inc.fridge;
  }
  _houseSent = JSON.stringify(houseEnvelope());   // set BEFORE saveState: no echo
  if (_houseSent === before) return;              // nothing actually new
  recipeCacheKey = '';
  saveState();
  if (sheetKind === 'shop') renderSheet();
  renderContent();
}
function houseCreate() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O/1/I/L — codes get read aloud
  // 8 chars from a 30-symbol alphabet ≈ 6.6×10^11 combinations — not guessable.
  // (Older 6-char codes still work when joining.)
  const buf = (crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(8)) : null);
  let c = '';
  for (let i = 0; i < 8; i++) c += abc[(buf ? buf[i] : Math.floor(Math.random() * 4294967296)) % abc.length];
  houseSetCode(c, true);
}
function houseJoin() {
  const v = String((document.getElementById('houseIn') || {}).value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6,8}$/.test(v)) return;
  houseSetCode(v, false);
}
function houseSetCode(c, isNew) {
  houseCode = c;
  try { localStorage.setItem('kulpio-house', c); } catch {}
  _houseSent = '';
  renderHouseRow();
  if (isNew) houseMaybePush();   // creating: our list becomes the household's
  else housePull();              // joining: the household's list becomes ours
  pearReact('hop', null, '👥', 900);
}
function houseLeave() {
  houseCode = '';
  try { localStorage.removeItem('kulpio-house'); } catch {}
  _houseSent = '';
  renderHouseRow();
}
function renderHouseRow() {
  const box = document.getElementById('houseCtl');
  if (!box) return;
  const lbl = document.getElementById('houseLbl');
  if (lbl) lbl.textContent = l('houseLbl');
  box.innerHTML = houseCode
    ? `<span class="house-code">${esc(houseCode)}</span>
       <button class="fchip" id="houseCopyBtn" onclick="houseCopy()" title="${esc(l('copyCode'))}" aria-label="${esc(l('copyCode'))}">📋</button>
       <button class="fchip active" onclick="openHouseModal()">👥 ${esc(l('houseMembers'))}</button>
       <button class="fchip" onclick="houseLeave()">${esc(l('houseLeave'))}</button>`
    : `<button class="fchip active" onclick="houseCreate()">${esc(l('houseNew'))}</button>
       <input id="houseIn" class="house-in" maxlength="8" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABCD2345" aria-label="${esc(l('houseJoin'))}">
       <button class="fchip" onclick="houseJoin()">${esc(l('houseJoin'))}</button>`;
}
// ── SHARED FRIDGE: members + activity feed ───────────────────────
function openHouseModal() {
  if (!houseCode) return;
  renderHouseModal();
  ensureOverlayHistory();
  document.getElementById('houseModal').classList.add('show');
  housePull();   // grab the freshest members + activity + chat while it's open
  clearInterval(_houseChatPoll);
  _houseChatPoll = setInterval(() => {
    const m = document.getElementById('houseModal');
    if (m && m.classList.contains('show')) housePull(); else clearInterval(_houseChatPoll);
  }, 8000);
  setTimeout(() => renderHouseChat(true), 60);
}
function closeHouseModal() {
  document.getElementById('houseModal').classList.remove('show');
  clearInterval(_houseChatPoll);
}
function houseChatSubmit() {
  const inp = document.getElementById('houseChatIn');
  if (!inp) return;
  houseSend(inp.value);
  inp.value = '';
  inp.focus();
}
function renderHouseChat(scroll) {
  const box = document.getElementById('houseChatFeed');
  if (!box) return;
  const nameFor = uid => (_houseMembers[uid] && _houseMembers[uid].name) || (uid === scanUid ? l('houseYou') : l('houseSomeone'));
  const msgs = (_houseMessages || []).slice(-60);
  box.innerHTML = msgs.length ? msgs.map(m => {
    const mine = m.uid === scanUid;
    return `<div class="hchat-row${mine ? ' me' : ''}">
      <div class="hchat-bubble">${mine ? '' : `<span class="hchat-who">${esc(m.name || nameFor(m.uid))}</span>`}<span class="hchat-tx">${esc(m.text)}</span></div>
    </div>`;
  }).join('') : `<div class="house-empty">${esc(l('houseChatEmpty'))}</div>`;
  if (scroll) box.scrollTop = box.scrollHeight;
}
function houseActKind(k) {
  return k === 'used' ? '✅' : k === 'wasted' ? '🗑️' : '➕';
}
function houseTimeAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - (ts || 0)) / 1000));
  if (s < 60) return l('timeNow');
  const m = Math.round(s / 60); if (m < 60) return m + l('timeMin');
  const h = Math.round(m / 60); if (h < 24) return h + l('timeHr');
  return Math.round(h / 24) + l('timeDay');
}
function renderHouseModal() {
  const t = document.getElementById('houseModalTitle'); if (t) t.textContent = l('houseTitle');
  const codeEl = document.getElementById('houseModalCode'); if (codeEl) codeEl.textContent = houseCode;
  // My display name (editable)
  const nameIn = document.getElementById('houseNameIn');
  if (nameIn && document.activeElement !== nameIn) { nameIn.value = houseMyName(); nameIn.placeholder = l('houseMe'); }
  const nameLbl = document.getElementById('houseNameLbl'); if (nameLbl) nameLbl.textContent = l('houseYourName');
  // Members (me first, then the rest, most-recent first)
  const mem = Object.entries(_houseMembers).map(([uid, m]) => ({ uid, ...m }));
  const mine = mem.find(x => x.uid === scanUid.slice(0, 40) || x.uid === scanUid);
  if (!mine) mem.unshift({ uid: scanUid, name: houseMyName(), avatar: houseMyAvatar(), ts: Date.now(), me: true });
  mem.sort((a, b) => (a.uid === scanUid ? -1 : b.uid === scanUid ? 1 : (b.ts || 0) - (a.ts || 0)));
  const memBox = document.getElementById('houseMemberList');
  if (memBox) memBox.innerHTML = mem.map(m => `<span class="house-mem">
      ${avatarSpan('house-mem-av', m.avatar, m.name)}
      <span class="house-mem-nm">${esc(m.name || l('houseSomeone'))}${(m.uid === scanUid || m.me) ? ' · ' + esc(l('houseYou')) : ''}</span>
    </span>`).join('');
  const memHd = document.getElementById('houseMembersHd'); if (memHd) memHd.textContent = `${l('houseMembers')} · ${mem.length}`;
  // Activity feed
  const nameFor = uid => (_houseMembers[uid] && _houseMembers[uid].name) || (uid === scanUid ? l('houseYou') : l('houseSomeone'));
  const actHd = document.getElementById('houseActivityHd'); if (actHd) actHd.textContent = l('houseActivity');
  const feed = document.getElementById('houseFeed');
  if (feed) {
    const acts = (_houseActivity || []).slice(0, 25);
    feed.innerHTML = acts.length ? acts.map(a => `<div class="house-act">
        <span class="house-act-ic">${houseActKind(a.kind)}</span>
        <span class="house-act-tx"><b>${esc(nameFor(a.uid))}</b> ${esc(l('houseAct_' + a.kind) || l('houseAct_add'))} <b>${esc(a.name)}</b></span>
        <span class="house-act-ago">${esc(houseTimeAgo(a.ts))}</span>
      </div>`).join('') : `<div class="house-empty">${esc(l('houseNoActivity'))}</div>`;
  }
  // Chat
  const chatHd = document.getElementById('houseChatHd'); if (chatHd) chatHd.textContent = l('houseChat');
  const chatIn = document.getElementById('houseChatIn'); if (chatIn) chatIn.placeholder = l('houseChatPlaceholder');
  const chatSend = document.getElementById('houseChatSend'); if (chatSend) chatSend.textContent = l('houseSend');
  renderHouseChat();
}

// Copy the shared-fridge code to the clipboard, with a brief ✓ on the button.
async function houseCopy() {
  if (!houseCode) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(houseCode);
    else { const t = document.createElement('textarea'); t.value = houseCode; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    const btn = document.getElementById('houseCopyBtn');
    if (btn) { btn.textContent = '✓'; btn.classList.add('active'); setTimeout(() => { btn.textContent = '📋'; btn.classList.remove('active'); }, 1400); }
    if (typeof toast === 'function') toast(l('copied'));
    if (navigator.vibrate) navigator.vibrate(8);
  } catch {}
}

// ── CROWD PRICES ── a save or re-buy of a barcode-carrying product with a
// price AND a store is a real observation: {code, store, price, currency}
// goes to D1. Deduped per session so an edit-resave doesn't double-count.
const _pricesSent = new Set();
function logPriceCloud(p) {
  const url = aiProxyUrl();
  if (!url || !p || !p.code || !p.store || !(parseFloat(p.price) > 0) || !scanUid || !navigator.onLine) return;
  const key = `${p.code}|${String(p.store).toLowerCase()}|${p.price}`;
  if (_pricesSent.has(key)) return;
  _pricesSent.add(key);
  delete _crowdCache[p.code];   // the next card open shows the fresh average
  try {
    fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceLog: { code: p.code, store: p.store, price: parseFloat(p.price), cur: currentCurrency, uid: scanUid } }),
    }).catch(() => {});
  } catch {}
}
// What the community pays for this product, per store, in MY currency.
const _crowdCache = {};
async function queueCrowdPrices(f) {
  const el = document.getElementById('scardCrowd');
  if (!el) return;
  el.style.display = 'none';
  const url = aiProxyUrl();
  if (!url || !f || !f.code || !navigator.onLine) return;
  const key = f.code + '|' + currentCurrency;
  let c = _crowdCache[f.code];
  if (!c || c.key !== key || Date.now() - c.at > 600000) {
    const r = await postJSON(url, { priceGet: { code: f.code, cur: currentCurrency } }, 10000);
    if (!r || !Array.isArray(r.stores)) return;
    c = { key, at: Date.now(), stores: r.stores.filter(s => s && s.store && s.avg > 0) };
    _crowdCache[f.code] = c;
  }
  if (_scanFound !== f || !c.stores.length) return;
  el.textContent = '🏷 ' + c.stores.slice(0, 3).map(s => `${s.store} ≈ ${formatPrice(s.avg)}`).join(' · ');
  el.title = l('commPrice');
  el.setAttribute('aria-label', l('commPrice'));
  el.style.display = '';
}

async function lookupBarcode(barcode, fromScanner) {
  const status = document.getElementById('scanStatus');
  hideScanTeach();
  // Your own taught products answer first — instantly, and offline too.
  const own = myCodes[barcode];
  if (own) {
    _scanFound = {
      name: own.name, brand: own.brand || '', store: own.store || '',
      img: own.img || '', code: String(barcode), mine: true,
      grade: '', nova: 0, adds: null, kcal: null, prot: null, fat: null,
      carb: null, ing: '', cats: [], diet: [], allg: []
    };
    pushScanHist(_scanFound);
    if (fromScanner) logScanCloud(_scanFound);
    queueAiEstimate(own.name);
    showScanCard(_scanFound);
    return;
  }
  status.textContent = l('recognizing');
  try {
    // fetchJSON has a hard timeout — a hung network must not leave the
    // scanner stuck on "recognizing…" forever.
    const offUrl = aiProxyUrl();
    const data = offUrl
      ? await postJSON(offUrl, { offProduct: { code: barcode } }, 10000)
      : await fetchJSON(`https://world.openfoodfacts.org/api/v3/product/${barcode}.json`, 10000);
    if (data && (data.status === 1 || data.status === 'success') && data.product) {
      const f = offCardPayload(data.product, barcode);
      if (f.name) {
        _scanFound = f;
        pushScanHist(_scanFound);
        if (fromScanner) logScanCloud(_scanFound);
        queueAiEstimate(f.name);   // shelf-life answer is usually in hand by the tap
        showScanCard(_scanFound);
        return;
      }
    }
    status.textContent = l('barcodeNotFound');
    showScanTeach(barcode);   // …but Kulpio can be taught (Rate&Goods style)
  } catch {
    status.textContent = l('barcodeNotFound');
    showScanTeach(barcode);
  }
  // Unknown product: let the message sink in, then quietly resume the
  // camera so the next scan needs no extra taps.
  setTimeout(() => {
    const overlay = document.getElementById('scanOverlay');
    if (overlay.classList.contains('show') && !scannerActive) {
      document.getElementById('scanStatus').textContent = l('scanning');
      startBarcodeScanner();
    }
  }, 2200);
}

// ── FOUND CARD ── the scan result, Rate&Goods style: the product shows as a
// card (photo, name, brand) with one-tap add; the full form is one tap away
// for anyone who wants to set a price or date. Reuses toFridge/editProduct/
// retry — no new strings.
let _scanFound = null;   // { name, brand, store, img } waiting on the card
function showScanCard(f) {
  // The card stages itself: opened from the hub, global search or a history
  // tile, the overlay may not be up yet — .found hides everything but the card.
  if (scanDocked() && scannerActive) stopBarcodeScanner();   // no camera burning under the card
  const ov = document.getElementById('scanOverlay');
  if (!ov.classList.contains('show')) { ensureOverlayHistory(); ov.classList.add('show'); }
  document.getElementById('scanStatus').textContent = '';
  const img = document.getElementById('scardImg');
  const emo = document.getElementById('scardEmoji');
  // The emoji shows the instant the card opens; the pack photo (OFF's CDN can
  // be slow) fades in over it only once it has actually arrived — the card
  // never sits there with a blank white square.
  img.style.display = 'none';
  emo.style.display = '';
  emo.textContent = foodEmoji(f.name) || '🛒';
  if (f.img) {
    img.onload = () => {
      if (_scanFound !== f) return;   // a rescan replaced this card meanwhile
      img.style.display = '';
      emo.style.display = 'none';
    };
    img.onerror = () => {};           // photo failed: the emoji simply stays
    img.src = f.img;
    if (img.complete && img.naturalWidth) img.onload();   // already cached
  }
  document.getElementById('scardName').textContent = f.name;
  // OFF sometimes lists the product's own name as its brand ("Nutella" by
  // "Nutella") — saying it twice on one card looks broken, so skip the echo.
  document.getElementById('scardBrand').textContent = [f.brand, f.store]
    .filter(Boolean)
    .filter(x => x.toLowerCase() !== f.name.toLowerCase())
    .join(' · ');

  // What you last paid for it — Kulpio's own price memory stands in for
  // Rate&Goods' crowd prices.
  const priceEl = document.getElementById('scardPrice');
  const known = lastKnownPrice(f.name);
  priceEl.style.display = known > 0 ? '' : 'none';
  if (known > 0) priceEl.textContent = '💳 ≈ ' + formatPrice(known);

  // ── composition verdict: stars, Nutri-Score, NOVA ──
  const score = scanScore(f);
  const scoreBox = document.getElementById('scardScore');
  scoreBox.style.display = score === null ? 'none' : '';
  if (score !== null) {
    const full = Math.round(score);
    document.getElementById('scardStars').textContent = '★'.repeat(full) + '☆'.repeat(5 - full);
    document.getElementById('scardSnum').textContent = score.toFixed(1);
    const g = document.getElementById('scardGrade');
    g.style.display = f.grade ? '' : 'none';
    if (f.grade) {
      g.innerHTML = `<span class="sg-lab">Nutri-Score</span><span class="sg-val">${f.grade.toUpperCase()}</span>`;
      g.className = 'scard-grade g-' + f.grade;
    }
    const nv = document.getElementById('scardNova');
    nv.style.display = f.nova ? '' : 'none';
    if (f.nova) {
      nv.innerHTML = `<span class="sg-lab">NOVA</span><span class="sg-val">${f.nova}</span>`;
      nv.className = 'scard-nova n-' + f.nova;
    }
    // The tiles live in their own row now — show it only when there's a tile.
    document.getElementById('scardGrades').style.display = (f.grade || f.nova) ? '' : 'none';
  } else {
    document.getElementById('scardGrades').style.display = 'none';
  }

  // ── nutrition per 100 g ──
  const nutBox = document.getElementById('scardNut');
  const hasNut = f.kcal !== null && f.kcal !== undefined;
  nutBox.style.display = hasNut ? '' : 'none';
  if (hasNut) {
    const cell = (v, lab) => `<div class="scard-nu"><b>${v}</b><span>${lab}</span></div>`;
    const gr = v => (v === null || v === undefined) ? '–' : (Math.round(v * 10) / 10) + '';
    nutBox.innerHTML =
      cell(f.kcal, 'kcal') +
      cell(gr(f.prot), l('protein')) +
      cell(gr(f.fat), l('fat')) +
      cell(gr(f.carb), l('carbs')) +
      `<div class="scard-cap">${l(currentUnits === 'imperial' ? 'scanPerOz' : 'scanPer100')}</div>`;
  }

  // ── additives: risk-colored chips, worst first; tap one for its story ──
  const addBox = document.getElementById('scardAdds');
  const addInfo = document.getElementById('scardAddInfo');
  addInfo.style.display = 'none';
  addBox.style.display = f.adds === null || f.adds === undefined ? 'none' : '';
  if (f.adds) {
    const ranked = [...f.adds].sort((x, y) => addRiskRank(y) - addRiskRank(x));
    addBox.innerHTML = ranked.length
      ? `<span>${l('additivesLbl')}:</span>` +
        ranked.slice(0, 8).map(a => {
          const cls = { g: ' ar-g', y: ' ar-y', r: ' ar-r' }[addRisk(a)] || '';
          return `<button class="scard-add${cls}" onclick="showAddInfo('${esc(a)}')">${esc(a)}</button>`;
        }).join('') +
        (ranked.length > 8 ? `<span class="scard-add">+${ranked.length - 8}</span>` : '')
      : `<span class="ok">✓ ${l('noAdditives')}</span>`;
  } else if (!f.adds) {
    addBox.innerHTML = '';
  }

  // ── diet verdicts: vegan beats vegetarian, palm oil is worth a flag either way ──
  const dietBox = document.getElementById('scardDiet');
  const d = f.diet || [];
  const flags = [];
  if (f.mine) flags.push(['g', '🖊 ' + l('myProduct')]);   // taught by you, not OFF
  if (d.includes('vegan')) flags.push(['g', '🌱 ' + l('dietVegan')]);
  else if (d.includes('vegetarian')) flags.push(['g', '🥦 ' + l('dietVeg')]);
  if (d.includes('palm-oil')) flags.push(['r', '🌴 ' + l('dietPalm')]);
  else if (d.includes('palm-oil-free')) flags.push(['g', '🌴 ' + l('dietPalmFree')]);
  dietBox.style.display = flags.length ? '' : 'none';
  dietBox.innerHTML = flags.map(([c, t]) => `<span class="scard-flag ar-${c}">${t}</span>`).join('');

  // ── declared allergens; the ones YOU picked in Settings burn red + banner ──
  const allgBox = document.getElementById('scardAllg');
  const al = f.allg || [];
  allgBox.style.display = al.length ? '' : 'none';
  allgBox.innerHTML = al.length
    ? `<span>${l('allergensLbl')}:</span>` + al.map(k =>
        `<span class="scard-flag${myAllergens.includes(k) ? ' ar-r' : ''}">${allergenName(k)}</span>`).join('')
    : '';
  const warn = document.getElementById('scardWarn');
  const hits = al.filter(k => myAllergens.includes(k));
  warn.style.display = hits.length ? '' : 'none';
  if (hits.length) warn.textContent = '⚠️ ' + l('allergenWarn').replace('{x}', hits.map(allergenName).join(', '));

  // ── full composition, folded behind one tap ──
  const ingBtn = document.getElementById('scardIngBtn');
  const ingBox = document.getElementById('scardIng');
  ingBox.classList.remove('open');
  ingBtn.style.display = f.ing ? '' : 'none';
  ingBtn.textContent = '📋 ' + l('ingredientsLabel') + ' ▾';
  ingBox.textContent = f.ing || '';
  refreshScardDetails();   // show the "More details" toggle only if the fold has content

  document.getElementById('scardAlts').style.display = 'none';   // reset; filled async
  // Category browsing: folded by default, only offered when a category is known.
  document.getElementById('scardTop').style.display = 'none';
  _scanTop = [];
  const catBtn = document.getElementById('scardCatBtn');
  const catName = prettyCat(f);
  catBtn.style.display = catName ? '' : 'none';
  if (catName) catBtn.textContent = '🏆 ' + l('topCat') + ' · ' + catName + ' ▾';
  syncCmpBtn();
  syncFavBtn();
  syncMyRating();
  const share = document.getElementById('scardShare');
  share.textContent = '📤';
  share.title = l('recapShare');
  share.setAttribute('aria-label', l('recapShare'));

  document.getElementById('scardAdd').textContent = '🧊 ' + l('toFridge');
  document.getElementById('scardEdit').textContent = '✏️ ' + l('editProduct');
  document.getElementById('scardAgain').textContent = '↺ ' + l('retry');
  document.getElementById('scanOverlay').classList.add('found');
  queueScanVerdict(f);       // his review arrives quietly when the AI answers
  queueScanAlts(f);          // …and so do the healthier picks
  queueCommunityRating(f);   // …and what everyone else gave it
  queueCrowdPrices(f);       // …and what they pay for it, store by store
}

// ── COMMUNITY RATING ── the average of every install's stars for this
// product, from the same D1 the scans go to. Cached 10 min per code;
// stale-guarded like the verdict — a newer card never wears an old number.
const _commCache = {};
async function queueCommunityRating(f) {
  const el = document.getElementById('scardComm');
  if (!el) return;
  el.style.display = 'none';
  const url = aiProxyUrl();
  if (!url || !f || !f.code || !navigator.onLine) return;
  let c = _commCache[f.code];
  if (!c || Date.now() - c.at > 600000) {
    const r = await postJSON(url, { rateGet: { code: f.code } }, 10000);
    if (!r || typeof r.n !== 'number') return;
    c = { avg: r.avg, n: r.n, at: Date.now() };
    _commCache[f.code] = c;
  }
  if (_scanFound !== f || !c.n || c.avg == null) return;   // stale, or nobody has rated yet
  el.textContent = `👥 ★ ${c.avg} · ${c.n}`;
  el.title = l('commRating');
  el.setAttribute('aria-label', `${l('commRating')}: ${c.avg}/5 (${c.n})`);
  el.style.display = '';
}
// Send my vote to the community (stars 0 = vote withdrawn). Fire-and-forget;
// the open card refreshes its average once the vote has had time to land.
function logRateCloud(code, stars) {
  const url = aiProxyUrl();
  if (!url || !code || !scanUid || !navigator.onLine) return;
  delete _commCache[code];
  try {
    fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rateLog: { code, stars: stars || 0, uid: scanUid } }),
    }).catch(() => {});
  } catch {}
  setTimeout(() => { if (_scanFound && _scanFound.code === code) queueCommunityRating(_scanFound); }, 900);
}

function toggleScardIng() {
  const box = document.getElementById('scardIng');
  const open = box.classList.toggle('open');
  document.getElementById('scardIngBtn').textContent = '📋 ' + l('ingredientsLabel') + (open ? ' ▴' : ' ▾');
}
// The nutrition/additives/diet/ingredients fold on the product card.
function refreshScardDetails() {
  const box = document.getElementById('scardDetails');
  const btn = document.getElementById('scardMoreBtn');
  if (!box || !btn) return;
  const any = [...box.children].some(c => c.id && c.style.display !== 'none');
  box.style.display = 'none';               // always start collapsed
  btn.style.display = any ? '' : 'none';     // only offer the toggle if there's content
  btn.setAttribute('aria-expanded', 'false');
  if (btn.firstChild) btn.firstChild.nodeValue = '＋ ';
  const lbl = document.getElementById('scardMoreLbl'); if (lbl) lbl.textContent = l('moreDetails');
}
function toggleScardDetails() {
  const box = document.getElementById('scardDetails');
  const btn = document.getElementById('scardMoreBtn');
  const open = box.style.display === 'none';
  box.style.display = open ? '' : 'none';
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (btn.firstChild) btn.firstChild.nodeValue = open ? '－ ' : '＋ ';
  const lbl = document.getElementById('scardMoreLbl'); if (lbl) lbl.textContent = open ? l('lessDetails') : l('moreDetails');
}

// ── HEALTHIER PICKS ── same OFF category, strictly better Nutri-Score.
// Fetched after the card shows, like the verdict: never blocks, silently
// absent when the category is unknown, the product already rates A, or the
// network lets us down. Tapping a pick opens ITS card — comparison shopping.
const _altCache = {};   // barcode → up to 3 alternatives (this session)
let _scanAlts = [];     // what the current card's tiles point at
async function queueScanAlts(f) {
  const box = document.getElementById('scardAlts');
  box.style.display = 'none';
  _scanAlts = [];
  if (!f.grade || f.grade === 'a' || !f.cats || !f.cats.length || !navigator.onLine) return;
  const show = alts => {
    if (_scanFound !== f || !alts.length) return;
    _scanAlts = alts;
    box.innerHTML = `<div class="alt-lbl">🌿 ${l('altLbl')}</div><div class="alt-row">` + alts.map((a, i) => {
      const pic = a.img ? `<img src="${a.img}" alt="" loading="lazy">` : `<span class="alt-emoji">${foodEmoji(a.name) || '🛒'}</span>`;
      return `<button class="scard-alt" onclick="openAltProduct(${i})" title="${esc(a.name)}">${pic}<span class="alt-name">${esc(a.name)}</span><span class="alt-grade g-${a.grade}">${a.grade.toUpperCase()}</span></button>`;
    }).join('') + '</div>';
    box.style.display = '';
  };
  if (_altCache[f.code]) { show(_altCache[f.code]); return; }
  try {
    const cat = f.cats[f.cats.length - 1];
    const data = await fetchJSON('https://world.openfoodfacts.org/api/v2/search?categories_tags='
      + encodeURIComponent(cat)
      + '&fields=code,product_name,brands,image_front_thumb_url,nutrition_grades,nova_group,additives_tags,nutriments,categories_tags,ingredients_analysis_tags,allergens_tags'
      + '&sort_by=unique_scans_n&page_size=24', 9000);
    const seen = new Set([f.name.toLowerCase()]);
    const alts = (data && data.products || [])
      .map(p => offCardPayload(p))
      .filter(a => a.name && a.grade && a.grade < f.grade && a.code !== f.code)
      .filter(a => !seen.has(a.name.toLowerCase()) && seen.add(a.name.toLowerCase()))
      .sort((a, b) => a.grade === b.grade ? (a.nova || 9) - (b.nova || 9) : (a.grade < b.grade ? -1 : 1))
      .slice(0, 3);
    _altCache[f.code] = alts;
    show(alts);
  } catch {}
}
// A pick becomes the card — same full product page, history entry included.
function openAltProduct(i) {
  const a = _scanAlts[i];
  if (!a) return;
  pushScanHist(a);
  _scanFound = a;
  queueAiEstimate(a.name);
  showScanCard(a);
}

// ── TOP OF THE CATEGORY ── Rate&Goods' category ratings, OFF edition: fold
// out the category's most-scanned products, any grade — browsing, not only
// "healthier". Tapping a tile opens ITS card, so you can walk the shelf.
let _scanTop = [];
const _topCache = {};   // barcode → top-of-category tiles (this session)
function prettyCat(f) {
  if (!f || !f.cats || !f.cats.length) return '';
  return String(f.cats[f.cats.length - 1]).replace(/^\w\w:/, '').replace(/-/g, ' ');
}
async function toggleTopCat() {
  const f = _scanFound;
  const box = document.getElementById('scardTop');
  const btn = document.getElementById('scardCatBtn');
  if (!f) return;
  const cat = f.cats && f.cats.length ? f.cats[f.cats.length - 1] : '';
  if (!cat) return;
  const label = '🏆 ' + l('topCat') + ' · ' + prettyCat(f);
  if (box.style.display !== 'none') {   // second tap folds it back
    box.style.display = 'none';
    btn.textContent = label + ' ▾';
    return;
  }
  const show = tops => {
    if (_scanFound !== f || !tops.length) return;
    _scanTop = tops;
    box.innerHTML = '<div class="alt-row">' + tops.map((a, i) => {
      const pic = a.img ? `<img src="${a.img}" alt="" loading="lazy">` : `<span class="alt-emoji">${foodEmoji(a.name) || '🛒'}</span>`;
      const grade = a.grade ? `<span class="alt-grade g-${a.grade}">${a.grade.toUpperCase()}</span>` : '';
      return `<button class="scard-alt" onclick="openTopProduct(${i})" title="${esc(a.name)}">${pic}<span class="alt-name">${esc(a.name)}</span>${grade}</button>`;
    }).join('') + '</div>';
    box.style.display = '';
    btn.textContent = label + ' ▴';
  };
  if (_topCache[f.code]) { show(_topCache[f.code]); return; }
  if (!navigator.onLine) return;
  try {
    const data = await fetchJSON('https://world.openfoodfacts.org/api/v2/search?categories_tags='
      + encodeURIComponent(cat)
      + '&fields=code,product_name,brands,image_front_thumb_url,nutrition_grades,nova_group,additives_tags,nutriments,categories_tags,ingredients_analysis_tags,allergens_tags'
      + '&sort_by=unique_scans_n&page_size=12', 9000);
    if (_scanFound !== f) return;
    const seen = new Set([String(f.name || '').toLowerCase()]);
    const tops = (data && data.products || [])
      .map(p => offCardPayload(p))
      .filter(a => a.name && a.code && a.code !== f.code)
      .filter(a => !seen.has(a.name.toLowerCase()) && seen.add(a.name.toLowerCase()))
      .slice(0, 6);
    _topCache[f.code] = tops;
    show(tops);
  } catch {}
}
function openTopProduct(i) {
  const a = _scanTop[i];
  if (!a) return;
  pushScanHist(a);
  _scanFound = a;
  queueAiEstimate(a.name);
  showScanCard(a);
}

// ── COMPARISON ── hold one product, open any other card (scan, history,
// healthier pick), tap the chip again: the two side by side, better cell
// highlighted. The hold lives only while the scanner is open.
let _cmpHold = null;
function scanCompareTap() {
  const f = _scanFound;
  if (!f) return;
  if (!_cmpHold || _cmpHold.code === f.code) {
    _cmpHold = (_cmpHold && _cmpHold.code === f.code) ? null : f;   // arm / disarm
    syncCmpBtn();
    return;
  }
  openCmpModal(_cmpHold, f);
}
function syncCmpBtn() {
  const b = document.getElementById('scardCmp');
  const f = _scanFound;
  if (!b || !f) return;
  b.classList.remove('held', 'vs');
  if (_cmpHold && _cmpHold.code === f.code) {
    b.textContent = '⚖️ ' + l('cmpLbl') + ' ✓';
    b.classList.add('held');
  } else if (_cmpHold) {
    b.textContent = '⚖️ ' + l('cmpWith').replace('{x}', _cmpHold.name);
    b.classList.add('vs');
  } else {
    b.textContent = '⚖️ ' + l('cmpLbl');
  }
}
function openCmpModal(a, b) {
  document.getElementById('cmpTitleEl').textContent = '⚖️ ' + l('cmpTitle');
  const rows = [];
  const pcell = p => `<div class="cmp-p">`
    + (p.img ? `<img src="${p.img}" alt="">` : `<span class="cmp-emoji">${foodEmoji(p.name) || '🛒'}</span>`)
    + `<span class="cmp-name">${esc(p.name)}</span>`
    + (p.grade ? `<span class="alt-grade g-${p.grade}">${p.grade.toUpperCase()}</span>` : '')
    + `</div>`;
  rows.push(`<div class="cmp-c cmp-lbl"></div><div class="cmp-c">${pcell(a)}</div><div class="cmp-c">${pcell(b)}</div>`);
  // win: -1 = left is better, 1 = right, 0 = tie/unknown — judged rows only.
  const row = (lbl, va, vb, win) => rows.push(
    `<div class="cmp-c cmp-lbl">${lbl}</div>`
    + `<div class="cmp-c${win === -1 ? ' win' : ''}">${va}</div>`
    + `<div class="cmp-c${win === 1 ? ' win' : ''}">${vb}</div>`);
  const lower = (x, y) => (x === null || y === null || x === y) ? 0 : (x < y ? -1 : 1);

  const sa = scanScore(a), sb = scanScore(b);
  if (sa !== null || sb !== null) {
    row('★', sa === null ? '–' : sa.toFixed(1), sb === null ? '–' : sb.toFixed(1),
      sa === sb ? 0 : (sb === null || (sa !== null && sa > sb) ? -1 : 1));
  }
  if (a.nova || b.nova) row('NOVA', a.nova || '–', b.nova || '–', lower(a.nova || null, b.nova || null));
  // Your own stars, when you've rated either side — more stars wins.
  const ma = myRatingOf(a.code), mb = myRatingOf(b.code);
  const ra = (ma && ma.r) || 0, rb = (mb && mb.r) || 0;
  if (ra || rb) {
    row(l('myRating'), ra ? '★'.repeat(ra) : '–', rb ? '★'.repeat(rb) : '–',
      ra === rb ? 0 : (ra > rb ? -1 : 1));
  }
  // Plain facts — shown, never judged: fewer calories isn't "winning".
  const num = v => (v === null || v === undefined) ? '–' : Math.round(v * 10) / 10;
  if (a.kcal || b.kcal) {
    row('kcal', num(a.kcal), num(b.kcal), 0);
    row(l('protein'), num(a.prot), num(b.prot), 0);
    row(l('fat'), num(a.fat), num(b.fat), 0);
    row(l('carbs'), num(a.carb), num(b.carb), 0);
  }
  const na = Array.isArray(a.adds) ? a.adds.length : null;
  const nb = Array.isArray(b.adds) ? b.adds.length : null;
  if (na !== null || nb !== null) row(l('additivesLbl'), na === null ? '–' : na, nb === null ? '–' : nb, lower(na, nb));
  const pa = lastKnownPrice(a.name), pb = lastKnownPrice(b.name);
  if (pa > 0 || pb > 0) {
    row('💳', pa > 0 ? formatPrice(pa) : '–', pb > 0 ? formatPrice(pb) : '–',
      (pa > 0 && pb > 0) ? lower(pa, pb) : 0);
  }
  document.getElementById('cmpBody').innerHTML = `<div class="cmp-grid">${rows.join('')}</div>`;
  ensureOverlayHistory();
  document.getElementById('cmpModal').classList.add('show');
}
function closeCmpModal() { document.getElementById('cmpModal').classList.remove('show'); }

// The pear's one-line review of the scanned product — the AI writes it in the
// UI language from the same composition facts the card shows. Purely a bonus:
// the card never waits for it, and a timeout just means no verdict line.
const _verdictCache = {};   // code|lang → sentence (one opinion per session)
async function queueScanVerdict(f) {
  const el = document.getElementById('scardVerdict');
  el.style.display = 'none';
  el.textContent = '';
  const url = aiProxyUrl();
  if (!url || !navigator.onLine || !f.code) return;
  const show = txt => {
    if (_scanFound !== f) return;   // he'd be reviewing someone else's card
    el.textContent = txt;           // the 🍐 comes from the card's ::before icon
    el.style.display = '';
  };
  const key = f.code + '|' + currentLang;
  if (_verdictCache[key]) { show(_verdictCache[key]); return; }
  const data = await postJSON(url, {
    verdict: {
      name: f.name, brand: f.brand, grade: f.grade, nova: f.nova,
      adds: f.adds || [], kcal: f.kcal, lang: currentLang
    }
  }, 25000);
  const v = data && typeof data.verdict === 'string' ? data.verdict.trim() : '';
  if (!v) return;
  _verdictCache[key] = v;
  show(v);
}

// ── ADDITIVE RISK ── the Rate&Goods traffic light: g = generally safe,
// y = fine in moderation, r = better avoided. Compact table of the additives
// that actually show up on groceries; anything unlisted stays neutral grey.
// Names are the international ones — near-universal across the 33 languages.
const E_INFO = {
  E100:['curcumin','g'],E101:['riboflavin','g'],E140:['chlorophyll','g'],E150a:['plain caramel','g'],
  E160a:['carotene','g'],E160c:['paprika extract','g'],E162:['beetroot red','g'],E163:['anthocyanins','g'],
  E170:['calcium carbonate','g'],E200:['sorbic acid','g'],E202:['potassium sorbate','g'],E260:['acetic acid','g'],
  E270:['lactic acid','g'],E290:['carbon dioxide','g'],E296:['malic acid','g'],E300:['ascorbic acid (vit. C)','g'],
  E301:['sodium ascorbate','g'],E306:['tocopherols (vit. E)','g'],E322:['lecithin','g'],E325:['sodium lactate','g'],
  E326:['potassium lactate','g'],E330:['citric acid','g'],E331:['sodium citrates','g'],E333:['calcium citrates','g'],
  E336:['potassium tartrates','g'],E406:['agar','g'],E410:['locust bean gum','g'],E412:['guar gum','g'],
  E414:['acacia gum','g'],E415:['xanthan gum','g'],E422:['glycerol','g'],E440:['pectin','g'],
  E460:['cellulose','g'],E500:['baking soda','g'],E501:['potassium carbonates','g'],E503:['ammonium carbonates','g'],
  E504:['magnesium carbonates','g'],E509:['calcium chloride','g'],E516:['calcium sulphate','g'],E551:['silicon dioxide','g'],
  E901:['beeswax','g'],E903:['carnauba wax','g'],E1400:['modified starch','g'],E1404:['modified starch','g'],
  E1412:['modified starch','g'],E1414:['modified starch','g'],E1420:['modified starch','g'],E1422:['modified starch','g'],
  E150d:['sulphite ammonia caramel','y'],E160b:['annatto','y'],E172:['iron oxides','y'],E210:['benzoic acid','y'],
  E211:['sodium benzoate','y'],E212:['potassium benzoate','y'],E223:['sodium metabisulphite','y'],E224:['potassium metabisulphite','y'],
  E234:['nisin','y'],E242:['dimethyl dicarbonate','y'],E280:['propionic acid','y'],E338:['phosphoric acid','y'],
  E339:['sodium phosphates','y'],E340:['potassium phosphates','y'],E341:['calcium phosphates','y'],E407:['carrageenan','y'],
  E420:['sorbitol','y'],E421:['mannitol','y'],E432:['polysorbate 20','y'],E433:['polysorbate 80','y'],
  E435:['polysorbate 60','y'],E442:['ammonium phosphatides','y'],E450:['diphosphates','y'],E451:['triphosphates','y'],
  E452:['polyphosphates','y'],E461:['methyl cellulose','y'],E464:['hypromellose','y'],E466:['carboxymethyl cellulose','y'],
  E471:['mono-/diglycerides','y'],E472e:['DATEM esters','y'],E473:['sucrose esters','y'],E475:['polyglycerol esters','y'],
  E476:['polyglycerol polyricinoleate','y'],E481:['sodium stearoyl lactylate','y'],E491:['sorbitan monostearate','y'],
  E621:['monosodium glutamate','y'],E627:['disodium guanylate','y'],E631:['disodium inosinate','y'],E635:['ribonucleotides','y'],
  E950:['acesulfame K','y'],E951:['aspartame','y'],E952:['cyclamate','y'],E954:['saccharin','y'],
  E955:['sucralose','y'],E965:['maltitol','y'],E967:['xylitol','y'],E1442:['modified starch','y'],E1450:['modified starch','y'],
  E102:['tartrazine','r'],E104:['quinoline yellow','r'],E110:['sunset yellow','r'],E122:['azorubine','r'],
  E123:['amaranth dye','r'],E124:['ponceau 4R','r'],E127:['erythrosine','r'],E129:['allura red','r'],
  E131:['patent blue V','r'],E142:['green S','r'],E151:['brilliant black','r'],E155:['brown HT','r'],
  E171:['titanium dioxide','r'],E173:['aluminium','r'],E214:['parabens','r'],E215:['parabens','r'],
  E218:['parabens','r'],E220:['sulphur dioxide','r'],E230:['biphenyl','r'],E231:['orthophenyl phenol','r'],
  E239:['hexamethylene tetramine','r'],E249:['potassium nitrite','r'],E250:['sodium nitrite','r'],
  E251:['sodium nitrate','r'],E252:['potassium nitrate','r'],E320:['BHA','r'],E321:['BHT','r'],E385:['calcium disodium EDTA','r'],
};
// OFF uppercases subtypes ("E150D") while the table keys them the printed
// way ("E150d"); an unknown subtype still matches its parent number.
function addInfoOf(code) {
  const c = String(code).toUpperCase();
  const m = c.match(/^E(\d+)([A-Z]*)$/);
  if (!m) return E_INFO[code] || null;
  return E_INFO[c] || E_INFO['E' + m[1] + m[2].toLowerCase()] || E_INFO['E' + m[1]] || null;
}
function addRisk(code) { return (addInfoOf(code) || [])[1] || ''; }
function addRiskRank(code) { return { r: 3, y: 2, '': 1, g: 0 }[addRisk(code)] ?? 1; }
// Tap a chip: "E250 · sodium nitrite — ⛔ better avoided" (tap again to hide).
function showAddInfo(code) {
  const el = document.getElementById('scardAddInfo');
  if (el.dataset.code === code && el.style.display !== 'none') {
    el.style.display = 'none';
    return;
  }
  const info = addInfoOf(code);
  const risk = addRisk(code);
  const badge = { g: '✅ ' + l('addSafe'), y: '⚠️ ' + l('addModerate'), r: '⛔ ' + l('addAvoid') }[risk] || '·';
  el.textContent = code + (info ? ' · ' + info[0] : '') + ' — ' + badge;
  el.dataset.code = code;
  el.style.display = '';
}

// A 0.5–5 score computed from what is actually known about the composition:
// Nutri-Score does the heavy lifting, ultra-processing and a long additive
// list shave the rest. Null when OFF knows nothing — no fake ratings.
function scanScore(f) {
  const knowsAdds = Array.isArray(f.adds);
  if (!f.grade && !f.nova && !knowsAdds) return null;
  let s = 5;
  s -= f.grade ? ({ a: 0, b: 0.5, c: 1.5, d: 2.5, e: 3.5 })[f.grade] : 0;
  if (f.nova === 4) s -= 1;
  else if (f.nova === 3) s -= 0.5;
  if (knowsAdds) s -= Math.min(1, f.adds.length * 0.15);
  return Math.max(0.5, Math.round(s * 2) / 2);
}

// ── TEXT SEARCH ── Rate&Goods lets you look a product up when there's no
// barcode to point at (loose goods, a friend's question, a torn label).
// Debounced OFF text search; a result tile opens the same full card a scan
// would, history entry included. The camera keeps running while you type.
let _searchSeq = 0, _searchTimer = null, _searchRes = [];
function onScanSearch(v, target = 'scanSearchRes') {
  clearTimeout(_searchTimer);
  const q = String(v || '').trim();
  if (q.length < 3) {
    _searchSeq++;   // a slow in-flight answer must not resurrect cleared results
    _searchRes = [];
    const t = document.getElementById(target); if (t) t.innerHTML = '';
    return;
  }
  _searchTimer = setTimeout(() => runScanSearch(q, target), 450);
}
async function runScanSearch(q, target = 'scanSearchRes') {
  const seq = ++_searchSeq;
  const box = document.getElementById(target);
  if (!box || !navigator.onLine) return;
  box.innerHTML = `<div class="scan-search-none">…</div>`;
  try {
    const data = await fetchJSON('https://world.openfoodfacts.org/cgi/search.pl?action=process&json=1&search_simple=1'
      + '&page_size=8&sort_by=unique_scans_n'
      + '&search_terms=' + encodeURIComponent(q)
      + '&fields=code,product_name,brands,image_front_thumb_url,nutrition_grades,nova_group,additives_tags,nutriments,categories_tags,ingredients_text,ingredients_analysis_tags,allergens_tags', 9000);
    if (seq !== _searchSeq) return;   // an older answer must not overwrite a newer query
    const items = (data && data.products || [])
      .map(p => offCardPayload(p))
      .filter(a => a.name && a.code)
      .slice(0, 8);
    _searchRes = items;
    box.innerHTML = items.length
      ? items.map((a, i) => {
          const pic = a.img
            ? `<img src="${a.img}" alt="" loading="lazy">`
            : `<span class="hi-emoji">${foodEmoji(a.name) || '🛒'}</span>`;
          const grade = a.grade ? `<span class="alt-grade g-${a.grade}">${a.grade.toUpperCase()}</span>` : '';
          return `<button class="scan-hi" onclick="openSearchResult(${i})" title="${esc(a.name)}">${pic}<span class="hi-name">${esc(a.name)}</span>${grade}</button>`;
        }).join('')
      : `<div class="scan-search-none">${l('scanNoRes')}</div>`;
  } catch {
    if (seq === _searchSeq) box.innerHTML = '';
  }
}
// A search hit becomes the card — camera off, exactly like a history reopen.
// Works from the overlay strip, the hub tab and the global search alike
// (showScanCard raises the overlay itself when it isn't up yet).
function openSearchResult(i) {
  const a = _searchRes[i];
  if (!a) return;
  closeGlobalSearch();   // the card's overlay sits below the search modal
  stopBarcodeScanner();
  document.getElementById('scanVideo').style.display = 'none';
  setScanLive(false);
  pushScanHist(a);
  _scanFound = a;
  queueAiEstimate(a.name);
  showScanCard(a);
}

// ── SCAN HUB ── the Scan tab itself (Rate&Goods' main screen): a viewfinder
// invitation up top, search, the photo actions, then everything scanned
// before as a grid. Live scanning still happens in the fullscreen overlay.
function scanHubHtml() {
  _histView = [...scanHist].sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));
  const tiles = _histView.map((e, i) => {
    const pic = e.img
      ? `<img src="${e.img}" alt="" loading="lazy">`
      : `<span class="hub-emoji">${foodEmoji(e.name) || '🛒'}</span>`;
    const sc = scanScore(e);
    const stars = sc === null ? '' : `<span class="hub-stars">${'★'.repeat(Math.round(sc))}</span>`;
    const mine = myRatingOf(e.code);
    const my = mine && mine.r ? `<span class="hub-mine" title="${esc(l('myRating'))}">★${mine.r}</span>` : '';
    const fav = e.fav ? '<span class="hub-fav">♥</span>' : '';
    return `<button class="hub-hi" onclick="openScanHistEntry(${i})" title="${esc(e.name)}">${fav}${pic}<span class="hub-name">${esc(e.name)}</span><span class="hub-meta">${stars}${my}</span></button>`;
  }).join('');
  return `
  <div class="hub-dock" id="scanDock" onclick="hubCamTap(event)" role="button" aria-label="${esc(l('tapToScan'))}"></div>
  <div class="hub-acts">
    <button class="fchip" onclick="hubPick('labelInput')">📷 ${esc(l('addByPhoto'))}</button>
    <button class="fchip" onclick="hubPick('receiptAiInput')">🧾 ${esc(l('receiptBtn'))}</button>
  </div>
  ${_histView.length ? `<div class="hub-lbl">${esc(l('recentScans'))}</div><div class="hub-grid">${tiles}</div>` : ''}
  <div id="hubPop"></div>`;
}

// ── POPULAR NOW ── what the whole community scanned this month, from the
// Worker's D1 log. Cached 10 min; needs at least two entries to feel like a
// chart. Tapping a tile opens the card WITHOUT logging a new scan.
let _popCache = null, _popAt = 0;
async function fillHubPopular() {
  const url = aiProxyUrl();
  if (!url || !navigator.onLine || !document.getElementById('hubPop')) return;
  let top = _popCache;
  if (!top || Date.now() - _popAt > 600000) {
    const r = await postJSON(url, { scanTop: 1 }, 10000);
    top = (r && Array.isArray(r.top)) ? r.top.filter(x => x && x.code && x.name) : null;
    if (top) { _popCache = top; _popAt = Date.now(); }
  }
  const box = document.getElementById('hubPop');   // re-fetch: the tab may have re-rendered
  if (!box || !top || top.length < 2 || currentTab !== 'scan') return;
  box.innerHTML = `<div class="hub-lbl">🔥 ${esc(l('popNow'))}</div><div class="hub-grid">${top.map(t => `
    <button class="hub-hi" onclick="openPopular(${jsArg(t.code)})" title="${esc(t.name)}">
      <span class="hub-emoji">${foodEmoji(t.name) || '🛒'}</span>
      <span class="hub-name">${esc(t.name)}</span>
      <span class="hub-meta">${t.grade ? `<span class="alt-grade g-${esc(t.grade)}">${esc(String(t.grade).toUpperCase())}</span>` : ''}<span class="pop-n">×${parseInt(t.n, 10) || 1}</span></span>
    </button>`).join('')}</div>`;
}
function openPopular(code) {
  stopBarcodeScanner();
  lookupBarcode(code);   // no fromScanner — a curiosity tap must not inflate the chart
}

// ── GLOBAL SEARCH ── the 🔍 in the top bar: one field over your own fridge
// (instant) and the food database (debounced), from any tab.
function openGlobalSearch() {
  ensureOverlayHistory();
  const inp = document.getElementById('gsIn');
  inp.placeholder = '🔍 ' + l('scanSearchPh');
  inp.value = '';
  document.getElementById('gsFridge').innerHTML = '';
  document.getElementById('gsDb').innerHTML = '';
  document.getElementById('gsFridgeLbl').style.display = 'none';
  document.getElementById('gsDbLbl').style.display = 'none';
  document.getElementById('searchModal').classList.add('show');
  setTimeout(() => inp.focus(), 60);
}
function closeGlobalSearch() {
  document.getElementById('searchModal').classList.remove('show');
}
function onGsInput(v) {
  const q = String(v || '').trim().toLowerCase();
  // Your own fridge answers instantly.
  const hits = q.length >= 2
    ? state.products.map((p, i) => ({ p, i })).filter(x => x.p.name.toLowerCase().includes(q)).slice(0, 6)
    : [];
  const fl = document.getElementById('gsFridgeLbl');
  fl.textContent = (T[currentLang] || T.en).fridge;
  fl.style.display = hits.length ? '' : 'none';
  document.getElementById('gsFridge').innerHTML = hits.map(x =>
    `<button class="gs-item" onclick="gsGoFridge(${x.i})">${foodEmoji(x.p.name) || '📦'} <b>${esc(x.p.name)}</b><small>${esc(x.p.badge || '')}</small></button>`).join('');
  // The database takes the same debounced path the scanner search uses.
  const dl = document.getElementById('gsDbLbl');
  dl.textContent = l('internetSource');
  dl.style.display = q.length >= 3 && navigator.onLine ? '' : 'none';
  onScanSearch(v, 'gsDb');
}
// A fridge hit jumps Home with the search already applied.
function gsGoFridge(i) {
  const p = state.products[i];
  closeGlobalSearch();
  fridgeQuery = p ? p.name : '';
  switchTab('home', document.getElementById('tab-home'));
}

// ── SCAN HISTORY ── everything scanned before, newest first, capped at 20.
// Each entry keeps the full card payload so reopening needs no network.
let scanHist = [];
try { scanHist = JSON.parse(localStorage.getItem('kulpio-scans') || '[]'); } catch {}
function pushScanHist(f) {
  // Every card opened counts toward the scanner badge; persisted here because
  // saveState may not run at all while the scanner overlay is up.
  state.scanCount = (state.scanCount || 0) + 1;
  localStorage.setItem('kulpio-scan-count', String(state.scanCount));
  const old = scanHist.find(x => x.code === f.code);
  scanHist = scanHist.filter(x => x.code !== f.code);
  const e = Object.assign({}, f, { t: Date.now() });
  if (old && old.fav) e.fav = true;   // a re-scan keeps the heart
  scanHist.unshift(e);
  // Favourites are immune to the cap: evict the oldest non-favourite first,
  // with a hard stop so an all-favourite history can't grow unbounded.
  if (scanHist.length > 20) {
    for (let i = scanHist.length - 1; i >= 0 && scanHist.length > 20; i--) {
      if (!scanHist[i].fav) scanHist.splice(i, 1);
    }
    scanHist = scanHist.slice(0, 24);
  }
  localStorage.setItem('kulpio-scans', JSON.stringify(scanHist));
}
let _histView = [];   // what the strip currently shows (favourites first)
function renderScanHist() {
  const wrap = document.getElementById('scanHistWrap');
  if (!scanHist.length) { wrap.style.display = 'none'; return; }
  document.getElementById('scanHistLbl').textContent = l('recentScans');
  _histView = [...scanHist].sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));
  document.getElementById('scanHistRow').innerHTML = _histView.map((e, i) => {
    const pic = e.img
      ? `<img src="${e.img}" alt="" loading="lazy">`
      : `<span class="hi-emoji">${foodEmoji(e.name) || '🛒'}</span>`;
    const sc = scanScore(e);
    const stars = sc === null ? '' : `<span class="hi-stars">${'★'.repeat(Math.round(sc))}</span>`;
    const fav = e.fav ? '<span class="hi-fav">♥</span>' : '';
    const mine = myRatingOf(e.code);
    const my = mine && mine.r ? `<span class="hi-mine" title="${l('myRating')}">★${mine.r}</span>` : '';
    return `<button class="scan-hi" onclick="openScanHistEntry(${i})" title="${esc(e.name)}">${fav}${pic}<span class="hi-name">${esc(e.name)}</span>${stars}${my}</button>`;
  }).join('');
  wrap.style.display = '';
}
// Reopen a past scan's card — camera off, data straight from the history.
function openScanHistEntry(i) {
  const e = _histView[i] || scanHist[i];
  if (!e) return;
  stopBarcodeScanner();
  document.getElementById('scanVideo').style.display = 'none';
  setScanLive(false);
  _scanFound = e;
  queueAiEstimate(e.name);   // fresh shelf-life answer for a one-tap add
  showScanCard(e);
}
// ♥ on the card: pin/unpin this product in Recent scans.
function toggleScanFav() {
  const f = _scanFound;
  if (!f || !f.code) return;
  const e = scanHist.find(x => x.code === f.code);
  const on = !(e ? e.fav : f.fav);
  if (e) { if (on) e.fav = true; else delete e.fav; }
  if (on) f.fav = true; else delete f.fav;
  localStorage.setItem('kulpio-scans', JSON.stringify(scanHist));
  syncFavBtn();
}
function syncFavBtn() {
  const b = document.getElementById('scardFav');
  const f = _scanFound;
  if (!b || !f) return;
  const e = scanHist.find(x => x.code === f.code);
  const on = !!(e ? e.fav : f.fav);
  b.textContent = on ? '♥' : '♡';
  b.classList.toggle('on', on);
  b.title = l('favLbl');
  b.setAttribute('aria-label', l('favLbl'));
  b.setAttribute('aria-pressed', String(on));
}
// ── MY RATING & NOTE ── Rate&Goods' rating and review, single-user edition:
// your own stars and a short note, kept on this device, keyed by barcode.
// Tapping the star you already gave takes the rating back.
let myRatings = {};
try { myRatings = JSON.parse(localStorage.getItem('kulpio-myratings') || '{}'); } catch {}
function myRatingOf(code) { return (code && myRatings[code]) || null; }
function saveMyRatings() { localStorage.setItem('kulpio-myratings', JSON.stringify(myRatings)); }
function setMyRating(n) {
  const f = _scanFound;
  if (!f || !f.code) return;
  const cur = myRatings[f.code] || {};
  if (cur.r === n) delete cur.r;
  else cur.r = n;
  cur.t = Date.now();
  if (cur.r || cur.note) myRatings[f.code] = cur;
  else delete myRatings[f.code];
  saveMyRatings();
  syncMyRating();
  logRateCloud(f.code, cur.r || 0);   // the community hears it too (0 = withdrawn)
}
function saveMyNote(v) {
  const f = _scanFound;
  if (!f || !f.code) return;
  v = String(v || '').trim().slice(0, 140);
  const cur = myRatings[f.code] || {};
  if (v) cur.note = v; else delete cur.note;
  cur.t = Date.now();
  if (cur.r || cur.note) myRatings[f.code] = cur;
  else delete myRatings[f.code];
  saveMyRatings();
}
function syncMyRating() {
  const f = _scanFound;
  const box = document.getElementById('scardMine');
  if (!box || !f) return;
  // The AI-label path has no barcode — nothing stable to hang a rating on.
  if (!f.code) { box.style.display = 'none'; return; }
  box.style.display = '';
  const mine = myRatings[f.code] || {};
  document.getElementById('mrLbl').textContent = l('myRating');
  document.getElementById('mrStars').innerHTML = [1, 2, 3, 4, 5].map(n =>
    `<button class="mr-star${(mine.r || 0) >= n ? ' on' : ''}" onclick="setMyRating(${n})"`
    + ` aria-label="${n}★" aria-pressed="${mine.r === n}">${(mine.r || 0) >= n ? '★' : '☆'}</button>`).join('');
  const note = document.getElementById('mrNote');
  note.placeholder = l('myNotePh');
  note.value = mine.note || '';
  // The note field earns its space only once you've rated (or already wrote one).
  note.style.display = (mine.r || mine.note) ? '' : 'none';
}

// ── SHARE ── the card as a line of text (like sharing from Rate&Goods):
// name, composition stars, Nutri-Score, your own rating and note. Goes to
// the native share sheet, or the clipboard with a ✓ on the button — the
// pear's bubble lives behind this overlay, so the confirmation must not.
function shareScanCard() {
  const f = _scanFound;
  if (!f) return;
  const sc = scanScore(f);
  const mine = myRatingOf(f.code);
  const parts = ['🛒 ' + f.name
    + (f.brand && f.brand.toLowerCase() !== f.name.toLowerCase() ? ' · ' + f.brand : '')];
  if (sc !== null) {
    parts.push('★ ' + sc.toFixed(1) + '/5'
      + (f.grade ? ' · Nutri-Score ' + f.grade.toUpperCase() : '')
      + (f.nova ? ' · NOVA ' + f.nova : ''));
  }
  if (mine && mine.r) parts.push(l('myRating') + ': ' + '★'.repeat(mine.r));
  if (mine && mine.note) parts.push('💬 ' + mine.note);
  parts.push('🍐 Kulpio');
  const text = parts.join('\n');
  if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => {
    const b = document.getElementById('scardShare');
    b.textContent = '✓';
    b.title = l('recapCopied');
    setTimeout(() => { b.textContent = '📤'; b.title = l('recapShare'); }, 1400);
  }, () => {});
}

function hideScanCard() {
  document.getElementById('scanOverlay').classList.remove('found');
}
// One tap: into the fridge with the estimated shelf life — exactly what a
// dateless save from the form would have produced.
function scanCardAdd() {
  const f = _scanFound;
  if (!f) return;
  _scanFound = null;
  const exp = estimatedExpiry(f.name);
  const days = daysUntil(exp) ?? 7;
  const product = {
    name: f.name, brand: f.brand, store: f.store,
    badge: freshnessBadge(days),
    cls: days <= 1 ? 'br' : days <= 5 ? 'ba' : 'bg',
    dot: days <= 1 ? 'dr' : days <= 5 ? 'da' : 'dg',
    price: 0, exp, qty: 1, loc: 'fridge'
  };
  if (f.img) product.img = f.img;
  if (f.code) product.code = f.code;   // the card keeps its barcode → crowd prices
  mergeOrPush(product);
  recipeCacheKey = '';
  saveState();
  closeScanner();
  switchTab('home', document.getElementById('tab-home'));
  if (!f.img) fetchProductImage(f.name, f.brand);
  pearReact('hop', 'pearAdd', '😋', 700);
  maybeWasteWarn(f.name);
}
// The old path: the full form, prefilled from the barcode lookup.
function scanCardEdit() {
  const f = _scanFound;
  if (!f) return;
  _scanFound = null;
  closeScanner();
  document.getElementById('modalTitleText').textContent = l('addProduct');
  // Keep the scanned product's own pack photo for its fridge card.
  document.getElementById('productModal').dataset.img = f.img || '';
  document.getElementById('productModal').dataset.scanCode = f.code || '';   // barcode rides along → crowd prices
  document.getElementById('pName').value = f.name;
  document.getElementById('pBrand').value = f.brand;
  document.getElementById('brandSugg').innerHTML = '';
  document.getElementById('pStore').value = f.store;
  const dateEl = document.getElementById('pDate');
  dateEl.value = '';
  delete dateEl.dataset.userset;
  setDateVisible(false);   // expiry is estimated silently on save
  updateShelfHint(f.name);   // show how long the scanned item usually keeps
  document.getElementById('pPrice').value = '';
  document.getElementById('pQty').value = '';
  setAddMore(!!(f.brand || f.store));   // a scanned brand/store is worth showing
  document.getElementById('productModal').dataset.editIdx = '';
  document.getElementById('productModal').dataset.opened = '';
  document.getElementById('productModal').dataset.openedWas = '';
  syncOpenedBtn(false);
  syncLocSeg('fridge');   // a scanned item is new — never inherit the last item's place
  updatePhotoPreview();
  ensureOverlayHistory();
  document.getElementById('productModal').classList.add('show');
}
// Wrong product (or just browsing): back to the viewfinder.
function scanCardRescan() {
  _scanFound = null;
  hideScanCard();
  renderScanHist();   // the product just scanned belongs in the strip already
  document.getElementById('scanStatus').textContent = l('scanning');
  startBarcodeScanner();
}

// Decode a barcode out of a still image. ZXing's entry points are NOT
// interchangeable: the element path (decodeFromImage) reliably fails to see
// 1D codes — EAN-13 included, which is nearly every grocery barcode — while
// the URL path reads the very same picture. Rather than trust any single one,
// try each in turn, and give a downscale a go for large phone photos, where
// the bars can be too fine for the default binarizer.
async function decodeBarcodeFromFile(file) {
  // Native first: BarcodeDetector reads stills too, needs no CDN library,
  // and sees codes ZXing's binarizer misses on large phone photos.
  try {
    const det = await nativeDetector();
    if (det) {
      const bmp = await createImageBitmap(file);
      const codes = await det.detect(bmp);
      bmp.close();
      if (codes && codes.length && codes[0].rawValue) return codes[0].rawValue;
    }
  } catch {}
  if (!await ensureZXing()) return null;
  const url = URL.createObjectURL(file);
  const reader = () => new ZXing.BrowserMultiFormatReader();
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const attempts = [
      () => reader().decodeFromImageUrl(url),   // the one that actually works for EAN-13
      () => reader().decodeFromImage(img),
      async () => {                              // re-render at a sane size and retry
        const max = 1400;
        const s = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const c = document.createElement('canvas');
        c.width = Math.round((img.naturalWidth || 1) * s);
        c.height = Math.round((img.naturalHeight || 1) * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return reader().decodeFromImageUrl(c.toDataURL('image/png'));
      },
    ];
    for (const attempt of attempts) {
      try {
        const r = await attempt();
        if (r && r.getText()) return r.getText();
      } catch {}
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function processReceiptFile(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  input.value = '';   // allow re-picking the same file after a failed read
  const status = document.getElementById('scanStatus');
  status.textContent = l('analyzing');
  const code = await decodeBarcodeFromFile(file);
  // lookupBarcode closes the scanner itself on success; closing here first
  // would hide its "product not found" message on failure.
  if (code) { await lookupBarcode(code, true); return; }
  status.textContent = l('barcodeNotFound');
}

// ── RECEIPT SCANNER ── one photo of the till receipt → every food item on
// it lands in the fridge with its printed price and the store name, in one
// undoable stroke. The AI keeps item names in the receipt's own language.
async function readReceiptWithAI(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const url = aiProxyUrl();
  const status = document.getElementById('scanStatus');
  if (!url || !navigator.onLine) { status.textContent = l('aiUnavailable'); return; }
  status.textContent = l('analyzing');
  let data = null;
  try {
    const img = await fileToAiImage(file, 1800);   // receipts have small print — allow a larger frame
    if (!img) { status.textContent = l('receiptFail'); return; }
    data = await postJSON(url, { receipt: { image: img.data, mediaType: img.type, lang: currentLang } }, 90000);
  } catch {}
  const items = data && Array.isArray(data.items)
    ? data.items.filter(x => x && String(x.name || '').trim()) : [];
  if (!items.length) { status.textContent = l('receiptFail'); return; }
  const store = String(data.store || '').trim().slice(0, 40);
  // Don't silently dump 40 lines (incl. TOTAL/VISA/bags) into the fridge —
  // let the user confirm and drop the junk first. That review step is what
  // makes receipt-scanning trustworthy enough to actually use.
  closeScanner();
  openReceiptReview(items.slice(0, 40).map(it => ({
    name: String(it.name).trim().slice(0, 60),
    price: Math.max(0, Math.min(1e6, parseFloat(it.price) || 0)),
    on: true,
  })), store);
}

// ─── RECEIPT REVIEW ──────────────────────────────────────────────
let _receiptItems = [], _receiptStore = '';
function openReceiptReview(items, store) {
  _receiptItems = items;
  _receiptStore = store || '';
  document.getElementById('receiptTitle').textContent = l('receiptReview');
  document.getElementById('btnCancelReceipt').textContent = l('cancel');
  const st = document.getElementById('receiptStore');
  st.textContent = store ? '🛒 ' + store : '';
  renderReceiptList();
  ensureOverlayHistory();
  document.getElementById('receiptModal').classList.add('show');
}
function renderReceiptList() {
  const box = document.getElementById('receiptList');
  box.innerHTML = _receiptItems.length ? _receiptItems.map((it, i) => `
    <div class="receipt-row ${it.on ? '' : 'off'}" data-i="${i}">
      <button type="button" class="receipt-check ${it.on ? 'on' : ''}" onclick="toggleReceiptItem(${i})" aria-label="${esc(l('save'))}">${it.on ? '✓' : ''}</button>
      <input class="receipt-name" value="${esc(it.name)}" oninput="editReceiptItem(${i},'name',this.value)" aria-label="${esc(l('productName'))}">
      <input class="receipt-price" type="number" step="0.01" inputmode="decimal" value="${it.price > 0 ? it.price : ''}" placeholder="${esc(curSym())}" oninput="editReceiptItem(${i},'price',this.value)" aria-label="${esc(l('priceOpt'))}">
    </div>`).join('') : `<div class="receipt-empty">${esc(l('receiptFail'))}</div>`;
  const n = _receiptItems.filter(x => x.on).length;
  const btn = document.getElementById('btnAddReceipt');
  btn.textContent = n ? l('receiptAddN').replace('{n}', n) : l('receiptNone');
  btn.disabled = !n;
  btn.style.opacity = n ? '' : '.5';
}
function toggleReceiptItem(i) { if (_receiptItems[i]) { _receiptItems[i].on = !_receiptItems[i].on; renderReceiptList(); } }
function editReceiptItem(i, field, val) {
  if (!_receiptItems[i]) return;
  if (field === 'price') _receiptItems[i].price = Math.max(0, Math.min(1e6, parseFloat(val) || 0));
  else _receiptItems[i].name = String(val).slice(0, 60);
  // Don't re-render on keystroke (it would steal focus) — just refresh the count.
  const n = _receiptItems.filter(x => x.on && x.name.trim()).length;
  const btn = document.getElementById('btnAddReceipt');
  btn.textContent = n ? l('receiptAddN').replace('{n}', n) : l('receiptNone');
  btn.disabled = !n; btn.style.opacity = n ? '' : '.5';
}
function closeReceiptReview() {
  document.getElementById('receiptModal').classList.remove('show');
  _receiptItems = [];
}
function confirmReceiptReview() {
  const chosen = _receiptItems.filter(x => x.on && x.name.trim());
  if (!chosen.length) return;
  const snap = snapshotState();
  for (const it of chosen) mergeOrPush(makeProduct(it.name.trim(), _receiptStore, it.price));
  recipeCacheKey = '';
  saveState();
  closeReceiptReview();
  switchTab('home', document.getElementById('tab-home'));
  showUndoToast('🧾 +' + chosen.length, snap);
  pearReact('hop', null, '🧾', 900);
  if (chosen.length >= 5) setTimeout(pearConfetti, 450);
  chosen.slice(0, 15).forEach(it => fetchProductImage(it.name.trim()));
}
