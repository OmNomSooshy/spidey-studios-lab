# Sunburn XII — The camera is not his leash

Candidate branch: `experiment/sunburn-xii-2026-10-08`.
Parent: Human-Eyes-validated XI `a41c5b2b22586c20dd851b3423f595593b0e23d7`.

**IMPLEMENTED AND RUNTIME-REACHABLE in the software-browser candidate.** Actual Galaxy A06 5G / Chrome performance, peeling feel, invitation readability and Human Eyes acceptance remain **VALIDATION-PENDING**. Publication is reported separately with the exact pushed source/version. Neither GitHub main nor the validated XI branch is replaced.

The thesis: a garden Byte can occupy without being watched, and a prank aimed at the person watching him. The garden is a warm, fenced, isometric patch behind the kitchen, with seed packets, soil beds, a real watering can, a lawn ball, a spring mushroom, a low hoop, a bench, a lantern and a potted fern. It is deliberately a place for existing physical language rather than another economy or a garden-maintenance game.

## What Fingers can do

The kitchen's right-hand recessed passage leads outside. Tap it: Byte scuttles to the actual passage before entering. Tap the house step outside: he walks back across the garden before returning to the kitchen. Existing indoor doors, ladder, trunk, nook and authored rooms retain their territories.

- Tap reachable projected ground to call Byte to that world position. His acceleration, velocity and ground contacts determine actual travel.
- Drag empty ground to move the viewpoint. The actor does not follow the camera. Hit the actual body to carry and throw him; hit a physical prop to carry and throw that prop. There is one gesture owner, with pointer capture/cancellation and final release coordinates.
- Pull from his orange spool to plant a pull-only garden tether. Its rendered origin agrees with facing, rotation and deformation. Payout is proportional to garden Byte, and endpoint touch releases without destroying velocity. Indoor/expedition rope implementations are unchanged.
- Drag one of three reusable seed packets into a soil bed. Move the actual can's spout over a planted bed and hold it there: poured contact grows the seed into a flower. The real growth/water/material state persists. Nothing dies or becomes a debt while absent.
- Move the actual bench, fern and lantern into an arrangement. Their world positions persist. These are starter outdoor belongings, not duplicate instances of purchased indoor possessions. No wallet, ownership or existing storage state is changed.
- Throw the garden ball, drop Byte or the ball onto the spring mushroom, and use the low ground hoop. Byte can fetch, carry and present the ball, wait expectantly, recognize a real throw, chase its changing physical position, bring it back and invite another throw.

The world is a 1,200 × 1,200 ground plane projected with a continuous height axis. Its fence, house footprint and movable furniture constrain physical state. Camera position is separate projected-world state. Neither viewport edges nor sprite image bounds relocate the creature.

## What Byte does without instruction

Byte alternates actual interests rather than standing beside a prop and playing a pose. He physically fetches the ball or wanders to distant places. His world position continues updating offscreen; the camera stays put.

If a seed has been planted, he may walk to the real can, pick it up, carry it to that bed and pour through the same contact/water process Fingers uses. If he finishes or inspects a flower outside the view, he sends an edge-entering invitation strand. The invitation belongs to that actual flower and Byte's actual location. It never moves the camera by itself. Grab the strand to pan in its direction, investigate normally, or ignore it. An unanswered invitation fades without consequence or repeated demands. A shown flower is remembered.

Call him while elsewhere: he abandons the discretionary task gracefully, releases anything he was carrying as a real loose body, and walks the intervening distance. No edge spawn, camera tether or route teleport. Initial acceleration and obstacle steering remain visible in recorded trajectories.

Existing sensor acquisition and permissions are reused. Phone gravity can influence the garden ground-plane bodies; existing aperture sound/jolt responses make him physically hop, and breath can move the loose ball. The indoor Earth-support frame, shake semantics and Through the Glass systems remain their existing implementations. These new outdoor sensor consequences have software evidence only; physical-phone calibration is not claimed.

## The personal prank

An eligible autonomy opportunity claims a readable **1.5-second scheming beat**, then a **0.32-second strand shot** from the actual spool. It yields to a legitimate grab, another occupied state or an open dialog before attachment. It competes with existing authored opportunities rather than replacing the gravity-control prank.

