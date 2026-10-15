/* encouragement.js — warm, British, non-cheesy morale lines for two women rowing
   the Atlantic as a pair. Two pools:
   - HANDOVER_PRAISE fires when a stint finishes (the rower coming OFF the oars is
     praised, the one going ON is welcomed). Optional {n}/{h} fold in real totals.
   - STINT_ENCOURAGEMENT fires ~5 minutes into a fresh stint, for the rower now ON.

   Tokens: {off} outgoing rower, {on} incoming/current rower, {n} total stints so
   far, {h} total hours so far (both pre-formatted strings). Lines are written to
   read fine even if a totals token happens to be absent. */

export const HANDOVER_PRAISE = [
  'Beautifully rowed, {off}. {on}, she kept her steady — over to you.',
  'Strong stint, {off}. Rest those arms. {on}, the boat\u2019s yours now.',
  'That\u2019s {n} stints between you now. Cracking work, {off} — {on}, your turn.',
  '{off}, you held a lovely rhythm out there. {on}, pick it up and keep her tracking.',
  'Clean handover. {off}, go and refuel; {on}, ease in and find your stroke.',
  'Every pull counts and you both know it. Well rowed, {off}. {on}, you\u2019ve got this.',
  '{off} done brilliantly. That\u2019s {h} on the oars across the pair so far.',
  'Smooth as you like, {off}. {on}, settle in — no need to chase it.',
  'Proud of you both. {off}, head down for a rest; {on}, head up and row.',
  '{off}, that was graft and grace. {on}, carry it on — short strokes, strong finish.',
  'Another one in the bank. {off}, nicely done; {on}, the Atlantic\u2019s waiting.',
  'You\u2019re a team and it shows. Lovely work, {off}. {on}, over to you, pal.',
  '{off}, you dug in when it mattered. {on}, keep her pointing at home.',
  'Handover sorted. {off}, get warm and watered; {on}, find that easy power.',
  'That\u2019s {n} changeovers nailed together. Top rowing, {off}. {on}, away you go.',
  '{off}, you made that look easy (it isn\u2019t). {on}, your moment \u2014 enjoy it.'
];

export const STINT_ENCOURAGEMENT = [
  '{on}, you\u2019re five in and settled \u2014 lovely. Keep that rhythm.',
  'Looking strong, {on}. Long and steady beats fast and frantic.',
  '{on}, every stroke is a few more metres home. Keep her tracking.',
  'You\u2019ve found your stroke, {on}. Breathe, relax the grip, keep pulling.',
  '{on}, your pair\u2019s resting easy because you\u2019ve got this. Nicely done.',
  'Halfway thoughts? Not yet, {on} \u2014 just this stroke, then the next.',
  '{on}, the sea\u2019s big but so is your heart. Steady on.',
  'Good tempo, {on}. Drop the shoulders and let the legs do the work.',
  '{on}, you\u2019re doing the hard yards so she can sleep. That\u2019s teamwork.',
  'Strong and smooth, {on}. The horizon\u2019s coming to you.',
  '{on}, little sips, steady pulls \u2014 you\u2019re eating into the miles.',
  'That\u2019s it, {on}. Find the catch, finish clean, repeat.',
  '{on}, you\u2019re stronger than this ocean today. Keep going.',
  'Settle and send, {on}. No hero strokes needed \u2014 just honest ones.',
  '{on}, your future self (and your pair) says thank you. Keep rowing.',
  'Eyes soft, {on}, hands loose, legs strong. You\u2019re doing grand.'
];

export function fillMessage(tpl, data = {}) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (data[k] != null ? String(data[k]) : m));
}

/* Rotate through a pool without repeating until exhausted, persisting the pointer in
   localStorage (guarded — absent under node/tests, where it simply starts at 0). */
export function nextCycleIndex(key, len) {
  if (!len) return 0;
  let i = 0;
  try {
    const store = typeof localStorage !== 'undefined' ? localStorage : null;
    if (store) {
      i = (Number(store.getItem(key)) || 0) % len;
      store.setItem(key, String((i + 1) % len));
    }
  } catch { /* storage blocked — fall back to 0 */ }
  return i;
}
