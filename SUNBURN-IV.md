# Sunburn IV — care becomes play

Noncanonical candidate: `experiment/sunburn-iv-2026-10-07`, forked from Sunburn III's crystal performance repair `948192009bb1219a50b5b19125e51fcbc3c7d2af`. Canonical, Through the Glass and Sunburn III source branches remain unchanged. The existing Sunburn Site is reused so its origin retains player belongings and history.

## What is playable

The bathroom is through the tiled arch **left of the sleeping nook**, continuing the existing house rather than opening a care screen. The old room IDs, hall aperture, play space, ladder, separate loft and crystal expedition remain where they were.

- Turn the physical tub tap to fill a bath. Turn it again to stop. The little chained plug on the right rim drains it.
- Grab Byte and put him in the tub. He remains the existing physical body: he can be lifted, thrown, webbed or taken away. The tub has an interior bottom in Screen gravity; a held body encounters it and can compress against it rather than popping to it on release. Water contributes buoyancy/damping to existing velocities.
- Pick up the yellow sponge from its dish and rub his muddy body. Movement where the sponge actually reaches a body-local patch makes foam; water/wet rubbing lifts the mud. Holding a tool still does not run an automatic washing animation, and rubbing dry does not magically clean him.
- Touch the shower head for a shower instead. Drag it on its hose to direct water over him. On release it springs back to its mount and keeps running, freeing the finger to use the same sponge. Tap the running head to stop. This is one washing process with two different physical water presentations.
- After enough wet scrubbing, a free Byte kicks/splashes with a real velocity impulse and can escape the tub. Droplets and a remembered puddle make the consequence visible. Outside the bathroom, a free settled wet Byte briefly shakes droplets off. His existing blink/curiosity/deformation and little voice are used for care reactions; no new character art or acting framework.
- The sponge is a portable physical belonging. It can be taken through a doorway, dropped elsewhere, moved by phone forces and remembered there.

Mud starts visibly present, can be picked up by hard play-space floor contacts, and returns after a crystal expedition. It has no effect on survival, rewards or movement. There are no return timers, hygiene percentages, needs bars or absence punishment.

## Body and history

Patch positions follow the existing body reference frame, facing, angle and deformation. Presentation is baked into one small cached sprite using the actual artwork alpha. Raw asset dimensions never become new collision bounds, and the HQ files remain unchanged. Care effects do not float beyond the silhouette.

The old `byte-sunburn-home-v1` data is upgraded in place by adding the bathroom and sponge without renumbering existing spaces or resetting the ball, stone, slept trace or remembered room. `byte-sunburn-care-v1` remembers mud, the fact of a completed wash, tub water and the small floor puddle. Wetness/foam/droplets are transient. Capture source and active water flow are not restored after reload; leaving the bathroom closes running water. Storage refusal is tolerated.

Bathroom masonry is pre-rendered once into a reduced-resolution composited background. The native-DPR foreground retains the creature, props and moving water. Droplets are bounded to 36. Care texture updates are capped while a pose remains the same. **During the outdoor expedition, the original HQ sprite is rendered directly and the room care process is suspended apart from wetness aging and expedition history.** This avoids adding care compositing to the constrained-handset crystal renderer; room-scale care presentation resumes on return, with new expedition dirt. The crystal source itself is untouched.

## Iteration and accepted limits

The first tub hid Byte's face too completely when empty. Its interior support and rim were revised together. An initial water level rose above the rim like an aquarium; fill now remains inside the rim. A fixed interior-bottom offset failed smaller/landscape washing contact; the tub now uses Byte's room dimensions. Mud/foam drawn as free overlay shapes left floating marks beyond some poses; alpha-clipped cached presentation replaced that. A second per-frame body overlay was rejected to keep foreground work down.

This is a deliberately lightweight basin/stream/contact model, not fluid simulation. There is no solid rim that prevents carrying Byte into the tub. Screen gravity gives the tub its internal bottom; Earth mode retains the existing continuous screen-boundary ground frame, uses Earth down for water forces/spray/droplets, and tips water out rather than installing an incompatible bathtub floor. Sponge contact is approximated by small body-local patches. Body wetness is shared once water reaches him, allowing wet sponge rubbing above the waterline. The visible puddle is a small persisted trace, not another cleaning task. Byte has no autonomous bathroom-seeking routine.

## Evidence

All new probe access remains restricted to localhost with `?probe`; it is not exposed on the deployed hostname. QA scripts use the existing installed Chromium/Playwright tools and introduce no product build dependency.

- 68 inherited focused checks passed: mobile touch/grab/flick/squish/web, device/continuous Earth support, real-world sensing, home belongings/rest/autonomy/prank, upstairs entry/traversal/return.
- Crystal probes, four viewport layouts and bounded cache checks passed, including the missed-route rope rescue. Crystal still uses no patterns or warmed per-frame scenery gradients; its cache remains eight tiles / about 9.5 MiB on a 10,800px climb.
- Nine `qa/care-probe.cjs` checks passed: physical doorway discovery/return; bath/scrub/real splash/history; held shower/shared cleaning; drain and portable sponge; dry-vs-wet contact and planted web; shake/contextual dirt; cancellation/background/resize; Earth support while draining tipped water; old history and denied storage.
- `qa/care-layout.cjs` passed 320×568, 360×740, 390×844, 430×932 and 844×390. Actual contact wets Byte, water stays below the rim, and the body stays contained.
- `qa/care-playthrough.cjs` uses normal RAF plus actual Android Chrome touch events to discover the bathroom, fill a bath, carry Byte in, scrub clean, receive a physical splash, drain it, direct the shower, and return to the nook. No simulation stepping or body/physics state writes drive this route. Only competing idle opportunities are suppressed for repeatability. The same route completes under 6× CPU throttling with GPU disabled.
- The normal-RAF constrained crystal playthrough passed actual touch and trusted virtual phone tilt, held physical rope, missed descent to loft, and the ladder downstairs. Browser navigation to a blank page remained responsive.

[Recorded QA evidence](qa/sunburn-iv-evidence.json) contains check outcomes and measured limitations. Final normal-RAF care traversal averaged **58.54 FPS** (16.8 ms p95 frame); the 6× CPU / GPU-disabled traversal averaged **32.45 FPS** (49.9 ms p95, 116.6 ms maximum frame gap, 193.7 ms maximum pointer timestamp delay, 200 ms maximum long task, 153 ms browser exit). No runtime errors occurred.

Alternating same-session crystal comparisons at 390×844, DPR 2, 6× CPU, software rendering, six seconds of camera travel measured inherited repair **35.47 / 43.02 FPS** and Sunburn IV **42.00 / 45.21 FPS**. Candidate completed visible-layer raster median was **5.9 / 5.3 ms** versus **5.0 / 6.2 ms** inherited. Candidate p95 raster spikes reached **43.4 / 32.2 ms**, so this is evidence against a sustained regression, not a phone performance guarantee. Earlier local variants varied markedly (including 19–35 FPS), and removing individual care operations did not isolate one reliable root cause; the final implementation avoids care compositing during expedition altogether. The benchmark drains visible canvas layers, not hidden cached room backgrounds.

The final commit/deployment status is reported with the handoff. Browser emulation is not a Samsung Galaxy A06 5G. The prior physical crystal blocker is not claimed cleared until Management tests that handset. Care discoverability, sponge feel, bath/shower preference, splash readability, sound/haptics, real sensors and sustained phone performance remain Human Eyes/Fingers acceptance. No physical-phone validation has been performed by this agent.