The attached result is a physical elastic mesh: 35 movable vertices, 82 distance links, eight screen attachments with tension thresholds. Fingers grabs a nearby vertex, pulls the actual mesh, deforms neighboring strands and progressively detaches attachments. A short touch does not dismiss it. Partially detached silk remains attached after release or pointer cancellation. Once every attachment is broken, Byte displays existing proud vocabulary, and the unheld mesh falls away under its own simulated gravity. No timer, close button or scripted peel substitutes for this manipulation.

The rasterized silk lives on a pointer-transparent composited canvas, but the input is owned by the main physical gesture handler and the visible vertices are the constraint solver's actual vertices. Resting paint can be reused; physical tension is never inferred from an animation. Sound, wallet/shop and dialog-close controls remain above the silk and usable. The player can also touch the creature outside the mesh. Peeling shape, stiffness and how immediately it reads as silk remain Human Eyes/Fingers judgments.

## Preserving indoors and XI

`backyard.js` owns the outdoor ground-plane actor and camera; `screen-web.js` owns this one prank. `game.js` adds the room exit, explicit outdoor simulation branch and gesture handoff. Indoor physics, care, kitchen, house geography, customization, sensors, economy, toys and Crystal presentation remain their existing modules.

The new kitchen exit uses existing compact passage drawing. Only near that new exit, actual HQ alpha disambiguates an empty sprite-canvas corner from painted Byte. A visible pixel keeps grab authority. Blank source padding cannot swallow the doorway. Existing indoor nominal collision/body authority is not rewritten to fit an image.

XI's unseen-life free/seen checks explicitly reject an outdoor actor. A parked indoor body cannot claim to have performed kitchen/nook work while the real Byte is in the garden; an unseen indoor trace cannot become observed just because its old room is underneath the outdoor view. Existing lease/checkpoint/provenance logic remains live. Garden state is separately persisted under `byte-backyard-xii-v1`; this adds no offline life simulation.

## Evidence and reproduction

Run a static server for this candidate and XI separately; the tests do not require a build system. Playwright and Chromium are QA dependencies only. Example: `BYTE_QA_URL=http://127.0.0.1:4200 BYTE_QA_OUTPUT=/tmp/byte-xii node qa/sunburn-xii-playthrough.cjs`. Performance comparison additionally uses `BYTE_QA_BASELINE=http://127.0.0.1:4199`.

The browser probe is restricted to localhost with `?probe`. The ordinary-entry test explicitly runs without it and physically travels hall → playroom → kitchen → garden with trusted touch and native RAF. A page with no probe exports no runtime handles.

| Evidence | What it establishes | Limits |
| --- | --- | --- |
| `sunburn-xii-playthrough.cjs` | Trusted touch: actual passage entry, independent pan, sampled distance call, body throw, seed/can contact, decoration/reload, flower invitation, home return, complete answered ball loop, interrupted scheme, progressive physical peel/proud/removal. | Initial room and isolated opportunity arrangements are explicit fixtures; actor movement, touch and timing are native. |
| `sunburn-xii-extra.cjs` | Five viewport/landscape input offsets; actual spool/plant/tap/reload; slack/taut/release laws; offscreen can retrieval and growing; spring contact; XI outdoor veto; actual autonomous travel past viewport. | Direct rope-law comparisons and starting arrangements are marked fixtures. |
| `sunburn-xii-reachability.cjs` | Ordinary no-probe home route; opaque body versus passage ownership; essential controls and cancelled peel retaining silk. | Software touch is not Human Fingers. |
| `sunburn-xii-performance.cjs` and `sunburn-xii-motion-performance.cjs` | Serial native-RAF rendering, actual input/exit, software raster/DPR2/6× slowdown; distinct idle, walking, panning and peeling samples. | This is a constrained proxy, not the Samsung CPU/GPU or thermal behavior. |
| Inherited regression suites | Device/Earth/rope/boundaries, room/sensors, topology/upstairs, Crystal, care/cutaway, kitchen/preferences/theft, authored acting, possessions/trunk/ladder, mobile layouts, IX, X and XI. | Mostly controlled physics/probe fixtures, supplemented by XII native-touch runs. |

