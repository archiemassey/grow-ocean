/* schedule.js — the day / night rowing schedule screen with offline QR sync.

   What it does, in plain English:
   - Two sliders set the NIGHT stint length (one long rest each) and the DAY stint
     length. A third "balance" slider shares the rowing time if one rower is stronger.
   - The maths (shift-schedule.js) guarantees each rower's daily total equals her
     balance share of 24h, whatever the slider lengths are — fairness is automatic.
   - The agreed schedule is shown as a QR code. The partner scans it with the in-app
     camera (no network, no wifi, no cloud) and both phones then compute identical
     handovers from the shared settings plus the phone clock.
   - Wake-up alarms (.ics) can be clocked off the schedule for real lock-screen alerts.

   Both rowers stay awake and decide changes together, then re-sync by QR — there is no
   silent push from one phone to the other. */

import { h, toast, shareOrDownload } from '../app.js';
import { shiftStore } from '../shift-state.js';
import { computeSchedule, formatHours } from '../shift-schedule.js';
import { encodeSchedulePayload, decodeSchedulePayload } from '../shift-qr.js';
import { buildScheduleICS } from '../shift-ics.js';
import qrcode from '../vendor/qrcode.js';
import jsQR from '../vendor/jsqr.js';

const mins = n => Math.round(n) + ' min';
const timeLabel = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

