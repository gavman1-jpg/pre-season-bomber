# Pre-Season Bomber

An 8-week footy pre-season training app: hill sprints, a bodyweight circuit, swim/ride and skipping, with timers, swappable drills and footy-style scoring.

## Get the app on an Android phone
1. On the phone, open this repository's **Releases** page (right-hand side on GitHub, or add `/releases/latest` to the repo address).
2. Tap **Pre-Season-Bomber.apk** to download it.
3. Open the download and tap **Install**. The first time, Android asks to allow installs from Chrome (or Files): turn that on, go back, and tap Install.
4. Open **Pre-Season Bomber**, enter your name and jumper number, and allow notifications so the timer can alert you with the phone locked.

## Updating
Any change pushed to `main` builds a new APK automatically (Actions tab, about 5 minutes) and adds it to Releases. Install it over the old one: progress is kept.

## Where things live
- `www/index.html` - the whole app (screens, timers, program, scoring)
- `android/` - the Android wrapper (Capacitor)
- `.github/workflows/build-android.yml` - the cloud build

## iPhone
The same project can be built for iPhone with `npx cap add ios` on a Mac with Xcode. Installing on an iPhone needs an Apple Developer membership (or a free Apple ID, where the app must be reinstalled every 7 days).
