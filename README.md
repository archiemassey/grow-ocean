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
**App release grow-ocean-v20** and **Check for updates**. It stays collapsed by default; there
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
Look for **grow-ocean-v20** in Home's About disclosure and the four Home / Boat / Log / Entertainment tabs.
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

## Navigation and boat functions

**v20 has four primary destinations: Home, Boat, Log and Entertainment.** Boat groups
Quick Wiki and official rules, checklists, reminders, star guide, feedback and Siri setup.
Existing `#/wiki`, `#/checklists`, `#/reminders`, `#/log/...` and `#/entertain/...` URLs,
Siri links and manifest quick actions remain valid. Wiki/checklist/reminder detail screens
highlight Boat. The app Back button goes to the section parent (then Boat), including
cold-start deep links; the browser Back gesture still follows your actual history.

The **compact shift strip stays visible on every screen**. Tap it for Home's full shift
controls. It names Rower 1 / Rower 2 and shows a timestamp-based countdown, with explicit
“No shift running”, “Handover in ≤10 min” and “Overdue” text, not colour alone.
The **MOB / Mayday / EPIRB shortcuts are on Home only**, in the prominent Emergency
procedures section below the timer. Tap Home from any screen to reach them. They open
instructions, not radio transmissions or distress activation. Emergency navigation stops
entertainment Auto, timed reveals, speech and white noise. Only the compact shift strip
and four-tab navigation stay pinned; there is no global emergency bar taking screen space.
The navigation respects safe areas and entertainment controls sit above it; on short
screens those player controls scroll normally to leave room for the activity.
No emergency approval/review banners are shipped in the app.

Home keeps **This shift first**, followed by the timer, **Record handover** (existing watch
log), due reminders and collapsed About & updates. Reset requires confirmation. The mocked
live metrics are no longer on Home; the explicitly labelled prototype remains in Boat and
Entertainment. Log forms, recordings, settings and entertainment no-repeat histories are unchanged.

| # | Function | What it does | Source "Type" |
|---|----------|--------------|---------------|
| 1 | **Quick Wiki** | Full-text search, unchanged offline Atlantic 2025 v1.0 rules PDF and 11 read-only, page-referenced extracts. Action-focused instructions; voice settings and source links in a disclosure. Crew notes remain editable, exportable and importable without changing official rules. | Document |
| 2 | **Scheduled reminders** | Recurring prompts (sun cream, hydration, meds, battery/bilge/solar checks, stretching). Toggle on/off, snooze, mark done. | Scheduled notification |
| 3 | **Event reminders** | Triggered safety prompts (CLIP ON, shift-change 10-min warning, run water-maker, grab-bag check). | Triggered notification |
| 4 | **Checklists** | Grab-bag, pre-shift safety, medical inventory, weekly maintenance, daily nutrition. Ticks saved on device with progress bars. | Checklist / Log |
| 5 | **Log (+ voice notes)** | Shift/sleep log, watch handover, medical log, and a **voice journal** for messages home. Records audio with the phone mic — works offline. | Log / Voice journaling |
| 6 | **Morale & Media** | One consistent entertainment player for jokes/riddles, Would You Rather, trivia, games, conversation and challenges. Saved no-repeat progress, automatic answers, optional automatic next items; **white noise**, a note pointing to the native Apple Music / Podcasts apps, and journal/live-data links. Awe/perspective is on Home. | Media + Games |

Plus a **Home dashboard** with a big **shift timer** (10-min amber warning, swap & restart)
and one-tap emergency procedures on Home, a **Live race data** page (race/VMG/weather routing via
"Dorado") shown as **mocked placeholders** ready to wire to a real tracker later, an
**App feedback** screen where the crew can capture ideas/issues offline and export them to
share when back in range, and a **Siri setup** page (Boat → **Siri setup**) that gives
hands-free voice phrases (see below).

### Voyage Star Guide (Boat → Star guide, `#/stars`)

An offline "little perspective for this shift". The sky is drawn from **real star
coordinates** (right ascension / declination in `js/star-math.js`) and projected to the
crew's altitude/azimuth, so the major constellations sit where they actually are and **wheel
across the night** as you drag the time-of-night slider or press **Play** — rising in the
east, culminating in the south, setting in the west. A **voyage slider** carries the observer
from 28°N (La Gomera) to 14°N (St Lucia): Polaris sinks toward the northern sea while
Canopus and, near the end, a low Southern Cross climb into the south. It carries ORION,
CANIS MAJOR/MINOR, TAURUS, GEMINI, AURIGA, LEO, BOÖTES, SCORPIUS, CARINA (Canopus) and CRUX.
Pure geometry is in `js/star-math.js` (unit-tested); the themed SVG view is in
`js/views/stars.js`. In **Night-vision** mode it redraws red-on-black. No network or data feed.

