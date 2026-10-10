const DICTIONARY_DATABASE = 'my-words-vocabee';
const LEGACY_DICTIONARY_DATABASE = 'vocabee-dictionary';
const DICTIONARY_STORE = 'words';
const SOURCE_LANGUAGES = ['en', 'de'];
const TARGET_LANGUAGES = ['en', 'ru', 'uk', 'de'];

let dictionaryDatabase;
let legacyDictionaryMigration;

function migrateLegacyDictionary(database) {
  if (legacyDictionaryMigration) return legacyDictionaryMigration;

  legacyDictionaryMigration = (async () => {
    if (!indexedDB.databases) return;
    const knownDatabases = await indexedDB.databases();
    if (!knownDatabases.some(({ name }) => name === LEGACY_DICTIONARY_DATABASE)) return;

    const legacy = await new Promise((resolve, reject) => {
      const request = indexedDB.open(LEGACY_DICTIONARY_DATABASE, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Не удалось прочитать старую базу слов.'));
      request.onblocked = () => reject(new Error('Старая база слов занята другой вкладкой.'));
    });

    let words = [];
    if (legacy.objectStoreNames.contains(DICTIONARY_STORE)) {
      words = await new Promise((resolve, reject) => {
        const request = legacy.transaction(DICTIONARY_STORE, 'readonly')
          .objectStore(DICTIONARY_STORE)
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Не удалось перенести старые слова.'));
      });
    }
    legacy.close();

    if (words.length) {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(DICTIONARY_STORE, 'readwrite');
        const store = transaction.objectStore(DICTIONARY_STORE);
        words.forEach((word) => store.put(word));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Не удалось сохранить перенесённые слова.'));
        transaction.onabort = () => reject(transaction.error || new Error('Перенос слов отменён.'));
      });
    }

    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(LEGACY_DICTIONARY_DATABASE);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error || new Error('Не удалось удалить старую базу слов.'));
      request.onblocked = () => reject(new Error('Старая база слов занята другой вкладкой.'));
    });
  })().catch((error) => {
    legacyDictionaryMigration = undefined;
    throw error;
  });

  return legacyDictionaryMigration;
}

chrome.action.onClicked.addListener(() => {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId === undefined) return;

    chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_VOCABEE_PANEL' }, () => {
      if (chrome.runtime.lastError) {
        chrome.tabs.create({ url: chrome.runtime.getURL('dictionary.html') }, () => {
          if (chrome.runtime.lastError) {
            console.error('Vocabee: could not open dictionary page', chrome.runtime.lastError.message);
          }
        });
      }
    });
  });
});

function openDictionary() {
  if (dictionaryDatabase) return dictionaryDatabase;

  dictionaryDatabase = new Promise((resolve, reject) => {
    const request = indexedDB.open(DICTIONARY_DATABASE, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains(DICTIONARY_STORE)) return;

      const store = database.createObjectStore(DICTIONARY_STORE, { keyPath: 'id' });
      store.createIndex('addedAt', 'addedAt');
      store.createIndex('sourceLang', 'sourceLang');
      store.createIndex('targetLang', 'targetLang');
    };

    request.onerror = () => {
      reject(new Error(`Не удалось открыть словарь: ${request.error?.message || 'ошибка IndexedDB'}`));
    };
    request.onblocked = () => {
      reject(new Error('База словаря занята другой вкладкой. Закройте её и попробуйте снова.'));
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        dictionaryDatabase = undefined;
      };
      resolve(database);
    };
  }).then(async (database) => {
    await migrateLegacyDictionary(database);
    return database;
  }).catch((error) => {
    dictionaryDatabase = undefined;
    throw error;
  });

  return dictionaryDatabase;
}

function normalizeWordPayload(payload) {
  const sourceText = typeof payload?.sourceText === 'string' ? payload.sourceText.trim() : '';
  const translatedText = typeof payload?.translatedText === 'string' ? payload.translatedText.trim() : '';
  const { sourceLang, targetLang } = payload || {};

  if (!sourceText || sourceText.length > 500) {
    throw new Error('Исходный текст должен содержать от 1 до 500 символов.');
  }
  if (!translatedText || translatedText.length > 5000) {
    throw new Error('Перевод отсутствует или слишком длинный.');
  }
  if (!SOURCE_LANGUAGES.includes(sourceLang)) {
    throw new Error('Не удалось определить язык исходного слова.');
  }
  if (!TARGET_LANGUAGES.includes(targetLang)) {
    throw new Error('Выбран неподдерживаемый язык перевода.');
  }

  const normalizedSource = sourceText.toLocaleLowerCase(sourceLang);
  return {
    id: JSON.stringify([sourceLang, targetLang, normalizedSource]),
    sourceText,
    translatedText,
    sourceLang,
    targetLang,
    addedAt: Date.now()
  };
}

