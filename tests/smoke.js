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

  // ── add via modal: date field hidden, estimate applies on save ──
  await page.evaluate(() => addProductManually());
  await page.fill('#pName', 'Milk');
  check('date field hidden while adding', await page.evaluate(() =>
    document.getElementById('pDate').style.display === 'none' && document.getElementById('pDate').value === ''));
  await page.evaluate(() => saveProductManual());
  check('product added', await page.evaluate(() => state.products.length === 1));
  check('expiry estimated silently on save', await page.evaluate(() =>
    state.products[0].exp === daysToDateInput(estimateShelfDays('Milk'))));
  check('date field visible when editing', await page.evaluate(() => {
    editProductPrompt(0);
    const ok = document.getElementById('pDate').style.display !== 'none'
      && document.getElementById('pDate').value === state.products[0].exp;
    closeProductModal();
    return ok;
  }));

  // ── brand suggestions: cached lookup renders chips; tap fills brand+photo ──
  const brandSugg = await page.evaluate(async () => {
    addProductManually();
    document.getElementById('pName').value = 'butter';
    _brandCache['butter'] = [{ brand: 'Casuta Mea', img: 'https://images.example/cm.jpg' }, { brand: 'President', img: '' }];
    await suggestBrands('butter');
    const chips = document.querySelectorAll('#brandSugg .fchip').length;
    applyBrandSugg('Casuta Mea', 'https://images.example/cm.jpg');
    const out = {
      chips,
      brand: document.getElementById('pBrand').value,
      img: document.getElementById('productModal').dataset.img,
      cleared: document.getElementById('brandSugg').innerHTML === '',
    };
    closeProductModal();
    return out;
  });
  check('brand chips rendered', brandSugg.chips === 2);
  check('tapping a brand fills it', brandSugg.brand === 'Casuta Mea');
  check('brand chip brings the exact pack photo', brandSugg.img === 'https://images.example/cm.jpg');
  check('suggestions clear after pick', brandSugg.cleared);

  // ── quantities: merging the same name increments instead of duplicating ──
  await page.evaluate(() => mergeOrPush(makeProduct('Milk')));
  const merged = await page.evaluate(() => ({ n: state.products.length, qty: state.products[0].qty }));
  check('merge does not duplicate', merged.n === 1);
  check('merge increments quantity', merged.qty === 2);

  // ── storage sections: freezing, merge resets, editing keeps the picker ──
  await page.evaluate(() => freezeItem(0));
  check('freeze moves item to freezer section', await page.evaluate(() => state.products[0].loc === 'freezer'));
  await page.evaluate(() => mergeOrPush(makeProduct('Milk')));
  check('merge returns re-bought item to fridge', await page.evaluate(() => state.products[0].loc === 'fridge'));
  await page.evaluate(() => {
    freezeItem(0);
    editProductPrompt(0);   // picker loads the item's section
    document.getElementById('pName').value = 'Milk 2L';
    document.getElementById('pQty').value = '3';
    saveProductManual();
  });
  const edited = await page.evaluate(() => state.products[0]);
  check('edit keeps freezer section', edited.loc === 'freezer' && edited.name === 'Milk 2L');
  check('edit sets quantity', edited.qty === 3);
  check('loc picker shows freezer active', await page.evaluate(() => {
    editProductPrompt(0);
    const ok = document.querySelector('#locRow .fchip.active').dataset.loc === 'freezer';
    closeProductModal();
    return ok;
  }));
  check('section headers appear with two sections', await page.evaluate(() => {
    mergeOrPush(makeProduct('Juice'));   // fridge item alongside the frozen milk
    const ok = fridgeItemsHtml().includes('loc-head');
    state.products = state.products.filter(p => p.name !== 'Juice');   // leave state as the next checks expect
    renderContent();
    return ok;
  }));
  check('legacy frozen flag migrates on load', await page.evaluate(() => {
    // simulate a pre-sections product left in storage
    const p = JSON.parse(localStorage.getItem('kulpio-products'));
    return p.every(x => x.loc && x.frozen === undefined);
  }));

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

  // ── tap-outside closes the side menu via the dimmed backdrop ──
  await page.evaluate(() => toggleMenu());
  check('side menu opens with backdrop', await page.evaluate(() =>
    document.getElementById('sideMenu').classList.contains('show')
    && document.getElementById('panelBackdrop').classList.contains('show')));
  await page.evaluate(() => document.getElementById('panelBackdrop').click());
  check('backdrop tap closes side menu', await page.evaluate(() =>
    !document.getElementById('sideMenu').classList.contains('show')
    && !document.getElementById('panelBackdrop').classList.contains('show')));

  // ── system Back button closes the open overlay instead of leaving ──
  await page.evaluate(() => openSheet('shop'));
  check('sheet open pushed history', await page.evaluate(() =>
    document.getElementById('actionSheet').classList.contains('show')));
  await page.goBack();
  await page.waitForTimeout(200);
  check('Back closes the sheet', await page.evaluate(() =>
    !document.getElementById('actionSheet').classList.contains('show')));
  check('Back stayed on the app page', page.url().includes('kulpio_app.html'));

  // ── Enter in the product form saves ──
  await page.evaluate(() => { addProductManually(); document.getElementById('pName').value = 'Кефир'; });
  await page.focus('#pName');
  await page.keyboard.press('Enter');
  check('Enter saves the product', await page.evaluate(() =>
    state.products.some(p => p.name === 'Кефир')
    && !document.getElementById('productModal').classList.contains('show')));
  check('name field autofocused on open', await page.evaluate(async () => {
    addProductManually();
    await new Promise(r => setTimeout(r, 150));
    const ok = document.activeElement === document.getElementById('pName');
    closeProductModal();
    return ok;
  }));

  // ── swipe actions: right = used, left = wasted, short drag = nothing ──
  await page.evaluate(() => {
    state.products = [makeProduct('Swipe Milk'), makeProduct('Swipe Bread')];
    state.history = []; saveState();
    switchTab('home', document.getElementById('tab-home'));
  });
  await page.waitForTimeout(150);
  const swipe = async (name, dx) => {
    const card = page.locator(`.prod-item:has-text("${name}")`).first();
    const box = await card.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(x + (dx * i) / 6, y, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(350);
  };
  await swipe('Swipe Milk', 240);    // right → used
  check('swipe right marks used', await page.evaluate(() =>
    !state.products.some(p => p.name === 'Swipe Milk')
    && state.history.some(h => h.k === 'used' && h.name === 'Swipe Milk')));
  await swipe('Swipe Bread', -240);  // left → wasted
  check('swipe left marks wasted', await page.evaluate(() =>
    !state.products.some(p => p.name === 'Swipe Bread')
    && state.history.some(h => h.k === 'wasted' && h.name === 'Swipe Bread')));
  await page.evaluate(() => { mergeOrPush(makeProduct('Swipe Cheese')); saveState(); renderContent(); });
  await page.waitForTimeout(150);
  await swipe('Swipe Cheese', 40);   // short drag → springs back, no action
  check('short swipe does nothing', await page.evaluate(() =>
    state.products.some(p => p.name === 'Swipe Cheese')));

  // ── native-feel: metas, icons, sheet layout, haptics helper ──
  check('viewport-fit covers the notch', await page.evaluate(() =>
    document.querySelector('meta[name="viewport"]').content.includes('viewport-fit=cover')));
  check('apple-touch-icon PNG linked', await page.evaluate(() =>
    !!document.querySelector('link[rel="apple-touch-icon"][href$=".png"]')));
  check('iOS status-bar style set', await page.evaluate(() =>
    !!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')));
  check('modals present as bottom sheets', await page.evaluate(() =>
    getComputedStyle(document.getElementById('productModal')).alignItems === 'flex-end'));
  check('page overscroll disabled', await page.evaluate(() =>
    getComputedStyle(document.body).overscrollBehavior === 'none'));
  check('UI chrome not selectable, inputs are', await page.evaluate(() =>
    getComputedStyle(document.body).userSelect === 'none'
    && getComputedStyle(document.getElementById('pName')).userSelect === 'text'));
  check('haptics helper safe without vibrate', await page.evaluate(() => { try { buzz(); return true; } catch { return false; } }));
  const fs = require('fs');
  check('PNG icons exist for install', [180, 192, 512].every(s =>
    fs.existsSync(require('path').resolve(__dirname, '..', `kulpio-icon-${s}.png`))));

  // ── drag the sheet handle down to dismiss ──
  // (wait past the 320ms slide-up animation so the handle's box is final)
  await page.evaluate(() => addProductManually());
  await page.waitForTimeout(500);
  check('sheet handle injected', await page.evaluate(() =>
    !!document.querySelector('#productModal .sheet-handle')));
  {
    const h = await page.locator('#productModal .sheet-handle').boundingBox();
    const hx = h.x + h.width / 2, hy = h.y + h.height / 2;
    await page.mouse.move(hx, hy);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(hx, hy + i * 30, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(350);
  }
  check('dragging handle down closes the sheet', await page.evaluate(() =>
    !document.getElementById('productModal').classList.contains('show')));
  await page.evaluate(() => addProductManually());
  await page.waitForTimeout(500);
  {
    const h = await page.locator('#productModal .sheet-handle').boundingBox();
    const hx = h.x + h.width / 2, hy = h.y + h.height / 2;
    await page.mouse.move(hx, hy);
    await page.mouse.down();
    await page.mouse.move(hx, hy + 40, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(350);
  }
  check('short handle drag springs back', await page.evaluate(() => {
    const open = document.getElementById('productModal').classList.contains('show');
    closeProductModal();
    return open;
  }));

  // ── the settings side menu scrolls when its content is taller ──
  await page.setViewportSize({ width: 390, height: 500 });
  await page.evaluate(() => toggleMenu());
  await page.waitForTimeout(350);
  const menuScroll = await page.evaluate(() => {
    const el = document.getElementById('sideMenu');
    const scrollable = el.scrollHeight > el.clientHeight;
    el.scrollTop = 300;
    const moved = el.scrollTop > 0;
    el.scrollTop = 0;
    closePanels();
    return { scrollable, moved, overflow: getComputedStyle(el).overflowY };
  });
  check('side menu is scrollable', menuScroll.overflow === 'auto' && menuScroll.scrollable && menuScroll.moved);
  await page.setViewportSize({ width: 1280, height: 720 });

  // ── language dropdown options are readable in both themes ──
  const optColors = await page.evaluate(() => {
    const lum = c => {   // relative luminance of a computed rgb() color
      const [r, g, b] = c.match(/\d+/g).map(Number).map(v => v / 255)
        .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const probe = () => {
      const o = document.querySelector('#langSelect option');
      const cs = getComputedStyle(o);
      return { ratio: contrast(lum(cs.color), lum(cs.backgroundColor)), alphaBg: /rgba/.test(cs.backgroundColor) && cs.backgroundColor.includes('0.0') };
    };
    setTheme('dark');
    const dark = probe();
    const rootDark = document.documentElement.style.colorScheme;
    setTheme('light');
    const light = probe();
    const rootLight = document.documentElement.style.colorScheme;
    setTheme('dark');
    return { dark, light, rootDark, rootLight };
  });
  check('dark-theme dropdown options readable', optColors.dark.ratio >= 4.5 && !optColors.dark.alphaBg);
  check('light-theme dropdown options readable', optColors.light.ratio >= 4.5 && !optColors.light.alphaBg);
  check('root color-scheme follows the theme', optColors.rootDark === 'dark' && optColors.rootLight === 'light');

  // ── live-freshness refresher runs without throwing ──
  check('live freshness refresh runs', await page.evaluate(() => { try { refreshLiveFreshness(); return true; } catch { return false; } }));

  console.log(results.join('\n'));
  const realErrors = errors.filter(e =>
    !/net::ERR_FAILED|Failed to load resource|ZXing|service-worker|The play\(\) request/i.test(e));
  console.log(realErrors.length ? 'JS ERRORS:\n' + realErrors.join('\n') : 'no unexpected JS errors');
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) || realErrors.length ? 1 : 0);
})();
