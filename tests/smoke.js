/*
 * Kulpio headless smoke test.
 *
 * Loads kulpio_app.html in Chromium with all network access blocked (the app
 * must work fully offline) and exercises the core flows: adding, merging,
 * freezing, editing, quantities, undo, history and the shopping loop.
 *
 * Run:  npm test
 * A custom browser binary can be pointed to with CHROME_PATH.
 */
const path = require('path');
const { chromium } = (() => {
  try { return require('playwright'); } catch { return require('playwright-core'); }
})();

const APP = 'file://' + path.resolve(__dirname, '..', 'kulpio_app.html');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route(/^https?:\/\//, r => r.abort());   // deterministic: no network

  await page.goto(APP);
  await page.waitForTimeout(1200);

  const results = [];
  const check = (name, ok) => results.push((ok ? 'PASS' : 'FAIL') + '  ' + name);

  // ── boot ──
  check('app renders tagline', (await page.locator('#tagline').textContent()) !== '');

  // ── add via modal: date field stays empty, estimate applies on save ──
  await page.evaluate(() => addProductManually());
  await page.fill('#pName', 'Milk');
  check('date field NOT prefilled while adding', (await page.inputValue('#pDate')) === '');
  await page.evaluate(() => saveProductManual());
  check('product added', await page.evaluate(() => state.products.length === 1));
  check('expiry estimated silently on save', await page.evaluate(() =>
    state.products[0].exp === daysToDateInput(estimateShelfDays('Milk'))));

  // ── quantities: merging the same name increments instead of duplicating ──
  await page.evaluate(() => mergeOrPush(makeProduct('Milk')));
  const merged = await page.evaluate(() => ({ n: state.products.length, qty: state.products[0].qty }));
  check('merge does not duplicate', merged.n === 1);
  check('merge increments quantity', merged.qty === 2);

  // ── frozen flag: freezing, merge clears it, editing keeps it ──
  await page.evaluate(() => freezeItem(0));
  check('item frozen', await page.evaluate(() => state.products[0].frozen === true));
  await page.evaluate(() => mergeOrPush(makeProduct('Milk')));
  check('merge clears frozen flag', await page.evaluate(() => !state.products[0].frozen));
  await page.evaluate(() => {
    freezeItem(0);
    document.getElementById('productModal').dataset.editIdx = '0';
    document.getElementById('pName').value = 'Milk 2L';
    document.getElementById('pDate').value = state.products[0].exp;
    document.getElementById('pQty').value = '3';
    saveProductManual();
  });
  const edited = await page.evaluate(() => state.products[0]);
  check('edit keeps frozen flag', edited.frozen === true && edited.name === 'Milk 2L');
  check('edit sets quantity', edited.qty === 3);

  // ── used: decrements one unit, logs history, credits savings ──
  await page.evaluate(() => { state.products[0].price = 2.5; markUsed(0); });
  const afterUse = await page.evaluate(() => ({
    qty: state.products[0].qty, n: state.products.length,
    saved: state.saved, hist: state.history.length,
    histKind: state.history[state.history.length - 1].k,
  }));
  check('used consumes one unit', afterUse.n === 1 && afterUse.qty === 2);
  check('used credits money saved', afterUse.saved === 2.5);
  check('used logged to history', afterUse.hist === 1 && afterUse.histKind === 'used');

  // ── undo restores the exact prior state ──
  await page.evaluate(() => undoLast());
  const undone = await page.evaluate(() => ({
    qty: state.products[0].qty, saved: state.saved, hist: state.history.length,
  }));
  check('undo restores quantity, money and history', undone.qty === 3 && undone.saved === 0 && undone.hist === 0);

  // ── wasted: buy-again puts the item on the shopping list ──
  await page.evaluate(() => markWasted(0));
  check('wasted logged to history', await page.evaluate(() => state.history.length === 1 && state.history[0].k === 'wasted'));
  check('undo toast visible', await page.evaluate(() => document.getElementById('undoToast').classList.contains('show')));
  await page.evaluate(() => undoBuyAgain());
  const shop = await page.evaluate(() => state.shopping.map(s => s.name));
  check('buy-again adds to shopping list', shop.length === 1 && shop[0] === 'Milk 2L');
  await page.evaluate(() => addShopItemByName('Milk 2L'));
  check('shopping list dedupes by name', await page.evaluate(() => state.shopping.length === 1));

  // ── delete: undo brings the card back ──
  const before = await page.evaluate(() => state.products.length);
  await page.evaluate(() => removeProduct(0));
  check('delete removes the card', await page.evaluate(() => state.products.length) === before - 1);
  await page.evaluate(() => undoLast());
  check('undo restores deleted card', await page.evaluate(() => state.products.length) === before);

  // ── monthly history aggregates the log ──
  const hist = await page.evaluate(() => monthlyHistory());
  check('monthly history has current month', hist.length >= 1 && hist[0].used + hist[0].wasted >= 1);

  // ── suggested recipe item merges instead of duplicating ──
  await page.evaluate(() => addSuggestedItem(btoa(encodeURIComponent('Milk 2L'))));
  check('suggested item merges, no duplicate', await page.evaluate(() => state.products.filter(p => p.name === 'Milk 2L').length === 1));

  // ── persistence round-trip ──
  await page.evaluate(() => saveState());
  await page.reload();
  await page.waitForTimeout(900);
  check('state survives reload', await page.evaluate(() =>
    state.products.length >= 1 && state.history.length === 1 && state.shopping.length === 1));

  // ── nutrition (БЖУ): offline estimate from the ingredient dictionary ──
  const nutri = await page.evaluate(() => estimateRecipeNutrition({
    ingredients: [{ name: 'Eggs' }, { name: 'Milk' }, { name: 'Flour' }],
  }));
  check('recipe nutrition estimated offline', !!nutri && nutri.kcal > 0 && nutri.protein > 0 && nutri.carbs > 0);
  check('nutrition works with localized names', await page.evaluate(() =>
    !!estimateRecipeNutrition({ used: ['молоко', 'яйца'], missing: [] })));
  check('nutrition null when nothing matches', await page.evaluate(() =>
    estimateRecipeNutrition({ used: ['mystery item'], missing: [] }) === null));

  // ── product photos: barcode/edit photo travels through the modal ──
  await page.evaluate(() => {
    addProductManually();
    document.getElementById('pName').value = 'Casuta Mea unt';
    document.getElementById('productModal').dataset.img = 'https://images.example/butter.jpg';
    saveProductManual();
  });
  const withImg = await page.evaluate(() => state.products.find(p => p.name === 'Casuta Mea unt'));
  check('pack photo saved on product', withImg && withImg.img === 'https://images.example/butter.jpg');
  await page.evaluate(() => mergeOrPush(makeProduct('Casuta Mea unt')));
  check('merge keeps pack photo', await page.evaluate(() =>
    state.products.find(p => p.name === 'Casuta Mea unt').img === 'https://images.example/butter.jpg'));
  // Check the generated markup, not the live DOM: with the network blocked
  // the <img> onerror handler removes itself, which is the intended fallback.
  check('card renders photo thumbnail', await page.evaluate(() => fridgeItemsHtml().includes('class="pimg"')));

  // ── brand: saved from the modal, shown on the card, kept on merge ──
  await page.evaluate(() => {
    addProductManually();
    document.getElementById('pName').value = 'Unt';
    document.getElementById('pBrand').value = 'Casuta Mea';
    saveProductManual();
  });
  const branded = await page.evaluate(() => state.products.find(p => p.name === 'Unt'));
  check('brand saved on product', branded && branded.brand === 'Casuta Mea');
  check('brand shown on card', await page.evaluate(() => fridgeItemsHtml().includes('Casuta Mea')));
  await page.evaluate(() => mergeOrPush(makeProduct('Unt')));
  check('merge keeps brand', await page.evaluate(() => state.products.find(p => p.name === 'Unt').brand === 'Casuta Mea'));

  // ── brand-aware photo search: cached "brand + name" hit applies offline ──
  check('brand+name image cache applies', await page.evaluate(async () => {
    _imgCache['casuta mea unt'] = 'https://images.example/unt.jpg';
    await fetchProductImage('Unt', 'Casuta Mea');
    return state.products.find(p => p.name === 'Unt').img === 'https://images.example/unt.jpg';
  }));

  // ── one-button filter/sort menu ──
  await page.evaluate(() => { switchTab('home', document.getElementById('tab-home')); });
  await page.waitForTimeout(200);
  check('filter button rendered', await page.evaluate(() => !!document.getElementById('filterBtn')));
  await page.evaluate(() => toggleFilterMenu());
  check('filter menu opens', await page.evaluate(() => document.getElementById('filterMenu').classList.contains('show')));
  const filtered = await page.evaluate(() => {
    state.products[0].cls = 'br';   // force one non-fresh item
    setFridgeFilter('fresh');
    const shownFresh = document.querySelectorAll('#fridgeItems .prod-item').length;
    setFridgeFilter('all');
    const shownAll = document.querySelectorAll('#fridgeItems .prod-item').length;
    return { shownFresh, shownAll, label: document.getElementById('filterBtn').textContent };
  });
  check('fresh filter narrows the list', filtered.shownFresh < filtered.shownAll);
  check('button label reflects active filter', filtered.label.length > 1);

  // ── web image-search fallback applies a cached proxy result ──
  check('web image fallback applies', await page.evaluate(async () => {
    localStorage.setItem('kulpio-ai-url', 'https://proxy.example/');
    mergeOrPush(makeProduct('Plăcintă de casă'));
    // OFF chain exhausted (cached misses) → cached web result must be used.
    _imgCache['plăcintă de casă'] = '';
    _imgCache['web:plăcintă de casă'] = 'https://images.example/placinta.jpg';
    await fetchProductImage('Plăcintă de casă');
    localStorage.removeItem('kulpio-ai-url');
    return state.products.find(p => p.name === 'Plăcintă de casă').img === 'https://images.example/placinta.jpg';
  }));

  // ── user's own photo: file → thumbnail → product card (fully offline) ──
  const ownPhoto = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 300; c.height = 200;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e8b23a'; ctx.fillRect(0, 0, 300, 200);
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.8));
    const file = new File([blob], 'butter.jpg', { type: 'image/jpeg' });
    const thumb = await fileToThumb(file);
    addProductManually();
    document.getElementById('pName').value = 'Unt de casă';
    document.getElementById('productModal').dataset.img = thumb;
    updatePhotoPreview();
    const previewShown = !!document.querySelector('#pPhotoBtn img');
    saveProductManual();
    const p = state.products.find(x => x.name === 'Unt de casă');
    return { previewShown, isDataUri: !!p && /^data:image\/jpeg/.test(p.img), thumbSize: thumb.length };
  });
  check('photo preview shows in modal', ownPhoto.previewShown);
  check('own photo saved as card thumbnail', ownPhoto.isDataUri);
  check('thumbnail is small enough for storage', ownPhoto.thumbSize < 30000);
  check('own photo survives reload', await page.evaluate(async () => {
    saveState();
    return JSON.parse(localStorage.getItem('kulpio-products')).some(p => p.name === 'Unt de casă' && /^data:image/.test(p.img || ''));
  }));

  // ── live-freshness refresher runs without throwing ──
  check('live freshness refresh runs', await page.evaluate(() => { try { refreshLiveFreshness(); return true; } catch { return false; } }));

  console.log(results.join('\n'));
  const realErrors = errors.filter(e =>
    !/net::ERR_FAILED|Failed to load resource|ZXing|service-worker|The play\(\) request/i.test(e));
  console.log(realErrors.length ? 'JS ERRORS:\n' + realErrors.join('\n') : 'no unexpected JS errors');
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) || realErrors.length ? 1 : 0);
})();
