// Source section: 01-foundation.js
const speechLang = {en:"en-US",ru:"ru-RU",ro:"ro-RO",de:"de-DE",fr:"fr-FR",es:"es-ES",it:"it-IT",pt:"pt-BR",pl:"pl-PL",tr:"tr-TR",ar:"ar-SA",zh:"zh-CN",ja:"ja-JP",ko:"ko-KR",hi:"hi-IN",uk:"uk-UA",nl:"nl-NL",sv:"sv-SE",no:"nb-NO",da:"da-DK",fi:"fi-FI",cs:"cs-CZ",sk:"sk-SK",hu:"hu-HU",bg:"bg-BG",sr:"sr-RS",hr:"hr-HR",el:"el-GR",he:"he-IL",th:"th-TH",id:"id-ID",ms:"ms-MY",vi:"vi-VN"};

// ─── STATE ───────────────────────────────────────────────────────
let currentLang = localStorage.getItem('kulpio-lang') || 'en';
let currentTheme = localStorage.getItem('kulpio-theme') || 'dark';
let currentAccent = localStorage.getItem('kulpio-accent') || '#6E9E80';
let moodTheme = localStorage.getItem('kulpio-moodtheme') === 'on';   // app tint follows the pear's mood (default off — a calm, steady accent)
let currentBg = localStorage.getItem('kulpio-bg') || 'plain';
let currentPhoto = localStorage.getItem('kulpio-bg-photo') || '';   // stored separately (large)
let notifsEnabled = localStorage.getItem('kulpio-notif') !== 'off';

// ── ACCOUNT ── a Kulpio account (email/password, or Google) that
// syncs the fridge across devices. The token is an opaque server session; the
// user object is just {email,name} for display. Signed-out = everything stays
// local, exactly as before. Provider IDs are set once a client id exists.
let authToken = localStorage.getItem('kulpio-token') || '';
let authUser = safeParse(localStorage.getItem('kulpio-user'), null);
const AUTH_GOOGLE_CLIENT_ID = '832284986308-kvrk9v1659jdejprq6u69rrtfrhq5h74.apps.googleusercontent.com';   // Google OAuth Client ID — enables "Sign in with Google"

// ─── CURRENCY ────────────────────────────────────────────────────
// sym = symbol, suf = symbol comes after the number, z = no decimal places
const CUR = {
  USD:{s:'$'}, EUR:{s:'€'}, GBP:{s:'£'}, RUB:{s:'₽',suf:1}, UAH:{s:'₴',suf:1},
  RON:{s:'lei',suf:1}, MDL:{s:'L'}, PLN:{s:'zł',suf:1}, CZK:{s:'Kč',suf:1},
  HUF:{s:'Ft',suf:1,z:1}, BGN:{s:'лв',suf:1}, TRY:{s:'₺'}, CHF:{s:'Fr',suf:1},
  SEK:{s:'kr',suf:1}, NOK:{s:'kr',suf:1}, DKK:{s:'kr',suf:1}, JPY:{s:'¥',z:1},
  CNY:{s:'¥'}, KRW:{s:'₩',z:1}, INR:{s:'₹'}, BRL:{s:'R$'}, CAD:{s:'C$'},
  AUD:{s:'A$'}, AED:{s:'د.إ',suf:1}
};
const curByLang = {ru:'RUB',uk:'UAH',ro:'RON',pl:'PLN',tr:'TRY',cs:'CZK',hu:'HUF',
  bg:'BGN',sv:'SEK',no:'NOK',da:'DKK',ja:'JPY',zh:'CNY',ko:'KRW',hi:'INR',pt:'BRL'};
let currentCurrency = localStorage.getItem('kulpio-currency') || curByLang[currentLang] || 'USD';
function curSym() { return (CUR[currentCurrency] || CUR.USD).s; }

