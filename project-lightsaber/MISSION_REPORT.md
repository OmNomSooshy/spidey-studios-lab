# Mission 001 — Project Lightsaber return report

**Mission status: ACTIVE.** The corrected Android debug APK and a single-font SmthJedi ZIP are downloadable. CI verified the pinned asset and loaded it through the native engine. Android's actual ZIP/folder picker path, physical-device audio, and Management's listening approval remain unverified, so this is not mission completion.

## Repository and source visibility

- Repository: [`OmNomSooshy/spidey-studios-lab`](https://github.com/OmNomSooshy/spidey-studios-lab), branch [`work`](https://github.com/OmNomSooshy/spidey-studios-lab/tree/work), project isolated at `project-lightsaber/`.
- Local implementation branch before publication: `work`, based on `2bc4e42a280f5e2119ddd98bc9a9602514fd84d3`; project files were untracked. Remote `main` exposed the earlier report only and did not contain the implementation. The implementation was published to new remote branch `work` from that base, without merging or force-pushing.
- Workspace status at handoff: the local `work` ref still points to the base commit and the project directory remains untracked locally; the managed shell could not push over its unavailable network path. The remote `work` branch is committed and verified through GitHub, and is the canonical downloadable handoff.
- Implementation source commit: [`11af7a65167109f78f5c0976c4062c1691213c5b`](https://github.com/OmNomSooshy/spidey-studios-lab/commit/11af7a65167109f78f5c0976c4062c1691213c5b). The refreshed report is the follow-up commit on `work`.
- Direct source links: [Android app and sensors/audio adapter](https://github.com/OmNomSooshy/spidey-studios-lab/blob/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber/app/src/main/java/studios/spidey/lightsaber/MainActivity.java), [JNI bridge](https://github.com/OmNomSooshy/spidey-studios-lab/blob/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber/app/src/main/cpp/jni_bridge.cpp), [portable C++ engine](https://github.com/OmNomSooshy/spidey-studios-lab/blob/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber/core/src/saber_engine.cpp), [host motion trace](https://github.com/OmNomSooshy/spidey-studios-lab/blob/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber/core/tests/smooth_swing_trace.cpp), [host font/audio trace](https://github.com/OmNomSooshy/spidey-studios-lab/blob/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber/core/tests/audio_font_trace.cpp), [Gradle/CMake build files](https://github.com/OmNomSooshy/spidey-studios-lab/tree/11af7a65167109f78f5c0976c4062c1691213c5b/project-lightsaber).
- No files under Spider Byte were modified.
- ProffieOS source pin: [`87bc404e3a3321c959c43cfbdc4c5699b526de81`](https://github.com/profezzorn/ProffieOS/commit/87bc404e3a3321c959c43cfbdc4c5699b526de81).
- SoundFonts source pin: [`336d26ed7eb80e39e848c1cfd19ba86628944da5`](https://github.com/profezzorn/SoundFonts/tree/336d26ed7eb80e39e848c1cfd19ba86628944da5).

## Requirement status

| Requirement | Classification | Evidence and remaining work |
|---|---|---|
| Isolated Android project, native build, JNI and controls | **IMPLEMENTED, DEVICE-VALIDATION-PENDING** | GitHub Actions built and verified the debug APK, Android package ID, and both native libraries. Runtime testing on a physical Android device remains. |
| Phone gyroscope acquisition and lifecycle | **IMPLEMENTED, DEVICE-VALIDATION-PENDING** | `SensorManager.TYPE_GYROSCOPE` at `SENSOR_DELAY_GAME`, event timestamps, rad/s to deg/s conversion and JNI delivery are wired. No physical phone was available to validate axes, event rates, or resume behavior. |
| SmoothSwing V2 motion/blend behavior | **PARTIALLY IMPLEMENTED** | Core equations and key state semantics are compared below. Several Proffie audio/transition mechanics are adaptations, not a claim of exact equivalence. |
| Font ZIP and existing-folder import | **PARTIALLY IMPLEMENTED** | ZIP/folder picker code compiles; 256 MB limits and categorized errors remain. The pinned SmthJedi ZIP passed content/hash/CRC checks and the extracted real font loaded in native smoke tests. The Android SAF picker has not yet been exercised on a physical phone. |
| Ignition, hum, swing and retraction audio path | **IMPLEMENTED, DEVICE-VALIDATION-PENDING** | Native mixer, JNI and Android AudioTrack code compile into the APK. Host synthetic PCM tests pass. Actual phone output and audible response remain unverified. |
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
- GitHub Actions workflow: [`project-lightsaber-android.yml`](https://github.com/OmNomSooshy/spidey-studios-lab/blob/work/.github/workflows/project-lightsaber-android.yml). It uses Ubuntu 24.04, Temurin JDK 17, Platform 35, Build Tools 35.0.0, NDK 27.2.12479018, CMake 3.22.1, Gradle 8.9, and AGP 8.7.3. App/core/font manifest/build changes on `work` trigger a build; documentation-only edits do not.
- **Confirmed Android build and font asset validation:** [Actions run 4](https://github.com/OmNomSooshy/spidey-studios-lab/actions/runs/40062775232), source commit `bdb2b56a312b431bce771b447addbee898286c12`. Gradle reported `BUILD SUCCESSFUL in 52s`; `aapt` confirmed package `studios.spidey.lightsaber`, version `0.1.0`, compile SDK 35; APK ZIP integrity passed and both `arm64-v8a` and `x86_64` contain `liblightsaber.so`.
- The 2,152,778-byte debug APK SHA-256 is `7c22a1c83c766ddc306c283fb14072d73c76c19b108bfe6aca9e3b8d327d6990`. [Download the APK](https://github.com/OmNomSooshy/spidey-studios-lab/releases/download/lightsaber-bdb2b56-4-1/Project-Lightsaber-debug.apk).
- The one-font ZIP is 11,986,507 bytes; SHA-256 `7039f40b52e2213f37ed570740b4b93b68710e2cb391a8bc7126640f64cf63aa`. [Download SmthJedi-ProffieOS.zip](https://github.com/OmNomSooshy/spidey-studios-lab/releases/download/lightsaber-bdb2b56-4-1/SmthJedi-ProffieOS.zip). [Release page](https://github.com/OmNomSooshy/spidey-studios-lab/releases/tag/lightsaber-bdb2b56-4-1) includes both assets and checksums. The combined [Actions artifact is available for 30 days](https://github.com/OmNomSooshy/spidey-studios-lab/actions/runs/40062775232/artifacts/12548585124).
- The local workspace still lacks `javac`, Gradle, Android SDK/NDK, and a phone, but this no longer blocks delivery: the remote Android build completed. The first CI attempt exposed a retired `sdkmanager tools` package requested by the setup action; setting its package input to `platform-tools` fixed the workflow, and the subsequent build and verification passed.
- ZIP and folder imports use Android's Storage Access Framework and copy files to app-private storage. ZIP extraction still rejects path traversal and keeps the 256 MB expanded-size limit. Folder copying is recursive (up to 16 levels) with the same 256 MB cap; font discovery searches nested folders to depth eight. Status messages distinguish oversized archives, invalid/unsupported structure, missing required WAV files, unsupported audio encoding, folder access failures, and successful engine load. CI compiles this Android code but does not exercise Android SAF on a physical device.

## Test font sourcing

SmthJedi is identified in the pinned upstream SoundFonts repository as a ProffieOS SmoothSwing font by Thexter. Its license permits use, modification, and redistribution without attribution or other restrictions. The release ZIP contains only the 38 files in `SmthJedi/` at upstream commit `336d26ed7eb80e39e848c1cfd19ba86628944da5`: all original audio, `smoothsw.ini`, `config.ini`, ReadMe, and license. Its total expanded size is 12,339,972 bytes, well below the unchanged 256 MB import limit.

`font-assets/smthjedi-manifest.json` records every upstream path, size, and Git blob ID. The packager downloads each file from its pinned `raw.githubusercontent.com` path and verifies the Git object hash before writing the ZIP. CI validates the exact archive contents and CRC, extracts the nested `SmthJedi/` folder, and runs `font_smoke` on the actual WAVs. The engine reported `font=SmthJedi`, `ignite_effect=out`, `retract_effect=in`, and `swing_pairs=8`; its render trace produced nonzero samples. This confirms the asset and native-engine path, **not** import through Android's picker or phone playback.

## Diagnostics and expected limitations

The app displays a 250 ms diagnostic line with AudioTrack ready/off, loaded font, blade state, gyroscope sample count, filtered speed, active/idle swing state, sensitivity/sharpness, hum/effect names, swing-pair count, `humStart`, and rendered frame count. Status distinguishes oversized ZIPs, invalid/unsupported structure, missing required WAVs, unsupported audio encodings, folder access failures, and successful font load. The Android runtime message paths have not yet been observed on a phone.

Expected first-run issues include a phone without a gyro, a non-PCM16 WAV variant, a font missing one side of a pair, or device routing that does not honor low-latency mode. Speaker/headphone quality and actual latency vary by device. Only PCM16 mono/stereo WAV is supported; full ProffieOS font behavior is not claimed.

## Management handoff

1. On the phone, install [Project-Lightsaber-debug.apk](https://github.com/OmNomSooshy/spidey-studios-lab/releases/download/lightsaber-bdb2b56-4-1/Project-Lightsaber-debug.apk). If prompted, allow the browser/files app to install unknown apps. No Android Studio or computer build setup is needed.
2. Download [SmthJedi-ProffieOS.zip](https://github.com/OmNomSooshy/spidey-studios-lab/releases/download/lightsaber-bdb2b56-4-1/SmthJedi-ProffieOS.zip). In the app tap **LOAD SOUND FONT ZIP**, choose the ZIP, then select SmthJedi if shown. To use a font already on the phone, tap **CHOOSE SOUND FONT FOLDER** and select that single font's directory in Android's folder picker; the app copies it privately and searches nested folders. Do not select the full SoundFonts repository folder.
3. Confirm status reports the font imported and loaded, and diagnostics show `font=SmthJedi`, `swing_pairs=8`, and `audio=ready`. This physical Android import check remains outstanding; CI validated the ZIP structure and native load only.
4. Tap **Ignite**; make broad slow swings, short sharp swings, and direction changes while watching `gyro_samples`, `speed_dps`, and `swing`. Tap **Retract**. Repeat with the phone speaker and headphones at a safe volume. Send the phone model, Android version, status/diagnostics, and observations about gaps, clicks, clipping, hum changes, delay, and swing feel.

## Remaining classifications and acceptance

- **IMPLEMENTED AND RUNTIME-REACHABLE:** host C++ engine/tests run; a debug APK containing the Android and native implementations is downloadable. No physical-device runtime behavior is claimed yet.
- **IMPLEMENTED, BUILD-VALIDATION-PENDING:** none for the APK; Actions build and APK checks passed.
- **IMPLEMENTED, DEVICE-VALIDATION-PENDING:** sensor axis feel, actual font import, AudioTrack output/latency, and motion-driven phone audio.
- **PARTIALLY IMPLEMENTED:** font import stays partial until Android ZIP and SAF folder paths are exercised on a physical phone; full Proffie behavior also has documented adaptations.
- **BLOCKED:** no build or font-asset blocker remains. Physical-device import and listening validation are outstanding; the real font has only been extracted and loaded by host native tests.
- **UNRESOLVED SOURCE SEMANTICS:** complete transitive Proffie dependency closure and audible equivalence of adapted loop/transition/timing behavior.
- **PLATFORM ADAPTER DECISION:** Android gyro → timestamped degrees/second frame → portable C++ saber/mixer → JNI PCM blocks → Android AudioTrack. Future Quest controller motion can feed the same frame interface.
- **OUT OF SCOPE:** Quest implementation, blade rendering, passthrough lighting, full clash/lockup/stab/gesture features, and complete ProffieOS feature parity.

**Acceptance outstanding:** Android ZIP or folder-picker import on-device, physical phone audio driven by real motion, and Management approval. Mission 001 remains active.
