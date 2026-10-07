# Sunburn VIII — stuff worth bringing home

Candidate branch: `experiment/sunburn-viii-2026-10-07`, from VII `2fe29edd8cfb1cec659001bb3125092cee140cfa`. Canonical and previously validated experimental branches remain unchanged.

The design thesis is that acquisition opens a relationship. Clothes are chosen beside his bed. Toys can go away, come back, and become something he asks you to use. Expedition history accumulates physically without turning into a physics stress test.

## Stocked, reachable content

Little Treasures contains **43 authored items**: 14 headwear, 7 eyewear, 4 contacts, 8 clothing treatments, 5 accessories and 5 toys. Headwear, eyewear, iris color, clothes and accessories combine independently. Prices remain 4–10 crystals; the existing Cloud Cap/Plum Beanie IDs, ownership and prices survive. Crystal generation, collection, bounce/tilt/web physics and the five-pickups-per-fragment rule are unchanged.

The physical wardrobe beside the nook opens owned wearable management. Shop purchase does not equip. Wardrobe equip/remove is free and persistent. The compact bathroom passage and authored nook retain their space. Shoes were left out: pose-varying feet would need more convincing anatomy-specific work than an overlay.

Clothes retain the canonical jacket silhouette, zipper and shading. They have stripes, pockets, patchwork, stars, diamond knit, bones, buttons or bee bands rather than eight uniform tints. Contacts recolor existing iris pixels; pupils and highlights remain. Pose-specific eyewear alignment follows the eyes. Composed costumes are cached in the existing 214×264 body reference frame, coated by existing care presentation, and transformed by the existing body renderer. They have no physical authority.

The trunk on the lower-left side of the playroom, below the trophy cabinet and clear of the ladder, opens management for all five purchased toys, the original ball, portable bath sponge and first expedition stone. Stored means absent from rendering/physics, not unowned. Taking out introduces the same owned body from the chest; putting away retains ownership. A stored sponge can be taken out and carried back to the bathroom.

## Toys and reciprocal play

| Possession | Human Fingers | Byte | Shared continuation |
|---|---|---|---|
| Original ball / Comet Ball | Grab, throw, flick | Fetches, carries, presents; plays himself if unanswered | Expectant invitation → actual object response → chase → bring back |
| Rolling Moon | Roll or throw the ring | Intercepts and rolls it back | Return roll followed by another invitation |
| Squish Frog | Hold/compress, release into a physical hop | Retrieves, offers, pops it and follows | Finger’s compression produces a real launch; Byte catches up and offers again |
| Breeze Wheel | Swipe or shake it; real microphone breath can spin it | Retrieves, presents, responds with a spin and chirp; uses it independently | Answered invitation → his response → another turn |
| Pebble Rattle | Move/shake the actual object | Offers it, answers the rhythm with chirp/body squish; tosses it himself | Recognized shake → contextual response → waits for another turn |

The new authored **rummaging** pose reads during a 1.9-second open-chest search, followed by actual retrieval. The new **expectant** pose belongs to a real offered toy. Grabbing that object answers the invitation; touching Byte interrupts it. No play request popup, invisible obligation or preference number. Invitations time out into Byte’s own play rather than waiting forever. Choice rotates through available possessions; it is not a persistent personality model.

Ordinary-touch QA exposed an offer rolling behind the mute control; offers now face clear space. Furniture yields to Byte and loose objects in front of it. Ordinary furniture QA also found that the opening touch could immediately dismiss a small chest dialog; backdrop dismissal now requires a touch that began on the backdrop, protecting both chest and wardrobe. A failed throw assertion initially suggested a sampling issue, but the complete event trace proved the test was releasing onto the ladder: existing home grammar correctly requested a carry and zeroed prop throw velocity. The speculative sampling patch was rejected, the test throws into open room space, and toy reactions now yield to intentional doorway/hatch carrying.

