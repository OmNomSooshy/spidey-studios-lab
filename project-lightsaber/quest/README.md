# Project Lightsaber — Quest 3 prototype

This is the Mission 002 standalone mixed-reality application. It reuses `../core/src/saber_engine.cpp` directly through a Godot GDExtension audio stream; it does not implement a second SmoothSwing model.

## Stack and pinned build inputs

- Godot `4.6.3-stable` and its matching Android export templates.
- Godot OpenXR Vendors `5.1.0-stable`, SHA-256 `6a838dbdf4115549e4511ebee0da9a5dcc8f9f6258d4cc2f2ee57a907a3e2911`. This supplies the Quest/Meta OpenXR extension wrappers, including `XR_FB_passthrough`, and its Android native/AAR runtime.
- `godot-cpp` API 4.6 bindings at commit `8070599885b6df675fcad033dd032ce44be2b850`, built at Godot's standard single-precision setting.
- Android SDK platform/build tools `36` / `36.0.0`, NDK `29.0.14206865`, JDK `17`. Godot's release export templates supply the pinned Gradle project and wrapper; CMake is not used for this Godot/GDExtension target.
- The Android arm64 GDExtension is built by SCons using the same NDK. Only `arm64-v8a` is packaged for Quest 3.

## Runtime design

`XRController3D` follows the `right_hand` / `grip` pose and owns the temporary blade mesh. `XRPositionalTracker.pose_changed` delivers fresh controller samples; stale cached values are not polled and resubmitted. Godot's OpenXR implementation forwards `XrSpaceVelocity.angularVelocity` components into `XRPose.angular_velocity`; OpenXR defines angular velocity in radians/second. The adapter converts the pose-space vector through the inverse grip basis, maps the controller's longitudinal local `-Z` axis to engine X and transverse X/Y axes to engine Y/Z, then converts radians/second to the engine's degrees/second. The core uses the Y/Z swing-plane magnitude. Physical axis feel and the precise Quest grip convention remain headset checks.

The GDExtension `SaberAudioStream` invokes the existing engine's `render()` from Godot's audio mix callback in preallocated 512-frame chunks and converts stereo signed-16 PCM to Godot float frames. This is decoupled from render FPS and uses Godot's device mix rate (normally 48 kHz on Quest); actual device buffer depth and end-to-end latency are not yet measured. There is no controller-position-velocity substitution or pose-difference angular-velocity fallback.

OpenXR alpha blend is selected and Meta passthrough is enabled in the OpenXR project settings. With the vendor extension, passthrough begins automatically in alpha-blend mode. The action map targets `/interaction_profiles/meta/touch_controller_plus`; Godot's Meta profile metadata supplies the OpenXR 1.0 compatibility rename. Right A deliberately ignites; right B retracts. The blade extends approximately one metre along local `-Z`, with its root offset 5 cm from the controller grip.

The official pinned SmthJedi font is packaged by the existing verified font-packaging script as one ZIP under `assets/`; the app extracts its original font files, configuration and license to app-private storage before passing the directory to `SaberEngine::loadFont`. Font archive SHA is generated per CI run and recorded with the APK release.

## Build and delivery

GitHub Actions workflow `.github/workflows/project-lightsaber-quest.yml` builds the arm64 GDExtension, runs all three existing portable engine/font host traces, packages the pinned font, exports a Godot debug APK, checks APK integrity and both native libraries, uploads a 30-day workflow artifact, and publishes a downloadable release asset. The first successful run URL and APK SHA are added to `MISSION_REPORT.md`.

The APK requires a Quest 3 running Meta Horizon OS with OpenXR enabled. Install the debug APK through Meta Quest Developer Hub or SideQuest; once installed, it runs standalone and does not require a connected PC. On launch, allow the normal headset boundary/room setup. Press right A to ignite, swing the right controller, then press right B to retract. Passthrough should show the room; a floating status label reports tracking and engine diagnostics.

## Known validation boundary

Project/source inspection and host traces do not prove that Quest starts passthrough, maps the real controller axes as intended, loads the native library, or produces glitch-free audio. Those require a successfully exported APK and a physical Quest 3 test. In particular, OpenXR exposes no source sensor timestamp on `XRPose`; the adapter timestamps each fresh `pose_changed` callback with the monotonic application clock. `XRPose` also does not expose the angular-velocity-valid flag, so a runtime-invalid angular velocity appears as a zero vector; headset diagnostics and movement testing must check this.