### Screen modes: sunlight & night vision

A single **screen-mode button in the top bar** cycles four modes so the crew can read the
screen at any time of day without digging through settings:

- **Auto — follows the sky over the boat.** It computes the sun's altitude from the device's
  UTC clock (timezone-proof) and the boat's position (GPS when available — it works with no
  signal — cached between launches, falling back to the phone's timezone as a rough longitude
  until a fix arrives). It then picks **Daylight** while the sun is up, **Dark** through
  dawn/dusk twilight, and **Night vision** once it is properly dark past nautical twilight —
  re-checking every minute so transitions happen on their own. No network and no ambient-light
  sensor (unsupported on iOS) are needed. The sun maths live in `js/star-math.js`
  (`sunAltitudeDeg`, `themeForSunAltitude`, unit-tested); the mode engine is in `js/theme.js`.
  Manually picking any of the three fixed modes below overrides Auto until the crew taps back.
- **Daylight** — maximum-contrast black-on-white for direct sunlight glare.
- **Dark** — the calm dark theme regardless of the sky.
- **Night vision** — red-on-black (no white, blue or green) to protect night vision on watch.

The same modes, plus an **extra-dimming slider** for below the phone's minimum brightness, are
on **Boat → Screen & visibility**. The choice is saved on the device and is applied before the
first paint (no flash) via an inline script in `index.html`; the logic lives in `js/theme.js`.

### Breath work & recovery (Boat → Rest & recovery, `#/breathe`)

A guided slow-breathing pacer for rest shifts, framed as relaxation and recovery (not a
medical device). Four sliders set **Breathe in**, **Hold**, **Breathe out** and an optional
**Hold (empty)** independently up to 10 s each — the default **4 / 2 / 6 / 0** sits close to
the crew's familiar 4:6 resonance cadence (a longer exhale nudges the parasympathetic,
"rest-and-digest" response), while raising the empty hold gives a box-breathing rhythm. A soft **3D
sphere swells on the in-breath, holds, and shrinks on the out-breath**, with the current phase
named beneath it. When the crew tap **Begin** the page drops into a distraction-free **focus
mode** — the sliders, notes and cards fade away, leaving just the orb, the phase word and a
small, unobtrusive **Stop** pill. A procedurally-generated **"sea breath"** soundbed (brown/pink noise shaped
by a lowpass filter — brighter on the in-breath, lower on the out-breath, silent on the hold)
rises and falls with the sphere; there is nothing to download. Meant to layer over the crew's
Yōjō vagus-nerve device on rest shifts, so a small pairing note and four safety points are
included. After **10 minutes** a black "sleep" overlay fades in (tap to wake); over the
**next 10 minutes** the sound fades to silence so it won't disturb sleep — a **Screen Wake
Lock** keeps the audio alive behind the overlay. It is **theme-aware** (the sphere goes
red-on-black in Night vision) and cleans up all audio, animation and the wake lock the moment
you leave the screen. Pure timing/scale/fade/envelope maths are in `js/breathe-math.js`
(unit-tested); the Web-Audio + sphere view is in `js/views/breathe.js`. Fully offline.

### Hands-free with Siri (e.g. "Hey Siri, Man Overboard")iOS PWAs can't register Siri directly, so the app uses the built-in **Shortcuts** app with
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
- **Feedback:** Boat → **App feedback** → type and **Save** (offline) → **⤓ Export all**
  to send a `.txt` summary to whoever maintains the app. On land, feedback can also be raised
  on GitHub via the **"📱 App feedback"** issue form (`.github/ISSUE_TEMPLATE/`).

### Emergency reference: useful without implying certification

