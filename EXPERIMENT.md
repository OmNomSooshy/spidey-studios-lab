# Current candidate: Sunburn V — kitchen / little thief

This isolated branch is `experiment/sunburn-v-2026-10-07`, forked from the Human Eyes bath/passage correction `842cb55872c581fae9df345e9b411ef7045c67e3`. [Sunburn V implementation, decisions and evidence](SUNBURN-V.md) describes the kitchen, physical feeding/theft and richer washable dirt. The existing experimental hosting origin is reused so local home/care history carries forward. Earlier source branches, including Sunburn IV, remain separate.

# Sunburn IV — care becomes play

This isolated branch is `experiment/sunburn-iv-2026-10-07`, forked from Sunburn III performance repair `948192009bb1219a50b5b19125e51fcbc3c7d2af`. [Sunburn IV implementation and QA](SUNBURN-IV.md) describes the bathroom. The existing Sunburn candidate hosting origin is reused to retain its local player history. Canonical, Through the Glass and Sunburn III source branches remain separate.

The inherited Sunburn III design record follows.

# Sunburn III — a place Byte lives

This is a noncanonical candidate on `experiment/sunburn-iii-2026-10-06`, forked from the validated Through the Glass repair `5665c230e0c81b09889d521f78ab77d50c01b435`. Canonical Spider Byte and the Through the Glass branch have separate source and hosting identities and are not updated by this experiment.

## The thesis

A home becomes meaningful when the creature goes somewhere for a reason, and when what happened there remains after he leaves. Three neighboring downstairs spaces, one upstairs loft, two movable belongings, one preferred sleeping place, and the existing world above are enough to test that now.

The quiet nook is left of the aperture hall. The play space is to the right. Its full-height ladder connects to a separate loft directly above it. Its spring launches Byte out through the roof; ordinary obby bouncing begins later on the outdoor crystal. There is no room picker, travel menu, care panel, score, currency, or tutorial sequence.

## What Human Fingers can discover

- Invite Byte through the visible archway with a finger, or carry him into the opening and release. He walks there and the camera follows the passage. Pulling him past an ordinary outer boundary still produces containment and squish. A web planted in a room keeps him in that room until its endpoint is released.
- Leave him calmly on the nook's mat. After a readable quiet opportunity he makes the existing physical sleeping strand, hangs, settles, and sleeps. Picking him up or the existing environmental stimuli can wake him. This is a bodily rest activity, not an energy refill button.
- Grab, roll, throw, or move the cork ball. Drag it to a doorway and release; Byte takes it through the opening and puts it down in the next space. It can be brought to the nook or hall rather than being a play-room icon.
- Touch the ladder in the play space, or carry Byte into it and release, to go upstairs. The camera follows his climb into a separate full-size loft. Bring a ball up, use the normal room web, or return downstairs through the floor hatch without starting the obby.
- A spring platform descends on entering the loft and waits for real contact. Entering the room never auto-launches Byte. Place him onto it for a decisive launch through the roof, an empty-sky beat, then the outdoor crystalline tilt/web climb. A missed descent returns him to the loft at normal room scale; the floor hatch then leads downstairs. The spring is available again without waiting for a random autonomous opportunity.
- Find one blue stone sufficiently far up the crystal. It has a real falling body and can return downstairs. Byte can pick it up, carry it through the hall, and leave it in his nook. Human Fingers can subsequently move it elsewhere.
- Return after a reload to the last occupied space and the belongings' last saved locations. A faint silk trace remains once Byte has slept in his nook. There is no absence punishment or simulated neglect.

## What Byte does independently

The existing short-idle arbitration now includes playing with the ball and wandering, alongside rest, the platform opportunity, and the gravity-control prank. These are opportunities, not a scripted room tour. Human interaction interrupts a trip or toy activity. A dropped carried object keeps physical velocity rather than vanishing.

Rest means going to the nook, walking to his spot, casting the established sleeping strand, and settling under existing physics. A calm placement on the mat gives him a local rest opportunity before the ordinary longer idle selection.

Play means seeking the ball's actual current room, approaching it using existing scuttle, and giving it two physical kicks. Moving the toy changes where that activity happens. The ball then continues under gravity, bounce, friction and phone forces; animation does not drive it.

The prank means returning to the aperture hall, holding the unchanged scheming beat, targeting/webbing the control, dislodging it, and actually enabling Earth gravity. Tapping the loose control restores Screen gravity without restoring its UI position. The control stays in that hall, including when Byte leaves. A platform left waiting upstairs does not suppress the downstairs prank.

Once the upstairs stone has returned, a free Byte can claim it for his nook. This is one authored action, not endless confiscation or an inventory system. He can leave afterward. The object's return does not require him to stand beside it forever.

## Spatial integration

The sensing aperture is in the central hall. Its camera light patch is local there; a quiet voice can draw Byte back to it. Optional charger warmth also has a visible location in that hall, and he can travel to it. Darkness can send him to his nook. Trips and activities have priority over quiet retargeting, while loud sound, breath and handset forces remain physical interruptions.