async function addWordToDictionary(payload) {
  const word = normalizeWordPayload(payload);
  const database = await openDictionary();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DICTIONARY_STORE, 'readwrite');
    const store = transaction.objectStore(DICTIONARY_STORE);
    let result;

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(
      new Error(`Не удалось сохранить слово: ${transaction.error?.message || 'ошибка IndexedDB'}`)
    );
    transaction.onabort = () => reject(
      new Error(`Сохранение отменено: ${transaction.error?.message || 'ошибка IndexedDB'}`)
    );

    const lookup = store.get(word.id);
    lookup.onsuccess = () => {
      if (lookup.result) {
        result = { duplicate: true };
        return;
      }

      store.add(word);
      result = { duplicate: false };
    };
  });
}

async function getDictionaryWords() {
  const database = await openDictionary();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DICTIONARY_STORE, 'readonly');
    const request = transaction.objectStore(DICTIONARY_STORE).getAll();

    request.onsuccess = () => {
      resolve(request.result.sort((first, second) => second.addedAt - first.addedAt));
    };
    request.onerror = () => reject(
      new Error(`Не удалось загрузить словарь: ${request.error?.message || 'ошибка IndexedDB'}`)
    );
  });
}

async function deleteIndexedDatabase(databaseName) {
  if (databaseName === DICTIONARY_DATABASE) {
    const openRequest = dictionaryDatabase;
    dictionaryDatabase = undefined;
    legacyDictionaryMigration = undefined;
    if (openRequest) {
      try {
        (await openRequest).close();
      } catch {
        // It may already be closed or failed to open.
      }
    }
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(new Error(
      `Не удалось удалить словарь: ${request.error?.message || 'ошибка IndexedDB'}`
    ));
    request.onblocked = () => reject(new Error(
      'Удаление заблокировано открытой вкладкой расширения. Закройте её и повторите.'
    ));
  });
}

async function listIndexedDatabases() {
  if (!indexedDB.databases) {
    throw new Error('Браузер не поддерживает просмотр списка IndexedDB.');
  }
  return (await indexedDB.databases())
    .map(({ name }) => name)
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'OPEN_DICTIONARY_QUICK_ACTION') {
    const validActions = new Set([
      'words-en', 'words-de', 'phrase-everyday', 'phrase-travel', 'phrase-work'
    ]);
    if (sender.id !== chrome.runtime.id || !validActions.has(message.id)) {
      sendResponse({ ok: false, error: 'Неизвестный раздел словаря.' });
      return false;
    }

    const pageUrl = new URL(chrome.runtime.getURL('dictionary.html'));
    pageUrl.searchParams.set('load', message.id);
    chrome.tabs.create({ url: pageUrl.toString() }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ ok: true });
    });
    return true;
  }

  if (![
    'ADD_DICTIONARY_WORD',
    'GET_DICTIONARY_WORDS',
    'DELETE_INDEXED_DATABASE',
    'LIST_INDEXED_DATABASES'
  ].includes(message?.type)) {
    return false;
  }

  if (sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, error: 'Запрос на сохранение отклонён.' });
    return false;
  }

  if (message.type === 'DELETE_INDEXED_DATABASE') {
    const allowedDatabaseNames = new Set([
      DICTIONARY_DATABASE,
      LEGACY_DICTIONARY_DATABASE,
      'en-ru-vocabee',
      'de-ru-vocabee',
      'vocabee-catalog'
    ]);
    if (!allowedDatabaseNames.has(message.databaseName)) {
      sendResponse({ ok: false, error: 'Неизвестная база данных.' });
      return false;
    }
    deleteIndexedDatabase(message.databaseName)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'LIST_INDEXED_DATABASES') {
    listIndexedDatabases()
      .then((databases) => sendResponse({ ok: true, databases }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_DICTIONARY_WORDS') {
    getDictionaryWords()
      .then((words) => sendResponse({ ok: true, words }))
      .catch((error) => {
        console.error('Vocabee: could not load dictionary', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  addWordToDictionary(message.word)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.error('Vocabee: could not add word to dictionary', error);
      sendResponse({ ok: false, error: error.message });
    });
  return true;
});