Where a procedure says to contact the Duty/Safety Officer or NMOC, the **official phone number
is shown inline as a tap-to-dial link** (and spoken in read-aloud) so the crew never has to
leave the guidance to find a number. Numbers are injected at display time from
`js/procedures.js` (`CONTACTS`) and are never stored in the verbatim step data.

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
│  ├─ shift-state.js          Shared atomic shift settings, foreground clock and cross-tab refresh
│  ├─ stint-log.js            DOM-free per-rower stint ledger (deterministic back-fill, totals, GPS haversine)
│  ├─ shift-ics.js            DOM-free wake-up alarm (.ics) builders (all handovers + per-rower, filtered)
│  ├─ shift-schedule.js       DOM-free day/night schedule maths (fair split, strict alternation)
│  ├─ shift-qr.js             Encode/decode the schedule as a compact offline QR payload
│  ├─ vendor/qrcode.js        Vendored public-domain QR generator (offline, SVG output)
│  ├─ vendor/jsqr.js          Vendored Apache-2.0 QR scanner (in-app camera decode)
│  ├─ navigation.js           Four-tab mapping and deterministic deep-link parents
│  ├─ safety.js               Action-critical operating conditions (separate from crew edits)
│  ├─ rules.js                Read-only official reference and page links
│  ├─ data/content.js         Prototype wiki, reminders, checklists and legacy game titles
│  ├─ data/encouragement.js   Rotating handover-praise and mid-stint encouragement message pools
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

The bundled release contains **6,082 items**: **2,005 trivia**, **1,000 jokes/riddles**,
**1,000 Would You Rather prompts**, **77 playable games**, **1,000 conversation prompts**
and **1,000 challenges**. (A legacy 44-day plan may remain in the content pack but is no
longer surfaced in the UI.)
The four topped-up categories are grown to exactly **1,000 each** by
`tools/generate-morale-content.mjs` — a **regenerable** top-up generator that appends only as
many original, wholesome, non-copyright, British-English items as needed (prefixing generated
IDs `gen-joke-` / `gen-wyr-` / `gen-conv-` / `gen-chal-`), dedupes per category, bumps the pack
`version`, then validates. Re-running it is idempotent: it tops up to 1,000 without duplicating
existing content. Trivia is left as-is; games are unchanged.

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
An optional `schedule` of 44 `{ day, title, note, source }` records may still ship inside a
pack, but v18 **no longer surfaces it as a UI disclosure** — it was an inert display that
changed nothing, so the day-picker was removed. Draws always use category progress rather than
replaying fixed IDs; the schedule is never a daily lock or a second deck. Sources for
answer-bearing items appear only after Reveal to avoid spoilers.

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
White noise is collapsed into **More ways to unwind → Sound & media**, alongside a short note
pointing the crew to the native **Apple Music** and **Apple Podcasts** apps for their own
downloaded tunes, podcasts and audiobooks — gROW no longer ships its own media placeholders.
Journal, Home perspective and the explicitly labelled prototype race/weather link are in the
separate **Journal & crossing** disclosure, not competing with the main player.

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
- **iOS audio-unlock fix.** iPhone Safari only grants speech synthesis from inside a direct
  user gesture. gROW now **primes** the voice synchronously (a silent utterance via
  `createSpeechReader.prime()`) on the Start/Auto tap and on the settings change, *before* the
  async IndexedDB draw runs — so the gesture isn't lost and the jokes actually read aloud.
  This clears the earlier **“audio-unavailable”** state on iPhone.

v9 fixes pale critical callouts against near-white dark-mode text (the apparent “white
blobs” on MOB/Wiki/Checklists), gives toasts a stable navy/white contrast pair, and ensures
`hidden` overrides author display styles. Light/dark links, chips, warnings and status
colours are theme-aware. Safety-review commentary is repository-only; it no longer appears
as a banner or disclosure in operational screens.

### Home: a little perspective for this shift

Home opens on the **Deep Horizon** hero — a full-width gradient card with a circular
countdown dial (the arc fills as the stint runs and tints amber/red as the handover nears),
an SVG wave along the bottom, and a single **This shift** inspiration line beneath it.
The hero carries the emergency control in plain view and a discreet **⚙️ cog** in its
top-right. Beside the dial is a compact **D-pad**: up/down are the one-time **+5 / −5**
nudges, left swaps rower, centre resets and right is a **play/pause toggle** (▶ starts or
resumes, ⏸ pauses) — small icons so the dial keeps the page. The cog opens a **rising bottom
sheet** that holds **rower-name inputs** (with **✓ Save names**), the day/night schedule
sliders (night stint, day stint and the Rower-1 balance split) full-width inline, plus links
to QR sync, the wake-up alarms and **🗑 Remove gROW alarms**. The sheet closes on Escape, a
backdrop tap or its **✕**; its open/closed state is driven entirely by CSS (no view-owned
timer), and focus is trapped and restored.
The global shift strip is hidden on Home (the hero already shows the live status) and shown
on every other screen. The inspiration text uses a small, dedicated set of gentle
prompts with a Star guide link and a reminder that boat and watch duties come first. It
never draws from or resets the entertainment deck.

