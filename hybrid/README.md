# Hybrid wrapper

Optional Capacitor shell around the existing `webapp`. This is not the Expo `mobile` client.

The Android app opens [24nutrition.site/login](https://24nutrition.site/login) fullscreen. Buttons, input fields, and meal/ration cards play a short haptic on press; assistant replies tick once when typing starts. Adding a card to favorites asks for notification permission and shows a local push: «Добавлено в избранное». In the meal composer, «Камера» opens the system camera and «Изображение» opens the gallery through the native Camera plugin.

Haptics, camera, and microphone need the matching Android permissions and plugins in the APK, so a new install is required after those change. Fully close and reopen the app after installing. If two 24nutrition icons appear, uninstall every copy (including a Chrome home-screen shortcut of the site) and install this APK once.

This is an on-device local notification, not Firebase remote push. The APK is a debug sideload build and is not signed for Google Play.

This is an on-device local notification, not Firebase remote push. The APK is a debug sideload build and is not signed for Google Play.

## Sideload APK

The debug APK is built to `android/app/build/outputs/apk/debug/app-debug.apk` and copied to `.scratch/hybrid/24nutrition-hybrid-debug.apk`.

On the phone: allow installs from this source, then open the APK. Sign in as usual. Favorite a meal or ration card. Allow notifications when Android asks. If a banner does not pop over the app, pull down the notification shade.

## Rebuild

```bash
bun install
npx cap add android
npx cap sync android
```

Set `ANDROID_HOME` and `JAVA_HOME` to JDK 21, then:

```bash
bun run apk
```