// ── UNIT SYSTEM ── chosen in Settings; converts every displayed measure
// (today: the Savings eco tiles). Data stays metric — only display converts.
let currentUnits = localStorage.getItem('kulpio-units') || 'metric';
function setUnits(u) {
  currentUnits = u === 'imperial' ? 'imperial' : 'metric';
  localStorage.setItem('kulpio-units', currentUnits);
  syncUnitsSeg();
  renderContent();
}
function syncUnitsSeg() {
  document.querySelectorAll('#unitsSeg .seg-btn').forEach(b => {
    const on = b.dataset.u === currentUnits;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}
function fmtWeight(kg) {
  return currentUnits === 'imperial' ? { v: kg * 2.20462, u: 'lb' } : { v: kg, u: 'kg' };
}
function fmtVolume(litres) {
  return currentUnits === 'imperial' ? { v: litres * 0.264172, u: 'gal' } : { v: litres, u: 'L' };
}
// Convert metric amounts inside a free-text measure ("300ml", "1.5 kg") for
// imperial users. Anything unparsed ("1 tbls", "to serve") passes through —
// recipe measures come as prose, so this rewrites only what it understands.
function fmtMeasure(text) {
  if (currentUnits !== 'imperial' || !text) return text;
  return String(text).replace(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|dl|l|litres?|liters?)\b/gi, (m, num, unit) => {
    const n = parseFloat(String(num).replace(',', '.'));
    if (!isFinite(n)) return m;
    const one = v => { const r = Math.round(v * 10) / 10; return String(r % 1 ? r : Math.round(r)); };
    const u = unit.toLowerCase();
    if (u === 'g') return n >= 454 ? one(n / 453.592) + ' lb' : one(n / 28.35) + ' oz';
    if (u === 'kg') return one(n * 2.20462) + ' lb';
    if (u === 'ml') return one(n / 29.5735) + ' fl oz';
    if (u === 'cl') return one(n * 10 / 29.5735) + ' fl oz';
    if (u === 'dl') return one(n * 100 / 29.5735) + ' fl oz';
    return one(n * 1.05669) + ' qt';   // l / litre / liter
  });
}
function formatPrice(v) {
  const c = CUR[currentCurrency] || CUR.USD;
  const n = c.z ? String(Math.round(v)) : (Math.round(v * 100) / 100).toFixed(2);
  return c.suf ? `${n} ${c.s}` : `${c.s}${n}`;
}

let currentTab = 'home';
let recipeCacheKey = '';
let internetRecipes = [];
let shownRecipes = [];
let openRecipe = null;   // the recipe currently shown in the detail modal
let codeReader = null;
let scannerActive = false;

// Parse JSON from localStorage defensively: a corrupt/truncated value (an
// interrupted write, manual tampering, quota eviction) must never throw at
// load time and take the whole app down with it.
function safeParse(raw, fallback) {
  try { const v = JSON.parse(raw); return v == null ? fallback : v; }
  catch { return fallback; }
}

// ─── DEMO MODE (?demo=1) ─────────────────────────────────────────
// Opening the app with ?demo=1 stashes whatever real data is present
// (kulpio-predemo-backup, same format as an exported backup) and seeds a
// lived-in dataset: a busy fridge, three months of history, badges in
// mid-progress, scan history, saved recipes and a planned meal — all dated
// relative to today so the demo never goes stale. Settings grows an
// "Exit demo mode" row that restores the stashed data; ?demo=0 exits too.
function demoActive() { return localStorage.getItem('kulpio-demo') === '1'; }
function exitDemo() {
  const bak = safeParse(localStorage.getItem('kulpio-predemo-backup'), null);
  Object.keys(localStorage).filter(k => k.startsWith('kulpio-')).forEach(k => localStorage.removeItem(k));
  if (bak && bak.data) for (const k in bak.data) { try { localStorage.setItem(k, bak.data[k]); } catch {} }
  location.replace(location.pathname);   // reload; also drops any ?demo= from the URL
}
(function demoBootstrap() {
  let q = null;
  try { q = new URLSearchParams(location.search).get('demo'); } catch {}
  if (q === '0' && demoActive()) { exitDemo(); return; }
  if (q !== '1' || demoActive()) return;   // already seeded → a reload keeps the demo, never re-stashes

  // Stash the real data first. Prefs (language, theme, currency…) are left
  // in place so the demo shows up in the presenter's own language and money.
  const stash = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('kulpio-') && k !== 'kulpio-predemo-backup') stash[k] = localStorage.getItem(k);
  }
  try {
    localStorage.setItem('kulpio-predemo-backup', JSON.stringify({ app: 'kulpio', version: 1, exported: new Date().toISOString(), demo: true, data: stash }));
  } catch { return; }   // no room to stash safely → no demo, real data untouched

  const ru = (localStorage.getItem('kulpio-lang') || navigator.language || 'en').startsWith('ru');
  const N = (en, ruName) => ru ? ruName : en;
  // Local-timezone ISO date n days from today (UTC would shift near midnight).
  const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  // Prices are written EUR-sized and scaled to the user's currency — the
  // effective one (saved pref, else the language default), not just the pref.
  const SC = { RUB: 90, UAH: 45, RON: 5, MDL: 20, PLN: 4.3, CZK: 24, HUF: 390, BGN: 1.95, TRY: 35, SEK: 11, NOK: 11, DKK: 7.5, JPY: 160, CNY: 7.2, KRW: 1400, INR: 90, BRL: 5.5, AED: 3.7 }[currentCurrency] || 1;
  const P = v => SC === 1 ? Math.round(v * 100) / 100 : Math.round(v * SC);

  // Sixteen items — a lived-in but readable fridge across all three places.
  // Several items in the ≤2-day window (yogurt today, milk/spinach tomorrow,
  // bananas + minced beef in two) keep the pear worried and stack a sizeable
  // money-at-risk figure; brands + price history light up the price cards;
  // freezer/pantry items make the place filter appear. (The scan badge is
  // still seeded 9/10, so one live scan pops an unlock on stage.)
  const products = [
    { name: N('Milk', 'Молоко'), exp: iso(1), store: 'Linella', price: P(1.2), opened: true, loc: 'fridge' },
    { name: N('Yogurt', 'Йогурт'), exp: iso(0), store: 'Linella', price: P(0.9), loc: 'fridge' },
    { name: N('Spinach', 'Шпинат'), exp: iso(1), store: 'Green Hills', price: P(1.4), loc: 'fridge' },
    { name: N('Bananas', 'Бананы'), exp: iso(2), store: 'Green Hills', price: P(1.3), qty: 4, loc: 'fridge' },
    { name: N('Minced beef', 'Фарш'), exp: iso(2), store: 'Kaufland', price: P(4.2), loc: 'fridge' },
    { name: N('Salmon fillet', 'Лосось'), exp: iso(3), store: 'Kaufland', brand: 'Nordic', price: P(5.5), loc: 'fridge' },
    { name: N('Tomatoes', 'Помидоры'), exp: iso(4), store: 'Green Hills', price: P(1.6), loc: 'fridge' },
    { name: N('Apples', 'Яблоки'), exp: iso(7), store: 'Green Hills', price: P(2), qty: 3, loc: 'fridge' },
    { name: N('Cheese', 'Сыр'), exp: iso(9), store: 'Linella', brand: 'President', price: P(3.4), prevPrice: P(3.8),
      pHist: [{ d: iso(-21), v: P(3.6) }, { d: iso(-14), v: P(3.9) }, { d: iso(-7), v: P(3.8) }, { d: iso(-2), v: P(3.4) }], loc: 'fridge' },
    { name: N('Eggs', 'Яйца'), exp: iso(12), store: 'Kaufland', price: P(2.1), qty: 2, loc: 'fridge' },
    { name: N('Butter', 'Масло'), exp: iso(18), store: 'Linella', brand: 'Lactis', price: P(2.3), loc: 'fridge' },
    { name: N('Orange juice', 'Апельсиновый сок'), exp: iso(20), store: 'Linella', brand: 'Rio', price: P(1.9), loc: 'fridge' },
    { name: N('Chicken breast', 'Куриное филе'), exp: iso(60), store: 'Kaufland', price: P(4.5), frozen: true, loc: 'freezer' },
    { name: N('Frozen peas', 'Зелёный горошек'), exp: iso(120), store: 'Linella', price: P(1.5), frozen: true, loc: 'freezer' },
    { name: N('Rice', 'Рис'), exp: iso(180), store: 'Kaufland', price: P(1.8), loc: 'pantry' },
    { name: N('Pasta', 'Паста'), exp: iso(220), store: 'Kaufland', brand: 'Barilla', price: P(1.2), loc: 'pantry' },
  ];
  for (const p of products) { p.badge = ''; p.cls = 'bg'; p.dot = 'dg'; }   // derived from exp on the first freshness pass

  // Three months of eating, deterministic so every demo looks the same:
  // ~55 used events, 4 wasted (the last one 9 days ago → a 9-day streak).
  const pool = [['Milk', 'Молоко', 1.2], ['Eggs', 'Яйца', 2.1], ['Yogurt', 'Йогурт', 0.9], ['Bread', 'Хлеб', 1.1],
    ['Apples', 'Яблоки', 2], ['Cheese', 'Сыр', 3.4], ['Tomatoes', 'Помидоры', 1.6], ['Bananas', 'Бананы', 1.3]];
  const hist = [];
  for (let o = 92; o >= 1; o--) {
    if ((o * 7) % 10 < 6) { const it = pool[(o * 13) % pool.length]; hist.push({ t: iso(-o), k: 'used', name: N(it[0], it[1]), price: P(it[2]) }); }
  }
  for (const o of [9, 21, 47, 68]) { const it = pool[o % pool.length]; hist.push({ t: iso(-o), k: 'wasted', name: N(it[0], it[1]), price: P(it[2]) }); }
  hist.sort((a, b) => a.t < b.t ? -1 : 1);
  const usedEv = hist.filter(e => e.k === 'used');
  const savedV = usedEv.reduce((s, e) => s + e.price, 0);
  const wastedV = hist.filter(e => e.k === 'wasted').reduce((s, e) => s + e.price, 0);

  // Two real scans (live OpenFoodFacts payloads, captured 2026-07): one
  // guilty pleasure with additives to talk about, one clean grade-A.
  const nutella = { name: 'Nutella', brand: 'Ferrero', store: '', img: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.100.jpg',
    code: '3017620422003', grade: 'e', nova: 4, adds: ['E322', 'E322I'], kcal: 539, prot: 6.3, fat: 30.9, carb: 57.5,
    ing: 'Sugar, palm oil, HAZELNUTS 13%, skimmed MILK powder 8.7%, low-fat cocoa 7.4%, emulsifiers: lecithin [SOYA]; vanillin. Gluten free',
    cats: ['en:sweet-spreads', 'en:confectionary-based-spreads'], diet: ['palm-oil'], allg: ['milk', 'nuts', 'soybeans'], fav: true, t: Date.now() - 2 * 864e5 };
  const fromage = { name: 'Fromage frais nature', brand: 'Perly', store: '', img: 'https://images.openfoodfacts.org/images/products/611/124/210/0985/front_en.58.100.jpg',
    code: '6111242100985', grade: 'a', nova: 1, adds: [], kcal: 101, prot: 7.6, fat: 6, carb: 4.2, ing: '',
    cats: ['fr:fromages-blancs', 'fr:fromages-blancs-natures'], diet: ['palm-oil-free'], allg: ['milk'], t: Date.now() - 5 * 864e5 };

  // Two real TheMealDB recipes (mealToRecipe shape) — favourites work
  // offline, and carbonara is pinned to tomorrow on the meal planner.
  const carbonara = { title: 'Spaghetti alla Carbonara', image: 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg', emoji: '🍽️', source: 'TheMealDB',
    used: ['Spaghetti', 'Egg Yolks'], missing: ['Bacon', 'Pecorino'],
    ingredients: [{ name: 'Spaghetti', measure: '320g' }, { name: 'Egg Yolks', measure: '6' }, { name: 'Salt', measure: 'As required' }, { name: 'Bacon', measure: '150g' }, { name: 'Pecorino', measure: '50g' }, { name: 'Black Pepper', measure: 'As required' }],
    instructions: 'STEP 1\r\nPut a large saucepan of water on to boil.\r\n\r\nSTEP 2\r\nFinely chop the 100g pancetta, having first removed any rind. Finely grate 50g pecorino cheese and 50g parmesan and mix them together.\r\n\r\nSTEP 3\r\nBeat the 3 large eggs in a medium bowl and season with a little freshly grated black pepper. Set everything aside.\r\n\r\nSTEP 4\r\nAdd 1 tsp salt to the boiling water, add 350g spaghetti and when the water comes back to the boil, cook at a constant simmer, covered, for 10 minutes or until al dente (just cooked).\r\n\r\nSTEP 5\r\nSquash 2 peeled plump garlic cloves with the blade of a knife, just to bruise it.\r\n\r\nSTEP 6\r\nWhile the spaghetti is cooking, fry the pancetta with the garlic. Drop 50g unsalted butter into a large frying pan or wok and, as soon as the butter has melted, tip in the pancetta and garlic.\r\n\r\nSTEP 7\r\nLeave to cook on a medium heat for about 5 minutes, stirring often, until the pancetta is golden and crisp. The garlic has now imparted its flavour, so take it out with a slotted spoon and discard.\r\n\r\nSTEP 8\r\nKeep the heat under the pancetta on low. When the pasta is ready, lift it from the water with a pasta fork or tongs and put it in the frying pan with the pancetta. Don’t worry if a little water drops in the pan as well (you want this to happen) and don’t throw the pasta water away yet.\r\n\r\nSTEP 9\r\nMix most of the cheese in with the eggs, keeping a small handful back for sprinkling over later.\r\n\r\nSTEP 10\r\nTake the pan of spaghetti and pancetta off the heat. Now quickly pour in the eggs and cheese. Using the tongs or a long fork, lift up the spaghetti so it mixes easily with the egg mixture, which thickens but doesn’t scramble, and everything is coated.\r\n\r\nSTEP 11\r\nAdd extra pasta cooking water to keep it saucy (several tablespoons should do it). You don’t want it wet, just moist. Season with a little salt, if needed.\r\n\r\nSTEP 12\r\nUse a long-pronged fork to twist the pasta on to the serving plate or bowl. Serve immediately with a little sprinkling of the remaining cheese and a grating of black pepper. If the dish does get a little dry before serving, splash in some more hot pasta water and the glossy sauciness will be revived.',
    external: 'https://www.bbcgoodfood.com/recipes/ultimate-spaghetti-carbonara-recipe', url: 'https://www.bbcgoodfood.com/recipes/ultimate-spaghetti-carbonara-recipe' };
  const pancakes = { title: 'Pancakes', image: 'https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg', emoji: '🍽️', source: 'TheMealDB',
    used: ['Eggs', 'Milk'], missing: ['Flour', 'Sunflower Oil'],
    ingredients: [{ name: 'Flour', measure: '100g' }, { name: 'Eggs', measure: '2 large' }, { name: 'Milk', measure: '300ml' }, { name: 'Sunflower Oil', measure: '1 tbls' }, { name: 'Sugar', measure: 'to serve' }, { name: 'Raspberries', measure: 'to serve' }, { name: 'Blueberries', measure: 'to serve' }],
    instructions: 'Put the flour, eggs, milk, 1 tbsp oil and a pinch of salt into a bowl or large jug, then whisk to a smooth batter. Set aside for 30 mins to rest if you have time, or start cooking straight away.\r\nSet a medium frying pan or crêpe pan over a medium heat and carefully wipe it with some oiled kitchen paper. When hot, cook your pancakes for 1 min on each side until golden, keeping them warm in a low oven as you go.\r\nServe with lemon wedges and sugar, or your favourite filling. Once cold, you can layer the pancakes between baking parchment, then wrap in cling film and freeze for up to 2 months.',
    external: 'https://www.bbcgoodfood.com/recipes/2907669/easy-pancakes', url: 'https://www.bbcgoodfood.com/recipes/2907669/easy-pancakes' };

  const seed = {
    'kulpio-products': JSON.stringify(products),
    'kulpio-history': JSON.stringify(hist),
    'kulpio-saved': String(Math.round(savedV * 100) / 100),
    'kulpio-wasted': String(Math.round(wastedV * 100) / 100),
    'kulpio-used-count': String(usedEv.length),
    'kulpio-shopping': JSON.stringify([{ name: N('Bread', 'Хлеб'), done: false }, { name: N('Bananas', 'Бананы'), done: false }, { name: N('Coffee', 'Кофе'), done: true }]),
    'kulpio-since': iso(-97),
    'kulpio-last-waste': iso(-9),
    'kulpio-best-streak': '23',
    // Earned badges are pre-dated so the boot pass doesn't celebrate them all
    // at once; Label detective (9/10) is left one step from unlocking — one
    // live scan pops it on stage. (Home cook / Meal planner / Regular are
    // pre-earned too, since the seeded recipes, plan and tenure satisfy them.)
    'kulpio-badges': JSON.stringify({ b_first: iso(-90), b_use25: iso(-48), b_week: iso(-40), b_saver: iso(-12), b_cook1: iso(-30), b_plan: iso(-20), b_ten30: iso(-30), b_full: iso(-15), b_card1: iso(-25), b_card3: iso(-10) }),
    'kulpio-scan-count': '9',
    // Two allergens set, so the profile is personalised AND a live Nutella scan
    // fires an on-stage "contains milk, nuts" warning.
    'kulpio-allergens': JSON.stringify(['milk', 'nuts']),
    // Loyalty/discount cards so the wallet demos with a scannable barcode.
    'kulpio-cards': JSON.stringify([
      { id: 'demo-linella', name: 'Linella', code: '2001234500018', fmt: 'ean13', color: '#3a7d44' },
      { id: 'demo-kaufland', name: 'Kaufland Card', code: '9002490100070', fmt: 'ean13', color: '#d1242f' },
      { id: 'demo-greenhills', name: 'Green Hills', code: 'GH48271150', fmt: 'code128', color: '#1b7f79' },
    ]),
    'kulpio-scans': JSON.stringify([nutella, fromage]),
    'kulpio-myratings': JSON.stringify({ '3017620422003': { r: 4, note: N('Tasty, but a lot of sugar', 'Вкусно, но много сахара'), t: Date.now() - 2 * 864e5 } }),
    'kulpio-fav-recipes': JSON.stringify([carbonara, pancakes]),
    'kulpio-plan': JSON.stringify({ [iso(1)]: carbonara }),
    'kulpio-toured': '1',        // the first-run guide must not cover the seeded screen
    'kulpio-streak-seen': '0',   // so the pear celebrates the 🔥 streak on open
    'kulpio-demo': '1',
  };
  ['kulpio-have', 'kulpio-mycodes'].forEach(k => localStorage.removeItem(k));
  for (const k in seed) { try { localStorage.setItem(k, seed[k]); } catch {} }
  // Drop ?demo=1 from the URL: a plain reload keeps the demo (flag above),
  // and exiting must not re-seed on the next navigation.
  try { history.replaceState(null, '', location.pathname); } catch {}
})();

