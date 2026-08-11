/* Log export helpers. The export deliberately includes only log fields and
   voice notes linked from those logs; other on-device app data stays private. */

const EXPORT_SCHEMA_VERSION = 1;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * @typedef {Object} StoredLog
 * @property {string} id
 * @property {string} type
 * @property {string} typeTitle
 * @property {string} icon
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

function cleanData(data, logId) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('Log ' + logId + ' data must be an object');
  }

  return Object.fromEntries(Object.entries(data).map(([key, value]) => {
    if (typeof value !== 'string') {
      throw new TypeError('Log ' + logId + ' field ' + key + ' must be a string');
    }
    return [key, value];
  }));
}

function bytesToBase64(bytes) {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const first = bytes[i];
    const second = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const third = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const combined = (first << 16) | (second << 8) | third;

    output += BASE64_ALPHABET[(combined >> 18) & 63];
    output += BASE64_ALPHABET[(combined >> 12) & 63];
    output += i + 1 < bytes.length ? BASE64_ALPHABET[(combined >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? BASE64_ALPHABET[combined & 63] : '=';
  }
  return output;
}

/**
 * Builds a portable export while selecting an explicit allowlist of fields.
 * @param {StoredLog[]} logs
 * @param {(id: string) => Promise<StoredVoiceNote|undefined>} loadVoiceNote
 * @param {Date} exportedAt
 */
export async function createLogExport(logs, loadVoiceNote, exportedAt = new Date()) {
  if (!Array.isArray(logs)) throw new TypeError('Logs must be an array');

  const orderedLogs = [...logs].sort((a, b) => a.ts - b.ts);
  const exportedLogs = [];

  for (const log of orderedLogs) {
    if (!log || typeof log !== 'object') throw new TypeError('Each log must be an object');
    const id = requireString(log.id, 'Log id');
    let voiceNote = null;

    if (log.voiceId != null) {
      const voiceId = requireString(log.voiceId, 'Log ' + id + ' voice id');
      const note = await loadVoiceNote(voiceId);
      if (!note || !(note.blob instanceof Blob)) {
        throw new Error('Voice note ' + voiceId + ' linked from log ' + id + ' is unavailable');
      }
      const audioBytes = new Uint8Array(await note.blob.arrayBuffer());
      voiceNote = {
        id: requireString(note.id, 'Voice note id'),
        timestamp: toIsoTimestamp(note.ts, 'Voice note timestamp'),
        mimeType: note.blob.type || 'application/octet-stream',
        byteLength: note.blob.size,
        dataBase64: bytesToBase64(audioBytes)
      };
    }

    exportedLogs.push({
      id,
      type: requireString(log.type, 'Log ' + id + ' type'),
      title: requireString(log.typeTitle, 'Log ' + id + ' title'),
      icon: requireString(log.icon, 'Log ' + id + ' icon'),
      timestamp: toIsoTimestamp(log.ts, 'Log ' + id + ' timestamp'),
      data: cleanData(log.data, id),
      voiceNote
    });
  }

  return {
    application: 'gROW Ocean',
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: toIsoTimestamp(exportedAt, 'Export timestamp'),
    logs: exportedLogs
  };
}

export function makeLogExportFilename(date = new Date()) {
  const timestamp = toIsoTimestamp(date, 'Export timestamp')
    .replace(/\.\d{3}Z$/, 'Z')
    .replaceAll(':', '-');
  return 'grow-ocean-logs-' + timestamp + '.json';
}

export function downloadLogExport({ json, filename }) {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
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
 * @param {(download: {json: string, filename: string}) => void|Promise<void>} [options.download]
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

    onStatus({ kind: 'working', message: 'Preparing export…' });
    const exportDate = now();
    const payload = await createLogExport(logs, loadVoiceNote, exportDate);
    const filename = makeLogExportFilename(exportDate);
    await download({ json: JSON.stringify(payload, null, 2), filename });

    const message = 'Exported ' + logs.length + (logs.length === 1 ? ' log.' : ' logs.');
    onStatus({ kind: 'success', message });
    return { status: 'exported', count: logs.length, filename };
  } catch (error) {
    const message = 'Export failed. Your logs are still stored on this device.';
    onStatus({ kind: 'error', message, error });
    return { status: 'error', error };
  }
}
