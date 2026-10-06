# Through the Glass — a noncanonical Spider Byte future probe

Branch: `experiment/through-the-glass-2026-10-06`.
Parent: the prior Little Sun candidate, `0183fca0de88aae1652ccd228108b368ed17ee32`.
Canonical source remains `2bc4e42a280f5e2119ddd98bc9a9602514fd84d3` on `main`.
This branch has a separate hosting identity and does not update canonical Pages or the previous candidate.

## The bet

Byte can inhabit the phone more convincingly if something outside the glass can interrupt his own life. The player opens a small camera/microphone window once, knowingly grants browser permissions, then light, nearby movement, a voice, a clap, breath, and the phone's own movement can reach the same physical creature they already touch.

There is no sensor dashboard, transcription, face recognition, network model, or instruction sequence. The live circular window and listening ring acknowledge the open senses. The creature supplies the feedback. Touch still works, his own idle opportunities still happen, and upstairs is still upstairs.

### Real inputs and consequences

| Input | Acquisition | Consequence |
| --- | --- | --- |
| Camera light and contrast | Local front-camera capture, downsampled to 32 × 24 at about 10 Hz; luminance, color, and bright centroid | Light enters the habitat. Grounded Byte walks toward its projected patch, using the current support tangent in Earth mode. |
| Camera foreground movement / shadow | Successive luminance frames, with uniform exposure change subtracted | He ducks, looks toward the movement, and retreats along his current ground when space permits. A sudden darkening compresses/blinks him. |
| Dark camera view | Sustained low luminance while quiet and unoccupied | He builds his own physical sleeping strand in Screen mode. On Earth-owned side ground he curls/dozes on that support instead. Light return, sound, breath, pickup, or touch wakes him. |
| Quiet voice-like sound | Local microphone/Web Audio RMS and spectral measurements | Curious attention; if grounded and free, he approaches the window along the current ground. He does not understand words. |
| Abrupt loud sound | RMS attack with a refractory interval | A startle adds real Earth-up or screen-up velocity and small angular momentum. It does not reset an existing flight or delete the player's rope. |
| Sustained turbulent breath-like sound | Persistent broadband/low-frequency microphone energy | Pressure supplies continuous force to his existing physics. He lifts, swings under a tether, and falls when the pressure stops. No canned flight. |
| Phone acceleration and turning | DeviceMotion linear acceleration and local-Z rotation rate | Pickup wakes/startles him; translations and angular acceleration produce bounded inertia against the moving glass, even with Screen gravity selected. Existing Earth gravity and upstairs tilt remain separate. |
| Charger connection, optional | Battery Status `chargingchange`, where available | Plugging in wakes him and draws him toward a warm hardware-bottom patch to bask. Unplugging releases that response. This is an interpretation of power connection, not measured temperature. |

The player's planted room strand retains its ownership and pull-only law. Sensor forces add to velocity; held Byte retains finger authority. Existing scuttle moves him; camera or sound measurements never derive animation-driven velocity. No artwork was generated or replaced.

## Experience decisions and revisions

- **One deliberate window gesture.** Mobile browsers require consent and a gesture for these senses. The control says camera, mic, and motion before permission prompts. It can close all new capture at any time. Light-only and sound-only retries make a partially denied window useful.
- **A physical correspondence, rather than a catalog of APIs.** Light attracts, nearby movement unsettles, a sharp noise startles, air pushes, the handset moves the glass, and a charger offers warmth. These interpretations are narrow and readable without a control panel.
- **Rejected location, network state, notifications, and semantic speech.** They add permission or infrastructure without giving Byte an immediate bodily relationship with the room. No cloud speech service is used. No Bluetooth pairing or native app is needed.
- **Investigated light/proximity and Generic Sensor APIs.** AmbientLightSensor, ProximitySensor and Magnetometer were absent in the available Chromium runtime. Accelerometer/Gyroscope were present, but the existing DeviceMotion permission path covers the useful physical signals with broader mobile compatibility. Camera contrast/occlusion supplies the usable visual input; it is not falsely presented as a lux meter or proximity sensor.
- **Revised the gyro axis and force signs.** DeviceMotion.gamma is local Z, unlike similarly named DeviceOrientation angles. The conversion accounts for device-Y-up versus canvas-Y-down. Trusted browser sensor events verify the path, not only a manually assigned state.
- **Revised microphone echo handling.** Initially any Byte sound blanked his ears and interrupted sustained breath after an impact. The final guard rejects narrow self-emitted tones while allowing strong measured broadband external input. DC offset is removed before RMS estimation.
- **Revised darkness under Earth gravity.** A screen-up sleeping strand would compete with Earth-owned side support. Earth-night uses supported dozing; ordinary Screen-night keeps the physical web nest.
- **Revised light/voice ground intent.** These initially approached only along the screen floor. They now project onto the current supported tangent, including side-wall scuttle. Support changes do not discretize gravity.
- **Revised the climbing overlay.** The large room window initially intercepted a legitimate upstairs web point. Upstairs now keeps only a small close control in the bottom corner when sensing is open.
- **Revised permission lifetime.** Late grants, video playback, and AudioContext resume all have cancellation checks. Empty motion events do not claim a functioning sensor. Backgrounding stops tracks and contexts; foregrounding does not silently reacquire anything.

## Self-QA

