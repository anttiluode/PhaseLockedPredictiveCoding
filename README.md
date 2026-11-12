# PhaseLockedPredictiveCoding — one phase, many local memories

**12 November 2026.** A falsifiable, zero-dependency browser experiment inspired by the **main complex vector plus smaller circulating cogs** idea. It asks whether one common phase correction can explain a field of apparent prediction errors while leaving genuinely local changes visible.

**Interactive lab:** open `index.html` locally after downloading the repo. Once GitHub Pages is enabled, the intended public URL is https://anttiluode.github.io/PhaseLockedPredictiveCoding/ .

**Status:** The fixed-template scientific benchmark and Node regression checks passed. The Pages publication workflow cannot create the Pages site using its GitHub Actions integration permissions; **the repository owner must enable it once**. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Then open **Actions → Publish offline visual laboratory → Run workflow**. Until then, the public Pages URL may be unavailable; this does not affect the local offline lab or tests.

## What we actually built

- A 64 × 64 scene represented in four independent binary planes per pixel: **16,384 logical ring streams**. Each stores one period of prior binary values. The default period is **16 frames** (262,144 stored bits); this is a compact delay buffer, not 16,384 copies of the original GeometricNeuronV27 dynamics.
- An **instantaneous global phase hub** that sees the current world frame and the existing memory, then compares **three candidate read addresses**: t−1, t, and t+1. It selects the smallest global Hamming distance, with a tiny prior-offset tie penalty. No oracle shift label is supplied to the hub.
- A reduced non-monotonic band comparator and write/erase rule, implemented by verified four-bit lookup tables. For each bit, exactly one active world/memory input makes the comparator fire. The same unsigned error signal can write an empty stored slot or erase an occupied one. Algebraically it is XOR.
- A displayed shared complex phasor **Z = cos(2π(t+δ)/16) + i sin(2π(t+δ)/16)**: *one address for the whole field*, not one separately estimated shift for each pixel.
- Contrasting modes for **fixed clock** and **shared phase hub**, world phase jitter, timed 8×8 local novelty, a challenge with two regions moving independently, and the option to disable local memory writes.
- Deterministic Node tests and a benchmark whose input truth (actual shift and inserted patch) is used only for scoring.

This is **global frame-template alignment plus local binary prediction errors**. It is not yet an autonomous phase-locked loop, a learned dynamical attractor, a Kalman filter, a biological theta/gamma model, or a useful energy benchmark.

## Key results: exact model conditions

The measured data below come from [experiments/benchmark.cjs](experiments/benchmark.cjs), with all 16 original periodic frames preloaded and **frozen during scoring**. The 64×64 scene is an orbiting two-object grayscale image, four bits per pixel. Total duration **128 frames**, fixed pseudo-random seed 97, independently selected global phase offsets from {−1,0,+1} each frame.

| Test | Fixed phase | Shared phase hub |
|---|---:|---:|
| Pure global ±1 timing jitter: false discrepancy bits | 77,071 | **0** |
| Same jitter plus three separate 8×8 injected novelty patches: false discrepancy bits | 77,062 | **0** |
| Truly changed bits captured across those patches | 759 / 768 | **768 / 768** |
| Hub correctly selected global offset | — | **128 / 128 frames** |

The unusual last two rows are important: the baseline confuses timing with content, while the phase hub removes global timing error *without indiscriminately suppressing local mismatch*. The fixed template, compact offset search, and periodic scene are deliberate simplifying assumptions.

An illustrative local three-tick *sustained-discrepancy filter* generated 4,535 false bits in this test and detected **0 / 768** one-frame novelty bits. It is a separate intentionally simple control, **not** an implementation of GoldOpus's K-tick integrated band-unit nor a complete comparison to GoldOpus.

A per-pixel independent best-phase comparator registered only 741 / 768 changed bits: allowing each pixel to choose whatever timing makes it match best can hide some true novelty. One shared phase retains a stronger constraint.

Read [RESULTS.md](RESULTS.md) for other scenarios and the negative controls.

## What fails — deliberately visible

