const DATABASE_NAME = 'learn-vocabee';
const PREVIOUS_DATABASE_NAME = 'my-words-vocabee';
const LEGACY_DATABASE_NAME = 'vocabee-dictionary';
const STORE_NAME = 'words';
const CHANNEL = 'VOCABEE_LOCAL_DICTIONARY';
const SETTINGS_KEY = 'vocabee-settings';

let nextRequestId = 0;
let localMigration;

function migrateLocalDictionary(database) {
  if (localMigration) return localMigration;
  localMigration = (async () => {
    if (!indexedDB.databases) return;
    const knownDatabases = await indexedDB.databases();
    for (const databaseName of [PREVIOUS_DATABASE_NAME, LEGACY_DATABASE_NAME]) {
      if (!knownDatabases.some(({ name }) => name === databaseName)) continue;
      const legacy = await new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Не удалось открыть старую базу слов.'));
        request.onblocked = () => reject(new Error('Старая база слов занята другой вкладкой.'));
      });
      let words = [];
      if (legacy.objectStoreNames.contains(STORE_NAME)) {
        words = await new Promise((resolve, reject) => {
          const request = legacy.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error || new Error('Не удалось прочитать старые слова.'));
        });
      }
      legacy.close();

      if (words.length) {
        await new Promise((resolve, reject) => {
          const transaction = database.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          words.forEach((word) => store.put(word));
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error || new Error('Не удалось перенести старые слова.'));
          transaction.onabort = () => reject(transaction.error || new Error('Перенос старых слов отменён.'));
        });
      }

      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error || new Error('Не удалось удалить старую базу слов.'));
        request.onblocked = () => reject(new Error('Старая база слов занята другой вкладкой.'));
      });
    }
  })().catch((error) => {
    localMigration = undefined;
    throw error;
  });
  return localMigration;
}

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

function openLocalDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains(STORE_NAME)) return;

      const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('addedAt', 'addedAt');
      store.createIndex('sourceLang', 'sourceLang');
      store.createIndex('targetLang', 'targetLang');
    };
    request.onerror = () => reject(new Error(
      `Не удалось открыть локальный словарь: ${request.error?.message || 'ошибка IndexedDB'}`
    ));
    request.onblocked = () => reject(new Error(
      'База словаря занята другой вкладкой. Закройте её и попробуйте снова.'
    ));
    request.onsuccess = () => {
      const database = request.result;
      migrateLocalDictionary(database).then(() => resolve(database)).catch((error) => {
        database.close();
        reject(error);
      });
    };
  });
}

async function getLocalWords() {
  const database = await openLocalDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(
        `Не удалось загрузить локальный словарь: ${request.error?.message || 'ошибка IndexedDB'}`
      ));
      transaction.onabort = () => reject(new Error(
        `Чтение словаря отменено: ${transaction.error?.message || 'ошибка IndexedDB'}`
      ));
    });
  } finally {
    database.close();
  }
}

export async function getDictionaryData() {
  if (window.location.protocol === 'chrome-extension:' && globalThis.chrome?.runtime?.sendMessage) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'GET_DICTIONARY_WORDS' }, (result) => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else if (!result?.ok) reject(new Error(result?.error || 'Не удалось загрузить словарь.'));
          else resolve(result.words);
        });
      });
      return { words: response, source: 'extension' };
    } catch (error) {
      console.error('Vocabee: extension dictionary request failed; using local IndexedDB.', error);
    }
  }

  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    try {
      const words = await requestExtension('GET_DICTIONARY_WORDS');
      return { words, source: 'extension' };
    } catch (error) {
      console.info('Vocabee: using the website IndexedDB because the extension bridge is unavailable.', error);
    }
  }

  const words = await getLocalWords();
  return {
    words,
    source: 'website',
    warning: 'Нет соединения с базой расширения. Показаны только данные этого сайта.'
  };
}

export async function deleteExtensionIndexedDatabase(databaseName) {
  return requestExtension('DELETE_INDEXED_DATABASE', { databaseName }, 5000);
}

export async function getExtensionIndexedDatabases() {
  return requestExtension('LIST_INDEXED_DATABASES', {}, 5000);
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
