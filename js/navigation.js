const BOAT_ROUTES = new Set(['wiki', 'checklists', 'reminders', 'feedback', 'shortcuts', 'stars', 'breathe']);
export function primaryTab(name) {
  return BOAT_ROUTES.has(name) ? 'boat' : ['boat', 'log', 'entertain'].includes(name) ? name : 'home';
}

// Deterministic parents also work for cold launches, Siri and manifest shortcuts.
export function parentRoute(name, param = '') {
  if (name === 'procedures') return param ? '#/procedures' : '#/home';
  if (param) {
    if (name === 'wiki' && param.startsWith('official-rules-page-')) return '#/wiki/official-rules';
    return '#/' + name;
  }
  return BOAT_ROUTES.has(name) ? '#/boat' : null;
}

export const EMERGENCY_ROUTES = ['#/procedures', '#/procedures/flow', '#/procedures/4', '#/procedures/12', '#/procedures/5'];
