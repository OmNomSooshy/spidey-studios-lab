# Mission 001 — Project Lightsaber return report

**Mission status: ACTIVE.** This is a validation handoff checkpoint, not mission completion. Android build, real font import, physical-device audio, and Management's listening approval remain outstanding.

## Repository and source visibility

- Repository: [`OmNomSooshy/spidey-studios-lab`](https://github.com/OmNomSooshy/spidey-studios-lab), branch [`work`](https://github.com/OmNomSooshy/spidey-studios-lab/tree/work), project isolated at `project-lightsaber/`.
- Local implementation branch before publication: `work`, based on `2bc4e42a280f5e2119ddd98bc9a9602514fd84d3`; project files were untracked. Remote `main` exposed the earlier report only and did not contain the implementation. The implementation was published to new remote branch `work` from that base, without merging or force-pushing.
- Implementation source commit: [`11af7a65167109f78f5c0976c4062c1691213c5b`](https://github.com/OmNomSooshy/spidey-studios-lab/commit/11af7a65167109f78f5c0976c4062c1691213c5b). The refreshed report is the follow-up commit on `work`.
- Direct source links: [Android app and sensors/audio adapter](https://github.com/OmNomSooshy/spidey-studios-lab/blob/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber/app/src/main/java/studios/spidey/lightsaber/MainActivity.java), [JNI bridge](https://github.com/OmNomSooshy/spidey-studios-lab/blob/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber/app/src/main/cpp/jni_bridge.cpp), [portable C++ engine](https://github.com/OmNomSooshy/spidey-studios-lab/blob/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber/core/src/saber_engine.cpp), [host motion trace](https://github.com/OmNomSooshy/spidey-studios-lab/blob/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber/core/tests/smooth_swing_trace.cpp), [host font/audio trace](https://github.com/OmNomSooshy/spidey-studios-lab/blob/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber/core/tests/audio_font_trace.cpp), [Gradle/CMake build files](https://github.com/OmNomSooshy/spidey-studios-lab/tree/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber).
- No files under Spider Byte were modified.
- ProffieOS source pin: [`87bc404e3a3321c959c43cfbdc4c5699b526de81`](https://github.com/profezzorn/ProffieOS/commit/87bc404e3a3321c959c43cfbdc4c5699b526de81).
- SoundFonts source pin: [`336d26ed7eb80e39e848c1cfd19ba86628944da5`](https://github.com/profezzorn/SoundFonts/tree/336d26ed7eb80e39e848c1cfd19ba86628944da5).

## Requirement status

| Requirement | Classification | Evidence and remaining work |
|---|---|---|
| Isolated Android project, native build, JNI and controls | **IMPLEMENTED, BUILD-VALIDATION-PENDING** | Gradle app module, CMake, JNI, Java activity, Android manifest and portable native core are in this directory. No Android build ran in this environment. |
| Phone gyroscope acquisition and lifecycle | **IMPLEMENTED, DEVICE-VALIDATION-PENDING** | `SensorManager.TYPE_GYROSCOPE` at `SENSOR_DELAY_GAME`, event timestamps, rad/s to deg/s conversion and JNI delivery are wired. No physical phone was available to validate axes, event rates, or resume behavior. |
| SmoothSwing V2 motion/blend behavior | **PARTIALLY IMPLEMENTED** | Core equations and key state semantics are compared below. Several Proffie audio/transition mechanics are adaptations, not a claim of exact equivalence. |
| Font ZIP import and PCM discovery | **IMPLEMENTED, BUILD-VALIDATION-PENDING** | SAF ZIP selection, safe extraction, nested font discovery and native format/pair diagnostics exist. Synthetic fixtures pass; the actual SmthJedi archive has not been imported. |
| Ignition, hum, swing and retraction audio path | **IMPLEMENTED, BUILD-VALIDATION-PENDING** | Native mixer and Android AudioTrack path are connected in source. Host synthetic PCM tests pass. Android runtime and audible output have not been verified. |
| Portable engine boundary for Quest reuse | **PLATFORM ADAPTER DECISION** | C++ engine accepts timestamped angular velocity and emits PCM without Android headers. Quest adapter remains out of scope. |
| Physical experience and Management approval | **IMPLEMENTED, DEVICE-VALIDATION-PENDING** | Requires Management to build/install and judge actual audio and feel. |

## Proffie source comparison

The relevant upstream chain is `SmoothSwingV2::SB_Motion` in `sound/smooth_swing_v2.h`, settings in `sound/smooth_swing_config.h`, pair/effect discovery in `sound/effect.h`, font state/effects in `sound/hybrid_font.h`, and the playback/ramp path through `sound/buffered_wav_player.h`, `sound/playwav.h`, and `sound/volume_overlay.h`. Local C++ re-expresses behavior; it does not copy or compile ProffieOS files.

| Behavior | Classification | Comparison |
|---|---|---|
| Gyroscope filter | **PRESERVED** | Proffie filters the `Vec3` gyro with a three-sample box filter. Core averages a three-sample rolling Y/Z window. Android maps screen X/Z to the Proffie Y/Z swing plane and omits the screen-longitudinal axis; startup filter warm-up and coordinates are platform adaptations. |
| Swing speed | **PRESERVED** | Both use `sqrt(y² + z²)` in degrees/second after filtering (`hypot` in C++). Android converts radians/second and supplies event timestamps; there is no absolute-position estimate. |
| Activation and continuation | **PRESERVED** | Entry at `SwingStrengthThreshold`; an active swing continues down to `0.9 × threshold`. Core resets activity when the blade is off. |
| Sensitivity and sharpness | **PRESERVED** | `min(1, speed/SwingSensitivity)` followed by `pow(strength, SwingSharpness)`. Core reads matching numeric keys from V2 `smoothsw.ini`. |
| Maximum swing volume | **ADAPTED WITH DOCUMENTED DIFFERENCE** | Proffie multiplies shaped strength by `MaxSwingVolume`; core uses the same gain parameter, followed by its Android-oriented 0.5 base gain and soft limiter. Per-effect `SFX.*` volume metadata is not implemented. |
| Hum ducking | **PRESERVED** | Core applies `1 - shaped_strength × MaximumHumDucking/100`, now using shaped strength as the source path does. Font-level hum gain and basic hum-start/delay settings are applied by the mixer. |
| Paired low/high selection | **ADAPTED WITH DOCUMENTED DIFFERENCE** | Core selects a random index and keeps low/high files paired and phase-aligned. It accepts modern and legacy naming, several numbered layouts, and reports missing/unreadable partners. Proffie’s full `Effect` selection/no-repeat semantics and count diagnostics are not replicated. |
| Angular transition | **ADAPTED WITH DOCUMENTED DIFFERENCE** | Core rotates the two transition positions by angular travel, uses configured widths/separation, swaps transition roles at a boundary, and initializes random 10–60° offset/orientation. Transition file decoding and all upstream transition state details are not ported. |
| Low/high crossfade | **ADAPTED WITH DOCUMENTED DIFFERENCE** | Core computes a clamped angular blend and ramps gains over 2 ms, matching the configured default ramp duration. Proffie’s `VolumeOverlay` fixed-point ramp and audio scheduling are replaced by sample-domain float ramps in the Android mixer. |
| Swing playback timing | **ADAPTED WITH DOCUMENTED DIFFERENCE** | Loop starts use the current hum position when `ProffieOSSmoothSwingHumstart` requests it, otherwise a monotonic-time offset; the same random pair is used. Core reads PCM16 into memory and loops/resamples by linear interpolation. It does not port `BufferedWavPlayer` prebuffering, stream scheduling, all Proffie WAV encodings/rates, or every effect offset/variant. |
| Ignition/retraction | **ADAPTED WITH DOCUMENTED DIFFERENCE** | Source semantics were checked and corrected: Proffie ignition is `out`/`poweron` (with variants); retraction uses `in` and optionally `pstoff`, or power-off fallbacks. Core follows those primary names, pairs `in` then `pstoff` if present, and applies simple hum start/fade configuration. It does not reproduce all `hybrid_font.h` sequencing, fast/alternate variants, or the embedded fade scheduler. |

The table describes source/code comparison, not proof of identical sound. Whether adapted transitions and timbre feel right remains **UNRESOLVED SOURCE SEMANTICS** until listening on the target phone. Proffie’s audio scheduler, buffered stream, storage reader/locks, board clock/random helpers, amplifier sequencing, and embedded sensor stack are hardware/platform dependencies replaced by app-private files, JNI, Android SensorManager/AudioTrack, and a portable C++ renderer. A complete transitive upstream source build/link closure has not been enumerated.

## Deterministic tests

Host tests compile with the available C++ compiler and pass:

```text
g++ -std=c++17 -Wall -Wextra -Werror -I core/include core/src/saber_engine.cpp core/tests/smooth_swing_trace.cpp -o /tmp/lightsaber-trace
/tmp/lightsaber-trace
smooth swing trace ok; source-derived mid-strength gains and ducking match

g++ -std=c++17 -Wall -Wextra -Werror -I core/include core/src/saber_engine.cpp core/tests/audio_font_trace.cpp -o /tmp/lightsaber-audio-trace
/tmp/lightsaber-audio-trace
font/config discovery, numbered and legacy pairs, mismatches, WAV rejection, and saber render ok
```

The motion trace checks idle, swing response, source-derived mid-strength gain/ducking, and blade-off output. The synthetic font trace creates PCM16 fixtures and checks modern/legacy discovery, paired mismatch rejection, unsupported WAV rejection, incompatible V2 config rejection, effect naming diagnostics, render output, and bounded output. They do not establish Android JNI/runtime behavior or listening quality.

## Build readiness

- Android Gradle Plugin: `8.7.3`; included Gradle wrapper: `8.9` (`gradle/wrapper/gradle-wrapper.jar`, verified SHA-256 `498495120a03b9a6ab5d155f5de3c8f0d986a449153702fb80fc80e134484f17`).
- JDK: 17 minimum; Android Studio bundled JBR is suitable. `compileSdk=35`, `targetSdk=35`, `minSdk=26`.
- NDK: `27.2.12479018`; CMake: `3.22.1`; packaged ABIs: `arm64-v8a`, `x86_64`.
- Manifest declares a required gyroscope feature. No runtime permission is needed for gyro access or SAF-based ZIP import. AudioTrack is configured for 44.1 kHz stereo PCM16, low-latency mode, with 256-frame application blocks (about 5.8 ms of app audio per block; actual end-to-end latency is unmeasured).
- Java native declarations and JNI exports use matching `MainActivity` names/signatures. CMake includes the shared core from `core/` and links Android log. Static inspection completed; Android compile/link did not run.
- The workspace has OpenJDK 21 runtime and host C++ tools but no `javac`, Gradle installation, Android SDK/NDK, `adb`, or connected phone. The wrapper is present, but this environment could not download Gradle dependencies/distribution. Therefore **Android build validation is pending**, not passed.
- Import uses Android Storage Access Framework; it traverses archive nesting up to depth four, rejects path traversal, caps expanded data at 256 MB, and writes under app-private storage. Native loading reports unsupported PCM format, missing required effects, absent/unpaired swing files, and incompatible `smoothsw.ini` Version. Synthetic fixtures validate WAV/pair logic; Java ZIP execution was not run on Android.

## Test font sourcing

SmthJedi is identified in the pinned upstream SoundFonts repository as a ProffieOS SmoothSwing font by Thexter. Its upstream license states the font files may be used, modified, and redistributed without attribution or other restrictions. The pinned tree contains hum, `in.wav`, `out.wav`, eight numbered low/high swing pairs, and `smoothsw.ini`. Use the official archive:

`https://github.com/profezzorn/SoundFonts/archive/336d26ed7eb80e39e848c1cfd19ba86628944da5.zip`

The real WAV payloads were not imported here: the connected GitHub reader refuses binary blobs and shell network access did not provide another download path. This is an acquisition/validation limitation, not an identified licensing or source blocker. Do not treat synthetic fixtures as proof of the real font import.

## Diagnostics and expected limitations

The app displays a 250 ms diagnostic line with AudioTrack ready/off, loaded font, blade state, gyroscope sample count, filtered speed, active/idle swing state, sensitivity/sharpness, hum/effect names, `humStart`, and rendered frame count. Import and native load failures appear in status text; missing gyro, AudioTrack initialization/write errors, and font problems are surfaced. This is source-level diagnostic wiring and has not yet been observed on a phone.

Expected first-run issues include a phone without a gyro, a non-PCM16 WAV variant, a font missing one side of a pair, Android Studio missing the pinned NDK/CMake packages, or device routing that does not honor low-latency mode. Speaker/headphone quality and actual latency vary by device. Only PCM16 mono/stereo WAV is supported; full ProffieOS font behavior is not claimed.

## Management handoff

1. In Windows, install Android Studio Ladybug `2024.2.1` or newer stable. Ensure JDK 17+ is selected (the bundled Embedded JDK works).
2. In SDK Manager install Android SDK Platform 35, NDK `27.2.12479018`, and CMake `3.22.1`.
3. Download/clone the repository `work` branch and open `project-lightsaber/` in Android Studio. Allow the Gradle wrapper (8.9) to sync; select the `app` run configuration.
4. Connect a gyroscope-equipped Android phone with USB debugging enabled. Run the app from Android Studio. For command-line debug build, from `project-lightsaber` run `gradlew.bat :app:assembleDebug`.
5. Expected APK: `project-lightsaber\\app\\build\\outputs\\apk\\debug\\app-debug.apk`.
6. Download the pinned official SmthJedi archive above. In the app tap **Load Sound Font ZIP**, choose the ZIP, then select **SmthJedi**. Confirm diagnostics report that font and `audio=ready`.
7. Tap **Ignite**; make broad slow swings, short sharp swings, and direction changes while watching `gyro_samples`, `speed_dps`, and `swing`. Tap **Retract**. Repeat with phone speaker and headphones at a safe volume. Note gaps, clicks, clipping, hum level changes, responsiveness, and the naturalness of swing transitions.
8. Return Android Studio build errors verbatim, or report device model/Android version plus diagnostic text and listening observations. This handoff does not close Mission 001.

## Remaining classifications and acceptance

- **IMPLEMENTED AND RUNTIME-REACHABLE:** no physical Android behavior is claimed as runtime-proven yet. Host core/audio tests are reachable and pass.
- **IMPLEMENTED, BUILD-VALIDATION-PENDING:** Android Gradle project, Java UI/import/sensor/audio adapters, JNI, CMake, native core, wrapper, and synthetic host tests.
- **IMPLEMENTED, DEVICE-VALIDATION-PENDING:** sensor axis feel, font import on Android, AudioTrack output/latency, and actual motion-driven audio.
- **PARTIALLY IMPLEMENTED:** full Proffie smooth-swing/audio/font behavior; deviations are explicit above.
- **BLOCKED:** no local Android toolchain/device in this environment; no real SmthJedi binary import performed. Continue with Management's Windows build/device test; no fundamental architectural blocker identified.
- **UNRESOLVED SOURCE SEMANTICS:** complete transitive Proffie dependency closure and audible equivalence of adapted loop/transition/timing behavior.
- **PLATFORM ADAPTER DECISION:** Android gyro → timestamped degrees/second frame → portable C++ saber/mixer → JNI PCM blocks → Android AudioTrack. Future Quest controller motion can feed the same frame interface.
- **OUT OF SCOPE:** Quest implementation, blade rendering, passthrough lighting, full clash/lockup/stab/gesture features, and complete ProffieOS feature parity.

**Acceptance outstanding:** a successful Android build, actual SmthJedi import, physical phone audio driven by phone motion, and Management approval. Mission 001 remains active.
