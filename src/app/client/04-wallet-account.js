// Source section: 04-wallet-account.js
// ─── LOYALTY CARDS (wallet) ──────────────────────────────────────
// Store the barcodes off the back of shop loyalty/discount cards and redraw
// them full-bright to show at the till — no library, the barcodes are drawn
// straight to SVG. Code 128 covers any card; EAN-13/8 match grocery cards so
// the till's scanner reads the right symbology.
const CARD_COLORS = ['#3a7d44', '#1f6feb', '#8250df', '#d1242f', '#bf8700', '#1b7f79', '#20242b'];
// Code 128 module-width patterns, values 0-106 (last three are Start A/B/C,
// then Stop). Each digit is a run length; bars and spaces alternate, bar first.
const C128 = "212222,222122,222221,121223,121322,131222,122213,122312,132212,221213,221312,231212,112232,122132,122231,113222,123122,123221,223211,221132,221231,213212,223112,312131,311222,321122,321221,312212,322112,322211,212123,212321,232121,111323,131123,131321,112313,132113,132311,211313,231113,231311,112133,112331,132131,113123,113321,133121,313121,211331,231131,213113,213311,213131,311123,311321,331121,312113,312311,332111,314111,221411,431111,111224,111422,121124,121421,141122,141221,112214,112412,122114,122411,142112,142211,241211,221114,413111,241112,134111,111242,121142,121241,114212,124112,124211,411212,421112,421211,212141,214121,412121,111143,111341,131141,114113,114311,411113,411311,113141,114131,311141,411131,211412,211214,211232,2331112".split(",");
function widthsToBits(p) {
  let bits = '', bar = true;
  for (const w of p) { bits += (bar ? '1' : '0').repeat(+w); bar = !bar; }
  return bits;
}
function bcCode128(data) {
  data = String(data);
  if (!data) return null;
  const codes = [];
  if (/^\d+$/.test(data) && data.length >= 2) {
    codes.push(105);   // Start C — two digits per symbol keeps it narrow
    let s = data;
    while (s.length >= 2) { codes.push(parseInt(s.slice(0, 2), 10)); s = s.slice(2); }
    if (s.length === 1) { codes.push(100); codes.push(s.charCodeAt(0) - 32); }   // switch to B for the odd tail
  } else {
    codes.push(104);   // Start B
    for (const ch of data) { let v = ch.charCodeAt(0) - 32; if (v < 0 || v > 95) v = 31; codes.push(v); }
  }
  let sum = codes[0];
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  codes.push(sum % 103);   // checksum
  codes.push(106);         // Stop
  return codes.map(c => widthsToBits(C128[c])).join('');
}
const EAN_L = { '0':'0001101','1':'0011001','2':'0010011','3':'0111101','4':'0100011','5':'0110001','6':'0101111','7':'0111011','8':'0110111','9':'0001011' };
const EAN_G = { '0':'0100111','1':'0110011','2':'0011011','3':'0100001','4':'0011101','5':'0111001','6':'0000101','7':'0010001','8':'0001001','9':'0010111' };
const EAN_R = { '0':'1110010','1':'1100110','2':'1101100','3':'1000010','4':'1011100','5':'1001110','6':'1010000','7':'1000100','8':'1001000','9':'1110100' };
const EAN_PAR = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
function eanCheck(d) {   // works for both EAN-13 (12 digits) and EAN-8 (7)
  let sum = 0; const rev = d.split('').reverse();
  for (let i = 0; i < rev.length; i++) sum += (+rev[i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}
function bcEAN13(data) {
  let d = String(data).replace(/\D/g, '');
  if (d.length === 12) d += eanCheck(d);
  if (d.length !== 13) return null;
  const par = EAN_PAR[+d[0]];
  let bits = '101';
  for (let i = 0; i < 6; i++) bits += (par[i] === 'L' ? EAN_L : EAN_G)[d[1 + i]];
  bits += '01010';
  for (let i = 0; i < 6; i++) bits += EAN_R[d[7 + i]];
  return bits + '101';
}
function bcEAN8(data) {
  let d = String(data).replace(/\D/g, '');
  if (d.length === 7) d += eanCheck(d);
  if (d.length !== 8) return null;
  let bits = '101';
  for (let i = 0; i < 4; i++) bits += EAN_L[d[i]];
  bits += '01010';
  for (let i = 0; i < 4; i++) bits += EAN_R[d[4 + i]];
  return bits + '101';
}
// Pick a symbology from the digits when the user leaves it on "auto".
function autoFmt(code) {
  const d = String(code).replace(/\D/g, '');
  if (d.length === 13 && d === String(code).trim()) return 'ean13';
  if (d.length === 12) return 'ean13';   // UPC-A → padded to EAN-13
  if (d.length === 8) return 'ean8';
  return 'code128';
}
// Resolve {code, fmt} to a module bit-string, honouring an explicit format.
function cardBits(code, fmt) {
  const raw = String(code || '').trim();
  if (!raw) return { bits: null, fmt };
  let f = (fmt && fmt !== 'auto') ? fmt : autoFmt(raw);
  if (f === 'ean13') {
    let d = raw.replace(/\D/g, '');
    if (d.length === 12) d = '0' + d;   // UPC-A becomes a valid EAN-13
    const bits = bcEAN13(d);
    return bits ? { bits, fmt: 'ean13' } : { bits: bcCode128(raw), fmt: 'code128' };
  }
  if (f === 'ean8') {
    const bits = bcEAN8(raw);
    return bits ? { bits, fmt: 'ean8' } : { bits: bcCode128(raw), fmt: 'code128' };
  }
  return { bits: bcCode128(raw), fmt: 'code128' };
}
// Draw a bit-string as crisp black bars on white — vector, so it scales to
// whatever width the phone gives it without blurring.
function barcodeSVG(bits) {
  if (!bits) return '';
  const mw = 2, h = 90, quiet = 12 * mw, W = bits.length * mw + quiet * 2;
  let rects = '';
  for (let i = 0; i < bits.length;) {
    if (bits[i] === '1') { let j = i; while (j < bits.length && bits[j] === '1') j++; rects += `<rect x="${quiet + i * mw}" y="0" width="${(j - i) * mw}" height="${h}"/>`; i = j; }
    else i++;
  }
  return `<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="barcode"><rect x="0" y="0" width="${W}" height="${h}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}
function formatCardNum(code) {
  const s = String(code || '').replace(/\s+/g, '');
  return /^\d+$/.test(s) ? s.replace(/(.{4})/g, '$1 ').trim() : s;
}

let _walletMode = 'list';
let _cardDraft = null;
let _cardScan = null;   // set while the camera is capturing a card number

// ── ACHIEVEMENTS PAGE ── the whole badge board on its own screen, opened
// from the Profile row. Tapping a badge still makes the pear explain it.
function openAchievements() {
  const gotN = BADGES.filter(b => state.badges && state.badges[b.id]).length;
  document.getElementById('achModalT').textContent = l('achTitle');
  document.getElementById('achModalSub').textContent = gotN + ' / ' + BADGES.length;
  document.getElementById('achModalBody').innerHTML = `<div class="badge-grid">${BADGES.map(badgeHtml).join('')}</div>`;
  ensureOverlayHistory();
  document.getElementById('achModal').classList.add('show');
}
function closeAchievements() { document.getElementById('achModal').classList.remove('show'); }

// ── ACCOUNT (sign in / create / customise) + CLOUD SYNC ───────────
// Avatars unlock as you level up, so the picker doubles as a reward. Each tier
// lists the emoji that become available at its level.
const AVATAR_TIERS = [
  { lvl: 1, list: ['🍐', '🧑‍🍳', '🥑', '🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🥝', '🥕', '🥦', '🌽', '🍄', '🧀', '🍅', '🥐', '🍞', '🥚', '🍯', '🫐', '🍑', '🍒', '🥥', '🍆', '🥬', '🫑', '🍿'] },
  { lvl: 3, list: ['🐻', '🐱', '🦊', '🐰', '🐼', '🐨', '🐸', '🦉', '🐷', '🐮', '🐧', '🐝', '🐢', '🐙', '🦔', '🐳', '🦩', '🦫'] },
  { lvl: 6, list: ['🌟', '⭐', '💚', '🌈', '🔥', '🌸', '🍀', '🌻', '🌙', '⚡', '❄️', '🎈', '🪴', '🧊'] },
  { lvl: 10, list: ['👑', '🦄', '🐉', '🏆', '💎', '🚀', '🎃', '🦚'] },
];
const AVATARS = AVATAR_TIERS.flatMap(t => t.list);
function avatarMinLevel(e) { for (const t of AVATAR_TIERS) if (t.list.includes(e)) return t.lvl; return 1; }
let _authMode = 'login', _accountAvatar = '';
let _resetToken = '';
function openAuth(mode) {
  _authMode = (mode === 'signup' || mode === 'manage' || mode === 'changepass' || mode === 'forgot' || mode === 'reset') ? mode : 'login';
  if (_authMode === 'manage') { try { _accountAvatar = (authUser && authUser.avatar) || localStorage.getItem('kulpio-avatar') || ''; } catch { _accountAvatar = (authUser && authUser.avatar) || ''; } }
  renderAuth();
  ensureOverlayHistory();
  document.getElementById('authModal').classList.add('show');
  if (_authMode !== 'manage') setTimeout(() => { const i = document.getElementById('authEmail'); if (i) i.focus(); }, 60);
}
function closeAuth() {
  document.getElementById('authModal').classList.remove('show');
  if (_pendingTour) { _pendingTour = false; _afterWelcome(); }   // first-run: guide follows the account step
}
function authToggleMode() { _authMode = _authMode === 'login' ? 'signup' : 'login'; renderAuth(); }
function showAuthMsg(t, ok) {
  const m = document.getElementById('authMsg');
  if (!m) return;
  m.textContent = t; m.className = 'auth-msg' + (ok ? ' ok' : ''); m.style.display = t ? '' : 'none';
}
function renderAuth() {
  const card = document.querySelector('#authModal .auth-card');
  const providers = document.getElementById('authProviders');
  const orRow = document.querySelector('#authModal .auth-or');
  const form = document.getElementById('authForm');
  const toggle = document.getElementById('authToggle');

  if (_authMode === 'forgot') {
    // Request a reset link by email (needs the worker's mail configured).
    document.getElementById('authTitle').textContent = l('authReset');
    paintAvatar(document.querySelector('#authModal .auth-pear'), '🔑');
    providers.style.display = 'none'; orRow.style.display = 'none'; toggle.style.display = 'none';
    form.innerHTML = `
      <input id="fpEmail" type="email" autocomplete="email" inputmode="email" placeholder="${esc(l('authEmail'))}">
      <div class="auth-msg" id="authMsg" style="display:none"></div>
      <button type="button" class="auth-submit" onclick="forgotSubmit()">${esc(l('authSendLink'))}</button>
      <div class="auth-data-row">
        <button type="button" class="mini-btn" onclick="openAuth('login')">← ${esc(l('authSignIn'))}</button>
      </div>`;
    setTimeout(() => { const i = document.getElementById('fpEmail'); if (i) i.focus(); }, 60);
    return;
  }

  if (_authMode === 'reset') {
    // Set a new password from the emailed link's token (_resetToken).
    document.getElementById('authTitle').textContent = l('authReset');
    paintAvatar(document.querySelector('#authModal .auth-pear'), '🔑');
    providers.style.display = 'none'; orRow.style.display = 'none'; toggle.style.display = 'none';
    form.innerHTML = `
      <input id="rpNew" type="password" autocomplete="new-password" placeholder="${esc(l('authNewPass'))}">
      <div class="auth-msg" id="authMsg" style="display:none"></div>
      <button type="button" class="auth-submit" onclick="resetSubmit()">${esc(l('authReset'))}</button>`;
    setTimeout(() => { const i = document.getElementById('rpNew'); if (i) i.focus(); }, 60);
    return;
  }

  if (_authMode === 'changepass') {
    // Change your own password — no email needed. Verifies the current one on
    // the server, then signs out every other device.
    document.getElementById('authTitle').textContent = l('authChangePass');
    paintAvatar(document.querySelector('#authModal .auth-pear'), '🔑');
    providers.style.display = 'none'; orRow.style.display = 'none'; toggle.style.display = 'none';
    form.innerHTML = `
      <input id="cpCurrent" type="password" autocomplete="current-password" placeholder="${esc(l('authCurrentPass'))}">
      <input id="cpNew" type="password" autocomplete="new-password" placeholder="${esc(l('authNewPass'))}">
      <div class="auth-msg" id="authMsg" style="display:none"></div>
      <button type="button" class="auth-submit" onclick="changePassSubmit()">${esc(l('authChangePass'))}</button>
      <div class="auth-data-row">
        <button type="button" class="mini-btn" onclick="openAuth('manage')">← ${esc(l('authAccount'))}</button>
      </div>`;
    setTimeout(() => { const i = document.getElementById('cpCurrent'); if (i) i.focus(); }, 60);
    return;
  }

  if (_authMode === 'manage') {
    // Edit your profile — works with or without an account. Avatars unlock by
    // level; the footer offers sign-in (local) or sync + sign-out (signed in).
    const myLvl = playerLevel();
    document.getElementById('authTitle').textContent = l('profile');
    paintAvatar(document.querySelector('#authModal .auth-pear'), _accountAvatar, profileName());
    providers.style.display = 'none'; orRow.style.display = 'none'; toggle.style.display = 'none';
    const avatarBtns = AVATARS.map(a => {
      const need = avatarMinLevel(a);
      const locked = myLvl < need;
      return locked
        ? `<button type="button" class="auth-av locked" disabled title="${esc(l('lvlTitle'))} ${need}"><span class="av-lock">🔒</span><span class="av-lv">${need}</span></button>`
        : `<button type="button" class="auth-av${a === _accountAvatar ? ' on' : ''}" onclick="pickAvatar('${a}')">${a}</button>`;
    }).join('');
    const footer = authUser ? `
      <div class="auth-email-ro">${esc(authUser.email || '')}</div>
      <div class="auth-sync">
        <button type="button" class="auth-sync-btn" id="authSyncBtn" onclick="syncNow()">🔄 ${esc(l('authSyncNow'))}</button>
        <span class="auth-sync-info" id="authSyncInfo">${esc(lastSyncLabel())}</span>
      </div>
      <div class="auth-msg" id="authMsg" style="display:none"></div>
      <button type="button" class="auth-submit" onclick="authUpdate()">${esc(l('authSave'))}</button>
      <div class="auth-data-row">
        <button type="button" class="mini-btn" onclick="openAuth('changepass')">🔑 ${esc(l('authChangePass'))}</button>
        <button type="button" class="mini-btn" onclick="authSignOut();closeAuth()">${esc(l('authSignOut'))}</button>
      </div>
      <button type="button" class="auth-danger" onclick="authDeleteAccount()">🗑️ ${esc(l('deleteAccount'))}</button>`
      : `
      <div class="auth-msg" id="authMsg" style="display:none"></div>
      <button type="button" class="auth-submit" onclick="authUpdate()">${esc(l('authSave'))}</button>
      <div class="auth-data-row">
        <button type="button" class="mini-btn" onclick="openAuth('login')">🔒 ${esc(l('authSignInSync'))}</button>
      </div>`;
    // Device backup lives with the account (not in Settings): export the whole
    // fridge to a JSON file, or restore it — works with or without an account.
    const backup = `
      <div class="auth-backup" role="group" aria-label="${esc(l('exportData'))} / ${esc(l('importData'))}">
        <button type="button" class="mini-btn" onclick="exportData()">💾 ${esc(l('exportData'))}</button>
        <button type="button" class="mini-btn" onclick="document.getElementById('importInput').click()">📥 ${esc(l('importData'))}</button>
      </div>
      <input type="file" id="importInput" accept="application/json,.json" style="display:none" onchange="importData(this)">`;
    form.innerHTML = `
      <div class="auth-avatars" id="authAvatars">${avatarBtns}</div>
      <input id="authName" type="text" autocomplete="name" maxlength="40" placeholder="${esc(l('authName'))}" value="${esc(profileName())}" oninput="if(!_accountAvatar)paintAvatar(document.querySelector('#authModal .auth-pear'),'',this.value)">
      <input id="authStatus" type="text" maxlength="60" placeholder="${esc(l('authStatus'))}" value="${esc(profileStatus())}">
      ${footer}
      ${backup}`;
    return;
  }

  const signup = _authMode === 'signup';
  providers.style.display = ''; orRow.style.display = ''; toggle.style.display = '';
  paintAvatar(document.querySelector('#authModal .auth-pear'), '🍐');
  form.innerHTML = `
    <input id="authEmail" type="email" autocomplete="email" inputmode="email" placeholder="${esc(l('authEmail'))}">
    <input id="authPass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${esc(l('authPassword'))}">
    <div class="auth-msg" id="authMsg" style="display:none"></div>
    <button type="submit" class="auth-submit" id="authSubmitBtn">${esc(signup ? l('authCreate') : l('authSignIn'))}</button>
    ${signup ? '' : `<button type="button" class="auth-forgot" onclick="openAuth('forgot')">${esc(l('authForgot'))}</button>`}`;
  document.getElementById('authTitle').textContent = signup ? l('authCreate') : l('authSignIn');
  toggle.textContent = signup ? l('authHaveAcct') : l('authNoAcct');
  document.getElementById('authOr').textContent = l('authOr');
  // Google's OFFICIAL rendered button (popup UX) is the reliable path on
  // desktop — One Tap (google.accounts.id.prompt) is silently suppressed there
  // by FedCM / third-party-cookie rules. The custom button stays as a fallback
  // for when the GIS script can't load (offline); it's hidden once the real
  // button mounts.
  providers.innerHTML = `
    <div id="gsiHost" class="gsi-host"></div>
    <button type="button" id="gsiFallback" class="auth-prov auth-google" onclick="authProvider('google')"><span>G</span> ${esc(l('authGoogle'))}</button>`;
  mountGoogleButton();
}
// Render Google's official Sign-In button into the auth modal. It opens the
// standard OAuth popup on click and returns a signed ID token to the same
// callback the worker already verifies — reliable on PC and mobile alike.
async function mountGoogleButton() {
  const cid = AUTH_GOOGLE_CLIENT_ID;
  const host = document.getElementById('gsiHost');
  if (!cid || !host) return;
  try {
    await loadScript('https://accounts.google.com/gsi/client');
    if (!(window.google && google.accounts && google.accounts.id)) return;
    if (!document.getElementById('gsiHost')) return;   // modal closed while loading
    google.accounts.id.initialize({
      client_id: cid,
      callback: (resp) => authOauthComplete('google', resp && resp.credential),
      ux_mode: 'popup',
      auto_select: false,
    });
    host.innerHTML = '';
    google.accounts.id.renderButton(host, {
      type: 'standard', theme: currentTheme === 'light' ? 'outline' : 'filled_black',
      size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'left', width: 300,
    });
    const fb = document.getElementById('gsiFallback');
    if (fb) fb.style.display = 'none';   // real button is up — hide the fallback
  } catch { /* GIS couldn't load (offline) — leave the fallback button visible */ }
}
function pickAvatar(a) {
  if (playerLevel() < avatarMinLevel(a)) return;   // still locked at this level
  _accountAvatar = _accountAvatar === a ? '' : a;
  document.querySelectorAll('#authAvatars .auth-av').forEach(b => b.classList.toggle('on', b.textContent === _accountAvatar));
  paintAvatar(document.querySelector('#authModal .auth-pear'), _accountAvatar, profileName());
}
async function authSubmit(e) {
  if (e) e.preventDefault();
  const email = (document.getElementById('authEmail').value || '').trim();
  const pass = document.getElementById('authPass').value || '';
  if (!email || !pass) { showAuthMsg(l('authFill')); return; }
  if (_authMode === 'signup' && pass.length < 8) { showAuthMsg(l('authWeak')); return; }
  const url = aiProxyUrl();
  if (!url) { showAuthMsg(l('authOffline')); return; }
  const btn = document.getElementById('authSubmitBtn');
  btn.disabled = true; showAuthMsg(l('authWorking'), true);
  const op = _authMode === 'signup' ? { signup: { email, pass } } : { login: { email, pass } };
  const r = await postJSON(url, { auth: op }, 15000);
  btn.disabled = false;
  if (r && r.token) {
    authToken = r.token; authUser = r.user || { email }; saveAuth();
    closeAuth(); refreshAuthUi();
    pearReact && pearReact('hop', null, '👋', 900);
    authPull();
  } else {
    const err = r && r.error;
    showAuthMsg(err === 'exists' ? l('authExists') : err === 'bad creds' ? l('authBadCreds')
      : err === 'rate' ? l('authTooMany')
      : err === 'weak pass' ? l('authWeak') : err === 'bad email' ? l('authBadEmail') : l('authFailed'));
  }
}
function authProvider(which) {
  // Google needs a (free, public) client id set in AUTH_GOOGLE_CLIENT_ID;
  // until then the button explains itself instead of failing silently.
  if (which !== 'google') return;
  const cid = AUTH_GOOGLE_CLIENT_ID;
  if (!cid) { showAuthMsg(l('authProviderOff')); return; }
  showAuthMsg(l('authWorking'), true);
  authGoogleFlow(cid).catch(() => showAuthMsg(l('authFailed')));
}
// Load an external SDK on demand (only when a provider button is actually used).
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some(s => s.src === src)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('sdk'));
    document.head.appendChild(s);
  });
}
// Google Identity Services → a signed ID token our worker verifies.
async function authGoogleFlow(cid) {
  await loadScript('https://accounts.google.com/gsi/client');
  if (!(window.google && google.accounts && google.accounts.id)) { showAuthMsg(l('authFailed')); return; }
  google.accounts.id.initialize({
    client_id: cid,
    callback: (resp) => authOauthComplete('google', resp && resp.credential),
  });
  google.accounts.id.prompt((n) => {
    if (n && (n.isNotDisplayed && n.isNotDisplayed() || n.isSkippedMoment && n.isSkippedMoment())) showAuthMsg(l('authFailed'));
  });
}
async function authOauthComplete(which, idToken) {
  if (!idToken) { showAuthMsg(l('authFailed')); return; }
  const url = aiProxyUrl();
  if (!url) { showAuthMsg(l('authOffline')); return; }
  const r = await postJSON(url, { auth: { [which]: { idToken } } }, 15000);
  if (r && r.token) {
    authToken = r.token; authUser = r.user || null; saveAuth();
    closeAuth(); refreshAuthUi(); pearReact && pearReact('hop', null, '👋', 900); authPull();
  } else {
    showAuthMsg(r && r.error === 'provider off' ? l('authProviderOff') : l('authFailed'));
  }
}
// Save the profile (display name + avatar + status). Always stored locally so
// it works without an account; also pushed to the server when signed in.
async function authUpdate() {
  const name = ((document.getElementById('authName') || {}).value || '').trim().slice(0, 60);
  const avatar = _accountAvatar || (authUser && authUser.avatar) || '';
  const status = ((document.getElementById('authStatus') || {}).value || '').trim().slice(0, 60);
  try {
    if (name) localStorage.setItem('kulpio-name', name); else localStorage.removeItem('kulpio-name');
    if (avatar) localStorage.setItem('kulpio-avatar', avatar); else localStorage.removeItem('kulpio-avatar');
    if (status) localStorage.setItem('kulpio-status', status); else localStorage.removeItem('kulpio-status');
  } catch {}
  _houseMemberDirty = true; houseMaybePush();   // my shared-fridge card reflects the new name/avatar
  const url = aiProxyUrl();
  if (!authToken || !url) { refreshAuthUi(); closeAuth(); return; }   // local-only profile: done
  showAuthMsg(l('authWorking'), true);
  const r = await postJSON(url, { auth: { update: { token: authToken, name, avatar } } }, 12000);
  if (r && r.user) { authUser = r.user; saveAuth(); refreshAuthUi(); closeAuth(); }
  else showAuthMsg(l('authFailed'));
}
// Change the account password. No email involved: the server re-checks the
// current password, then rotates the hash and drops the other sessions.
async function changePassSubmit() {
  const current = (document.getElementById('cpCurrent') || {}).value || '';
  const next = (document.getElementById('cpNew') || {}).value || '';
  if (next.length < 8) { showAuthMsg(l('authWeak')); return; }
  const url = aiProxyUrl();
  if (!authToken || !url) { showAuthMsg(l('authOffline')); return; }
  showAuthMsg(l('authWorking'), true);
  const r = await postJSON(url, { auth: { changePass: { token: authToken, current, next } } }, 12000);
  if (r && r.ok) {
    if (typeof toast === 'function') toast(l('authPassChanged'));
    openAuth('manage');
  } else {
    const e = r && r.error;
    showAuthMsg(e === 'bad creds' ? l('authBadCreds') : e === 'weak pass' ? l('authWeak')
      : e === 'no password' ? l('authNoPass') : l('authFailed'));
  }
}
// Forgot password: ask the server to email a reset link. The reply is the same
// whether or not the email exists (anti-enumeration).
async function forgotSubmit() {
  const email = ((document.getElementById('fpEmail') || {}).value || '').trim();
  if (!email) { showAuthMsg(l('authBadEmail')); return; }
  const url = aiProxyUrl();
  if (!url) { showAuthMsg(l('authOffline')); return; }
  showAuthMsg(l('authWorking'), true);
  const r = await postJSON(url, { auth: { resetRequest: { email } } }, 12000);
  if (r && r.ok) showAuthMsg(l('authResetSent'), true);
  else showAuthMsg(r && r.error === 'mail off' ? l('authMailOff') : l('authFailed'));
}
// Reset password: set a new one from the emailed link's token.
async function resetSubmit() {
  const next = (document.getElementById('rpNew') || {}).value || '';
  if (next.length < 8) { showAuthMsg(l('authWeak')); return; }
  const url = aiProxyUrl();
  if (!url) { showAuthMsg(l('authOffline')); return; }
  showAuthMsg(l('authWorking'), true);
  const r = await postJSON(url, { auth: { resetConfirm: { token: _resetToken, next } } }, 12000);
  if (r && r.ok) { _resetToken = ''; if (typeof toast === 'function') toast(l('authResetDone')); openAuth('login'); }
  else showAuthMsg(r && r.error === 'weak pass' ? l('authWeak') : l('authLinkBad'));
}
// Handle the two links Kulpio emails: ?reset=TOKEN opens the reset form;
// ?verify=TOKEN confirms the address. Called once on load; the param is
// stripped so a refresh doesn't re-trigger it.
async function handleAuthLinks() {
  let q;
  try { q = new URLSearchParams(location.search); } catch { return; }
  const reset = q.get('reset'), verify = q.get('verify');
  if (!reset && !verify) return;
  try { const u = new URL(location.href); u.searchParams.delete('reset'); u.searchParams.delete('verify'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch {}
  if (reset) { _resetToken = reset; openAuth('reset'); return; }
  if (verify) {
    const url = aiProxyUrl();
    if (!url) return;
    const r = await postJSON(url, { auth: { verifyEmail: { token: verify } } }, 12000);
    if (typeof toast === 'function') toast(r && r.ok ? l('authVerified') : l('authLinkBad'));
    if (r && r.ok && authUser) { authUser.verified = true; saveAuth(); }
  }
}
function saveAuth() {
  if (authToken) localStorage.setItem('kulpio-token', authToken); else localStorage.removeItem('kulpio-token');
  if (authUser) localStorage.setItem('kulpio-user', JSON.stringify(authUser)); else localStorage.removeItem('kulpio-user');
}
async function authSignOut() {
  const url = aiProxyUrl();
  if (url && authToken) postJSON(url, { auth: { logout: { token: authToken } } }, 8000);
  authToken = ''; authUser = null; saveAuth(); refreshAuthUi();
  // Local data stays on the device — signing out never wipes the fridge.
}
// GDPR portability is served by "Export backup" (see exportData) — one JSON
// with everything the app holds, and it restores via "Import backup".
// GDPR: erasure — delete the account + synced data on the server, then wipe the
// account identity locally. (The fridge on this device is yours; clear it via
// Settings if you want it gone too.)
async function authDeleteAccount() {
  if (!confirm(l('deleteConfirm'))) return;
  const url = aiProxyUrl();
  if (url && authToken) { try { await postJSON(url, { auth: { deleteAccount: { token: authToken, uid: scanUid } } }, 15000); } catch {} }
  authToken = ''; authUser = null; saveAuth();
  try { ['kulpio-name', 'kulpio-avatar', 'kulpio-status', 'kulpio-lastsync'].forEach(k => localStorage.removeItem(k)); } catch {}
  closeAuth(); refreshAuthUi();
  if (typeof toast === 'function') toast(l('accountDeleted'));
}
function profileStatus() { try { return localStorage.getItem('kulpio-status') || ''; } catch { return ''; } }
// Identity works with OR without an account: the signed-in account wins, but a
// local name/avatar lets anyone have a profile (and syncs up if they sign in).
function profileName() { try { return (authUser && authUser.name) || localStorage.getItem('kulpio-name') || ''; } catch { return (authUser && authUser.name) || ''; } }
function profileAvatar() { try { return (authUser && authUser.avatar) || localStorage.getItem('kulpio-avatar') || '👤'; } catch { return (authUser && authUser.avatar) || '👤'; } }
// ── GENERATED AVATAR ──────────────────────────────────────────────
// No image backend and no photo uploads here, so when you haven't picked an
// emoji avatar we *generate* a profile picture in the browser: a solid colour
// keyed to your name (stable and personal) with your initial on top.
// Deterministic, offline and free — a real pfp instead of a grey 👤 placeholder.
// The ink (black/white) is chosen by the colour's luminance so the letter always
// clears WCAG AA (≥4.5) on every hue — a fixed white letter fell to ~1.5:1 on
// yellows. Picking an emoji still overrides it (level-unlock avatars stay a reward).
function rawAvatar() { try { return (authUser && authUser.avatar) || localStorage.getItem('kulpio-avatar') || ''; } catch { return (authUser && authUser.avatar) || ''; } }
function avatarHue(seed) { let h = 2166136261; const s = String(seed || 'kulpio'); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 360; }
function avatarBg(seed) { return `hsl(${avatarHue(seed)},62%,52%)`; }
// Relative luminance of the avatar colour hsl(h,62%,52%), for the ink choice.
function avatarLum(h) {
  const s = 0.62, l = 0.52, a = s * Math.min(l, 1 - l), k = n => (n + h / 30) % 12;
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const lin = v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
}
function avatarInk(seed) { const L = avatarLum(avatarHue(seed)); return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? '#000' : '#fff'; }
function avatarInitial(name) { const n = String(name || '').trim(); if (!n) return '🍐'; const c = Array.from(n)[0]; return /[\p{L}\p{N}]/u.test(c) ? c.toUpperCase() : c; }
// Paint an existing circular element as either the picked emoji or the
// generated solid-colour + initial pfp.
function paintAvatar(el, emoji, name) {
  if (!el) return;
  if (emoji) { el.textContent = emoji; el.style.background = ''; el.style.color = ''; el.classList.remove('gen'); }
  else { el.textContent = avatarInitial(name); el.style.background = avatarBg(name || 'kulpio'); el.style.color = avatarInk(name || 'kulpio'); el.classList.add('gen'); }
}
// The same thing as an HTML string, for template literals.
function avatarSpan(cls, emoji, name) {
  return emoji
    ? `<span class="${cls}" aria-hidden="true">${esc(emoji)}</span>`
    : `<span class="${cls} gen" aria-hidden="true" style="background:${avatarBg(name || 'kulpio')};color:${avatarInk(name || 'kulpio')}">${esc(avatarInitial(name))}</span>`;
}
function refreshAuthUi() {
  // The account row now lives on the Profile tab; update it in place if shown,
  // otherwise a full re-render picks up the new state next time it opens.
  const lbl = document.getElementById('profAccountLbl');
  const sub = document.getElementById('profAccountSub');
  const av = document.querySelector('#profAccountBtn .ma-avatar');
  paintAvatar(av, rawAvatar(), profileName());
  if (lbl) lbl.textContent = profileName() || (authUser ? authUser.email : l('authAccount'));
  if (sub) sub.textContent = authUser ? (profileStatus() || l('authSyncing')) : (profileStatus() || l('authSignInSync'));
  if (currentTab === 'profile') renderContent();
}
function accountTap() {
  openAuth('manage');   // edit profile (works locally); sign-in is offered inside
}
// The Profile account card — shown in every Profile state (including a fresh,
// empty "without account" install) so signing in is always reachable there.
function accountCardHtml(lvl) {
  const acctSub = authUser ? (profileStatus() || l('authSyncing')) : (profileStatus() || l('authSignInSync'));
  const chip = lvl ? `<span class="lvl-chip" title="${esc(l('lvlTitle'))} ${lvl}">${lvlTierEmoji(lvl)} ${lvl}</span>` : '';
  return `<button type="button" class="action-card menu-account" id="profAccountBtn" onclick="accountTap()">
    ${avatarSpan('ma-avatar', rawAvatar(), profileName())}
    <span class="ma-text">
      <span class="ma-name" id="profAccountLbl">${esc(profileName() || (authUser ? authUser.email : l('authAccount')))}</span>
      <span class="ma-sub" id="profAccountSub">${esc(acctSub)}</span>
    </span>
    ${chip}
  </button>`;
}

// ── cloud sync ── the account's data blob follows it across devices.
let _applyingSync = false, _authPushT = null;
function syncEnvelope() {
  return {
    products: state.products, shopping: state.shopping, history: state.history,
    saved: state.saved, wasted: state.wasted, usedCount: state.usedCount,
    badges: state.badges, cards: state.cards, priceBook: state.priceBook,
    firstUse: state.firstUse, lastWaste: state.lastWaste,
    bestStreak: state.bestStreak, scanCount: state.scanCount, v: 1,
  };
}
function applySyncEnvelope(d) {
  if (!d || typeof d !== 'object') return;
  _applyingSync = true;
  if (Array.isArray(d.products)) state.products = d.products;
  if (Array.isArray(d.shopping)) state.shopping = d.shopping;
  if (Array.isArray(d.history)) state.history = d.history;
  if (typeof d.saved === 'number') state.saved = d.saved;
  if (typeof d.wasted === 'number') state.wasted = d.wasted;
  if (typeof d.usedCount === 'number') state.usedCount = d.usedCount;
  if (d.badges && typeof d.badges === 'object') state.badges = d.badges;
  if (Array.isArray(d.cards)) state.cards = d.cards;
  if (d.priceBook && typeof d.priceBook === 'object') state.priceBook = d.priceBook;
  if (d.firstUse) state.firstUse = d.firstUse;
  if (d.lastWaste !== undefined) state.lastWaste = d.lastWaste;
  if (typeof d.bestStreak === 'number') state.bestStreak = d.bestStreak;
  if (typeof d.scanCount === 'number') state.scanCount = d.scanCount;
  saveState();
  _applyingSync = false;
  refreshFreshness();
  renderContent();
}
// Remember when we last exchanged data with the cloud, so the account row and
// the manage sheet can tell the user sync is really happening.
let _lastSync = (() => { try { return parseInt(localStorage.getItem('kulpio-lastsync'), 10) || 0; } catch { return 0; } })();
function markSynced() {
  _lastSync = Date.now();
  try { localStorage.setItem('kulpio-lastsync', String(_lastSync)); } catch {}
  const sub = document.getElementById('profAccountSub');
  if (sub && authUser && !profileStatus()) sub.textContent = l('authSyncing');
}
function lastSyncLabel() {
  if (!_lastSync) return l('authNever');
  const loc = speechLang[currentLang] || currentLang;
  return l('authLastSync') + ': ' + new Date(_lastSync).toLocaleString(loc, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
}
async function authPull() {
  const url = aiProxyUrl();
  if (!url || !authToken) return;
  const r = await postJSON(url, { userGet: { token: authToken } }, 15000);
  if (r && r.data) { applySyncEnvelope(r.data); markSynced(); }   // account has data → it wins on sign-in / refresh
  else if (r && r.data === null) authPush(true);   // fresh account → seed it with this device's data
}
function authPush(now) {
  if (!authToken || _applyingSync) return;
  clearTimeout(_authPushT);
  const doPush = async () => {
    const url = aiProxyUrl();
    if (!url || !authToken) return;
    const r = await postJSON(url, { userSet: { token: authToken, data: syncEnvelope() } }, 15000);
    if (r && r.ok) markSynced();
  };
  if (now) doPush(); else _authPushT = setTimeout(doPush, 2500);
}
// Manual sync: push this device's latest, then pull the merged truth back.
async function syncNow() {
  const url = aiProxyUrl();
  const info = document.getElementById('authSyncInfo');
  const btn = document.getElementById('authSyncBtn');
  if (!url || !authToken) { if (info) info.textContent = l('authOffline'); return; }
  if (btn) btn.disabled = true;
  if (info) info.textContent = l('authSyncingNow');
  try {
    await postJSON(url, { userSet: { token: authToken, data: syncEnvelope() } }, 15000);
    const r = await postJSON(url, { userGet: { token: authToken } }, 15000);
    if (r && r.data) applySyncEnvelope(r.data);
    markSynced();
    if (info) info.textContent = lastSyncLabel();
    pearReact && pearReact('hop', null, '✅', 700);
  } catch {
    if (info) info.textContent = l('authSyncFail');
  }
  if (btn) btn.disabled = false;
}
// Cross-device sync while the app is open: flush pending changes when we leave,
// and pull the latest when we come back (another device may have changed it).
let _lastFgPull = 0;
document.addEventListener('visibilitychange', () => {
  if (!authToken) return;
  if (document.hidden) { authPush(true); return; }       // leaving → send our changes right away
  const now = Date.now();
  if (now - _lastFgPull < 15000) return;                 // returning → pull, but not more than every 15s
  _lastFgPull = now;
  authPull();
});
window.addEventListener('pagehide', () => { if (authToken) authPush(true); });
window.addEventListener('online', () => { if (authToken) authPull(); });
async function restoreSession() {
  refreshAuthUi();
  if (!authToken) return;
  const url = aiProxyUrl();
  if (!url) return;
  const r = await postJSON(url, { auth: { me: { token: authToken } } }, 12000);
  if (r && r.user) { authUser = r.user; saveAuth(); refreshAuthUi(); authPull(); }
  else if (r && r.user === null) { authToken = ''; authUser = null; saveAuth(); refreshAuthUi(); }   // session expired
}

function openWallet() {
  ensureOverlayHistory();
  document.getElementById('walletTitleT').textContent = l('cardsTitle');
  document.getElementById('walletModal').classList.add('show');
  walletView('list');
}
function closeWallet() {
  document.getElementById('walletModal').classList.remove('show');
  _cardDraft = null;
}
// ── TERMS OF USE + PRIVACY POLICY ── plain, honest copy for a local-first,
// offline food tracker. English body (labels localized); no legalese padding.
// The full GNU Affero General Public License v3.0, embedded so it's readable
// inside the app. Kept verbatim to match the repository LICENSE file. Kulpio is
// dual-licensed: AGPL-3.0 for open use, or a paid commercial licence (see
// COMMERCIAL-LICENSE.md) for anyone who won't comply with the AGPL.
const LICENSE_TEXT = `                    GNU AFFERO GENERAL PUBLIC LICENSE
                       Version 3, 19 November 2007

 Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.

                            Preamble

  The GNU Affero General Public License is a free, copyleft license for
software and other kinds of works, specifically designed to ensure
cooperation with the community in the case of network server software.

  The licenses for most software and other practical works are designed
to take away your freedom to share and change the works.  By contrast,
our General Public Licenses are intended to guarantee your freedom to
share and change all versions of a program--to make sure it remains free
software for all its users.

  When we speak of free software, we are referring to freedom, not
price.  Our General Public Licenses are designed to make sure that you
have the freedom to distribute copies of free software (and charge for
them if you wish), that you receive source code or can get it if you
want it, that you can change the software or use pieces of it in new
free programs, and that you know you can do these things.

  Developers that use our General Public Licenses protect your rights
with two steps: (1) assert copyright on the software, and (2) offer
you this License which gives you legal permission to copy, distribute
and/or modify the software.

  A secondary benefit of defending all users' freedom is that
improvements made in alternate versions of the program, if they
receive widespread use, become available for other developers to
incorporate.  Many developers of free software are heartened and
encouraged by the resulting cooperation.  However, in the case of
software used on network servers, this result may fail to come about.
The GNU General Public License permits making a modified version and
letting the public access it on a server without ever releasing its
source code to the public.

  The GNU Affero General Public License is designed specifically to
ensure that, in such cases, the modified source code becomes available
to the community.  It requires the operator of a network server to
provide the source code of the modified version running there to the
users of that server.  Therefore, public use of a modified version, on
a publicly accessible server, gives the public access to the source
code of the modified version.

  An older license, called the Affero General Public License and
published by Affero, was designed to accomplish similar goals.  This is
a different license, not a version of the Affero GPL, but Affero has
released a new version of the Affero GPL which permits relicensing under
this license.

  The precise terms and conditions for copying, distribution and
modification follow.

                       TERMS AND CONDITIONS

  0. Definitions.

  "This License" refers to version 3 of the GNU Affero General Public License.

  "Copyright" also means copyright-like laws that apply to other kinds of
works, such as semiconductor masks.

  "The Program" refers to any copyrightable work licensed under this
License.  Each licensee is addressed as "you".  "Licensees" and
"recipients" may be individuals or organizations.

  To "modify" a work means to copy from or adapt all or part of the work
in a fashion requiring copyright permission, other than the making of an
exact copy.  The resulting work is called a "modified version" of the
earlier work or a work "based on" the earlier work.

  A "covered work" means either the unmodified Program or a work based
on the Program.

  To "propagate" a work means to do anything with it that, without
permission, would make you directly or secondarily liable for
infringement under applicable copyright law, except executing it on a
computer or modifying a private copy.  Propagation includes copying,
distribution (with or without modification), making available to the
public, and in some countries other activities as well.

  To "convey" a work means any kind of propagation that enables other
parties to make or receive copies.  Mere interaction with a user through
a computer network, with no transfer of a copy, is not conveying.

  An interactive user interface displays "Appropriate Legal Notices"
to the extent that it includes a convenient and prominently visible
feature that (1) displays an appropriate copyright notice, and (2)
tells the user that there is no warranty for the work (except to the
extent that warranties are provided), that licensees may convey the
work under this License, and how to view a copy of this License.  If
the interface presents a list of user commands or options, such as a
menu, a prominent item in the list meets this criterion.

  1. Source Code.

  The "source code" for a work means the preferred form of the work
for making modifications to it.  "Object code" means any non-source
form of a work.

  A "Standard Interface" means an interface that either is an official
standard defined by a recognized standards body, or, in the case of
interfaces specified for a particular programming language, one that
is widely used among developers working in that language.

  The "System Libraries" of an executable work include anything, other
than the work as a whole, that (a) is included in the normal form of
packaging a Major Component, but which is not part of that Major
Component, and (b) serves only to enable use of the work with that
Major Component, or to implement a Standard Interface for which an
implementation is available to the public in source code form.  A
"Major Component", in this context, means a major essential component
(kernel, window system, and so on) of the specific operating system
(if any) on which the executable work runs, or a compiler used to
produce the work, or an object code interpreter used to run it.

  The "Corresponding Source" for a work in object code form means all
the source code needed to generate, install, and (for an executable
work) run the object code and to modify the work, including scripts to
control those activities.  However, it does not include the work's
System Libraries, or general-purpose tools or generally available free
programs which are used unmodified in performing those activities but
which are not part of the work.  For example, Corresponding Source
includes interface definition files associated with source files for
the work, and the source code for shared libraries and dynamically
linked subprograms that the work is specifically designed to require,
such as by intimate data communication or control flow between those
subprograms and other parts of the work.

  The Corresponding Source need not include anything that users
can regenerate automatically from other parts of the Corresponding
Source.

  The Corresponding Source for a work in source code form is that
same work.

  2. Basic Permissions.

  All rights granted under this License are granted for the term of
copyright on the Program, and are irrevocable provided the stated
conditions are met.  This License explicitly affirms your unlimited
permission to run the unmodified Program.  The output from running a
covered work is covered by this License only if the output, given its
content, constitutes a covered work.  This License acknowledges your
rights of fair use or other equivalent, as provided by copyright law.

  You may make, run and propagate covered works that you do not
convey, without conditions so long as your license otherwise remains
in force.  You may convey covered works to others for the sole purpose
of having them make modifications exclusively for you, or provide you
with facilities for running those works, provided that you comply with
the terms of this License in conveying all material for which you do
not control copyright.  Those thus making or running the covered works
for you must do so exclusively on your behalf, under your direction
and control, on terms that prohibit them from making any copies of
your copyrighted material outside their relationship with you.

  Conveying under any other circumstances is permitted solely under
the conditions stated below.  Sublicensing is not allowed; section 10
makes it unnecessary.

  3. Protecting Users' Legal Rights From Anti-Circumvention Law.

  No covered work shall be deemed part of an effective technological
measure under any applicable law fulfilling obligations under article
11 of the WIPO copyright treaty adopted on 20 December 1996, or
similar laws prohibiting or restricting circumvention of such
measures.

  When you convey a covered work, you waive any legal power to forbid
circumvention of technological measures to the extent such circumvention
is effected by exercising rights under this License with respect to
the covered work, and you disclaim any intention to limit operation or
modification of the work as a means of enforcing, against the work's
users, your or third parties' legal rights to forbid circumvention of
technological measures.

  4. Conveying Verbatim Copies.

  You may convey verbatim copies of the Program's source code as you
receive it, in any medium, provided that you conspicuously and
appropriately publish on each copy an appropriate copyright notice;
keep intact all notices stating that this License and any
non-permissive terms added in accord with section 7 apply to the code;
keep intact all notices of the absence of any warranty; and give all
recipients a copy of this License along with the Program.

  You may charge any price or no price for each copy that you convey,
and you may offer support or warranty protection for a fee.

  5. Conveying Modified Source Versions.

  You may convey a work based on the Program, or the modifications to
produce it from the Program, in the form of source code under the
terms of section 4, provided that you also meet all of these conditions:

    a) The work must carry prominent notices stating that you modified
    it, and giving a relevant date.

    b) The work must carry prominent notices stating that it is
    released under this License and any conditions added under section
    7.  This requirement modifies the requirement in section 4 to
    "keep intact all notices".

    c) You must license the entire work, as a whole, under this
    License to anyone who comes into possession of a copy.  This
    License will therefore apply, along with any applicable section 7
    additional terms, to the whole of the work, and all its parts,
    regardless of how they are packaged.  This License gives no
    permission to license the work in any other way, but it does not
    invalidate such permission if you have separately received it.

    d) If the work has interactive user interfaces, each must display
    Appropriate Legal Notices; however, if the Program has interactive
    interfaces that do not display Appropriate Legal Notices, your
    work need not make them do so.

  A compilation of a covered work with other separate and independent