Camera/microphone/motion acquisition, permission handling, signal processing and background shutdown are inherited. No new sensor APIs or recording systems were added. Phone inertia and breath pressure also affect the loose belongings. Sensing can remain open while Byte is elsewhere or upstairs, but the aperture itself stays downstairs rather than following as HUD. The existing global mute utility remains available.

The loft contains the spring arrival. Its floor hatch connects to the downstairs ladder; its roof opening connects to the outdoors. A pitched roof and brief camera pullback make the house recede continuously before an empty-sky interval. Only afterward does the world-fixed crystal enter view with its mounted platforms. Existing platform support, ordinary automatic bounce, tilt steering, held screen-point rope and momentum-preserving release remain authoritative. The outdoor obby continues using the candidate's existing screen-relative climbing grammar. Earth-owned boundary ground inside the house is still continuous and never snapped to four directions. See [Crystal Sky pass](CRYSTAL-SKY.md) for implementation, QA evidence and remaining phone judgments.

Room and obby body scales, HQ assets, spool origin, deployed player-rope length, grab/flick, deformation and collision forces retain their existing authority. The place uses a fixed room reference for furniture presentation, so shrinking traversal Byte does not shrink his home. Two narrow containment corrections account for impact deformation and late acting/scale changes before presentation; they do not reduce angular velocity, lock orientation, or change restitution.

## Care and history explored

Care is arranging an opportunity: lead him to his mat, stop disturbing him, open or close his sensing aperture, bring a toy, move a possession, or help him get upstairs and home. He still chooses and can be interrupted. There are no need meters or upkeep penalties.

Only the last room, object locations, first stone discovery/claim, and a slept-here trace are saved locally. Audio/video are not saved. Runtime momentum, exact Byte position, sleep phase, platform state and the dislodged puck are not persisted across reload. Storage denial leaves the session playable. There is no cloud save or offline installation.

## Revisions and rejected directions

- Rejected a room menu and a generalized home framework at design time. Built four authored spaces with actual trips and things already happening in them.
- Kept a short authored doorway crossing instead of rewriting all established physics into a multi-screen solver. This is an explicit compromise, not a claim of unrestricted continuous architecture.
- Expanded the initial narrow door hit region to agree with the visible curved opening. Neighboring room art initially bled across the portal; each room background is now clipped correctly.
- Removed the inherited miniature sensing HUD upstairs. The aperture belongs downstairs; its acquired signals remain live until closed or backgrounded.
- Revised the waiting-platform state after it trapped the creature in the play space. It now remains a spatial object while downstairs life can continue.
- Quiet sensory targeting initially fought doorway intent. It now yields to the trip and never skips the continuous phone-force step when initiating voice travel.
- A normal-animation-frame playthrough showed the untouched first-visit greeting moving a freshly placed Byte off his mat. Touch now counts as the greeting, so that gesture cannot override a first care action.
- Stress tests found rotated Earth-impact squish enlarging a footprint after the original collision measure, and prank aiming rotating Byte after physics. The final boundary pass accounts for the body actually presented, preserving the act and squish.
- An early test incorrectly required Byte to remain beside his returned stone. Revised the test to inspect its arrival and persistent location without removing his next independent choice.
- A repeated-rest test incorrectly restarted a creature already hanging from his sleeping strand. It now lets the active rest routine finish rather than replacing its phase in the test.

## Upstairs correction

Management rejected the original "upstairs" as only the obby. It is now a separately visitable loft, with a usable ladder, floor hatch, room-scale physics and belongings. A waiting platform stays local to that room; it no longer suppresses normal life there or follows the camera before launch. The old climbing physics, support footprint, tilt and held-rope grammar remain unchanged. The stone comes back through the loft and ladder before crossing the downstairs hall.

An actual-touch route check exposed an almost immediate autonomous departure after arrival, caused by reusing idle time accumulated before the trip. Arrival now restarts that idle opportunity timer. The authored-cycle endurance fixture now suppresses unrelated random selections during its prescribed cycles, then explicitly releases arbitration for the unscripted portion.

## Self-QA

The initial candidate passed 58 focused scenarios and six extended runs. The upstairs correction reruns the 58 focused scenarios, the sensor stress, creature/place endurance and normal-frame playthrough, plus a dedicated 10-check ladder/loft/outdoor route probe. The correction runs include 60 seconds of combined sensor stress, 344 seconds of creature endurance and 556 seconds/66 passages through all four rooms. The route probe fixes random horizontal platform layout for reproducibility and supplies a controlled missed route; actual touch handlers, bounce, rope, scrolling and home-return solvers remain authoritative. QA is opt-in only on localhost with `?probe`; production exposes no simulation handles.

