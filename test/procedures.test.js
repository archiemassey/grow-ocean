import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  PROCEDURES_DOCUMENT, PLAN, FLOW_CHART, emergencyProcedures, otherProcedures,
  getProcedure, boatSections, shoreSections, searchProcedures, withContacts, contactInsertions
} from '../js/procedures.js';

const root = new URL('../', import.meta.url);

test('both official PDFs are present, valid and byte-identical to their recorded hash', async () => {
  for (const doc of [PLAN, FLOW_CHART]) {
    const bytes = await readFile(new URL(doc.file, root));
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', doc.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), doc.sha256, doc.file);
  }
});

test('the plan holds all 19 official procedures with faithful, non-empty steps', () => {
  assert.equal(PLAN.procedures.length, 19);
  const rowingBoat = getProcedure('4');
  assert.equal(rowingBoat.title, 'Rowing Boat Emergency');
  assert.deepEqual(rowingBoat.pageRefs, [4]);
  const boat = boatSections(rowingBoat);
  assert.ok(boat.length >= 1);
  // Verbatim from the source PDF — never reworded.
  assert.equal(boat[0].steps[0], 'Activate 406MHz EPIRB.');
  assert.ok(boat[0].steps.some(s => /Issue Mayday via VHF/.test(s)));
  assert.ok(shoreSections(rowingBoat).length >= 1);
});

test('rower actions come first: every emergency procedure exposes on-boat steps', () => {
  const emerg = emergencyProcedures();
  assert.ok(emerg.length >= 8);
  // Curated order puts the most urgent first.
  assert.equal(emerg[0].id, '4');
  for (const proc of emerg) {
    assert.equal(proc.group, 'emergency');
    assert.ok(proc.hasBoatActions, `${proc.title} should list on-boat actions`);
    assert.ok(boatSections(proc).some(s => s.steps.length), proc.title);
  }
  // Ordering is ascending by curated priority.
  const priorities = emerg.map(p => p.priority);
  assert.deepEqual(priorities, [...priorities].sort((a, b) => a - b));
});

test('plain-language searches resolve to the right procedure via synonyms', () => {
  const cases = {
    'person overboard': '4', 'she\'s in the water': '4', 'mob': '4',
    'taking on water': '12', 'leak': '12',
    'no power': '11', 'batteries dead': '11',
    'radio dead': '9', 'cannot reach anyone': '9',
    'bleeding': '5'
  };
  for (const [query, id] of Object.entries(cases)) {
    const top = searchProcedures(query)[0];
    assert.ok(top, `no match for "${query}"`);
    assert.equal(top.id, id, `"${query}" → §${top.id}, expected §${id}`);
  }
});

test('an empty search returns everything, emergencies first by priority', () => {
  const all = searchProcedures('');
  assert.equal(all.length, 19);
  assert.equal(all[0].id, '4');
  assert.equal(all[0].group, 'emergency');
});

test('the flow chart carries verbatim contacts, ordered steps and valid procedure links', () => {
  assert.ok(FLOW_CHART.contacts.some(c => c.value === '+44 1329 244681'));
  assert.ok(FLOW_CHART.contacts.some(c => c.value === '+1 470-972-3338'));
  assert.equal(FLOW_CHART.emergency.steps[0], 'Activate 406 mHz EPIRB');
  assert.ok(FLOW_CHART.emergency.steps.length >= 8);
  for (const item of FLOW_CHART.nonEmergency)
    assert.ok(getProcedure(item.procId), `non-emergency "${item.problem}" links to missing §${item.procId}`);
});

test('otherProcedures holds the shore/reference sections and never overlaps emergencies', () => {
  const emerg = new Set(emergencyProcedures().map(p => p.id));
  for (const proc of otherProcedures()) assert.ok(!emerg.has(proc.id));
  assert.equal(emergencyProcedures().length + otherProcedures().length, 19);
});

test('contact numbers are inlined where a step says to contact someone, without inventing or duplicating', () => {
  // NMOC number is appended right after the mention.
  assert.equal(
    withContacts('If contact with the Safety Officer has not been possible, contact NMOC.'),
    'If contact with the Safety Officer (call +1 470-972-3338; out-of-hours emergencies only +1 470-972-3389) has not been possible, contact NMOC (call +44 1329 244681).'
  );
  // Safety Officer / Duty Officer both resolve to the DO numbers.
  assert.ok(withContacts('Contact Safety Officer as soon as possible.').includes('+1 470-972-3338'));
  assert.ok(withContacts('contact DO by any means on board').includes('+1 470-972-3389'));
  // Never duplicated when the step already prints the number (verbatim flow chart line).
  const already = 'Contact Duty Officer (DO) +1 470-972-3338.';
  assert.equal(withContacts(already), already);
  // Steps with no contact are untouched.
  assert.equal(withContacts('Activate 406MHz EPIRB.'), 'Activate 406MHz EPIRB.');
});

test('contact insertions expose tap-to-dial numbers and never fire when the number is already printed', () => {
  const pts = contactInsertions('Contact Safety Officer as soon as possible.');
  assert.equal(pts.length, 1);
  assert.equal(pts[0].contact.numbers[0].tel, '+14709723338');
  assert.equal(pts[0].contact.numbers[1].tel, '+14709723389');
  // NMOC resolves to the UK number.
  assert.equal(contactInsertions('If unable, contact NMOC.')[0].contact.numbers[0].tel, '+441329244681');
  // Already-printed number → no insertion (no duplicate link).
  assert.deepEqual(contactInsertions('Contact Duty Officer (DO) +1 470-972-3338.'), []);
  // Plain step → nothing to inline.
  assert.deepEqual(contactInsertions('Activate 406MHz EPIRB.'), []);
});

test('procedures assets and both PDFs are precached for offline use', async () => {
  const sw = await readFile(new URL('service-worker.js', root), 'utf8');
  const entries = [...sw.matchAll(/'(\.\/[^']*)'/g)].map(m => m[1]);
  for (const expected of [
    './js/procedures.js', './js/data/procedures-data.js', './js/views/procedures.js',
    './' + PLAN.file, './' + FLOW_CHART.file])
    assert.ok(entries.includes(expected), expected);
  for (const file of entries) await access(new URL(file, root));
});
