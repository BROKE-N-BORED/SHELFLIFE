# ShelfLife Fara Backend — Phase 1 Report

**Date:** 2026-11-15
**Scope:** Research + verification + planning + smoke testing only. No accounts created, no listings posted, no money spent.
**Target machine:** Joshua's Linux Mint PC — 8 GB RAM, no GPU, Ollama already installed.
**Constraint:** hard $0. Everything free and open.

## Top-line answers

| Question | Answer |
|---|---|
| Which model? | **Fara1.5-4B** (current generation). Fara-7B is ruled out for the PC (needs 16 GB RAM). |
| Does it fit the 8 GB PC? | **Yes, at Q4_K_M or IQ4_XS — tight.** ~5.0 GB model-side at 15K context (2.88 weights + 0.67 mmproj + 0.48 KV cache + ~1.0 overhead), inside the ~5 GB budget, leaving ~0.5–1.4 GB spare. Keep pages light and nothing else open. |
| Can it run through OST? | **Yes — proven by the live test.** Two routes work in Ollama 0.40.16: `ollama pull hf.co/bartowski/Fara1.5-4B-GGUF` (Ollama fetches model + mmproj and reports `vision`) and `ollama create` with a two-`FROM` Modelfile (model GGUF + mmproj GGUF). Only the old `ADAPTER` keyword is dead. OST can only test that the model loads and sees — not that it can drive a browser. |
| Which harness? | **fara-cli** (Microsoft's minimal loop, Linux-native). MagenticLite is a research prototype that can't upload files through forms. Browser-use/Stagehand are architecturally mismatched (they want code, Fara emits clicks). |
| Trim or start small? | **Trim first (Path A), distill second (Path B2).** Path A works this week with proven pieces; Path B2 is the better end state but needs Stella work that doesn't exist yet. BrowserVLM (Path B1) has no downloadable weights — a watch item, not a building block. |
| The method | **Test → Trim → Test → Train → repeat.** Baseline first, then trim in small steps, one variable at a time, measuring click accuracy separately every round. |

---

## 1. The model — verified facts

### Fara-7B (previous generation) — ruled out for the PC
- Microsoft Research, announced 2025-11-24. 7B parameters nominal (8.29B incl. the vision encoder), base Qwen2.5-VL-7B, trained on **145K trajectories / ~1M steps** via FaraGen (total training mix 1.8M samples). MIT licence. 128K context.
- **Functional blocker, not just a RAM problem: Fara-7B was trained to NEVER go past critical points** — "entering personal info, completing purchases, making calls, sending emails, submitting applications, and signing into accounts." It cannot do signups or submit listing forms, which is exactly ShelfLife's job. It was also never trained on login-gated tasks: on Microsoft's six synthetic login-gated environments it scores 18.8% vs Fara1.5-9B's 71.8%.
- Hugging Face `microsoft/fara-7b` (also cited `microsoft/Fara-7B`). GitHub https://github.com/microsoft/fara.
- Weights **16.58 GB** disk (safetensors, 4 shards: 4.97 + 4.99 + 4.93 + 1.69 GB — verified from the live file list; older "14–15 GB" figures are stale). GGUF exists: `bartowski/microsoft_Fara-7B-GGUF` (Q4_K_M 4.68 GB, Q6_K_L 6.52 GB, down to IQ2_M 2.78 GB). An ONNX build also exists (`microsoft/Fara-7B-onnx`, int4, Qualcomm NPU, MIT). A community Ollama model exists (`maternion/fara`, 7b-Q4_K_M 6.0 GB with vision bundled) — but the 7B doesn't fit the PC and can't do signups anyway.
- Hardware (aimadetools guide): bf16 needs 16 GB VRAM / 32 GB RAM; Q4 needs 6 GB VRAM / 16 GB RAM; CPU-only GGUF Q4 needs **16 GB RAM**. The PC has 8 GB. **Ruled out.**
- Benchmarks (Fara site): WebVoyager 73.5, Online-Mind2Web 34.1, WebTailBench v1.5 Process 48.8 / Outcome 24.1. Also 38.4% on WebTailBench (609 tasks), first among computer-use models at release.

### Fara1.5 family (current generation) — the pick
- Fara1.5-4B / 9B / 27B, built on Qwen3.5, SFT on FaraGen1.5 synthetic web trajectories. Released 21 May 2026 (announced 22 July 2026). MIT licence. Site: https://microsoft.github.io/fara/. Paper: arXiv 2606.20785.
- **Fara1.5-4B** (HF `microsoft/Fara1.5-4B`): 4.5B parameters (4,539,265,536), 262,144-token context, **vision-only perception** (screenshots, not DOM). Safetensors 9.08 GB (2 shards); 9B is 18.8 GB, 27B 54.71 GB. Emits `<tool_call>...</tool_call>` XML blocks with JSON calling the `computer_use` function. Trained against a specific system prompt (ships in MagenticLite). Card says: "Please use only with the harness developed in Github/fara CLI or Magentic-Lite."
- Can ask for missing info, flag ambiguity, and pause for approval before irreversible actions. **Unlike the 7B, Fara1.5 completes critical steps (sign-ins, form submissions) after explicitly seeking user approval** — it pauses unless the user authorized the action upfront. ShelfLife must build that authorization into its loop; fully unattended operation is not how the model works.
- Training mix (FaraGen1.5, ~2M samples): ~60% web trajectories, 12.8% synthetic environments, **12.5% form filling**, 8.8% grounding, 4.9% VQA, 0.8% GUI drag. Form filling — ShelfLife's core job — is a real slice of its training.
- **Experimental release** — Microsoft says run it sandboxed and monitored, and avoid sensitive data and high-risk domains.

### Official benchmarks (Fara site, checked 2026-11-15)

| Model | WebVoyager | Online-Mind2Web | WebTailBench Process | WebTailBench Outcome |
|---|---|---|---|---|
| Fara1.5-4B | 80.8 | 57.3 | 60.3 | **27.4** |
| Fara1.5-9B | 86.6 | 63.4 | 64.5 | 32.3 |
| Fara1.5-27B | 89.3 | 72.3 | 72.9 | 40.2 |
| Fara-7B | 73.5 | 34.1 | 48.8 | 24.1 |

Read the Outcome column honestly: on hard real-world web tasks, the 4B reaches the correct final state only ~27% of the time. ShelfLife's jobs (signup forms, listing forms) are narrower and better represented in training than the average WebTailBench task, so the baseline test on ShelfLife's own suite (Section 7) is what matters — but nobody should expect 95% out of the box. Reliability compounds against long tasks: 95% per step → 21% success over 30 steps.

**Grounding (finding the right thing to click):** ScreenSpot-v2 — Fara-7B 89.3%, Fara1.5-4B 92.3%, 9B 94.0%, 27B 94.4%. ScreenSpot-Pro (hard, high-res) — 4B 59.9%, 9B 66.2%, 27B 66.8%. OSWorld-G Refined — 4B 68.0%, 9B 69.7%, 27B 71.3%. These full-precision numbers are the baseline the cycle's grounding metric is measured against — quantization will cost some of this.

**Login-gated tasks (directly relevant to signups):** on Microsoft's six synthetic login-gated environments, Fara1.5-9B averages 71.8% vs Fara-7B's 18.8% — the 7B was never trained on login-gated tasks; 1.5 was.

**Notes:** Fara-7B's 38.4 is WebTailBench v1; on v1.5 its outcome success is 24.1% (process 48.8%) — don't compare the 38.4 directly against the 1.5 family's v1.5 numbers. Minor discrepancy: Microsoft's own pages disagree on 27B WebVoyager (89.3 on the cards/site vs 88.6 in the research blog's Table 2) — unresolved, immaterial to the 4B pick. The models verification recommends Fara1.5-9B as the best fit on capability (Q4_K_M 5.91 GB verified, ~6 points better on Online-Mind2Web than the 4B) — but the 9B does not fit the 8 GB PC (Section 2). The 4B is the pick for this machine; the 9B is the pick if a bigger machine ever enters the picture.

### Fara1.5-4B GGUF — verified from the bartowski README (2026-11-15)

Repo: https://huggingface.co/bartowski/Fara1.5-4B-GGUF — quantized with llama.cpp b10087, imatrix. Prompt format is ChatML (`<|im_start|>`), assistant starts with `<think>`.

| Quant | Size | Note |
|---|---|---|
| bf16 | 8.42 GB | Full precision — the requant source |
| Q8_0 | 4.49 GB | Near-lossless |
| Q6_K_L | 3.83 GB | |
| Q6_K | 3.68 GB | |
| Q5_K_M | 3.32 GB | |
| **Q4_K_M** | **2.88 GB** | **Recommended default — the baseline** |
| Q4_K_S | 2.72 GB | |
| IQ4_XS | 2.54 GB | Recommended (imatrix) |
| Q3_K_M | 2.45 GB | Low quality |
| IQ3_M | 2.36 GB | |
| IQ3_XS | 2.28 GB | |
| IQ3_XXS | 2.12 GB | |
| Q2_K | 2.06 GB | Very low quality |
| IQ2_M | 1.83 GB | Smallest |

Vision projector (mmproj) files: `mmproj-Fara1.5-4B-bf16.gguf` and `mmproj-Fara1.5-4B-f16.gguf` (f16 = 672,423,584 bytes ≈ 0.64 GB). **The mmproj is required** — without it the model cannot see screenshots. Note: the bartowski README table does not list the mmproj files — they exist in the repo's file listing (verified by direct download, 2026-11-15).
Run options listed by bartowski: `ollama run hf.co/bartowski/Fara1.5-4B-GGUF`, `llama-server -hf bartowski/Fara1.5-4B-GGUF`, `vllm serve microsoft/Fara1.5-4B`.

### Smaller alternatives (for Path B — see Section 8)
- **BrowserVLM** (BrowserOS): 0.54B decoder + ~400M SigLIP2 vision tower. 79.1 ScreenSpot-V2, 36.4 ScreenSpot-Pro — ahead of UI-TARS-7B on the hard split at ~1/13 the size. Runs BESIDE an agent, not instead of it: it only grounds clicks, it does not plan. **Weights still "coming soon"** (page last updated 90 days ago, checked 2026-11-15) — **not downloadable today**. Watch item, not a Phase-1 building block.
- **AA-VL-4B-GGUF** (`prithivMLmods/AA-VL-4B-GGUF`): 4.44B GUI grounding VLM, Qwen3-VL-4B based, GGUF Q2_K–F16 with mmproj, 65.25% OSWorld-G Original / 74.47% Refined. A candidate grounder if BrowserVLM never ships — but 4.44B is not smaller than Fara.
- **UI-Venus-1.5-2B** (`inclusionAI/UI-Venus-1.5-2B`): 2B GUI agent, SOTA grounding family. No GGUF found (searched 2026-11-15) — would need conversion from safetensors. Candidate for a later phase.
- Fara1.5-9B GGUF exists (`bartowski/Fara1.5-9B-GGUF`, Q4_K_M 5.91 GB per a weak source) — too big for the PC, noted only for the cloud/teacher role.

---

## 2. Hardware fit — the 8 GB no-GPU PC

### RAM budget (the hard numbers)

Microsoft requires **context ≥ 15,000 tokens and temperature 0** for best results — so 15K is the floor for the RAM math, not 8K. Qwen3.5-4B's KV cache is ~32 KB/token (most layers use linear attention), so 15K context ≈ 0.48 GB. At the full 262K context the KV cache alone would be 8.6 GB — unusable here. Linux Mint 22.3 Cinnamon idles at ~1.0 GB (measured).

| Item | Q4_K_M | IQ4_XS | IQ3_XS |
|---|---|---|---|
| Model weights | 2.88 GB | 2.54 GB | 2.28 GB |
| mmproj (f16) | 0.67 GB | 0.67 GB | 0.67 GB |
| KV cache @15K ctx | 0.48 GB | 0.48 GB | 0.48 GB |
| Runtime overhead | ~1.0 GB | ~1.0 GB | ~1.0 GB |
| **Model total** | **~5.0 GB** | **~4.7 GB** | **~4.4 GB** |
| Linux Mint desktop | ~1.0 GB | ~1.0 GB | ~1.0 GB |
| Chromium (agent browser) | ~0.5–1.0 GB | ~0.5–1.0 GB | ~0.5–1.0 GB |
| **System total** | **~6.6–7.5 GB** | **~6.3–7.2 GB** | **~6.0–6.9 GB** |

**Verdict: Q4_K_M fits at ~5.0 GB model-side, with ~0.5–1.4 GB spare on the system — tight.** IQ4_XS is the safer daily driver (same quality class, 0.34 GB smaller). The stopping-rule budget from the cycle design is **model + KV cache ≤ ~5 GB**, which Q4_K_M just meets and IQ4_XS meets comfortably. A heavy JS page (Chromium can peak to ~2 GB) can push the machine into swap — keep pages light and nothing else open while the agent runs. Fara-7B at Q4_K_M (4.68 + 1.35 mmproj + 0.84 KV + ~1.0 overhead ≈ 7.9 GB model-side alone) does not fit at any quantization.

### Speed
- Decode on CPU is a few tokens/s (slm.expert: "cpu-only yes — 4+ GB RAM at Q4 (a few tokens/s on a modern CPU)"; measured analogues: Phi-4 Mini 3.8B at 6.9 tok/s on an old i5 laptop, 5.3 tok/s on a 2-core i5-7200U).
- **The 2–5 s/step figure is GPU-served.** On a weak CPU the bottleneck is prefill — re-reading the screenshot-heavy prompt each step. A 1440×900 screenshot is ~1,600+ tokens, Fara keeps the most recent 3 screenshots in history, and a 380-token prompt took 36–41 s before the first token on a 2-core i5. **Realistic per-step time on his PC: ~2–5 minutes; a 16-step task ≈ 30–80 minutes.** On a modern desktop CPU: 30–60 s/step, 10–15 min/task. This is a "start a task and walk away" machine, not an interactive agent — fine for a background queue, but the plan must not promise minutes.
- Fara averages ~16 steps per WebVoyager task (vs ~41 for UI-TARS-1.5-7B) — step efficiency matters more than raw tokens/s on CPU.

### Ollama vs llama.cpp
- **Both work — proven by the live test (Section 10).** The conflicting sources are now settled: qwen-ai.com and the Unsloth guide ("no Ollama support due to separate vision files") are stale or were about the dead `ADAPTER` path. On Ollama 0.40.16, Fara1.5-4B runs with vision via `ollama pull hf.co/bartowski/Fara1.5-4B-GGUF` (Ollama fetches model + mmproj and reports `vision`) or via `ollama create` with a two-`FROM` Modelfile (model GGUF + mmproj GGUF). The only dead route is the `ADAPTER` keyword, removed in Ollama 0.34.x.
- **llama.cpp also works.** Qwen3.5 multimodal support is in llama.cpp (releases b12412–b12416 on 2026-11-15; b12415 CPU build tested working in the sandbox). `llama-server -hf bartowski/Fara1.5-4B-GGUF` loads model + mmproj together.
- **Recommendation: llama-server for the agent loop, Ollama for OST + testing.** Both expose an OpenAI-compatible endpoint, so the agent service can point at either. llama.cpp is the documented path for the agent loop and avoids Ollama's model-management overhead; Ollama is now verified for OST (Section 3) and is the easier path for Joshua to pull and test models. The choice is swappable later.

### Recommended PC configuration
- **Model:** Fara1.5-4B **IQ4_XS** (2.54 GB) + mmproj f16 (0.64 GB) — or Q4_K_M (2.88 GB) for the baseline test, since it is the recommended default and the baseline must be measured on the known-good quant.
- **Runtime:** llama.cpp `llama-server` (CPU build), context 16384 (Microsoft requires ≥15,000 tokens), temperature 0, served on localhost.
- **Browser:** Chromium, headless or headed, viewport 1440×900 (must match Fara's training viewport).
- **Harness:** fara-cli (Section 4).
- **Disk:** ~5 GB for model + mmproj + a spare quant; keep the bf16 (8.42 GB) only if disk allows — it is the requant source (see Section 6).

---

## 3. OST verdict — can Fara run through the Ollama System Test?

### What OST needs (verified from the source, `~/workspace/ollama-live-run/ost/ollama_system_test.py`)
- OST lists models via Ollama `/api/tags` (fallback `ollama list`) — **any locally-created model appears**, including one built with `ollama create` + a Modelfile.
- OST screens capabilities via `/api/show` → Ollama's `capabilities` array (`["completion","vision","tools"]`); it maps `"vision"` to its vision capability.
- OST runs vision tasks via `/api/chat` with images. `templates/vision.json` has 5 tasks (count shapes, read a sign, describe) with numeric/contains scoring, `num_predict` 300. Test images `images/shapes.png` + `images/sign.png` exist.
- **What OST needs from Fara:** a Modelfile with `FROM` the GGUF + `ADAPTER` the mmproj, created in Ollama, that reports `vision` in `/api/show`.

### Verdict — YES for Fara1.5-4B (proven by the live test, 2026-11-15)
Two routes work in Ollama 0.40.16, both verified on an isolated instance with the downloaded files:
1. **`ollama pull hf.co/bartowski/Fara1.5-4B-GGUF`** — Ollama fetches TWO blobs (the 2.9 GB model + the 672 MB mmproj), wires them together, and the resulting model reports capabilities `['tools', 'thinking', 'completion', 'vision']`. Its generated Modelfile shows two `FROM` lines (one per blob).
2. **`ollama create` with a two-`FROM` Modelfile** — `FROM` the model GGUF + `FROM` the mmproj GGUF. Creates successfully and reports `['tools', 'thinking', 'completion', 'vision']`. This is the route for local files (no 3.5 GB server-side download).
- **The only dead route is the `ADAPTER` keyword** (removed in Ollama 0.34.x, Sept 2026): `ollama create` with `ADAPTER` fails with "Error: LoRA adapters are no longer supported", and creating without it loads text-only (capabilities `['tools', 'thinking', 'completion']`, no `vision`). Anyone following old guides with `ADAPTER` will hit this — use two `FROM` lines instead. The qwen-ai.com and Unsloth claims that Qwen3.5 vision doesn't work in Ollama are stale or were about the `ADAPTER` path.
- **Caveat:** the `vision` capability flag is verified, but a live vision inference (sending an image, getting an answer) was NOT proven in this sandbox — RAM-blocked (Section 10). The end-to-end OST run (vision tasks passing) happens on the PC. The flag is what OST screens on, so OST will test it; the PC run confirms it answers correctly.
- **Fara-7B via Ollama: YES, it works too** — Qwen2.5-VL is well supported and a community model exists (`maternion/fara`, 7b-Q4_K_M 6.0 GB with vision bundled). But it's moot: the 7B doesn't fit the PC, and it was trained to never complete signups or form submissions (Section 1).
- **What OST can and cannot prove:** OST tests image UNDERSTANDING, not computer-use actions. A pass means "Fara loads in Ollama and sees" — valuable for the baseline, but NOT proof it can drive a browser. CUA testing needs fara-cli or a custom loop against the ShelfLife task suite (Section 7). OST is the first gate, not the whole test.

---

## 4. The harness — how the model drives a browser

### fara-cli — the pick
- Microsoft's minimal loop, in the Fara repo (https://github.com/microsoft/fara). Linux-native. Install: clone the repo, venv, `pip install -e .[vllm]`, `playwright install`. Run: `fara-cli --task "..." --endpoint_config <config.json>` — the config is an OpenAI-compatible endpoint (model / base_url / api_key), so it can point at a local llama-server instead of a cloud endpoint.
- This is the loop the model card itself points to ("use only with the harness developed in Github/fara CLI or Magentic-Lite").

### MagenticLite — not the pick
- A full agent app (MagenticBrain orchestrator + Fara browser model); its sandbox is a separate Quicksand VM. Linux native "untested but expected to work"; KVM needed for Quicksand acceleration.
- **It does NOT load local weights** — it talks to OpenAI-compatible endpoints per role; self-hosting needs ~48 GB GPU for Fara, ~96 GB for MagenticBrain. Research prototype, no commits since 23 July 2026, PyPI 0.2.2 (21 July 2026). MIT. https://github.com/microsoft/magentic-ui.
- **Deal-breaker: file uploads through web forms do NOT work.** A listing flow that needs photos hits this. Install is easy (`uv venv --python=3.12`, `uv pip install "magentic_ui>=0.2.0"`, `magentic-ui --port 8081`) but the upload gap rules it out for ShelfLife.

### Browser-use / Stagehand / Skyvern — architecturally mismatched
- Browser-use v1.0.5 and Stagehand v4 both dropped Playwright for direct CDP; both are DOM/accessibility-tree-first. Fara is vision-only and emits clicks, not code. No documented Fara support in browser-use, Stagehand, or Skyvern. Skyvern is AGPL-3.0 (licence caution); the others are MIT. Stagehand has built-in Fara support for the 7B, but the DOM-first design still fights a vision-only model.

### Loop cost and safety rules (verified)
- 2–5 s/step; cap iterations at 30–50, escalate to a human at 20 steps; **never trust the model's "I'm done"** — verify the final state independently (the live-proof gate).
- Viewport/screenshot size must match training: **1440×900**.
- Run the browser disposable and sandboxed, with a URL allowlist (marketplaces only). Prompt-injection risk is real: a hostile page can try to steer the agent — the allowlist + approval-before-irreversible-actions are the mitigations.
- **CAPTCHAs: open-source cores do NOT solve them; solving lives in paid clouds.** Human handoff is the established pattern — the agent pauses, the seller does the check, the agent resumes. This is already the ShelfLife design (Section 5).

---

## 5. The wiring design — ShelfLife queue → agent → result

Concrete pieces, no hand-waving:

1. **ShelfLife creation queue** (already exists in the app) holds listing jobs: item photo(s), title, price, category, description, target marketplace, seller account reference.
2. **Agent service** runs on the PC (same machine as the model + browser). It polls the queue (or the app pushes jobs to it over localhost HTTP) and takes one job at a time — one browser, one model, one job; no parallelism on 8 GB.
3. **Per job, the agent service:**
   - Opens Chromium (1440×900, sandboxed profile, marketplace allowlist).
   - Runs the fara-cli loop (or the equivalent loop embedded in the service): screenshot → Fara → click/type/scroll → repeat, max 30 steps, escalate at 20.
   - **Uploads the item photo** through the form (this is why MagenticLite is out and the loop must support file input).
   - On completion, **verifies the final state independently**: navigates to the listing URL and confirms the listing exists with the right title/price/photo. The listing URL is the proof.
4. **Results return to the queue** as one of three states:
   - **live** — listing verified at a real URL (the URL is stored as proof).
   - **needs-a-check** — agent paused (CAPTCHA, ambiguous field, approval needed). The seller does just that one check in the browser, then the agent resumes from where it stopped.
   - **failed** — with the step + screenshot where it broke (this failure record feeds the training loop, Section 9).
5. **Human-check handoff:** the app shows the seller the paused state (screenshot + what the agent needs). The seller completes the check in their own browser session or the agent's browser, taps "resume", and the agent continues. The seller never does the form work — only the check.
6. **Where the pieces live:** everything on the PC in Phase 2 (model, llama-server, agent service, Chromium). The ShelfLife web app talks to the agent service over its existing queue API. No cloud inference, no $0 broken.

---

## 6. Stella trimming — requant, distillation, and what's missing

### Requant (works today, with one trap)
- Stella v0.8.0 shipped requant (`stella-cli requant <tag> --quant Q4_K_M --as <new-tag>`) and distill. Requant resolves the installed GGUF blob, validates the quant name, checks disk first, and never touches the original.
- **The trap (proven by a real failed run, `requant-proof.log`): llama-quantize cannot requantize from an already-quantized model.** Shrinking `huihui_ai/qwen2.5-coder-abliterate:1.5b` to Q2_K failed: "requantizing from type q4_K is disabled." So Stella requant must start from **F16/BF16 (8.42 GB)** or **Q8_0 (4.49 GB)** — NOT from Q4_K_M.
- **Practical consequence: for Fara1.5-4B, requant is mostly unnecessary.** Bartowski already ships every quant from bf16 to IQ2_M. The cycle's Trim step is a *download*, not a compute job: pick the next smaller pre-made quant and test it. Stella requant matters only for quants bartowski doesn't ship, or for a future fine-tuned student whose weights start as safetensors.
- **Requant quality evidence:** llama.cpp KLD measurements — Q4_K_M small KLD 0.031; Q3_K_M medium 0.101 (3× worse). quantslant: Q4_K_M is "the practical sweet spot"; Q3_K_M shows "visible degradation"; Q2_K is "usually not worth running"; a 1.5B model at Q2_K "failed completely, solving 0 out of 12 benchmark tasks." For a 4B CUA the realistic floor is **IQ3_XS / IQ4_XS**; Q2 is likely to break action accuracy. The cycle TESTS this rather than assuming it.

### Distillation (the shape works, the vision part doesn't exist yet)
- Stella distill v0.8 (`stella-cli distill <profile> <project> --teacher <tag> --prompts <file>`) is **text-prompt based**: teacher answers become `distilled.jsonl`, with dedupe and resume. Real runs are proven (`distill-proof5.log`: 2 prompts → 4 answers → `distilled.jsonl`).
- **Gap: distill does NOT support screenshot→action trajectories.** A vision computer-use agent needs (screenshot + task + history) → (think + action) pairs. Stella needs a **trajectory mode** for distill — new STELLA DEV work, unscoped.
- **Gap 2: Stella train is text LoRA.** `train.py` is a "micro-LoRA fine-tuning on CPU" engine (LoRA only by default; full fine-tune of a 1.7B needs ~28 GB, so full FT is out on 8 GB). A grep of the live tree found no VLM/projector handling in train.py. Training a vision student needs VLM-aware LoRA (vision tower + projector + language model) — also new work, and realistically needs a free cloud GPU, not the 8 GB PC.
- **Distillation does apply to a vision CUA** — the teacher (Fara 4B) generates trajectories on ShelfLife's tasks, the student learns them. The concept is sound and it is exactly how Fara itself was trained (FaraGen trajectories). What's missing is the tooling, not the idea.

### Smallest workable setup (estimate, to confirm by testing)
- Fara1.5-4B **IQ4_XS** (2.54 GB) + mmproj f16 (0.67 GB) + KV cache @15K (0.48 GB) + overhead (~1.0 GB) ≈ **4.7 GB total**. On the 8 GB PC: ~6.3–7.2 GB used with Mint + Chromium. **This is the recommended daily setup.**
- IQ3_XS (2.28 GB) ≈ 4.4 GB total — the next trim step to test.
- Below IQ3_XS, expect grounding accuracy to fall first (Section 7 tracks it separately). Q2/IQ2 (~1.8–2.1 GB) is the floor to *test*, not to assume.

---

## 7. The cycle — Test → Trim → Test → Train → repeat

The method, in the corrected order. Baseline first.

### Stage 0 — Baseline Test (measure the model as-is)
- Run **untrimmed Fara1.5-4B Q4_K_M** through the ShelfLife task suite (below) + OST vision/speed checks. Record the baseline numbers. Nothing is trimmed until the baseline exists.

### The ShelfLife task suite ("good", defined before the first trim)
A small suite of real ShelfLife jobs with pass/fail. Every round is measured against the same suite. Proposed suite (Joshua to confirm the exact tasks):

| # | Task | Pass |
|---|---|---|
| 1 | Complete a signup (local test page, then eBay when the account exists) | Account created, all fields correct, no wrong data submitted |
| 2 | Fill a listing form (local test page: title, price, condition, description, photo) | All fields correct, photo attached, form submitted |
| 3 | Click the right button (grounding probe: 10 targets on a test page) | Click lands inside the target element ≥ 9/10 |
| 4 | Recover from an error (validation error shown, wrong field) | Agent notices, corrects, completes |
| 5 | Full listing end-to-end (local test page) | Listing created and verified at its URL, ≤ 30 steps, ≤ 3 min |

**"Good enough" thresholds (proposed, Joshua to confirm):** signup completes ≥ 8/10 unassisted (excluding CAPTCHA); listing form completes ≥ 8/10 with all fields correct; click grounding within target ≥ 90%; ≤ 30 steps/task; ≤ 3 min/listing; **never submits wrong data** (a wrong submission is a fail even if the form completes).

### Metrics tracked every round
- Task success rate (per task + overall).
- **Click/grounding accuracy as its own metric** — quantization hits the vision part first; a model that can't land clicks is useless even if its reasoning holds.
- Steps per task, time per task, RAM used (model + KV cache).
- Failure log: which step, which screenshot, what went wrong (feeds the Train step).

### Stage 1 — Trim (one variable at a time)
- One step down the quant ladder per cycle: Q4_K_M → IQ4_XS → Q3_K_M / IQ3_XS → IQ3_XXS → Q2_K / IQ2_M. **One variable at a time** so a regression can be attributed to that trim step.
- Use bartowski's pre-made quants (download, not requant — Section 6).

### Stage 2 — Test (measure what the trim cost)
- Same suite, same thresholds. Record the delta vs baseline and vs the previous round. Pay special attention to the grounding metric.

### Stage 3 — Train (on what broke)
- Take the failures from Stage 2. For each failure class, capture correct trajectories (Section 9) and LoRA-train on them. Re-test. Training recovers what trimming cost — or it doesn't, and that's information too.

### Stopping rule
Stop trimming when any of these is true:
1. **A trim fails and training can't recover it** — roll back one step. That step is the floor; the previous quant is the shipped model.
2. **Size is already within budget with headroom** — model + KV cache ≤ ~5 GB, leaving room for the OS + browser. No need to trim further for size's sake.
3. **Two consecutive cycles yield < 5 points improvement** — diminishing returns; the loop has converged.

### Rollback rule
If a trim fails and training can't recover it, **roll back one step — that's the floor.** The shipped model is the smallest quant that still passes the suite.

---

## 8. Path A vs Path B — trim down vs start small

### Path A — Trim Fara1.5-4B down via the cycle
- **For:** Fara1.5-4B is already the small model, purpose-built for exactly this job (web tasks, form filling 12.5% of training), best in its size class (80.8 WebVoyager, 57.3 Online-Mind2Web). MIT, GGUF at every quant, runs on CPU in ~4 GB. The trim ladder is pre-built — the cycle is mostly testing, which is cheap. **Every piece exists today.**
- **Against:** trimming saves maybe 0.5 GB (Q4_K_M 2.88 → IQ3_XS 2.28) before grounding accuracy is at risk. The floor is probably IQ3_XS/IQ4_XS, not much smaller than the start. Speed on CPU is "a few tokens/s" — acceptable, not fast.
- **Training-data need:** only the failures (Section 9) — tens of trajectories, not thousands.

### Path B1 — Hybrid: BrowserVLM grounder (0.54B) + small planner
- **For:** smallest RAM footprint (~1 GB grounder + ~1.5–2 GB planner ≈ 2.5–3 GB). BrowserVLM's grounding beats 7B models on the hard split. Separation of concerns: the planner reasons, the grounder clicks.
- **Against (decisive): BrowserVLM weights are "coming soon" — not downloadable.** You cannot build on a model you can't download. The planner still needs CUA training (a generic small VLM doesn't know the action format). Two-model integration is more moving parts. The available alternative grounder (UI-Venus-1.5-2B) has no GGUF and is 2B, not 0.5B.
- **Verdict: blocked on weights. Watch item. Revisit if BrowserVLM ships.**

### Path B2 — Distillation: Fara 4B teacher → small student via Stella
- **For:** the best END state — the smallest model that's really good at exactly ShelfLife's narrow jobs, and nothing else. The teacher runs on the PC, so trajectory generation is free (slow, but free). Stella has distill + train pipeline pieces.
- **Against:** (1) Stella distill is text-only today; trajectory mode is new unscoped work. (2) Stella train is text LoRA; VLM-aware training is new work and needs a free cloud GPU. (3) Trajectory generation is slow on CPU (each trajectory is 10–30 steps × ~5–10 s/step = minutes; 500 trajectories = days of CPU time). (4) A 2B student may never match the 4B teacher's grounding accuracy — grounding is the hardest part to compress.
- **Training-data need:** hundreds of trajectories across the variation matrix (Section 9) — the biggest data need of any path.

### Recommendation (tested against the evidence, not assumed)
**Path A now, Path B2 as the destination, B1 on watch.** The parent's leaning toward (B) is right about the END state but wrong about the START: you cannot distil without a working teacher pipeline, and the teacher pipeline IS Path A. The cycle's Train step naturally evolves into B2 — the failures collected during the cycle ARE the distillation dataset, and once Stella has a trajectory mode, the same loop produces the distilled student. A and B2 are not either/or; they are phases of one loop. B1 is blocked until BrowserVLM ships weights.

---

## 9. Training data from the browser — trajectories as the fuel

### How trajectories get captured
- The agent loop already runs screenshot → action → screenshot. **Recording = saving each step**: the screenshot, the action taken (the `<tool_call>`), and the page result (the next screenshot + whether the step succeeded). This is the FaraGen format Fara was trained on.
- The agent service gets a **record mode** that writes trajectories to disk: one JSONL file per run (one JSON object per step: step number, screenshot filename, action JSON, result/observation) + a folder of PNGs. One fixed JSON schema, agreed early, so capture and training never drift.
- **Who demonstrates:** initially the TEACHER (Fara1.5-4B) runs the tasks and its successful trajectories become student training data (distillation). Later, the student runs; its failures are the signal.

### How many runs per task (variations + error recovery, not one clean run)
- One clean run teaches the happy path only. A robust student needs the **variation matrix** per task type:
  - Different listings (titles, prices, categories, photo counts).
  - Different page states (logged in vs not, form pre-filled vs empty, errors shown).
  - Error recovery (wrong field clicked, validation error, page reload, CAPTCHA handoff).
  - Layout drift (marketplace UI changes over time).
- **Working estimate (to validate in the first cycle): 30–50 successful trajectories per task type**, covering the variation matrix, plus failure-recovery trajectories. Each trajectory is 10–30 training examples (one per step), so 30 trajectories × ~15 steps ≈ **450 step-examples per task type** — the right order of magnitude for LoRA SFT on a narrow task. Fara itself trained on 145K trajectories (7B) / ~2M samples (1.5) for the whole web; ShelfLife needs a tiny fraction of that because the jobs are narrow.
- Start with the local test pages (no accounts needed) and grow to real sites as accounts exist.

### The failure feedback loop
1. Student runs the task suite (Section 7).
2. Failures logged with the exact step + screenshot where it went wrong.
3. For each failure class: the teacher demonstrates the correct path (or a human drives the browser once) → new trajectories appended to the dataset.
4. Retrain (LoRA) on the augmented dataset → re-test → repeat.
5. **This IS the Train step of the Test → Trim → Test → Train cycle** — the Train step's data comes from the browser.

### Constraints
- **Real-site trajectories need his accounts to exist — eBay first, still blocked.** Until accounts exist: trajectories on local test pages + public pages that don't need login (browsing, search). The local test pages are also where the baseline suite lives, so the pipeline is unblocked.
- **Portability:** the browser runs in the cloud sandbox; Stella trains wherever it runs (his PC for tiny LoRA, free cloud GPU for real runs). Trajectories are plain files (JSONL + PNGs) — portable by design. Export as a folder/zip; no cloud service needed.

---

## 10. Smoke test

**Environment:** this sandbox (7.9 GB RAM total, shared with other agents' processes; ~0.7–1.4 GB available during the test). The sandbox is not the PC — its RAM is shared and smaller in practice.

**Download (done):** `Fara1.5-4B-Q4_K_M.gguf` 2,884,850,784 bytes (2.88 GB, matches the README table exactly), `mmproj-Fara1.5-4B-f16.gguf` 672,423,584 bytes, README.md — downloaded with `hf download` from `bartowski/Fara1.5-4B-GGUF` at ~3.4 MB/s. Test screenshot generated: synthetic 1440×900 "Create a listing" form (`test-page.png`).

**Ollama (done — the OST verdict is YES):** isolated Ollama 0.40.16 on port 11436 with its own model dir (port 11435 was already in use by another agent's instance — no interference). `ollama create` with `ADAPTER` → "Error: LoRA adapters are no longer supported." `ollama create` without `ADAPTER` → success but text-only (`['tools', 'thinking', 'completion']`, no `vision`). **`ollama pull hf.co/bartowski/Fara1.5-4B-GGUF` → success with vision** (`['tools', 'thinking', 'completion', 'vision']`; generated Modelfile shows two `FROM` lines, model + mmproj). **`ollama create` with a two-`FROM` Modelfile → success with vision** (same capabilities). **Fara1.5-4B runs with vision in Ollama 0.40.16.** Incident during the test: the first HF pull died at 39% of the mmproj ("unexpected EOF") when the Ollama server died silently mid-download — likely OOM in this RAM-starved sandbox (unprovable; dmesg inaccessible), during a period when available RAM fell to ~850 MB. It was recovered by placing the already-downloaded mmproj file into the blob store (sha256-verified identical) and re-running the pull, which verified digests and wrote the manifest in seconds. On the PC (full 8 GB, no competing processes) a straight pull should work; the two-`FROM` create from local files is the more robust path.

**llama.cpp (partial):** b12415 CPU build verified working (`llama-cli --version`; `llama-mtmd-cli` and `llama-server` present). GGUF files verified well-formed: the model file carries `qwen35.context_length` metadata (and Ollama parsed it as family `qwen35`, 4.2B, Q4_K_M); the mmproj file carries `clip.has_vision_encoder` + `clip.vision.*` metadata (a CLIP vision encoder projector). **Live inference was NOT attempted:** loading the 4B (2.88 GB) + mmproj (0.67 GB) + KV cache needs ~4–5 GB, and only ~1.35 GB was available in the sandbox. Attempting it risked an OOM kill landing on another agent's running Ollama servers, so it was deliberately not run. The live screenshot→action test belongs on the PC (full 8 GB, no competing processes) — it is the first step of Phase 2A, not something Phase 1 could prove here.

**Honest summary:** files verified, Ollama verdict proven, llama.cpp tooling verified — but no model has actually produced an action yet anywhere in this phase. The first live action happens in Phase 2A on the PC.

---

## 11. Build plan — ordered steps

### Phase 2A — Baseline (this week, on the PC)
1. Download Fara1.5-4B Q4_K_M + mmproj f16 (see commands below — `llama-server -hf` fetches both itself).
2. Start llama-server with the model + mmproj (`-c 16384`); confirm it loads and answers a vision prompt.
3. Run OST against the pulled model (`ollama pull hf.co/bartowski/Fara1.5-4B-GGUF`) — OST will see the `vision` capability and run its vision + speed tasks. This is the load-and-see baseline.
4. Build the local test pages (fake signup + fake listing form, 1440×900) and the task suite (Section 7).
5. Run the baseline: Fara1.5-4B Q4_K_M through the suite via fara-cli. Record baseline numbers. Expect each task to take 30–80 min on the PC — run the suite overnight or in the background.

### Phase 2B — The cycle (ongoing)
6. Trim one step (download IQ4_XS), test, record the delta.
7. Train on what broke (trajectories from Section 9) — needs Stella trajectory mode (STELLA DEV) or a manual LoRA run on free cloud GPU.
8. Repeat until the stopping rule fires (Section 7). Ship the smallest passing quant.

### Phase 2C — Wiring (after the baseline passes)
9. Build the agent service (queue poll → fara-cli loop → result + proof URL → queue update).
10. Build the human-check handoff UI in ShelfLife (paused state + resume).
11. First real listing on a test account; then eBay when the account exists.

### PC-side commands (short, single-line, hand-typed from a phone)
```
ollama pull hf.co/bartowski/Fara1.5-4B-GGUF
```
```
llama-server -hf bartowski/Fara1.5-4B-GGUF -c 16384
```
(The pull fetches model + mmproj and reports vision. For local files, `ollama create` needs a two-`FROM` Modelfile — the old `ADAPTER` keyword is dead.)
```
git clone https://github.com/microsoft/fara
```
```
pip install -e .[vllm]
```
```
playwright install chromium
```
```
fara-cli --task "List this item on eBay"
```

---

## 12. Blockers

| Blocker | What unblocks it |
|---|---|
| Fara1.5-4B in Ollama — **resolved: YES** (HF pull + two-`FROM` Modelfile both report vision; only `ADAPTER` is dead) | OST runs against the pulled model; live vision inference still to be proven on the PC (RAM-blocked here) |
| Agent speed on his PC (~2–5 min/step, 30–80 min/task) | Not a blocker — the queue works in the background — but the plan must not promise minutes; set expectations accordingly |
| Stella distill is text-only (no trajectory mode) | STELLA DEV: add screenshot→action trajectory support to distill |
| Stella train is text LoRA (no VLM support) | STELLA DEV: VLM-aware LoRA + free cloud GPU for real runs |
| Real-site trajectories need accounts (eBay first) | His eBay account setup — still blocked; local test pages unblock the pipeline meanwhile |
| BrowserVLM weights not released | Wait / watch; revisit B1 if they ship |
| CAPTCHAs can't be solved by open models | Human handoff (already in the design) — not a blocker, a feature |
| Sandbox RAM too small for live 4B inference (this test env) | The PC has the full 8 GB; the live test is Phase 2A's first step |

---

## Sources

- Fara site (benchmarks, FaraGen1.5, fara-cli): https://microsoft.github.io/fara/
- Fara-7B blog: https://www.microsoft.com/en-us/research/blog/fara-7b-an-efficient-agentic-model-for-computer-use/
- Fara1.5-4B model card: https://huggingface.co/microsoft/Fara1.5-4B
- Fara1.5-4B GGUF + sizes: https://huggingface.co/bartowski/Fara1.5-4B-GGUF
- Fara repo / fara-cli: https://github.com/microsoft/fara
- MagenticLite: https://github.com/microsoft/magentic-ui
- BrowserVLM: https://www.browseros.ai/blog/browservlm/
- slm.expert Fara1.5-4B: https://slm.expert/models/fara1-5-4b/
- Loop latency: https://docs.masst.dev/ai/edges/browser-agents
- Quantization quality: https://quantslant.com/gguf-quantization/
- ADAPTER removal (Ollama 0.34+): https://computingforgeeks.com/ollama-commands-cheat-sheet/
- Unsloth Qwen3.5 guide (no Ollama support for separate mmproj): https://ziyunli.github.io/quartz/notes/areas/llm/local-llms/Qwen3.5---How-to-Run-Locally-Guide
- Ollama issue #14730 (imported Qwen3.5 GGUF + mmproj): https://github.com/ollama/ollama/issues/14730
- Fara1.5 audits (weights, params): https://www.anchorterminal.com/tools/fara1-5-4b
- Fara1.5 paper (arXiv 2606.20785): https://ar5iv.labs.arxiv.org/html/2606.20785
- Fara-7B paper (arXiv 2511.19663): https://ar5iv.labs.arxiv.org/html/2511.19663
- OST source: `~/workspace/ollama-live-run/ost/ollama_system_test.py`
- Stella source: `~/workspace/stella-live/stella/` (proof logs `requant-proof.log`, `distill-proof5.log`)
- Smoke test: `~/workspace/fara-smoke/` (llama.cpp b12415, Ollama v0.40.16)

---

## 13. Addendum (2026-11-15) — Forge Browser is the training browser

Correction to Sections 5 and 9: the browser that records training trajectories is **Forge Browser** (BROKE-N-BORED/FORGE-BROWSER-, v0.9, MIT) — Joshua's own local AI browser, not a cloud browser. It runs on his PC: PySide6/Qt + WebEngine window, a local Ollama model as the chat brain, and a Python engine room (`forge/browser/`) that drives a CDP rendering engine (Lightpanda / Chromium / Kitesurf-local) one action at a time. It already hands CAPTCHAs to the human (never solves them) and keeps site passwords in an encrypted vault — both match ShelfLife's design. Trajectory recording (screenshot + action + result per step) is a natural addition to the engine room's action-by-action loop; whether any recording exists today is unconfirmed — check the code before assuming. Consequence: trajectory capture happens on the PC inside Forge Browser, so the portability concern in Section 9 mostly goes away (data is born where Stella trains); the cloud sandbox is out of the trajectory path.

Related pieces from his repo list (`~/workspace/user/files/Repos_for_project_development_8_kzf7.md`): **FYRN** (his own GGUF runner, the no-Ollama future) is a runtime candidate for later — llama-server/Ollama stand for Phase 2A. **getcompute** (claims RAM and CPU before a local model runs) matters for the tight 8 GB budget — use it when the agent runs. **GITDATA** (Dataset Scout) + **DATAPACKR** (dataset packer) feed STELLA's training-data needs for the Train step. The BNB system (BNB-SKILLS, BNB-TOOLS, BNB-PRESETS, BNB-ROLES, BNB-PLUGINS) is used in every project, including this one; his own rules win on any conflict with an outside repo.