works, which are not by their nature extensions of the covered work,
and which are not combined with it such as to form a larger program,
in or on a volume of a storage or distribution medium, is called an
"aggregate" if the compilation and its resulting copyright are not
used to limit the access or legal rights of the compilation's users
beyond what the individual works permit.  Inclusion of a covered work
in an aggregate does not cause this License to apply to the other
parts of the aggregate.

  6. Conveying Non-Source Forms.

  You may convey a covered work in object code form under the terms
of sections 4 and 5, provided that you also convey the
machine-readable Corresponding Source under the terms of this License,
in one of these ways:

    a) Convey the object code in, or embodied in, a physical product
    (including a physical distribution medium), accompanied by the
    Corresponding Source fixed on a durable physical medium
    customarily used for software interchange.

    b) Convey the object code in, or embodied in, a physical product
    (including a physical distribution medium), accompanied by a
    written offer, valid for at least three years and valid for as
    long as you offer spare parts or customer support for that product
    model, to give anyone who possesses the object code either (1) a
    copy of the Corresponding Source for all the software in the
    product that is covered by this License, on a durable physical
    medium customarily used for software interchange, for a price no
    more than your reasonable cost of physically performing this
    conveying of source, or (2) access to copy the
    Corresponding Source from a network server at no charge.

    c) Convey individual copies of the object code with a copy of the
    written offer to provide the Corresponding Source.  This
    alternative is allowed only occasionally and noncommercially, and
    only if you received the object code with such an offer, in accord
    with subsection 6b.

    d) Convey the object code by offering access from a designated
    place (gratis or for a charge), and offer equivalent access to the
    Corresponding Source in the same way through the same place at no
    further charge.  You need not require recipients to copy the
    Corresponding Source along with the object code.  If the place to
    copy the object code is a network server, the Corresponding Source
    may be on a different server (operated by you or a third party)
    that supports equivalent copying facilities, provided you maintain
    clear directions next to the object code saying where to find the
    Corresponding Source.  Regardless of what server hosts the
    Corresponding Source, you remain obligated to ensure that it is
    available for as long as needed to satisfy these requirements.

    e) Convey the object code using peer-to-peer transmission, provided
    you inform other peers where the object code and Corresponding
    Source of the work are being offered to the general public at no
    charge under subsection 6d.

  A separable portion of the object code, whose source code is excluded