- CDP touch checks cover grab/hold/flick, every squish boundary, player rope payout/plant/slack/release, sleep/wake, scheming and the repaired Earth prank, continuously varying support/corners, platform entry, traversal scale, real held-rope rescue and return home.
- Device checks cover permissions and denial, missing sensor data, audio gesture/mute persistence, secondary pointers, cancellation, backgrounding, viewport changes, displaced-puck state, Earth-side aiming, and the obby rescue.
- Sensing checks cover real stream acquisition/shutdown, camera centroids and foreground/exposure separation, dark sleep/light wake, side-ground light/voice/dozing, voice/noise/DC/echo handling, breath, player tether ownership, charger events, cancellation and null samples.
- Place checks cover both doors, camera motion, carried Byte, carried and remembered belongings, mat rest, toy kicks, waiting-platform departure/return, stone return/claim, cross-space prank and platform coexistence, Earth-side doorway eligibility, sensory travel/forces, player-web blocking, interruptions and resize/background recovery.
- An uninterrupted normal-animation-loop browser visit uses actual emulated touches only: arrive, visit nook, place Byte on mat, sleep/wake, return through hall, visit play space, use the ladder to visit the separate loft without launching, descend to the play space, bring the physical toy back and reload. It does not call routine or simulation functions.
- A full browser capture pipeline uses reproducible video/audio fixtures through actual getUserMedia, camera pixels and Web Audio. Trusted virtual hardware emits DeviceMotion events. Combined sensor stress runs for 60 simulated seconds; separate inherited creature and place endurance runs exercise repeated autonomy and house/upstairs cycles for several minutes each.

These are Chromium simulations, browser captures and virtual hardware, not actual Safari/iPhone or Android acceptance. Door discoverability, travel feel, sleep/carry readability, microphone direction/classification, real device sensor signs, and sustained phone performance/battery use need Human Eyes and Human Fingers. Fixture-based success does not claim physical-room accuracy.

### Reproduce

Serve the checkout as ordinary static files. Node/Playwright/Chromium and FFmpeg for the playthrough recording are QA tools only, not app dependencies.

```sh
export BYTE_QA_URL=http://127.0.0.1:4191/
export BYTE_QA_OUTPUT=/tmp/byte-sunburn-qa
python qa/create-room-fixtures.py
node qa/mobile-probe.cjs
node qa/device-probe.cjs
node qa/room-probe.cjs
node qa/home-probe.cjs
node qa/upstairs-probe.cjs
node qa/capture-probe.cjs
node qa/phone-sensor-probe.cjs
node qa/sensor-stress-probe.cjs
node qa/endurance-probe.cjs
node qa/place-endurance.cjs
node qa/place-playthrough.cjs
node qa/crystal-probe.cjs
node qa/crystal-playthrough.cjs
node qa/crystal-layout.cjs
node qa/crystal-cache.cjs
```

Run suites sequentially for stable touch timing. Raw fixtures, videos, screenshots and logs are kept outside the checkout and deployment.

The initial Crystal Sky build failed on Management's Galaxy A06 5G using Chrome. See [Crystal performance correction](CRYSTAL-PERFORMANCE.md) for constrained before/after evidence and the replacement cached renderer. Local performance results do not clear that physical-target blocker without Human Fingers confirmation.

## Accepted weaknesses and Management decisions

The four spaces use the same bounded physics room while occupied. A roughly 0.88-second horizontal passage or 1.45-second ladder climb pauses ordinary body integration and creature touch input; accumulated sensor momentum resumes on arrival. This needs a phone feel judgment. It is not a general continuous level solver, and a planted player anchor does not span rooms.

Carrying is an authored pickup with a rigid approximate hand attachment, not articulated hands or a second rope system. Props have simple circular boundaries and coarse body contact. Touching a loose object grabs it; upstairs, its small hit region therefore takes priority over a grapple anchor at that exact point. The ladder and floor hatch are authored physical passages; most furniture is scenery; the mat, movable belongings, toy tray lip, sleeping strand and platforms provide the actual affordances. There is no furniture collision mesh or wall adhesion.

A visit may be declined under Earth gravity when the supporting boundary cannot physically lead to that doorway or ladder foot. Human Fingers can still carry Byte into the opening and release. Automatic trips do not invent wall crawling or airborne steering to overcome the current ground frame.

The home plan, ladder route, room-bound sensing control, mat invitation, toy-carry grammar, and one-time stone claim are experiments for Management to evaluate, not new canon. Sensor limitations from Through the Glass remain, including device-dependent exposure, breath classification, hardware-bottom assumptions and absent Battery Status on Safari. Sleeping still reuses the approved closed-eye pose and existing physical strand, rather than new sleep artwork.

The strongest observation from building it: a sleeping pose reads as a state; going to his spot, making a strand, waking and leaving evidence reads as a life. An object that can remain somewhere after both the finger and Byte have left does more for place than another labeled room. Whether Lilli finds those relationships without explanation is the next evidence.
