/* encouragement.js — warm, British, non-cheesy morale lines for two women rowing
   the Atlantic as a pair. Two pools:
   - HANDOVER_PRAISE fires when a stint finishes — it praises ONLY the rower coming
     OFF the oars. Optional {n}/{h} fold in real totals.
   - STINT_ENCOURAGEMENT fires ~5 minutes into a fresh stint, welcoming and cheering
     on the rower now ON.

   Tokens: {off} outgoing rower, {on} incoming/current rower, {n} total stints so
   far, {h} total hours so far (both pre-formatted strings). Lines are written to
   read fine even if a totals token happens to be absent. */

export const HANDOVER_PRAISE = [
  'Beautifully rowed, {off}. Rest those arms now \u2014 you\u2019ve earned it.',
  'Strong stint, {off}. Head down, get warm and watered.',
  'That\u2019s {n} stints in the bank between you. Cracking work, {off}.',
  '{off}, you held a lovely rhythm out there. Go and refuel.',
  'Clean handover, {off}. Put your feet up and recover.',
  'Every pull counts and you know it. Well rowed, {off}.',
  '{off} done brilliantly \u2014 that\u2019s {h} on the oars across the pair so far.',
  'Smooth as you like, {off}. Rest easy, you\u2019ve done your bit.',
  'Proud of you, {off}. Head down for a proper rest now.',
  '{off}, that was graft and grace. Go and look after yourself.',
  'Another one in the bank, {off}. Nicely done.',
  'You\u2019re a team and it shows. Lovely work, {off} \u2014 rest up.',
  '{off}, you dug in when it mattered. Time to refuel and recover.',
  'Handover sorted, {off}. Get warm, get watered, get comfy.',
  'That\u2019s {n} changeovers nailed together. Top rowing, {off}.',
  '{off}, you made that look easy (it isn\u2019t). Rest well.'
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
