import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CSV_HEADERS,
  createLogCsv,
  escapeCsvCell,
  makeLogExportFilename,
  runLogExport
} from '../js/log-export.js';

const EXPORT_DATE = new Date('2026-08-11T08:07:21.535Z');

function log(overrides = {}) {
  return {
    id: 'log-1',
    type: 'medical',
    typeTitle: 'Medical log',
    icon: 'M',
    data: { symptom: 'Headache', review: '2' },
    voiceId: null,
    ts: Date.parse('2026-08-11T07:00:00Z'),
    ...overrides
  };
}

test('keeps a stable allowlisted CSV column contract', () => {
  assert.deepEqual(CSV_HEADERS, [
    'Timestamp (UTC)',
    'Log ID',
    'Log Type',
    'Log Title',
    'Rower',
    'Physical State',
    'Sleep Minutes',
    'Notes',
    'Weather',
    'Wind / Wave Direction',
    'Bearing / Heading',
    'Hazards / Traffic',
    'Patient',
    'Symptom / Injury',
    'Vitals',
    'Medication Given',
    'Review Hours',
    'Journal Title',
    'Audience',
    'Voice Note',
    'Voice Note ID',
    'Voice Note Timestamp (UTC)',
    'Voice Note MIME Type',
    'Voice Note Bytes'
  ]);
});

test('creates chronological CSV with allowlisted fields and compact voice metadata', async () => {
  const requestedVoiceNotes = [];
  const csv = await createLogCsv([
    log({
      id: 'later',
      ts: Date.parse('2026-08-11T07:30:00Z'),
      data: { notes: 'Later entry', secret: 'do not export' },
      internal: 'do not export'
    }),
    log({
      id: 'earlier',
      voiceId: 'voice-1',
      ts: Date.parse('2026-08-11T06:30:00Z'),
      data: { symptom: 'Pain, "sharp"\nWorse', meds: '=unsafe formula' }
    })
  ], async (id) => {
    requestedVoiceNotes.push(id);
    return {
      id,
      ts: Date.parse('2026-08-11T06:31:00Z'),
      blob: new Blob(['voice audio'], { type: 'audio/webm' }),
      internal: 'do not export'
    };
  });

  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.match(csv, /^﻿Timestamp \(UTC\),Log ID,Log Type,Log Title,/);
  assert.ok(csv.indexOf(',earlier,') < csv.indexOf(',later,'));
  assert.match(csv, /"Pain, ""sharp""\nWorse"/);
  assert.match(csv, /'=unsafe formula/);
  assert.match(csv, /,yes,voice-1,2026-08-11T06:31:00\.000Z,audio\/webm,11\r\n/);
  assert.doesNotMatch(csv, /secret|do not export|dataBase64|voice audio/);
  assert.deepEqual(requestedVoiceNotes, ['voice-1']);
});

test('properly escapes CSV commas, quotes, newlines, and formulas', () => {
  assert.equal(escapeCsvCell('plain'), 'plain');
  assert.equal(escapeCsvCell('a,b'), '"a,b"');
  assert.equal(escapeCsvCell('say "hello"'), '"say ""hello"""');
  assert.equal(escapeCsvCell('two\nlines'), '"two\nlines"');
  assert.equal(escapeCsvCell('=1+1'), "'=1+1");
});

test('marks an unavailable linked voice note without failing the log export', async () => {
  const csv = await createLogCsv(
    [log({ voiceId: 'missing-voice' })],
    async () => undefined
  );

  assert.match(csv, /,missing,missing-voice,,,\r\n$/);
});

test('creates a filesystem-safe timestamped CSV filename', () => {
  assert.equal(
    makeLogExportFilename(EXPORT_DATE),
    'grow-ocean-logs-2026-08-11T08-07-21Z.csv'
  );
});

test('reports an empty state without starting a download', async () => {
  const statuses = [];
  let downloaded = false;

  const result = await runLogExport({
    loadLogs: async () => [],
    loadVoiceNote: async () => undefined,
    download: async () => { downloaded = true; },
    onStatus: (status) => statuses.push(status)
  });

  assert.deepEqual(result, { status: 'empty', count: 0 });
  assert.equal(downloaded, false);
  assert.deepEqual(statuses, [{ kind: 'empty', message: 'No logs to export yet.' }]);
});

test('downloads CSV and reports working and success states', async () => {
  const statuses = [];
  let download;

  const result = await runLogExport({
    loadLogs: async () => [log()],
    loadVoiceNote: async () => undefined,
    download: async (value) => { download = value; },
    now: () => EXPORT_DATE,
    onStatus: (status) => statuses.push(status)
  });

  assert.equal(result.status, 'exported');
  assert.equal(result.count, 1);
  assert.equal(download.filename, 'grow-ocean-logs-2026-08-11T08-07-21Z.csv');
  assert.match(download.csv, /,log-1,medical,Medical log,/);
  assert.deepEqual(statuses.map(({ kind }) => kind), ['working', 'success']);
});

test('reports export errors without producing a success result', async () => {
  const statuses = [];
  const failure = new Error('database unavailable');

  const result = await runLogExport({
    loadLogs: async () => { throw failure; },
    loadVoiceNote: async () => undefined,
    onStatus: (status) => statuses.push(status)
  });

  assert.equal(result.status, 'error');
  assert.equal(result.error, failure);
  assert.equal(statuses.at(-1).kind, 'error');
  assert.match(statuses.at(-1).message, /logs are still stored/i);
});
