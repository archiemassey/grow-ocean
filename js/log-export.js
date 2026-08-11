/* Log export helpers. The CSV deliberately includes only known log fields and
   compact metadata for linked voice notes; other on-device app data stays private. */

const DATA_COLUMNS = [
  ['Rower', 'rower'],
  ['Physical State', 'state'],
  ['Sleep Minutes', 'sleep'],
  ['Notes', 'notes'],
  ['Weather', 'weather'],
  ['Wind / Wave Direction', 'wind'],
  ['Bearing / Heading', 'bearing'],
  ['Hazards / Traffic', 'hazards'],
  ['Patient', 'who'],
  ['Symptom / Injury', 'symptom'],
  ['Vitals', 'vitals'],
  ['Medication Given', 'meds'],
  ['Review Hours', 'review'],
  ['Journal Title', 'title'],
  ['Audience', 'audience']
];

export const CSV_HEADERS = [
  'Timestamp (UTC)',
  'Log ID',
  'Log Type',
  'Log Title',
  ...DATA_COLUMNS.map(([header]) => header),
  'Voice Note',
  'Voice Note ID',
  'Voice Note Timestamp (UTC)',
  'Voice Note MIME Type',
  'Voice Note Bytes'
];

/**
 * @typedef {Object} StoredLog
 * @property {string} id
 * @property {string} type
 * @property {string} typeTitle
 * @property {Record<string, string>} data
 * @property {string|null} voiceId
 * @property {number} ts
 */

/**
 * @typedef {Object} StoredVoiceNote
 * @property {string} id
 * @property {Blob} blob
 * @property {number} ts
 */

function toIsoTimestamp(value, label) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(label + ' must be a valid timestamp');
  return date.toISOString();
}

function requireString(value, label) {
  if (typeof value !== 'string') throw new TypeError(label + ' must be a string');
  return value;
}

function logField(log, key) {
  if (!log.data || typeof log.data !== 'object' || Array.isArray(log.data)) {
    throw new TypeError('Log ' + log.id + ' data must be an object');
  }
  const value = log.data[key];
  if (value == null) return '';
  if (typeof value !== 'string') {
    throw new TypeError('Log ' + log.id + ' field ' + key + ' must be a string');
  }
  return value;
}

function formulaSafe(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

export function escapeCsvCell(value) {
  const text = formulaSafe(value);
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

function csvRow(values) {
  return values.map(escapeCsvCell).join(',');
}

async function voiceColumns(log, loadVoiceNote) {
  if (log.voiceId == null) return ['no', '', '', '', ''];

  const voiceId = requireString(log.voiceId, 'Log ' + log.id + ' voice id');
  const note = await loadVoiceNote(voiceId);
  if (!note) return ['missing', voiceId, '', '', ''];
  if (!note.blob || typeof note.blob.size !== 'number' || typeof note.blob.type !== 'string') {
    throw new TypeError('Voice note ' + voiceId + ' has invalid audio data');
  }

  return [
    'yes',
    requireString(note.id, 'Voice note id'),
    toIsoTimestamp(note.ts, 'Voice note timestamp'),
    note.blob.type || 'application/octet-stream',
    note.blob.size
  ];
}

/**
 * Creates an Excel-compatible CSV from an explicit allowlist of log fields.
 * @param {StoredLog[]} logs
 * @param {(id: string) => Promise<StoredVoiceNote|undefined>} loadVoiceNote
 */
export async function createLogCsv(logs, loadVoiceNote) {
  if (!Array.isArray(logs)) throw new TypeError('Logs must be an array');

  const rows = [csvRow(CSV_HEADERS)];
  const orderedLogs = [...logs].sort((a, b) => a.ts - b.ts);

  for (const log of orderedLogs) {
    if (!log || typeof log !== 'object') throw new TypeError('Each log must be an object');
    const id = requireString(log.id, 'Log id');
    const row = [
      toIsoTimestamp(log.ts, 'Log ' + id + ' timestamp'),
      id,
      requireString(log.type, 'Log ' + id + ' type'),
      requireString(log.typeTitle, 'Log ' + id + ' title'),
      ...DATA_COLUMNS.map(([, key]) => logField(log, key)),
      ...await voiceColumns(log, loadVoiceNote)
    ];
    rows.push(csvRow(row));
  }

  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}

export function makeLogExportFilename(date = new Date()) {
  const timestamp = toIsoTimestamp(date, 'Export timestamp')
    .replace(/\.\d{3}Z$/, 'Z')
    .replaceAll(':', '-');
  return 'grow-ocean-logs-' + timestamp + '.csv';
}

export function downloadLogExport({ csv, filename }) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Runs the user-facing export action and reports every state for the UI.
 * @param {Object} options
 * @param {() => Promise<StoredLog[]>} options.loadLogs
 * @param {(id: string) => Promise<StoredVoiceNote|undefined>} options.loadVoiceNote
 * @param {(download: {csv: string, filename: string}) => void|Promise<void>} [options.download]
 * @param {() => Date} [options.now]
 * @param {(state: {kind: string, message: string, error?: unknown}) => void} [options.onStatus]
 */
export async function runLogExport({
  loadLogs,
  loadVoiceNote,
  download = downloadLogExport,
  now = () => new Date(),
  onStatus = () => {}
}) {
  try {
    const logs = await loadLogs();
    if (!logs.length) {
      const message = 'No logs to export yet.';
      onStatus({ kind: 'empty', message });
      return { status: 'empty', count: 0 };
    }

    onStatus({ kind: 'working', message: 'Preparing CSV...' });
    const exportDate = now();
    const csv = await createLogCsv(logs, loadVoiceNote);
    const filename = makeLogExportFilename(exportDate);
    await download({ csv, filename });

    const message = 'Exported ' + logs.length + (logs.length === 1 ? ' log to CSV.' : ' logs to CSV.');
    onStatus({ kind: 'success', message });
    return { status: 'exported', count: logs.length, filename };
  } catch (error) {
    const message = 'CSV export failed. Your logs are still stored on this device.';
    onStatus({ kind: 'error', message, error });
    return { status: 'error', error };
  }
}
