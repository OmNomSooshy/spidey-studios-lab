# Little Sun — a non-canonical Spider Byte candidate

Experimental branch: `experiment/little-sun-2026-10-06`.
Base: `2bc4e42a280f5e2119ddd98bc9a9602514fd84d3`.
The canonical main branch and its GitHub Pages deployment are not changed by this candidate. Its independent hosting identity is in `.openai/hosting.json`.

## One possible future

A small creature shares a warm pocket of glass with you. He notices a finger, comes over, enjoys being held gently, survives rough play, plots mischief, and eventually makes himself a place to sleep. Upstairs is available through the existing physical platform, rather than a second app or a game menu.

The central bet is **reciprocity followed by independence**. Touching him should elicit a readable response; leaving him alone should reveal a life that is not waiting for another command.

### Experience decisions

- Smaller room-scale Byte, generous space, warm light, a supporting-edge shadow, and sparse drifting dust. The brass gravity puck casts the room's glow; when he steals it, the glow travels with it. Existing HQ artwork is reused unchanged.
- A small unsolicited scuttle introduces motion. Finger holding/moving invites actual ground travel. His curious pose and slight lean acknowledge attention, without pupil replacement or fabricated expressions.
- A gentle hold closes his eyes and produces a restrained synthesized purr/chirp. Larger movement is ordinary carrying; quick release is still throwing. After a rough flight, the landing gets a short closed-eye recovery and a curious look.
- Independent quiet time, the existing prank, and the upstairs opportunity arbitrate simple idle windows. Rest gets more opportunity after calm play; upstairs gets more after rough play. No dialogue, inventory, feeding meter, score, or personality infrastructure.
- For rest he scuttles, looks up, hops, and fires a separate physical strand from his spool to the glass. Gravity and torque turn him upside down. He settles and closes his eyes; touching the room wakes him and cuts his strand while preserving momentum. Player webs retain their ownership and mechanics.
- Platforms have simple wood/silk presentation. Room light gradually becomes a cooler high space as the camera climbs. Scale changes ease continuously; the same physical creature returns downstairs.
- Small gesture-unlocked Web Audio sounds and optional short vibration supply bodily feedback. The mute preference survives reload; runtime creature state does not.

## Things revised or rejected

- Rejected a sensor permission request on the first creature touch. The gravity puck owns that request. The thief can dislodge it without consent, but cannot manufacture Earth-mode permission.
- Rejected using a suspended idle pose for rest: idle floor correction competed with the strand and made it feel frozen. Sleep remains airborne, under an actual pull-only constraint.
- Revised the first short hop/early attachment because the equilibrium touched the floor. The current higher hop and later length capture leave a visible gap beneath him.
- Rejected screen-upright recovery during rope swings: it fought the rope's angular effect. Tethered motion now keeps that angular authority.
- Removed the screen-room finger-follow's vertical targeting. Byte walks on the floor and waits for landing before answering a distant finger; he does not float toward it.
- Fixed old drag samples incorrectly creating a toss after a calm stationary hold. Cancellation preserves the last actual web endpoint even when the browser zeros event coordinates.
- Unified transformed extents for flight containment as well as deliberate held-wall compression. A nominal unrotated rectangle was inadequate for the small rotating creature.
- Kept scheming and aiming in the Earth-supported body frame; the new common presentation transform exposed the older upright acting assumption.
- Retained unrestricted upstairs webs after an explicit controlled comparison: a real touch-held strand caught a falling miss, redirected him horizontally, and preserved release velocity into a platform landing.

## Device capabilities

- DeviceMotion's gravity-inclusive acceleration: existing continuous projection and smoothing, Earth-relative boundary support, orientation and ground scuttle; upstairs uses projected horizontal acceleration for tilt steering. Shake acceleration remains present.
- Browser Pointer Events and capture: grab, flick, spool payout, planted endpoints, and temporary upstairs anchors. Secondary touches cannot take over the primary gesture.
- Web Audio: short synthesized sounds; initialized only after a gesture, suspended in the background. No microphone, camera, location or network AI.
- Vibration: 5–12 ms contact/bounce feedback where supported. iOS may ignore it.
- Visibility and viewport APIs: pause when backgrounded, resolve interrupted fingers, and resize proportional geometry/anchors safely.