`qa/sunburn-xii-evidence.json` contains concrete results and retained performance phases. Raw captures/logs are in `/workspace/spider-byte-sunburn-xii-qa`; selected runtime screenshots are checked in beside the evidence. All final affected touch suites run after rendering optimization, serially. One reciprocal-loop replay timed out with no recognized release impulse; the real successful rerun records the actual throw, retained velocity, chase and second return. This is retained as a gesture/performance edge case rather than hidden by a forced play-state write.

The inherited kitchen probe first hit a navigation timeout and then an unseeded autonomous-meal deadline. The deterministic replay fixes only the harness random source at 0.5; all seven kitchen groups pass across five viewports. Kitchen product code was not changed to satisfy the fixture. Both failed runs are retained and not represented as passing evidence.

## Performance decisions

The first constrained draft was unacceptable: approximately 13.4 FPS for the garden and 11.5 FPS with silk, versus approximately 32.6 for XI indoors. Presentation ablation retained physical updates and recovered approximately 60 FPS with painting omitted. Removing just the full landscape blit or vectors also helped: repeated Canvas2D presentation, not the independent-world model, was the material cost.

The shipped approach builds the static landscape once on first outdoor entry; unopened indoors allocates no landscape or prop texture bitmaps. The landscape is composited and translated only by camera motion. Small bounded prop/flower images and the actor sprite are independently composited; standing props are not repainted when Byte moves. Actual water and contact remain live, offscreen bodies are not painted, and an unchanged physical foreground is retained. Changed movement/pose/deformation/camera/material state repaints; sub-pixel-invisible differences alone do not. Silk reuses resting artwork while solving live constraints; its raster resolution is capped at 1.25× CSS size. HQ creature art keeps its existing sources. No game movement is downsampled, no crystal/refraction code is removed, and no sensor sampling is replaced.

The evidence retains original, partial-optimization and final absolute measurements. One attempted post-change baseline suffered a five-second host stall; it is excluded explicitly, not hidden as a product speedup. A mistakenly overlapping smoke capture excludes one intermediate motion-profile run. Final measurements run in isolation. Idle improvement is reported separately from active motion/peeling. Final numerical results are in the evidence JSON and completion report. Actual handset validation remains mandatory before declaring target-phone performance accepted.

## Rejected/revised ideas and limits

- Rejected a window-like floating garden entrance: it read as another control. The existing recessed passage family gives it spatial meaning without reclaiming authored furniture territory.
- Moved the ball off the beds so reciprocal lawn play and planting have distinct useful territory.
- Direct straight-line navigation snagged on moved furniture. Small physical detours and contacts replace route snapping; there is no generic navigation framework.
- Rejected auto-follow/edge spawning and forced invitation camera movement. Distance and voluntary attention are the campaign's point.
- Rejected garden timers, dead plants, new resources, a decoration economy and indoor isometric conversion.
- Rejected repeated whole-landscape/mesh raster work after constrained evidence. Reuse presentation, preserve interrogable physical updates.

This is bounded 2.5D outdoor physics, not a full 3D world: roofs are scenery, the house footprint is closed except the entrance, and there is no terrain slope simulation. Starter outdoor props are local belongings; carrying indoor inventory through this new door is not implemented as a new cross-domain transport system. No stored item is silently consumed or cloned. Reload preserves actual position, placement, plants and planted anchor, but not an interrupted airborne velocity or unfinished autonomous intention; established cold-start indoor semantics are unchanged.

The garden currently has six reusable beds, three flower colors and a small authored outdoor toy vocabulary. More space does not require more systems. Human Eyes should evaluate material/readability, offscreen strand direction, navigation around unusual furniture arrangements, physical peeling feel and sensor behavior on the actual phone. No Android, extra region, quest, need or retention loop. Engine cutoff after this candidate and its evidence are delivered.

## Management cutoff

Management requested immediate push at the quota boundary. The last optional active-performance replay timed out awaiting prank selection; earlier full trusted-touch prank/peel/control tests pass. Final trunk release expired its legitimate flick window after a 465 ms harness pause; subsequent unchanged-XI and XII replays both pass. The final small proud-pose guard yields to existing authored performances and is syntax-checked, but a further performance-priority fixture was cut off. No handset acceptance is claimed. All completed and incomplete evidence is retained in the evidence JSON.
