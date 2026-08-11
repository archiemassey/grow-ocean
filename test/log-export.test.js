import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLogExport,
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
    data: { symptom: 'Headache', severity: '2' },
    voiceId: null,
    ts: Date.parse('2026-08-11T07:00:00Z'),
    ...overrides
  };
}

test('serializes all logs chronologically with linked voice audio only', async () => {
  const requestedVoiceNotes = [];
  const payload = await createLogExport([
    log({ id: 'later', ts: Date.parse('2026-08-11T07:30:00Z'), internal: 'do not export' }),
    log({ id: 'earlier', voiceId: 'voice-1', ts: Date.parse('2026-08-11T06:30:00Z') })
  ], async (id) => {
    requestedVoiceNotes.push(id);
    return {
      id,
      ts: Date.parse('2026-08-11T06:31:00Z'),
      blob: new Blob(['voice audio'], { type: 'audio/webm' }),
      internal: 'do not export'
    };
  }, EXPORT_DATE);

  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.exportedAt, '2026-08-11T08:07:21.535Z');
  assert.deepEqual(payload.logs.map(({ id }) => id), ['earlier', 'later']);
  assert.deepEqual(requestedVoiceNotes, ['voice-1']);
  assert.deepEqual(payload.logs[0].voiceNote, {
    id: 'voice-1',
    timestamp: '2026-08-11T06:31:00.000Z',
    mimeType: 'audio/webm',
    byteLength: 11,
    dataBase64: 'dm9pY2UgYXVkaW8='
  });
  assert.equal(payload.logs[0].internal, undefined);
  assert.equal(payload.logs[0].voiceNote.internal, undefined);
});

test('creates a filesystem-safe timestamped JSON filename', () => {
  assert.equal(
    makeLogExportFilename(EXPORT_DATE),
    'grow-ocean-logs-2026-08-11T08-07-21Z.json'
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

test('downloads serialized logs and reports working and success states', async () => {
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
  assert.equal(download.filename, 'grow-ocean-logs-2026-08-11T08-07-21Z.json');
  assert.equal(JSON.parse(download.json).logs[0].id, 'log-1');
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