The final suites exercise 38 focused scenarios (20 inherited creature/device checks plus 18 new room checks), along with a live browser capture run, trusted virtual sensor run, combined-input stress run, and the inherited endurance run.

- Real browser `getUserMedia`, video pixels, MediaStream audio, FFT/RMS, normal animation frames and physics were run with reproducible camera/audio fixture files. That complete pipeline produced voice attention, sound flight, breath lift, a sleeping strand after darkening, and waking when the view brightened.
- Chromium's virtual hardware backend emitted **trusted DeviceMotion events** for gyroscope and linear acceleration. The listener converted those events into opposite-glass inertial forces and a pickup response with Screen gravity still selected.
- Room checks cover spatial light, exposure versus foreground motion, dark sleep/wake, side-wall night and light/voice scuttle, tonal voice versus noisy air, clap impulses, DC rejection, self-audio filtering, preserved player web and held-body authority, partial permission denial, real track shutdown, cancelled late grants, charger events, landscape hardware-bottom geometry, and null motion data.
- Existing checks cover actual CDP touch grab/throw, all four deliberate squish boundaries, planted web lifetime and endpoint release, slack ropes, sleep/wake, scheming/prank, continuous Earth support and corners, platform entry/scale, tilt/web traversal, actual rope rescue, return home, viewport changes, mute, cancellation, and secondary fingers.
- A 60-second combined sensor simulation checks finite state, visible room containment, preserved planted rope ownership and a bounded climbing platform pool. A separate 332-second creature endurance run checks repeated autonomy/physics cycles. Final browser suites report no script errors or failed local assets.
- The initial heavily concurrent regression batch exposed timing-sensitive touch-release and subpixel breath-envelope assertions. Running the unchanged creature cases without contention passed. Those failures are retained in external QA logs; they were not “fixed” by weakening runtime physics.

These tests use Chromium, touch emulation, capture fixtures, and controlled virtual hardware. They are **not physical iPhone/Safari or Android acceptance**. Human Fingers must judge permission behavior, microphone classification, sensor feel/signs on their handset, discoverability, and whether the creature's response reads as alive.

### Known weaknesses and accepted compromises

- Camera auto-exposure can hide actual room-light changes. Covering/darkening the camera view is reliable; turning off a lamp is device-dependent. The light centroid is bright pixels, not a recognized lamp, face, or person.
- Breath detection is a local heuristic. Fans, music, fricatives and other turbulent noise may count as air. Browser/handset noise processing can weaken real breath. No claim of perfect voice/breath classification is made.
- Charging input is optional and absent in Safari. Already charging when the window opens makes the warm patch visible, but does not fabricate a fresh plug-in event. A physical microphone/charging port can be somewhere other than the assumed hardware-bottom edge.
- Camera and microphone cost battery. Capture requests modest ideal resolution/rate, samples only a tiny image, and stops in the background. No actual phone performance or battery-life measurement was possible.
- Long sustained breath can overpower gravity and lift Byte very far upstairs. This candidate chooses unmetered physical play over balancing the inherited obby.
- Simultaneous strong real-world stimuli can interrupt quiet autonomy, rest, or scheming. That is intentional reciprocity with the room, but noisy surroundings may make independent quiet life harder to discover.
- Capture may be denied by browsers or embedding policy. Use a secure top-level Safari/Chrome page. A denied window leaves ordinary touch play intact and offers partial retries.
- The consent caption and permission prompts add an explicit gateway; the consequences after opening it are non-touch. Audio/video are processed locally and never recorded, retained across closing, or uploaded by this app.
- Existing Little Sun experimental compromises remain: reused closed-eye artwork for rest, synthetic creature sounds, visual/tactile canvas accessibility limits, no runtime persistence or offline installation, and screen-relative upstairs bounce grammar.

## Reproduce

Serve this directory with a static server on port 4190. Node, Playwright, and Chromium are QA-only dependencies; the deployed app remains static HTML/CSS/JS.

```sh
export BYTE_QA_URL=http://127.0.0.1:4190/
export BYTE_QA_OUTPUT=/tmp/byte-glass-qa
python qa/create-room-fixtures.py
node qa/room-probe.cjs
node qa/capture-probe.cjs
node qa/phone-sensor-probe.cjs
node qa/sensor-stress-probe.cjs
node qa/mobile-probe.cjs
node qa/device-probe.cjs
node qa/endurance-probe.cjs
```

Run the browser suites sequentially for stable input timing. `BYTE_CHROMIUM` can select another Chromium executable. Probe handles are available only on localhost with `?probe`; production does not expose simulation controls. Raw fixtures, screenshots, and reports remain outside the repository and deployment.

## What deserves Human Fingers

The first bet is **blow → the same creature lifts → stop → gravity gets him back**, especially while he is hanging from the player's web. The second is **cover the camera → he settles into darkness → uncover or make a sound → he wakes**. The third is moving/turning the actual phone while Screen gravity stays selected: the glass and its inhabitant should no longer feel like the same inert screen.

What this probe suggests: Byte feels present when the outside world can make a consequential interruption while his own physical life continues. A sensor meter establishes that the phone noticed something; a creature preserving momentum, flinching, seeking light, or losing his nap establishes that **he** noticed it. Whether those interpretations survive a real child's room is the next evidence, not something browser fixtures can decide.
