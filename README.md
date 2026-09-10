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
notes, checklist ticks, reminder settings, wiki edits and entertainment progress — is stored **on the device** in its local database
(IndexedDB). Nothing needs the internet.

---

## The six functions

| # | Function | What it does | Source "Type" |
|---|----------|--------------|---------------|
| 1 | **Quick Wiki** | Full-text search, unchanged offline Atlantic 2025 v1.0 rules PDF and 11 read-only, page-referenced extracts. Prototype safety notes have explicit two-person review warnings. Crew notes remain editable, exportable and importable without changing official rules. | Document |
| 2 | **Scheduled reminders** | Recurring prompts (sun cream, hydration, meds, battery/bilge/solar checks, stretching). Toggle on/off, snooze, mark done. | Scheduled notification |
| 3 | **Event reminders** | Triggered safety prompts (CLIP ON, shift-change 10-min warning, run water-maker, grab-bag check). | Triggered notification |
| 4 | **Checklists** | Grab-bag, pre-shift safety, medical inventory, weekly maintenance, daily nutrition. Ticks saved on device with progress bars. | Checklist / Log |
| 5 | **Log (+ voice notes)** | Shift/sleep log, watch handover, medical log, and a **voice journal** for messages home. Records audio with the phone mic — works offline. | Log / Voice journaling |
| 6 | **Morale & Media** | Offline content pack: jokes/riddles, Would You Rather, trivia, playable games, conversation and challenges. Per-category no-repeat progress survives restarts; answers reveal separately. Read-aloud, **white noise**, awe prompts, star guide and media placeholders. | Media + Games |

Plus a **Home dashboard** with a big **shift timer** (10-min amber warning, swap & restart)
and one-tap emergency access, a **Live race data** page (race/VMG/weather routing via
"Dorado") shown as **mocked placeholders** ready to wire to a real tracker later, an
**App feedback** screen where the crew can capture ideas/issues offline and export them to
share when back in range, and a **Siri setup** page (Home → 🗣 **Siri setup**) that gives
hands-free voice phrases (see below).

### Hands-free with Siri (e.g. "Hey Siri, Man Overboard")

iOS PWAs can't register Siri directly, so the app uses the built-in **Shortcuts** app with
deep links — each app page has its own URL (`…/grow-ocean/#/wiki/mob`). One-time setup per
phrase (the in-app **Siri setup** page has Copy-link buttons and step-by-step instructions):

1. Open the **Shortcuts** app → **+** → **Add Action** → **Open URLs**.
2. Paste the link (e.g. `https://archiemassey.github.io/grow-ocean/#/wiki/mob`).
3. Rename the shortcut to the spoken phrase (e.g. *Man Overboard*) and **Done**.
4. Say **"Hey Siri, Man Overboard"** — it opens straight to that page (works offline once the
   app has been opened on the phone, thanks to the service-worker cache).

The Home-screen icon also exposes **long-press quick actions** (MOB, Mayday, EPIRB, Log)
via the manifest `shortcuts`.

### Editing the wiki & giving feedback (no code, works offline)

- **Edit a crew/prototype page:** open the page → **✏️ Edit** → change the text → **Save**. Official rules and their extracts are read-only; use a separate crew note for annotations. Changes
  store on that phone and survive offline/restarts.
- **Reset / delete:** the editor has **↩︎ Reset to original** (built-in pages) or **🗑 Delete**
  (pages they added).
- **Add a page:** Wiki list → **➕ New page**.
- **Sync both phones:** **⤓ Export** writes a `grow-ocean-wiki-*.json` file (shared via the iOS
  Share sheet / AirDrop); the other rower uses **⤒ Import** to apply it. This also protects
  edits against a reinstall.
- Built-in updates **preserve crew edits**. In particular, an existing MOB edit may still contain
  the withdrawn generic sequence: a separate, non-editable review warning stays visible.
  Wiki imports validate text fields and reject attempts to replace official rule pages.
