# Project Lightsaber

An isolated Android/native experiment in the Spidey Studios lab. Spider Byte and the repository's other projects remain untouched.

## Windows Android Studio build

Use Android Studio Ladybug (2024.2.1) or a newer stable release. The project pins Android Gradle Plugin 8.7.3 and Gradle 8.9; use JDK 17 or newer (Android Studio's bundled JBR is suitable). In **SDK Manager**, install Android SDK Platform 35, NDK `27.2.12479018`, and CMake `3.22.1`.

1. Download or clone the `work` branch of `OmNomSooshy/spidey-studios-lab`.
2. In Android Studio choose **Open**, then select the `project-lightsaber` directory.
3. Accept the Gradle wrapper prompt and allow Android Studio to sync. If it asks for a JDK, select **Embedded JDK**.
4. Connect an Android phone with a gyroscope, enable Developer options and USB debugging, and accept the device's debugging prompt.
5. Select the `app` run configuration and the phone, then click **Run**. Alternatively, use the included Windows wrapper from this directory: `gradlew.bat :app:assembleDebug`.
6. The debug APK is written to `app\\build\\outputs\\apk\\debug\\app-debug.apk`.

The Android manifest requires a gyroscope-capable device. The application requests no runtime permissions: font ZIP selection uses Android's Storage Access Framework and imported files are copied into app-private storage. Audio requests a low-latency 44.1 kHz stereo `AudioTrack`; device output latency is not yet measured. This repository's cloud workspace had no Android SDK, NDK, JDK compiler, Gradle installation, or attached phone, so Android compilation and device behavior remain unverified here.

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