const state = {
  products: safeParse(localStorage.getItem('kulpio-products'), []),
  saved: parseFloat(localStorage.getItem('kulpio-saved')) || 0,   // real money saved by using food
  wasted: parseFloat(localStorage.getItem('kulpio-wasted')) || 0,   // real money lost to thrown-away food
  usedCount: parseInt(localStorage.getItem('kulpio-used-count')) || 0,   // items used up (drives the sunglasses milestone)
  shopping: safeParse(localStorage.getItem('kulpio-shopping'), []),
  // Event log of what happened to food: {t:'YYYY-MM-DD', k:'used'|'wasted', name, price}.
  // Drives the monthly trend on the Savings tab and shopping suggestions.
  history: safeParse(localStorage.getItem('kulpio-history'), []),
  firstUse: localStorage.getItem('kulpio-since') || new Date().toISOString().slice(0, 10),
  lastWaste: localStorage.getItem('kulpio-last-waste') || '',   // ISO date food was last thrown away
  badges: safeParse(localStorage.getItem('kulpio-badges'), {}),   // unlocked achievements: {id: 'YYYY-MM-DD'}
  eggs: safeParse(localStorage.getItem('kulpio-eggs'), {}),   // discovered easter eggs: {tap|date|milestone|word: true}
  lvlSeen: parseInt(localStorage.getItem('kulpio-lvl-seen')) || 1,   // highest level already celebrated
  bestStreak: parseInt(localStorage.getItem('kulpio-best-streak')) || 0,   // longest waste-free run ever
  scanCount: parseInt(localStorage.getItem('kulpio-scan-count')) || 0,   // barcode cards opened (drives the scanner badge)
  cards: safeParse(localStorage.getItem('kulpio-cards'), []),   // saved loyalty/discount cards: {id,name,code,fmt,color}
  // Price book: rolling average price per store, keyed by canonical food, from
  // the user's own buys — drives the "where it's cheapest" insights offline.
  priceBook: safeParse(localStorage.getItem('kulpio-pricebook'), {}),
  lastSync: new Date().toISOString()
};

// Aggregate the event log into per-month used/wasted stats for the Savings
// tab, current month first. Months with no activity at the old end are
// trimmed so a fresh install shows no empty chart.
function monthlyHistory(months = 6) {
  const out = [];
  const now = new Date();
  for (let m = 0; m < months; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const ev = (state.history || []).filter(e => (e.t || '').startsWith(key));
    const usedEv = ev.filter(e => e.k === 'used');
    out.push({
      key, date: d,
      used: usedEv.length,
      wasted: ev.length - usedEv.length,
      usedV: usedEv.reduce((s, e) => s + (parseFloat(e.price) || 0), 0),
    });
  }
  while (out.length && out[out.length - 1].used + out[out.length - 1].wasted === 0) out.pop();
  return out;
}

// ── WASTE MEMORY ── what YOU personally keep throwing away, counted per
// food name over the last half-year. "Risky" = binned at least twice, and
// at least as often as it was eaten — the pear brings it up when that food
// is about to come back into the house.
function wasteStats(name) {
  const key = String(name || '').trim().toLowerCase();
  const out = { w: 0, u: 0 };
  if (!key) return out;
  const since = Date.now() - 180 * 86400000;
  for (const e of state.history || []) {
    if ((e.name || '').trim().toLowerCase() !== key) continue;
    const t = new Date((e.t || '') + 'T00:00:00').getTime();
    if (!(t > since)) continue;
    if (e.k === 'wasted') out.w++;
    else if (e.k === 'used') out.u++;
  }
  return out;
}
function maybeWasteWarn(name) {
  const { w, u } = wasteStats(name);
  if (w < 2 || w < u) return false;
  // After the add celebration has cleared — advice, not a scolding.
  setTimeout(() => {
    pearReact('wiggle', null, '🧠', 1000);
    pearSay('🧠 ' + l('wasteWarn').replace('{name}', name).replace('{w}', w), null, 7000);
  }, 1900);
  return true;
}

// Days since food was last thrown away (or since first use, if never).
function wasteStreakDays() {
  const base = state.lastWaste || state.firstUse;
  const d = Math.floor((Date.now() - new Date(base + 'T00:00:00').getTime()) / 864e5);
  return Math.max(0, isNaN(d) ? 0 : d);
}
// A little victory dance on open when the waste-free streak has grown since
// the last visit. The bubble is just "🔥 n" — no words, so nothing to translate.
function maybeStreakDance() {
  const n = wasteStreakDays();
  const seen = parseInt(localStorage.getItem('kulpio-streak-seen') || '0', 10);
  if (n !== seen) localStorage.setItem('kulpio-streak-seen', String(n));  // also re-arms after a streak reset
  if (n > seen && n >= 2 && state.products.length) {
    pearReact('dance', null, '🔥', 1600);
    pearSay('🔥 ' + n);
  }
}

// ── ACHIEVEMENTS ─────────────────────────────────────────────────
// Badges earned from the counters the app already keeps. Locked ones show
// grey with progress; the pear celebrates when a new one is earned.
// The money badge needs roughly the same real value in every currency.
const SAVER_NEED = { RUB:4000, UAH:2000, RON:250, MDL:1000, PLN:200, CZK:1000, HUF:20000, BGN:100, TRY:1500, SEK:500, NOK:500, DKK:400, JPY:5000, CNY:300, KRW:50000, INR:3000, BRL:250, AED:200 };
function saverNeed() { return SAVER_NEED[currentCurrency] || 50; }
// Distinct foods ever used in time — variety, read from the event log.
function distinctUsed() {
  const s = new Set();
  for (const e of (state.history || [])) if (e.k === 'used' && e.name) s.add(e.name.toLowerCase().trim());
  return s.size;
}
// Days since Kulpio was first opened — tenure, independent of the streak.
function tenureDays() {
  const d = Math.floor((Date.now() - new Date(state.firstUse + 'T00:00:00').getTime()) / 864e5);
  return Math.max(0, isNaN(d) ? 0 : d);
}
const BADGES = [
  { id:'b_first', emo:'🥇', name:'achFirst', desc:'achFirstD', get:() => state.usedCount || 0, need:() => 1 },
  { id:'b_use25', emo:'🍽️', name:'achUse25', desc:'achUse25D', get:() => state.usedCount || 0, need:() => 25 },
  { id:'b_use100', emo:'👨‍🍳', name:'achUse100', desc:'achUse100D', get:() => state.usedCount || 0, need:() => 100 },
  { id:'b_use250', emo:'🏆', name:'achUse250', desc:'achUse250D', get:() => state.usedCount || 0, need:() => 250 },
  { id:'b_week', emo:'🔥', name:'achWeek', desc:'achWeekD', get:wasteStreakDays, need:() => 7 },
  { id:'b_month', emo:'🌈', name:'achMonth', desc:'achMonthD', get:wasteStreakDays, need:() => 30 },
  { id:'b_season', emo:'🍃', name:'achSeason', desc:'achSeasonD', get:wasteStreakDays, need:() => 90 },
  { id:'b_full', emo:'📦', name:'achFull', desc:'achFullD', get:() => state.products.length, need:() => 15 },
  { id:'b_stock', emo:'🧊', name:'achStock', desc:'achStockD', get:() => state.products.length, need:() => 30 },
  { id:'b_saver', emo:'💰', name:'achSaver', desc:'achSaverD', get:() => Math.floor(state.saved || 0), need:saverNeed, money:true },
  { id:'b_saver2', emo:'🏦', name:'achBigSaver', desc:'achBigSaverD', get:() => Math.floor(state.saved || 0), need:() => saverNeed() * 5, money:true },
  { id:'b_scan10', emo:'📷', name:'achScan', desc:'achScanD', get:() => state.scanCount || 0, need:() => 10 },
  { id:'b_scan50', emo:'🔎', name:'achScan50', desc:'achScan50D', get:() => state.scanCount || 0, need:() => 50 },
  { id:'b_variety', emo:'🌍', name:'achVariety', desc:'achVarietyD', get:distinctUsed, need:() => 30 },
  { id:'b_team', emo:'🤝', name:'achTeam', desc:'achTeamD', get:() => houseCode ? 1 : 0, need:() => 1 },
  { id:'b_year', emo:'📅', name:'achYear', desc:'achYearD', get:tenureDays, need:() => 365 },
  { id:'b_use500', emo:'👑', name:'achUse500', desc:'achUse500D', get:() => state.usedCount || 0, need:() => 500 },
  { id:'b_scan200', emo:'🛰️', name:'achScan200', desc:'achScan200D', get:() => state.scanCount || 0, need:() => 200 },
  { id:'b_variety60', emo:'🌐', name:'achVariety60', desc:'achVariety60D', get:distinctUsed, need:() => 60 },
  { id:'b_full50', emo:'🏬', name:'achFull50', desc:'achFull50D', get:() => state.products.length, need:() => 50 },
  { id:'b_half', emo:'🗓️', name:'achHalf', desc:'achHalfD', get:wasteStreakDays, need:() => 180 },
  { id:'b_card1', emo:'💳', name:'achCard1', desc:'achCard1D', get:() => (state.cards || []).length, need:() => 1 },
  { id:'b_card3', emo:'👛', name:'achCard3', desc:'achCard3D', get:() => (state.cards || []).length, need:() => 3 },
  { id:'b_cook1', emo:'🍳', name:'achCook1', desc:'achCook1D', get:() => favRecipes.length, need:() => 1 },
  { id:'b_cook10', emo:'📖', name:'achCook10', desc:'achCook10D', get:() => favRecipes.length, need:() => 10 },
  { id:'b_plan', emo:'🗒️', name:'achPlan', desc:'achPlanD', get:() => Object.keys(mealPlan).length, need:() => 1 },
  { id:'b_ten30', emo:'🌙', name:'achTen30', desc:'achTen30D', get:tenureDays, need:() => 30 },
  { id:'b_ten100', emo:'💯', name:'achTen100', desc:'achTen100D', get:tenureDays, need:() => 100 },
  // Secret: hidden as ??? until earned (long-term milestones).
  { id:'b_use1000', emo:'🌟', name:'achUse1000', desc:'achUse1000D', get:() => state.usedCount || 0, need:() => 1000, secret:true },
  { id:'b_hoard', emo:'🐉', name:'achHoard', desc:'achHoardD', get:() => Math.floor(state.saved || 0), need:() => saverNeed() * 20, money:true, secret:true },
  // Secret: unlocked by discovering the four hidden Kulpio easter eggs.
  { id:'b_egg_tap', emo:'🤭', name:'eggTapN', desc:'eggTapD', get:() => (state.eggs && state.eggs.tap) ? 1 : 0, need:() => 1, secret:true },
  { id:'b_egg_date', emo:'🎉', name:'eggDateN', desc:'eggDateD', get:() => (state.eggs && state.eggs.date) ? 1 : 0, need:() => 1, secret:true },
  { id:'b_egg_mile', emo:'🎯', name:'eggMileN', desc:'eggMileD', get:() => (state.eggs && state.eggs.milestone) ? 1 : 0, need:() => 1, secret:true },
  { id:'b_egg_word', emo:'✨', name:'eggWordN', desc:'eggWordD', get:() => (state.eggs && state.eggs.word) ? 1 : 0, need:() => 1, secret:true },
];
// Record a discovered easter egg once, then let checkBadges unlock its secret
// achievement (which does the confetti). Returns true only the first time.
function foundEgg(key) {
  state.eggs = state.eggs || {};
  if (state.eggs[key]) return false;
  state.eggs[key] = true;
  saveState();
  checkBadges();
  return true;
}
function badgeDesc(b) {
  // Money badges spell out their own threshold; others share saverNeed()'s {x}.
  return l(b.desc).replace('{x}', formatPrice(b.money ? b.need() : saverNeed()));
}
// ── LEVEL / XP ── XP comes only from monotonic good-habit counters, so a
// level once reached is never lost. Level n → n+1 costs 100·n XP. Cosmetic:
// leveling up just celebrates and bumps the profile tier emoji — nothing gates.
function playerXp() {
  const badgeN = BADGES.filter(b => state.badges && state.badges[b.id]).length;
  const eggN = state.eggs ? Object.values(state.eggs).filter(Boolean).length : 0;
  return (state.usedCount || 0) * 12   // using food in time — the core habit
    + badgeN * 60                      // achievements
    + (state.scanCount || 0) * 3       // scanning a product
    + (state.bestStreak || 0) * 4      // best waste-free run
    + eggN * 40;                       // little discoveries
}
function playerLevel(xp) {
  xp = xp == null ? playerXp() : xp;
  let lvl = 1;
  while (xp >= 50 * lvl * (lvl + 1)) lvl++;
  return lvl;
}
function lvlTierEmoji(l) { return l >= 10 ? '👑' : l >= 6 ? '✨' : l >= 3 ? '🍐' : '🌱'; }
function lvlTierTitle(lv) { return lv >= 10 ? l('tierRoyal') : lv >= 6 ? l('tierSaver') : lv >= 3 ? l('tierPro') : l('tierSprout'); }
// Celebrate only a genuine climb (after boot), and only once per level.
function checkLevelUp() {
  const lvl = playerLevel();
  if (!_ready) { state.lvlSeen = lvl; return; }        // seed silently on boot
  if (lvl > (state.lvlSeen || 1)) {
    state.lvlSeen = lvl; saveState();
    // Delay so it lands after the action's own reaction (e.g. the eat chomp).
    setTimeout(() => {
      pearReact('proud', null, lvlTierEmoji(lvl), 1500);
      pearSay('⬆️ ' + l('lvlTitle') + ' ' + lvl);
      pearConfetti();
    }, 650);
  }
}
// Award anything newly earned; celebrate the freshest one. Runs on every
// freshness pass, so streak badges unlock as time passes, not only on taps.
function checkBadges() {
  state.badges = state.badges || {};
  let newest = null;
  for (const b of BADGES) {
    if (state.badges[b.id]) continue;
    if (b.get() >= b.need()) { state.badges[b.id] = new Date().toISOString().slice(0, 10); newest = b; }
  }
  if (newest) {
    saveState();
    pearSay('🏆 ' + l(newest.name));
    pearReact('hop', null, newest.emo, 900);
    setTimeout(pearConfetti, 400);
  }
  checkLevelUp();
}
// A tapped badge makes the pear explain how to earn it. A still-locked secret
// keeps its mystery — no name, no threshold, just a nudge to keep going.
function badgeInfo(id) {
  const b = BADGES.find(x => x.id === id);
  if (!b) return;
  const got = state.badges && state.badges[b.id];
  if (b.secret && !got) { pearSay('🔒 ' + l('achSecret')); return; }
  pearSay((got ? '🏆 ' : b.emo + ' ') + badgeDesc(b));
}
function badgeHtml(b) {
  const got = state.badges && state.badges[b.id];
  const hidden = b.secret && !got;   // a locked secret reveals nothing
  const need = b.need();
  const have = Math.min(b.get(), need);
  return `<button type="button" class="badge ${got ? 'got' : ''}${hidden ? ' secret' : ''}" onclick="badgeInfo('${b.id}')" aria-label="${hidden ? esc(l('achSecret')) : esc(l(b.name)) + ': ' + esc(badgeDesc(b))}">
      <span class="badge-emo">${hidden ? '🔒' : b.emo}</span>
      <span class="badge-name">${hidden ? '???' : esc(l(b.name))}</span>
      <span class="badge-sub">${got ? '✓' : hidden ? '?' : have + '/' + need}</span>
    </button>`;
}