- **Feedback:** Home → **📝 App feedback** → type and **Save** (offline) → **⤓ Export all**
  to send a `.txt` summary to whoever maintains the app. On land, feedback can also be raised
  on GitHub via the **"📱 App feedback"** issue form (`.github/ISSUE_TEMPLATE/`).

### Export logs

Open **Log** and tap **Export CSV** beside the History heading to download every saved
log entry as a timestamped CSV file (for example,
`grow-ocean-logs-2026-08-11T08-07-21Z.csv`). The spreadsheet includes stable columns
for every log type and compact linked voice-note metadata (availability, timestamp,
MIME type, and size); audio itself is not embedded. Checklist state, reminders,
settings, and other app data are excluded. If there are no logs, or an export cannot
be completed, the Log screen shows a visible status and leaves on-device data unchanged.

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
│  ├─ log-export.js           Excel-compatible CSV log export
│  ├─ reminders.js            Reminder engine (checks every 30s while open)
│  ├─ wikiStore.js            Editable wiki layer (overrides, new pages, export/import)
│  ├─ entertainment.js        Content validation and persisted no-repeat deck logic
│  ├─ safety.js               Two-person review notices (separate from crew edits)
│  ├─ rules.js                Read-only official reference and page links
│  ├─ data/content.js         Prototype wiki, reminders, checklists and legacy game titles
│  ├─ data/entertainment-pack.json  Versioned built-in entertainment with provenance
│  ├─ data/rules-data.js      Page-exact text and SHA-256 of the original PDF
│  └─ views/                  One file per screen: home, wiki, reminders, checklists, log, entertain, feedback
├─ references/                Original crew-provided rules PDF (unchanged)
├─ tools/                     Static build, content validation and manual PDF extraction
└─ icons/                     App icons (192, 512, maskable)
```

**To change the built-in defaults** (wiki text, reminders, checklists, games), edit
`js/data/content.js`. **The rowers themselves change wiki content in-app** (see above) — those
edits live on the device, not in this file.

### Manual content publishing — no SharePoint backend

The bundled release contains **2,569 items**: **2,005 trivia**, **125 jokes/riddles**,
**166 Would You Rather prompts**, **77 playable games**, **122 conversation prompts**
and **74 challenges**, plus the original **44-day plan** as optional theme/category suggestions.
This combines the content agent's 2,000-question / 120-joke upgrade, the original library's
other categories, and the retained app seeds with newly written two-person instructions.

SharePoint is **only the crew's review/upload library**. This Copilot session or a maintainer
manually curates approved material into the static app. There is no SharePoint authentication,
automatic sync, AI endpoint, backend or runtime Excel import. The MIP-protected entertainment
workbook is not unlocked or used as a runtime data source; independently supplied, legitimate
content exports are curated separately. The unrelated `artifacts/` workbook is not app content.

`js/data/entertainment-pack.json` uses `schemaVersion: 1`, a release `version`, and an `items`
array. Each item has a permanent `id`, `category` (`jokes`, `wyr`, `trivia`, `games`,
`conversation`, `challenges`), plain-text `prompt` and `source`. Optional fields are `answer`,
`instructions` and `topic`; trivia requires an answer and games require complete instructions.
Do not reuse IDs for different content. Pack text is rendered as text, never executable HTML.
An optional `schedule` contains 44 distinct `{ day, title, note, source }` records. The included
plan appears as a collapsed day picker: its original themes and source references are preserved,
but actual draws use category progress rather than replaying fixed IDs. It is never a daily lock
or a second deck. Sources for answer-bearing items appear only after Reveal to avoid spoilers.

Choose categories freely across the 44-day crossing; there is no forced daily pack. **Next**
draws unseen items only. On-device IndexedDB settings save seen IDs and the current item for
each category. Returning to a category restores that item with its answer hidden. At exhaustion,
the last item remains readable and **Reset this category** (with confirmation) starts a new
cycle. Added IDs become available without replaying old ones; retired IDs are dropped from
progress. Storage failures do not advance a draw. Progress is local to each device and is lost
if site data is cleared; it is not included in wiki exports. Offline read-aloud depends on an
installed device voice: test it before departure.

For updates: curate/validate the pack, keep source attribution, bump the service-worker cache
version, run `npm test` and `npm run build`, then use the existing static/native publishing
process. The build validates the pack and PDF hash before copying `js/` and `references/`
into `www/`. New content assets must also be listed in `service-worker.js`.
The original app seeds and newly written two-person instructions/prompts are retained in
`js/data/entertainment-base.json`. To compose them with a reviewed supplement using the same
schema, run `node tools/publish-entertainment.mjs <reviewed-supplement.json>`; exact duplicate
prompts are skipped, base IDs are retained, and the output is the built-in pack. This is a
maintainer operation, not an in-app import.
The tool also accepts the content agent's v1.1 `payload.json` (attributed trivia/joke rows).
An optional second input, `original-library-export.json`, supplies the other original categories
and Daily Packs as plain JSON. For this release the inputs were
`content-upgrade/payload.json` and `content-upgrade/remote-original.json`; input hashes and the
reference bibliography are retained in the pack's provenance. Do not obtain these by unlocking
protected files. Reference links are subject/topic sources, not a claim of independent
question-by-question fact verification; tone, factual quality and suitability still need crew review.

### Official rules reference

Wiki → **Official rules · Atlantic 2025 v1.0** opens the authoritative, unchanged
`references/race-rules-wtr-atlantic-2025-v1.0.pdf`. Downloaded through the crew's authorised
SharePoint browser session on 9 September 2026, it is 257,956 bytes / 11 PDF pages.
SHA-256: `d1cfd9056383d3e2bc6955234e7c0f46b1ffe67412997c2fcca1e815b416646d`.
The source URL and copyright attribution are in `js/data/rules-data.js`.

The crew **must confirm this edition applies to their crossing**; it is not described as the
latest verified race rules. Full-text wiki search includes all 11 extracted pages (for example,
“jackstays”, “medical kit” or “20 LITRES”). Links use exact 1-based **PDF page numbers**, not
invented section pagination. Extraction can lose layout, including tables: verify requirements
against the original PDF. Some phone PDF viewers ignore `#page=`; select that page manually.
Do not treat these rules as a single-rescuer emergency procedure.
Referenced appendices (including mandatory equipment and medical-kit lists) are not bundled
as separate documents; obtain the applicable versions from the organiser. The prototype
grab-bag and medical checklists are not substitutes for those requirements.

The PDF and searchable text are precached for offline use and copied into the native build.
Open the app online to complete its initial download, then test the PDF, search and entertainment
after restarting in aeroplane mode. A missing offline PDF/JSON returns an explicit error rather
than the app shell disguised as the document. Preserve Atlantic Campaigns' copyright and verify
distribution rights before publishing the crew reference beyond the intended audience.

For an authorised PDF replacement, review the edition/source and page descriptions in
`tools/extract-rules.py`, then run `python tools/extract-rules.py` (maintainer-only, requires
existing `pypdf`). It refuses encrypted PDFs and never modifies the source. This source emits
non-fatal cross-reference warnings in pypdf; all 11 pages extract successfully and the original
bytes are retained. Re-review page text and test the build after extraction.

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
These are **two-person crew** notes: one casualty leaves **one rescuer**, not a third rower or
separate simultaneous lookout/helmsman/communicator. The generic MOB sequence has been withdrawn,
not replaced with an invented emergency procedure. That page now records approval/rehearsal
requirements for the actual boat and equipment. Other legacy technical notes remain explicitly
unapproved, with topic-specific pair review flags. Official race rules remain authoritative;
crew notes, checklist ticks or an app update do not constitute safety approval.
