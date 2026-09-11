/* gROW Ocean — seeded content from "Checks, drills, functions — Vicky requirements v2.xlsx".
   Plain English: this file is the app's built-in knowledge. Editing text here changes
   what appears in the app. Everything lives on the device, so it all works offline. */

export const CONTENT = {
  meta: {
    crew: ['Rower 1', 'Rower 2'],
    source: 'Vicky requirements v2.xlsx'
  },

  /* ---------- 1. QUICK-ACCESS WIKI (Type: Document) ---------- */
  wiki: [
    {
      id: 'mob', title: 'Man Overboard (MOB)', category: 'Safety', priority: 1, voice: true,
      summary: 'Two crew. One person overboard. One rescuer aboard.',
      body: `<h3>If you are aboard</h3>
        <p>You are the only rescuer. Protect yourself from going overboard too; do not plan on a second helper.</p>
        <p><strong>Call for help.</strong> In grave and imminent danger, send a distress alert using your radio’s instructions and make a Mayday voice call on VHF channel 16.</p>
        <p>Give your boat name, position and the situation: <strong>“One person overboard. One person remains aboard. Two crew in total. I need immediate assistance.”</strong> Give the casualty’s location and condition as far as you know.</p>
        <p><a href="#/wiki/vhf">Open Mayday call prompts →</a></p>
        <h3>The person in the water</h3>
        <p>The casualty may be unable to respond or help. Do not rely on them to operate equipment or assist with recovery.</p>
        <p><strong>Use your practised boat-specific recovery method.</strong></p>`,
      ref: 'https://www.rya.org.uk/water-safety/cold-water-shock-safety/man-overboard/'
    },
    {
      id: 'epirb', title: 'EPIRB & PLB Deployment', category: 'Safety', priority: 1, voice: true,
      summary: 'Emergency deployment guidance for distress beacons.',
      body: `<p class="callout crit">Use only in grave & imminent danger to life.</p>
        <ol>
          <li>Retrieve EPIRB from its bracket / grab bag.</li>
          <li>Move to open deck with clear sky view (beacons need GPS + satellite).</li>
          <li>Activate using the instructions on your actual beacon. Controls, antenna deployment and indicators differ by model.</li>
          <li>Position and secure it as the manufacturer directs, with the antenna clear. Not all beacons float or transmit correctly in water.</li>
          <li>Leave it transmitting. Do NOT switch off until rescue confirms.</li>
          <li>Back up with VHF Ch16 Mayday and Safety Team alert if able.</li>
        </ol>
        <p><strong>PLB</strong> (personal): use its own activation and antenna instructions, not the EPIRB’s. Keep the antenna clear as directed.</p>`,
      ref: 'https://en.wikipedia.org/wiki/Emergency_position-indicating_radiobeacon'
    },
    {
      id: 'vhf', title: 'VHF — Mayday / Pan-Pan', category: 'Safety', priority: 1, voice: true,
      summary: 'Prompts for accurate, efficient comms with other vessels.',
      body: `<p><strong>DISTRESS (Ch16, full power):</strong></p>
        <ol>
          <li>"MAYDAY, MAYDAY, MAYDAY"</li>
          <li>"This is [BOAT NAME], [BOAT NAME], [BOAT NAME]. Call sign [CALL SIGN]. MMSI [MMSI, if available]."</li>
          <li>"MAYDAY [BOAT NAME]"</li>
          <li>"My position is [lat/long or bearing &amp; distance]"</li>
          <li>Nature of distress (e.g. capsize, MOB, fire, sinking)</li>
          <li>Assistance required</li>
          <li>“Two crew in total. [Number] aboard. [Number] in the water.” Give the casualty’s location and condition if known.</li>
          <li>"OVER"</li>
        </ol>
        <p class="callout"><strong>Pan-Pan</strong> is for urgent safety messages without grave and imminent danger. Say “PAN-PAN” three times, “All stations” three times, then your identity, position, situation and help needed. Finish with “Over”.</p>
        <p><strong>DSC distress alert:</strong> use your radio’s instructions before the voice call if possible. Controls and hold times vary; position is only sent correctly if the radio has valid position data.</p>
        <p>Listen for a reply and follow the responding rescue station’s instructions.</p>`,
      ref: 'https://www.yachtingmonthly.com/sailing-skills/how-to-make-a-vhf-radio-mayday-call-pan-pan-call-81832'
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
      body: `<p>For serious illness or injury, contact shore medical support by sat phone and follow your medical kit guidance.</p>
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
        <p class="callout">Practise only while safely resting, not while rowing or keeping watch. Stop if you feel dizzy or uncomfortable.</p>`,
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
      id: 'hatch', title: 'Hatches & Stowage', category: 'Admin', priority: 2, voice: false,
      summary: 'Close cabin hatches after passing through.',
      body: `<p>Keep cabin hatches closed except when moving in or out of the cabin.</p>
        <p>Use the boat’s stowage plan when moving supplies.</p>`,
      ref: 'references/race-rules-wtr-atlantic-2025-v1.0.pdf#page=2'
    },
    {
      id: 'tools', title: 'Essential Kit Access', category: 'Admin', priority: 1, voice: false,
      summary: 'Keep emergency equipment reachable.',
      body: `<p>Keep the bilge pump, medical kit and grab bag accessible. Return equipment to its assigned stowage after use.</p>`,
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
    { id:'clipon', title:'CLIP ON', detail:'Clip your harness and safety line to the boat’s jackstays before leaving the cabin at sea. Both rowers need their own protection.', category:'Safety', crit:true },
    { id:'shiftchange', title:'Shift change — 10 min warning', detail:'10 minutes to handover. Wake the next rower, prep food/layers, keep the boat moving.', category:'Admin', crit:false },
    { id:'watermaker', title:'Run the water maker', detail:'High sun / before a hot day — make water while batteries are charging well.', category:'Maintenance', crit:false },
    { id:'grabbag', title:'Grab-bag check', detail:'Check the bag is stocked and reachable by one rower.', category:'Safety', crit:false },
    { id:'drogue', title:'Drogue / para-anchor plan', detail:'Use your practised boat-specific deployment plan. With only one capable rower, do not rely on a two-person method.', category:'Safety', crit:true },
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