function saveState() {
  try {
    localStorage.setItem('kulpio-products', JSON.stringify(state.products));
  } catch {
    // Quota hit — stored photo thumbnails are the heavy part; drop them from
    // the oldest products first and retry so the fridge itself is never lost.
    for (const p of state.products) {
      if (p.img && p.img.startsWith('data:')) {
        delete p.img;
        try { localStorage.setItem('kulpio-products', JSON.stringify(state.products)); break; } catch {}
      }
    }
  }
  localStorage.setItem('kulpio-lang', currentLang);
  localStorage.setItem('kulpio-theme', currentTheme);
  localStorage.setItem('kulpio-accent', currentAccent);
  localStorage.setItem('kulpio-moodtheme', moodTheme ? 'on' : 'off');
  localStorage.setItem('kulpio-bg', currentBg);
  localStorage.setItem('kulpio-currency', currentCurrency);
  localStorage.setItem('kulpio-notif', notifsEnabled ? 'on' : 'off');
  localStorage.setItem('kulpio-saved', String(state.saved || 0));
  localStorage.setItem('kulpio-wasted', String(state.wasted || 0));
  localStorage.setItem('kulpio-used-count', String(state.usedCount || 0));
  localStorage.setItem('kulpio-scan-count', String(state.scanCount || 0));
  localStorage.setItem('kulpio-shopping', JSON.stringify(state.shopping || []));
  // Cap the event log so it can't grow into the localStorage quota.
  if ((state.history || []).length > 500) state.history = state.history.slice(-500);
  localStorage.setItem('kulpio-history', JSON.stringify(state.history || []));
  localStorage.setItem('kulpio-since', state.firstUse);
  localStorage.setItem('kulpio-last-waste', state.lastWaste || '');
  localStorage.setItem('kulpio-badges', JSON.stringify(state.badges || {}));
  localStorage.setItem('kulpio-eggs', JSON.stringify(state.eggs || {}));
  localStorage.setItem('kulpio-lvl-seen', String(state.lvlSeen || 1));
  localStorage.setItem('kulpio-best-streak', String(state.bestStreak || 0));
  localStorage.setItem('kulpio-cards', JSON.stringify(state.cards || []));
  localStorage.setItem('kulpio-pricebook', JSON.stringify(state.priceBook || {}));
  houseMaybePush();   // a linked household hears about shopping-list changes
  schedulePushSync(); // the push server hears when the soonest expiry moved
  authPush();         // a signed-in account syncs the change to the cloud
}

// ─── LOCALE HELPER ───────────────────────────────────────────────
function l(key) {
  const locale = L[currentLang] || {};
  return locale[key] !== undefined ? locale[key] : (L.en[key] !== undefined ? L.en[key] : key);
}

