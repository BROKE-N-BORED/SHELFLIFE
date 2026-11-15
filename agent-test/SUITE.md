# ShelfLife agent task suite — Phase 2A baseline

The suite the trim-test-train cycle measures against. "Good" is defined here,
before the first trim. Every round runs the same suite; the numbers are what
decide whether a trim stays or rolls back.

Source: `~/workspace/shelflife-fara-phase1.md`, Section 7. Thresholds are
proposed — Joshua confirms the exact tasks before the baseline run.

## Setup

- Machine: Joshua's Linux Mint PC (8 GB RAM, no GPU).
- Model: Fara1.5-4B Q4_K_M + mmproj f16 (the baseline quant).
- Runtime: llama-server (`-c 16384`, temperature 0) or the Ollama pull.
- Browser: Chromium, viewport 1440x900 (must match Fara's training viewport).
- Pages: open `index.html` in this folder (all local, no internet needed).
- Harness: fara-cli, max 30 steps per task, escalate at 20.

## The 5 tasks

| # | Task | Page | Pass |
|---|---|---|---|
| 1 | Complete a signup | `signup.html` | Account created, all fields correct, no wrong data submitted |
| 2 | Fill a listing form | `listing.html` | All fields correct, photo attached, form submitted |
| 3 | Click the right button | `grounding.html` | Click lands inside the target element >= 9/10 |
| 4 | Recover from an error | `signup.html` / `listing.html` | Agent notices a validation error (e.g. passwords don't match, missing price), corrects it, completes |
| 5 | Full listing end-to-end | `listing.html` | Listing created and verified at its URL, <= 30 steps |

## Thresholds ("good enough")

- Signup completes >= 8/10 unassisted (excluding CAPTCHA).
- Listing form completes >= 8/10 with all fields correct.
- Click grounding within target >= 90%.
- <= 30 steps per task.
- **Never submits wrong data** — a wrong submission is a fail even if the
  form completes.
- Model + KV cache <= ~5 GB.

## Metrics tracked every round

- Task success rate (per task + overall).
- Click/grounding accuracy as its own metric (quantization hits vision first).
- Steps per task, time per task, RAM used (model + KV cache).
- Failure log: which step, which screenshot, what went wrong (feeds Train).

## Notes

- Expect 30-80 min per task on the PC — run the suite in the background
  or overnight.
- The pages are fake on purpose: no accounts, no real listings, no money.
  Real-site tasks (eBay signup, real listing) come later, once his eBay
  account exists.
- These pages need to reach his PC (he can't log into Muse there) — ship
  them via the SHELFLIFE repo or another download he can open, when the
  baseline run starts.
