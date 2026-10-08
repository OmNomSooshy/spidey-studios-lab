# Little Bob · first Android delivery

Version **1.0.0 (1)** · package **com.spideystudios.littlebob** · Android **8.0 / API 26 or newer**, with an up-to-date Android System WebView / Chrome.

The signed installable APK and installation page are in [release/little-bob](release/little-bob/index.html). This is Sunburn XIII packaged locally, not a native engine rewrite. The XIII baseline is `72cab43ca61a6b29fbdbc92118faaff18fdbd5a2`; the release branch is `release/little-bob-android-2026-10-09`.

## Runtime

`android/src/com/spideystudios/littlebob/MainActivity.java` hosts a hardware-accelerated WebView at a fixed virtual HTTPS origin. Its request interceptor supplies every game resource from the APK's AssetManager. It rejects remote requests and traversal outside the bundled game directory. No Pages, localhost server, network login or account is required for play.

The original HTML/JS/CSS game, HQ character artwork, cosmetic artwork and baked dimensional WebP world assets are bundled. Authoring files, raw world source PNGs, QA videos and historical experiments are not packaged. The identity changes are player-facing strings only; internal controller symbols and persistence keys remain unchanged.

`android-compat.js` is inactive in ordinary browsers. Inside this app it connects actual Android lifecycle and SensorManager/battery data to the existing browser event vocabulary. It cancels live finger gestures on backgrounding, dispatches the existing visibility/save handlers, suspends audio, and restores foreground operation. It does not control the character, camera, ropes, economy, care or autonomy. Motion readings are real acceleration/gyroscope data, not four-edge orientation presets. A native fallback avoids duplicating valid WebView motion events.

The system camera/microphone permission callback bridges the existing `getUserMedia` request. Denial remains a real denial handled by the game. No fake camera or audio demonstration is substituted. Camera and microphone permission are requested only when the existing sensory aperture is opened. Network and vibration are normal declared permissions; no notification, location, contacts, broad storage, overlay or root permission is requested.

Android Back first closes the actual open collection dialog or sensory window, then backgrounds the task. Orientation/window-size changes retain the WebView and flow through the existing resize handlers. System bars and display cutouts are excluded from the interactive viewport. Renderer reclamation reloads the genuine locally bundled game with its persisted save.

## Saved homes

Closing/reopening and installing an update signed with the same key retain the app's local WebView storage. Do not uninstall or clear app data to update.

Chrome and Android apps have different private storage. Existing Chrome homes cannot be silently read by the APK. The same-origin [transfer page](release/little-bob/transfer.html) exports the original known save keys without modifying the browser. The launcher-icon long-press shortcut **Bring browser save** opens Android's document picker and requires explicit confirmation before importing. Import preserves actual XI traces/history, but discards an old pending observation proof rather than pretending that a browser viewer lease applies to the new app.

This migration is optional. A new installation can start a new home. Android backup includes the app's WebView storage where supported; this is not a claim that cross-device restore has been verified.

## Build and signing

The environment initially lacked Android SDK/build tools/ADB/emulator/Gradle. The installed Java 21 runtime includes `jdk.compiler`, so its compiler module was used without installing Gradle or adding runtime frameworks. Official Google command-line tools, Android API 35, build-tools 35.0.0 and platform-tools were acquired for this build.

`android/tools/build.py` uses aapt2, Java's compiler module, D8, zipalign and apksigner directly. It produces a universal Java/WebView APK; no native ABI library or device-specific architecture is embedded. Rebuild with:

```sh
python android/tools/build.py --sdk /path/to/android-sdk \
  --work /private/build-work --output /private/release \
  --signing /private/signing
```

The release signing key and its password live outside Git. Retain this private key for future updates; neither key nor password is in the APK delivery repository. The build evidence contains the APK checksum and checksums for all packaged resources.

## Verification boundaries

See [the delivery report](release/little-bob/report.md) for actual Android runtime results and remaining handset checks. Source continuity is verified by `qa/android/source-audit.cjs`: original runtime-controller ASTs match XIII after the required name normalization and one explicit Android-only QA gate; artwork and CSS match byte-for-byte. This does not independently prove Android runtime behavior.

`qa/android/runtime.cjs` connects to the actual Android WebView in the signed release APK. It never launches desktop Chromium. Its handles require an explicitly supplied ADB QA intent; ordinary launcher operation has neither runtime probes nor WebView debugging enabled. Fixtures used to isolate interactions are recorded in the evidence. Software CPU/GPU emulator behavior must not be treated as target-handset performance.

Management and Lilli retain final authority over installation, sensors, visual feel and performance on the physical phone.
