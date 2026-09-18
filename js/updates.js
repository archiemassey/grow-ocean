/* Updates never reload a working screen. Only the crew's confirmed action does. */
export const APP_RELEASE = 'grow-ocean-v10';
export let checkForUpdates = async () => 'Updates are unavailable in this browser or native shell.';

export function initAppUpdates({
  serviceWorker = navigator.serviceWorker,
  document = window.document,
  location = window.location,
  confirm = message => window.confirm(message)
} = {}) {
  if (!serviceWorker) return;
  const banner = document.getElementById('updateBanner');
  const message = document.getElementById('updateMessage');
  const reload = document.getElementById('updateReload');
  let ready = false, registration, registering;
  const watched = new WeakSet();

  function show(text, canReload = false) {
    banner.hidden = false;
    message.textContent = text;
    reload.disabled = !canReload;
  }
  function updateReady() {
    ready = true;
    show('Offline app ready. Save recordings and any unsaved forms before reloading to use the installed release.', true);
  }
  serviceWorker.addEventListener('controllerchange', updateReady);
  reload.addEventListener('click', () => {
    if (ready && confirm('Have you stopped AND saved all recordings and saved your forms? Reloading discards anything unsaved. Reload now?'))
      location.reload();
  });

  function watch(worker) {
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    const changed = () => {
      if (worker.state === 'installing')
        show('Downloading an offline app update. Keep this app open; your current screen will not reload.');
      if (worker.state === 'installed' || worker.state === 'activating')
        show('Offline update downloaded; activating. Your current screen will not reload.');
      if (worker.state === 'activated') updateReady();
      if (worker.state === 'redundant' && !ready)
        show('Update download did not complete. Your previous offline app and saved data are unchanged. Try Check for updates on Home when online.');
    };
    worker.addEventListener('statechange', changed);
    changed();
  }
  async function register() {
    if (!registering) {
      registering = serviceWorker.register('./service-worker.js', { updateViaCache: 'none' })
        .then(result => {
          registration = result;
          registration.addEventListener('updatefound', () => watch(registration.installing));
          watch(registration.installing);
          watch(registration.waiting);
          return result;
        }).catch(error => { registering = null; throw error; });
    }
    return registering;
  }
  checkForUpdates = async () => {
    try {
      await register();
      await registration.update();
      if (ready) return 'An offline release is ready. Save your work, then use the reload banner.';
      if (registration.installing || registration.waiting) return 'Update downloading or activating. Wait for the reload banner.';
      banner.hidden = true;
      return `No newer release found. Running ${APP_RELEASE}.`;
    } catch {
      return 'Could not check for updates. Reconnect and try again; the installed offline copy and saved data are unchanged.';
    }
  };
  register().catch(() => {
    show('Offline download/update check unavailable. Connect and use Check for updates on Home. Existing saved data is unchanged.');
  });
}