from the Corresponding Source as a System Library, need not be
included in conveying the object code work.

  A "User Product" is either (1) a "consumer product", which means any
tangible personal property which is normally used for personal, family,
or household purposes, or (2) anything designed or sold for incorporation
into a dwelling.  In determining whether a product is a consumer product,
doubtful cases shall be resolved in favor of coverage.  For a particular
product received by a particular user, "normally used" refers to a
typical or common use of that class of product, regardless of the status
of the particular user or of the way in which the particular user
actually uses, or expects or is expected to use, the product.  A product
is a consumer product regardless of whether the product has substantial
commercial, industrial or non-consumer uses, unless such uses represent
the only significant mode of use of the product.

  "Installation Information" for a User Product means any methods,
procedures, authorization keys, or other information required to install
and execute modified versions of a covered work in that User Product from
a modified version of its Corresponding Source.  The information must
suffice to ensure that the continued functioning of the modified object
code is in no case prevented or interfered with solely because
modification has been made.

  If you convey an object code work under this section in, or with, or
specifically for use in, a User Product, and the conveying occurs as
part of a transaction in which the right of possession and use of the
User Product is transferred to the recipient in perpetuity or for a
fixed term (regardless of how the transaction is characterized), the
Corresponding Source conveyed under this section must be accompanied
by the Installation Information.  But this requirement does not apply
if neither you nor any third party retains the ability to install
modified object code on the User Product (for example, the work has
been installed in ROM).

  The requirement to provide Installation Information does not include a