function esc(v) {
  return String(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function jsArg(v) { return esc(JSON.stringify(String(v))); }
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// ─── LIVE FRESHNESS ──────────────────────────────────────────────
// Products store an ISO expiry date (`exp`); the badge/colour are derived
// from it on every render so the countdown stays accurate over time instead
// of being frozen at the moment the item was added. Legacy items saved
// before `exp` existed keep their stored badge.
function daysUntil(exp) {
  // Compare against the END of the expiry day in the user's local timezone,
  // so an item that expires "today" reads as 0 days (not already expired).
  // floor, not ceil: today's remaining hours must not count as an extra day
  // (ceil made "expires today" read 1 and "expired yesterday" read 0).
  const end = new Date(exp + 'T23:59:59');
  if (isNaN(end)) return null;
  return Math.floor((end - Date.now()) / 86400000);
}
function freshnessBadge(days) {
  if (days < 0) return l('expired');
  if (days === 0) return l('today');
  if (days === 1) return l('tomorrow');
  return `${days} ${l('days')}`;
}
function refreshFreshness() {
  for (const p of state.products) {
    if (!p.exp) continue;
    const days = daysUntil(p.exp);
    if (days == null) continue;
    p.badge = (p.frozen ? '❄️ ' : p.loc === 'pantry' ? '🥫 ' : p.opened ? '🔓 ' : '') + freshnessBadge(days);
    p.cls = days <= 1 ? 'br' : days <= 5 ? 'ba' : 'bg';
    p.dot = days <= 1 ? 'dr' : days <= 5 ? 'da' : 'dg';
  }
  updatePearMood();
  checkBadges();
  // The record streak only ever grows — a broken streak keeps its trophy.
  const curStreak = wasteStreakDays();
  if (curStreak > (state.bestStreak || 0)) state.bestStreak = curStreak;
  // Installed-app icon badge: how many items need attention (expiring
  // within 2 days or already expired, freezer excluded).
  if (navigator.setAppBadge) {
    const n = state.products.filter(p => p.exp && !p.frozen && (daysUntil(p.exp) ?? 99) <= 2).length;
    (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  }
  updateHero();
}
// How many items need attention: expiring within 2 days or already expired,
// freezer excluded (same rule as the pear's mood and the app icon badge).
function soonItems() {
  return state.products.filter(p => p.exp && !p.frozen && (daysUntil(p.exp) ?? 99) <= 2);
}
// The hero card's vitals: one big number (what needs eating), the fridge
// fill gauge, and the waste-free streak. Reuses existing strings only.
function updateHero() {
  const stat = document.getElementById('heroStat');
  const gauge = document.getElementById('heroGauge');
  const card = document.getElementById('heroCard');
  if (!stat || !gauge) return;
  const total = state.products.length;
  // Nothing in the fridge = nothing to report: he stands centre stage instead
  // of next to an empty column.
  if (card) card.classList.toggle('solo', !total);
  if (!total) {
    stat.innerHTML = '';
    gauge.innerHTML = '';
    return;
  }
  const soon = soonItems();
  const expired = soon.some(p => (daysUntil(p.exp) ?? 0) < 0);
  const n = soon.length || total;
  const cls = !soon.length ? '' : expired ? ' hn-danger' : ' hn-warn';
  const lbl = soon.length ? l('fExpiring') : l('fFresh');
  const streak = wasteStreakDays();
  // Money riding on the soon-to-expire items — the number that makes waste feel real.
  const risk = soon.reduce((s, p) => s + (p.price || 0) * (p.qty || 1), 0);
  // With jobs waiting, the headline number becomes the way into the plan.
  const jobs = planCount();
  const chips = `${risk > 0 ? `<span class="hero-chip hc-risk">💸 ${esc(formatPrice(risk))}</span>` : ''}${streak > 0 ? `<span class="hero-chip">🔥 ${streak}</span>` : ''}`;
  stat.innerHTML = `<span class="hero-num${cls}">${n}</span>
    <span class="hero-lbl">${esc(lbl)}</span>
    ${chips ? `<span class="hero-chips">${chips}</span>` : ''}`;
  stat.onclick = jobs ? openPearPlan : null;
  stat.style.cursor = jobs ? 'pointer' : '';
  if (jobs) {
    stat.setAttribute('role', 'button');
    stat.tabIndex = 0;
    stat.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPearPlan(); } };
    stat.setAttribute('aria-label', l('planNow') + ': ' + jobs);
  } else {
    stat.removeAttribute('role');
    stat.removeAttribute('tabindex');
    stat.onkeydown = null;
  }
  // Live countdown to the NEXT expiry: the soonest unfrozen dated item, with
  // a ticking localized clock. Tap opens that item's card. Frozen food never
  // counts down — the freezer stopped its clock.
  const dated = state.products.filter(p => p.exp && !p.frozen)
    .sort((a, b) => a.exp < b.exp ? -1 : a.exp > b.exp ? 1 : 0);
  const nx = dated[0];
  if (!nx) { gauge.innerHTML = ''; return; }
  const ni = state.products.indexOf(nx);
  const nd = daysUntil(nx.exp) ?? 9;
  const ncls = nd < 0 ? 'hn-danger' : nd <= 2 ? 'hn-warn' : '';
  gauge.innerHTML = `<button type="button" class="hero-next" onclick="editProductPrompt(${ni})" aria-label="${esc(nx.name)} — ${esc(nx.badge || '')}">
    <span class="hn-emoji" aria-hidden="true">${foodEmoji(nx.name) || '⏳'}</span>
    <span class="hn-txt"><span class="hn-name">${esc(nx.name)}</span>
    <b class="hn-time ${ncls}" id="heroNextTime" data-exp="${esc(nx.exp)}">${esc(heroCountdownText(nx) || nx.badge || '')}</b></span>
  </button>`;
}
// The clock's face: time left until the END of the expiry day, in the largest
// sensible unit, localized by Intl — no new translation tables needed.
// Already expired → null; the caller falls back to the item's badge.
function heroCountdownText(p) {
  const ms = new Date(p.exp + 'T23:59:59') - Date.now();
  if (ms <= 0) return null;
  const rtf = new Intl.RelativeTimeFormat(speechLang[currentLang] || currentLang, { numeric: 'always', style: 'narrow' });
  const min = Math.max(1, Math.floor(ms / 60000));
  return min >= 2880 ? rtf.format(Math.round(min / 1440), 'day')
    : min >= 60 ? rtf.format(Math.round(min / 60), 'hour')
    : rtf.format(min, 'minute');
}
// It ticks on its own — re-rendering the whole hero every 30 s would be
// overkill, so only the clock text moves until the moment it hits zero.
setInterval(() => {
  const el = document.getElementById('heroNextTime');
  if (!el || !el.dataset.exp) return;
  const txt = heroCountdownText({ exp: el.dataset.exp });
  if (txt) el.textContent = txt;
  else updateHero();   // it just expired — rebuild for the badge + colour
}, 30000);
// The assistant pear reflects the WORST item in the fridge: green when all is
// well, yellow when something is close to expiring, rotten once something has.
// Frozen items are paused, so they don't drag the mood down.
function fridgeMood() {
  let mood = 'fresh';
  for (const p of state.products) {
    if (!p.exp || p.frozen) continue;
    const d = daysUntil(p.exp);
    if (d == null) continue;
    if (d < 0) return 'rotten';
    if (d <= 2) mood = 'warn';
  }
  return mood;
}
let _prevMood = null;      // for detecting mood changes
let _noCelebrate = false;  // suppress the "all clear" party on waste/delete
function updatePearMood() {
  const el = document.getElementById('pearIcon');
  if (!el) return;
  const m = fridgeMood();
  el.classList.remove('fresh', 'warn', 'rotten');
  el.classList.add(m);
  el.setAttribute('aria-label', 'Kulpio — ' + l(m === 'rotten' ? 'pearRotten' : m === 'warn' ? 'pearWarn' : 'pearFresh'));
  if (moodTheme) setBrandVars(MOOD_COLOR[m] || MOOD_COLOR.fresh);   // whole app follows his mood
  updateWeather(m);   // rain cloud while rotten
  // React to a change in mood — but not on the very first computation (load).
  if (_prevMood !== null && m !== _prevMood) {
    if (m === 'rotten') pearTear();                                     // something just rotted
    else {
      if (_prevMood === 'rotten' && !_noCelebrate) showRainbow();       // the rain just cleared
      if (m === 'fresh' && state.products.length && !_noCelebrate) pearCelebrate();  // cleared all risky items
    }
  }
  _prevMood = m;
}
// ── PEAR PERSONALITY ─────────────────────────────────────────────
// Speak a line in the pear's bubble.
// He speaks. Pass an action and the bubble becomes a button that runs it —
// that's how he hands you the thing he's talking about (see pearTips).
function pearSay(text, action, ms) {
  const b = document.getElementById('pearBubble');
  if (!b || !text) return;
  b.textContent = action ? text + '  ›' : text;   // the › says "this one's a button"
  b.classList.add('show');
  b.classList.toggle('tappable', !!action);
  b.setAttribute('role', action ? 'button' : 'status');
  if (action) {
    b.tabIndex = 0;
    b.onclick = () => { hidePearBubble(); pearReact('hop', null, '👉', 700); action(); };
    b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.onclick(); } };
  } else {
    b.removeAttribute('tabindex');
    b.onclick = b.onkeydown = null;
  }
  clearTimeout(b._t);
  // An offer stays up long enough to actually be tapped.
  b._t = setTimeout(() => hidePearBubble(), ms || (action ? 5000 : 1900));
}
function hidePearBubble() {
  const b = document.getElementById('pearBubble');
  if (!b) return;
  b.classList.remove('show', 'tappable');
  b.onclick = b.onkeydown = null;
  b.removeAttribute('tabindex');
}
// ── THE PEAR'S PLAN ──────────────────────────────────────────────
// The one genuinely useful thing an assistant can do: read the fridge, say
// exactly what to do with each item today, and then DO it on one tap.
// Every action here is an existing, undoable one — nothing new can go wrong.
function pearPlanRows() {
  const rows = [];
  state.products.forEach((p, i) => {
    if (p.frozen || !p.exp) return;
    const d = daysUntil(p.exp);
    if (d == null) return;
    if (d < 0) {
      rows.push({ i, p, kind: 'toss', why: 'planToss', icon: '🗑️', act: 'cWasted' });
    } else if (d <= 2) {
      // If the freezer can genuinely save it, that's the better advice: eating
      // is only urgent because the clock is running, and freezing stops it.
      const freezable = FREEZABLE.includes(foodCategory(p));
      rows.push(freezable
        ? { i, p, kind: 'freeze', why: 'planFreeze', icon: '❄️', act: 'cFroze' }
        : { i, p, kind: 'eat', why: 'planEat', icon: '✅', act: 'cUsed' });
    }
  });
  // Soonest first — the plan should read in the order you'd act on it.
  rows.sort((a, b) => (daysUntil(a.p.exp) ?? 9) - (daysUntil(b.p.exp) ?? 9));
  const shop = (state.shopping || []).filter(s => !s.done);
  if (shop.length) rows.push({ kind: 'buy', why: 'planBuy', icon: '🛒', shop });
  return rows;
}
function planCount() { return pearPlanRows().filter(r => r.kind !== 'buy').length; }
function openPearPlan() {
  document.getElementById('planBody').innerHTML = pearPlanHtml();
  document.getElementById('planTitle').textContent = '🍐 ' + l('planNow');
  ensureOverlayHistory();
  document.getElementById('planModal').classList.add('show');
}
function closePearPlan() { document.getElementById('planModal').classList.remove('show'); }
function pearPlanHtml() {
  const rows = pearPlanRows();
  if (!rows.length) {
    return `<div class="plan-clear">🍐<span>${esc(l('planClear'))}</span></div>`;
  }
  return rows.map(r => r.kind === 'buy'
    ? `<button class="plan-row" onclick="closePearPlan();openSheet('shop')">
        <span class="plan-emoji">🛒</span>
        <span class="plan-txt"><b>${esc(l('planBuy'))}</b><small>${r.shop.slice(0, 3).map(s => esc(s.name)).join(', ')}${r.shop.length > 3 ? ` +${r.shop.length - 3}` : ''}</small></span>
        <span class="plan-go">${r.shop.length}</span>
      </button>`
    : `<div class="plan-row plan-${r.kind}">
        <span class="plan-emoji">${foodEmoji(r.p.name) || r.icon}</span>
        <span class="plan-txt"><b>${esc(r.p.name)}</b><small>${esc(l(r.why))}</small></span>
        <button class="plan-do" onclick="doPlan(${r.i},'${r.kind}')" aria-label="${esc(l(r.act))}: ${esc(r.p.name)}">${r.icon} ${esc(l(r.act))}</button>
      </div>`).join('');
}
// Carry out one line of the plan. Each of these already shows an undo toast.
function doPlan(i, kind) {
  const p = state.products[i];
  if (!p) return;
  if (kind === 'eat') markUsed(i);
  else if (kind === 'toss') markWasted(i);
  else if (kind === 'freeze') { freezeItem(i); }
  // The plan shrinks as you work through it; when it's empty he says so.
  const body = document.getElementById('planBody');
  if (body) body.innerHTML = pearPlanHtml();
  if (!planCount()) pearReact('proud', null, '🎉', 900);
  updateHero();
}

