# Little Bob 1.0.1 · delivery report

**REAL SIGNED APK PRODUCED — HANDSET VALIDATION PENDING.**

- App: **Little Bob**
- Package: `com.spideystudios.littlebob`
- Version: **1.0.1**, code **2** (installs over the interim 1.0.0 with the same signing key)
- Minimum: **Android 8.0 / API 26**, recent Android System WebView / Chrome
- Release branch: `release/little-bob-android-2026-10-09`
- Source baseline: Sunburn XIII `72cab43ca61a6b29fbdbc92118faaff18fdbd5a2`
- Artifact: [little-bob-1.0.1.apk](little-bob-1.0.1.apk)
- Exact size and SHA256: [build-evidence.json](build-evidence.json)

## Verified build evidence

The APK was compiled, aligned and release-signed with the official Android tools. ZIP integrity, APK signature and package metadata checks passed. All 154 packaged game resources match their release-source bytes. The package declares the correct installed label, launcher, version and supported minimum SDK.

All original runtime JavaScript controllers have matching ASTs against XIII after only player-facing name normalization and the explicit native QA gate. Every existing source artwork file and stylesheet is byte-identical. Physics, mushroom-return behavior, care, kitchen, expedition, inventory, economy, XI evidence and backyard control code were not rewritten. This continuity audit is source evidence, not proof of phone behavior.

## Android runtime evidence

**Android installation, cold launch and gameplay remain unverified.** There is no physical handset attached and this cloud machine has no KVM acceleration. The official Android 15 emulator booted under software CPU/GPU emulation, but its framework watchdog terminated system startup before a stable package/activity service was available. One bounded retry also lost those services. Early installation attempts failed in the emulator's framework bootstrap (including an uninitialized PackageManagerInternal), not through an observed game exception. No game runtime was reached and no handset FPS claim is made.

The unchanged game plus Android lifecycle adapter passed a separate desktop Chromium simulation: loading, pause/visibility stopping the physical update, resume, Back closing the real shop, and garden persistence across reload. **That is browser simulation, not Android runtime validation.**

Evidence: [Android environment/attempts](android-environment.json), [adapter simulation](adapter-simulation.json), [source continuity](source-audit.json), [APK/asset checksums](build-evidence.json).

## Compatibility-only changes

Local APK asset interception on a fixed secure origin; the required Little Bob/Bob player-facing rename; launcher icon and splash using the existing HQ idle artwork; optional media permission bridging; real native motion/battery fallback where WebView lacks browser APIs (gyroscope x/y/z mapped to Chrome's alpha/beta/gamma event fields); foreground/background/audio/gesture handling; existing-save retention; Android Back handling; window/cutout insets and orientation resize support. No new game content or redesigned interaction grammar.

Chrome's saved home is not automatically the APK's saved home: Android isolates their storage. An optional export/import path transfers original save keys through Android's file picker without resetting or modifying the browser save.

## Permissions

Camera and microphone are optional runtime permissions requested only by the existing sensory window. Internet and vibration are normal permissions. The wrapper serves local assets and blocks remote game content. No overlay, location, contacts, notifications, broad storage or developer-mode requirement.

## Management's installation and acceptance

1. Download the APK and send it to Lilli's phone if downloaded elsewhere.
2. Open it, allow installation from the browser or Files source when Android asks, install, and open **Little Bob**. Disable that source's installation permission afterward if desired. On Samsung, if Auto Blocker blocks installation, temporarily turn it off in Settings → Security and privacy → Auto Blocker, install, then re-enable it.
3. Check cold launch and ordinary drag/flick/navigation; bath/shower, food, possessions, wardrobe/shop, and the loft/Crystal route.
4. Enter the backyard; pan independently, call him across real distance, water, fetch, observe repeated mushroom bouncing and interrupt it, and physically peel his web.
5. Background/reopen, then fully stop/relaunch and check wallet/ownership, garden and history. Check offline launch in airplane mode.
6. Try Earth gravity while rotating the actual phone, then camera/microphone with both permission grant and denial. These require physical-device validation.

Keep the app installed to retain its local save. Installing future builds over it requires the same release signing key. Uninstalling or clearing app data removes local progress.

## Remaining risks

The minimum Android version is declared/build-checked, not tested across an Android-device matrix. WebView version, GPU performance, real microphone/camera behavior, real sensor axes and physical-phone lifecycle behavior remain handset checks. Camera and microphone intentionally stop on backgrounding and reopen through the existing aperture. No operating-system overlays or background life simulation were introduced.
