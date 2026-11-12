# Results ledger — PhaseLockedPredictiveCoding, 12 November 2026

The instrument consists of a known periodic world, 16 stored 64×64 four-bit
frames, a 3-candidate global phase selector and reduced binary
band-window/XOR memory. The complete benchmark source is
[experiments/benchmark.cjs](experiments/benchmark.cjs). This is **not** an
unchanged GN27 simulation.

## Protocol

- Template scene period: exactly 16 frames.
- Pixel representation: four independent bit planes; 4,096 pixels, 16,384
  logical one-bit memories per phase, 262,144 total stored bits at period 16.
- Training: for the benchmark, all 16 clean frames are **provided before**
  scoring and remain frozen. The live UI separately fills initially empty
  buffers using the reduced band-pass memory update.
- World jitter: for each frame, choose an independent integer shift uniformly
  from [−j, +j] using the deterministic xorshift RNG in core.js and stated seed.
- Hub: calculate the total **bit Hamming distance** between the current world
  and stored frames at t−1, t and t+1. Select lowest distance with a tiny
  0.01 cost for changing away from last selected offset. No true shift is
  used by the hub.
- Injected true novelty: XOR the four planes of a fixed 8×8 square
  (x,y=26,26), once per selected frame. The truth mask therefore contains
  exactly 8×8×4 = **256 bits** per injection.
- For scoring, report bit-level true positive, false positive and missed
  novelty events. The known injected mask and generated true phase are
  used **only by the test**, not the controller.
- Alternate comparators:
  (i) raw fixed-phase bit XOR;
  (ii) shared three-phase hub;
  (iii) an unrealistically flexible *per-pixel* choice of any of the
  three phases;
  (iv) three-consecutive-tick persistence applied to raw bitwise
  discrepancies. The last is a *separate crude temporal-filter control*,
  **not** the integrated K-step GoldOpus band-unit.

All results below are deterministic simulator outcomes, with no confidence
interval, hardware power measurement, or population-level generalization.

## A. Entire scene jitters by one tick, no inserted novelty

Orbit scene, 128 frames, RNG seed 97, independent global shifts ±1.

| Detector | False discrepancy bits |
|---|---:|
| Raw, phase fixed at t | 77,071 |
| Three-phase shared hub | **0** |
| Per-pixel best of three phases | **0** |
| Three-tick sustained-error control | 4,535 |

The hub selected the exact generated phase in **128/128 frames**.
The controller's scores are computed from full-frame bit mismatch;
the phase labels are revealed only to evaluate its accuracy.

## B. Same jitter, three 8×8 novelty patches

Patches at frames 49, 65 and 81. Exactly 768 changed bits overall.

| Detector | False bits | Genuine changed bits detected | Genuine changed bits missed |
|---|---:|---:|---:|
| Raw fixed phase | 77,062 | 759 | 9 |
| **Shared hub** | **0** | **768** | **0** |
| Per-pixel independently optimal phase | **0** | 741 | 27 |
| Three-tick sustained-error filter | 4,535 | **0** | **768** |

The result supports the *particular* intended decomposition:
one shared timing factor explains coordinated global changes; a local
8×8 intruder remains an error. The per-pixel independent phase choice
has greater freedom and can explain away some true local changes by
matching different temporal slots at different pixels.

The sustained-error filter here **eliminates the brief novelty entirely**,
demonstrating a timing-responsiveness/false-error tradeoff. It is not a
direct benchmark against GoldOpus's K-integrating network.

## C. Deliberately exceed the hub's capability

### ±2 jitter with only ±1 candidate offsets

Same seed, frames, patches.

| Detector | False bits | True detected | True missed |
|---|---:|---:|---:|
| Raw phase fixed | 107,489 | 741 | 27 |
| Hub restricted to ±1 | 37,330 | 768 | 0 |
| Per-pixel ±1 choice | 18,144 | 741 | 27 |
| Sustained raw error | 16,941 | 0 | 768 |

The hub selected the exact generating shift in only **76/128 frames**;
its candidate set cannot include ±2 offsets. It improves error counts
over raw but does **not** solve out-of-range jitter.

### Two independently moving regions

Across 96 frames, top half of the image at t+1, bottom half at t−1.
There is no single true global phase. No artificial intruder added.

| Detector | Residual discrepancy bits |
|---|---:|
| Raw fixed phase | 85,152 |
| Single global phase hub | **51,270** |
| Per-pixel independent phase choice | **0** |
| Three-tick sustained-error filter | 0 |

The global approach fails its **common clock assumption**. A two-hub or
hierarchical regional controller might work better, at the cost of
complexity and the risk of hiding genuinely local world changes.

### Phase masquerade

For a fixed frame at t=4, make a genuinely changed world image equal
to the stored image at t+1. These two interpretations are observationally
identical if only the images are available: *the world's content changed*
versus *the timing advanced by a tick*.

- Fixed-phase bit discrepancy: **657**.
- Hub chooses δ = **+1** and reports **0** residual errors.

**The claim that all residual differences are genuine novelty, or that
all genuine novelty survives global phase correction, is false.**
The hub has no privileged information about the causal origin of a
phase-shaped input. Motor efference copy or independent motion sensors
might supply that information in a future model, but this experiment
does not.

## D. A different scene confirms the basic effect

The synthetic polar-checkerboard scene, 96 frames, seed 31,
±1 global jitter and patches at frames 49 and 65:

| Detector | False bits | True bits detected | True bits missed |
|---|---:|---:|---:|
| Raw | 359,264 | 208 | 304 |
| Shared hub | **0** | **512** | **0** |
| Per-pixel phase | 0 | 88 | 424 |
| Three-tick sustained filter | 57,076 | 0 | 512 |

Thus the same simple phase index idea works for at least two periodic
scene generators. These are not independent real-world image datasets.

## E. Memory and code correctness

The [tests/test_core.cjs](tests/test_core.cjs) regression verifies:

- For all 256 pairs of four-bit pixel values, the reduced band-window
  lookup yields error bits r XOR w and next stored bits exactly w.
- Global phase shifts −1, 0, +1 at all 16 training phases are selected
  correctly in the noiseless orbit test.
- After one 16-frame learning lap, a second clean lap is silent.
- The live loop's phase hub handles 16 shifting test frames with
  zero residual when the stored templates are clean.
- An injected 8×8 patch produces all 256 novelty bits.
- Independent region shifts violate single-hub alignment.
- The three-tick persistence control misses genuine single-frame novelty.
- A repeated benchmark with identical seed and parameters produces
  identical results.

The GitHub workflow runs only Node.js on CPU; no external packages.
Core and UI script syntax are checked. A full graphical-browser integration
test is **not** included in this run.

## Scientific interpretation

**What worked:** a global latent *temporal address* can explain correlated
timing mismatch across a population of local memory streams without
blurring their binary readout. This is a known kind of global template
alignment, demonstrated quantitatively here on a simple dynamic scene.

**What is not proved:** learned shared oscillator, actual Kalman filter,
locomotion/predictive eye movement efference copy, native GN27 variance
mechanism, theta-gamma neuronal phase coding, general visual novelty
under adversarial changes, energy benefit, or superiority to a standard
digital frame buffer plus three template comparisons.

**Next rigorous test:** use a continually evolving phase state to reduce
the number of complete template comparisons, then test tempo drift,
multi-region motion and held-out nonperiodic events versus a digital PLL
and regionwise alignment baselines. Preserve the observations that make
this version fail rather than discarding them in the next iteration.
