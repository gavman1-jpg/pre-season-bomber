# Full Season

An 8-week pre-season training app for young athletes in 12 sports: Aussie Rules, soccer, basketball, netball, cricket, rugby, American football, baseball/softball, volleyball, ice hockey, tennis and field hockey.

Each athlete picks their sport and enters their age, training experience and whether they're in a growth spurt. Every session is then built for them:
- **Age bands** follow Long-Term Athlete Development stages: 6–8 (FUNdamentals), 9–11 (Learn to Train), 12–14 (Train to Train), 15–18 (Train to Compete). Exercises have minimum ages and swap to a safer version for younger athletes.
- **Load control**: jump contacts are capped per session by age, growth-spurt mode cuts jumps and sprints, week 5 is a lighter reload week, and a readiness check before each session offers a lighter session or a rest day.
- **Injury prevention** from FIFA 11+, Netball Australia's KNEE program and World Rugby Activate: landing and balance work, Nordic hamstring lowers and Copenhagen planks (12+), neck strength for collision sports, arm care for throwing and serving sports.
- **Each sport has its own theme**: colours, a field-shaped timer, ball, scoring words (Goal/Behind, Try, Touchdown, Six, Ace...), level names and sport-specific speed drills, conditioning and skills.

The weekly shape: club training (Mon), optional Skills + Body Armour bonus (Wed), Speed + Strength (Sat) and Engine + Skills (Sun), with Tue/Thu/Fri as rest days.

### In-season
When the season starts, switch to **In-season** (Locker, or the card on the home screen) and enter the team's training days, game day, session lengths and season length. Each week the app plans around them:
- **Strength Top-Up** once a week (twice for ages 15–18) on a free day at least 2 days before the game. One session a week is enough to hold pre-season strength and speed (Rønnestad et al., 2011).
- **Recovery** the day after the game, and a short **Game Primer** the day before (both optional).
- Always at least 2 easy days, and total team + app time kept under the age-in-hours guideline. If the team schedule alone goes over, the app says so.
- Team training and games are ticked off for points. A week is won by doing the Strength Top-Up.

## Get the app on an Android phone
1. On the phone, open this repository's **Releases** page (right-hand side on GitHub, or add `/releases/latest` to the repo address).
2. Tap **Full-Season.apk** to download it.
3. Open the download and tap **Install**. The first time, Android asks to allow installs from Chrome (or Files): turn that on, go back, and tap Install.
4. Open **Full Season**, pick your sport, enter your name, number and age, and allow notifications so the timer can alert you with the phone locked.

## Updating
Any change pushed to `main` builds a new APK automatically (Actions tab, about 5 minutes) and adds it to Releases. Install it over the old one: progress is kept.

## Where things live
- `www/index.html` - styles and page shell
- `www/app.js` - screens, session builder, timers, scoring
- `www/data.js` - sports, themes, age bands and the exercise library
- `android/` - the Android wrapper (Capacitor)
- `.github/workflows/build-android.yml` - the cloud build

## iPhone
The same project can be built for iPhone with `npx cap add ios` on a Mac with Xcode. Installing on an iPhone needs an Apple Developer membership (or a free Apple ID, where the app must be reinstalled every 7 days).

## Safety note
The app gives general training guidance for healthy young athletes, based on the NSCA youth resistance training position statement and the 2014 International Consensus on youth resistance training. It isn't medical advice. Kids should train with an adult around and see a doctor or physio about any injury or health condition.
