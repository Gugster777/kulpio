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
  check('card renders photo thumbnail', await page.evaluate(() => /class="pimg[ "]/.test(fridgeItemsHtml())));

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
  // ── calmer Home (v105): the week calendar is folded away by default ──
  // Seed something due this week, or the strip hides itself entirely (a quiet
  // fridge shows no calendar at all — by design since v68).
  await page.evaluate(() => {
    const p = state.products[0];
    p.exp = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    weekOpen = false;
    saveState(); refreshFreshness(); renderContent();
  });
  check('week calendar starts collapsed', await page.evaluate(() =>
    !!document.querySelector('.week-head') && !document.querySelector('.week-days')));
  check('week head counts what is due', await page.evaluate(() => {
    const n = +document.querySelector('.week-head .wk-n').textContent;
    return n === state.products.filter(p => p.exp && (daysUntil(p.exp) < 0
      || [0, 1, 2, 3, 4, 5, 6].some(o => p.exp === weekDayKey(o)))).length;
  }));
  check('opening it reveals the day cells and persists', await page.evaluate(() => {
    toggleWeek();
    return !!document.querySelector('.week-days') && localStorage.getItem('kulpio-week') === '1';
  }));
  check('collapsing it clears the day filter it set', await page.evaluate(() => {
    const day = [...document.querySelectorAll('.wday')].find(w => !w.disabled);
    day.click();                       // filter the list to that day
    const filtered = fridgeDay !== null;
    toggleWeek();                      // fold it away
    return filtered && fridgeDay === null && !document.querySelector('.week-days');
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
  // ── the pear's plan (v109): he says what to do, and does it on one tap ──
  await page.evaluate(() => {
    while (state.products.length >= MAX_PRODUCTS - 3) state.products.pop();
    const d = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    state.products.forEach(p => { p.frozen = false; delete p.loc; p.exp = d(20); });
    mergeOrPush(makeProduct('Spinach'));  state.products.find(p => p.name === 'Spinach').exp = d(-1);   // gone off
    mergeOrPush(makeProduct('Cucumber')); state.products.find(p => p.name === 'Cucumber').exp = d(1);   // produce: the freezer won't save it → eat today
    mergeOrPush(makeProduct('Beef'));     state.products.find(p => p.name === 'Beef').exp = d(1);       // meat → freeze it
    state.shopping = [{ name: 'Bread', done: false }];
    saveState(); refreshFreshness(); renderContent();
  });
  const todo = await page.evaluate(() => {
    const rows = pearPlanRows();
    const byName = n => rows.find(r => r.p && r.p.name === n);
    return {
      toss: byName('Spinach') && byName('Spinach').kind,
      eat: byName('Cucumber') && byName('Cucumber').kind,
      freeze: byName('Beef') && byName('Beef').kind,
      buy: rows.some(r => r.kind === 'buy'),
      ignoresFresh: !rows.some(r => r.p && daysUntil(r.p.exp) > 2),
      count: planCount(),
    };
  });
  check('plan: expired food is marked for the bin', todo.toss === 'toss');
  check('plan: perishable food due now says eat it', todo.eat === 'eat');
  check('plan: meat due now says freeze it instead', todo.freeze === 'freeze');
  check('plan: the shopping list is on the plan', todo.buy);
  check('plan: food that is fine is left off the plan', todo.ignoresFresh);
  check('plan: the pear wears the job count', await page.evaluate(() =>
    document.querySelector('.pear-todo').textContent === String(planCount())));
  check('plan: the headline number opens it', await page.evaluate(() => {
    document.getElementById('heroStat').click();
    return document.getElementById('planModal').classList.contains('show')
      && document.querySelectorAll('#planBody .plan-row').length === pearPlanRows().length;
  }));
  check('plan: one tap carries out a line, and it is undoable', await page.evaluate(() => {
    const before = state.products.length;
    const rows = pearPlanRows();
    const beef = rows.findIndex(r => r.p && r.p.name === 'Beef');
    document.querySelectorAll('#planBody .plan-do')[beef].click();
    const frozen = state.products.find(p => p.name === 'Beef').frozen === true;
    const shrunk = pearPlanRows().length < rows.length;
    undoLast();
    return frozen && shrunk && state.products.length === before;
  }));
  check('plan: eating from the plan credits the money', await page.evaluate(() => {
    const saved = state.saved || 0;
    const i = state.products.findIndex(p => p.name === 'Cucumber');
    state.products[i].price = 7;
    doPlan(i, 'eat');
    const ok = (state.saved || 0) === saved + 7;
    undoLast();
    return ok;
  }));
  check('plan: a healthy fridge gets a clear plan, not an empty list', await page.evaluate(() => {
    const keep = state.products.map(p => p.exp);
    const far = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    state.products.forEach(p => { p.exp = far; });
    state.shopping = [];
    refreshFreshness();
    const html = pearPlanHtml();
    const noBadge = !document.querySelector('.pear-todo');
    state.products.forEach((p, i) => { p.exp = keep[i]; });
    refreshFreshness();
    return html.includes('plan-clear') && noBadge;
  }));
  await page.evaluate(() => { closePearPlan(); });

  // ── storage place: fridge / freezer / pantry (v109) ──
  await page.evaluate(() => {
    while (state.products.length >= MAX_PRODUCTS) state.products.pop();
    state.products.forEach(p => { p.frozen = false; delete p.loc; });
    saveState(); refreshFreshness(); renderContent();
  });
  check('new items land in the fridge', await page.evaluate(() =>
    productLoc(makeProduct('Flour')) === 'fridge'));
  check('the modal offers three places', await page.evaluate(() => {
    addProductManually();
    const btns = [...document.querySelectorAll('#pLocSeg .loc-btn')].map(b => b.dataset.loc);
    return btns.join(',') === 'fridge,freezer,pantry'
      && document.querySelector('#pLocSeg .loc-btn.on').dataset.loc === 'fridge';
  }));
  check('saving to the pantry records the place', await page.evaluate(() => {
    document.getElementById('pName').value = 'Rice 1kg';
    syncLocSeg('pantry');
    saveProductManual();
    const p = state.products.find(x => x.name === 'Rice 1kg');
    return p && productLoc(p) === 'pantry' && !p.frozen && p.badge.startsWith('🥫');
  }));
  check('picking the freezer freezes it, like the freezer sheet', await page.evaluate(() => {
    const i = state.products.findIndex(x => x.name === 'Rice 1kg');
    editProductPrompt(i);
    syncLocSeg('freezer');
    saveProductManual();
    const p = state.products.find(x => x.name === 'Rice 1kg');
    return p.frozen === true && productLoc(p) === 'freezer' && daysUntil(p.exp) > 60;
  }));
  check('moving it back out of the freezer thaws it', await page.evaluate(() => {
    const i = state.products.findIndex(x => x.name === 'Rice 1kg');
    editProductPrompt(i);
    syncLocSeg('pantry');
    saveProductManual();
    const p = state.products.find(x => x.name === 'Rice 1kg');
    return !p.frozen && productLoc(p) === 'pantry';
  }));
  check('a re-bought pantry staple stays in the pantry', await page.evaluate(() => {
    mergeOrPush(makeProduct('Rice 1kg'));
    return productLoc(state.products.find(x => x.name === 'Rice 1kg')) === 'pantry';
  }));
  check('the freezer never keeps an "opened" pack', await page.evaluate(() => {
    const p = state.products.find(x => x.name === 'Rice 1kg');
    p.opened = '2026-01-01';
    setProductLoc(p, 'freezer');
    const ok = !p.opened && p.frozen;
    setProductLoc(p, 'pantry');
    return ok;
  }));
  check('the place filter narrows the list', await page.evaluate(() => {
    switchTab('home', document.getElementById('tab-home'));
    setFridgeLoc('pantry');
    const shown = [...document.querySelectorAll('#fridgeItems .prod-item .pname')].length;
    const pantryN = state.products.filter(p => productLoc(p) === 'pantry').length;
    const labelled = document.getElementById('filterBtn').textContent.includes('🥫');
    setFridgeLoc('all');
    const all = document.querySelectorAll('#fridgeItems .prod-item').length;
    return shown === pantryN && shown < all && labelled;
  }));
  check('the place row hides when everything is in one place', await page.evaluate(() => {
    const keep = state.products.map(p => p.loc);
    state.products.forEach(p => { p.loc = 'fridge'; p.frozen = false; });
    const oneHtml = filterMenuHtml();
    state.products.forEach((p, i) => { p.loc = keep[i]; });
    return !oneHtml.includes('data-loc') && filterMenuHtml().includes('data-loc');
  }));
  // Leave the fridge below the demo cap: adds further down would bounce off it.
  await page.evaluate(() => {
    while (state.products.length >= MAX_PRODUCTS - 1) state.products.pop();
    saveState(); renderContent();
  });

  // ── Savings tab, rebuilt (v107) ──
  const sv = await page.evaluate(() => {
    const beforeEmpty = (() => {
      const keep = { p: state.products, s: state.saved, w: state.wasted, h: state.history };
      state.products = []; state.saved = 0; state.wasted = 0; state.history = [];
      const html = savingsHtml();
      Object.assign(state, { products: keep.p, saved: keep.s, wasted: keep.w, history: keep.h });
      return html;
    })();
    switchTab('deals', document.getElementById('tab-deals'));
    const html = document.getElementById('productList').innerHTML;
    const risk = document.querySelector('.sv-risk');
    return {
      emptyState: beforeEmpty.includes('sv-empty') && !beforeEmpty.includes('sv-hero'),
      hero: !!document.querySelector('.sv-hero .bal-net'),
      // The old tab had a separate store-share card AND a store-average card.
      oneStoreCard: (html.match(/avgPriceStore|storeBreakdown/g) || []).length <= 1,
      tiles: document.querySelectorAll('.life-grid .life-tile').length >= 1,
      riskIsButton: !risk || risk.tagName === 'BUTTON',
      riskRescues: (() => {
        if (!risk) return true;
        risk.click();
        return currentTab === 'home' && fridgeFilter === 'expiring';
      })(),
    };
  });
  check('savings: balance hero leads the tab', sv.hero);
  check('savings: stores are one card, not two', sv.oneStoreCard);
  check('savings: lifetime numbers are tiles', sv.tiles);
  check('savings: money at risk is a real button', sv.riskIsButton);
  check('savings: tapping money at risk jumps to the expiring list', sv.riskRescues);
  check('savings: a fresh install shows one empty state', sv.emptyState);
  await page.evaluate(() => { setFridgeFilter('all'); switchTab('home', document.getElementById('tab-home')); });

  // ── feed the pear (v106): drag a card's food icon onto him = used it ──
  await page.evaluate(() => {
    switchTab('home', document.getElementById('tab-home'));
    if (fridgeView === 'grid') toggleFridgeView();
    mergeOrPush(makeProduct('Milk'));
    saveState(); refreshFreshness(); renderContent();
  });
  await page.waitForTimeout(250);
  const fed = await (async () => {
    const before = await page.evaluate(() => {
      const h = document.querySelector('#fridgeItems .prod-item .pgrab');
      const card = h && h.closest('[data-idx]');
      const p = card && state.products[+card.dataset.idx];
      return p ? { name: p.name, qty: p.qty || 1, saved: state.saved || 0, used: state.usedCount || 0 } : null;
    });
    if (!before) return { ok: false, why: 'no grab handle' };
    const box = await page.locator('#fridgeItems .prod-item .pgrab').first().boundingBox();
    const pear = await page.locator('#pearIcon').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(pear.x + pear.width / 2, pear.y + pear.height / 2, { steps: 12 });
    const hungry = await page.evaluate(() => document.getElementById('pearIcon').classList.contains('hungry'));
    await page.mouse.up();
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => ({
      qty: (state.products.find(p => p.name === 'Milk') || {}).qty ?? 0,
      gone: !state.products.some(p => p.name === 'Milk'),
      saved: state.saved || 0,
      used: state.usedCount || 0,
      modalOpen: document.getElementById('productModal').classList.contains('show'),
      ghost: !!document.querySelector('.feed-ghost'),
      hungryStuck: document.getElementById('pearIcon').classList.contains('hungry'),
    }));
    return { before, after, hungry };
  })();
  check('he opens his mouth as the food nears', fed.hungry === true);
  check('dropping food on him marks it used', fed.after &&
    fed.after.used === fed.before.used + 1 && (fed.after.gone || fed.after.qty === fed.before.qty - 1));
  check('feeding credits the money saved', fed.after && fed.after.saved >= fed.before.saved);
  check('the drag does not also open the editor', fed.after && fed.after.modalOpen === false);
  check('the dragged food is cleaned up', fed.after && !fed.after.ghost && !fed.after.hungryStuck);
  check('feeding is undoable', await page.evaluate(() => {
    undoLast();
    return state.products.some(p => p.name === 'Milk');
  }));

  // ── scanner (v104): the box must never fake a scan without a camera ──
  check('scanner opens without a live camera', await page.evaluate(async () => {
    openScanner();
    await new Promise(r => setTimeout(r, 300));
    const box = document.getElementById('scanBox');
    // Headless + blocked network: ZXing/getUserMedia never come up, so the box
    // must stay un-live (grey reticle, camera placeholder, no laser).
    return document.getElementById('scanOverlay').classList.contains('show')
      && !box.classList.contains('live')
      && getComputedStyle(document.getElementById('scanLine')).display === 'none';
  }));
  // A photo of a barcode must decode. ZXing's entry points are NOT equivalent:
  // decodeFromImage (the element path) does not see EAN-13 — the format on
  // practically every grocery item — while decodeFromImageUrl reads the very
  // same picture. decodeBarcodeFromFile tries them all; if it ever gets cut
  // back to one call, photo upload silently stops working.
  check('barcode decode tries more than one ZXing path', await page.evaluate(() => {
    const src = decodeBarcodeFromFile.toString();
    return src.includes('decodeFromImageUrl') && src.includes('decodeFromImage(');
  }));
  check('scan buttons are one full-width column', await page.evaluate(() => {
    const b = [...document.querySelectorAll('.scan-btns button')];
    return b.length === 3 && new Set(b.map(x => Math.round(x.getBoundingClientRect().width))).size === 1;
  }));
  check('closing the scanner clears the live state', await page.evaluate(() => {
    setScanLive(true);
    closeScanner();
    return !document.getElementById('scanBox').classList.contains('live')
      && !document.getElementById('scanOverlay').classList.contains('show');
  }));

  // ── found card (v111): a scan lands on a product card, not the form ──
  const card = await page.evaluate(async () => {
    openScanner();
    const realFetch = fetchJSON;
    fetchJSON = async () => ({ status: 1, product: { product_name: 'Nutella', brands: 'Ferrero' } });
    await lookupBarcode('3017620422003');
    fetchJSON = realFetch;
    const ov = document.getElementById('scanOverlay');
    return {
      found: ov.classList.contains('found'),
      formOpen: document.getElementById('productModal').classList.contains('show'),
      name: document.getElementById('scardName').textContent,
      brand: document.getElementById('scardBrand').textContent,
      addLbl: document.getElementById('scardAdd').textContent,
      boxHidden: getComputedStyle(document.getElementById('scanBox')).display === 'none',
    };
  });
  check('a scan shows the found card, not the form', card.found && !card.formOpen && card.boxHidden);
  check('the card names the product and brand', card.name === 'Nutella' && card.brand.includes('Ferrero'));
  check('card buttons carry translated labels', card.addLbl.length > 3);
  check('one tap puts it in the fridge and closes the scanner', await page.evaluate(() => {
    while (state.products.length >= MAX_PRODUCTS) state.products.pop();
    const n = state.products.length;
    scanCardAdd();
    const p = state.products.find(x => x.name === 'Nutella');
    const ok = !!p && !!p.exp && state.products.length === n + 1
      && !document.getElementById('scanOverlay').classList.contains('show');
    state.products = state.products.filter(x => x.name !== 'Nutella');
    saveState();
    return ok;
  }));
  check('Edit on the card opens the prefilled form instead', await page.evaluate(() => {
    _scanFound = { name: 'Yogurt', brand: 'Danone', store: '', img: '' };
    showScanCard(_scanFound);
    scanCardEdit();
    const ok = document.getElementById('productModal').classList.contains('show')
      && document.getElementById('pName').value === 'Yogurt'
      && document.getElementById('pBrand').value === 'Danone'
      && !document.getElementById('scanOverlay').classList.contains('found');
    closeProductModal();
    return ok;
  }));
  check('rescan returns to the viewfinder', await page.evaluate(() => {
    openScanner();
    _scanFound = { name: 'X', brand: '', store: '', img: '' };
    showScanCard(_scanFound);
    scanCardRescan();
    const ok = !document.getElementById('scanOverlay').classList.contains('found') && _scanFound === null;
    closeScanner();
    return ok;
  }));
  // The native BarcodeDetector must stay first in line for photo decodes —
  // it reads codes ZXing misses and needs no CDN library.
  check('photo decode tries the native detector first', await page.evaluate(() =>
    decodeBarcodeFromFile.toString().includes('nativeDetector')));

  // ── product page (v112): composition verdict, nutrition, additives, history ──
  const page112 = await page.evaluate(async () => {
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    openScanner();
    const realFetch = fetchJSON;
    fetchJSON = async () => ({ status: 1, product: {
      product_name: 'Choco Spread', brands: 'ChocoCo',
      nutrition_grades: 'e', nova_group: 4,
      additives_tags: ['en:e322', 'en:e476'],
      nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, fat_100g: 30.9, carbohydrates_100g: 57.5 },
    } });
    await lookupBarcode('111');
    fetchJSON = realFetch;
    return {
      score: document.getElementById('scardScore').style.display !== 'none',
      stars: document.getElementById('scardStars').textContent,
      snum: document.getElementById('scardSnum').textContent,
      grade: document.getElementById('scardGrade').textContent,
      gradeCls: document.getElementById('scardGrade').className,
      nova: document.getElementById('scardNova').textContent,
      kcal: document.getElementById('scardNut').textContent.includes('539'),
      per100: document.getElementById('scardNut').textContent.includes(l('scanPer100')),
      adds: document.getElementById('scardAdds').textContent,
      histSaved: JSON.parse(localStorage.getItem('kulpio-scans')).length === 1,
    };
  });
  check('composition verdict rendered', page112.score && page112.stars.includes('★') && page112.snum !== '');
  check('a junk product scores low', parseFloat(page112.snum) <= 1.5);
  check('Nutri-Score badge colored by grade', page112.grade === 'Nutri-Score E' && page112.gradeCls.includes('g-e'));
  check('NOVA badge shown', page112.nova === 'NOVA 4');
  check('nutrition per 100 g shown', page112.kcal && page112.per100);
  check('additive E-numbers listed', page112.adds.includes('E322') && page112.adds.includes('E476'));
  check('the scan landed in history', page112.histSaved);

  const page112b = await page.evaluate(async () => {
    const realFetch = fetchJSON;
    // A clean product: analyzed, zero additives, top grade.
    fetchJSON = async () => ({ status: 1, product: {
      product_name: 'Plain Oats', nutrition_grades: 'a', nova_group: 1, additives_tags: [],
      nutriments: { 'energy-kcal_100g': 370 },
    } });
    await lookupBarcode('222');
    // And one OFF never analyzed: no facts, no fake rating.
    fetchJSON = async () => ({ status: 1, product: { product_name: 'Mystery Sauce' } });
    await lookupBarcode('333');
    fetchJSON = realFetch;
    return {
      noScore: document.getElementById('scardScore').style.display === 'none',
      noNut: document.getElementById('scardNut').style.display === 'none',
      noAdds: document.getElementById('scardAdds').style.display === 'none',
      hist: JSON.parse(localStorage.getItem('kulpio-scans')).map(e => e.name),
    };
  });
  check('unknown composition shows no fake rating', page112b.noScore && page112b.noNut && page112b.noAdds);
  check('history keeps every scan, newest first', page112b.hist.join(',') === 'Mystery Sauce,Plain Oats,Choco Spread');
  check('a clean product rates near the top', await page.evaluate(() =>
    scanScore({ grade: 'a', nova: 1, adds: [] }) >= 4.5));
  check('rescanning the same code dedupes history', await page.evaluate(() => {
    pushScanHist({ name: 'Plain Oats 2', code: '222' });
    const h = JSON.parse(localStorage.getItem('kulpio-scans'));
    return h.length === 3 && h[0].name === 'Plain Oats 2';
  }));
  check('history caps at 20', await page.evaluate(() => {
    for (let i = 0; i < 30; i++) pushScanHist({ name: 'P' + i, code: 'c' + i });
    return JSON.parse(localStorage.getItem('kulpio-scans')).length === 20;
  }));
  check('the strip renders and reopens a card from history', await page.evaluate(() => {
    hideScanCard();
    renderScanHist();
    const tiles = document.querySelectorAll('#scanHistRow .scan-hi').length;
    openScanHistEntry(0);
    const ok = tiles === 20
      && document.getElementById('scanOverlay').classList.contains('found')
      && document.getElementById('scardName').textContent === 'P29';
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    closeScanner();
    return ok;
  }));

  // ── pear verdict (v113): his one-line AI review under the facts ──
  check('no verdict line without the AI proxy', await page.evaluate(async () => {
    localStorage.removeItem('kulpio-ai-url');
    openScanner();
    _scanFound = { name: 'Choco', brand: '', store: '', img: '', code: 'v1', grade: 'e', nova: 4, adds: ['E322'], kcal: 500 };
    showScanCard(_scanFound);
    await new Promise(r => setTimeout(r, 50));
    return document.getElementById('scardVerdict').style.display === 'none';
  }));
  check('the verdict appears once the AI answers', await page.evaluate(async () => {
    localStorage.setItem('kulpio-ai-url', 'https://ai.example/api');
    const real = postJSON;
    postJSON = async (u, b) => b.verdict ? { verdict: 'Sweet trouble in a jar.' } : null;
    _scanFound = { name: 'Choco', brand: '', store: '', img: '', code: 'v2', grade: 'e', nova: 4, adds: ['E322'], kcal: 500 };
    showScanCard(_scanFound);
    await new Promise(r => setTimeout(r, 50));
    postJSON = real;
    const el = document.getElementById('scardVerdict');
    return el.style.display !== 'none' && el.textContent === '🍐 Sweet trouble in a jar.';
  }));
  check('a late answer never lands on the wrong card', await page.evaluate(async () => {
    const real = postJSON;
    let release;
    postJSON = (u, b) => b.verdict ? new Promise(r => { release = () => r({ verdict: 'Too late.' }); }) : null;
    const slow = { name: 'Slowpoke', brand: '', store: '', img: '', code: 'v3', grade: 'a', nova: 1, adds: [], kcal: 100 };
    _scanFound = slow;
    showScanCard(slow);
    // the user rescans — a different product owns the card now
    postJSON = async (u, b) => b.verdict ? { verdict: 'Fresh and fair.' } : null;
    _scanFound = { name: 'Quick', brand: '', store: '', img: '', code: 'v4', grade: 'a', nova: 1, adds: [], kcal: 50 };
    showScanCard(_scanFound);
    await new Promise(r => setTimeout(r, 50));
    release();   // the slow product's review arrives after the switch
    await new Promise(r => setTimeout(r, 50));
    const el = document.getElementById('scardVerdict');
    const ok = el.textContent === '🍐 Fresh and fair.';
    postJSON = real;
    localStorage.removeItem('kulpio-ai-url');
    closeScanner();
    return ok;
  }));
  check('verdicts are cached per product and language', await page.evaluate(() =>
    _verdictCache['v2|' + currentLang] === 'Sweet trouble in a jar.'));

  // ── v114: own price, folded composition, healthier picks ──
  check('the card shows what you last paid', await page.evaluate(() => {
    openScanner();
    state.products.push(Object.assign(makeProduct('Choco Spread'), { price: 42.5 }));
    _scanFound = { name: 'Choco Spread', brand: '', store: '', img: '', code: 'p1', grade: 'e', nova: 4, adds: [], kcal: 500 };
    showScanCard(_scanFound);
    const el = document.getElementById('scardPrice');
    const ok = el.style.display !== 'none' && el.textContent.includes(formatPrice(42.5));
    state.products = state.products.filter(p => p.name !== 'Choco Spread');
    return ok;
  }));
  check('no price line for a product you never bought', await page.evaluate(() => {
    _scanFound = { name: 'Never Bought', brand: '', store: '', img: '', code: 'p2', grade: 'e', nova: 0, adds: [], kcal: 1 };
    showScanCard(_scanFound);
    return document.getElementById('scardPrice').style.display === 'none';
  }));
  check('composition folds behind a tap', await page.evaluate(() => {
    _scanFound = { name: 'X', brand: '', store: '', img: '', code: 'p3', grade: 'c', nova: 2, adds: [], kcal: 100, ing: 'sugar, palm oil, hazelnuts' };
    showScanCard(_scanFound);
    const btn = document.getElementById('scardIngBtn');
    const box = document.getElementById('scardIng');
    const closed = btn.style.display !== 'none' && !box.classList.contains('open');
    toggleScardIng();
    return closed && box.classList.contains('open') && box.textContent.includes('palm oil');
  }));
  const alts = await page.evaluate(async () => {
    const realFetch = fetchJSON;
    fetchJSON = async (url) => url.includes('/api/v2/search') ? { products: [
      { code: 'a1', product_name: 'Nut Butter Pure', nutrition_grades: 'a', nova_group: 1, additives_tags: [], nutriments: { 'energy-kcal_100g': 600 } },
      { code: 'b1', product_name: 'Lighter Spread', nutrition_grades: 'b', nova_group: 3, additives_tags: ['en:e322'], nutriments: {} },
      { code: 'e1', product_name: 'Same Junk', nutrition_grades: 'e', nova_group: 4, additives_tags: [], nutriments: {} },
      { code: 'x1', product_name: '', nutrition_grades: 'a', nutriments: {} },
    ] } : null;
    const f = { name: 'Choco Spread', brand: '', store: '', img: '', code: 'p4', grade: 'e', nova: 4, adds: [], kcal: 539, cats: ['en:spreads', 'en:chocolate-spreads'] };
    _scanFound = f;
    showScanCard(f);
    await new Promise(r => setTimeout(r, 80));
    fetchJSON = realFetch;
    const box = document.getElementById('scardAlts');
    const tiles = [...box.querySelectorAll('.scard-alt')];
    return {
      shown: box.style.display !== 'none',
      names: tiles.map(t => t.querySelector('.alt-name').textContent),
      grades: tiles.map(t => t.querySelector('.alt-grade').textContent),
    };
  });
  check('healthier picks render, better grades only', alts.shown
    && alts.names.join(',') === 'Nut Butter Pure,Lighter Spread'
    && alts.grades.join(',') === 'A,B');
  check('tapping a pick opens its own card', await page.evaluate(() => {
    openAltProduct(0);
    const ok = document.getElementById('scardName').textContent === 'Nut Butter Pure'
      && JSON.parse(localStorage.getItem('kulpio-scans'))[0].name === 'Nut Butter Pure';
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    return ok;
  }));
  check('an A-grade product asks for no alternatives', await page.evaluate(async () => {
    let called = false;
    const realFetch = fetchJSON;
    fetchJSON = async () => { called = true; return null; };
    _scanFound = { name: 'Plain Oats', brand: '', store: '', img: '', code: 'p5', grade: 'a', nova: 1, adds: [], kcal: 370, cats: ['en:oats'] };
    showScanCard(_scanFound);
    await new Promise(r => setTimeout(r, 40));
    fetchJSON = realFetch;
    closeScanner();
    return !called && document.getElementById('scardAlts').style.display === 'none';
  }));

  // ── v115: two-product comparison ──
  check('the compare chip arms and disarms', await page.evaluate(() => {
    openScanner();
    _scanFound = { name: 'Junk Bar', brand: '', store: '', img: '', code: 'c1', grade: 'e', nova: 4, adds: ['E322', 'E476'], kcal: 500, prot: 5, fat: 30, carb: 55 };
    showScanCard(_scanFound);
    const b = document.getElementById('scardCmp');
    const idle = !b.classList.contains('held') && b.textContent.includes(l('cmpLbl'));
    scanCompareTap();
    const armed = b.classList.contains('held') && _cmpHold && _cmpHold.code === 'c1';
    scanCompareTap();
    const disarmed = !b.classList.contains('held') && _cmpHold === null;
    return idle && armed && disarmed;
  }));
  const cmp = await page.evaluate(() => {
    scanCompareTap();   // hold Junk Bar again
    state.products.push(Object.assign(makeProduct('Clean Bar'), { price: 30 }));
    state.products.push(Object.assign(makeProduct('Junk Bar'), { price: 50 }));
    _scanFound = { name: 'Clean Bar', brand: '', store: '', img: '', code: 'c2', grade: 'a', nova: 1, adds: [], kcal: 350, prot: 10, fat: 8, carb: 40 };
    showScanCard(_scanFound);
    const chip = document.getElementById('scardCmp');
    const vs = chip.classList.contains('vs') && chip.textContent.includes('Junk Bar');
    scanCompareTap();   // different product held → modal
    const open = document.getElementById('cmpModal').classList.contains('show');
    const cells = [...document.querySelectorAll('#cmpBody .cmp-c')].map(c => ({
      t: c.textContent.trim(), win: c.classList.contains('win'), lbl: c.classList.contains('cmp-lbl'),
    }));
    return { vs, open, cells };
  });
  check('a held product offers compare-with on the next card', cmp.vs);
  check('comparing opens the side-by-side table', cmp.open);
  check('the better product wins stars, NOVA, additives and price', await page.evaluate(() => {
    const grid = [...document.querySelectorAll('#cmpBody .cmp-c')];
    const rows = [];
    for (let i = 0; i < grid.length; i += 3) rows.push(grid.slice(i, i + 3));
    const byLbl = t => rows.find(r => r[0].textContent.trim() === t);
    const right = r => !r[1].classList.contains('win') && r[2].classList.contains('win');
    const neither = r => !r[1].classList.contains('win') && !r[2].classList.contains('win');
    // Held (Junk Bar) sits left, current (Clean Bar) right — right must win
    // the judged rows; the plain-fact rows are never judged.
    return right(byLbl('★')) && right(byLbl('NOVA')) && right(byLbl(l('additivesLbl')))
      && right(byLbl('💳')) && neither(byLbl('kcal')) && neither(byLbl(l('fat')));
  }));
  check('Back-style close puts the table away', await page.evaluate(() => {
    closeAllOverlays();
    return !document.getElementById('cmpModal').classList.contains('show');
  }));
  check('closing the scanner drops the held product', await page.evaluate(() => {
    const held = _cmpHold !== null;
    closeScanner();
    state.products = state.products.filter(p => p.name !== 'Clean Bar' && p.name !== 'Junk Bar');
    saveState();
    return held === false || _cmpHold === null;   // closeAllOverlays above already closed the scanner
  }));

  // ── v116: additive traffic light + favourites ──
  check('additive chips wear their risk colors, worst first', await page.evaluate(() => {
    openScanner();
    _scanFound = { name: 'Ham', brand: '', store: '', img: '', code: 'r1', grade: 'd', nova: 4, adds: ['E322', 'E250', 'E451'], kcal: 250 };
    showScanCard(_scanFound);
    const chips = [...document.querySelectorAll('#scardAdds .scard-add')];
    return chips.map(c => c.textContent).join(',') === 'E250,E451,E322'
      && chips[0].classList.contains('ar-r')
      && chips[1].classList.contains('ar-y')
      && chips[2].classList.contains('ar-g');
  }));
  check('tapping a chip tells the additive story', await page.evaluate(() => {
    showAddInfo('E250');
    const el = document.getElementById('scardAddInfo');
    const shown = el.style.display !== 'none'
      && el.textContent.includes('sodium nitrite')
      && el.textContent.includes(l('addAvoid'));
    showAddInfo('E250');   // same chip again folds it
    return shown && el.style.display === 'none';
  }));
  check('an OFF-uppercased subtype still matches (E150D)', await page.evaluate(() =>
    addRisk('E150D') === 'y' && addRisk('E999') === ''));
  check('the heart pins a product in history', await page.evaluate(() => {
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    pushScanHist({ name: 'Loved Jam', code: 'f1' });
    _scanFound = scanHist[0];
    showScanCard(_scanFound);
    toggleScanFav();
    const hearted = document.getElementById('scardFav').classList.contains('on');
    for (let i = 0; i < 30; i++) pushScanHist({ name: 'Noise ' + i, code: 'n' + i });
    const kept = scanHist.some(x => x.code === 'f1' && x.fav);
    renderScanHist();
    const first = document.querySelector('#scanHistRow .scan-hi .hi-name').textContent;
    const mark = !!document.querySelector('#scanHistRow .scan-hi .hi-fav');
    return hearted && kept && first === 'Loved Jam' && mark;
  }));
  check('unhearting frees it for eviction', await page.evaluate(() => {
    _scanFound = scanHist.find(x => x.code === 'f1');
    showScanCard(_scanFound);
    toggleScanFav();
    const off = !document.getElementById('scardFav').classList.contains('on');
    for (let i = 30; i < 55; i++) pushScanHist({ name: 'Noise ' + i, code: 'n' + i });
    const gone = !scanHist.some(x => x.code === 'f1');
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    closeScanner();
    return off && gone;
  }));

  // ── v118: your own rating + note (Rate&Goods review, local) ──
  check('tapping a star rates and persists', await page.evaluate(() => {
    localStorage.removeItem('kulpio-myratings');
    myRatings = {};
    openScanner();
    _scanFound = { name: 'Rated Jam', brand: '', store: '', img: '', code: 'mr1' };
    showScanCard(_scanFound);
    setMyRating(4);
    const on = document.querySelectorAll('#mrStars .mr-star.on').length;
    const stored = JSON.parse(localStorage.getItem('kulpio-myratings'))['mr1'];
    const noteShown = document.getElementById('mrNote').style.display !== 'none';
    return on === 4 && stored && stored.r === 4 && noteShown;
  }));
  check('tapping the same star takes the rating back', await page.evaluate(() => {
    setMyRating(4);
    return document.querySelectorAll('#mrStars .mr-star.on').length === 0
      && !JSON.parse(localStorage.getItem('kulpio-myratings'))['mr1'];
  }));
  check('the note survives reopening the card', await page.evaluate(() => {
    setMyRating(3);
    saveMyNote('too sweet');
    showScanCard(_scanFound);   // reopen: value must come back from storage
    return document.getElementById('mrNote').value === 'too sweet'
      && myRatings['mr1'].r === 3;
  }));
  check('history tile wears your stars', await page.evaluate(() => {
    pushScanHist(_scanFound);
    renderScanHist();
    const m = document.querySelector('#scanHistRow .scan-hi .hi-mine');
    return m && m.textContent === '★3';
  }));
  check('no barcode, no rating block (AI-label path)', await page.evaluate(() => {
    _scanFound = { name: 'Label Only', brand: '', store: '', img: '', code: '' };
    showScanCard(_scanFound);
    return document.getElementById('scardMine').style.display === 'none';
  }));
  check('comparison judges your stars', await page.evaluate(() => {
    const a = { name: 'Rated Jam', code: 'mr1' };
    const b = { name: 'Other Jam', code: 'mr2' };
    openCmpModal(a, b);
    const cells = [...document.querySelectorAll('#cmpBody .cmp-c')];
    const i = cells.findIndex(c => c.textContent === l('myRating'));
    const ok = i >= 0 && cells[i + 1].textContent === '★★★' && cells[i + 1].classList.contains('win')
      && cells[i + 2].textContent === '–';
    closeCmpModal();
    localStorage.removeItem('kulpio-myratings');
    myRatings = {};
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    closeScanner();
    return ok;
  }));

  // ── v119: text search — find a product with no barcode to point at ──
  check('search box opens clean with a localized prompt', await page.evaluate(() => {
    openScanner();
    const inp = document.getElementById('scanSearchIn');
    return inp.value === '' && inp.placeholder.includes(l('scanSearchPh'))
      && document.getElementById('scanSearchRes').innerHTML === '';
  }));
  check('short queries stay quiet', await page.evaluate(async () => {
    window._origFetchJSON = fetchJSON;
    let called = false;
    fetchJSON = async () => { called = true; return { products: [] }; };
    onScanSearch('mi');
    await new Promise(r => setTimeout(r, 600));
    return !called && document.getElementById('scanSearchRes').innerHTML === '';
  }));
  check('results render as tiles with a grade pill', await page.evaluate(async () => {
    fetchJSON = async () => ({ products: [
      { code: '111', product_name: 'Alpen Milk', brands: 'Alpen', nutrition_grades: 'b', nutriments: { 'energy-kcal_100g': 64 } },
      { code: '222', product_name: 'Choco Milk', brands: 'Choco', nutrition_grades: 'd' },
    ] });
    await runScanSearch('milk');
    const tiles = [...document.querySelectorAll('#scanSearchRes .scan-hi')];
    return tiles.length === 2
      && tiles[0].textContent.includes('Alpen Milk')
      && !!tiles[0].querySelector('.alt-grade.g-b');
  }));
  check('a stale answer never overwrites a newer query', await page.evaluate(async () => {
    fetchJSON = async () => ({ products: [{ code: '333', product_name: 'Stale Milk' }] });
    const p = runScanSearch('stale');
    _searchSeq++;   // a newer query arrived while this one was in flight
    await p;
    return !document.getElementById('scanSearchRes').textContent.includes('Stale Milk');
  }));
  check('tapping a hit opens its card and logs history', await page.evaluate(async () => {
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    fetchJSON = async () => ({ products: [{ code: '444', product_name: 'Found Milk', nutrition_grades: 'a' }] });
    await runScanSearch('found');
    openSearchResult(0);
    const ok = document.getElementById('scanOverlay').classList.contains('found')
      && document.getElementById('scardName').textContent === 'Found Milk'
      && scanHist.some(x => x.code === '444');
    return ok;
  }));
  check('no hits says so honestly', await page.evaluate(async () => {
    hideScanCard();
    fetchJSON = async () => ({ products: [] });
    await runScanSearch('zzz');
    const ok = document.getElementById('scanSearchRes').textContent === l('scanNoRes');
    fetchJSON = window._origFetchJSON;
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    closeScanner();
    return ok;
  }));

  // ── v120: diet verdicts + allergen alert ──
  check('OFF analysis tags map to diet and allergen facts', await page.evaluate(() => {
    const f = offCardPayload({
      product_name: 'Choc Spread',
      ingredients_analysis_tags: ['en:palm-oil', 'en:non-vegan', 'en:vegetarian'],
      allergens_tags: ['en:milk', 'en:nuts', 'en:kiwi'],
    }, '555');
    return f.diet.join(',') === 'palm-oil,vegetarian'
      && f.allg.join(',') === 'milk,nuts';   // kiwi isn't one of the 14 we can name
  }));
  check('card wears the diet chips, vegan beats vegetarian', await page.evaluate(() => {
    openScanner();
    _scanFound = { name: 'Oat Bar', code: 'd1', diet: ['vegan', 'vegetarian', 'palm-oil-free'], allg: [] };
    showScanCard(_scanFound);
    const chips = [...document.querySelectorAll('#scardDiet .scard-flag')];
    return chips.length === 2
      && chips[0].textContent.includes(l('dietVegan'))
      && !chips.some(c => c.textContent.includes(l('dietVeg')))
      && chips[1].textContent.includes(l('dietPalmFree'))
      && chips.every(c => c.classList.contains('ar-g'));
  }));
  check('palm oil gets the red flag', await page.evaluate(() => {
    _scanFound = { name: 'Choc Spread', code: 'd2', diet: ['palm-oil'], allg: [] };
    showScanCard(_scanFound);
    const c = document.querySelector('#scardDiet .scard-flag');
    return c && c.textContent.includes(l('dietPalm')) && c.classList.contains('ar-r');
  }));
  check('allergens list quietly until one is yours', await page.evaluate(() => {
    localStorage.removeItem('kulpio-allergens');
    myAllergens = [];
    _scanFound = { name: 'Milk Bar', code: 'd3', diet: [], allg: ['milk', 'nuts'] };
    showScanCard(_scanFound);
    const chips = [...document.querySelectorAll('#scardAllg .scard-flag')];
    return chips.length === 2
      && chips.every(c => !c.classList.contains('ar-r'))
      && document.getElementById('scardWarn').style.display === 'none';
  }));
  check('picking an allergen persists and fires the banner', await page.evaluate(() => {
    toggleAllergen('milk');
    const chipOn = document.querySelector('#allergenChips .fchip.active');
    showScanCard(_scanFound);   // rescan the same product, now with milk picked
    const warn = document.getElementById('scardWarn');
    const red = document.querySelector('#scardAllg .scard-flag.ar-r');
    return JSON.parse(localStorage.getItem('kulpio-allergens')).includes('milk')
      && chipOn && chipOn.textContent.includes(l('alMilk'))
      && warn.style.display !== 'none'
      && warn.textContent.includes(l('alMilk'))
      && red && red.textContent.includes(l('alMilk'));
  }));
  check('unpicking calms the card back down', await page.evaluate(() => {
    toggleAllergen('milk');
    showScanCard(_scanFound);
    const ok = document.getElementById('scardWarn').style.display === 'none'
      && !document.querySelector('#scardAllg .scard-flag.ar-r')
      && myAllergens.length === 0;
    localStorage.removeItem('kulpio-allergens');
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    closeScanner();
    return ok;
  }));

  // ── v121: share the card as a line of text ──
  check('share button is on the card, localized', await page.evaluate(() => {
    openScanner();
    _scanFound = { name: 'Share Jam', brand: 'JamCo', store: '', img: '', code: 's1', grade: 'b', nova: 2, adds: [], kcal: 100 };
    showScanCard(_scanFound);
    const b = document.getElementById('scardShare');
    return b && b.textContent === '📤' && b.title === l('recapShare');
  }));
  check('clipboard fallback carries name, stars and your note', await page.evaluate(async () => {
    myRatings['s1'] = { r: 5, note: 'the good one' };
    // Chrome on Windows HAS navigator.share — force the clipboard fallback.
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: t => { window._shared = t; return Promise.resolve(); } },
      configurable: true,
    });
    shareScanCard();
    await new Promise(r => setTimeout(r, 50));
    return window._shared.includes('Share Jam · JamCo')
      && window._shared.includes('Nutri-Score B')
      && window._shared.includes(l('myRating') + ': ★★★★★')
      && window._shared.includes('💬 the good one')
      && window._shared.includes('🍐 Kulpio');
  }));
  check('the button confirms with a ✓, then recovers', await page.evaluate(async () => {
    const b = document.getElementById('scardShare');
    const flipped = b.textContent === '✓' && b.title === l('recapCopied');
    await new Promise(r => setTimeout(r, 1600));
    const back = b.textContent === '📤';
    delete myRatings['s1'];
    localStorage.removeItem('kulpio-myratings');
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    closeScanner();
    return flipped && back;
  }));

  // ── v122: teach Kulpio an unknown barcode ──
  check('unknown barcode offers to be taught', await page.evaluate(async () => {
    localStorage.removeItem('kulpio-mycodes');
    myCodes = {};
    openScanner();
    window._origFetchJSON2 = fetchJSON;
    fetchJSON = async () => ({ status: 0 });
    await lookupBarcode('4000000000001');
    const b = document.getElementById('scanTeach');
    return b.style.display !== 'none' && b.textContent.includes(l('addManually'))
      && document.getElementById('scanStatus').textContent === l('barcodeNotFound');
  }));
  check('teaching saves the code and the product', await page.evaluate(() => {
    teachFromScan();
    const m = document.getElementById('productModal');
    const armed = m.classList.contains('show') && m.dataset.teachCode === '4000000000001';
    document.getElementById('pName').value = 'Granny Jam';
    document.getElementById('pBrand').value = 'Granny';
    saveProductManual();
    const taught = myCodes['4000000000001'];
    return armed && taught && taught.name === 'Granny Jam' && taught.brand === 'Granny'
      && !m.dataset.teachCode
      && state.products.some(p => p.name === 'Granny Jam');
  }));
  check('the taught code answers instantly, offline, as yours', await page.evaluate(async () => {
    openScanner();
    let offCalled = false;
    fetchJSON = async () => { offCalled = true; return { status: 0 }; };
    await lookupBarcode('4000000000001');
    const chip = [...document.querySelectorAll('#scardDiet .scard-flag')]
      .some(c => c.textContent.includes(l('myProduct')));
    return !offCalled
      && document.getElementById('scanOverlay').classList.contains('found')
      && document.getElementById('scardName').textContent === 'Granny Jam'
      && chip;
  }));
  check('closing the form unarms the teach code', await page.evaluate(() => {
    showScanTeach('4000000000002');
    teachFromScan();
    closeProductModal();
    openScanner();
    return !document.getElementById('productModal').dataset.teachCode
      && !myCodes['4000000000002'];
  }));
  check('200-code cap evicts the oldest taught', await page.evaluate(() => {
    myCodes = {};
    for (let i = 0; i < 205; i++) teachProduct('30000000' + String(i).padStart(5, '0'), { name: 'P' + i });
    const keys = Object.keys(myCodes);
    return keys.length === 200 && !myCodes['3000000000000'] && !!myCodes['3000000000204'];
  }));
  check('photo thumbs are not hoarded in the code book', await page.evaluate(() => {
    teachProduct('4000000000003', { name: 'Pic Jam', img: 'data:image/jpeg;base64,xxx' });
    const ok = myCodes['4000000000003'].img === '';
    fetchJSON = window._origFetchJSON2;
    localStorage.removeItem('kulpio-mycodes');
    myCodes = {};
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    state.products = state.products.filter(p => p.name !== 'Granny Jam');
    saveState();
    closeScanner();
    return ok;
  }));

  // ── v123: camera-light toggle ──
  check('a torch-capable track surfaces the button', await page.evaluate(() => {
    openScanner();
    setScanLive(true);   // the button only renders inside a live viewfinder
    const applied = [];
    syncTorchBtn({
      getCapabilities: () => ({ torch: true }),
      applyConstraints: c => { applied.push(c); return Promise.resolve(); },
    });
    const b = document.getElementById('scanTorch');
    window._torchApplied = applied;
    return b.style.display !== 'none' && b.title === l('torchLbl')
      && getComputedStyle(b).display !== 'none';
  }));
  check('tapping it lights up and asks the track', await page.evaluate(async () => {
    toggleTorch();
    await new Promise(r => setTimeout(r, 30));
    const b = document.getElementById('scanTorch');
    return b.classList.contains('on') && b.getAttribute('aria-pressed') === 'true'
      && window._torchApplied.length === 1
      && window._torchApplied[0].advanced[0].torch === true;
  }));
  check('a webcam without a torch never shows it', await page.evaluate(() => {
    syncTorchBtn({ getCapabilities: () => ({}) });
    return document.getElementById('scanTorch').style.display === 'none';
  }));
  check('stopping the scanner drops the torch', await page.evaluate(() => {
    syncTorchBtn({ getCapabilities: () => ({ torch: true }), applyConstraints: () => Promise.resolve() });
    stopBarcodeScanner();
    const gone = document.getElementById('scanTorch').style.display === 'none';
    closeScanner();
    return gone && _torchTrack === null;
  }));

  // ── v124: top of the category, folded behind one tap ──
  check('a known category offers the fold-out button', await page.evaluate(() => {
    openScanner();
    _scanFound = { name: 'Choco Paste', code: 't1', grade: 'd', cats: ['en:spreads', 'en:chocolate-spreads'] };
    showScanCard(_scanFound);
    const b = document.getElementById('scardCatBtn');
    return b.style.display !== 'none'
      && b.textContent.includes(l('topCat'))
      && b.textContent.includes('chocolate spreads')
      && document.getElementById('scardTop').style.display === 'none';
  }));
  check('no category, no button', await page.evaluate(() => {
    _scanFound = { name: 'Mystery', code: 't2', cats: [] };
    showScanCard(_scanFound);
    const hidden = document.getElementById('scardCatBtn').style.display === 'none';
    _scanFound = { name: 'Choco Paste', code: 't1', grade: 'd', cats: ['en:spreads', 'en:chocolate-spreads'] };
    showScanCard(_scanFound);
    return hidden;
  }));
  check('unfolding lists the most-scanned, self excluded', await page.evaluate(async () => {
    window._origFetchJSON3 = fetchJSON;
    fetchJSON = async () => ({ products: [
      { code: 't1', product_name: 'Choco Paste', nutrition_grades: 'd' },      // self — must not appear
      { code: 'p2', product_name: 'Nut Paste', nutrition_grades: 'c' },
      { code: 'p3', product_name: 'Dark Paste', nutrition_grades: 'b' },
    ] });
    await toggleTopCat();
    const tiles = [...document.querySelectorAll('#scardTop .scard-alt')];
    return document.getElementById('scardTop').style.display !== 'none'
      && tiles.length === 2
      && !tiles.some(t => t.title === 'Choco Paste')
      && document.getElementById('scardCatBtn').textContent.includes('▴');
  }));
  check('a tile becomes the card', await page.evaluate(() => {
    openTopProduct(0);
    return document.getElementById('scardName').textContent === 'Nut Paste'
      && scanHist.some(x => x.code === 'p2');
  }));
  check('second tap folds it back', await page.evaluate(async () => {
    _scanFound = { name: 'Choco Paste', code: 't1', grade: 'd', cats: ['en:spreads', 'en:chocolate-spreads'] };
    showScanCard(_scanFound);
    await toggleTopCat();   // cached — opens instantly
    await toggleTopCat();   // …and folds
    const ok = document.getElementById('scardTop').style.display === 'none'
      && document.getElementById('scardCatBtn').textContent.includes('▾');
    fetchJSON = window._origFetchJSON3;
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    closeScanner();
    return ok;
  }));

  // ── v125: the scanner achievement ──
  check('every opened card counts toward the scanner badge', await page.evaluate(() => {
    localStorage.removeItem('kulpio-scan-count');
    state.scanCount = 0;
    pushScanHist({ name: 'Counted Jam', code: 'c1' });
    pushScanHist({ name: 'Counted Jam', code: 'c1' });   // a re-scan still counts as scanning
    return state.scanCount === 2 && localStorage.getItem('kulpio-scan-count') === '2';
  }));
  check('ten scans unlock Label detective', await page.evaluate(() => {
    delete state.badges.b_scan10;
    state.scanCount = 9;
    checkBadges();
    const before = !state.badges.b_scan10;
    state.scanCount = 10;
    checkBadges();
    return before && !!state.badges.b_scan10;
  }));
  check('the badge grid now counts out of eight', await page.evaluate(() => {
    const ok = BADGES.length === 8 && BADGES.some(b => b.id === 'b_scan10' && l(b.name) === l('achScan'));
    delete state.badges.b_scan10;
    state.scanCount = 0;
    localStorage.removeItem('kulpio-scan-count');
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    saveState();
    return ok;
  }));

  // ── v126: desktop wheel scrolls the app from anywhere ──
  check('wheel over dead zones forwards to the app', await page.evaluate(async () => {
    const sa = document.querySelector('.scroll-area');
    const spacer = document.createElement('div');
    spacer.id = '_wheelSpacer';
    spacer.style.height = '3000px';
    sa.appendChild(spacer);
    sa.scrollTop = 0;
    // The body is what the wheel hits beside the column and over the chrome.
    document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: 250, bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    return sa.scrollTop === 250;
  }));
  check('an open modal keeps the wheel to itself', await page.evaluate(async () => {
    const sa = document.querySelector('.scroll-area');
    sa.scrollTop = 0;
    addProductManually();
    document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: 250, bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const still = sa.scrollTop === 0;
    closeProductModal();
    return still;
  }));
  check('natively scrollable targets are left alone', await page.evaluate(async () => {
    const sa = document.querySelector('.scroll-area');
    sa.scrollTop = 0;
    // A synthetic wheel does not scroll natively; if the handler wrongly
    // forwarded here, scrollTop would move — staying 0 proves it deferred.
    document.getElementById('_wheelSpacer').dispatchEvent(new WheelEvent('wheel', { deltaY: 250, bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const deferred = sa.scrollTop === 0;
    document.getElementById('_wheelSpacer').remove();
    return deferred;
  }));

  // ── v127: the settings panel scrolls when its content outgrows the screen ──
  check('settings panel is natively scrollable', await page.evaluate(() => {
    toggleMenu();
    const p = document.getElementById('sideMenu');
    const scrolls = getComputedStyle(p).overflowY === 'auto';
    p.scrollTop = 150;
    const took = p.scrollHeight <= p.clientHeight || p.scrollTop > 0;
    toggleMenu();
    p.scrollTop = 0;
    return scrolls && took;
  }));
  check('notifications popover can scroll too', await page.evaluate(() =>
    getComputedStyle(document.getElementById('notifPanel')).overflowY === 'auto'));

  // ── v128: install row replaces the dev-only AI-setup row ──
  check('AI setup is gone, install row waits hidden', await page.evaluate(() => {
    const noAiRow = !document.getElementById('menuAI') && typeof window.setAiProxy === 'undefined';
    const row = document.getElementById('installRow');
    return noAiRow && row && row.style.display === 'none';
  }));
  check('a browser install offer surfaces the row, localized', await page.evaluate(() => {
    const e = new Event('beforeinstallprompt');
    e.prompt = () => { window._promptedInstall = true; };
    e.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(e);
    const row = document.getElementById('installRow');
    return row.style.display !== 'none'
      && document.getElementById('menuInstall').textContent === l('installApp');
  }));
  check('tapping install spends the offer', await page.evaluate(async () => {
    toggleMenu();          // the row lives in the menu; installApp closes it
    installApp();
    await new Promise(r => setTimeout(r, 30));
    return window._promptedInstall === true
      && document.getElementById('installRow').style.display === 'none'
      && !document.getElementById('sideMenu').classList.contains('show');
  }));
  check('read-label without an endpoint says AI is unavailable', await page.evaluate(() => {
    // file:// has no workers.dev origin and no kulpio-ai-url — the exact case.
    return aiProxyUrl() === '' && l('aiUnavailable').length > 0
      && l('aiUnavailable') !== l('aiNotSet');
  }));

  // ── v129: refresh row + unit system ──
  check('refresh row is in the menu, localized', await page.evaluate(() => {
    return typeof refreshApp === 'function'
      && document.getElementById('menuRefresh').textContent === l('menuRefresh');
  }));
  check('choosing imperial persists and converts', await page.evaluate(() => {
    setUnits('imperial');
    const chip = document.querySelector('#unitsSeg [data-u="imperial"]');
    const w = fmtWeight(10), v = fmtVolume(250);
    return localStorage.getItem('kulpio-units') === 'imperial'
      && chip.classList.contains('active')
      && Math.abs(w.v - 22.05) < 0.1 && w.u === 'lb'
      && Math.abs(v.v - 66.04) < 0.1 && v.u === 'gal';
  }));
  check('savings tiles speak the chosen system', await page.evaluate(() => {
    const keepUsed = state.usedCount;
    state.usedCount = 5;
    const imp = savingsHtml();
    setUnits('metric');
    const met = savingsHtml();
    state.usedCount = keepUsed;
    return imp.includes(' lb<') && imp.includes(' gal<')
      && met.includes(' kg<') && met.includes(' L<')
      && localStorage.getItem('kulpio-units') === 'metric';
  }));

  // ── v133: units convert recipe measures + nutrition caption; seg control ──
  check('recipe measures convert for imperial users', await page.evaluate(() => {
    setUnits('imperial');
    const out = [fmtMeasure('300ml'), fmtMeasure('100g'), fmtMeasure('1.5 kg'), fmtMeasure('500g'), fmtMeasure('1 tbls'), fmtMeasure('to serve')];
    setUnits('metric');
    return out[0] === '10.1 fl oz' && out[1] === '3.5 oz' && out[2] === '3.3 lb'
      && out[3] === '1.1 lb' && out[4] === '1 tbls' && out[5] === 'to serve';
  }));
  check('metric users see measures untouched', await page.evaluate(() =>
    fmtMeasure('300ml') === '300ml' && fmtMeasure('100g') === '100g'));
  check('recipe modal rows speak the chosen system', await page.evaluate(async () => {
    setUnits('imperial');
    const html = await buildRecipeModal({ title: 'U', instructions: 'Do.',
      ingredients: [{ name: 'Milk', measure: '300ml' }] });
    setUnits('metric');
    return html.includes('10.1 fl oz') && !html.includes('300ml');
  }));
  check('nutrition caption follows the units', await page.evaluate(() => {
    setUnits('imperial');
    const imp = l('scanPerOz');
    setUnits('metric');
    return imp.includes('3.5') || imp.includes('3,5');
  }));
  check('units toggle is a real segmented control', await page.evaluate(() => {
    const seg = document.getElementById('unitsSeg');
    return seg.classList.contains('seg')
      && seg.querySelectorAll('.seg-btn').length === 2
      && seg.querySelector('[data-u="metric"]').classList.contains('active')
      && seg.querySelector('[data-u="metric"] .seg-tx').textContent === l('unitMetric');
  }));

  // ── v130: recipe ingredients — buy it or "I have it" ──
  check('a missing ingredient offers both paths: have it or buy it', await page.evaluate(async () => {
    localStorage.removeItem('kulpio-have');
    myHave = [];
    window._haveRecipe = { title: 'Test Soup', instructions: 'Boil everything.',
      ingredients: [{ name: 'Rocksalt', measure: '1 tsp' }, { name: 'Dragonfruit', measure: '2' }] };
    const html = await buildRecipeModal(window._haveRecipe);
    return (html.match(/rd-have"/g) || []).length === 2
      && (html.match(/rd-plus/g) || []).length === 2
      && html.includes('(2)');
  }));
  check('marking it yours persists and shrinks the missing count', await page.evaluate(async () => {
    toggleHaveIt(btoa(encodeURIComponent('Rocksalt')));
    const html = await buildRecipeModal(window._haveRecipe);
    return JSON.parse(localStorage.getItem('kulpio-have')).includes('rocksalt')
      && html.includes('rd-have-on')
      && html.includes('(1)');
  }));
  check('every recipe now counts it as yours', await page.evaluate(async () => {
    const other = { title: 'Other Dish', instructions: 'Mix.',
      ingredients: [{ name: 'Rocksalt', measure: 'a pinch' }] };
    const html = await buildRecipeModal(other);
    return html.includes('rd-have-on') && !html.includes('rd-shopall');
  }));
  check('tapping the mark takes it back', await page.evaluate(async () => {
    toggleHaveIt(btoa(encodeURIComponent('Rocksalt')));
    const html = await buildRecipeModal(window._haveRecipe);
    const ok = myHave.length === 0 && !html.includes('rd-have-on') && html.includes('(2)');
    localStorage.removeItem('kulpio-have');
    delete window._haveRecipe;
    return ok;
  }));

  // ── v131/v135: camera-first scan tab + global search ──
  check('the scan tab docks the real viewfinder', await page.evaluate(() => {
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    pushScanHist({ name: 'Hub Jam', code: 'h1', grade: 'b' });
    pushScanHist({ name: 'Hub Milk', code: 'h2', fav: true });
    switchTab('scan', document.querySelector('.scan-center'));
    const dock = document.getElementById('scanDock');
    const tiles = [...document.querySelectorAll('#productList .hub-hi')];
    return !!dock && dock.contains(document.getElementById('scanBox'))
      && dock.contains(document.getElementById('scanStatus'))
      && !document.getElementById('scanOverlay').classList.contains('show')
      && !!document.getElementById('hubSearchIn')
      && tiles.length === 2
      && tiles[0].title === 'Hub Milk'   // the favourite sorts first
      && !!tiles[0].querySelector('.hub-fav');
  }));
  check('re-rendering the scan tab never destroys the video/inputs', await page.evaluate(() => {
    renderContent(); renderContent();
    return scanDocked() && !!document.getElementById('scanVideo') && !!document.getElementById('receiptInput');
  }));
  check('photo actions run in place, no overlay', await page.evaluate(() => {
    hubPick('receiptInput');
    return !document.getElementById('scanOverlay').classList.contains('show') && scanDocked();
  }));
  check('a hub tile stages the card and raises the overlay', await page.evaluate(() => {
    document.querySelector('#productList .hub-hi').click();
    const ov = document.getElementById('scanOverlay');
    const ok = ov.classList.contains('show') && ov.classList.contains('found')
      && document.getElementById('scardName').textContent === 'Hub Milk';
    closeScanner();
    return ok;
  }));
  check('closing the card lands back on the docked viewfinder', await page.evaluate(() => {
    return currentTab === 'scan' && scanDocked()
      && !document.getElementById('scanOverlay').classList.contains('show');
  }));
  check('leaving the tab sends the viewfinder home and frees the camera', await page.evaluate(() => {
    switchTab('home', document.getElementById('tab-home'));
    const ov = document.getElementById('scanOverlay');
    const home = document.getElementById('scanBox').parentElement === ov
      && ov.contains(document.getElementById('scanStatus'))
      && ov.contains(document.getElementById('scanTeach'))
      && !scannerActive;
    switchTab('scan', document.querySelector('.scan-center'));
    return home;
  }));
  check('hub search reuses the OFF search into its own row', await page.evaluate(async () => {
    window._origFetchJSON4 = fetchJSON;
    fetchJSON = async () => ({ products: [{ code: 'h3', product_name: 'Hub Oat', nutrition_grades: 'a' }] });
    await runScanSearch('oat', 'hubSearchRes');
    const tile = document.querySelector('#hubSearchRes .scan-hi');
    return tile && tile.title === 'Hub Oat';
  }));
  check('global search: fridge answers instantly, database follows', await page.evaluate(async () => {
    mergeOrPush(makeProduct('Searchmilk'));
    saveState();
    openGlobalSearch();
    onGsInput('searchmil');
    const fridgeHit = document.querySelector('#gsFridge .gs-item');
    await runScanSearch('searchmil', 'gsDb');   // the debounced call, run directly
    const dbTile = document.querySelector('#gsDb .scan-hi');
    return document.getElementById('searchModal').classList.contains('show')
      && fridgeHit && fridgeHit.textContent.includes('Searchmilk')
      && document.getElementById('gsFridgeLbl').style.display !== 'none'
      && dbTile && dbTile.title === 'Hub Oat';
  }));
  check('a fridge hit jumps Home with the search applied', await page.evaluate(() => {
    document.querySelector('#gsFridge .gs-item').click();
    const ok = currentTab === 'home'
      && !document.getElementById('searchModal').classList.contains('show')
      && fridgeQuery === 'Searchmilk';
    fridgeQuery = '';
    state.products = state.products.filter(p => p.name !== 'Searchmilk');
    saveState();
    fetchJSON = window._origFetchJSON4;
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    renderContent();
    return ok;
  }));
  check('a database hit opens the product card over any tab', await page.evaluate(async () => {
    fetchJSON = async () => ({ products: [{ code: 'h4', product_name: 'Global Oat', nutrition_grades: 'a' }] });
    openGlobalSearch();
    await runScanSearch('global', 'gsDb');
    document.querySelector('#gsDb .scan-hi').click();
    const ov = document.getElementById('scanOverlay');
    const ok = ov.classList.contains('show') && ov.classList.contains('found')
      && !document.getElementById('searchModal').classList.contains('show')
      && document.getElementById('scardName').textContent === 'Global Oat';
    fetchJSON = window._origFetchJSON4;
    closeScanner();
    localStorage.removeItem('kulpio-scans');
    scanHist = [];
    switchTab('home', document.getElementById('tab-home'));
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
  // His first offer is now the plan — the thing that actually tells you what to do.
  check('tapping the bubble runs the tip', await page.evaluate(() => {
    document.getElementById('pearBubble').click();
    const b = document.getElementById('pearBubble');
    const acted = document.getElementById('planModal').classList.contains('show')
      || (fridgeFilter === 'expiring' && currentTab === 'home');
    closePearPlan();
    return acted && !b.classList.contains('show');
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
    while (state.products.length >= MAX_PRODUCTS) state.products.pop();   // demo cap refuses adds
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
    // The demo cap (MAX_PRODUCTS) silently refuses new items on a full fridge,
    // and the checks above fill it — make room before adding one more.
    while (state.products.length >= MAX_PRODUCTS) state.products.pop();
    saveState();
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

  // ── v134: richer food cards — life meter, place/opened chips ──
  const cards = await page.evaluate(() => {
    const fresh = makeProduct('Card Milk');           // full estimated life
    const frozen = Object.assign(makeProduct('Card Meat'), { frozen: true, loc: 'freezer', exp: daysToDateInput(60) });
    const pantry = Object.assign(makeProduct('Card Rice'), { loc: 'pantry' });
    const opened = Object.assign(makeProduct('Card Juice'), { opened: true });
    const dateless = { name: 'Card Mystery', badge: '3 days', cls: 'bg', dot: 'dg', price: 0, store: '', loc: 'fridge' };
    state.products = [fresh, frozen, pantry, opened, dateless];
    refreshFreshness();
    const html = state.products.map((p, i) => productCard(p, i));
    return {
      meterFresh: /class="plife"[^>]*><i class="dg" style="width:100%"/.test(html[0]),
      meterFrozen: html[1].includes('plife') && /width:6[0-9]%/.test(html[1]),
      chipFrozen: html[1].includes('❄️'),
      chipPantry: html[2].includes('🥫'),
      chipOpened: html[3].includes('🔓'),
      badgeClean: !/pbadge[^>]*>(?:❄️|🥫|🔓)/u.test(html.join('')),
      badgeStateKeepsIcon: state.products[1].badge.startsWith('❄️'),
      noMeterWithoutDate: !html[4].includes('plife'),
      gridKeepsIcon: productCardGrid(state.products[1], 1).includes('❄️'),
    };
  });
  check('cards: full life meter on a fresh item', cards.meterFresh);
  check('cards: frozen meter measures against 90 days', cards.meterFrozen);
  check('cards: freezer/pantry/opened worded chips', cards.chipFrozen && cards.chipPantry && cards.chipOpened);
  check('cards: expiry badge says only the time', cards.badgeClean);
  check('cards: stored badge keeps its icon for grid and aria', cards.badgeStateKeepsIcon && cards.gridKeepsIcon);
  check('cards: no meter without a date', cards.noMeterWithoutDate);

  // ── demo mode: ?demo=1 stashes real data, seeds, survives reload, exits clean ──
  // (Last section on purpose: it renavigates the page and rewrites storage.)
  await page.evaluate(() => {
    Object.keys(localStorage).filter(k => k.startsWith('kulpio-')).forEach(k => localStorage.removeItem(k));
    localStorage.setItem('kulpio-products', JSON.stringify([{ name: 'RestoreMe', exp: '2030-01-01', badge: '', cls: 'bg', dot: 'dg', loc: 'fridge', price: 0, store: '' }]));
  });
  await page.goto(APP + '?demo=1');
  await page.waitForTimeout(1200);
  const demo = await page.evaluate(() => ({
    n: state.products.length,
    soon: soonItems().length,
    badges: Object.keys(state.badges).length,
    streak: wasteStreakDays(),
    scans: scanHist.length,
    favs: favRecipes.length,
    planned: Object.keys(mealPlan).length,
    histBig: state.history.length > 40,
    flag: localStorage.getItem('kulpio-demo') === '1',
    urlClean: !location.search.includes('demo'),
    stashKept: (JSON.parse(localStorage.getItem('kulpio-predemo-backup')).data['kulpio-products'] || '').includes('RestoreMe'),
    rowShown: document.getElementById('demoRow').style.display !== 'none',
  }));
  check('demo: nine products seeded', demo.n === 9);
  check('demo: two items due within 2 days', demo.soon === 2);
  check('demo: four badges pre-earned, no boot confetti storm', demo.badges === 4);
  check('demo: 9-day waste-free streak', demo.streak === 9);
  check('demo: scans + favourites + planned meal seeded', demo.scans === 2 && demo.favs === 2 && demo.planned === 1);
  check('demo: months of history seeded', demo.histBig);
  check('demo: real data stashed in backup', demo.stashKept && demo.flag);
  check('demo: ?demo=1 stripped from URL', demo.urlClean);
  check('demo: Exit demo row visible in Settings', demo.rowShown);

  // Re-entering with ?demo=1 while active must not overwrite the real stash.
  await page.goto(APP + '?demo=1');
  await page.waitForTimeout(900);
  check('demo: re-entry keeps the original stash', await page.evaluate(() =>
    state.products.length === 9
    && (JSON.parse(localStorage.getItem('kulpio-predemo-backup')).data['kulpio-products'] || '').includes('RestoreMe')));

  await page.evaluate(() => exitDemo());
  await page.waitForTimeout(1200);
  check('demo: exit restores the real fridge and clears scaffolding', await page.evaluate(() =>
    state.products.length === 1 && state.products[0].name === 'RestoreMe'
    && !localStorage.getItem('kulpio-demo') && !localStorage.getItem('kulpio-predemo-backup')));

  console.log(results.join('\n'));
  const realErrors = errors.filter(e =>
    !/net::ERR_FAILED|Failed to load resource|ZXing|service-worker|The play\(\) request/i.test(e));
  console.log(realErrors.length ? 'JS ERRORS:\n' + realErrors.join('\n') : 'no unexpected JS errors');
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) || realErrors.length ? 1 : 0);
})();
