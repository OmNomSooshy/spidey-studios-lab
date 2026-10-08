# Sunburn XIII — a warm miniature world

**IMPLEMENTED AND RUNTIME-REACHABLE in the software browser. Human Eyes / Samsung Galaxy A06 5G Chrome acceptance is pending.** This is an isolated experimental candidate, not a change to canonical `main`.

Branch: `experiment/sunburn-xiii-2026-10-08`. Baseline: XII `0352eecb8ee3bd481afb455d276ec18e832c3c6d` (with XI's validated state inherited). The final commit is the commit containing this report; publication metadata identifies its exact SHA.

## The visual answer

Byte lives in a warm, miniature, tactile house adjoining a soft isometric garden. Rounded oak furniture, linen cushions, glazed ceramic, brushed brass, painted timber, damp soil, waxy plants and icy facets share one lighting/material family. Byte remains the richest and most expressive object. His original HQ character art, clothing art, acting and controllers have not been replaced.

This uses **authored offline geometry and baked area lighting**, not a browser 3D engine. The Blender authoring script creates thickness, rounded edges, layered assemblies, material roughness, grain and cast/contact shadows. Sixty-three runtime frames cover the existing world. Source PNGs are retained; runtime WebP totals **568,650 bytes**. There is no build dependency for playing the app.

### Complete coverage

| Existing area/family | Runtime treatment |
| --- | --- |
| Nook | Padded alcove, linen mat, dimensional wardrobe, wooden framing; original physical silk/rest retained |
| Hall | Layered walls/floor, recessed framed aperture, compact thick timber passages |
| Playroom | Timber chest/open lid, ladder/hatch, bounded trophy cabinet and icy physical fragments |
| Loft | Timber beams, framed window, shelf, hatch, thick spring and pitched roof presentation |
| Bathroom | Glazed **open-front** tub, tap, shower, towel, soap dish and sponge; live cutaway/water/stopper/chain remain visible |
| Kitchen | Pantry, shelf, table, window, utensils and towel; physical biscuit, broccoli and six existing consumable foods gain baked depth and actual bite masking |
| Backyard: home | Authored roof/walls/fence/lawn/paths/trees; complete scrollable terrain |
| Backyard: garden | Soil beds, growth stages, waxy leaves and distinct pink/yellow/blue flowers and seed packets |
| Backyard: play/distance | Dimensional mushroom and hoop, water can, bench, pot, lantern and ball; continued terrain/fence planting across camera travel |
| Expedition | Roof departure, baked billowy clouds, cached icy relief, thick mounted ledges and crystal pickups; existing translucent/refraction/parallax rendering retained |
| Portable possessions | Ball, fragments, ring, frog, rattle, pinwheel, sponge and food retain real positions/rotations/contact responses |

Functional shop/wardrobe/trunk UI and existing wearable artwork deliberately retain their established presentation. Live water, silk, droplets, ropes, windmill rotation, squish and interaction feedback remain dynamic. The world artwork has no collision or hit-testing authority.

## Runtime evidence

The separate [review gallery](evidence/xiii/index.html) contains **13 matched before/after pairs**, covering all six rooms, four backyard views and roof/open-sky/Crystal views. These are explicit paused room/camera/platform fixtures at 412 × 824, DPR 2. They prove render coverage, not Human Fingers reachability or handset acceptance.

Reachability is separately exercised by the inherited trusted-touch/native-time XII playthrough: indoor-to-yard travel, directed world travel, independent camera movement, physical carrying, gardening, reciprocal play, offscreen invitation/homecoming, screen-web scheming/peeling/pride, and interruption. The ordinary first-time route without enabling probes also passes in the corrected reachability suite. New imagery is used by the ordinary renderers, not a gallery-only scene.

The gallery includes a separate **native-time mushroom video**. Trusted touch carries/drops Byte onto the original mushroom, observes at least four repeated contacts, then a background tap sends him physically away; the bounce cycle stops and the camera stays fixed. Initial positioning and competing-opportunity suppression are disclosed fixtures. This recording is interaction evidence, excluded from performance sampling.

### Source references

- [art/render-world.py](art/render-world.py): actual rounded assemblies, materials, light/camera setup and complete terrain bake.
- [art/index-frames.py](art/index-frames.py): transparent footprint metadata only; no physical dimensions derived from it.
- [art/encode-world.py](art/encode-world.py): storage encoding; source artwork remains committed.
- [world-art.js](world-art.js): one-time cropped bitmap loading, bounded room and bite caches, cached contact shadow. Runtime physical dimensions are arguments from existing systems.
- [home.js](home.js): cached six-room presentation, recessed compact passage family, same ladder/hatch/passage territories and topology.
- [bathroom.js](bathroom.js): baked fixtures/tools around the unchanged live bath cutaway and care truth.
- [kitchen.js](kitchen.js): baked room and physically depleted food presentation.
- [possessions.js](possessions.js), [life-details.js](life-details.js): existing furniture/toys/household details, with moving and deforming physical objects kept separate.
- [backyard.js](backyard.js): static authored terrain plus existing independently mounted moving-object canvases; camera/world projection and all controllers preserved.
- [crystal.js](crystal.js), [game.js](game.js), [economy.js](economy.js): baked clouds/relief/ledges/pickups inside existing cached expedition rendering.

The terrain's expanded upper margin prevents roof clipping. Its displayed ground origin changed with that margin; the camera translation was adjusted by the same amount, preserving object/world projection. A coplanar path overlap was removed during authoring. Colored planting variants now update the material's color ramp, rather than only its overridden base color.

## Independent regression evidence

The initial serial campaign ran 19 inherited suites. Fourteen passed outright: XII playthrough/extra checks; device, room, home, upstairs, Crystal, care, acting, bath-read, Crystal-cache, mobile, IX and X probes. The remaining failures were investigated rather than omitted:

- **Reachability:** the original opaque-pixel sample could select the spool or a thin animated edge. A robust interior patch away from the actual spool passes on **both XII and XIII**. The ordinary no-probe route passed before this correction too.
- **Possessions:** one initial page-load timeout; the complete quiet-server replay passes all twelve checks: purchase/equip distinction, physical storage/retrieval, rummaging, reciprocal toys, three distinct toy responses, 10,000-trophy bounded storage, migration, ladder carrying, five-pickup reward, physical fragment carrying, bounded clothing caches and five-size fixture access.
- **Kitchen/dirt:** fixed synthetic timestamps could be older than the live coating cache after startup; dirt-event count also included native pre-fixture contacts. Resetting the explicit measurement state and using a monotonic clock passes the unchanged multi-region dirt/alpha-silhouette test on **both XII and XIII**. All other kitchen rope, theft, interruption, meal and Earth-frame tests passed in the original run.
- **XI:** the supposedly stationary toy had been physically nudged above XI's permitted speed before the fixture paused. Its conservative `no-plausible-act` veto occurred on XII too. An explicit stationary initial proof passes the five-size touchable-aftermath test on **both builds**. The other XI contradiction/provenance tests passed in the original run. No unseen-life code changed.
- **Trunk spatial route:** the inherited long native route was sensitive to expired 120 ms flick samples and attempted to catch a retrieved toy while still inside the chest's own territory. Source authority and the complete possessions suite pass; focused trusted-touch replays wait for a clear floor catch and avoid instrumentation between final movement and release. The long route remained fragile on both builds. A separate focused trusted-touch test with explicit initial loose-object/Byte separation passes **both XII and XIII**: unrestricted floor throw with velocity, physical trunk deposit, stored reload, UI retrieval, physical ladder carry and loft reload. Its recorded outcome is in the measurements bundle.

[qa/sunburn-xiii-authority.cjs](qa/sunburn-xiii-authority.cjs) compares every original named controller against XII and allows only identified presentation functions. It also verifies HQ/cosmetic files byte-for-byte. **PASS.** This supports the runtime evidence; it is not a substitute for it. Gravity acquisition, Earth support/grounded tangent/orientation, physics, web laws, mushroom contact, movement, gardening, fetch, persistence, wallet/ownership, care, autonomous decisions and XI provenance remain original source authority.

## Performance and memory

Measurements are **serial software Chromium, `--disable-gpu`, mobile 412 × 824/DPR 2**, with native RAF/physical activity, trusted touch and CDP heap/CPU instrumentation. Offline art rendering, encoding, video and other browsers did not overlap these final samples. No claim is made that CPU throttling models the actual Samsung handset. An earlier sample overlapping an offline bake was excluded.

The [raw measurements](evidence/xiii/measurements.json) retain first runs, repeats, stress runs and cost-isolation results. Each active case ran about 6.5 seconds after explicit initial physical arrangement. The table gives the range of two normal CPU-rate-1 runs, not a cherry-picked best result:

| Active case | XII FPS | XIII FPS |
| --- | ---: | ---: |
| Grab/throw indoors | 33.5–49.8 | 46.8–50.6 |
| Bath/shower | 59.5–60.0 | 59.5–59.8 |
| Crystal flight | 56.2–57.5 | 55.1–58.5 |
| Gardening/pour | 58.6–59.7 | 59.3–60.0 |
| Autonomous fetch | 59.7–60.0 | **35.4–37.8** |
| Repeated mushroom play | 59.3–59.8 | **45.9–56.9** |

The separate trusted continuous-touch test measured walk **57.1 → 59.3 FPS**, pan **59.3 → 59.8**, and physical screen-web peeling **40.2 → 50.2**. Both active normal runs still completed six mushroom contacts and fetch's physical return/wait loop.

**The instrumented fetch dip is a limitation, not hidden behind a pass label.** Rendering interventions tested original terrain, pre-scaled native raster and hidden terrain serially: all measured about **58 FPS**, including both unchanged original controls. Thus removing the terrain or increasing its raster did not earn a fix. A follow-up normal fetch measured **55.1 FPS** without CDP CPU instrumentation versus **44.2** with it. This demonstrates sensitivity to the measurement environment, but does not prove the handset has no regression. No visual/physical concept was removed based on an unproven diagnosis.

At extreme CPU-rate-6/software composition, both builds were severely limited: XII's active cases **2.1–14.5 FPS**, XIII **4.8–15.9**. XIII's bath/Crystal samples were slower than XII's; garden/fetch/mushroom were faster. Motion stress was XII walk/pan/peel **11.4/12.3/7.8**, XIII **10.4/20.9/11.1**. Browser exit still completed; this is stress evidence, **not acceptable phone-performance proof**. The original stress responsiveness assertion aborted one baseline sample; a complete replay records latency and responsiveness rather than discarding slow results.

Memory measurements distinguish allocations:

- New cropped source bitmaps: **22,894,744 bytes (~22.9 MB)**, fixed at 63 assets. This is real additional art memory, not JS heap.
- Cached room backgrounds: **0.76–2.29 MB** in sampled activity, max six entries; current byte count is exposed by `ByteWorldArt.stats()`.
- Cached food masks: **184,320 bytes** in these samples.
- Static backyard canvas: **9,408,000 → 6,881,280 bytes** (2,526,720 bytes saved). Its source bitmap remains separately counted above.
- Sampled DOM-canvas allocation during garden/fetch: about **19.0 → 16.5 MB**. This excludes source ImageBitmaps, so total artwork memory increased despite the smaller canvas.
- CDP JS heap: normal samples roughly **4.5–5.1 MB XII**, **3.6–5.6 MB XIII**. Canvas/ImageBitmap backing stores are not included in this heap number.
- Existing Crystal cache remains capped at eight tiles; no per-frame gradients or refraction-pattern construction were introduced. Static art/room bakes and prop textures are reused.

These are tracked RGBA allocations plus measured CDP heap, **not total process RSS or GPU residency**. Current physical-handset memory pressure and thermal/long-session performance remain unresolved.

## Deliberate limits and rejected approaches

- No runtime 3D/WebGL engine, material simulation, new gameplay, indoor navigation rewrite or new Byte art.
- A closed opaque sculpted bath was rejected: it would hide the actual water/body relationship. The authored ceramic is open-front; old live cutaway stays authoritative.
- A larger ornamental passage was rejected: it would consume the nook/storage/transition territories. Small recessed thick frames retain the compact footprint.
- Per-frame room materials/facets were rejected in favor of offline light and cache reuse.
- A larger native-raster terrain and hiding terrain were tested as performance interventions and rejected: they did not materially improve the controlled run.
- Baked shadow direction does not change with device tilt. Moving props retain cheap live contact shadows; this is a presentation compromise, not a new light simulation.
- Broad source frames are normalized to established destination footprints. Some small props are softer than Byte and large bakes retain mild render grain. Fine fit, art direction and isometric layering require Human Eyes review.
- No actual target phone, microphone/camera room or hardware sensor was available. Existing sensor logic passed software probes; physical acquisition/orientation and aesthetic/thermal acceptance belong to Human Fingers.

## Reproduction

Static serving needs no build step. Art authoring is offline and optional:

```sh
blender -b -t 6 -P art/render-world.py
python art/index-frames.py
python art/encode-world.py
```

QA uses installed Playwright/Chromium; no runtime framework or package system was added. New focused probes live under `qa/sunburn-xiii-*.cjs`. The review gallery and measurement bundle are separate evidence, not application UI or replacement gameplay.

Engine cutoff: complete-world candidate ready for Human Eyes and Human Fingers; final aesthetic and target-handset acceptance remain theirs.