requirement to continue to provide support service, warranty, or updates
for a work that has been modified or installed by the recipient, or for
the User Product in which it has been modified or installed.  Access to a
network may be denied when the modification itself materially and
adversely affects the operation of the network or violates the rules and
protocols for communication across the network.

  Corresponding Source conveyed, and Installation Information provided,
in accord with this section must be in a format that is publicly
documented (and with an implementation available to the public in
source code form), and must require no special password or key for
unpacking, reading or copying.

  7. Additional Terms.

  "Additional permissions" are terms that supplement the terms of this
License by making exceptions from one or more of its conditions.
Additional permissions that are applicable to the entire Program shall
be treated as though they were included in this License, to the extent
that they are valid under applicable law.  If additional permissions
apply only to part of the Program, that part may be used separately
under those permissions, but the entire Program remains governed by
this License without regard to the additional permissions.

  When you convey a copy of a covered work, you may at your option
remove any additional permissions from that copy, or from any part of
it.  (Additional permissions may be written to require their own
removal in certain cases when you modify the work.)  You may place
additional permissions on material, added by you to a covered work,
for which you have or can give appropriate copyright permission.

  Notwithstanding any other provision of this License, for material you
add to a covered work, you may (if authorized by the copyright holders of
that material) supplement the terms of this License with terms:

    a) Disclaiming warranty or limiting liability differently from the
    terms of sections 15 and 16 of this License; or

    b) Requiring preservation of specified reasonable legal notices or
    author attributions in that material or in the Appropriate Legal
    Notices displayed by works containing it; or

    c) Prohibiting misrepresentation of the origin of that material, or
    requiring that modified versions of such material be marked in
    reasonable ways as different from the original version; or

    d) Limiting the use for publicity purposes of names of licensors or
    authors of the material; or

    e) Declining to grant rights under trademark law for use of some
    trade names, trademarks, or service marks; or

    f) Requiring indemnification of licensors and authors of that
    material by anyone who conveys the material (or modified versions of
    it) with contractual assumptions of liability to the recipient, for
    any liability that these contractual assumptions directly impose on
    those licensors and authors.

  All other non-permissive additional terms are considered "further
