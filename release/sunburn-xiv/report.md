# Sunburn XIV — somewhere new to play

**IMPLEMENTED AND BROWSER RUNTIME-REACHABLE. ANDROID APK BUILT/SIGNED. HANDSET ACCEPTANCE PENDING.**

Branch: `experiment/sunburn-xiv-playground-2026-10-09`.
Protected baseline: `545192c328912cd41633dc3f22598e1f046523b8`.
APK engine source: `223d2f6` (full SHA in `build-evidence.json`). The delivery commit adds evidence/artifacts; its runtime files match the APK.

## The candidate

Little Bob **1.1.0**, version code **3**, package **com.spideystudios.littlebob**. [Download APK](little-bob-1.1.0.apk).

The yard grows from **1200×1200 to 2200×1200**, extending along its positive X axis. Original furniture, plants, house, mushroom and activities retain their coordinates. The former outer fence opens onto a continuous meadow/path. Camera bounds expand to cover it; camera movement never relocates Bob.

| Family | Actual interaction | Autonomy |
|---|---|---|
| Climbing | Walkable ramp, intermediate landing at height 64, deck at 130; support/side contacts use actual body positions | Selects a destination, walks the real approach and climb |
| Slide | Sloped support projects gravity into downhill acceleration; position, height and momentum progress along the chute | May continue from the deck into a slide |
| Swing | Contact boarding, fixed-length pendulum with angular velocity, damping, pumping force and existing projected Earth force; grab/web/call releases the rider | Approaches and hops onto the seat, then physically pumps |
| Trampoline | Actual landing/contact impulses, spring compression feedback and repeated bounce opportunities | May choose it and return under its retained destination intent |

Tap the walkway or empty swing to approach. Drag an empty seat to move the pendulum; grabbing Bob retains priority. Carrying/dropping Bob onto equipment also works. The mushroom remains separate and keeps its original contact rule.

Sources: `playground.js` (bounded equipment/contact mechanics), `backyard.js` (bounds, support, gesture/autonomy integration and cached sprites), `art/render-playground.py` (offline Blender geometry using XIII materials/light/projection), `world-art.js` (asset loading). No runtime 3D engine or replacement physics controller.

## Runtime evidence

[Interaction results](evidence/interactions.json) exercise native RAF and trusted phone-sized touches: old garden → ramp/landing/deck → physical slide; swing boarding and grab interruption; repeated trampoline contacts; independent pan; reload; autonomous climb/slide, swing and bounce; real travel back through the garden and existing kitchen passage. Starting/camera fixtures are documented. Nothing claims a scripted pose is travel.

[Backyard regression](evidence/backyard-regression.json): five portrait/landscape viewport sizes, real spool→plant→reload→endpoint release, slack/taut/release laws, autonomous offscreen watering/bloom/invitation, mushroom contact and continued offscreen travel. [Fetch/peel](evidence/fetch-peel.json): retrieve/present→throw→chase/return; interrupted scheming and progressive physical screen-web peeling. [Indoor territories](evidence/indoor-territories.json): physical toy throwing, trunk deposit/retrieval, ladder carrying to loft and reload. [Mushroom](evidence/mushroom.json): repeated contacts, then actual travel away on a call. [Earth/swing](evidence/earth-swing.json) uses explicitly fixtured Earth vectors; it is not sensor-acquisition proof.

[Continuity](evidence/continuity.json): 88 protected files byte-identical, all original art/framing unchanged, Android wrapper/permissions unchanged except release version, original save keys/origin retained. Care, food, sleep/dreams, sensors, wardrobe, economy and Crystal controllers are unchanged; every one of those full loops was **not** replayed on a device during XIV.

The initially clipped swing top/slide edge were bake framing errors. Both were re-rendered; [alpha-boundary audit](evidence/art-framing.json) now proves margins around every fixture. Runtime captures separately show the complete shapes. Overview/body arrangements are capture fixtures; the swing capture uses actual touch boarding.

One inherited mushroom test assumed only one contact after a midair call; frozen 1.0.1 failed that assumption too. The revised test verifies finite physical travel and stopped bouncing at the destination. Early long-route checks also hit time limits; the final full route and a separate baseline/candidate house-return comparison completed without changing the old navigation controller.

## Performance / memory

Software Chromium, DPR2, native RAF; **not Samsung measurements**:

| Sample | Frozen 1.0.1 | XIV |
|---|---:|---:|
| Original garden movement, normal CPU | 56.2 FPS | 57.8 FPS |
| Camera pan, normal CPU | 47.6 FPS | 45.0 FPS |
| Climb/slide | — | 53.2 FPS |
| Swing / trampoline | — | 34.2 / 33.5 FPS |

At 6× CPU throttling, final XIV samples range **9.2–27.8 FPS**, with page-exit times **252–690 ms**. This severe software run remains sluggish and cannot establish handset acceptance. [Normal](evidence/performance-normal.json), [throttled](evidence/performance-throttled.json), [baseline normal](evidence/performance-baseline-normal.json), [baseline throttled](evidence/performance-baseline-throttled.json).

New equipment raster buffers were reduced about **75%** from the initial pass. Final visible playground texture buffers are ~2.59 MB plus ~2.94 MB of mounted sprites; meadow caches total ~12.55 MB versus ~6.88 MB before. Decoded world artwork grows from ~22.89 to ~32.29 MB. These are RGBA accounting and browser heap samples, **not Android process/GPU memory**. Static terrain/equipment pixels are cached; camera/movement transform them rather than re-lighting them.

## Android and fallback

[APK verification](evidence/apk-validation.json): valid signatures/alignment/ZIP, same package and certificate as frozen 1.0.1, all 161 packaged runtime files match this checkout. APK size **2,266,711 bytes**, SHA256 **b987417f8df0948158f8c39bc1e3eb8c160a2f6185f5721d8be606a14c4cd879**. [Adapter simulation](evidence/android-adapter.json) checks pause/resume, shop Back handling and garden save/reload through a mock native bridge.

No Android device is attached; the available software-only emulator was previously unable to sustain Android startup. **No installation, cold launch, native touch, save-continuity or target-phone performance pass is claimed.** Install over 1.0.1, do not uninstall/clear data, then check offline launch, existing ownership/history, sensors, full route and responsive phone navigation.

[Original 1.0.1](../little-bob/little-bob-1.0.1.apk) remains frozen, unchanged and available. [Recovery update](little-bob-1.0.1-recovery.apk) contains the byte-identical original game with version code 3 and the same key, so a same-code replacement can return to it after candidate testing. Actual installation of that route needs handset confirmation too. If restored, Bob's expanded-yard location clamps to the original yard; wallet, ownership and household data retain their original keys. Private signing material is outside Git.

## Known limits / Human Eyes authority

Swings move in one physical plane; raised walkways have simple solid support/side contacts and visual railings. Swing momentum is transient across a restart, while Bob's world position/camera and established household state persist. The meadow tile join and baked light/softness need Human Eyes judgment. Handset frame rate, memory and the actual update remain pending. XIV is a candidate, not a declaration that Management has accepted it. No further expansion is underway.
