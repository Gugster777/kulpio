// Runtime UI recovery layer for the current app shell.
// Profile/Home panes are lazy-rendered, so this layer uses DOM markers and a
// short retry window instead of relying on one specific render timing.
(function installUiFixes() {
  const originalRenderContent = window.renderContent;
  if (typeof originalRenderContent !== 'function') return;
  const text = key => typeof l === 'function' ? l(key) : key;
  const SUPPORTED_LANGS = new Set(['en','ru','ro','de','fr','es','it','pt','pl','tr','ar','zh','ja','ko','hi','uk']);

  function enforceSupportedLanguages() {
    const select = document.getElementById('langSelect');
    if (select) select.querySelectorAll('option').forEach(option => { const allowed = SUPPORTED_LANGS.has(option.value); option.hidden = !allowed; option.disabled = !allowed; });
    if (typeof currentLang !== 'undefined' && !SUPPORTED_LANGS.has(currentLang)) { currentLang = 'en'; localStorage.setItem('kulpio-lang', 'en'); }
  }

  function currentScanProduct() {
    try { return typeof _scanFound !== 'undefined' ? _scanFound : window._scanFound; } catch { return window._scanFound; }
  }

  function productComparePayload(p) {
    const nut = p && p.nutriments || {};
    return {
      name: String(p?.name || 'Product').trim(), brand: String(p?.brand || '').trim(), img: String(p?.img || '').trim(),
      code: String(p?.code || ('local-' + Math.random().toString(36).slice(2))), grade: String(p?.grade || p?.nutriscore_grade || '').toLowerCase(), nova: Number(p?.nova) || 0,
      kcal: Number.isFinite(Number(p?.kcal)) ? Number(p.kcal) : (Number.isFinite(Number(nut['energy-kcal_100g'])) ? Number(nut['energy-kcal_100g']) : null),
      prot: Number.isFinite(Number(p?.prot)) ? Number(p.prot) : (Number.isFinite(Number(nut.proteins_100g)) ? Number(nut.proteins_100g) : null),
      fat: Number.isFinite(Number(p?.fat)) ? Number(p.fat) : (Number.isFinite(Number(nut.fat_100g)) ? Number(nut.fat_100g) : null),
      carb: Number.isFinite(Number(p?.carb)) ? Number(p.carb) : (Number.isFinite(Number(nut.carbohydrates_100g)) ? Number(nut.carbohydrates_100g) : null),
      adds: Array.isArray(p?.adds) ? p.adds : (Array.isArray(p?.additives) ? p.additives : null),
    };
  }

  function openProductComparePicker() {
    const products = Array.isArray(window.state?.products) ? window.state.products.filter(Boolean) : [];
    if (products.length < 2) return;
    let modal = document.getElementById('homeComparePicker');
    if (!modal) {
      modal = document.createElement('div'); modal.className = 'modal'; modal.id = 'homeComparePicker'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
      modal.innerHTML = '<div class="modal-content" style="max-height:78vh;overflow:auto"><div class="set-head"><h2 style="margin:0">⚖️ <span id="homeCompareTitle"></span></h2><button class="side-panel-close" id="homeCompareClose" style="position:static" aria-label="Close">×</button></div><p class="card-sub" id="homeCompareHint"></p><div id="homeCompareList" style="display:grid;gap:8px"></div><button type="button" class="modal-btn btn-save" id="homeCompareGo" disabled></button></div>';
      document.body.appendChild(modal); modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); }); modal.querySelector('#homeCompareClose').onclick = () => modal.classList.remove('show');
    }
    const list = modal.querySelector('#homeCompareList'), go = modal.querySelector('#homeCompareGo');
    modal.querySelector('#homeCompareTitle').textContent = text('cmpTitle') || 'Compare'; modal.querySelector('#homeCompareHint').textContent = text('cmpHint') || 'Choose 2 products.'; go.textContent = text('cmpTitle') || 'Compare';
    list.innerHTML = products.map((p,i) => '<label style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:12px;cursor:pointer"><input type="checkbox" class="home-cmp-choice" value="'+i+'" style="width:18px;height:18px"><span style="font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(String(p.name||'Product'))+'</span></label>').join('');
    const update = () => { const picked = [...list.querySelectorAll('.home-cmp-choice:checked')]; go.disabled = picked.length !== 2; list.querySelectorAll('.home-cmp-choice').forEach(x => { x.disabled = picked.length >= 2 && !x.checked; }); };
    list.querySelectorAll('.home-cmp-choice').forEach(x => x.addEventListener('change', update));
    go.onclick = () => { const picked = [...list.querySelectorAll('.home-cmp-choice:checked')]; if (picked.length !== 2 || typeof openCmpModal !== 'function') return; modal.classList.remove('show'); openCmpModal(productComparePayload(products[Number(picked[0].value)]), productComparePayload(products[Number(picked[1].value)])); };
    update(); modal.classList.add('show');
  }

  function addCompareButton(row) {
    if (!row || row.querySelector('[data-kulpio-compare]')) return;
    const button = document.createElement('button'); button.type='button'; button.className='fchip filter-btn'; button.dataset.kulpioCompare='1'; button.textContent='⚖️ '+(text('cmpTitle')||'Compare'); button.setAttribute('aria-label','Compare products'); button.onclick=openProductComparePicker; row.appendChild(button);
  }

  function ensureHomeShortcuts() {
    if (typeof currentTab !== 'undefined' && currentTab !== 'home') return;
    const list = document.getElementById('fridgeItems'); if (!list) return;
    const allButton = [...document.querySelectorAll('button')].find(btn => { const label=(btn.textContent||'').replace(/\s+/g,' ').trim().toLowerCase(); return label==='all' || label==='⚙ all' || label.endsWith(' all'); });
    if (allButton?.parentElement) { addCompareButton(allButton.parentElement); return; }
    const filterButton = document.getElementById('filterBtn') || document.getElementById('homeFilterBtn');
    if (filterButton?.parentElement) { addCompareButton(filterButton.parentElement); return; }
    if (document.getElementById('homeQuickTools')) return;
    const row=document.createElement('div'); row.id='homeQuickTools'; row.className='fridge-tools'; row.style.marginBottom='8px'; row.innerHTML='<div class="fridge-row" style="grid-template-columns:minmax(0,1fr) auto auto"><button type="button" class="fchip active filter-btn" id="homeFilterBtn" onclick="toggleFilterMenu()" aria-haspopup="true" aria-controls="filterMenu">⚙ Filter</button><button type="button" class="fchip filter-btn" data-kulpio-compare="1">⚖️ Compare</button></div>'; list.parentElement.insertBefore(row,list); row.querySelector('[data-kulpio-compare]').onclick=openProductComparePicker;
  }

  function ensureProfileActions() {
    const candidates=[...document.querySelectorAll('.card-title,h2,h3,.set-head h2')];
    const title=candidates.find(el=>/kulpio\s+toolkit/i.test(el.textContent||'')); if(!title) return;
    const card=title.closest('.sv-card,.card,section,article,.toolkit-card')||title.parentElement?.parentElement; if(!card||card.dataset.kulpioProfileFixed==='1') return;
    card.dataset.kulpioProfileFixed='1'; card.innerHTML='<div class="card-title">💬 Feedback & insights</div><div class="card-sub">Tell us what to improve and see how your fridge is doing.</div><div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="mini-btn" onclick="openFeedback()">✉ Feedback</button><button type="button" class="mini-btn" onclick="openImpact()">📊 Insights</button><button type="button" class="mini-btn" onclick="openTour()">ⓘ App tour</button></div>';
  }

  function addScanPriceButton() {
    const f=currentScanProduct(), anchor=document.getElementById('scardCrowd')||document.getElementById('scardPrice'); if(!anchor||!f||document.getElementById('scardAddPriceBtn')) return;
    const wrap=document.createElement('div'); wrap.id='scardPriceActions'; wrap.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;'; const btn=document.createElement('button'); btn.type='button'; btn.id='scardAddPriceBtn'; btn.className='mini-btn'; btn.textContent='＋ Add price'; btn.onclick=()=>openScanPriceDialog(currentScanProduct()); wrap.appendChild(btn); anchor.parentElement.insertBefore(wrap,anchor.nextSibling);
  }

  function openScanPriceDialog(f) {
    if(!f) return;
    let modal=document.getElementById('scanPriceModal');
    if(!modal){ modal=document.createElement('div'); modal.className='modal'; modal.id='scanPriceModal'; modal.setAttribute('role','dialog'); modal.innerHTML='<div class="modal-content" style="max-width:430px"><div class="set-head"><h2 style="margin:0">💳 Add price</h2><button class="side-panel-close" id="scanPriceClose" style="position:static" aria-label="Close">×</button></div><p class="card-sub" id="scanPriceProduct"></p><label class="field-label">Store<input id="scanPriceStore" class="text-input" maxlength="80"></label><label class="field-label">Price<input id="scanPriceValue" class="text-input" inputmode="decimal" type="number" min="0.01" step="0.01"></label><button type="button" class="modal-btn btn-save" id="scanPriceSave">Save price</button></div>'; document.body.appendChild(modal); modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');}); modal.querySelector('#scanPriceClose').onclick=()=>modal.classList.remove('show'); modal.querySelector('#scanPriceSave').onclick=async()=>{const product=modal._product,store=modal.querySelector('#scanPriceStore').value.trim(),price=parseFloat(modal.querySelector('#scanPriceValue').value); if(!product||!store||!(price>0))return; if(typeof recordPrice==='function'){recordPrice(product.name,store,price);if(typeof saveState==='function')saveState();} const url=typeof aiProxyUrl==='function'?aiProxyUrl():''; if(url&&navigator.onLine&&product.code)try{await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({priceLog:{code:product.code,store,price,cur:currentCurrency,uid:typeof scanUid!=='undefined'?scanUid:''}})});}catch{} modal.classList.remove('show'); if(typeof queueCrowdPrices==='function')try{if(window._crowdCache)delete window._crowdCache[product.code];queueCrowdPrices(product);}catch{};}; }
    modal._product=f; modal.querySelector('#scanPriceProduct').textContent=String(f.name||'Product'); modal.querySelector('#scanPriceStore').value=String(f.store||''); modal.querySelector('#scanPriceValue').value=''; modal.classList.add('show');
  }

  let refreshQueued=false;
  function refreshUi(){ if(refreshQueued)return; refreshQueued=true; setTimeout(()=>{refreshQueued=false; enforceSupportedLanguages(); ensureHomeShortcuts(); ensureProfileActions(); addScanPriceButton();},0); }
  window.renderContent=function(...args){const result=originalRenderContent.apply(this,args);refreshUi();return result;};
  const observer=new MutationObserver(refreshUi); observer.observe(document.body,{childList:true,subtree:true});
  const retryUntil=Date.now()+5000; const retry=()=>{refreshUi();if(Date.now()<retryUntil)setTimeout(retry,250);}; retry();
  window.openProductComparePicker=openProductComparePicker; window.openScanPriceDialog=openScanPriceDialog;
})();