restrictions" within the meaning of section 10.  If the Program as you
received it, or any part of it, contains a notice stating that it is
governed by this License along with a term that is a further
restriction, you may remove that term.  If a license document contains
a further restriction but permits relicensing or conveying under this
License, you may add to a covered work material governed by the terms
of that license document, provided that the further restriction does
not survive such relicensing or conveying.

  If you add terms to a covered work in accord with this section, you
must place, in the relevant source files, a statement of the
additional terms that apply to those files, or a notice indicating
where to find the applicable terms.

  Additional terms, permissive or non-permissive, may be stated in the
form of a separately written license, or stated as exceptions;
the above requirements apply either way.

  8. Termination.

  You may not propagate or modify a covered work except as expressly
provided under this License.  Any attempt otherwise to propagate or
modify it is void, and will automatically terminate your rights under
this License (including any patent licenses granted under the third
paragraph of section 11).

  However, if you cease all violation of this License, then your
license from a particular copyright holder is reinstated (a)
provisionally, unless and until the copyright holder explicitly and
finally terminates your license, and (b) permanently, if the copyright
holder fails to notify you of the violation by some reasonable means
prior to 60 days after the cessation.

  Moreover, your license from a particular copyright holder is
reinstated permanently if the copyright holder notifies you of the
violation by some reasonable means, this is the first time you have
received notice of violation of this License (for any work) from that
copyright holder, and you cure the violation prior to 30 days after
your receipt of the notice.

  Termination of your rights under this section does not terminate the