1. **Phase errors outside the search range:** With ±2-tick jitter but only three candidates (−1,0,+1), the hub left 37,330 false discrepancy bits in 128 frames. A larger search or predictive phase tracking would be required.
2. **Different regions obey different clocks:** When the top half of the world advances one tick and the bottom half retreats one tick, one phase cannot align both. In the deliberately difficult test, it left 51,270 errors across 96 frames. A *locally* flexible comparator aligned both, but can also hide genuine changes.
3. **Observational ambiguity:** A true world change that **exactly looks like the next phase** is indistinguishable from timing jitter using image data alone. Our hub assigns it to a phase offset and reports **zero residual**, even if it was meaningful novelty. Thus the claim *all residual mismatch is necessarily true novelty* is false.
4. **Period is not learned:** The memory is preconfigured for a 16-frame scene. The hub chooses *which already learned slot* to read; it does not learn natural periods or follow tempo drift by changing its clock.
5. **Training versus frozen-template benchmark:** The interactive page starts with an empty memory and fills it by one-wire XOR in the first lap. Feedback during subsequent tests can also store transient intrusions, which may cause a future correction when the intrusion disappears. The scientific benchmark instead keeps the 16 clean training frames fixed so that detector errors can be cleanly attributed. Do not mix the two protocols.

## Reproduce cheaply

Node.js 18+ (tested via GitHub Actions with Node 22). No NumPy, npm install, models, GPU, backend, webcam, or external library.

    node tests/test_core.cjs
    node experiments/benchmark.cjs
    node --check core.js
    node --check demo.js

Open index.html directly from the filesystem for the live, locally rendered instrument. [Automated runs](https://github.com/anttiluode/PhaseLockedPredictiveCoding/actions) also verify the core and regenerate the benchmark.

### Implementation map

- core.js — independent UMD shared-phase alignment, 4-plane band-LUT memory, scene generators, benchmark primitives
- index.html + demo.js — local offline browser lab, three frame views, central phase vector, false-error/novelty counters, teaching controls
- tests/test_core.cjs — XOR/write/erase truth tables, exact phase recovery, novelty survival, independent-region failure, deterministic benchmark
- experiments/benchmark.cjs — fixed-template comparison of raw, hub, independent-pixel and sustained-error detectors
- RESULTS.md — measured ledger and cautions
- .github/workflows/tests.yml — fast Node checks
- .github/workflows/pages.yml — manual GitHub Pages deployment after owner enables Pages

## An interpretation of the turning-tree picture

The **central ring/vector** serves as a globally shared *temporal address*, while the **smaller rings** store local content indexed by that address. A global timing mismatch is best explained by changing the shared address. A small residual can then be handled locally with the one-wire XOR toggle.

This is an example of hierarchical **latent-variable inference**: one common variable explains many correlated pixel errors. It *resembles* some motifs in predictive processing, temporal binding and hierarchical routing, but no biological mechanism was verified here. The words "theta-gamma" and "efference copy" are scientific analogies, not a demonstrated neuroscientific identification.

The immediate next task is a more honest **causal, dynamic phase tracker**, not a larger image. It should retain its phase estimate across time and learn its drift *without* an instantaneous full-frame oracle search. Test against an ordinary digital phase-locked loop, an optical-flow motion-compensation baseline, and the present three-template minimum. A genuinely local scene change must still trigger an error.

## Provenance / research lineage

This repository intentionally preserves and connects independently tested lines:

- [PerceptionLab](https://github.com/anttiluode/PerceptionLab) and [GeometricNeuronOriginReview](https://github.com/anttiluode/GeometricNeuronOriginReview) — accidental 2025 geometric unit, subsequent autopsy
- [GeometricNeuronV27](https://github.com/anttiluode/GeometricNeuronV27), [GN-XOR](https://github.com/anttiluode/GN-XOR), [KultaaVaiKatinkultaa](https://github.com/anttiluode/KultaaVaiKatinkultaa), [KultaaVaiKatinkultaaOpus](https://github.com/anttiluode/KultaaVaiKatinkultaaOpus) — original native delays and XOR/toggle discovery
- [GoldSol](https://github.com/anttiluode/GoldSol) — negative GN27 signal_in jitter result and pipeline-history ablation
- [GoldOpus](https://github.com/anttiluode/GoldOpus) — K-tick integration improves jitter tolerance in a reduced band-unit, with a longer relay period
- [GoldGemini](https://github.com/anttiluode/GoldGemini) — 16,384 logical 4-plane memory rings and moving-scene demonstration; scene geometry in this repository adapts its public MIT-licensed example
- **PhaseLockedPredictiveCoding (this repository)** — measured single shared phase hypothesis with both successes and counterexamples

All source released under MIT. Historical GN27 code and the original giant checkerboard are **not** copied here because they are not part of this reduced implementation. No existing lineage repository was modified by this experiment.
