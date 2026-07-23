# Kulpio — Presentation Scenario (live jury defense)

A slide-by-slide speaking script for defending Kulpio in front of the judges,
built so that **every scored criterion** of both competitions is spoken out
loud, and matched to the slides in `Kulpio_firSTep.pptx` and
`Kulpio_Infomatrix.pptx`.

> **How to use this:** the talk-track is written by slide *title* (both decks
> share the same slides, just in a slightly different order — the two running
> orders are in §4 and §5). Say it in your **own words** — these are anchors,
> not a script to memorize. Target **~5 minutes** of talking, then Q&A.
> Have the **live app open on your phone** to demo if the jury asks.

Criterion tags used below:
**[fS-n]** = firSTep criterion n · **[IM]** = Infomatrix criterion.
firSTep's 9: 1 Personal interest · 2 Problem · 3 Creativity/originality ·
4 Usability/value · 5 Scientific method · 6 Future/reflection ·
7 Portfolio/documentation · 8 Video · 9 Presentation.
Infomatrix: Innovation · Technical quality · Creativity · Documentation · Presentation.

---

## 1. Opening (before slide 1 — ~15 s)

> "Good [morning/afternoon]. My name is Daniil Bejenari, from T.L. Orizont in
> Ceadîr-Lunga. My project is **Kulpio** — an app that helps families waste
> less food. I built all of it myself over about four weeks, and I'd love to
> show you what it does and how it works."

*Confident, smiling, slow. This first line is scored as* **[fS-9] [IM Presentation]**.

## 2. Slide-by-slide talk-track

### 🍐 TITLE — "Kulpio"  (~10 s)
> "Kulpio — waste less food, save money, in any language. Built for the
> [firSTep Creative Engineers / Infomatrix Programming] category."
Just set the tone and move on. **[fS-9]**

### WHY I BUILT THIS — "It started in my own fridge"  (~30 s) *(firSTep)*
> "This started at home. I kept watching good food go bad — bought with the
> best intentions, forgotten at the back of the fridge, then thrown out. It
> bothered me twice: it's money in the bin, and wasted food is a real climate
> problem. So I decided to build the tool I wished existed — one that just
> tells me what to use next, before it's too late."
This is the emotional hook — **the single most important 30 seconds for
firSTep.** **[fS-1 Personal interest]**
*(Infomatrix deck has no "Why" slide — fold one honest sentence of this into
the Problem slide instead.)*

### THE PROBLEM — "A third of our food is wasted"  (~30 s)
> "The scale is huge: the FAO says about a third of all food produced is
> wasted, and households are one of the biggest contributors. But here's the
> key insight — at home it's not that food spoils too fast. It's that we
> *forget* it. That means it isn't a preservation problem, it's an
> **information problem** — and that's exactly what an app can solve."
**[fS-2 Problem statement] [IM]**

### UN GLOBAL GOALS — "Built for the SDGs"  (~25 s)
> "Because of that, Kulpio is built directly for the UN Global Goals. Its main
> goal is **SDG 12, responsible consumption** — and specifically **Target
> 12.3: halve global food waste by 2030.** It also serves SDG 2, zero hunger,
> and SDG 13, climate action."
firSTep *requires* an SDG link — say the number 12.3 clearly. **[fS-2] [fS-4]**

### THE IDEA — "Track it, know what's going off, cook it first"  (~25 s)
> "The whole app is one simple loop in three steps. One — **add** food in
> seconds. Two — **know** what expires, and when. Three — **use it** in time,
> and watch the money you save. Everything else supports that loop."
**[fS-4 Usability] [IM Innovation]**

### SEE IT / A CLOSER LOOK — screenshots + gallery  (~50 s — the heart)
> "Here it is running on a real phone. You scan a barcode and get a full
> product card. You can photograph a whole receipt and it fills your fridge
> after a review step. Every item wears a **freshness ring** — green, amber,
> red — and the home screen **counts down to the next thing that expires**.
> When you use food in time, the money-saved counter moves. Your family shares
> one fridge with a single code — with an activity feed and a chat. And all of
> this works **completely offline**, in **33 languages**."
Point at the rings, the countdown, the shared fridge. If allowed, **switch to
your phone and do this live for 20 seconds** — nothing scores usability like a
working demo. **[fS-4 Usability/value] [fS-3 Creativity] [IM Creativity]**

### FEATURES — "What Kulpio does"  (~20 s)
> "To sum the features up: effortless input, storage sections for fridge,
> freezer and pantry, recipes from what you have, the shared household,
> a motivation layer, and 33 languages with full right-to-left support."
Don't read all six — gesture at the grid and name the highlights. **[fS-4] [IM]**

