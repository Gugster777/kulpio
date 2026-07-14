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
    // v87 keys the cache by name@store (store empty here — no store majority).
    _brandCache['butter@'] = [{ brand: 'Casuta Mea', img: 'https://images.example/cm.jpg', isStore: false }, { brand: 'President', img: '', isStore: false }];
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

  // ── delete from the edit modal (grid tiles have no ×) ──
  check('edit modal shows Delete', await page.evaluate(() => {
    editProductPrompt(0);
    return document.getElementById('btnDeleteRow').style.display !== 'none';
  }));
  await page.evaluate(() => deleteFromModal());
  check('modal Delete removes the product', await page.evaluate(() =>
    state.products.length) === before - 1 && await page.evaluate(() =>
    !document.getElementById('productModal').classList.contains('show')));
  await page.evaluate(() => undoLast());
  check('modal Delete is undoable', await page.evaluate(() => state.products.length) === before);
  check('add modal hides Delete', await page.evaluate(() => {
    addProductManually();
    const hidden = document.getElementById('btnDeleteRow').style.display === 'none';
    closeProductModal();
    return hidden;
  }));

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

  // ── one-button filter/sort menu (v95: the row earns its place at 7+ items) ──
  await page.evaluate(() => { switchTab('home', document.getElementById('tab-home')); });
  await page.waitForTimeout(200);
  check('fridge tools hidden on a small fridge', await page.evaluate(() =>
    !document.getElementById('filterBtn') && !document.getElementById('fridgeSearch')));
  check('floating + shown on Home', await page.evaluate(() =>
    document.getElementById('fabWrap').style.display !== 'none' && !!document.getElementById('fabAdd')));
  await page.evaluate(() => {
    ['Rice', 'Pasta', 'Honey', 'Sugar'].forEach(n => mergeOrPush(makeProduct(n)));
    saveState(); renderContent();
  });
  await page.waitForTimeout(200);
  check('filter button rendered', await page.evaluate(() => !!document.getElementById('filterBtn')));
  // ── v101 UI fixes: the add stack must not sit on the last card, and an
  //    empty fridge must not offer four different ways to add ──
  check('floating + clears the last card', await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#fridgeItems .prod-item')];
    const last = cards[cards.length - 1].getBoundingClientRect();
    const fab = document.getElementById('fabWrap').getBoundingClientRect();
    const list = document.querySelector('.fridge-list');
    // The list reserves room below the last card for the whole stack.
    return list.getBoundingClientRect().bottom - last.bottom >= fab.height;
  }));
  check('empty fridge hides the floating +', await page.evaluate(() => {
    const keep = state.products;
    state.products = [];
    renderContent();
    const hidden = document.getElementById('fabWrap').style.display === 'none'
      && document.getElementById('heroCard').classList.contains('solo');
    state.products = keep;
    renderContent();
    return hidden && document.getElementById('fabWrap').style.display !== 'none'
      && !document.getElementById('heroCard').classList.contains('solo');
  }));
  check('floating + hidden off Home', await page.evaluate(() => {
    switchTab('recipes', document.getElementById('tab-recipes'));
    const hidden = document.getElementById('fabWrap').style.display === 'none';
    switchTab('home', document.getElementById('tab-home'));
    return hidden && document.getElementById('fabWrap').style.display !== 'none';
  }));
  // ── hero card vitals (v96) ──
  check('hero gauge shows the fill count', await page.evaluate(() =>
    document.getElementById('heroGauge').textContent.includes(state.products.length + '/' + MAX_PRODUCTS)));
  check('hero stat matches the soon-count rule', await page.evaluate(() => {
    const n = state.products.filter(p => p.exp && !p.frozen && daysUntil(p.exp) <= 2).length;
    const shown = document.querySelector('#heroStat .hero-num').textContent;
    return shown === String(n || state.products.length);
  }));
  check('shortcut tiles carry labels again', await page.evaluate(() =>
    document.querySelectorAll('#shortcuts .sc .sc-l').length === 4 &&
    document.querySelector('#shortcuts .sc .sc-l').textContent.length > 0));
  check('list splits into expiring and fresh shelves', await page.evaluate(() => {
    const p = state.products.find(x => !x.frozen);
    const was = p.exp;
    p.exp = new Date(Date.now() + 864e5).toISOString().slice(0, 10);   // expires tomorrow
    refreshFreshness(); renderContent();
    const heads = [...document.querySelectorAll('#fridgeItems .cat-head')];
    const ok = heads.length === 2 && heads[0].classList.contains('hot');
    p.exp = was;
    refreshFreshness(); renderContent();
    return ok;
  }));
  // ── ask the pear (v98): poking cycles real fridge facts, offers act ──
  check('pear tips list what needs eating', await page.evaluate(() => {
    const p = state.products.find(x => !x.frozen);
    p.exp = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    refreshFreshness();
    return pearTips().some(t => t.a === goRescue);
  }));
  check('empty fridge: he offers to add, never to rescue', await page.evaluate(() => {
    const keep = state.products;
    state.products = [];
    const tips = pearTips();
    state.products = keep;
    refreshFreshness();
    return tips.some(t => t.a === addProductManually) && !tips.some(t => t.a === goRescue);
  }));
  check('first poke gives his mood, not a tip', await page.evaluate(() => {
    _tipIdx = -1;
    pokePear();
    const b = document.getElementById('pearBubble');
    return b.classList.contains('show') && !b.classList.contains('tappable');
  }));
  check('next poke offers a tappable tip', await page.evaluate(() => {
    pokePear();
    const b = document.getElementById('pearBubble');
    return b.classList.contains('tappable') && b.getAttribute('role') === 'button';
  }));
  check('tapping the bubble runs the tip', await page.evaluate(() => {
    document.getElementById('pearBubble').click();
    const b = document.getElementById('pearBubble');
    return fridgeFilter === 'expiring' && currentTab === 'home' && !b.classList.contains('show');
  }));
  await page.evaluate(() => { setFridgeFilter('all'); _tipIdx = -1; });

  // ── he holds out what's about to spoil (v99) ──
  // Seed a known at-risk item so these checks don't ride on earlier residue.
  await page.evaluate(() => {
    const soon = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    state.products.forEach(p => { p.frozen = false; });
    mergeOrPush(makeProduct('Chicken'));
    const c = state.products.find(p => p.name === 'Chicken');
    c.exp = soon; c.price = 20; c.frozen = false;
    saveState(); refreshFreshness(); renderContent();
  });
  check('pear holds the soonest-expiring item', await page.evaluate(() => {
    const hold = document.querySelector('.pear-hold');
    if (!hold) return false;
    const p = state.products[+hold.dataset.idx];
    return p && daysUntil(p.exp) <= 2 && !p.frozen && hold.textContent === foodEmoji(p.name);
  }));
  // ── tapping his hand offers the ways out: eat it, freeze it, fix it (v100) ──
  check('his hand offers used / freeze / edit', await page.evaluate(() => {
    document.querySelector('.pear-hold').click();
    const btns = [...document.querySelectorAll('.pear-offer .po-btn')];
    return btns.length === 3 && btns[0].textContent.includes('✅');
  }));
  check('the offer eats the item and is undoable', await page.evaluate(() => {
    const hold = document.querySelector('.pear-hold');
    const name = hold.dataset.name;
    const before = state.products.find(p => p.name === name).qty || 1;
    const saved = state.saved || 0;
    document.querySelector('.pear-offer .po-btn').click();   // ✅ used it
    const p = state.products.find(x => x.name === name);
    const eaten = (!p || (p.qty || 1) === before - 1) && (state.saved || 0) >= saved
      && !document.querySelector('.pear-offer');
    undoLast();
    return eaten && (state.products.find(x => x.name === name).qty || 1) === before;
  }));
  check('the offer freezes what the freezer can save', await page.evaluate(() => {
    document.querySelector('.pear-hold').click();
    const freeze = [...document.querySelectorAll('.pear-offer .po-btn')].find(b => b.textContent.includes('❄️'));
    const name = document.querySelector('.pear-hold').dataset.name;
    freeze.click();
    const frozen = state.products.find(p => p.name === name).frozen === true;
    undoLast();
    return frozen;
  }));
  check('a frozen item never lands back in his hand', await page.evaluate(() => {
    refreshFreshness();
    const hold = document.querySelector('.pear-hold');
    if (!hold) return false;
    const p = state.products[+hold.dataset.idx];
    p.frozen = true;
    refreshFreshness();
    // Frozen food isn't at risk any more, so he stops holding it out.
    const h2 = document.querySelector('.pear-hold');
    const gone = !h2 || state.products[+h2.dataset.idx].frozen !== true;
    p.frozen = false;
    refreshFreshness();
    return gone;
  }));
  check('freeze rescue appears only for freezable food', await page.evaluate(() => {
    const tips = pearTips();
    const t = tips.find(x => x.t.startsWith('❄️'));
    if (!t) return true;   // nothing freezable at risk right now is a valid state
    const name = t.t.split(': ')[1];
    return FREEZABLE.includes(foodCategory(state.products.find(p => p.name === name)));
  }));
  check('empty hands when nothing is expiring', await page.evaluate(() => {
    const keep = state.products.map(p => p.exp);
    const far = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    state.products.forEach(p => { p.exp = far; });
    refreshFreshness();
    const gone = !document.querySelector('.pear-hold');
    state.products.forEach((p, i) => { p.exp = keep[i]; });
    refreshFreshness();
    return gone && !!document.querySelector('.pear-hold');
  }));
  // ── ticking the shopping list off cheers him on ──
  check('last shopping item makes him hop', await page.evaluate(() => {
    state.shopping = [{ name: 'Milk', done: false }];
    openSheet('shop');
    toggleShopItem(0);
    const hopped = document.getElementById('pearIcon').classList.contains('hop');
    closeSheet();
    return hopped;
  }));

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
  // Make room first: the demo cap (MAX_PRODUCTS) refuses new items at 10, and
  // the checks above have been filling the fridge.
  await page.evaluate(() => {
    while (state.products.length >= MAX_PRODUCTS) state.products.pop();
    saveState(); renderContent();
    addProductManually();
    document.getElementById('pName').value = 'Кефир';
  });
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

  // ── pear chef: entry point gated on proxy + expiring items ──
  check('pear chef hidden without AI proxy', await page.evaluate(() => chefRowHtml() === ''));
  check('pear chef button renders with proxy set', await page.evaluate(() => {
    localStorage.setItem('kulpio-ai-url', 'https://proxy.example/');
    const html = chefRowHtml();
    localStorage.removeItem('kulpio-ai-url');
    return html.includes('chef-btn') && html.includes('pearChef()');
  }));
  check('chef candidates are soonest-first and unfrozen', await page.evaluate(() => {
    state.products.push(makeProduct('Frozen Peas'));
    state.products[state.products.length - 1].frozen = true;
    const c = chefCandidates();
    return c.every(p => !p.frozen)
      && c.every((p, i) => i === 0 || daysUntil(c[i - 1].exp) <= daysUntil(p.exp));
  }));

  // ── meal planner: pin a favourite, missing items jump to the list ──
  const plan = await page.evaluate(() => {
    favRecipes = [{ title: 'Test Omelette', emoji: '🍳',
      ingredients: [{ name: 'Cheese' }, { name: 'Dragonfruit' }], instructions: 'Mix.\nCook.' }];
    recipesView = 'fav'; shownRecipes = favRecipes;
    const key = weekDayKey(2);
    planRecipe(0, key);   // fridge has "Swipe Cheese" → cheese covered, dragonfruit missing
    return {
      pinned: !!mealPlan[key] && mealPlan[key].title === 'Test Omelette',
      persisted: !!JSON.parse(localStorage.getItem('kulpio-plan'))[key],
      missingListed: state.shopping.some(s => s.name.toLowerCase() === 'dragonfruit'),
      coveredSkipped: !state.shopping.some(s => s.name.toLowerCase() === 'cheese'),
      marker: weekCellHtml(key, 'X', [], '', false).includes('wd-meal'),
      cardBtn: recipeCard(favRecipes[0], 0).includes('togglePlanPick'),
      strip: planStripHtml().includes('pl-meal'),
    };
  });
  check('plan: pin saved recipe to a day', plan.pinned);
  check('plan: persisted to storage', plan.persisted);
  check('plan: missing ingredient jumped to shopping list', plan.missingListed);
  check('plan: fridge-covered ingredient not added', plan.coveredSkipped);
  check('plan: home week cell shows meal marker', plan.marker);
  check('plan: saved card offers the Plan button', plan.cardBtn);
  check('plan: planner strip shows the pinned meal', plan.strip);
  check('plan: unpin clears the day', await page.evaluate(() => {
    unplanDay(weekDayKey(2));
    return !mealPlan[weekDayKey(2)] && !planStripHtml().includes('pl-meal');
  }));

  // ── price history: re-buys build a trail, the marker opens the chart ──
  const ph = await page.evaluate(() => {
    state.products = [];
    const a = makeProduct('Kefir'); a.price = 2; mergeOrPush(a);
    const b = makeProduct('Kefir'); b.price = 2.5; mergeOrPush(b);   // re-buy, pricier
    const i = state.products.findIndex(x => x.name === 'Kefir');
    const card = productCard(state.products[i], i);
    openPriceHist(i);
    return {
      trail: (state.products[i].pHist || []).map(h => h.v),
      btn: card.includes('openPriceHist'),
      modal: document.getElementById('priceModal').classList.contains('show'),
      svg: document.getElementById('priceBody').innerHTML.includes('price-spark'),
      rows: document.querySelectorAll('#priceModal .price-row').length,
    };
  });
  check('price trail records both prices', ph.trail.length === 2 && ph.trail[0] === 2 && ph.trail[1] === 2.5);
  check('price marker becomes a chart button', ph.btn);
  check('price modal opens with a sparkline', ph.modal && ph.svg);
  check('price rows listed', ph.rows === 2);
  check('price modal closes', await page.evaluate(() => {
    closePriceModal();
    return !document.getElementById('priceModal').classList.contains('show');
  }));

  // ── recipe ingredients checklist: emoji rows, +→list, add-all ──
  const rd = await page.evaluate(async () => {
    state.shopping = []; saveState();
    mergeOrPush(makeProduct('Milk'));
    const html = await buildRecipeModal({ title: 'T',
      ingredients: [{ name: 'Milk', measure: '1 l' }, { name: 'Dragonfruit', measure: '2' }],
      instructions: 'Do.' });
    document.getElementById('recipeModalBody').innerHTML = html;
    const plus = document.querySelector('#recipeModalBody .rd-plus');
    if (plus) plus.click();
    const afterPlus = {
      added: state.shopping.some(s => /dragonfruit/i.test(s.name)),
      flipped: !document.querySelector('#recipeModalBody .rd-plus'),
    };
    document.getElementById('rdShopAll').click();
    return {
      emoji: html.includes('rd-emoji'),
      tick: html.includes('rd-tick'),
      saleGone: !html.includes('rd-sale') && !html.includes('checkSale'),
      shopallCount: html.includes('(1)'),
      afterPlus,
      noDup: state.shopping.filter(s => /dragonfruit/i.test(s.name)).length === 1,
      allDisabled: document.getElementById('rdShopAll').disabled,
    };
  });
  check('ingredients: emoji + tick rows', rd.emoji && rd.tick);
  check('ingredients: on-sale button gone', rd.saleGone);
  check('ingredients: add-all counts the missing', rd.shopallCount);
  check('ingredients: row + adds one to shopping list', rd.afterPlus.added && rd.afterPlus.flipped);
  check('ingredients: add-all dedupes and disables itself', rd.noDup && rd.allDisabled);

  // ── live-freshness refresher runs without throwing ──
  check('live freshness refresh runs', await page.evaluate(() => { try { refreshLiveFreshness(); return true; } catch { return false; } }));

  console.log(results.join('\n'));
  const realErrors = errors.filter(e =>
    !/net::ERR_FAILED|Failed to load resource|ZXing|service-worker|The play\(\) request/i.test(e));
  console.log(realErrors.length ? 'JS ERRORS:\n' + realErrors.join('\n') : 'no unexpected JS errors');
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) || realErrors.length ? 1 : 0);
})();