licenses of parties who have received copies or rights from you under
this License.  If your rights have been terminated and not permanently
reinstated, you do not qualify to receive new licenses for the same
material under section 10.

  9. Acceptance Not Required for Having Copies.

  You are not required to accept this License in order to receive or
run a copy of the Program.  Ancillary propagation of a covered work
occurring solely as a consequence of using peer-to-peer transmission
to receive a copy likewise does not require acceptance.  However,
nothing other than this License grants you permission to propagate or
modify any covered work.  These actions infringe copyright if you do
not accept this License.  Therefore, by modifying or propagating a
covered work, you indicate your acceptance of this License to do so.

  10. Automatic Licensing of Downstream Recipients.

  Each time you convey a covered work, the recipient automatically
receives a license from the original licensors, to run, modify and
propagate that work, subject to this License.  You are not responsible
for enforcing compliance by third parties with this License.

  An "entity transaction" is a transaction transferring control of an
organization, or substantially all assets of one, or subdividing an
organization, or merging organizations.  If propagation of a covered
work results from an entity transaction, each party to that
transaction who receives a copy of the work also receives whatever
licenses to the work the party's predecessor in interest had or could
give under the previous paragraph, plus a right to possession of the
Corresponding Source of the work from the predecessor in interest, if
the predecessor has it or can get it with reasonable efforts.

  You may not impose any further restrictions on the exercise of the
rights granted or affirmed under this License.  For example, you may
not impose a license fee, royalty, or other charge for exercise of
rights granted under this License, and you may not initiate litigation
(including a cross-claim or counterclaim in a lawsuit) alleging that
any patent claim is infringed by making, using, selling, offering for
sale, or importing the Program or any portion of it.

  11. Patents.

  A "contributor" is a copyright holder who authorizes use under this
License of the Program or a work on which the Program is based.  The
work thus licensed is called the contributor's "contributor version".

  A contributor's "essential patent claims" are all patent claims
owned or controlled by the contributor, whether already acquired or
hereafter acquired, that would be infringed by some manner, permitted
by this License, of making, using, or selling its contributor version,
but do not include claims that would be infringed only as a
consequence of further modification of the contributor version.  For
purposes of this definition, "control" includes the right to grant
patent sublicenses in a manner consistent with the requirements of
this License.

  Each contributor grants you a non-exclusive, worldwide, royalty-free
patent license under the contributor's essential patent claims, to
make, use, sell, offer for sale, import and otherwise run, modify and
propagate the contents of its contributor version.

  In the following three paragraphs, a "patent license" is any express
agreement or commitment, however denominated, not to enforce a patent
(such as an express permission to practice a patent or covenant not to
sue for patent infringement).  To "grant" such a patent license to a
party means to make such an agreement or commitment not to enforce a
patent against the party.

  If you convey a covered work, knowingly relying on a patent license,
and the Corresponding Source of the work is not available for anyone
to copy, free of charge and under the terms of this License, through a
publicly available network server or other readily accessible means,
then you must either (1) cause the Corresponding Source to be so
available, or (2) arrange to deprive yourself of the benefit of the
patent license for this particular work, or (3) arrange, in a manner
consistent with the requirements of this License, to extend the patent
license to downstream recipients.  "Knowingly relying" means you have
actual knowledge that, but for the patent license, your conveying the
covered work in a country, or your recipient's use of the covered work
in a country, would infringe one or more identifiable patents in that
country that you have reason to believe are valid.

  If, pursuant to or in connection with a single transaction or
arrangement, you convey, or propagate by procuring conveyance of, a
covered work, and grant a patent license to some of the parties
receiving the covered work authorizing them to use, propagate, modify
or convey a specific copy of the covered work, then the patent license
you grant is automatically extended to all recipients of the covered
work and works based on it.

  A patent license is "discriminatory" if it does not include within
the scope of its coverage, prohibits the exercise of, or is
conditioned on the non-exercise of one or more of the rights that are
specifically granted under this License.  You may not convey a covered
work if you are a party to an arrangement with a third party that is
in the business of distributing software, under which you make payment
to the third party based on the extent of your activity of conveying
the work, and under which the third party grants, to any of the
parties who would receive the covered work from you, a discriminatory
patent license (a) in connection with copies of the covered work
conveyed by you (or copies made from those copies), or (b) primarily
for and in connection with specific products or compilations that
contain the covered work, unless you entered into that arrangement,
or that patent license was granted, prior to 28 March 2007.

  Nothing in this License shall be construed as excluding or limiting
any implied license or other defenses to infringement that may
otherwise be available to you under applicable patent law.

  12. No Surrender of Others' Freedom.

  If conditions are imposed on you (whether by court order, agreement or
otherwise) that contradict the conditions of this License, they do not
excuse you from the conditions of this License.  If you cannot convey a
covered work so as to satisfy simultaneously your obligations under this
License and any other pertinent obligations, then as a consequence you may
not convey it at all.  For example, if you agree to terms that obligate you
to collect a royalty for further conveying from those to whom you convey
the Program, the only way you could satisfy both those terms and this
License would be to refrain entirely from conveying the Program.

  13. Remote Network Interaction; Use with the GNU General Public License.

  Notwithstanding any other provision of this License, if you modify the