Existing home carrying and scuttle supply approach/presentation/return. Existing loose-body gravity, momentum, bounce, sensors and touch supply toy motion. There is no new toy web implementation, no replacement rope or controller.

## Physical expedition history

The crystal cabinet on the playroom’s spare wall displays a growing faceted formation, a small withdrawable foreground group, and additional etched growth at larger totals. Rendering is capped at 36 bulk facets plus five foreground specimens and six arcs. Stored fragments are not independent simulated bodies.

Touching the cabinet withdraws one real, grabbable loose fragment. Dragging a loose fragment back into the cabinet and releasing deposits it. Neither changes wallet balance or earned history. `stored = earned trophy count − loose fragments`; depositing removes that physical instance into the aggregate, not from ownership. Loose fragments retain room/normalized position on reload. Existing moved VII trophies remain loose; fragments still in VII’s authored display migrate into storage. The unique original expedition stone remains a separate belonging.

Byte may inspect the collection, withdraw a fragment, carry it physically and travel with it into his nook. Loose fragments still participate in existing body/prop interaction. There is no scripted emotional label.

## Validation and limits

Ordinary RAF/trusted-touch playthroughs passed all five new toy invitations and responses, including a measured ball throw, chase and return. Physical wardrobe/chest access, fragment withdrawal/deposit and reload persistence passed. Two fresh expeditions each collected five crystals and returned a permanent stored fragment. The focused possession probe passed 13 checks; the protected core suite passed 107 checks, with additional bath-read/cache/pantry checks and 45 costume/pose combinations.

Software Chromium at DPR2 measured 56.5–59.1 FPS for VIII versus 59.5–59.8 for VII without CPU throttling. At 6× CPU throttling VIII varied 16.7–25.6 FPS versus VII 22.6–28.2; this shared-host range is a limitation, not evidence of equal constrained-device performance. The crystal cache remained eight tiles / 9,960,040 bytes.

Evidence is recorded in `qa/sunburn-viii-evidence.json`. Deterministic probes are distinguished from ordinary RAF/CDP-touch playthroughs and constrained rendering comparisons. Production publication is verified by the native deployment result; it is not claimed to be a physical-phone test.

Known presentation compromises: wearables and toy assets are economical authored vectors against HQ Byte; tops use masked jacket material treatments rather than newly drawn bodies. Eyewear is purpose-aligned for each existing pose, and closed-eye sleep/blink states hide eyewear. New poses are candidate character art, not automatically canon. Search contents are cheated; the retrieved item, carrying and response are real. No fatigue/needs or toy preference simulation was added.

Storage is local to this browser/origin. Clearing browser data erases local history. Bulk history stays cheap, while objects deliberately withdrawn by Human Fingers remain genuine loose bodies and therefore cost linearly with deliberate physical clutter. Invitations can be interrupted or expire; responsive room play does not require obeying Byte. Mobile-equivalent software/CPU throttling is evidence of bounded cost, not certification on Management’s Samsung Galaxy A06 5G.

Human Eyes/Fingers should evaluate catalogue taste, alignment in the new poses, whether the search and invitation read without help, the toy response comedy, physical collection affordance, and actual handset responsiveness. No further possession expansion is implied by this candidate.

## Human Fingers correction — trunk placement

The trunk originally shared the ladder’s centre. It now occupies a compact lower-left footprint, clear of both the doorway and ladder interaction bounds. Ladder/transition code and priority are unchanged. Releasing a storable possession inside the trunk now stores its existing owned body; the original VIII build only offered modal Put away. Taking out remains physical and ownership survives reload.

Normal RAF/trusted-touch QA independently threw a toy through open floor with measured momentum, deposited it into the trunk, reloaded, retrieved it, deliberately carried it onto the ladder, reached the loft and reloaded there. Spatial separation passed five viewport sizes. The focused home/possession regressions passed 20/13 checks. Evidence: `qa/trunk-placement-evidence.json`. Physical-phone Human Fingers acceptance remains pending.
