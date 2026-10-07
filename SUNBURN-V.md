# Sunburn V — kitchen / little thief

Candidate branch: `experiment/sunburn-v-2026-10-07`. Parent: `842cb55872c581fae9df345e9b411ef7045c67e3`. This is an isolated experiment, not canonical Spider Byte.

## The place and interaction

The kitchen is the next downstairs space beyond the play room, reached through its new right-hand recessed passage. The old bathroom, nook, hall, play room and loft coordinates are unchanged. The kitchen has warm timber, a small window, hanging utensils, an open biscuit tin on a high shelf, and a low dining table. Its masonry is cached at reduced resolution; Byte and food remain foreground physical objects.

Three jam biscuits physically sit on the high shelf. They are the same class of movable belonging as the existing ball, sponge and expedition stone, with ordinary gravity, phone inertia, breath pressure, collision and hand carrying. The shelf and table support food, not Byte's ground frame. There is no kitchen floor that competes with Earth-owned boundary support.

Fingers can pick up a biscuit and offer it at Byte's actual mouth. Brief sustained contact produces a bite: the biscuit loses a visible scallop, Byte chews/blinks, crumbs fall and a small jam stain appears beneath his mouth. Pulling it away stops eating. Returning it continues. Food can be dropped on the table or carried into other spaces. Eating can occur elsewhere if Fingers brings the food. A free biscuit reaching the mouth can be caught there using the existing carried-object vocabulary, within the contact radius; no remote acquisition occurs.

On an eligible idle opportunity in the kitchen, Byte notices available food. He scuttles to a useful position, faces the biscuit, holds the approved scheming pose for 1.2 seconds, then fires his web. The line travels to the food, becomes physically attached, and he reels it off the shelf. The biscuit slides, falls, swings and reaches his mouth through actual physics. He eats it and leaves crumbs. Fingers can interrupt the scheme or steal the biscuit back. This is a local authored opportunity, not a hunger system or general behaviour architecture. Other autonomous opportunities and the gravity-control prank remain intact elsewhere.

The **same `web` state, drawing and `solveWebTether()`** serve the theft. Its endpoint may now be a light movable biscuit instead of a fixed finger/planted anchor. Tension is shared between the endpoint and Byte, including the existing spool torque; slack still does nothing. Reeling only shortens the rope. Fixed-endpoint player behavior retains the same mathematics, ~1.2-height payout and planted/release grammar. Food theft cannot claim an active player web. Cancellation leaves both bodies' velocities intact. There is no parallel food-web simulation.

## Dirt that actually reaches the body

The old coating mixed center-relative patch coordinates with the image's top-left painting origin. Several marks were drawn outside the silhouette; another landed on the head rather than its intended body region. The painting origin now agrees with the body-local contact frame.

Six broader cleaning regions contain bounded, varied smears, splats and scuffs. Repeated hard play and crystal returns add new marks across the lower body, hoodie, hands and eventually face. Growth continues even when opacity is already saturated. Each region holds at most eight marks: at most 48 cached stains, not an elaborate dirt simulation. A meal adds a small contextual jam mark. Existing wet-sponge contact and rinsing remove the dirt; broader dirt regions have corresponding actual cleaning contact areas. No bath forces, fill/drain rates, buoyancy or fixture semantics change.

The small cached coating uses the original sprite alpha. Facing, pose, angle, bob and deformation still apply through the existing body transform. All eight HQ presentation frames were checked: coating alpha matched source alpha exactly, with no pixels outside the silhouette. A presentation probe measured affected artwork pixels increasing from 1,420 after one dirty event to 12,476 after repeated events. This measures spread, not just a changing opacity value. Foam remains small even though the cleaning regions are broader. Outdoor rendering still uses the raw HQ artwork directly, preserving the constrained-phone crystal path.

## History and deliberate limits