Program, your modified version must prominently offer all users
interacting with it remotely through a computer network (if your version
supports such interaction) an opportunity to receive the Corresponding
Source of your version by providing access to the Corresponding Source
from a network server at no charge, through some standard or customary
means of facilitating copying of software.  This Corresponding Source
shall include the Corresponding Source for any work covered by version 3
of the GNU General Public License that is incorporated pursuant to the
following paragraph.

  Notwithstanding any other provision of this License, you have
permission to link or combine any covered work with a work licensed
under version 3 of the GNU General Public License into a single
combined work, and to convey the resulting work.  The terms of this
License will continue to apply to the part which is the covered work,
but the work with which it is combined will remain governed by version
3 of the GNU General Public License.

  14. Revised Versions of this License.

  The Free Software Foundation may publish revised and/or new versions of
the GNU Affero General Public License from time to time.  Such new versions
will be similar in spirit to the present version, but may differ in detail to
address new problems or concerns.

  Each version is given a distinguishing version number.  If the
Program specifies that a certain numbered version of the GNU Affero General
Public License "or any later version" applies to it, you have the
option of following the terms and conditions either of that numbered
version or of any later version published by the Free Software
Foundation.  If the Program does not specify a version number of the
GNU Affero General Public License, you may choose any version ever published
by the Free Software Foundation.

  If the Program specifies that a proxy can decide which future
versions of the GNU Affero General Public License can be used, that proxy's
public statement of acceptance of a version permanently authorizes you
to choose that version for the Program.

  Later license versions may give you additional or different
permissions.  However, no additional obligations are imposed on any
author or copyright holder as a result of your choosing to follow a
later version.

  15. Disclaimer of Warranty.

  THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY
APPLICABLE LAW.  EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT
HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY
OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE.  THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM
IS WITH YOU.  SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF
ALL NECESSARY SERVICING, REPAIR OR CORRECTION.

  16. Limitation of Liability.

  IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING
WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MODIFIES AND/OR CONVEYS
THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES, INCLUDING ANY
GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE
USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF
DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD
PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER PROGRAMS),
EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF
SUCH DAMAGES.

  17. Interpretation of Sections 15 and 16.

  If the disclaimer of warranty and limitation of liability provided
above cannot be given local legal effect according to their terms,
reviewing courts shall apply local law that most closely approximates
an absolute waiver of all civil liability in connection with the
Program, unless a warranty or assumption of liability accompanies a
copy of the Program in return for a fee.

                     END OF TERMS AND CONDITIONS

            How to Apply These Terms to Your New Programs

  If you develop a new program, and you want it to be of the greatest
possible use to the public, the best way to achieve this is to make it
free software which everyone can redistribute and change under these terms.

  To do so, attach the following notices to the program.  It is safest
to attach them to the start of each source file to most effectively
state the exclusion of warranty; and each file should have at least
the "copyright" line and a pointer to where the full notice is found.

    <one line to give the program's name and a brief idea of what it does.>
    Copyright (C) <year>  <name of author>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

Also add information on how to contact you by electronic and paper mail.

  If your software can interact with users remotely through a computer
network, you should also make sure that it provides a way for users to
get its source.  For example, if your program is a web application, its
interface could display a "Source" link that leads users to an archive
of the code.  There are many ways you could offer source, and different
solutions will be better for different programs; see section 13 for the
specific requirements.

  You should also get your employer (if you work as a programmer) or school,
