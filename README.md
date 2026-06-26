# gROW Ocean 🌊🚣‍♀️

An **offline-first companion app** for two women rowing across the Atlantic. Built as a
**Progressive Web App (PWA)** — it installs from a browser onto any phone or tablet and
works with **no internet connection** once loaded (essential mid-ocean, where you'll have
satellite messaging at best).

Seeded with the real requirements from *"Checks, drills, functions — Vicky requirements v2.xlsx"*.

---

## What is this / how does it work? (plain English)

A PWA is a website that behaves like an installed app. You open it once (while you still
have wifi/signal on land) and tap **"Add to Home Screen"**. A small background helper called
a **service worker** downloads the entire app onto the device. After that it opens full-screen
from its own icon and runs **completely offline**. All data the rowers create — logs, voice
notes, checklist ticks, reminder settings — is stored **on the device** in its local database
(IndexedDB). Nothing needs the internet.

---

## The six functions

| # | Function | What it does | Source "Type" |
|---|----------|--------------|---------------|
| 1 | **Quick Wiki** | Searchable safety & how-to reference (MOB, EPIRB, VHF Mayday, anchor, life raft, epoxy repair, first aid, stars…). "Read aloud" for hands-free use. **Editable in-app** — the rowers can change pages, reset to original, add new pages, and export/import to sync both phones. | Document |
| 2 | **Scheduled reminders** | Recurring prompts (sun cream, hydration, meds, battery/bilge/solar checks, stretching). Toggle on/off, snooze, mark done. | Scheduled notification |
| 3 | **Event reminders** | Triggered safety prompts (CLIP ON, shift-change 10-min warning, run water-maker, grab-bag check). | Triggered notification |
| 4 | **Checklists** | Grab-bag, pre-shift safety, medical inventory, weekly maintenance, daily nutrition. Ticks saved on device with progress bars. | Checklist / Log |
| 5 | **Log (+ voice notes)** | Shift/sleep log, watch handover, medical log, and a **voice journal** for messages home. Records audio with the phone mic — works offline. | Log / Voice journaling |
| 6 | **Morale & Media** | Games & prompts (Would-You-Rather, jokes, trivia, the full game list), a working **white-noise generator**, awe prompts, star guide, and on-demand media placeholders. | Media + Games |

Plus a **Home dashboard** with a big **shift timer** (10-min amber warning, swap & restart)
and one-tap emergency access, a **Live race data** page (race/VMG/weather routing via
"Dorado") shown as **mocked placeholders** ready to wire to a real tracker later, and an
**App feedback** screen where the crew can capture ideas/issues offline and export them to
share when back in range.

### Editing the wiki & giving feedback (no code, works offline)

- **Edit a page:** open any wiki page → **✏️ Edit** → change the text → **Save**. Changes
  store on that phone and survive offline/restarts.
- **Reset / delete:** the editor has **↩︎ Reset to original** (built-in pages) or **🗑 Delete**
  (pages they added).
- **Add a page:** Wiki list → **➕ New page**.
- **Sync both phones:** **⤓ Export** writes a `grow-ocean-wiki-*.json` file (shared via the iOS
  Share sheet / AirDrop); the other rower uses **⤒ Import** to apply it. This also protects
  edits against a reinstall.
- **Feedback:** Home → **📝 App feedback** → type and **Save** (offline) → **⤓ Export all**
  to send a `.txt` summary to whoever maintains the app. On land, feedback can also be raised
  on GitHub via the **"📱 App feedback"** issue form (`.github/ISSUE_TEMPLATE/`).

---

## Run it locally (to try it now)

The app is just static files — serve the folder with any local web server:

```powershell
cd "C:\Users\archiemassey\OneDrive - Microsoft\GHCP\grow-ocean-app"
python -m http.server 8080
```

Then open **http://localhost:8080** in a browser. (A server is needed because the app uses
JavaScript modules and a service worker, which don't work from a `file://` path.)

### Install on a phone
1. Host the folder on any HTTPS URL (e.g. free **GitHub Pages**) — PWAs require HTTPS to install.
2. Open the link on the phone, then **Share → Add to Home Screen**.
3. Open the new icon, put the phone in **aeroplane mode**, and confirm everything still works.

---

## Project structure

```
grow-ocean-app/
├─ index.html                 App shell (top bar, tabs, view area)
├─ manifest.webmanifest       Makes it installable (name, icons, colours)
├─ service-worker.js          Offline engine — pre-caches the whole app
├─ css/styles.css             gROW Ocean theme (ocean blues, big tap targets, dark mode)
├─ js/
│  ├─ app.js                  Router, navigation, shared helpers (toast, read-aloud)
│  ├─ db.js                   IndexedDB wrapper (on-device storage)
│  ├─ reminders.js            Reminder engine (checks every 30s while open)
│  ├─ wikiStore.js            Editable wiki layer (overrides, new pages, export/import)
│  ├─ data/content.js         ALL seeded content — edit here to change the app
│  └─ views/                  One file per screen: home, wiki, reminders, checklists, log, entertain, feedback
└─ icons/                     App icons (192, 512, maskable)
```

**To change the built-in defaults** (wiki text, reminders, checklists, games), edit
`js/data/content.js`. **The rowers themselves change wiki content in-app** (see above) — those
edits live on the device, not in this file.

---

## Known limitations (prototype) & upgrade path

- **Background alarms:** as a **web app/PWA**, reminders only fire reliably **while the app is
  open** (keep it open on the cabin tablet). For alarms that fire when the phone is **asleep or
  closed**, build the included **native app** — the project is wrapped with **Capacitor** and a
  native-aware notification layer (`js/notify.js`) is already implemented. See **[CAPACITOR.md](CAPACITOR.md)**
  for the Android/iOS build steps (Android works from Windows; iOS needs a Mac).
- **Live data is mocked** — race/VMG/weather values are placeholders pending a tracker/router feed.
- **Media (music/podcasts/audiobooks)** are placeholders; load real audio files onto the device
  before departure so they play offline. (White noise is generated live and already works.)
- **Voice notes** use the phone mic via `MediaRecorder` (offline). Voice *commands* (speech-to-text)
  can be added with the Web Speech API but recognition is patchy offline — recommend native for that.

## ⚠️ Safety disclaimer
The wiki drills and medical content are a **prototype aide-memoire** and **must be reviewed and
approved by the crew's safety and medical advisers** before being relied upon at sea.