### METHODOLOGY — "How Kulpio decides when food expires"  (~35 s)
> "I want to show the thinking here, because trust matters. Kulpio treats a
> **printed date as the truth** — it always wins. Only when there's no date
> does it estimate, from a built-in offline table, and only then does AI
> refine it. And the AI itself degrades gracefully: a top model if available,
> a free model as fallback, and a clean error otherwise — so the app never
> blocks. It never pretends to know more than it does."
This is your **scientific-method** slide — say "printed date always wins" and
"never pretends to know more than it does." **[fS-5 Scientific method] [IM Technical quality]**

### UNDER THE HOOD — "One offline file + one worker"  (~30 s)
> "Technically, the entire app is **one static HTML file** — no framework, no
> build step — installed as a Progressive Web App with a service worker, so it
> runs offline. One Cloudflare Worker serves both the app and its API, backed
> by an SQLite database for accounts and shared households. It deploys with a
> single command."
**[IM Technical quality] [fS-5]** — for firSTep Creative Engineers this shows
real engineering; keep it short and plain.

### vs. EXISTING APPS — "Why Kulpio is different"  (~25 s) *(Infomatrix)*
> "There are other food apps, but none combine what Kulpio does: offline with
> no install, AI reading of labels and receipts, a *social* shared fridge with
> chat, 33 languages, and privacy-first. It's the **combination** that's new."
**[IM Innovation]** *(firSTep deck folds this into the Features talk.)*

### PRIVACY & SECURITY — "Private by design"  (~25 s)
> "Kulpio is private by default. Your fridge lives on your device — nothing
> leaves unless you turn on a networked feature. If you make an account, you
> can **export all your data** or **delete your account completely**, one tap
> each. Passwords are properly hashed, logins are rate-limited, and sharing
> codes are cryptographically random."
**[fS-4 Value/trust] [IM Technical quality]**

### QUALITY / TESTED — "Built to last"  (~20 s) *(Infomatrix)*
> "This isn't a demo held together with tape. Over **300 automated tests** run
> on every single change — completely offline — across four suites. That's how
> I know it actually works."
**[IM Technical quality]** *(firSTep: say this one sentence on the Under-the-hood slide.)*

### IMPACT — "Projected savings, and how we'll measure it"  (~35 s)
> "How much does it help? I'm being careful here. This chart is a
> **projection from a transparent model — not a study.** Under a mid-range
> assumption it projects about **30% less waste and roughly €128 saved per
> household per year.** To get *real* numbers, I designed a small pilot study:
> families record a normal week, then a week using Kulpio, and the app exports
> the data as a CSV. Honesty about this is the point."
Saying "this is a projection, not measured data" **out loud earns trust** with
technical judges. **[fS-5 Scientific method] [IM Technical quality]**

### THE JOURNEY — "How it evolved — and what I solved"  (~35 s)
> "The project grew in small steps — over 240 commits. Four turning points:
> making it work offline, making expiry trustworthy, killing the typing with
> scanning, and making a shared fridge that two phones can edit without losing
> each other's data — that last one was the hardest bug I solved. I also
> *removed* several features I built — a voice assistant, a wardrobe for the
> pear — because the app got better every time it got smaller."
Judges love honest iteration and dead ends. **[fS-3 Creativity/originality]
[fS-6 Reflection] [IM Innovation]**

### WHAT'S NEXT — "Where Kulpio goes from here"  (~20 s)
> "Next: I'm bringing it to the Play Store as a native Android app, and
> running the real pilot with families. Kulpio is free and open-source, so
> anyone can build on it. The vision is simple — help households everywhere
> waste less, in their own language."
**[fS-6 Future improvements]**

### CLOSE — "Waste less. Save more. Together."  (~15 s)
> "So that's Kulpio — a food-freshness tracker that fits in your pocket, in
> any language, built for the Global Goals. Thank you — I'd be happy to answer
> any questions."
Smile, stop talking, invite questions. **[fS-9] [IM Presentation]**

---

## 3. What the *portfolio/documentation* criterion needs (say it once)

firSTep scores **[fS-7 Display/Portfolio/Documentation]** and Infomatrix scores
**Documentation** separately from the talk. You don't present these, but make
sure the judges can see they exist — mention in one breath (e.g. on the
Journey or Close slide):

> "Everything is documented in the repository — a full project report, an
> architecture write-up, and a development journal of how it was built."

Files that satisfy this: `REPORT.md`, `INFOMATRIX_DOCUMENTATION.md`,
`ARCHITECTURE.md`, `PROJECT.md`, `JOURNAL.md`, plus the public 240-commit
history.

---

## 4. firSTep running order (Kulpio_firSTep.pptx, 15 slides)

Title → **Why I built this** → Problem → SDGs → The idea → See it → Gallery →
Features → Methodology → Under the hood → Impact → Privacy → Journey → What's
next → Close.