// ── ASK THE PEAR ─────────────────────────────────────────────────
// Everything he can tell you about your fridge right now, most useful first.
// Each line is built from EXISTING translated strings + numbers, so there is
// nothing new to translate; the ones that lead somewhere carry an action.
// Categories the freezer actually rescues (you don't freeze salad or juice).
const FREEZABLE = ['catMeat', 'catBakery', 'catDairy'];
function pearTips() {
  const tips = [];
  const expired = state.products.filter(p => p.exp && !p.frozen && (daysUntil(p.exp) ?? 9) < 0);
  const soon = soonItems().filter(p => !expired.includes(p));
  const shop = (state.shopping || []).filter(s => !s.done);
  const meal = mealPlan[weekDayKey(0)];
  const streak = wasteStreakDays();
  const risk = soonItems().reduce((s, p) => s + (p.price || 0) * (p.qty || 1), 0);

  // His most useful answer first: the plan, which tells you what to DO.
  const jobs = planCount();
  if (jobs) tips.push({ t: `🍐 ${l('planNow')} · ${jobs}`, a: openPearPlan, e: '📋' });
  if (expired.length) tips.push({ t: `🗑️ ${expired.length} · ${l('expired')}`, a: goRescue, e: '⚠️' });
  if (soon.length) tips.push({ t: `⏰ ${soon.length} · ${l('fExpiring')}`, a: goRescue, e: '⏰' });
  if (risk > 0) tips.push({ t: `⚠️ ${l('moneyAtRisk')}: ${formatPrice(risk)}`, a: goRescue, e: '💸' });
  // He'll cook with what's dying, but only if the AI proxy is actually set up.
  if (soonItems().length && aiProxyUrl()) tips.push({
    t: `👨‍🍳 ${l('chefBtn')}`, e: '🍳',
    a: () => { switchTab('recipes', document.getElementById('tab-recipes')); setTimeout(pearChef, 350); },
  });
  // Food the freezer can genuinely save — one tap buys it weeks instead of hours.
  const freezable = soon.concat(expired.length ? [] : [])
    .find(p => !p.frozen && FREEZABLE.includes(foodCategory(p)));
  if (freezable) tips.push({
    t: `❄️ ${l('cFroze')}: ${freezable.name}`, e: '❄️',
    a: () => { freezeItem(state.products.indexOf(freezable)); pearReact('shiver', null, '❄️', 900); },
  });
  if (meal) tips.push({ t: `📅 ${meal.title}`, a: () => openRecipeDetail(meal), e: '📅' });
  if (shop.length) tips.push({ t: `🛒 ${shop.length} · ${l('cBuy')}`, a: () => openSheet('shop'), e: '🛒' });
  if (!state.products.length) tips.push({ t: `➕ ${l('addManually')}`, a: addProductManually, e: '🧺' });
  if (streak > 1) tips.push({ t: `🔥 ${streak}`, e: '🔥' });
  if (state.products.length) tips.push({ t: `🧺 ${state.products.length}`, e: '🧺' });
  return tips;
}
// ── PETTING ── stroking him back and forth: he melts and answers with a
// heart rating that is really the fridge talking (nothing expired, nothing
// due, a live streak). Wordless — hearts speak every language.
function pearHearts() {
  let n = 1;
  const total = state.products.length;
  const expired = total && state.products.some(p => p.exp && !p.frozen && (daysUntil(p.exp) ?? 9) < 0);
  if (total && !expired) n++;
  if (total && !soonItems().length) n++;
  if (wasteStreakDays() >= 3) n++;
  if (wasteStreakDays() >= 14) n++;
  return n;   // 1..5
}
function pearPet() {
  pearReact('love', null, '💕', 1400);
  const n = pearHearts();
  pearSay('❤️'.repeat(n) + '🤍'.repeat(5 - n));
}

// ── DAILY BRIEFING ── his morning stand-up, once a day: a small card of
// facts (what expires, what to buy, tonight's meal, the streak), every
// actionable line one tap. Fires only when something is actually actionable —
// a quiet fridge stays quiet. Replaces the old single-line rescue nudge.
function dailyBriefing(force) {
  const wrap = document.querySelector('.pear-wrap');
  if (!wrap || pearBusy() || anyOverlayOpen()) return;
  if (!state.products.length) return;   // a brand-new fridge gets the tour, not a stand-up
  const today = weekDayKey(0);
  if (!force && localStorage.getItem('kulpio-briefed') === today) return;
  // Actionable facts plus the streak — the fill-level filler stays out.
  const tips = pearTips().filter(t => t.a || t.t.startsWith('🔥'));
  if (!tips.some(t => t.a)) return;
  if (!force) { try { localStorage.setItem('kulpio-briefed', today); } catch {} }
  closePearBrief();
  hidePearBubble();
  const card = document.createElement('div');
  card.className = 'pear-brief';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', l('briefTitle'));
  const head = document.createElement('div');
  head.className = 'pb-head';
  head.textContent = '🍐 ' + l('briefTitle');
  const x = document.createElement('button');
  x.className = 'pb-x';
  x.setAttribute('aria-label', l('cancel'));
  x.textContent = '×';
  x.onclick = closePearBrief;
  head.appendChild(x);
  card.appendChild(head);
  tips.slice(0, 4).forEach(tip => {
    const row = document.createElement(tip.a ? 'button' : 'div');
    row.className = 'pb-row' + (tip.a ? ' pb-act' : '');
    row.textContent = tip.t + (tip.a ? ' ›' : '');
    if (tip.a) row.onclick = () => { closePearBrief(); tip.a(); };
    card.appendChild(row);
  });
  wrap.appendChild(card);
  pearReact('wave', null, '📋', 1000);
  clearTimeout(dailyBriefing._t);
  dailyBriefing._t = setTimeout(closePearBrief, 16000);
}
function closePearBrief() {
  const b = document.querySelector('.pear-brief');
  if (b) b.remove();
}
// A clean fridge gets soap bubbles: three 🫧 drift up on a stagger.
function blowBubbles() {
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  if (!wrap) return;
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const b = document.createElement('span');
      b.className = 'pear-bub';
      b.textContent = '🫧';
      b.style.insetInlineStart = (38 + Math.random() * 24) + '%';
      wrap.appendChild(b);
      setTimeout(() => b.remove(), 2600);
    }, i * 420);
  }
}
// App birthday: a balloon, a dance and a candle count on the anniversary of
// first use. Wordless — the bubble is just 🎂 and the number of years.
function maybeAnniversary() {
  const first = state.firstUse || '';
  const today = weekDayKey(0);
  if (!first || first.length < 10 || first.slice(5) !== today.slice(5) || first.slice(0, 4) === today.slice(0, 4)) return;
  if (localStorage.getItem('kulpio-party') === today) return;
  try { localStorage.setItem('kulpio-party', today); } catch {}
  const wrap = document.querySelector('.pear-wrap');
  if (wrap) {
    const b = document.createElement('span');
    b.className = 'pear-balloon';
    b.textContent = '🎈';
    wrap.appendChild(b);
    setTimeout(() => b.remove(), 9000);
  }
  foundEgg('date');   // catching Kulpio's birthday counts as the date egg…
  pearReact('dance', null, '🎉', 1600);
  pearSay('🎂 ' + (parseInt(today, 10) - parseInt(first, 10)));   // …but the birthday line wins the bubble
  setTimeout(pearConfetti, 500);
}
// Holiday cameo: on a handful of special days Kulpio celebrates — and finding
// him mid-party unlocks the secret date egg. Once per day.
const _holidays = { '01-01': '🎆', '02-14': '💝', '10-31': '🎃', '12-25': '🎄', '12-31': '🎆' };
function maybeHolidayEgg() {
  const today = weekDayKey(0);
  const md = today.slice(5);
  const emo = _holidays[md];
  if (!emo) return;
  if (localStorage.getItem('kulpio-holiday') === today) return;
  try { localStorage.setItem('kulpio-holiday', today); } catch {}
  pearReact('dance', null, emo, 1600);
  pearSay(emo + ' ' + l('eggDateSay'));
  setTimeout(pearConfetti, 500);
  foundEgg('date');
}
// Three helpings inside a minute → a little hiccup. He's only pear.
let _mealTimes = [];
function maybeHiccup() {
  const now = Date.now();
  _mealTimes = _mealTimes.filter(t => now - t < 60000);
  _mealTimes.push(now);
  if (_mealTimes.length >= 3) {
    _mealTimes = [];
    // He may still be mid-chomp at the 1.2s mark — wait him out (briefly)
    // instead of swallowing the hiccup, which is what a real one does anyway.
    let tries = 0;
    setTimeout(function fire() {
      if (pearBusy() && ++tries < 6) { setTimeout(fire, 400); return; }
      if (!pearBusy()) pearReact('hiccup', null, '😋', 1100);
    }, 1200);
  }
}
// Float an emoji up from the pear.
function pearSpark(emoji) {
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  if (!wrap) return;
  const s = document.createElement('span');
  s.className = 'pear-spark';
  s.textContent = emoji || (Math.random() < 0.5 ? '✨' : '💚');
  wrap.appendChild(s);
  setTimeout(() => s.remove(), 820);
}
// Whole-body one-shot reaction (hop/proud/sad/shiver/dizzy/wiggle), optionally
// with a spoken line and a floating emoji.
const _pearAnims = ['hop', 'proud', 'sad', 'shiver', 'dizzy', 'wiggle', 'chomp', 'spin', 'sneeze', 'stretch', 'poke', 'wave', 'yawn', 'humming', 'love', 'stuffed', 'dance', 'hiccup'];
function pearBusy() {
  const el = document.getElementById('pearIcon');
  return el && _pearAnims.some(a => el.classList.contains(a));
}
function pearReact(anim, msgKey, emoji, dur) {
  const el = document.getElementById('pearIcon');
  if (!el) return;
  pearWake();
  _pearAnims.forEach(a => el.classList.remove(a));
  void el.offsetWidth;                    // restart cleanly on rapid triggers
  el.classList.add(anim);
  setTimeout(() => el.classList.remove(anim), dur || 900);
  if (msgKey) pearSay(l(msgKey));
  if (emoji) pearSpark(emoji);
}

// ── ALIVE EYES ───────────────────────────────────────────────────
// Pupils follow the pointer (or your last tap) and glance at things you
// interact with. Skipped entirely under prefers-reduced-motion.
const _reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let _pupilLock = 0, _pupilRaf = null, _pupilEvt = null;
function movePupils(dx, dy) {
  document.querySelectorAll('#pearIcon .pupil').forEach(p => { p.style.transform = `translate(${dx}px,${dy}px)`; });
}
function pupilsToward(clientX, clientY) {
  const el = document.getElementById('pearIcon');
  if (!el) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height * 0.55;
  const ang = Math.atan2(clientY - cy, clientX - cx);
  const dist = Math.min(1, Math.hypot(clientX - cx, clientY - cy) / 220);
  movePupils(Math.cos(ang) * 3.4 * dist, Math.sin(ang) * 2.6 * dist);
}
if (!_reduceMotion) {
  document.addEventListener('pointermove', e => {
    if (Date.now() < _pupilLock) return;
    _pupilEvt = e;
    if (_pupilRaf) return;
    _pupilRaf = requestAnimationFrame(() => {
      _pupilRaf = null;
      if (_pupilEvt) pupilsToward(_pupilEvt.clientX, _pupilEvt.clientY);
    });
  }, { passive: true });
  document.addEventListener('pointerdown', e => {
    if (Date.now() >= _pupilLock) pupilsToward(e.clientX, e.clientY);
  }, { passive: true });
}
// A deliberate glance (e.g. toward the tab you just tapped), then free again.
function pearGlance(clientX, clientY, ms) {
  if (_reduceMotion) return;
  pupilsToward(clientX, clientY);
  _pupilLock = Date.now() + (ms || 700);
  setTimeout(() => { if (Date.now() >= _pupilLock) movePupils(0, 0); }, ms || 700);
}

