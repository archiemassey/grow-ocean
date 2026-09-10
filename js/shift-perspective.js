export const SHIFT_PERSPECTIVES = Object.freeze([
  { id: 'good-things', text: 'Three good things from this shift — say them out loud.' },
  { id: 'sea-colour', text: 'Notice one colour in the sea or sky, when watch duties allow.' },
  { id: 'home', text: 'Think of someone at home cheering you on.' },
  { id: 'progress', text: 'Name one small sign of progress since departure.' },
  { id: 'finish', text: 'What are you looking forward to at the finish?' }
]);

/* Keep a stable assignment for each real shift, separate from entertainment
   history. A reset/between-shifts render keeps the latest perspective. */
export async function getShiftPerspective(storage, shiftStart, random = Math.random) {
  let selected, shiftKey;
  await storage.updateSetting('shift-perspective-v1', saved => {
    const assignments = saved?.assignments || {};
    const previous = assignments[saved?.latestKey];
    shiftKey = Number.isFinite(shiftStart) && shiftStart > 0
      ? 'shift:' + shiftStart : saved?.latestKey || 'welcome';
    selected = SHIFT_PERSPECTIVES.find(prompt => prompt.id === assignments[shiftKey]);
    if (selected) return saved;
    const choices = SHIFT_PERSPECTIVES.filter(prompt => prompt.id !== previous);
    const index = Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)));
    selected = choices[index];
    return { assignments: { ...assignments, [shiftKey]: selected.id }, latestKey: shiftKey };
  });
  return { ...selected, shiftKey };
}
