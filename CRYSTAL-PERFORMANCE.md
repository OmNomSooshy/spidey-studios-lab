# Crystal performance correction

## Blocker and isolation

Management reports roughly 4–5 FPS and an effectively stalled phone after reaching the crystal on a Samsung Galaxy A06 5G, Chrome. That is a failed runtime, regardless of the previous local checks. This pass starts from `4754aae634ec1c22a5d12f6330b24da19ec4f705` on the same noncanonical Sunburn branch.

The initial local draw-loop benchmark could submit Canvas2D commands without measuring completed painting. It was inadequate evidence for constrained phone performance. The new probe measures animation-frame scheduling during continuous camera travel and separately drains every attached canvas bitmap after each sampled draw. It also isolates layers by intercepting only the original `crystal.js`, while serving the original `game.js` for the baseline. Browser runs are sequential, at the same 390×844 viewport and capped DPR 2, with 6× CDP CPU throttling and `--disable-gpu` software rendering. These are stress conditions, not an emulation of the exact A06 chipset/driver.

| Six-second constrained camera-travel run | Frame throughput | Median frame interval | 95th percentile | Median completed canvas sample |
| --- | ---: | ---: | ---: | ---: |
| Original full outdoor renderer | 5.97 FPS | 166.7 ms | 233.4 ms | 189.1 ms |
| Original, refraction disabled only | 6.22 FPS | 150.0 ms | 283.2 ms | 144.7 ms |
| Original, crystal removed, sky retained | 14.79 FPS | 66.7 ms | 83.4 ms | 51.7 ms |
| Original, both outdoor layers removed | 56.02 FPS | 16.7 ms | 16.8 ms | 1.9 ms |
| Replacement, full outdoor presentation | 43.88 FPS | 16.7 ms | 33.4 ms | 5.9 ms |
| Replacement, outdoor layers removed | 58.34 FPS | 16.7 ms | 16.8 ms | 4.7 ms |

The ablation identifies the continuously repainted outdoor sky/material pipeline as the dominant cost. Removing transformed refraction alone did not recover responsiveness. Both the per-frame sky pass and the full-resolution translucent facet/gradient/refraction work were expensive. This does not establish one particular GPU-driver stall on the physical handset; no device trace was available.

## Replacement

- Crystal facets, gradients, seams and fractures are rasterized once per world band at 0.6 CSS-pixel resolution. A maximum of eight bands is retained; only nearby bands are attached to the visible composition. The open-sky interval prepares one initial band per frame to avoid an arrival-time construction burst.
- The sky is an overscanned 0.45-resolution bitmap, normally rebuilt no more than twice per second. Between updates it translates continuously at the same 12% distant camera rate.
- Refraction is retained: selected facets mask a displaced copy of that actual sky. The small optical raster uses 0.35 resolution, refreshes normally at four Hz, and refreshes sooner only when camera displacement would exhaust its overscan. It travels with the crystal between refreshes.
- Cached sky/material layers use CSS compositor transforms instead of being copied and alpha-blended into the native-DPR creature canvas every animation frame. The foreground canvas is transparent outdoors and cleared there; Byte, platforms, rope/contact, house and belongings keep their existing sharp rendering.
- No per-frame CanvasPattern creation or transformed pattern sampling remains. No warmed static-view scenery gradients are regenerated. Resize releases old band rasters; memory stays bounded on long climbs.

The physical rope solver, launch force/timing, ordinary platform bounce/support, tilt, Earth ground frame, sensors, normal room webs, autonomy and stone ownership are untouched. `game.js` changes only foreground canvas transparency/clearing. The crystalline platform and web-contact drawings are unchanged.

Two attempted replacements were rejected before shipping: static material caches copied back into the original high-DPR canvas, then caches drawn into a separate lower-resolution canvas. Their repeated bitmap composition still cost too much under throttling. Cached browser-composited layers gave the useful improvement.

## QA and limits