// ── LONG-PRESS: LOVE ─────────────────────────────────────────────
// Hold him for half a second and he melts: shut eyes, a sway, floating hearts.
let _pressTimer = null, _suppressPoke = false;
function pearLove() {
  const el = document.getElementById('pearIcon');
  if (!el) return;
  _suppressPoke = true;
  setTimeout(() => { _suppressPoke = false; }, 700);   // in case no click follows
  pearWake();
  _pearAnims.forEach(a => el.classList.remove(a));
  el.classList.add('love', 'blush');
  setTimeout(() => el.classList.remove('love'), 1600);
  clearTimeout(el._blushT);
  el._blushT = setTimeout(() => el.classList.remove('blush'), 2600);
  const wrap = el.parentElement;
  ['💗', '💖', '💞', '💕', '💘'].forEach((h, i) => {
    const s = document.createElement('span');
    s.className = 'pear-heart';
    s.textContent = h;
    s.style.setProperty('--x', (Math.random() * 90 - 45).toFixed(0) + 'px');
    s.style.setProperty('--d', (i * 0.14).toFixed(2) + 's');
    wrap.appendChild(s);
    setTimeout(() => s.remove(), 2400);
  });
}

// Poke the pear: squishy bounce, a floating sparkle, and a mood speech bubble.
// Poke him fast a few times in a row and he gets giddy and dizzy.
let _pokeCount = 0, _pokeReset = null;
let _eggTaps = 0, _eggTapReset = null;   // a long rapid-tap run pops a secret egg
let _tipIdx = -1, _tipReset = null;   // -1 = his next word is his mood, not a tip
function pokePear() {
  if (_suppressPoke) { _suppressPoke = false; return; }   // release after a long-press cuddle
  const el = document.getElementById('pearIcon');
  if (!el) return;
  pearWake();
  el.classList.remove('humming');         // a poke interrupts his tune
  // blush while being tickled; lingers so rapid taps keep him pink
  el.classList.add('blush');
  clearTimeout(el._blushT);
  el._blushT = setTimeout(() => el.classList.remove('blush'), 2500);

  // Secret egg: keep tickling him well past giddy and he cracks up.
  _eggTaps++;
  clearTimeout(_eggTapReset);
  _eggTapReset = setTimeout(() => { _eggTaps = 0; }, 1300);
  if (_eggTaps >= 15 && foundEgg('tap')) {
    _eggTaps = _pokeCount = 0;
    pearReact('dance', null, '🤭', 1500);
    pearSay(l('eggTapSay'));
    return;
  }

  _pokeCount++;
  clearTimeout(_pokeReset);
  _pokeReset = setTimeout(() => { _pokeCount = 0; }, 1300);
  if (_pokeCount >= 5) {                   // easter egg: poked silly
    _pokeCount = 0;
    pearReact('dizzy', 'pearDizzy', '😵‍💫', 1000);
    return;
  }

  el.classList.remove('poke');
  void el.offsetWidth;                     // restart the animation on rapid taps
  el.classList.add('poke');
  setTimeout(() => el.classList.remove('poke'), 480);

  // Poking him is how you ASK him something: the first tap gives his mood,
  // every tap after that walks through what he actually knows about your
  // fridge — and the ones you can act on hand you the screen (tap the bubble).
  const tips = pearTips();
  if (!tips.length || _tipIdx < 0) {
    _tipIdx = 0;
    const m = fridgeMood();
    const moodKeys = m === 'rotten' ? ['pearRotten', 'pearRotten2']
      : m === 'warn' ? ['pearWarn', 'pearWarn2'] : ['pearFresh', 'pearFresh2'];
    pearSay(l(moodKeys[Math.floor(Math.random() * moodKeys.length)]));
    pearSpark();
  } else {
    const tip = tips[_tipIdx % tips.length];
    _tipIdx++;
    pearSay(tip.t, tip.a);
    pearSpark(tip.e);
  }
  clearTimeout(_tipReset);
  _tipReset = setTimeout(() => { _tipIdx = -1; }, 12000);   // back to his mood later
}
// Greeting keyed to the time of day.
function greetKey() {
  const h = new Date().getHours();
  return h < 5 ? 'pearNight' : h < 12 ? 'pearMorning' : h < 18 ? 'pearDay' : h < 22 ? 'pearEvening' : 'pearNight';
}