Existing home and care data upgrade in place without renumbering rooms or erasing belongings. Food position and remaining bites are saved with belongings. Completed meals leave a remembered, restrained crumb trace on the table. Stains and dirty-event history are saved with the existing care data. Capture sources still shut down in the existing way. Storage refusal remains playable.

Supply is deliberately **three biscuits, four bites each**, with eaten state retained across reloads. There is no replenishment, shopping or inventory system in this probe. This is a finite domestic encounter, not a finished long-term food supply policy. Management should evaluate whether/how a physical pantry refill belongs in later play. Autonomous theft pauses briefly after eating; this never becomes player obligation, fullness, starvation, absence punishment or a schedule. Feeding by hand remains available during that pause. Theft is a screen-down domestic opportunity; offering food works in the current body/Earth frame. A displaced biscuit can make a theft fail; he does not teleport it back or repair the room.

## Iteration and performance

Initial feeding geometry landed too high on the normalized art. Mouth alignment was revised for idle/blink, curious, scuttle and scheming presentation, and the table was placed at the actual feeding height. The food only becomes carried when physically in mouth contact. A larger cleaning-region radius initially enlarged foam too much; bubble size was kept small independently of dirt coverage.

The first software-rendered 6× CPU kitchen route completed but averaged 17.27 FPS. Removing food drawing in a constrained raster probe reduced median completed render work from 15.0 to 7.6 ms. The original per-frame biscuit paths/clipping/shadows were therefore a substantial cost. Four tiny bite appearances are now baked once and reused as bitmaps; food shadows no longer repeat those paths. A matched constrained route improved to 34.81 FPS, with 50.1 ms p95 frame gap and 144 ms browser exit. Final candidate measurements are in the evidence record. An attempted body ablation using an unsupported mode did not actually hide the body; those measurements were discarded.

No artwork was generated or changed. `crystal.js` and `room.js` remain unchanged. The kitchen background is cached, cookie textures total about 100 KiB, particles are bounded, dirt uses the existing small cached coating, and kitchen presentation is absent during expedition.

## Evidence and remaining Human authority

`qa/sunburn-v-evidence.json` distinguishes final runtime routes, simulation checks, layout/pixel evidence and performance observations. Tests use installed Playwright/Chromium; the product remains static HTML/CSS/JS with no new runtime framework or build dependency. Probe handles remain localhost-only.

- `qa/kitchen-playthrough.cjs`: normal RAF and actual Android Chrome touch discover the kitchen, allow **natural autonomy selection** (no state-driving overrides), capture the scheming beat before web appearance, observe physical theft/eating, offer/withdraw/return food, carry a remaining biscuit back through a passage, and verify saved bites/meals. The route also runs under 6× CPU/software rendering.
- `qa/kitchen-probe.cjs`: geometry/topology, shared-rope slack/tension/momentum, planted-web ownership, scheme interruption, five viewport complete thefts, spread/alpha evidence, and Earth-relative food/body behavior.
- `qa/care-playthrough.cjs` with `BYTE_QA_DIRT_PLAY=1`: real touch repeatedly lifts/drops Byte in the play room, creating six actual hard-contact dirty events. The ordinary route then enters the bath, washes the filthy body with a held sponge, gets a physical splash, drains through the plug, uses the movable shower and returns to the nook. No body, water or dirt state writes drive this physical route; competing idle opportunities are suppressed for repeatability.
- Inherited touch/flick/squish, room web, sensory aperture, Earth support, home/rest/prank, loft and crystal regression probes are retained. The legacy throw test once missed its timing window during concurrent browser load; its isolated rerun passed without changing product physics.

Browser emulation and virtual sensors are **not a Samsung Galaxy A06 5G**. Real sensor acquisition, haptics/sound, sustained handset performance, first-player feeding discoverability, the theft's creature read and the dirt/bath payoff still require Human Eyes/Fingers. The previous physical-device Crystal blocker is not declared resolved by desktop evidence. Publishing status and the exact final commit are reported at handoff.
