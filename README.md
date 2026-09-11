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

### Updating an installed app — do not clear site data

Home starts with the compact **This shift** thought, then the shift timer and actions.
Expand **About & updates** at the bottom for
**App release grow-ocean-v9** and **Check for updates**. It stays collapsed by default; there
is no timed layout jump. An actual update-ready notice remains visible above the screen.
Morale → Entertainment player → **Playback settings, progress & source** also shows the
content pack release. Connect on land, check for updates and wait for the
**Offline app ready** banner. Stop **and save** recordings and save any forms, then tap
**I've saved my work — reload app** and confirm. Downloading/activating updates never
automatically reloads a screen. Test a subsequent launch in aeroplane mode before departure.

**Already seeing the old standalone “Joke” button?** That screen predates the category deck
and cannot show the new update banner. While online, save your work, reopen/reload the app
and leave it open for the complete offline download (including the rules PDF). Then reload
once more: the newly activated worker serves the new shell and all its fresh modules.
Look for **grow-ocean-v9** in Home's About disclosure and **Next** / **Auto Off** under the Morale category selector.
If the download was interrupted, reconnect and repeat; do not uninstall, reset categories
or clear browser/site storage to update. Saved logs, voice notes, crew edits and seen IDs
remain in IndexedDB. Old random-button releases did not record joke history, so their
pre-deck draws cannot be recovered or excluded.

The new worker fetches its complete shell with HTTP-cache bypass before activating; a failed
install leaves the previous offline release intact. Online navigations check for updates and
request fresh HTML (with a short offline fallback), but only display HTML matching the active
release. Modules, CSS and content use that exact release's cache, never a global cache lookup.
An already-open old screen stays in memory until you explicitly reload; activation alone does
not replace its JavaScript. Native/Capacitor installations still require the normal native
release process where service workers are unavailable.

---

## The six functions

| # | Function | What it does | Source "Type" |
|---|----------|--------------|---------------|
| 1 | **Quick Wiki** | Full-text search, unchanged offline Atlantic 2025 v1.0 rules PDF and 11 read-only, page-referenced extracts. Action-focused instructions; voice settings and source links in a disclosure. Crew notes remain editable, exportable and importable without changing official rules. | Document |
| 2 | **Scheduled reminders** | Recurring prompts (sun cream, hydration, meds, battery/bilge/solar checks, stretching). Toggle on/off, snooze, mark done. | Scheduled notification |
| 3 | **Event reminders** | Triggered safety prompts (CLIP ON, shift-change 10-min warning, run water-maker, grab-bag check). | Triggered notification |
| 4 | **Checklists** | Grab-bag, pre-shift safety, medical inventory, weekly maintenance, daily nutrition. Ticks saved on device with progress bars. | Checklist / Log |
| 5 | **Log (+ voice notes)** | Shift/sleep log, watch handover, medical log, and a **voice journal** for messages home. Records audio with the phone mic — works offline. | Log / Voice journaling |
| 6 | **Morale & Media** | One consistent entertainment player for jokes/riddles, Would You Rather, trivia, games, conversation and challenges. Saved no-repeat progress, automatic answers, optional automatic next items; **white noise**, media placeholders and journal/live-data links. Awe/perspective is on Home. | Media + Games |

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
  the withdrawn generic sequence. Updates do not scrub it; contributors must handle review
  explicitly, outside the emergency UI.
  Wiki imports validate text fields and reject attempts to replace official rule pages.
- **Feedback:** Home → **📝 App feedback** → type and **Save** (offline) → **⤓ Export all**
  to send a `.txt` summary to whoever maintains the app. On land, feedback can also be raised
  on GitHub via the **"📱 App feedback"** issue form (`.github/ISSUE_TEMPLATE/`).

### Emergency reference: useful without implying certification

MOB now leads with the two-person reality: one casualty, one rescuer aboard. It offers
short orientation and distress-communications prompts, links directly to the offline Mayday
page, and says **Use your practised boat-specific recovery method**. It does **not** invent
a recovery manoeuvre, lifting sequence or additional crew roles. The casualty may be unable
to assist. Approval, preparation and limitation commentary is kept in the repository only,
not in screens, disclosures or read-aloud. Local crew edits are never silently erased.
The same reader serves **Stargazing and every other Wiki topic**: it speaks the page title,
any action-critical conditions and the page body, with no global approval/review prefix.
Saved crew-authored wording is not filtered by keywords.

