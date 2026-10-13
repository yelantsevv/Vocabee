const CHANNEL = 'VOCABEE_LOCAL_DICTIONARY';
const SETTINGS_KEY = 'vocabee-settings';

let nextRequestId = 0;

function requestExtension(action, payload = {}, timeout = 1500) {
  return new Promise((resolve, reject) => {
    const id = `vocabee-${Date.now()}-${nextRequestId++}`;
    const onMessage = (event) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (message?.channel !== CHANNEL || message.type !== 'RESPONSE' || message.id !== id) return;

      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(message.error));
      else resolve(message.result);
    };

    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error(
        'Нет ответа от расширения. Перезагрузите Vocabee на странице chrome://extensions, затем обновите страницу словаря.'
      ));
    }, timeout);

    window.addEventListener('message', onMessage);
    window.postMessage({ channel: CHANNEL, type: 'REQUEST', id, action, ...payload }, window.location.origin);
  });
}

function sendExtensionMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
      } else if (!response?.ok) {
        reject(new Error(response?.error || 'Расширение не выполнило запрос.'));
      } else {
        resolve(response);
      }
    });
  });
}

export async function deleteExtensionIndexedDatabase(databaseName) {
  return requestExtension('DELETE_INDEXED_DATABASE', { databaseName }, 5000);
}

export async function getExtensionIndexedDatabases() {
  return requestExtension('LIST_INDEXED_DATABASES', {}, 5000);
}

export async function getMyVocabularyEntries() {
  if (window.location.protocol === 'chrome-extension:' && globalThis.chrome?.runtime?.sendMessage) {
    const response = await sendExtensionMessage({ type: 'GET_MY_VOCABEE_DICTIONARY' });
    return response.entries;
  }
  return requestExtension('GET_MY_VOCABEE_DICTIONARY', {}, 5000);
}

export async function deleteMyVocabularyEntry(entry) {
  if (window.location.protocol === 'chrome-extension:' && globalThis.chrome?.runtime?.sendMessage) {
    const response = await sendExtensionMessage({ type: 'DELETE_MY_VOCABEE_ENTRY', entry });
    return response.removed;
  }
  return requestExtension('DELETE_MY_VOCABEE_ENTRY', { entry }, 5000);
}

export async function openBrowserExtensionSettings() {
  if (window.location.protocol === 'chrome-extension:' && globalThis.chrome?.runtime?.sendMessage) {
    await sendExtensionMessage({ type: 'OPEN_EXTENSION_SETTINGS' });
    return;
  }

  let bridgeError;
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    try {
      await requestExtension('OPEN_EXTENSION_SETTINGS', {}, 2000);
      return;
    } catch (error) {
      bridgeError = error;
    }
  }

  const settingsWindow = window.open('chrome://extensions/', '_blank');
  if (!settingsWindow) {
    throw new Error(`Не удалось открыть настройки расширений браузера.${bridgeError ? ` ${bridgeError.message}` : ''}`);
  }
  settingsWindow.opener = null;
}

export async function getDictionarySettings(defaults) {
  try {
    const settings = await requestExtension('GET_SETTINGS', {
      keys: Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, value]))
    });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return { ...defaults, ...settings, source: 'extension' };
  } catch (error) {
    console.info('Vocabee: using website settings because the extension bridge is unavailable.', error);
    let storedSettings = {};
    try {
      storedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch (parseError) {
      console.error('Vocabee: could not read website settings', parseError);
    }
    return { ...defaults, ...storedSettings, source: 'website' };
  }
}

export async function saveDictionarySettings(settings) {
  try {
    await requestExtension('SAVE_SETTINGS', { settings });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return 'extension';
  } catch (error) {
    console.info('Vocabee: saving settings locally because the extension bridge is unavailable.', error);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return 'website';
  }
}
