# Project Lightsaber

An isolated Android/native experiment in the Spidey Studios lab. Spider Byte and the repository's other projects remain untouched.

## Download and install the APK

Luna builds the debug APK on GitHub Actions. Open the [Project Lightsaber workflow](https://github.com/OmNomSooshy/spidey-studios-lab/actions/workflows/project-lightsaber-android.yml) to see build status; successful builds publish a downloadable APK on the [GitHub Releases page](https://github.com/OmNomSooshy/spidey-studios-lab/releases). [Download the verified APK from build 3](https://github.com/OmNomSooshy/spidey-studios-lab/releases/download/lightsaber-abdc849-3-1/Project-Lightsaber-debug.apk), or use the latest **Project Lightsaber debug APK** release for future builds. The release notes include the source commit and SHA-256 checksum. A temporary workflow artifact is also attached to each successful run.

On your Android phone, download `Project-Lightsaber-debug.apk`, open it, and approve installation from the browser/files app if Android asks. Launch Project Lightsaber, import the official SmthJedi ZIP as described below, then ignite and swing. The app is a debug build, not a Play Store release.

## Build configuration and validation

GitHub Actions builds the APK on pushes to `work` that affect app, core, Gradle, or workflow files. The workflow pins Ubuntu 24.04, Temurin JDK 17, Android SDK Platform 35, Build Tools 35.0.0, NDK `27.2.12479018`, CMake `3.22.1`, Gradle 8.9, and Android Gradle Plugin 8.7.3. It verifies the APK archive, package ID, and both native ABIs before publishing. The Android manifest requires a gyroscope-capable device. The app requests no runtime permissions: ZIP selection uses Android's Storage Access Framework and imported files stay in app-private storage. Audio requests 44.1 kHz stereo low-latency `AudioTrack`; physical output latency remains device-dependent and unmeasured.

## Test font

Use **SmthJedi**, identified as a ProffieOS SmoothSwing font by Thexter in the upstream [SoundFonts repository](https://github.com/profezzorn/SoundFonts). Its license says the files are free to use, modify, and redistribute without attribution or other restrictions. The inspected upstream tree is pinned at `336d26ed7eb80e39e848c1cfd19ba86628944da5`.

Download the official archive: [SoundFonts ZIP at the pinned revision](https://github.com/profezzorn/SoundFonts/archive/336d26ed7eb80e39e848c1cfd19ba86628944da5.zip). On the phone, open **Load Sound Font ZIP**, choose that downloaded ZIP, and select **SmthJedi** when the font list appears. The importer traverses nested repository folders (up to four levels) and retains the font in app-private storage. The app reports import or compatibility errors. The actual upstream WAVs have not yet been imported in this environment.

The compatibility target is PCM 16-bit mono or stereo WAV with paired low/high swing recordings and V2 `smoothsw.ini`. ZIP expanded contents are limited to 256 MB. Importer support is intentionally narrower than every format accepted by ProffieOS; details and limitations are in `MISSION_REPORT.md`.

## Human Ears test

1. Install and open the app while it is in the foreground.
2. Import SmthJedi and confirm the diagnostics show its font name, available gyro sample count, and initialized audio output.
3. Tap **Ignite**, hold the phone as a hilt, and try slow broad swings, short sharp swings, and direction changes.
4. Tap **Retract**. Listen for gaps, clicks, clipping, hum pumping, delayed response, and whether low/high swing timbre follows motion naturally.

Keep the screen awake; the app registers the gyroscope while resumed. Test on the phone speaker and headphones at a safe level. Management's listening approval remains required.

## Architecture

Android `SensorManager` supplies timestamped gyroscope samples to JNI. A platform-independent C++ core filters/interprets motion and renders interleaved PCM. Android `AudioTrack` handles output. ZIP import and font configuration stay separate from the core's motion and render interfaces, so a future Quest adapter can provide controller angular velocity and consume the same PCM renderer. No Quest implementation is included.