Sources checked on 11 September 2026:
[RYA man-overboard guidance](https://www.rya.org.uk/water-safety/cold-water-shock-safety/man-overboard/)
and [Mayday/Pan-Pan reference by Andy du Port](https://www.yachtingmonthly.com/sailing-skills/how-to-make-a-vhf-radio-mayday-call-pan-pan-call-81832).
These general references do not certify the app or a boat-specific method. Radio and beacon
controls remain model-specific; fixed activation/hold-time claims have been removed.
Other procedures retain action-critical conditions, not editorial caveats. The race rules
PDF and extracted page bodies are unchanged; edition/source-verification commentary is
in the repository review record. Unfilled kit locations and assumed hatch contents/order
are no longer displayed as a plan; existing saved crew plans remain intact.

### Contributor safety-review record

Read **[docs/safety-review.md](docs/safety-review.md)** before changing operational content.
It holds the beta/approval status, removed commentary, source checks, unresolved boat details
and review checklist. Keep this document **out of app links, precaching and the native build**.
Removing in-app review prose does not certify the content or permit invented technical steps.

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
│  ├─ updates.js              Release label, update checks and save-before-reload banner
│  ├─ db.js                   IndexedDB wrapper (on-device storage)
│  ├─ log-export.js           Excel-compatible CSV log export
│  ├─ reminders.js            Reminder engine (checks every 30s while open)
│  ├─ wikiStore.js            Editable wiki layer (overrides, new pages, export/import)
│  ├─ entertainment.js        Content validation and persisted no-repeat deck logic
│  ├─ hands-free.js           Cancellable foreground playback, speech completion and countdowns
│  ├─ speech.js               Shared on-device English voice selection and saved playback preferences
│  ├─ shift-perspective.js    Stable, persisted Home perspective per actual shift start
│  ├─ safety.js               Action-critical operating conditions (separate from crew edits)
│  ├─ rules.js                Read-only official reference and page links
│  ├─ data/content.js         Prototype wiki, reminders, checklists and legacy game titles
│  ├─ data/entertainment-pack.json  Versioned built-in entertainment with provenance
│  ├─ data/rules-data.js      Page-exact text and SHA-256 of the original PDF
│  └─ views/                  One file per screen: home, wiki, reminders, checklists, log, entertain, feedback
├─ references/                Original crew-provided rules PDF (unchanged)
├─ docs/safety-review.md       Repository-only review record; not shipped in the offline app
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

Choose categories freely across the 44-day crossing; there is no forced daily pack. **Next unseen item**
draws unseen items only. On-device IndexedDB settings save seen IDs and the current item for
each category. Returning to (or reselecting) a category restores that item with its answer hidden;
it is not a new draw. At exhaustion,
the last item remains readable and **Reset this category** (with confirmation) starts a new
cycle. Added IDs become available without replaying old ones; retired IDs stay in history in
case they return, but are not counted in the active category's total. Draw/reset transactions
read the latest stored progress atomically, so updated tabs in the same browser profile cannot
draw the same unseen ID concurrently. Already-open pre-v8 tabs must be reloaded; their old
non-atomic code cannot provide this guarantee. Storage failures do not advance a draw.
There is no automatic repeat cycle: only an explicit category reset permits new repeated draws.
Progress is local to each device/browser profile and is lost
if site data is cleared; it is not included in wiki exports. Offline read-aloud depends on an
installed device voice: test it before departure.

### Entertainment: automatic answers, optional Auto

The entertainment player is first on Morale. A single category selector and the same content
panel show the prompt, game instructions, answer and countdown in every category. The primary
controls are always **Next** and **Auto On / Auto Off**. Next always draws an unseen item.
Answers reveal after a short timer even with Auto off; there is no Reveal Answer button.
The mobile player uses large, spacious prompt typography and a separate reserved answer area:
revealing the answer does not move the playback buttons. Its playback bar stays reachable
above the app tabs while scrolling longer items. Primary targets are at least 56px high;
settings have visible keyboard focus and light/dark themes.
Timing/audio options, detailed progress, explicit Reset, source and content release are tucked
into **Playback settings, progress & source**. Read-aloud is a secondary preference,
not another prominent button.
White noise and media placeholders are collapsed into **More ways to unwind → Sound & media**.
Journal, Home perspective and the explicitly labelled prototype race/weather link are in the
separate **Journal & crossing** disclosure, not competing with the main player. The 44-day plan
also remains an optional disclosure.

Tap **Next** to begin, or turn **Auto On** in Jokes, Trivia, Would You Rather or Conversation.
Auto starts with the current item if one exists, otherwise draws the first unseen item.
With read-aloud enabled, the prompt finishes before the answer countdown starts, and the
answer finishes before the next-item pause. With Auto off the answer still appears, but
the item stays on screen. Next interrupts the old speech/timers and keeps an already-enabled
Auto sequence going with the new item. No-answer prompts get reading/discussion time.
Games and challenges never auto-advance; any answers still reveal automatically.

**Normal** timing is 3 seconds thinking time for jokes, 10 for trivia and 20 for conversation/
choices; after an answer finishes, the next-item gap is 3 seconds. **Short** halves these
pauses (rounded to whole seconds) and **Long** doubles them. The current countdown and
revealed answer stay visible. Speech completion, not an estimated speech-duration timer,
controls when the countdown starts.

- **Auto Off** stops advancing, not the current answer. Next/category/settings changes
  cancel old timers and speech; database draws finish serially before the next action.
- Category, reset, voice, audio and pace changes turn Auto off. Restored items and settings
  changes reveal silently. Only a deliberate Next/Auto gesture can begin read-aloud.
- Leaving/hiding/locking stops speech and timers and turns Auto off. Returning restarts
  only the current visual answer timer, never speech or automatic advancement.
- Exhaustion stops without resetting; choose another category or explicitly confirm Reset.
  Storage failures stop advancement. A save already in flight may finish after cancellation;
  that item stays recorded as seen/current rather than risking a repeated draw.
- Speech errors/unavailable voices fall back to timed visual answers with a visible status.
  Watchdogs catch a voice that never starts (6 seconds) or never ends (120 seconds).
- Audio, pace and the selected device voice persist locally; an auto-running session does not.
  Wiki/manual and entertainment playback share natural-rate, normal-pitch English voice selection.
  Available on-device Enhanced/Premium/Natural voices are preferred; a saved choice wins.
  `voiceschanged` refreshes choices. Missing selections show an explicit fallback without
  overwriting the saved choice. Listed cloud-only voices are not used; an empty device voice
  list uses the system default with an offline-availability warning.
- On iPhone, download an Enhanced/Premium English voice under **Settings → Accessibility →
  Spoken Content / Read & Speak → Voices** (names vary by iOS). Safari may not expose every
  downloaded voice. This is **foreground-only**, not reliable locked-screen PWA audio.
  Test the actual phone and voice in aeroplane mode before departure.

v9 fixes pale critical callouts against near-white dark-mode text (the apparent “white
blobs” on MOB/Wiki/Checklists), gives toasts a stable navy/white contrast pair, and ensures
`hidden` overrides author display styles. Light/dark links, chips, warnings and status
colours are theme-aware. Safety-review commentary is repository-only; it no longer appears
as a banner or disclosure in operational screens.

### Home: a little perspective for this shift

The compact **This shift** card is the first main content on Home, immediately below the
top bar (and any necessary update notice), ahead of the timer and emergency actions.
No introduction or release disclosure appears above it. Its short text and tight spacing
keep the timer and emergency buttons nearby. It replaces Morale's random Awe card and uses a small,
dedicated set of gentle perspective prompts, with a Star guide link and a reminder that boat
and watch duties come first. It never draws from or resets the entertainment deck.

Before the first shift, one welcome prompt is saved on the device. **Start** and **Swap &
restart** each set a new `shiftStart` and assign a new prompt, excluding the immediately
previous one. The assignment is persisted against that actual shift ID, not the date,
elapsed time or rower's name. Reopening Home, restarting the app, editing the duration,
changing the rower name alone or continuing the same shift does not change it. Resetting
the timer keeps the last perspective until a genuinely new shift starts. Concurrent Home
tabs share one atomic assignment, and revisiting a known shift ID restores its saved prompt.

For updates: curate/validate the pack, keep source attribution, bump the service-worker cache
version **and** the matching `index.html` `app-release` marker and `js/updates.js` `APP_RELEASE`
(the tests enforce agreement), run `npm test` and `npm run build`, then use the existing static/native publishing
process. The build validates the pack and PDF hash before copying `js/` and `references/`
into `www/`. New content assets must also be listed in `service-worker.js`.
Publish the shell and worker together as one release; never change assets under an unchanged
cache version. Regression tests exercise fresh precaching, failed installs, exact-version
offline loading, update UI confirmation, all 125 published jokes through restarts/upgrades
and concurrent draws. Mock lifecycle tests do not replace a real-device online-upgrade and
offline-launch check on the target phone/browser.
Injected-clock/speech tests also cover hands-free prompt→countdown→answer→next sequencing,
pause/resume, stopped/stale callbacks, in-flight saves, errors and exhaustion.
Home tests cover welcome/shift persistence, Start, Swap & restart, duration edits, navigation,
clock changes and timer reset. Layout tests check the fixed player controls and collapsed settings.
For browser smoke checks, use 320px and 393px mobile widths plus a tablet viewport; verify no
horizontal overflow, stable answer-reveal button positions, visible keyboard focus and usable
touch targets. Also test a completed offline install/reload, concurrent-tab draws, timed visual
playback and Home's shift persistence. Desktop mobile-viewport simulation does not establish
iOS voice support or reliable locked-screen audio.
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
not replaced with an invented recovery procedure. That page now provides concise orientation
and communications; preparation requirements and unresolved content are recorded only in
`docs/safety-review.md`. Other legacy technical notes remain general references, not newly validated procedures.
Official race rules remain authoritative;
crew notes, checklist ticks or an app update do not constitute safety approval.