**Manual stopwatch seeded by the schedule.** In day/night schedule mode the dial normally
follows the deterministic clock, but the moment **▶/⏸/⇄** is used it hands the dial to a
**manual stopwatch**, seeded from the current stint (same rower, same remaining) so the switch
is seamless. **▶** starts or resumes, **⏸** freezes the remaining time, and **⇄** swaps the
rower onto a fresh stint. The schedule still clocks the wake-up alarms and QR sync throughout,
so the two phones stay in agreement even while one rower drives the dial by hand. In schedule
mode **↺** does the opposite of a takeover: it hands the dial **back** to the pure schedule,
clearing any one-off nudge or manual takeover (in plain fixed mode it restarts the current
stint from its full configured length). **Rower names** entered in the sheet (and on
`#/schedule`) replace “Rower 1 / Rower 2” everywhere the pair are named — the live strip,
handover line, morale messages and the `.ics` text — while the internal ids never change, so
saved alarms still match.

The **+5 / −5** buttons are a **one-off local nudge** and never change modes: in day/night
schedule mode they shift only the *current* stint's handover time on this phone (keyed to that
stint's start, so the offset auto-expires at the next changeover) and the next rower's
scheduled end is untouched; in plain fixed mode (or once the stopwatch owns the dial) they
adjust `shiftMin` by ±5. They apply silently (no confirm pop-up), as does ↺.

**Stint log, morale and real miles (v19).** The app now keeps an honest, on-device ledger of
who rowed and for how long (IndexedDB `stintLog`, DB v3). A pure reconciler
(`js/stint-log.js`) appends one record per completed stint in both modes: schedule handovers
are **back-filled deterministically** on reopen (record ids derive from the stint start, so it
is idempotent — no duplicates), and manual stints are keyed to `shiftLastStart` so pause/resume
never splits one. The **This shift** card shows a rotating **morale line** — warm praise for the rower coming
**off** at a handover (optional real stint/hour totals folded in; the incoming rower is *not*
welcomed here) and a separate gentle **welcome + encouragement ~5 minutes into a fresh stint**
for the rower now on the oars — plus a quiet **totals readout** (stints logged · hours on the
oars · nm made). The handover praise also pops as an on-screen notice that stays for **20
seconds** so it can actually be read on deck, and when opt-in GPS has logged any distance the
notice ends with the real **miles made so far**. Messages live in `js/data/encouragement.js`
and rotate without repeating. The old “Swapped” toast is gone; the
handover praise replaces it. **Miles made is opt-in GPS**: a toggle in the ⚙️ sheet captures a
real `navigator.geolocation` fix at each handover (and on demand via **📍 Mark position**), and
miles are summed by haversine between consecutive fixes. It is **foreground-only** (iPhone can't
track GPS in the background), default **off**, and nothing leaves the phone. The static
“distance” figures elsewhere in the app remain mocked and are never presented as real.

Before the first shift, one welcome prompt is saved on the device. **Start** and **Swap**
each begin a genuinely new shift (a new `shiftLastStart`) and assign a new prompt, excluding
the immediately previous one. The assignment is persisted against that actual shift identity,
not the date, elapsed time or rower's name. Reopening Home, restarting the app, editing the
duration, changing the rower name alone, **pausing/resuming**, **resetting** or continuing the
same shift does not change it — reset restarts the countdown but keeps this shift's identity,
so the gentle prompt stays until a genuinely new shift (Start/Swap) begins. Concurrent Home
tabs share one atomic assignment, and revisiting a known shift ID restores its saved prompt.

Home and the persistent strip subscribe to one shared shift store. `shiftMin`, `shiftStart`
and `activeRower` keep their existing IndexedDB keys; `rower1Name`/`rower2Name`, `manualOn` and
`pausedLeft` are stored alongside. Related changes read and commit in
one transaction; `shiftLastStart` preserves unique, strictly-increasing shift IDs across resets
and concurrent starts and is the perspective key. Duration-only changes never change `shiftStart`. Failed/invalid storage is shown
explicitly; a failed save is not presented as a successful start. Retry on Home, rather than
clearing data. Tabs refresh through BroadcastChannel where supported and on focus/resume
otherwise. Countdown ticks are calculated from `Date.now()` and the saved start, not decremented
counters; returning to the foreground refreshes storage. Home unsubscribes when leaving.
The strip is not an ARIA live region, so it does not announce every second. This is an
on-screen timer, **not a reliable background alarm**; keep the existing native reminder
setup and onboard watch procedures. Physical-device alarms remain a separate validation.

