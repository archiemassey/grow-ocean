/* gROW Ocean — seeded content from "Checks, drills, functions — Vicky requirements v2.xlsx".
   Plain English: this file is the app's built-in knowledge. Editing text here changes
   what appears in the app. Everything lives on the device, so it all works offline.

   SAFETY NOTE: wiki content below is a concise aide-memoire drafted for the prototype.
   It MUST be reviewed/approved by the crew's safety & medical advisers before real use. */

export const CONTENT = {
  meta: {
    crew: ['Rower 1', 'Rower 2'],
    source: 'Vicky requirements v2.xlsx',
    disclaimer: 'Prototype content — review with safety/medical advisers before the crossing.'
  },

  /* ---------- 1. QUICK-ACCESS WIKI (Type: Document) ---------- */
  wiki: [
    {
      id: 'mob', title: 'Man Overboard (MOB)', category: 'Safety', priority: 1, voice: true,
      summary: 'Repeated protocol in a dire emergency. Alert Safety Team & Mayday.',
      body: `<p class="callout crit"><strong>Shout. Point. Press.</strong> Act immediately — every second counts.</p>
        <ol>
          <li><strong>Shout</strong> "MAN OVERBOARD" to wake/alert the other rower.</li>
          <li><strong>Hit the MOB button</strong> on the chartplotter / GPS to mark position.</li>
          <li><strong>Throw flotation</strong> (danbuoy / horseshoe) toward the casualty.</li>
          <li><strong>Keep pointing</strong> at the casualty — do not lose visual contact.</li>
          <li><strong>Stop the boat</strong> / deploy drogue to slow drift away.</li>
          <li><strong>Activate AIS MOB beacon / PLB</strong> on the casualty's lifejacket.</li>
          <li><strong>Send Mayday</strong> on VHF Ch16 + alert Safety Team (see VHF page).</li>
          <li><strong>Recover</strong> using the recovery strop/ladder; keep casualty horizontal.</li>
        </ol>
        <p class="callout"><strong>Prevention:</strong> always clip on when leaving the cabin or on deck.</p>`,
      ref: 'https://en.wikipedia.org/wiki/Man_overboard'
    },
    {
      id: 'epirb', title: 'EPIRB & PLB Deployment', category: 'Safety', priority: 1, voice: true,
      summary: 'Emergency deployment guidance for distress beacons.',
      body: `<p class="callout crit">Use only in grave & imminent danger to life.</p>
        <ol>
          <li>Retrieve EPIRB from its bracket / grab bag.</li>
          <li>Move to open deck with clear sky view (beacons need GPS + satellite).</li>
          <li>Remove the safety tab, then press &amp; hold ACTIVATE until the strobe flashes.</li>
          <li>Secure the beacon upright — antenna vertical, clear of obstructions. Float-free if in water.</li>
          <li>Leave it transmitting. Do NOT switch off until rescue confirms.</li>
          <li>Back up with VHF Ch16 Mayday and Safety Team alert if able.</li>
        </ol>
        <p><strong>PLB</strong> (personal): worn on the lifejacket — same activate &amp; hold principle, keep antenna clear of the body.</p>`,
      ref: 'https://en.wikipedia.org/wiki/Emergency_position-indicating_radiobeacon'
    },
    {
      id: 'vhf', title: 'VHF — Mayday / Pan-Pan', category: 'Safety', priority: 1, voice: true,
      summary: 'Prompts for accurate, efficient comms with other vessels.',
      body: `<p><strong>DISTRESS (Ch16, full power):</strong></p>
        <ol>
          <li>"MAYDAY, MAYDAY, MAYDAY"</li>
          <li>"This is [BOAT NAME], [BOAT NAME], [BOAT NAME]"</li>
          <li>"MAYDAY [BOAT NAME]"</li>
          <li>"My position is [lat/long or bearing &amp; distance]"</li>
          <li>Nature of distress (e.g. capsize, MOB, fire, sinking)</li>
          <li>Assistance required</li>
          <li>Number of persons on board (2)</li>
          <li>"OVER"</li>
        </ol>
        <p class="callout"><strong>Pan-Pan</strong> (urgent, not life-threatening): replace "MAYDAY" with "PAN-PAN" ×3. Use for serious but non-grave situations.</p>
        <p>Press the red <strong>DSC distress</strong> button (lift cover, hold 5s) to send a digital alert with position automatically.</p>`,
      ref: 'https://en.wikipedia.org/wiki/Marine_VHF_radio'
    },
    {
      id: 'anchor', title: 'Anchor / Para-Anchor Deployment', category: 'Safety', priority: 1, voice: true,
      summary: 'Step-by-step in bad weather. Knots, attachment points.',
      body: `<ol>
          <li>Brief each other; both clipped on; helmets if carried.</li>
          <li>Attach rode to the bow bridle / designated strong point (check shackle moused).</li>
          <li>Flake the rode on deck so it runs free without snagging.</li>
          <li>Deploy the para-anchor/sea anchor over the bow, downwind side.</li>
          <li>Pay out rode gradually; let it set so the bow holds into wind/waves.</li>
          <li>Add chafe protection where the rode crosses the gunwale.</li>
          <li>Secure inboard end; log time, position &amp; conditions.</li>
        </ol>
        <p class="callout"><strong>Drogue</strong> (from the stern) slows the boat running downwind — see conditions/polars. Para-anchor (bow) holds you nearly stationary.</p>`,
      ref: 'https://en.wikipedia.org/wiki/Sea_anchor'
    },
    {
      id: 'liferaft', title: 'Life Raft Deployment', category: 'Safety', priority: 1, voice: true,
      summary: 'Emergency deployment guidance.',
      body: `<p class="callout crit">Step UP into the raft — only abandon to a raft when the boat is truly lost.</p>
        <ol>
          <li>Grab bag &amp; EPIRB first — take them with you.</li>
          <li>Check the painter line is tied to a strong point on the boat.</li>
          <li>Throw the canister/valise to the leeward (downwind) side.</li>
          <li>Pull the painter firmly (may be the full length) to fire the gas inflation.</li>
          <li>Board without entering the water if possible; keep horizontal.</li>
          <li>Cut the painter only once everyone &amp; the grab bag are aboard.</li>
          <li>Stream the raft drogue, close the canopy, take seasickness tablets.</li>
        </ol>`,
      ref: 'https://en.wikipedia.org/wiki/Liferaft'
    },
    {
      id: 'epoxy', title: 'Emergency Hull Repair (Epoxy)', category: 'Safety', priority: 2, voice: true,
      summary: 'Step-by-step at a critical stage, e.g. marlin strike.',
      body: `<ol>
          <li>Stop ingress first: bung / soft wood plug / self-amalgamating tape over the hole.</li>
          <li>Dry &amp; abrade the area around the damage (sandpaper from repair kit).</li>
          <li>Mix epoxy resin + hardener to the correct ratio — measure carefully, mix 60s.</li>
          <li>Wet out a glass-cloth patch; apply over the area, overlapping undamaged hull.</li>
          <li>Press out air bubbles; add layers if structural.</li>
          <li>Protect from water until cured (cure time rises in cold — keep warm if possible).</li>
          <li>Log the repair; monitor the bilge for continued ingress.</li>
        </ol>
        <p class="callout">Underwater holes: an internal patch + external soft plug buys time until conditions allow a proper repair.</p>`,
      ref: 'https://www.westsystem.com/instruction/'
    },
    {
      id: 'firstaid', title: 'First Aid — Common Ailments', category: 'Medical', priority: 2, voice: true,
      summary: 'First-aid responder assistant / note-taker for procedures.',
      body: `<p class="callout">This is an aide-memoire only. Follow your medical kit guidance and shore medical advice (sat phone) for anything serious.</p>
        <p><strong>Severe bleeding:</strong> direct pressure → elevate → pressure dressing → tourniquet only if life-threatening limb bleed.</p>
        <p><strong>Seasickness:</strong> hydrate, medication early, eyes on horizon, stay on deck if safe.</p>
        <p><strong>Hypothermia:</strong> remove wet layers, insulate, warm sweet drinks if conscious, shelter in cabin.</p>
        <p><strong>Heat exhaustion:</strong> shade, cool with seawater, electrolytes, rest. Escalate if confusion (heatstroke).</p>
        <p><strong>Wounds:</strong> clean with fresh water, close/dress, watch for infection (redness, heat, pus) — see Salt Sores &amp; Blisters.</p>
        <p>Record symptoms, vitals &amp; meds given in the <em>Medical Log</em> to share with shore support.</p>`,
      ref: 'https://www.redcross.org/take-a-class/first-aid/first-aid-reference-materials'
    },
    {
      id: 'blisters', title: 'Blisters (Hands & Feet)', category: 'Medical', priority: 4, voice: false,
      summary: 'Assess severity; photo log; ask Safety Team if unsure.',
      body: `<ul>
          <li>Small &amp; intact: leave it, cover with a blister plaster / tape to reduce friction.</li>
          <li>Large/painful: clean, pierce at the edge with a sterilised needle, leave the roof on, dress.</li>
          <li>Burst/torn: clean, antiseptic, non-stick dressing, keep dry between shifts.</li>
          <li>Watch for infection — log a photo and send to the Safety Team if spreading or hot.</li>
          <li>Prevention: tape hot-spots early, glove rotation, dry hands at shift change.</li>
        </ul>`,
      ref: 'https://www.mayoclinic.org/diseases-conditions/blisters/symptoms-causes/syc-20351691'
    },
    {
      id: 'breathwork', title: 'Breathwork & Calming', category: 'Recovery', priority: 4, voice: true,
      summary: 'In cabin or on deck, following incidents/capsize.',
      body: `<p><strong>Box breathing (reset after a scare):</strong></p>
        <ol><li>Breathe in 4s</li><li>Hold 4s</li><li>Out 4s</li><li>Hold 4s</li><li>Repeat ×5</li></ol>
        <p><strong>Physiological sigh:</strong> double inhale through the nose, long slow exhale through the mouth. ×3 to drop stress fast.</p>
        <p class="callout">Tap "Read aloud" and follow the pace with your eyes closed.</p>`,
      ref: 'https://www.health.harvard.edu/mind-and-mood/relaxation-techniques-breath-control-helps-quell-errant-stress-response'
    },
    {
      id: 'lights', title: 'Boat Recognition (Nav Lights)', category: 'Safety', priority: 3, voice: false,
      summary: 'Simple aide-memoire — clarity at night when sleep-deprived.',
      body: `<ul>
          <li><strong>Red</strong> = port (left) side of a vessel. <strong>Green</strong> = starboard (right).</li>
          <li>See both red &amp; green + a white above = vessel heading toward you — act early.</li>
          <li><strong>Red over white</strong> = fishing vessel. <strong>Red over red</strong> = "not under command".</li>
          <li>White stern light = you're looking at its back (overtaking).</li>
          <li>Big ships are fast &amp; may not see you — use AIS &amp; VHF, alter course early.</li>
        </ul>`,
      ref: 'https://en.wikipedia.org/wiki/Navigation_light'
    },
    {
      id: 'hatch', title: 'Hatch & Stowage Plan', category: 'Admin', priority: 2, voice: false,
      summary: 'Where food/snacks are; order to empty hatches to keep boat stable.',
      body: `<p class="callout">Customise this with your real stowage plan before departure.</p>
        <ul>
          <li><strong>Bow hatch:</strong> [contents] — empty last (trim).</li>
          <li><strong>Day hatch:</strong> current-day food &amp; snacks.</li>
          <li><strong>Aft hatches:</strong> [contents].</li>
          <li>Empty evenly side-to-side &amp; fore-aft to keep trim and stability.</li>
          <li>Log when a hatch/ration block is opened to track consumption.</li>
        </ul>`,
      ref: 'https://en.wikipedia.org/wiki/Stowage_plan'
    },
    {
      id: 'tools', title: 'Location of Tools / Pump / Medical Kit', category: 'Admin', priority: 1, voice: false,
      summary: 'Knowing where seldom-used items are, in an emergency.',
      body: `<p class="callout">Fill in real locations before departure — this page must be findable in seconds.</p>
        <ul>
          <li><strong>Manual bilge pump:</strong> [location]</li>
          <li><strong>Tool kit:</strong> [location]</li>
          <li><strong>Medical grab kit:</strong> [location]</li>
          <li><strong>Epoxy / repair kit:</strong> [location]</li>
          <li><strong>Spare oars / gates:</strong> [location]</li>
          <li><strong>Grab bag &amp; EPIRB:</strong> [location]</li>
        </ul>`,
      ref: 'https://en.wikipedia.org/wiki/Marine_safety'
    },
    {
      id: 'stars', title: 'Star Gazing & Night Sky', category: 'Morale', priority: 2, voice: true,
      summary: 'Distraction and awe at night; light celestial-nav support.',
      body: `<ul>
          <li>Find <strong>Polaris</strong> (North Star): follow the two end stars of the Plough's "pan" upward ~5×. Its height ≈ your latitude.</li>
          <li><strong>Orion</strong> rises in the east; the three belt stars point to Sirius (brightest star).</li>
          <li>The <strong>Milky Way</strong> arches overhead far from land light — look for satellites &amp; shooting stars.</li>
          <li>Let your eyes adapt 10–15 min; use red light to keep night vision.</li>
        </ul>
        <p class="callout">A moment of awe resets perspective on a hard shift. 🌌</p>`,
      ref: 'https://www.skyatnightmagazine.com/advice/stargazing-basics'
    }
  ],

  /* ---------- 2. SCHEDULED REMINDERS (Type: Scheduled notification) ----------
     intervalH = repeat every N hours; or time = "HH:MM" daily. enabledByDefault as noted. */
  scheduled: [
    { id:'suncream', title:'Sun cream', detail:'Reapply — every 5–6 hours as conditions require.', category:'Hygiene', intervalH:5, voice:true, on:true },
    { id:'hydration', title:'Hydration & electrolytes', detail:'Drink + electrolytes. Check urine colour. Each shift.', category:'Recovery', intervalH:2, voice:false, on:true },
    { id:'skinclean', title:'Skin clean-down', detail:'Wash off salt & sunscreen, treat chafe — after every shift.', category:'Hygiene', intervalH:2, voice:false, on:true },
    { id:'meds', title:'Medication', detail:'Daily medication prompt (if needed).', category:'Medical', time:'08:00', voice:false, on:false },
    { id:'contraceptive', title:'Contraceptive', detail:'Daily prompt (if needed).', category:'Medical', time:'08:00', voice:false, on:false },
    { id:'stretch', title:'Mobilise & stretch', detail:'Rotate: back, hands/fingers, ankles/shins.', category:'Recovery', intervalH:6, voice:true, on:true },
    { id:'saltsores', title:'Salt-sore check', detail:'Check chafe/irritation points; treat early.', category:'Hygiene', intervalH:12, voice:false, on:true },
    { id:'battery', title:'Battery check', detail:'Check charge; prioritise essentials. Never run down.', category:'Maintenance', time:'12:00', voice:false, on:true },
    { id:'hull', title:'Hull clean', detail:'Check biofouling; clean in suitable conditions.', category:'Maintenance', intervalH:48, voice:false, on:true },
    { id:'damage', title:'Damage checks (weekly)', detail:'Oargates, footplates, safety lines.', category:'Maintenance', intervalH:168, voice:false, on:true },
    { id:'bilges', title:'Check bilges (weekly)', detail:'Inspect & pump bilges.', category:'Maintenance', intervalH:168, voice:false, on:true },
    { id:'solar', title:'Clean solar panels (weekly)', detail:'Wipe salt/film for charge efficiency.', category:'Maintenance', intervalH:168, voice:false, on:true },
    { id:'technique', title:'Technique check (weekly)', detail:'Review stroke as energy declines.', category:'Performance', intervalH:168, voice:false, on:true },
    { id:'weight', title:'Weight redistribution', detail:'Re-trim per hatch plan; include bow cabin if stowing.', category:'Admin', intervalH:72, voice:false, on:false },
    { id:'awe', title:'Awe / wildlife moment', detail:'Pause for perspective — look up, look out. 🐋', category:'Morale', intervalH:8, voice:true, on:true },
    { id:'social', title:'Social media content', detail:'Capture a clip/photo — maximise efficiency.', category:'Admin', time:'10:00', voice:false, on:false }
  ],

  /* ---------- 3. EVENT-BASED REMINDERS (Type: Triggered notification) ---------- */
  events: [
    { id:'clipon', title:'CLIP ON', detail:'Leaving the cabin / going on deck? Clip your tether to a strong point BEFORE you step out.', category:'Safety', crit:true },
    { id:'shiftchange', title:'Shift change — 10 min warning', detail:'10 minutes to handover. Wake the next rower, prep food/layers, keep the boat moving.', category:'Admin', crit:false },
    { id:'watermaker', title:'Run the water maker', detail:'High sun / before a hot day — make water while batteries are charging well.', category:'Maintenance', crit:false },
    { id:'grabbag', title:'Grab-bag check', detail:'Confirm sealed, attached & ready. Run the checklist.', category:'Safety', crit:false },
    { id:'drogue', title:'Consider drogue / para-anchor', detail:'Conditions building? Review the deployment wiki before it gets worse.', category:'Safety', crit:true },
    { id:'homecall', title:'Call home', detail:'Low point or milestone — a message from home lifts morale. Open any special package.', category:'Morale', crit:false }
  ],

  /* ---------- 4. CHECKLISTS (Type: Checklist / Log) ---------- */
  checklists: [
    { id:'grabbag', title:'Grab-bag check', items:[
      'EPIRB present & in date','Handheld VHF charged','Flares in date','Drinking water sachets',
      'Thermal protective aids','First-aid mini-kit','Torch + spare batteries','Whistle & signalling mirror',
      'Sealed & securely attached'] },
    { id:'predeparture', title:'Pre-shift safety', items:[
      'Lifejacket on & armed','Tether clipped before deck','Nav lights on (night)','AIS on',
      'Phone/PLB on person','Hatches closed & sealed'] },
    { id:'medinventory', title:'Medical inventory', items:[
      'Painkillers count','Antibiotics count','Antiseptic / dressings','Seasickness meds',
      'Personal meds (rower 1)','Personal meds (rower 2)','Rehydration salts','Log anything used'] },
    { id:'weeklyboat', title:'Weekly boat maintenance', items:[
      'Oargates & gates','Footplates secure','Safety lines / jackstays','Bilges checked & dry',
      'Solar panels cleaned','Battery charge healthy','Rudder & lines','Hull biofouling check'] },
    { id:'dailynutrition', title:'Daily nutrition / calories', items:[
      'Breakfast logged','Snacks logged','Lunch logged','Dinner logged',
      'Electrolytes taken','Hit calorie target (~5000 kcal)','Top-up plan for tomorrow'] }
  ],

  /* ---------- 5. LOG TYPES (Type: Log; voice journaling) ---------- */
  logTypes: [
    { id:'shift', title:'Shift / Sleep log', icon:'🚣', fields:[
      {k:'rower', label:'Rower', type:'select', options:['Rower 1','Rower 2']},
      {k:'state', label:'Physical state', type:'select', options:['Strong','OK','Tired','Struggling']},
      {k:'sleep', label:'Sleep this break (mins)', type:'number'},
      {k:'notes', label:'Notes', type:'text'}], voice:true },
    { id:'watch', title:'Watch log (handover)', icon:'🧭', fields:[
      {k:'weather', label:'Weather', type:'text'},
      {k:'wind', label:'Wind / wave dir', type:'text'},
      {k:'bearing', label:'Bearing / heading', type:'text'},
      {k:'hazards', label:'Hazards / traffic', type:'text'}], voice:true },
    { id:'medical', title:'Medical log', icon:'➕', fields:[
      {k:'who', label:'Patient', type:'select', options:['Rower 1','Rower 2']},
      {k:'symptom', label:'Symptom / injury', type:'text'},
      {k:'vitals', label:'Vitals', type:'text'},
      {k:'meds', label:'Medication given', type:'text'},
      {k:'review', label:'Review in (hours)', type:'number'}], voice:true },
    { id:'journal', title:'Voice journal', icon:'🎙', fields:[
      {k:'title', label:'Title', type:'text'},
      {k:'audience', label:'For', type:'select', options:['Private','Team','Home','Social media']}], voice:true, voiceOnly:true }
  ],

  /* ---------- 6. ENTERTAINMENT / MORALE (Type: Media + Games) ---------- */
  games: [
    '20 Questions (yes/no guessing — great by voice)',
    'Would You Rather? (fun + reveals preferences)',
    'Two Truths and a Lie (team bonding)',
    'Word Chain (last letter → next word)',
    'Categories (animals, countries, foods…)',
    '"Name 10" challenge (10 items in 30 seconds)',
    'Trivia of the Day (5-question micro-quiz)',
    'Story Build (each adds a sentence — voice-record it)',
    'Memory Ladder ("I packed…")',
    'Spot-the-Positive (3 good things / gratitude round)',
    'Mini photo scavenger hunt (clouds, wildlife, boat parts)',
    '"Beat Your Best" micro-challenges (fastest knot, stretch streak)',
    'Joke / Riddle of the Day'
  ],
  media: [
    { id:'music', title:'Music', detail:'On-demand playlists.', icon:'🎵', kind:'audio' },
    { id:'podcasts', title:'Podcasts', detail:'"If you like this, you\'ll like this."', icon:'🎧', kind:'audio' },
    { id:'audiobooks', title:'Audiobooks', detail:'Long-form listening for the night shift.', icon:'📚', kind:'audio' },
    { id:'whitenoise', title:'White noise / Calm', detail:'In-cabin sleep & calm sounds.', icon:'🌊', kind:'audio' }
  ],

  /* ---------- LIVE REPORTING (mocked placeholders) ---------- */
  live: [
    { id:'speed', label:'Boat speed', value:'2.4', unit:'kn' },
    { id:'vmg24', label:'VMG (24h avg)', value:'2.1', unit:'kn' },
    { id:'vmgstart', label:'VMG (since start)', value:'1.9', unit:'kn' },
    { id:'dist', label:'Distance to finish', value:'1,842', unit:'nm' },
    { id:'made', label:'Distance made (24h)', value:'51', unit:'nm' },
    { id:'record', label:'Ahead of record pace', value:'+0.6', unit:'days' },
    { id:'stroke', label:'Stroke rate', value:'19', unit:'spm' },
    { id:'fund', label:'Fundraising', value:'£42,300', unit:'' }
  ],
  weather: {
    router: 'Dorado',
    summary: 'Last 24h: steady ENE 12–15kn, favourable. Next 24h: backing NE 15–18kn, building swell ~2.5m overnight. Keep pushing — good progress window before a lull on day 3.'
  }
};
