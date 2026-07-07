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

  // ── add via modal, offline expiry estimate ──
  await page.evaluate(() => addProductManually());
  await page.fill('#pName', 'Milk');
  check('offline expiry estimate prefilled', /^\d{4}-\d{2}-\d{2}$/.test(await page.inputValue('#pDate')));
  await page.evaluate(() => saveProductManual());
  check('product added', await page.evaluate(() => state.products.length === 1));

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

  // ── live-freshness refresher runs without throwing ──
  check('live freshness refresh runs', await page.evaluate(() => { try { refreshLiveFreshness(); return true; } catch { return false; } }));

  console.log(results.join('\n'));
  const realErrors = errors.filter(e =>
    !/net::ERR_FAILED|Failed to load resource|ZXing|service-worker|The play\(\) request/i.test(e));
  console.log(realErrors.length ? 'JS ERRORS:\n' + realErrors.join('\n') : 'no unexpected JS errors');
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) || realErrors.length ? 1 : 0);
})();
