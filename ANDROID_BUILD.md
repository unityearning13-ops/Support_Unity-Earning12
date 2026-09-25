# Unity Earning Live - Android APK Generation Guide

The project has been converted into an Android native application using Capacitor with full Firebase integration.

## Project Structure
- `android/` - Full native Android Studio project with Gradle, AndroidManifest.xml, icons, splash screen, and permissions.
- `capacitor.config.ts` - Native runtime configuration (appId: `com.unityearning.app`, theme colors, status bar, splash screen).
- `package.json` - Includes `"build:android": "npm run build && npx cap sync android"`.

## How to Build the APK
1. **Open in Android Studio**:
   ```bash
   npx cap open android
   # or launch Android Studio and open the ./android folder
   ```
2. **Build Debug APK in Terminal**:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   The APK will be generated at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

3. **Build Release Signed APK / AAB**:
   - In Android Studio: `Build` > `Generate Signed Bundle / APK...`
   - Or run `./gradlew assembleRelease`

## Key Architecture & Features
1. **Firebase Backend**:
   - Connected to the existing Firebase Firestore and Auth (`atlantean-thought-n07pf`).
   - `google-services.json` is configured in `android/app/google-services.json`.
   - All real-time message sync, collections, user data, counselor channels, and level chats remain identical and synchronized.

2. **Counselor Referral Link (Web-Only Exception)**:
   - Counselor referral links remain **standard web URLs** (`https://yourwebsite.com/ref/counselor-id`).
   - Clicking a referral link from WhatsApp, Messenger, Facebook, or SMS opens directly in the user's mobile browser with **no APK installation required**.
   - Admin can configure the live website domain from Admin Dashboard > "কমিউনিটি ও সিকিউরিটি সেটিংস" > "অফিশিয়াল ওয়েবসাইট ডোমেইন".
   - If clicked inside the APK, external URLs automatically launch in the device's default Chrome/system browser via `@capacitor/browser`.

3. **Native Android Experience**:
   - Native hardware/gesture back button handling (closes active call, drawers, chat windows, modals, or minimizes app on home screen).
   - Android Dark status bar (`#070b0e`) and native splash screen integration.
   - Soft keyboard adjustment (`windowSoftInputMode="adjustResize"`).
   - Mobile touch optimizations, safe area insets, and zero pinch-zoom issues.