export async function renderSchedule(view, param, signal) {
  await shiftStore.refresh().catch(() => {});
  if (signal?.aborted) return;
  const saved = shiftStore.snapshot().state || {};

  /* ---- controls ---- */
  const toggle = h('input', { type: 'checkbox', id: 'schedOn', ...(saved.scheduleOn ? { checked: true } : {}) });

  const slider = (id, label, min, max, step, value, fmt) => {
    const input = h('input', { type: 'range', id, min: String(min), max: String(max), step: String(step),
      value: String(value), 'aria-label': label });
    const out = h('span', { class: 'bx-val' }, fmt(value));
    input.addEventListener('input', () => { out.textContent = fmt(+input.value); updatePreview(); renderQR(); });
    return { row: h('label', { class: 'bx-slider sched-slider' }, [h('span', {}, label), input, out]), input };
  };

  const nightStartInput = h('input', { type: 'time', id: 'schedNightStart',
    value: timeLabel(Number.isFinite(saved.nightStartMin) ? saved.nightStartMin : 1200) });
  nightStartInput.addEventListener('input', () => { updatePreview(); renderQR(); });

  const nightS = slider('schedNight', 'Night stint (one each)', 30, 300, 15,
    Number.isFinite(saved.nightShiftMin) ? saved.nightShiftMin : 180, v => formatHours(v));
  const dayS = slider('schedDay', 'Day stint (target)', 20, 180, 5,
    Number.isFinite(saved.dayShiftMin) ? saved.dayShiftMin : 90, v => mins(v));
  const splitS = slider('schedSplit', 'Balance (Rower 1 share)', 35, 65, 5,
    Number.isFinite(saved.splitPct) ? saved.splitPct : 50,
    v => 'R1 ' + v + '% / R2 ' + (100 - v) + '%');

  function currentInputs() {
    const [hh, mm] = (nightStartInput.value || '20:00').split(':').map(n => parseInt(n, 10) || 0);
    return {
      splitPct: +splitS.input.value,
      nightShiftMin: +nightS.input.value,
      dayShiftMin: +dayS.input.value,
      nightStartMin: hh * 60 + mm
    };
  }

  /* ---- live preview ---- */
  const totalsEl = h('div', { class: 'sched-totals', 'aria-live': 'polite' });
  const detailEl = h('p', { class: 'hint' });
  function updatePreview() {
    const sched = computeSchedule(currentInputs());
    const r1 = formatHours(sched.perRowerMin['Rower 1']);
    const r2 = formatHours(sched.perRowerMin['Rower 2']);
    const even = Math.abs(sched.perRowerMin['Rower 1'] - sched.perRowerMin['Rower 2']) < 1;
    totalsEl.replaceChildren(
      h('strong', {}, 'Rower 1 ' + r1), h('span', {}, ' · '),
      h('strong', {}, 'Rower 2 ' + r2), h('span', {}, ' ' + (even ? '✓ even' : '· chosen split')));
    const dayStints = sched.dayPairs * 2;
    detailEl.textContent =
      'Night: one stint each — R1 ' + formatHours(sched.nightShiftActual['Rower 1']) +
      ' / R2 ' + formatHours(sched.nightShiftActual['Rower 2']) + '. ' +
      'Day: ' + dayStints + ' stints — R1 ' + mins(sched.dayShiftActual['Rower 1']) +
      ' / R2 ' + mins(sched.dayShiftActual['Rower 2']) + '. ' +
      'Night starts ' + timeLabel(sched.nightStartMin) + '.';
  }

  /* ---- QR share ---- */
  const qrBox = h('div', { class: 'sched-qr', role: 'img', 'aria-label': 'Schedule QR code' });
  function renderQR() {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(encodeSchedulePayload(currentInputs()));
      qr.make();
      qrBox.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
    } catch { qrBox.textContent = 'Could not build the QR code.'; }
  }

  /* ---- QR scan (in-app camera) ---- */
  const video = h('video', { class: 'sched-cam', playsinline: '', muted: '' });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const scanPanel = h('div', { class: 'sched-scan', hidden: true });
  const scanHint = h('p', { class: 'hint' }, 'Point the camera at your partner’s QR code.');
  let stream = null, raf = 0;

  function stopScan() {
    cancelAnimationFrame(raf); raf = 0;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    video.srcObject = null;
    scanPanel.hidden = true;
  }
  function tick() {
    if (!stream) return;
    if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const res = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (res && res.data) { applyScanned(res.data); return; }
    }
    raf = requestAnimationFrame(tick);
  }
  async function startScan() {
    if (!navigator.mediaDevices?.getUserMedia) { toast('Camera is not available on this device.'); return; }
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
    catch { toast('Camera blocked. Allow camera access, or import the schedule file instead.'); return; }
    scanPanel.hidden = false;
    video.srcObject = stream;
    try { await video.play(); } catch { /* iOS resumes on the next frame */ }
    tick();
  }
  async function applyScanned(text) {
    const parsed = decodeSchedulePayload(text);
    stopScan();
    if (!parsed) { toast('That QR is not a gROW Ocean schedule.'); return; }
    splitS.input.value = String(parsed.splitPct); splitS.input.dispatchEvent(new Event('input'));
    nightS.input.value = String(parsed.nightShiftMin); nightS.input.dispatchEvent(new Event('input'));
    dayS.input.value = String(parsed.dayShiftMin); dayS.input.dispatchEvent(new Event('input'));
    nightStartInput.value = timeLabel(parsed.nightStartMin);
    toggle.checked = true;
    await save('Schedule received from partner and saved.');
  }

  /* ---- persist ---- */
  async function save(message = 'Schedule saved') {
    try {
      await shiftStore.setSchedule({ ...currentInputs(), scheduleOn: toggle.checked });
      updatePreview(); renderQR();
      toast(message);
    } catch { toast('Could not save the schedule — storage unavailable.'); }
  }

  const saveBtn = h('button', { class: 'btn', onclick: () => save('Schedule saved & re-calculated') }, '✓ Save & re-calc');
  const shareBtn = h('button', { class: 'btn small secondary', onclick: async () => {
    const shared = await shareOrDownload('grow-ocean-schedule.json',
      encodeSchedulePayload(currentInputs()), 'application/json');
    if (shared) toast('Schedule file shared — your partner can import it if scanning fails.');
  } }, 'Share as file (backup)');
  const scanBtn = h('button', { class: 'btn small secondary', onclick: () => (stream ? stopScan() : startScan()) }, '📷 Scan partner’s QR');
  const alarmsBtn = h('button', { class: 'btn small secondary', onclick: async () => {
    const ics = buildScheduleICS(currentInputs(), { count: 16, leadMin: 10 });
    const shared = await shareOrDownload('grow-ocean-schedule-alarms.ics', ics, 'text/calendar');
    if (shared) toast('Schedule alarms ready — open the file to add them to Calendar.');
  } }, '⏰ Schedule wake-up alarms (.ics)');

  scanPanel.append(video, scanHint, h('button', { class: 'btn small ghost', onclick: stopScan }, 'Close camera'));
  signal?.addEventListener('abort', stopScan, { once: true });

  view.append(
    h('section', { class: 'card' }, [
      h('h3', {}, '🗓️ Day / night schedule'),
      h('p', {}, 'Set the stint lengths together, then sync the plan to the other phone by QR. ' +
        'Fair shares are automatic: each rower always rows her balance share of every 24 hours.'),
      h('label', { class: 'switch-row' }, [
        h('span', { class: 'switch' }, [toggle, h('span', { class: 'slider' })]),
        h('span', {}, 'Use this schedule to drive the shift timer & alarms')
      ]),
      nightS.row, dayS.row, splitS.row,
      h('label', { class: 'sched-field' }, [h('span', {}, 'Night starts at'), nightStartInput]),
      totalsEl, detailEl,
      h('div', { class: 'btnrow' }, [saveBtn])
    ]),
    h('section', { class: 'card' }, [
      h('h3', {}, '🔗 Sync to the other phone'),
      h('p', { class: 'hint' }, 'Show this code on one phone and scan it on the other. Works fully offline — no wifi or signal needed.'),
      qrBox,
      h('div', { class: 'btnrow' }, [scanBtn, shareBtn]),
      scanPanel
    ]),
    h('section', { class: 'card' }, [
      h('h3', {}, '⏰ Wake-ups from the schedule'),
      h('p', { class: 'hint' }, 'Adds iPhone Calendar alerts 10 min before each handover, clocked off this schedule. Re-share after changing it.'),
      h('div', { class: 'btnrow' }, [alarmsBtn])
    ])
  );

  updatePreview();
  renderQR();
}
