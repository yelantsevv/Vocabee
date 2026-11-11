import { createRoot } from 'react-dom/client';
import { DictionaryPage } from './DictionaryPage.jsx';
import { normalizeDictionaryTheme } from './utils/settings.js';

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const appBasePath = new URL(import.meta.env.BASE_URL, window.location.origin);
  const serviceWorkerUrl = new URL('service-worker.js', appBasePath);
  const serviceWorkerOptions = { scope: appBasePath.pathname };
  let prefersOnline = false;
  try {
    prefersOnline = JSON.parse(localStorage.getItem('vocabee-settings') || '{}').workOnline === true;
  } catch {
    // Keep offline support enabled if preferences are unavailable.
  }
  if (prefersOnline) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations
        .filter((registration) => registration.scope === appBasePath.href)
        .forEach((registration) => registration.unregister());
    });
  } else {
    navigator.serviceWorker.register(serviceWorkerUrl.href, serviceWorkerOptions)
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        const worker = registration.active || registration.waiting || registration.installing;
        worker?.postMessage({ type: 'CACHE_APP_SHELL' });
      })
      .catch((error) => console.error('Vocabee: could not enable offline mode', error));
  }
}

try {
  const settings = JSON.parse(localStorage.getItem('vocabee-settings') || '{}');
  if (settings.theme) {
    document.documentElement.dataset.dictionaryTheme = normalizeDictionaryTheme(settings.theme);
  }
  document.documentElement.lang = 'ru';
  document.title = 'Мой словарь — Vocabee';
} catch {
  // Use the default theme if saved settings are unavailable.
}

createRoot(document.getElementById('root')).render(<DictionaryPage />);