## Self-QA and honest limits

`qa/mobile-probe.cjs` and `qa/device-probe.cjs` exercise 20 scenarios in Chromium using an iPhone-sized touch context and actual CDP touch dispatch. They cover hold/blink, finger following, all four held boundaries, throwing, planted web lifetime/release, slack ropes, physical sleep/wake, scheming/theft, continuous Earth rotation and non-bottom scuttle, player-initiated platform entry, contextual scale, temporary rope/release, fall/home, permission denial and missing data, actual motion-event acquisition/filtering, mute persistence, secondary fingers/cancellation, backgrounding, five viewport sizes, resize with a planted web/displaced puck, an actual rope rescue, and Earth-supported acting.

The rescue uses the same initial falling state with and without a tether: without it Byte misses; touching a point above/right, holding briefly, and releasing swings him into the target platform. This is a physics comparison, not a scripted gameplay path.

The endurance probe repeatedly exercises idle opportunities and physical cycles, checks finite state and bounded platform storage, and then subjects Byte to a hard rotating throw. Screenshots and JSON reports go outside the repository by default. Asset references resolve with no failed requests; the runtime scripts have no browser exceptions in the final suites.

These are browser probes, **not physical iPhone/Safari or Android hardware acceptance**. Human Fingers must judge discovery, sensor sign/feel on their handset, sound through phone speakers, and the emotional read of the pose.

Known compromises:

- The smaller brass puck is more integrated but less self-explanatory than the canonical red button. Earth permission now needs an intentional puck tap; autonomous theft without consent uses screen gravity. On Safari, upstairs tilt needs that prior permission; rope play remains available.
- Sleep reuses the approved smiling closed-eye blink asset. It is charming upside down, but not a purpose-drawn sleeping face. His rotating strand attaches at the existing approximate hip spool point.
- Rest can be the first autonomous opportunity and lasts until touched. Prank and platform discovery are therefore variable, not guaranteed in a short first visit.
- Upstairs continues the inherited vertical bounce grammar even if Earth mode was enabled downstairs. Room-scale presentation, the displaced puck and the player's planted room web resume on return.
- A major viewport/orientation change resolves an in-progress grab or upstairs hold; planted room anchors are retained and scaled. Browser toolbar resizing may also interrupt a held gesture.
- Sounds are deliberately tiny synthetic creature/game sounds, not recorded character performances. Vibration and audio availability depend on the browser.
- Canvas play remains primarily visual and tactile; accessible labels on the two controls do not make the creature simulation accessible to a screen reader.
- No offline installation, reload persistence, or real-hardware performance guarantee is claimed.

## Running the probes

Serve the repository with any static server, for example `python -m http.server 4173`. With Node, Playwright, and Chromium available:

```
node qa/mobile-probe.cjs
node qa/device-probe.cjs
node qa/endurance-probe.cjs
```

Optional environment variables: `BYTE_QA_URL` (root URL, ending in `/`), `BYTE_CHROMIUM` (browser executable), and `BYTE_QA_OUTPUT` (artifact directory). The simulation handles require both a localhost origin and `?probe`; they are not exposed on the published candidate.

## Questions for Human Fingers

Does a calm hold read as affection? Does finding him asleep make him seem like somebody? Does waking him feel like interrupting a creature, rather than restarting an animation? Does he get the credit for stealing the room's little sun? Does the rope turn a mistake upstairs into a memorable save? Does the quieter presentation make him more present, or hide too much of what can be done?

The useful discovery is that **motion alone did less than a visible response followed by a self-authored choice**. The strongest candidate moment is the physical sleep: there is no menu, the existing spool supplies the action, the same gravity explains the result, and he remains touchable throughout.