if any, to sign a "copyright disclaimer" for the program, if necessary.
For more information on this, and how to apply and follow the GNU AGPL, see
<https://www.gnu.org/licenses/>.`;
function licenseHtml() {
  return `<button type="button" class="mini-btn" style="margin-bottom:12px" onclick="openLegal()">‹ ${esc(l('legalBack'))}</button>
    <pre class="license-text">${esc(LICENSE_TEXT)}</pre>`;
}
function legalHtml() {
  return `
    <h4>${esc(l('legalTermsH'))}</h4>
    <p>Kulpio (“the App”) is a free, open-source tool that helps you track the food in your kitchen, waste less and save money. It is provided by its developer, Daniil Bejenari (“the Developer”, “we”, “us”). By downloading, installing, opening or using the App in any way, you (“you”, “the user”) confirm that you have read, understood and agree to be bound by these Terms of Use and the Privacy Policy below. <b>If you do not agree with any part of them, do not use the App.</b></p>
    <ol class="legal-list">
      <li><b>Eligibility.</b> You must be at least the age of digital consent in your country (and at least 13) to use the App. If you are a minor, you may only use it with the consent and supervision of a parent or legal guardian, who accepts these Terms on your behalf.</li>
      <li><b>Not professional advice.</b> The App is an informational and organisational aid only. Freshness and expiry estimates, shelf-life predictions, price and store data, nutrition figures, allergen flags, recipe ideas and any AI-generated output are <b>best-effort estimates, produced automatically and may be wrong, incomplete or out of date.</b> They are <b>not</b> medical, nutritional, health, food-safety, financial or professional advice of any kind, and are no substitute for the printed labels on your products, official guidance, or the advice of a qualified professional.</li>
      <li><b>Food safety is your responsibility.</b> <b>You alone decide whether any food is safe to eat, store, cook or serve.</b> Always check the actual product, its packaging, printed use-by / best-before dates, storage instructions and your own senses before consuming anything. Never rely on the App to tell you a food is safe. If in doubt, throw it out. The App may fail to send a reminder, may show a wrong date, or may be unavailable, and you must not depend on it for anything affecting health or safety.</li>
      <li><b>Allergies &amp; health.</b> Allergen and ingredient information may be missing, wrong or incomplete. <b>If you have a food allergy, intolerance, medical condition, or are pregnant, do not rely on the App</b> — verify every ingredient yourself and consult a medical professional. You use any allergen or nutrition feature entirely at your own risk.</li>
      <li><b>Assumption of risk.</b> You use the App voluntarily and <b>at your sole risk</b>. You knowingly and freely assume all risks — known and unknown — arising from your use of it, including food spoilage, illness, injury, missed dates, financial loss, or loss of data.</li>
      <li><b>“As is”, no warranty.</b> The App is provided <b>“AS IS” and “AS AVAILABLE”, without warranties or guarantees of any kind</b>, whether express, implied or statutory, including any implied warranties of merchantability, fitness for a particular purpose, accuracy, reliability, availability, uninterrupted or error-free operation, or non-infringement, to the fullest extent permitted by law. We do not warrant that the App will meet your needs, be secure, or be free of errors, bugs, viruses or interruptions.</li>
      <li><b>Limitation of liability.</b> To the maximum extent permitted by applicable law, <b>the Developer and any contributors shall not be liable for any damages whatsoever</b> — including direct, indirect, incidental, special, consequential, punitive or exemplary damages; loss of profits, savings, data, goodwill or reputation; personal injury, illness or death; property damage; spoiled or wasted food; or any other loss — arising out of or in connection with your use of, or inability to use, the App, even if advised of the possibility of such damages, and regardless of the legal theory (contract, tort, negligence, strict liability or otherwise). <b>Because the App is provided free of charge, the Developer's total aggregate liability to you for all claims shall not exceed the greater of the amount you actually paid to use the App (which is zero) or the minimum amount required by applicable law.</b> Some jurisdictions do not allow certain exclusions or limitations; in those cases the above applies to the greatest extent the law allows, and nothing here limits liability that cannot lawfully be limited (such as for death or personal injury caused by gross negligence or fraud).</li>
      <li><b>Indemnification.</b> You agree to defend, indemnify and hold harmless the Developer and contributors from and against any and all claims, demands, liabilities, damages, losses, costs and expenses (including reasonable legal fees) arising out of or related to your use or misuse of the App, your content, your violation of these Terms, or your violation of any law or the rights of any third party.</li>
      <li><b>Your content and conduct.</b> You are solely responsible for everything you enter, upload, scan or store (product names, photos, notes, prices, etc.) and for keeping your account and device secure. You agree not to: use the App for any unlawful, harmful or fraudulent purpose; upload content that is illegal, infringing, offensive or that you have no right to share; attempt to disrupt, overload, reverse-engineer for malicious purposes, hack, or gain unauthorised access to the App, its servers or other users' data; or use the App to build a competing dataset by automated scraping. You grant us only the limited permission needed to store and process your content so the App can work for you.</li>
      <li><b>Third-party services &amp; data.</b> The App relies on third-party services and public data (including Open Food Facts, TheMealDB, AI providers, and hosting providers). We do not control and are not responsible for the accuracy, availability or content of those services, and their own terms and privacy policies apply to your use of them.</li>
      <li><b>Availability &amp; changes.</b> The App is offered free and may be changed, suspended, limited or discontinued in whole or in part at any time without notice or liability. Features may be added or removed. We do not guarantee that any data you store will be retained or backed up — <b>keep your own copies of anything important.</b></li>
      <li><b>Termination.</b> You may stop using the App at any time. We may suspend or terminate your access at any time, for any reason, without notice. Sections that by their nature should survive termination (disclaimers, limitation of liability, indemnification, governing law) continue to apply.</li>
      <li><b>Governing law &amp; disputes.</b> These Terms are governed by the laws applicable at the Developer's place of residence, without regard to conflict-of-law rules, and subject to any mandatory consumer-protection rights you have in your own country of residence. <b>You agree that any dispute will first be attempted to be resolved informally by contacting the Developer.</b> To the extent permitted by law, you agree that disputes will be resolved on an individual basis and you <b>waive any right to participate in a class, collective or representative action.</b> Nothing in this clause removes any non-waivable right you have under the mandatory law of your country.</li>
      <li><b>Severability &amp; entire agreement.</b> If any provision of these Terms is found unenforceable, the rest remain in full force, and the unenforceable part will be applied to the greatest extent permitted by law. These Terms, together with the Privacy Policy and the licence (GNU AGPL v3 or a commercial licence), are the entire agreement between you and the Developer regarding the App, and supersede any prior understanding.</li>
      <li><b>Changes to these Terms.</b> We may update these Terms from time to time. The “last updated” date below shows the current version; continued use of the App after changes means you accept the updated Terms.</li>
    </ol>
    <h4>${esc(l('legalPrivacyH'))}</h4>
    <p><b>Your fridge stays on your device.</b> Your products, history, badges and settings are stored locally in your browser. Nothing leaves your device unless you choose a feature that needs the network.</p>
    <ul>
      <li><b>Account &amp; sync (optional):</b> if you create an account, your email, a securely hashed password, and a copy of your app data are stored so your fridge can follow you across devices. Sign in with Google shares only your verified email and name. Delete your data any time by signing out and clearing the app.</li>
      <li><b>AI features (optional):</b> when you scan a label or receipt, or ask for recipe ideas, the photo or text is sent to our processing service to read it. It is used only to answer that request, not to profile you.</li>
      <li><b>Community data (optional):</b> anonymous scan and price signals (no name attached) power the “popular now” and price features. A shared-fridge code links a household list only for people who have the code.</li>
      <li><b>Product info:</b> barcode and product details come from Open Food Facts and similar public databases.</li>
    </ul>
    <p>We don’t sell your personal data or show third-party ads. Questions? Reach the developer via the app’s repository.</p>
    <p>Kulpio is <b>dual-licensed</b>. It is free software under the <b>GNU Affero General Public License v3.0</b> — if you use, modify or host it, you must release your full source under the AGPL. <b>Any use that does not comply with the AGPL — including closed-source, proprietary or commercial use of Kulpio or any of its features — requires a separate paid commercial licence from the author (an annual subscription, per product, from €1,200/year for indie use), and unlicensed commercial use owes those fees, backdated, plus a surcharge.</b> <a href="#" onclick="event.preventDefault();openLegal('license')">${esc(l('legalViewLicense'))}</a></p>
    <p class="legal-upd">${esc(l('legalUpdated'))}: 2026-07-24 · © 2026 Daniil Bejenari</p>`;
}
function openLegal(mode) {
  ensureOverlayHistory();
  const license = mode === 'license';
  document.getElementById('legalTitleT').textContent = license ? l('legalLicenseH') : l('menuLegal');
  const body = document.getElementById('legalBody');
  body.innerHTML = license ? licenseHtml() : legalHtml();
  body.scrollTop = 0;
  const ok = document.getElementById('legalOk');
  ok.textContent = license ? l('legalBack') : l('legalGotIt');
  ok.onclick = license ? () => openLegal() : closeLegal;
  document.getElementById('legalModal').classList.add('show');
}
function closeLegal() { document.getElementById('legalModal').classList.remove('show'); }
// ── FIRST-RUN WELCOME GATE ── agreement + account come before the guide.
let _pendingTour = false;
function openWelcome() {
  document.getElementById('welcomeTitle').textContent = l('welcomeTitle');
  document.getElementById('welcomeSub').textContent = l('welcomeSub');
  document.getElementById('welcomeSignIn').textContent = l('welcomeSignIn');
  document.getElementById('welcomeSkip').textContent = l('welcomeSkip');
  document.getElementById('welcomeLegal').innerHTML = esc(l('welcomeAgreePre'))
    + ` <a href="#" onclick="event.preventDefault();openLegal()">${esc(l('menuLegal'))}</a>`;
  ensureOverlayHistory();
  document.getElementById('welcomeModal').classList.add('show');
}
function _afterWelcome() {   // the guide follows, but only on a genuine first run
  if (!localStorage.getItem('kulpio-toured') && !state.products.length) setTimeout(openTour, 350);
}
function welcomeAgree(mode) {
  try { localStorage.setItem('kulpio-agreed', new Date().toISOString().slice(0, 10)); } catch {}
  document.getElementById('welcomeModal').classList.remove('show');
  if (mode === 'account') { _pendingTour = true; openAuth('signup'); }   // guide runs when auth closes
  else _afterWelcome();
}
function walletView(mode) { _walletMode = mode; renderWallet(); }
function renderWallet() {
  const body = document.getElementById('walletBody');
  if (!body) return;
  if (_walletMode === 'edit') {
    body.innerHTML = cardEditHtml();
    cardPreview();
    const n = document.getElementById('cardNameIn');
    if (n && !_cardDraft.name) setTimeout(() => n.focus(), 60);
    return;
  }
  const cards = state.cards || [];
  body.innerHTML = `<div class="wallet-list">
      ${cards.length ? cards.map(walletRow).join('') : `<div class="wallet-empty">${esc(l('cardsEmpty'))}</div>`}
    </div>
    <button class="wallet-add" onclick="startAddCard()">＋ ${esc(l('cardAdd'))}</button>`;
}
function walletRow(c) {
  const last = String(c.code || '').replace(/\s/g, '').slice(-4);
  return `<button class="wallet-card" style="--cc:${esc(c.color || CARD_COLORS[0])}" onclick="showCard('${c.id}')">
      <span class="wc-name">${esc(c.name || l('cardUnnamed'))}</span>
      <span class="wc-num">•••• ${esc(last)}</span>
    </button>`;
}
function startAddCard() {
  _cardDraft = { id: '', name: '', code: '', fmt: 'auto', color: CARD_COLORS[0] };
  walletView('edit');
}
function editCard(id) {
  const c = (state.cards || []).find(x => x.id === id);
  if (!c) return;
  _cardDraft = { ...c };
  closeCardShow();
  if (!document.getElementById('walletModal').classList.contains('show')) openWallet();
  walletView('edit');
}
function cardEditHtml() {
  const d = _cardDraft;
  return `<div class="card-edit">
    <label class="ce-lbl">${esc(l('cardName'))}</label>
    <input id="cardNameIn" class="ce-in" value="${esc(d.name)}" placeholder="${esc(l('cardNamePh'))}" oninput="_cardDraft.name=this.value">
    <label class="ce-lbl">${esc(l('cardNumber'))}</label>
    <div class="ce-num-row">
      <input id="cardCodeIn" class="ce-in" inputmode="text" autocomplete="off" value="${esc(d.code)}" placeholder="${esc(l('cardNumberPh'))}" oninput="_cardDraft.code=this.value;cardPreview()">
      <button type="button" class="ce-scan" onclick="scanCardNumber()" aria-label="${esc(l('cardScan'))}" title="${esc(l('cardScan'))}">📷</button>
    </div>
    <label class="ce-lbl">${esc(l('cardFormat'))}</label>
    <select id="cardFmtIn" class="ce-in" onchange="_cardDraft.fmt=this.value;cardPreview()">
      ${['auto','code128','ean13','ean8'].map(f => `<option value="${f}" ${d.fmt === f ? 'selected' : ''}>${esc(l('fmt_' + f))}</option>`).join('')}
    </select>
    <label class="ce-lbl">${esc(l('cardColor'))}</label>
    <div class="ce-colors">${CARD_COLORS.map(c => `<button type="button" class="ce-color ${d.color === c ? 'sel' : ''}" style="background:${c}" onclick="_cardDraft.color='${c}';renderWallet()" aria-label="color"></button>`).join('')}</div>
    <div class="ce-preview" id="cardPrev"></div>
    <div class="ce-actions">
      ${d.id ? `<button type="button" class="ce-del" onclick="deleteCard('${d.id}')">🗑️ ${esc(l('cardDelete'))}</button>` : ''}
      <button type="button" class="ce-cancel" onclick="walletView('list')">${esc(l('cardCancel'))}</button>
      <button type="button" class="ce-save" onclick="saveCard()">${esc(l('cardSave'))}</button>
    </div>
  </div>`;
}
function cardPreview() {
  const p = document.getElementById('cardPrev');
  if (!p) return;
  const { bits } = cardBits(_cardDraft.code, _cardDraft.fmt);
  p.innerHTML = bits ? barcodeSVG(bits) : `<span class="ce-hint">${esc(l('cardPreviewHint'))}</span>`;
}
function saveCard() {
  const d = _cardDraft;
  if (!(d.code || '').trim()) { const i = document.getElementById('cardCodeIn'); if (i) i.focus(); return; }
  state.cards = state.cards || [];
  if (d.id) { const i = state.cards.findIndex(c => c.id === d.id); if (i >= 0) state.cards[i] = { ...d }; }
  else { d.id = 'c' + Date.now().toString(36); state.cards.push({ ...d }); }
  saveState();
  walletView('list');
}
function deleteCard(id) {
  if (!confirm(l('cardDeleteConfirm'))) return;
  state.cards = (state.cards || []).filter(c => c.id !== id);
  saveState();
  closeCardShow();
  walletView('list');
}
let _showCardId = null;
function showCard(id) {
  const c = (state.cards || []).find(x => x.id === id);
  if (!c) return;
  _showCardId = id;
  const { bits } = cardBits(c.code, c.fmt);
  document.getElementById('cardShowName').textContent = c.name || l('cardUnnamed');
  document.getElementById('cardShowBox').innerHTML = bits ? barcodeSVG(bits) : `<span style="color:#999">${esc(l('cardPreviewHint'))}</span>`;
  document.getElementById('cardShowNum').textContent = formatCardNum(c.code);
  document.querySelector('#cardShowModal .card-show-edit').textContent = '✏️ ' + l('cardShowEdit');
  ensureOverlayHistory();
  document.getElementById('cardShowModal').classList.add('show');
}
function closeCardShow() {
  document.getElementById('cardShowModal').classList.remove('show');
}
function scanCardNumber() {
  _cardScan = (code) => { if (_cardDraft) { _cardDraft.code = (code || '').trim(); } if (!document.getElementById('walletModal').classList.contains('show')) openWallet(); walletView('edit'); };
  openScanner();
  const s = document.getElementById('scanStatus');
  if (s) s.textContent = l('cardScanHint');
}

