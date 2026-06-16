# gROW Ocean — Native build (Capacitor) for reliable background alarms

The web app (the project root) is wrapped with [Capacitor](https://capacitorjs.com/) so it can
be built as a **native iOS / Android app**. The native build is what gives **reliable
background alarms** — reminders that fire when the phone is **asleep, locked, or the app is
closed** — because they're scheduled with the phone's own operating system instead of the browser.

> **The web/PWA keeps working unchanged.** Capacitor only adds an optional native shell.
> Nothing about the existing PWA or GitHub Pages hosting changes.

---

## How it works

- **`js/notify.js`** detects whether the app is running natively (`Capacitor.isNativePlatform()`).
  - **Native:** schedules OS-level local notifications via `@capacitor/local-notifications`
    (with `allowWhileIdle: true` so they fire in Android **Doze** mode).
  - **Web:** falls back to web notifications + the in-app 30-second checker (only fires while open).
- **`js/reminders.js`** schedules a **rolling window** of upcoming occurrences per enabled
  reminder (`NATIVE_WINDOW_H = 24h`, `MAX_PER = 4`) and **re-tops-up on every app `resume`**.
  This handles iOS's ~64 pending-notification limit: a handful of reminders × 4 stays well under it,
  and the queue refills whenever the app is reopened (e.g. at each shift change).
- **`tools/build-www.mjs`** copies the static web app into **`www/`** (Capacitor's `webDir`).
  The canonical source stays at the project root.

---

## Prerequisites

| Target | You need |
|--------|----------|
| **Android** | Windows/Mac/Linux + **Android Studio** (installs the Android SDK + JDK). No paid account needed to sideload to your own phone. |
| **iOS** | **A Mac with Xcode** (cannot be built on Windows) + an **Apple Developer account** ($99/yr) to install on a real iPhone. |

Node.js + this project's dependencies (already installed via `npm install`).

---

## Android build (reliable background alarms)

```bash
# from the project root
npm install                 # once
npm run android:add         # builds www/ and creates the android/ project
npm run cap:sync            # copy web assets + plugins into the native project
npm run android:open        # opens Android Studio → press ▶ to run on your phone
```

### Required permissions — edit `android/app/src/main/AndroidManifest.xml`
Add inside `<manifest>` (these enable exact alarms that survive Doze + notifications on Android 13+):

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
```

### On the phone (one-time, critical for reliability)
- Grant **Notifications** permission when prompted.
- **Allow exact alarms** (Settings → Apps → gROW Ocean → Alarms & reminders).
- **Disable battery optimisation** for gROW Ocean (Settings → Apps → gROW Ocean → Battery →
  Unrestricted). Samsung/Xiaomi/Huawei are aggressive at killing background apps — this step is
  essential or reminders may be delayed.

---

## iOS build (requires a Mac)

```bash
npm install
npm run ios:add             # builds www/ and creates the ios/ project  (Mac only)
npm run cap:sync
npm run ios:open            # opens Xcode → select your iPhone → press ▶
```

- In Xcode: set your **Team** (Apple Developer account) under *Signing & Capabilities*, then
  run to a plugged-in iPhone (you may need to trust the developer profile on the phone:
  Settings → General → VPN & Device Management).
- Local notifications fire reliably when **locked/asleep** and **work offline**.
- **Critical Alerts** (override silent switch / Focus / Do Not Disturb — useful for *safety*
  reminders) require a special **Apple entitlement** you must apply for:
  <https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement/>

### No Mac?
- Rent a **cloud Mac** (e.g. MacinCloud, MacStadium) and run the steps above, **or**
- Use a CI build service such as **Ionic Appflow** to build the iOS app in the cloud.

---

## Updating the app after code changes

```bash
npm run cap:sync            # rebuilds www/ and pushes changes into the native projects
```
Then re-run from Android Studio / Xcode.

---

## Tuning the schedule
In `js/reminders.js`:
- `NATIVE_WINDOW_H` — how many hours ahead to pre-schedule (default 24).
- `MAX_PER` — max pending notifications per reminder (default 4). Keep
  `MAX_PER × (enabled reminders) < ~64` for iOS.

## Notes
- `npm audit` reports vulnerabilities in Capacitor CLI build-time dependencies (not shipped in
  the app). Safe to ignore for the prototype; avoid `npm audit fix --force` (it can break the CLI).
- The `www/`, `android/`, `ios/`, and `node_modules/` folders are build artefacts — see `.gitignore`.
