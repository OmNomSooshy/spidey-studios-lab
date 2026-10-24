# Project Lightsaber

An isolated Android/native experiment in the Spidey Studios lab. Spider Byte and the repository's other projects remain untouched.

## Download and install the APK

Luna builds the debug APK on GitHub Actions. Open the [Project Lightsaber workflow](https://github.com/OmNomSooshy/spidey-studios-lab/actions/workflows/project-lightsaber-android.yml) to see build status; successful builds publish a downloadable APK and the small test font on the [GitHub Releases page](https://github.com/OmNomSooshy/spidey-studios-lab/releases). [Download the verified APK](https://github.com/OmNomSooshy/spidey-studios-lab/releases/download/lightsaber-bdb2b56-4-1/Project-Lightsaber-debug.apk) and [download the SmthJedi-only ZIP](https://github.com/OmNomSooshy/spidey-studios-lab/releases/download/lightsaber-bdb2b56-4-1/SmthJedi-ProffieOS.zip). These are separate files; the ZIP contains no other SoundFonts repository contents. A temporary combined workflow artifact is also attached to the [successful build run](https://github.com/OmNomSooshy/spidey-studios-lab/actions/runs/40062775232) for 30 days.

On your Android phone, download `Project-Lightsaber-debug.apk`, open it, and approve installation from the browser/files app if Android asks. Launch Project Lightsaber, import the SmthJedi ZIP below or choose an existing font folder, then ignite and swing. The app is a debug build, not a Play Store release.

## Build configuration and validation

GitHub Actions builds the APK on pushes to `work` that affect app, core, Gradle, or workflow files. The workflow pins Ubuntu 24.04, Temurin JDK 17, Android SDK Platform 35, Build Tools 35.0.0, NDK `27.2.12479018`, CMake `3.22.1`, Gradle 8.9, and Android Gradle Plugin 8.7.3. It verifies the APK archive, package ID, and both native ABIs before publishing. The Android manifest requires a gyroscope-capable device. The app requests no runtime permissions: ZIP selection uses Android's Storage Access Framework and imported files stay in app-private storage. Audio requests 44.1 kHz stereo low-latency `AudioTrack`; physical output latency remains device-dependent and unmeasured.

## Test font

Use **SmthJedi**, identified as a ProffieOS SmoothSwing font by Thexter in the upstream [SoundFonts repository](https://github.com/profezzorn/SoundFonts). Its license says the files are free to use, modify, and redistribute without attribution or other restrictions. The inspected upstream tree is pinned at `336d26ed7eb80e39e848c1cfd19ba86628944da5`.

Download the [verified SmthJedi-only ZIP](https://github.com/OmNomSooshy/spidey-studios-lab/releases/download/lightsaber-bdb2b56-4-1/SmthJedi-ProffieOS.zip). It contains all 38 original files under `SmthJedi/`, including all audio, `smoothsw.ini`, `config.ini`, ReadMe, and license. CI verifies every file against the pinned upstream Git blob ID, checks ZIP CRC/content, extracts it, and loads the real font through the native engine. Do not download the entire SoundFonts repository for this test.

In the app, tap **LOAD SOUND FONT ZIP**, choose `SmthJedi-ProffieOS.zip`, and select SmthJedi if prompted. Or tap **CHOOSE SOUND FONT FOLDER** and select an existing single-font folder in Android's system folder picker; the app copies nested contents into private storage and discovers font directories. ZIP expanded data and folder copies remain capped at 256 MB. Folder picker operation is build-validated but still awaiting Management's physical-phone confirmation.

The compatibility target is PCM 16-bit mono or stereo WAV with paired low/high swing recordings and V2 `smoothsw.ini`. Importer errors distinguish oversized ZIPs, unsupported structures, missing WAVs, unsupported encodings, and folder access failures. Importer support is intentionally narrower than every format accepted by ProffieOS; details and limitations are in `MISSION_REPORT.md`.

## Human Ears test

1. Install and open the app while it is in the foreground.
2. Import SmthJedi and confirm the diagnostics show its font name, available gyro sample count, and initialized audio output.
3. Tap **Ignite**, hold the phone as a hilt, and try slow broad swings, short sharp swings, and direction changes.
4. Tap **Retract**. Listen for gaps, clicks, clipping, hum pumping, delayed response, and whether low/high swing timbre follows motion naturally.

Keep the screen awake; the app registers the gyroscope while resumed. Test on the phone speaker and headphones at a safe level. Management's listening approval remains required.

## Architecture

Android `SensorManager` supplies timestamped gyroscope samples to JNI. A platform-independent C++ core filters/interprets motion and renders interleaved PCM. Android `AudioTrack` handles output. ZIP import and font configuration stay separate from the core's motion and render interfaces, so a future Quest adapter can provide controller angular velocity and consume the same PCM renderer. No Quest implementation is included.
