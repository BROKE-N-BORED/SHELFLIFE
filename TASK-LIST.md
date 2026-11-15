# ShelfLife task list — works exactly like Joshua said it should

The brief (his words, re-stated 2026-11-14): upload a photo → staged magazine
photo of the exact item → the system picks the sites from the 30 most likely
to sell it → creates the listings and manages them for 30 days → alerts only
if an item sells or at day 30 → day-30 removal to ONE exportable Plato's
Closet list → every item gets a serial number saved with the original photo →
setup email + password makes, manages, and verifies all the accounts →
extremely easy to use for someone who doesn't use tech.

This list is SHELFLIFE ONLY. Work on other projects lives in those projects'
own threads; they appear here only where ShelfLife waits on them.

Statuses: [DONE] [IN PROGRESS] [BLOCKED] [ ] not started.

## 1. Fara backend running — the model doing the human steps

Phase 1 [DONE] 2026-11-15 (report: docs/fara-phase1.md):
- Pick is Fara1.5-4B (MIT, 4.5B); Fara-7B ruled out — 16 GB RAM, worse
  scores, and trained to never do signups or form submissions.
- Fits the 8 GB PC tight (Q4_K_M ~5.0 GB model-side at 15K context;
  IQ4_XS ~4.7 GB recommended daily).
- OST: YES, proven live (`ollama pull hf.co/bartowski/Fara1.5-4B-GGUF`
  reports vision; two-FROM Modelfile works; ADAPTER is dead).
- Harness: fara-cli. MagenticLite out (no file uploads through forms).
- Speed reality: ~2-5 min/step on CPU, 30-80 min per listing — a
  background queue, not interactive.
- Path: A now (trim the 4B), B2 later (distill to a small student);
  B1 (BrowserVLM) blocked — weights unreleased.
- Cycle: Test -> Trim -> Test -> Train -> repeat, baseline first, with a
  5-task suite, grounding tracked separately, stopping rule (smallest
  that passes within ~5 GB).
- Training browser is Forge Browser (his local AI browser) — it records
  trajectories (screenshot + action + result) from real runs.
- Honest: no model has produced an action yet. First live action is
  Phase 2A step 1 on the PC.

Test pages [DONE] 2026-11-15 (`agent-test/`): fake signup, fake listing
form, 10-target grounding probe, suite spec (SUITE.md).

Phase 2A — baseline on his PC [BLOCKED on him]:
- [ ] Pull the model on his PC:
      `ollama pull hf.co/bartowski/Fara1.5-4B-GGUF`
- [ ] Start llama-server with the model + mmproj (`-c 16384`); confirm it
      loads and answers a vision prompt
- [ ] Run OST against the pulled model (load-and-see baseline)
- [ ] Run the baseline: Fara1.5-4B Q4_K_M through the 5-task suite via
      fara-cli, record the numbers (30-80 min/task — background/overnight)

Phase 2B — the cycle [ ]:
- [ ] Trim one step (download IQ4_XS), test, record the delta
- [ ] Train on what broke (trajectories from Forge Browser runs)
- [ ] Repeat until the stopping rule fires; ship the smallest passing quant

Phase 2C — wiring [ ] (after the baseline passes):
- [ ] Agent service: queue poll -> fara-cli loop -> result + proof URL
- [ ] Human-check handoff UI in ShelfLife (paused state + resume)
- [ ] First real listing on a test account, then eBay when the account exists

Waits on other threads (not done here):
- STELLA DEV: trajectory mode for distill + VLM-aware LoRA training —
  needed before the Train step works on a vision agent.
- Forge Browser: confirm the recording artifact covers trajectory capture.

## 2. Wire the agent to ShelfLife's creation queue [ ]

The app hands a task to the agent; the agent reports back live /
needs-a-check / failed, with the real listing address as proof.
(Blocked on the Phase 2A baseline passing.)

## 3. eBay API connection [ ]

Developer app + his authorization, so eBay listings post directly with
no browser at all. (Blocked on his eBay account existing.)

## 4. Prove one real account gets created end to end (eBay first) [ ]

(Blocked on his eBay account existing.)

## 5. Prove one real listing posts end to end (eBay first) [ ]

Confirmed by the live-proof gate with the real address.
(Blocked on his eBay account existing.)

## 6. Roll the agent out across all 30 sites [ ]

Accounts + listings, one site at a time, each proven.
(Blocked on items 4-5.)

## 7. His phone verdict [ ]

The whole flow the way he'll use it. (Blocked on him.)

## 8. Hand the finished build to Fauve [ ]

Very last step, only once it works the way he needs it.

## Blocked on him — the short list

- The model pull on his PC (Phase 2A step 1)
- His eBay account (unblocks real-site trajectories, the eBay API
  connection, the first real account + listing)
- His phone verdict on the app

## Already done

- Staged exact-item photo + approval gate (no fake regenerated items).
- Appraiser from real resale listings, with the comparables shown.
- Creation queue + live-proof gate (app + repo copy v1.1.0, pushed
  2026-11-15, 6/6 SHA verified).
- Duplicate-sale rule (highest price wins, earliest wins ties).
- Sale email + shipping guide + ZIP prompt.
- Helper chat + Inbox (reads, files, and replies to the selling Gmail).
- One-profile setup + all-30 account walkthrough, dedicated-Gmail tip.
- Repo copy v1.1.0 pushed + verified.
- Fara Phase 1 check + agent test pages (2026-11-15).

## Not ordered — don't build unless he says so

- Returns, getting paid/fees, packaging.
- GitHub Pages for the repo (owner action: Settings -> Pages, deploy
  from main; site would be https://broke-n-bored.github.io/SHELFLIFE/).
