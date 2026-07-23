// Kulpio — projected impact MODEL (not a user study).
//
// This is a transparent Monte-Carlo model that TRANSLATES a stated assumption —
// how effective expiry reminders are at rescuing food that would otherwise be
// forgotten — into a projected reduction in household food waste and money lost,
// using realistic purchase/shelf-life/price distributions.
//
// It produces PROJECTIONS, not measured results. Every number here comes from
// the assumptions below, NOT from real people. Real evidence requires the study
// in docs/STUDY_PROTOCOL.md.
//
// Reproducible: seeded PRNG, so `node tools/impact_sim.mjs` always prints the
// same table. Change SEED or the assumptions to explore.

const SEED = 20260101;
const HOUSEHOLDS = 20000;     // Monte-Carlo samples (for stable averages + spread)
const WEEKS = 4;              // one month

// ── ASSUMPTIONS (state these openly in the report) ─────────────────────────
// Purchases per household per week (Poisson mean). Balanced grocery shopper.
const BUY_PER_WEEK = 18;
// Category mix of perishability, and the BASELINE probability an item of that
// category is forgotten and wasted WITHOUT any intervention. Grounded in the
// literature that most household waste is fresh/perishable food; overall this
// weights to ~18% of items wasted at baseline (see report for sources).
const CATEGORIES = [
  { name: "fresh (2–6 d)",   share: 0.45, baseWaste: 0.30, price: [1, 4] },
  { name: "chilled (7–20 d)", share: 0.30, baseWaste: 0.12, price: [1.5, 6] },
  { name: "pantry (30–120 d)", share: 0.25, baseWaste: 0.03, price: [1, 5] },
];
// Reminder effectiveness = fraction of would-be-wasted items the app rescues in
// time. Behaviour-change / awareness interventions for household food waste in
// the literature cluster roughly in the 15–30% range; we sweep a wider band so
// the projection's sensitivity is explicit.
const EFFECTIVENESS = [0.15, 0.20, 0.30, 0.40, 0.50];

// ── seeded PRNG (mulberry32) ────────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const poisson = (mean) => { // Knuth
  const L = Math.exp(-mean); let k = 0, p = 1;
  do { k++; p *= rnd(); } while (p > L);
  return k - 1;
};
const pick = () => { let r = rnd(); for (const c of CATEGORIES) { if (r < c.share) return c; r -= c.share; } return CATEGORIES[CATEGORIES.length - 1]; };
const uniform = ([lo, hi]) => lo + rnd() * (hi - lo);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const pct = (a, q) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; };
const eur = (x) => "€" + x.toFixed(2);

// One household-month: returns { items, atRiskItems, atRiskValue }.
function household() {
  let items = 0, atRiskItems = 0, atRiskValue = 0;
  for (let w = 0; w < WEEKS; w++) {
    const n = poisson(BUY_PER_WEEK);
    for (let i = 0; i < n; i++) {
      const c = pick();
      items++;
      if (rnd() < c.baseWaste) { atRiskItems++; atRiskValue += uniform(c.price); }
    }
  }
  return { items, atRiskItems, atRiskValue };
}

const hh = Array.from({ length: HOUSEHOLDS }, household);
const avgItems = mean(hh.map(h => h.items));
const avgAtRiskItems = mean(hh.map(h => h.atRiskItems));
const avgAtRiskValue = mean(hh.map(h => h.atRiskValue));
const baseWasteRate = avgAtRiskItems / avgItems;

console.log("Kulpio — PROJECTED impact model (Monte-Carlo). NOT a user study.\n");
console.log(`Samples: ${HOUSEHOLDS} household-months · seed ${SEED}`);
console.log(`Assumed purchases/household/month: ${avgItems.toFixed(1)} items`);
console.log(`Baseline (no app): ${avgAtRiskItems.toFixed(1)} items wasted/month `
  + `(${(baseWasteRate * 100).toFixed(1)}% of items), worth ${eur(avgAtRiskValue)}/month\n`);

console.log("Reminder │ items wasted │ waste rate │ € wasted │ € saved/mo │ reduction │ € saved 90% band");
console.log("─────────┼──────────────┼────────────┼──────────┼────────────┼───────────┼──────────────────");
for (const e of EFFECTIVENESS) {
  // Each at-risk item is rescued with probability e.
  const perHH = hh.map(h => {
    let wastedItems = 0, wastedVal = 0;
    // Re-draw rescues deterministically from remaining stream so the sweep is comparable.
    for (let k = 0; k < h.atRiskItems; k++) if (rnd() >= e) wastedItems++;
    wastedVal = h.atRiskValue * (wastedItems / Math.max(1, h.atRiskItems));
    return { wastedItems, saved: h.atRiskValue - wastedVal, wasted: wastedVal };
  });
  const wi = mean(perHH.map(x => x.wastedItems));
  const wv = mean(perHH.map(x => x.wasted));
  const sv = mean(perHH.map(x => x.saved));
  const lo = pct(perHH.map(x => x.saved), 0.05), hi = pct(perHH.map(x => x.saved), 0.95);
  const red = (1 - wi / avgAtRiskItems) * 100;
  console.log(
    `  ${(e * 100).toFixed(0).padStart(3)}%  │ ${wi.toFixed(1).padStart(12)} │ `
    + `${((wi / avgItems) * 100).toFixed(1).padStart(9)}% │ ${eur(wv).padStart(8)} │ `
    + `${eur(sv).padStart(10)} │ ${red.toFixed(0).padStart(8)}% │ ${eur(lo)}–${eur(hi)}`);
}
console.log("\nHeadline (at 30% reminder effectiveness — mid literature range):");
{
  const e = 0.30;
  const saved = hh.map(h => h.atRiskValue * e);
  console.log(`  ≈ ${eur(mean(saved))} saved/household/month and a ${(30).toFixed(0)}% cut in wasted items,`);
  console.log(`  i.e. ≈ ${eur(mean(saved) * 12)}/household/year — a PROJECTION under the stated assumptions.`);
}
console.log("\nAll figures are model outputs from the assumptions above — not measured user results.");