// ── NAP ──────────────────────────────────────────────────────────
// After a stretch of no interaction the pear dozes off (eyes shut, 💤);
// any activity wakes him.
let _lastActivity = Date.now();
let _napZzz = null;
let _ready = false;   // true once init finishes — gates load-time reactions
function spawnZzz() {
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  if (!wrap || document.visibilityState !== 'visible' || !el.classList.contains('napping')) return;
  const s = document.createElement('span');
  s.className = 'pear-zzz';
  s.textContent = '💤';
  wrap.appendChild(s);
  setTimeout(() => s.remove(), 2000);
}
function pearWake() {
  _lastActivity = Date.now();
  const el = document.getElementById('pearIcon');
  if (el && el.classList.contains('napping')) {
    el.classList.remove('napping');
    // a proper wake-up: stretch + a little yawn
    el.classList.add('stretch');
    setTimeout(() => el.classList.remove('stretch'), 900);
    el.classList.add('yawn');
    setTimeout(() => el.classList.remove('yawn'), 1900);
  }
  if (_napZzz) { clearInterval(_napZzz); _napZzz = null; }
}
function scheduleNapCheck() {
  setInterval(() => {
    const el = document.getElementById('pearIcon');
    if (!el || el.classList.contains('napping')) return;
    if (document.visibilityState === 'visible' && Date.now() - _lastActivity > 30000 && !pearBusy()) {
      el.classList.add('napping');
      spawnZzz();
      _napZzz = setInterval(spawnZzz, 2200);
    }
  }, 3000);
}
// Chomp: eat a used-up item — its food emoji drops into his mouth.
function pearEat(name) {
  pearReact('chomp', 'pearUsed', null, 640);
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  if (!wrap) return;
  const s = document.createElement('span');
  s.className = 'pear-eat';
  s.textContent = foodEmoji(name) || '💚';
  wrap.appendChild(s);
  setTimeout(() => s.remove(), 700);
}
// Hum a happy tune: eyes shut, a gentle sway, notes drifting up one by one.
function pearHum() {
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  if (!wrap) return;
  el.classList.add('humming');
  setTimeout(() => el.classList.remove('humming'), 3200);
  const notes = ['♪', '♫', '♩', '♬'];
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      if (!el.classList.contains('humming') || document.visibilityState !== 'visible') return;
      const s = document.createElement('span');
      s.className = 'pear-note';
      s.textContent = notes[Math.floor(Math.random() * notes.length)];
      s.style.setProperty('--x', ((i % 2 ? -1 : 1) * (10 + Math.random() * 16)).toFixed(0) + 'px');
      s.style.setProperty('--r', (Math.random() * 24 - 12).toFixed(0) + 'deg');
      wrap.appendChild(s);
      setTimeout(() => s.remove(), 1650);
    }, 150 + i * 650);
  }
}
// ── MILESTONES ───────────────────────────────────────────────────
// Confetti burst from the pear.
function pearConfetti() {
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  if (!wrap) return;
  const colors = ['#ff5aa5', '#ffd166', '#4de1c1', '#8BC34A', '#7EC8F2', '#c792ea'];
  for (let i = 0; i < 12; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.style.setProperty('--x', (Math.random() * 160 - 80).toFixed(0) + 'px');
    c.style.setProperty('--r', (Math.random() * 360).toFixed(0) + 'deg');
    c.style.setProperty('--d', (Math.random() * 0.25).toFixed(2) + 's');
    c.style.background = colors[i % colors.length];
    wrap.appendChild(c);
    setTimeout(() => c.remove(), 1250);
  }
}
// Celebrate clearing all expiring/expired items: party hat, confetti, a hop.
function pearCelebrate() {
  const el = document.getElementById('pearIcon');
  if (!el) return;
  el.classList.add('party');
  clearTimeout(el._partyT);
  el._partyT = setTimeout(() => el.classList.remove('party'), 2600);
  pearConfetti();
  pearReact('hop', 'pearFresh', '🎉', 700);
}
// Shed a tear when something newly rots.
function pearTear() {
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  pearReact('sad', null, null, 1000);
  if (!wrap) return;
  const t = document.createElement('span');
  t.className = 'pear-tear';
  t.textContent = '💧';
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 1300);
}
// Sunglasses moment at a savings milestone (every few items used up).
function pearCool() {
  const el = document.getElementById('pearIcon');
  if (!el) return;
  el.classList.add('cool');
  clearTimeout(el._coolT);
  el._coolT = setTimeout(() => el.classList.remove('cool'), 3200);
  pearReact('proud', 'pearUsed', '😎', 900);
}
// Quick spin when you restyle him (accent/background). Guarded so it never
// fires during the initial load, only on a real user change.
function pearSpin() {
  if (_ready) pearReact('spin', null, '✨', 700);
}
// Seasonal outfit picked from today's date: straw hat in summer, flower in
// spring, witch hat around Halloween, Santa hat in December.
function applySeason() {
  const el = document.getElementById('pearIcon');
  if (!el) return;
  el.classList.remove('season-summer', 'season-flower', 'season-spooky', 'season-santa');
  const d = new Date(), mo = d.getMonth(), day = d.getDate();
  let s = '';
  if (mo === 11) s = 'season-santa';                    // December
  else if (mo === 9 && day >= 24) s = 'season-spooky';  // Halloween week
  else if (mo >= 2 && mo <= 4) s = 'season-flower';     // spring: Mar–May
  else if (mo >= 5 && mo <= 7) s = 'season-summer';     // summer: Jun–Aug
  if (s) el.classList.add(s);
}
// A little bee buzzes around him now and then when he's content (or when he's
// wearing the spring flower — bees love it).
function flyBee(emoji) {
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  if (!wrap) return;
  const b = document.createElement('span');
  b.className = 'pear-bee';
  b.textContent = emoji || '🐝';
  wrap.appendChild(b);
  setTimeout(() => b.remove(), 3600);
}
// Sometimes the companion lands on his face — he giggles and gets tickled.
function landBug(emoji) {
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  if (!wrap) return;
  const b = document.createElement('span');
  b.className = 'pear-bee land';
  b.textContent = emoji || '🐝';
  wrap.appendChild(b);
  setTimeout(() => b.remove(), 4600);
  setTimeout(() => {                       // the moment it settles on his nose
    if (!el.classList.contains('napping')) {
      el.classList.add('blink');
      setTimeout(() => el.classList.remove('blink'), 200);
      if (!pearBusy()) { el.classList.add('wiggle'); setTimeout(() => el.classList.remove('wiggle'), 1200); }
      pearSpark('😆');
    }
  }, 2100);
}
function scheduleBee() {
  setTimeout(() => {
    const el = document.getElementById('pearIcon');
    const mo = new Date().getMonth();
    const winter = mo === 11 || mo === 0 || mo === 1;   // too cold for flyers
    const ok = el && document.visibilityState === 'visible' && !winter
      && (fridgeMood() === 'fresh' || el.classList.contains('season-flower'));
    if (ok && Math.random() < 0.6) {
      const springSummer = mo >= 2 && mo <= 7;
      const emoji = springSummer && Math.random() < 0.55 ? '🦋' : '🐝';   // butterflies in warm months
      if (Math.random() < 0.3) landBug(emoji); else flyBee(emoji);        // sometimes it lands
    }
    scheduleBee();
  }, 18000 + Math.random() * 22000);
}
// Day/night sky behind the pear, from the current hour.
function applySky() {
  const sky = document.getElementById('pearSky');
  if (!sky) return;
  const h = new Date().getHours();
  const mo = new Date().getMonth();
  // Four phases: night → dawn → day → dusk, each with its own sky colour.
  const phase = (h < 5 || h >= 21) ? 'night' : h < 8 ? 'dawn' : h < 18 ? 'day' : 'dusk';
  sky.className = 'pear-sky ' + phase;
  // Night means nightwear: the day hat comes off and the nightcap goes on.
  const pear = document.getElementById('pearIcon');
  if (pear) pear.classList.toggle('nightwear', phase === 'night');
  let html = '<span class="orb"></span>';
  if (phase === 'night') {
    const stars = [[20, 8], [42, 3], [8, 28], [128, 6], [146, 20], [104, 2], [64, 14]];
    html += stars.map(([x, y], i) => `<span class="star" style="left:${x}px;top:${y}px;animation-delay:${(i * 0.3).toFixed(1)}s"></span>`).join('');
    if (mo >= 5 && mo <= 7) {   // summer-night fireflies
      for (let i = 0; i < 6; i++) html += `<span class="firefly" style="left:${i * 24 + 14}px;top:${30 + (i * 13) % 40}px;animation-delay:${(i * 0.4).toFixed(1)}s"></span>`;
    }
  }
  if (mo === 11 || mo === 0 || mo === 1) {   // winter: gentle snow, day or night
    for (let i = 0; i < 9; i++) {
      html += `<span class="snow" style="left:${i * 17 + 6}px;animation-delay:${(i * 0.5).toFixed(1)}s;animation-duration:${(3.5 + Math.random() * 2).toFixed(1)}s"></span>`;
    }
  } else if (mo >= 8 && mo <= 10) {           // autumn: drifting leaves
    for (let i = 0; i < 7; i++) {
      html += `<span class="leaf" style="left:${i * 20 + 8}px;animation-delay:${(i * 0.6).toFixed(1)}s;animation-duration:${(4 + Math.random() * 2.5).toFixed(1)}s">🍂</span>`;
    }
  }
  sky.innerHTML = html;
}
// A rainbow arcs over him for a moment when the rain clears (mood recovers).
function showRainbow() {
  const wrap = document.querySelector('.pear-wrap');
  if (!wrap) return;
  const r = document.createElement('span');
  r.className = 'pear-rainbow';
  wrap.appendChild(r);
  setTimeout(() => r.remove(), 3000);
}
// On cold winter days a little puff of breath fogs up from his mouth.
function puffBreath() {
  const wrap = document.querySelector('.pear-wrap');
  if (!wrap) return;
  const p = document.createElement('span');
  p.className = 'pear-breath';
  wrap.appendChild(p);
  setTimeout(() => p.remove(), 1750);
}
// Hot summer afternoons: a bead of sweat rolls down while he fans himself with his leaf.
function fanLeaf() {
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  if (!wrap) return;
  const leaf = el.querySelector('.pear-leaf');
  if (leaf) {
    leaf.classList.add('fan');
    setTimeout(() => leaf.classList.remove('fan'), 2400);
  }
  const s = document.createElement('span');
  s.className = 'pear-sweat';
  wrap.appendChild(s);
  setTimeout(() => s.remove(), 2150);
}
// ...and now and then he treats himself to a little ice cream. Two happy bites.
function icePop() {
  const el = document.getElementById('pearIcon');
  const wrap = el && el.parentElement;
  if (!wrap || pearBusy()) return;
  const p = document.createElement('span');
  p.className = 'pear-icepop';
  p.textContent = '🍦';
  wrap.appendChild(p);
  const bite = () => {
    if (!document.body.contains(p)) return;
    el.classList.add('chomp');
    setTimeout(() => el.classList.remove('chomp'), 620);
  };
  setTimeout(bite, 450);
  setTimeout(bite, 1250);
  setTimeout(() => { p.classList.add('done'); pearSpark('❄️'); }, 1950);
  setTimeout(() => p.remove(), 2500);
}
// Rare shooting star (night only).
function shootingStar() {
  const wrap = document.querySelector('.pear-wrap');
  if (!wrap) return;
  const s = document.createElement('span');
  s.className = 'shooting-star';
  wrap.appendChild(s);
  setTimeout(() => s.remove(), 1100);
}
// A gloomy rain cloud follows him while something's rotten; clears otherwise.
function updateWeather(mood) {
  const w = document.getElementById('pearWeather');
  if (!w) return;
  if (mood === 'rotten') {
    if (w.dataset.mood === 'rotten') return;
    w.dataset.mood = 'rotten';
    w.className = 'pear-weather rain';
    w.innerHTML = '<span class="cloud"></span>' +
      [0, 1, 2, 3, 4, 5].map(i => `<span class="drop" style="left:${30 + i * 18}px;animation-delay:${(i * 0.22).toFixed(2)}s"></span>`).join('');
  } else {
    if (w.dataset.mood !== 'clear') {
      w.dataset.mood = 'clear';
      w.className = 'pear-weather';
      w.innerHTML = '';
    }
  }
}
// A fair-weather cloud drifts across on sunny days.
function driftCloud() {
  const wrap = document.querySelector('.pear-wrap');
  if (!wrap) return;
  const c = document.createElement('span');
  c.className = 'drift-cloud';
  c.textContent = '☁️';
  wrap.appendChild(c);
  setTimeout(() => c.remove(), 9000);
}
// New Year's Eve / Day: fireworks on open.
function maybeNewYear() {
  const d = new Date();
  if ((d.getMonth() === 11 && d.getDate() === 31) || (d.getMonth() === 0 && d.getDate() === 1)) {
    setTimeout(() => { pearConfetti(); pearReact('hop', 'pearDizzy', '🎆', 700); }, 900);
    setTimeout(pearConfetti, 1500);
  }
}
// Wave hello: play the arm-wave once (on app open and when it regains focus).
function waveHi() {
  const el = document.getElementById('pearIcon');
  if (!el) return;
  el.classList.remove('wave');
  void el.offsetWidth;
  el.classList.add('wave');
  setTimeout(() => el.classList.remove('wave'), 1800);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { pearWake(); applySky(); waveHi(); }
});
// Any tap anywhere counts as activity — wakes the pear from a nap.
document.addEventListener('pointerdown', () => pearWake(), { passive: true });
// Blink now and then (random 2.5–6.5s), occasionally a quick double-blink.
function scheduleBlink() {
  setTimeout(() => {
    const el = document.getElementById('pearIcon');
    if (el && document.visibilityState === 'visible') {
      el.classList.add('blink');
      setTimeout(() => el.classList.remove('blink'), 200);
      if (Math.random() < 0.25) setTimeout(() => {
        el.classList.add('blink');
        setTimeout(() => el.classList.remove('blink'), 200);
      }, 300);
    }
    scheduleBlink();
  }, 2500 + Math.random() * 4000);
}
// Yawn now and then, but only while the fridge is empty (nothing to track).
function scheduleYawn() {
  setTimeout(() => {
    const el = document.getElementById('pearIcon');
    if (el && document.visibilityState === 'visible' && state.products.length === 0) {
      el.classList.add('yawn');
      setTimeout(() => el.classList.remove('yawn'), 1950);
    }
    scheduleYawn();
  }, 7000 + Math.random() * 6000);
}
// Content wiggle now and then, but only when the fridge is stocked and all-fresh
// (and he isn't already mid-animation) — a little sign of life.
function scheduleIdle() {
  setTimeout(() => {
    const el = document.getElementById('pearIcon');
    if (el && !el.classList.contains('napping') && document.visibilityState === 'visible'
        && state.products.length && !pearBusy()) {
      if (Math.random() < 0.15) {                          // rare little sneeze (any mood)
        el.classList.add('sneeze'); setTimeout(() => el.classList.remove('sneeze'), 900);
      } else if (fridgeMood() === 'fresh') {               // all's well: hum a tune, or a content wiggle
        if (Math.random() < 0.35) pearHum();
        else { el.classList.add('wiggle'); setTimeout(() => el.classList.remove('wiggle'), 1200); }
      }
    }
    const sky = document.getElementById('pearSky');
    // Keep the sky (and his nightwear) current if the phase flipped while the app sat open.
    if (sky) {
      const h = new Date().getHours();
      const ph = (h < 5 || h >= 21) ? 'night' : h < 8 ? 'dawn' : h < 18 ? 'day' : 'dusk';
      if (!sky.classList.contains(ph)) applySky();
    }
    if (sky && sky.classList.contains('night') && document.visibilityState === 'visible' && Math.random() < 0.13) shootingStar();
    else if (sky && sky.classList.contains('day') && document.visibilityState === 'visible' && fridgeMood() !== 'rotten' && Math.random() < 0.12) driftCloud();
    // Winter chill: breath fogs up, and now and then he gives a little shiver.
    const mo = new Date().getMonth();
    if ((mo === 11 || mo === 0 || mo === 1) && el && document.visibilityState === 'visible' && !el.classList.contains('napping')) {
      if (Math.random() < 0.4) puffBreath();
      else if (!pearBusy() && Math.random() < 0.2) { el.classList.add('shiver'); setTimeout(() => el.classList.remove('shiver'), 700); }
    }
    // Summer heat: on hot afternoons he sweats and fans himself with his leaf,
    // and once in a while treats himself to an ice cream.
    if ((mo >= 5 && mo <= 7) && el && document.visibilityState === 'visible' && !el.classList.contains('napping')
        && sky && sky.classList.contains('day')) {
      if (!pearBusy() && Math.random() < 0.12) icePop();
      else if (!pearBusy() && Math.random() < 0.35) fanLeaf();
    }
    // Night: he's in his nightcap and getting sleepy — the odd yawn slips out.
    if (sky && sky.classList.contains('night') && el && document.visibilityState === 'visible'
        && !el.classList.contains('napping') && !pearBusy() && Math.random() < 0.22) {
      el.classList.add('yawn');
      setTimeout(() => el.classList.remove('yawn'), 1950);
    }
    // A clean fridge on a good day earns soap bubbles.
    if (el && !pearBusy() && document.visibilityState === 'visible' && state.products.length
        && !soonItems().length && fridgeMood() === 'fresh' && Math.random() < 0.1) blowBubbles();
    scheduleIdle();
  }, 9000 + Math.random() * 9000);
}