### firSTep criteria coverage — all 9 covered

| # | Criterion | Where you earn it |
|---|---|---|
| 1 | Personal interest | **Why I built this** slide (the fridge story) |
| 2 | Problem statement | Problem + SDGs slides |
| 3 | Creativity / originality | Freshness rings, countdown, the pear, the journey's dead ends |
| 4 | Usability & value | See it / Gallery / Features + the live demo + Impact |
| 5 | Scientific method | Methodology (date > table > AI) + Impact (model vs. real study) |
| 6 | Future / reflection | Journey (what I removed & learned) + What's next |
| 7 | Portfolio / documentation | The one-line mention + the repo docs (§3) |
| 8 | Project video | The 3-min video (`VIDEO_SCRIPT.md`) — separate deliverable |
| 9 | Presentation | Your delivery: opening, pace, eye contact, the demo, the close |

## 5. Infomatrix running order (Kulpio_Infomatrix.pptx, 15 slides)

Title → Problem → SDGs → The idea → See it → Gallery → Features → Methodology →
Under the hood → **Why different** → Privacy → **Quality/tested** → Journey →
What's next → Close.

### Infomatrix criteria coverage

| Criterion | Where you earn it |
|---|---|
| Innovation | The idea + **Why different** (the combination) + Journey |
| Technical quality | Methodology + Under the hood + Privacy + **Quality/tested** |
| Creativity | The mascot, freshness rings, live countdown, receipt scanning |
| Documentation | Repo docs (§3) — say the one-line mention |
| Presentation | Your delivery + the working live demo |

---

## 6. Jury Q&A — likely questions and strong answers

Keep answers short and honest. "I don't know yet, but here's how I'd find out"
is a *strong* answer, not a weak one.

**Q: How is this different from apps that already exist?**
> "Individually, others do pieces of it. What's new is the combination:
> offline with no app-store install, AI that reads labels *and* receipts, a
> social shared fridge with chat, 33 languages, and privacy-first — in one
> tool."

**Q: Does it really work offline?**
> "Yes. It's a single file with a service worker, and my whole test suite runs
> it with the network *blocked* — so offline is tested, not just claimed."

**Q: How accurate are the expiry estimates?**
> "A printed date always wins — I never override a real date. Only when
> there's no date do I estimate from an offline table, then optionally refine
> with AI. It's an honest approximation, and the app says so."

**Q: Is that €128 / 30% number real?**
> "No — and I'm careful about that. It's a projection from a transparent
> model, not measured data. The real number comes from the pilot study I
> designed; families record a baseline week and a Kulpio week."

**Q: Did you build it alone? How long?**
> "Yes, alone, over about four weeks — more than 240 commits, all public."

**Q: What did you actually write vs. use libraries?**
> "The app is vanilla HTML, CSS and JavaScript — no framework. I use open data
> — Open Food Facts for products, TheMealDB for recipes — and Cloudflare to
> host it. The logic is mine."

**Q: What was the hardest technical problem?**
> "The shared household. Two phones editing the same fridge clobbered each
> other. I fixed it by merging members, activity and chat by id on the
> server, instead of overwriting the whole state."

**Q: Where does user data go? Is it safe?**
> "By default nothing leaves the phone. If you make an account, the password
> is hashed with PBKDF2, sessions are opaque tokens, and you can export or
> delete everything for GDPR."

**Q: Which SDG, exactly?**
> "SDG 12 is primary — Target 12.3, halve food waste by 2030 — plus SDG 2 and
> SDG 13."

**Q: Why the pear mascot — isn't it childish?**
> "It's the motivation layer. The pear reflects the state of your fridge —
> happy when it's fresh, worried when things are dying — so caring for him
> means caring for your food. It's tasteful, and it's optional."

**Q: How do you know people will actually use it?**
> "That's the whole reason I made input almost effortless — four ways to add
> food, most needing no typing. Whether it changes habits is exactly what the
> pilot measures."

**Q: What would you improve next?**
> "A native Android app, running the pilot for real numbers, and validating
> the shelf-life table against reference data."

---

## 7. Delivery checklist

- [ ] Rehearse out loud **3 times** with a timer — aim for ~5 minutes of talk.
- [ ] Have the **live app open on your phone**, with ~7 realistic items seeded
      (some expiring today, some fresh, one frozen) and the shared fridge
      showing a chat message — ready to demo in 20 seconds if asked.
- [ ] Look at the **camera/judges**, not the slides. Advance slides, don't read them.
- [ ] Slow down. Pause after the key lines ("it's an information problem",
      "a printed date always wins", "this is a projection, not a study").
- [ ] It's fine to say "great question" and think for a second before answering.
- [ ] English for both competitions. Simple, clear sentences beat fancy ones.
- [ ] End on the close line, then stop and invite questions — don't trail off.
