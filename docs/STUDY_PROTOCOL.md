# Kulpio — Micro-Study Protocol (real evidence)

A small, honest field study you can run in ~2–3 weeks with 3–15 people. It
produces **real measured data** — which beats any model for credibility — using
the app's own **CSV export** as the instrument. Pair it with the projected
[`IMPACT_MODEL.md`](IMPACT_MODEL.md); keep the two clearly separate in the report.

## 1. Research question & hypothesis

- **Question:** Does using Kulpio reduce the amount of food a household wastes?
- **H1:** Households waste fewer items (and less money) during a week using
  Kulpio than during a baseline week without it.
- **H0 (null):** No difference.

## 2. Design

**Within-subject, two phases** (each participant is their own control):

1. **Week 0 — baseline.** Participant logs what they *use* and *throw away* in
   Kulpio but does **not** rely on its reminders/notifications (treat it as a
   diary only). This measures their normal waste.
2. **Week 1 — intervention.** Participant uses Kulpio fully: reminders on, checks
   "expiring soon", cooks-what's-going-first.

(If two weeks is too long, a 5-day/5-day split still works; state it honestly.)

## 3. Participants

- **N = 3–15** (friends, family, classmates). More is better, but even N = 5 is a
  legitimate pilot — just report it as a *pilot* and don't over-claim.
- Inclusion: does their own grocery shopping; has a phone that runs the PWA.
- Note demographics loosely (household size) — it affects waste volume.

## 4. Consent (blurb you can paste/print)

> *"I agree to take part in a short study on food waste using the Kulpio app. For
> ~2 weeks I'll record the food I use and throw away. I understand my data is
> stored on my device, that I'll export an anonymous CSV (no name, no email) to
> share for analysis, that participation is voluntary, and that I can withdraw and
> delete my data at any time (Profile → Delete account & data)."*
> — Name/initials, date.

Keep participants **anonymous**: label them P1, P2, … Do not collect names in the
data file.

## 5. Procedure

1. Install the PWA; do the onboarding.
2. **Baseline week:** each time they eat/use an item tap **Used it**; each time
   they bin something tap **Wasted it**. (Diary mode — ignore reminders.)
3. **Intervention week:** same logging, but now *act on* Kulpio (reminders,
   "expiring soon", recipes).
4. **End:** Profile → **📊 Your impact → Download study data (CSV)**. Send you
   the CSV (columns: `date, action, item, price, currency`). Also ask them to
   complete the short survey (§7).

## 6. Metrics (computed from the CSVs)

For each participant and phase (baseline vs intervention):

- **Waste rate** = wasted ÷ (used + wasted).
- **Items wasted / week.**
- **Money wasted / week** (from the `price` column).
- **Primary outcome:** change in waste rate, baseline → intervention.

Aggregate across participants: mean change, and a simple paired comparison
(e.g. paired *t*-test or Wilcoxon signed-rank if you know it; otherwise report
mean ± range and how many participants improved).

### Analysis (any spreadsheet)

Concatenate the CSVs (add a `participant` and `phase` column), then pivot:
`count(action='wasted')` and `sum(price where action='wasted')` per
participant × phase. The Impact screen in the app gives each participant their
own summary as a sanity check.

## 7. Usability survey (optional but valuable)

Ask the 10-item **System Usability Scale (SUS)**, or at minimum:

- "Kulpio was easy to use." (1–5)
- "It helped me waste less food." (1–5)
- "I would keep using it." (1–5)
- One open question: "What would you change?"

## 8. Threats to validity (report these — judges respect honesty)

- **Small N / not random** → call it a *pilot*, don't generalise.
- **Hawthorne effect** (people waste less just because they're being observed) →
  the within-subject design partly controls for this, but note it.
- **Self-reported logging** may miss items → acknowledge.
- **Order effect** (intervention always second) → note; ideally counterbalance if
  you have enough participants.

## 9. Results template (fill after running)

| Metric | Baseline (mean) | Intervention (mean) | Change |
|---|---|---|---|
| Waste rate (%) | … | … | … |
| Items wasted / week | … | … | … |
| Money wasted / week | … | … | … |
| Participants who improved | — | — | … / N |
| Mean SUS (0–100) | — | — | … |

> Paste these into `PROJECT.md` §6, and keep them clearly separate from the
> projected figures in `IMPACT_MODEL.md`.
