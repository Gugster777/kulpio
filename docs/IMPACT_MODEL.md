# Kulpio — Projected Impact Model

> ⚠️ **This is a MODEL, not a user study.** Every number here is *projected* from
> the stated assumptions below — it is **not** measured from real people. It
> estimates *potential* impact to complement (never replace) the real micro-study
> in [`STUDY_PROTOCOL.md`](STUDY_PROTOCOL.md). Presenting these figures as
> empirical results would be dishonest; always label them as a projection.

Reproduce: `node tools/impact_sim.mjs` (seeded, so the output is deterministic).

## What the model does

The dominant cause of household food waste is *forgetting* — food bought and not
used before it expires. Kulpio's core mechanism against this is surfacing what's
about to expire. The model therefore translates **one honest assumption** —

> *"reminder effectiveness": the fraction of would-be-wasted items the app
> rescues in time —*

into a projected reduction in wasted items and money, over realistic
purchase / perishability / price distributions, via Monte-Carlo simulation of
20 000 household-months.

## Assumptions (stated openly)

| Assumption | Value | Basis |
|---|---|---|
| Purchases / household / week | Poisson(18) ≈ 72/month | typical balanced grocery shopper |
| Category mix & baseline waste | fresh 45 % (30 % wasted), chilled 30 % (12 %), pantry 25 % (3 %) | most household waste is fresh/perishable |
| ⇒ Baseline item-waste rate | ~18 % of items | consistent with household food-waste literature |
| Item prices (€) | fresh 1–4, chilled 1.5–6, pantry 1–5 | rough EU grocery ranges |
| **Reminder effectiveness** | swept **15 – 50 %** | awareness/reminder interventions in the literature cluster ~15–30 %; we sweep wider to show sensitivity |

The **reminder effectiveness is the key lever and is an assumption, not a
result.** The sensitivity sweep below is the whole point: it shows how the
projection moves with that assumption.

## Projected results (model output)

Baseline (no app): **~12.9 wasted items/month (~17.9 % of items), ≈ €35.69/month at risk.**

| Reminder effectiveness | Items wasted / mo | Waste rate | € wasted / mo | € saved / mo | Reduction | € saved (90 % band) |
|---|---|---|---|---|---|---|
| 15 % | 10.9 | 15.2 % | €30.36 | €5.33 | 15 % | €0.00–€12.51 |
| 20 % | 10.3 | 14.3 % | €28.54 | €7.15 | 20 % | €0.00–€15.47 |
| **30 %** | **9.0** | **12.5 %** | **€24.94** | **€10.75** | **30 %** | **€2.62–€21.01** |
| 40 % | 7.7 | 10.7 % | €21.36 | €14.32 | 40 % | €4.94–€26.02 |
| 50 % | 6.4 | 8.9 % | €17.87 | €17.81 | 50 % | €6.94–€30.73 |

**Headline (at 30 % effectiveness, mid literature range):** a projected
**≈ €10.71 saved / household / month (~€128 / year)** and a **~30 % cut in wasted
items** — *under the stated assumptions.*

## Honest limitations of the model

- The result is **driven by the effectiveness assumption**; the model does not
  *prove* Kulpio achieves any particular effectiveness — the real study measures
  that.
- It ignores second-order effects (e.g. better shopping-list planning reducing
  over-buying), so it may be conservative; it also assumes users actually act on
  reminders, so it may be optimistic. These roughly offset but are unquantified.
- Distributions are plausible but not calibrated to a specific country's data.

**Use in the report:** present this as *"projected potential impact under a
transparent model,"* alongside the measured numbers from the micro-study. Never
merge the two or imply the projection is observed data.