**Wake-up alarms (.ics export).** Because an installed web app cannot set or move a native
iPhone alarm on its own, Home's ⚙️ sheet has an **⏰ Wake-up alarms (.ics)** button that
builds a small calendar file of the next eight handovers, each with a Calendar alert 10 min
before. On iPhone/iPad the file is **opened** (blob URL, no `download` attribute) so Safari
shows the native **“Add All”** banner rather than silently saving to Files; everywhere else
it falls back to the Share sheet / download. The shared `openCalendarFile` helper in
`js/app.js` handles this. The same file serves both rowers: it wakes the resting partner and
cues the rower on oars to rouse her. The maths lives in the DOM-free `js/shift-ics.js`
(`nextHandovers`, `rowerAfter`, `buildWakeupICS`) with ASCII-only, UTC-stamped output.
Calendar alerts are **soft** (they obey silent mode / Focus), so the resting rower should
also set a Clock-app alarm for a guaranteed wake-up.

**Remove gROW alarms (cancel `.ics`).** A web app cannot delete iPhone Calendar events
through any API. The ⚙️ sheet's **🗑 Remove gROW alarms** button instead exports a
`METHOD:CANCEL` file (`buildCancelICS`) that re-emits the **same stable UIDs** gROW published
before, marked `STATUS:CANCELLED` with a far-higher `SEQUENCE`, so a well-behaved Calendar
withdraws the matching events on import. Because the alarm builders use fixed internal ids in
their UIDs (never the display names), cancels and re-imports still match. This is best-effort —
pair it with a **dedicated gROW calendar** the crew can clear outright if their calendar app
ignores cancellations.

**Per-rower wake-ups (`#/schedule`).** The schedule screen carries a small **“I'm Rower 1 /
I'm Rower 2”** toggle, remembered on that phone (`localStorage` key `grow-ocean-my-rower`).
Three buttons — **⏰ My next shift**, **🌙 My night shifts** and **📅 My next 24 h** — build a
calendar of **only the handovers where that rower comes ON oars**, excluding the stints she
is already rowing, so she is woken exactly when her shift starts and not mid-rest. The
builder `buildRowerWakeupsICS(settings, { rower, horizon, leadMin })` filters the computed
schedule handovers by `onNext === rower` and the chosen horizon. An **⏰ All handovers (both
rowers)** button still exports the full handover list.

**Day / night schedule + offline QR sync (`#/schedule`).** Home's ⚙️ sheet links to a
**🗓️ Day / night schedule** screen (the same sliders also appear inline in the sheet). Two
sliders set the **night** stint (one long unbroken
rest each) and the **day** stint; a **balance** slider shares the rowing time if one rower is
stronger. The maths (DOM-free `js/shift-schedule.js`) guarantees each rower's daily total is
exactly her balance share of 24h — 50/50 → 12h each, 60/40 → 14h24 / 9h36 — whatever the
slider lengths, because every segment length (never the count) scales by the split, so strict
alternation is preserved. When **“Use this schedule”** is on, Home's live countdown and the
`.ics` alarms are clocked off the computed stints (`currentSegment`, `nextHandovers`) rather
than the fixed length. The schedule is deterministic from the settings plus the phone clock
(anchored to local midnight + night start), so two phones holding the same settings compute
identical handovers with **no shared start time**. The rowers stay awake and agree changes
together, then re-sync by **QR**: one phone shows the schedule QR (`js/shift-qr.js` payload),
the other scans it in-app with the camera — fully offline, no wifi, cloud or push. The QR
code and in-app camera scan are **always visible** on the screen (no collapsed section). QR
encode uses the vendored public-domain `js/vendor/qrcode.js`; scanning uses the vendored
Apache-2.0 `js/vendor/jsqr.js`. A “Share as file” backup and schedule-based wake-up alarms
are also provided. There is deliberately **no autonomous push** between phones.

The v20 worker precaches every `js/**` module with the shell — including `theme.js`,
`star-math.js`, `breathe-math.js`, `views/stars.js`, `views/breathe.js`, and the new
`stint-log.js` and `data/encouragement.js`, which earlier
releases omitted (a latent bug that broke the star guide, screen modes and breathwork
offline; `test/offline-content.test.js` now guards against it). The existing native build
copies them automatically. Bump the HTML release marker,
`updates.js` and worker together on future releases; never clear IndexedDB during an update.

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
- **Media (music/podcasts/audiobooks)** are no longer built into gROW — the crew use the native
  **Apple Music** and **Apple Podcasts** apps for their own downloaded content, which plays
  offline. (White noise is generated live inside gROW and already works.)
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