`qa/crystal-performance.cjs` produces the ablation table and completed-canvas timings. The unthrottled replacement run reaches 59.67 FPS. The constrained full normal-RAF route uses Android Chrome mobile emulation, trusted virtual motion events and actual CDP touches, with no creature/phase writes or simulation stepping. It reaches the crystal, holds/releases a physical rope, tilts into a miss, returns to the loft and descends the hatch. Crystal-section throughput is 34.11 FPS, median interval 33.3 ms, 95th percentile 50.1 ms, maximum gap 116.7 ms. Navigation to `about:blank` completes in 183 ms afterward.

The harsh live run still has long tasks up to 153 ms across the complete home/traversal route. Synthetic pointer-dispatch timestamp delays reach 244 ms. Those are remaining constrained-browser weaknesses, not evidence of low-latency physical touch on the handset. A browser navigation command does not prove Android's system UI responsiveness.

`qa/crystal-cache.cjs` confirms zero CanvasPatterns, zero additional scenery gradients in 60 warmed static frames, at most eight cached bands/five attached bands in a 10,800-pixel expedition, 9.50 MiB maximum accounted raster storage, limited sky/optical rebuilds, correct resized layer bounds and hidden scenery after home return. This excludes browser/GPU copies and the inherited HQ/sensor buffers from its memory accounting.

The 13 route/rope checks, four viewport sizes and an unthrottled recorded real-touch/virtual-sensor route pass. Fresh screenshots of roof, clear sky, entering crystal, taut web and loft return were visually inspected. The material is softer and optical refresh less frequent than the original; individual per-facet displacement directions have become one small displacement through the selected masks. The enormous translucent plane, distant sky, moving facets, crystalline ledges and physical attachment cue remain visible. No art or gameplay mechanic was removed to improve timing.

All 68 protected focused checks pass: 10 mobile, 10 device, 18 sensing, 20 home and 10 upstairs. These include physical web rescue/release momentum, room ropes, Earth support/orientation, prank/scheming, sensor permissions/shutdown, home history, belongings/stone ownership, ladder/hatch, launch and return. No behavior failures or browser errors were reported.

Run artifacts are outside deployment in `/workspace/spider-byte-crystal-perf-qa`, including `before-software.json`, `after-software.json`, `constrained/crystal-live-results.json`, `crystal-cache-results.json`, fresh screenshots, `crystal-before-after.jpg` and route video.

**Physical-target validation is pending.** Only Management's A06/Chrome run can establish that traversal is responsively playable and the blocker is cleared. Local throughput, pixel comparisons and passing mechanics tests do not override a remaining phone failure.

## Reproduce

Serve this static checkout. These tools are local QA dependencies, not runtime infrastructure. Avoid simultaneous browser suites when measuring performance.

```sh
export BYTE_QA_URL=http://127.0.0.1:4191/
export BYTE_QA_OUTPUT=/tmp/byte-crystal-perf
mkdir -p "$BYTE_QA_OUTPUT"
git show 4754aae:crystal.js > "$BYTE_QA_OUTPUT/baseline-crystal.js"
git show 4754aae:game.js > "$BYTE_QA_OUTPUT/baseline-game.js"
BYTE_QA_BASELINE="$BYTE_QA_OUTPUT/baseline-crystal.js" BYTE_QA_SOFTWARE=1 BYTE_QA_VARIANTS=full,no-refraction,no-crystal,no-outdoor BYTE_QA_PERF_MS=6000 node qa/crystal-performance.cjs
BYTE_QA_SOFTWARE=1 BYTE_QA_VARIANTS=full,no-outdoor BYTE_QA_PERF_MS=6000 node qa/crystal-performance.cjs
node qa/crystal-cache.cjs
BYTE_QA_OUTPUT=/tmp/byte-crystal-perf/constrained BYTE_QA_CPU=6 BYTE_QA_SOFTWARE=1 BYTE_QA_NOCAPTURE=1 BYTE_QA_ANDROID=1 node qa/crystal-playthrough.cjs
```
