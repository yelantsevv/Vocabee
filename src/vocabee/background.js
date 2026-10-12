const DICTIONARY_DATABASE = 'learn-vocabee';
const PREVIOUS_DICTIONARY_DATABASE = 'my-words-vocabee';
const MY_VOCABEE_DATABASE = 'my-vocabee';
const LEGACY_DICTIONARY_DATABASE = 'vocabee-dictionary';
const DICTIONARY_STORE = 'words';
const CUSTOM_DICTIONARY_DATABASE_PREFIX = 'vocabee-custom-dictionary-';
const SOURCE_LANGUAGES = ['en', 'de'];
const TARGET_LANGUAGES = ['en', 'ru', 'uk', 'de'];
const ACTIVE_ICON = {
  16: 'icons/vocabee-16.png',
  32: 'icons/vocabee-32.png'
};
const INACTIVE_ICON = {
  16: 'icons/vocabee-inactive-16.png',
  32: 'icons/vocabee-inactive-32.png'
};
const DEFAULT_ACTIVE_ICON = {
  16: 'icons/vocabee-16.png',
  32: 'icons/vocabee-32.png'
};

let myVocabularyDatabase;
let legacyDictionaryMigration;

function getDictionaryTextType(text) {
  const wordCount = text.trim().split(/\s+/u).filter(Boolean).length;
  return wordCount > 1 ? 'phrase' : 'noun';
}

function openExistingDatabase(databaseName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onerror = () => {
      if (request.error?.name === 'AbortError') resolve(null);
      else reject(request.error || new Error(`Не удалось открыть старую базу «${databaseName}».`));
    };
    request.onblocked = () => reject(new Error(`Старая база «${databaseName}» занята другой вкладкой.`));
    request.onsuccess = () => resolve(request.result);
  });
}

function isLocalDictionaryUrl(url) {
  return url.protocol === 'http:'
    && url.port === '5173'
    && ['localhost', '127.0.0.1'].includes(url.hostname)
    && url.pathname === '/dictionary/dictionary.html';
}

function isSupportedUrl(value) {
  try {
    const url = new URL(value || '');
    return url.protocol === 'https:' && url.hostname === 'www.youtube.com'
      || isLocalDictionaryUrl(url);
  } catch {
    return false;
  }
}

function updateTabIcon(tabId, url) {
  const active = isSupportedUrl(url);
  chrome.action.setIcon({ tabId, path: active ? ACTIVE_ICON : INACTIVE_ICON });
  chrome.action.setTitle({
    tabId,
    title: active ? 'Vocabee' : 'Vocabee работает только на YouTube'
  });
  if (active) chrome.action.setBadgeText({ tabId, text: '' });
}

function updateActiveTabIcon() {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
    if (tab?.id !== undefined) updateTabIcon(tab.id, tab.url);
    else chrome.action.setIcon({ path: DEFAULT_ACTIVE_ICON });
  });
}

function clearRestrictedTabBadge(tabId) {
  chrome.action.setBadgeText({ tabId, text: '' });
  chrome.action.setIcon({ tabId, path: ACTIVE_ICON });
  chrome.action.setTitle({ tabId, title: 'Vocabee' });
}

function showUnsupportedSiteNotice(tabId) {
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#b3261e' });
  chrome.action.setBadgeText({ tabId, text: 'YT' });
  chrome.action.setTitle({ tabId, title: 'Vocabee работает только на YouTube' });

  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const hostId = 'vocabee-site-restriction-toast';
      document.getElementById(hostId)?.remove();

      const host = document.createElement('div');
      host.id = hostId;
      host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647';
      const shadow = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = `
        div {
          padding: 12px 16px;
          border-radius: 10px;
          background: #25242c;
          color: #fff;
          box-shadow: 0 4px 18px #0005;
          font: 14px/1.4 system-ui, sans-serif;
        }
      `;
      const message = document.createElement('div');
      message.textContent = 'Расширение Vocabee работает только на YouTube.';
      shadow.append(style, message);
      document.documentElement.append(host);
      setTimeout(() => host.remove(), 3500);
    }
  }).catch(() => {
    // Chrome internal pages do not allow script injection; the badge and title remain visible.
  });
}

chrome.action.onClicked.addListener(() => {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tab = tabs[0];
    const tabId = tab?.id;
    if (tabId === undefined) return;

    let url;
    try {
      url = new URL(tab.url || '');
    } catch {
      showUnsupportedSiteNotice(tabId);
      return;
    }

    if (url.hostname !== 'www.youtube.com' && !isLocalDictionaryUrl(url)) {
      chrome.action.setIcon({ tabId, path: INACTIVE_ICON });
      showUnsupportedSiteNotice(tabId);
      return;
    }

    clearRestrictedTabBadge(tabId);
    if (isLocalDictionaryUrl(url)) return;

    chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_VOCABEE_PANEL' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: YouTube content script is unavailable', chrome.runtime.lastError.message);
      }
    });
  });
});

chrome.tabs.onActivated.addListener(updateActiveTabIcon);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateTabIcon(tabId, changeInfo.url || tab.url);
  }
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) updateActiveTabIcon();
});
chrome.runtime.onStartup.addListener(updateActiveTabIcon);
chrome.runtime.onInstalled.addListener(updateActiveTabIcon);

async function migrateLearningWordsToMyDictionary(database, legacyDatabase, databaseName) {
  if (!legacyDatabase.objectStoreNames.contains(DICTIONARY_STORE)) {
    legacyDatabase.close();
    return;
  }

  const words = await new Promise((resolve, reject) => {
    const request = legacyDatabase.transaction(DICTIONARY_STORE, 'readonly')
      .objectStore(DICTIONARY_STORE)
      .getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Не удалось прочитать старые карточки.'));
  });
  const importedEntries = words.map((word, index) => {
    const sourceLanguage = SOURCE_LANGUAGES.includes(word.sourceLang) ? word.sourceLang : null;
    const targetLanguage = TARGET_LANGUAGES.includes(word.targetLang) ? word.targetLang : 'ru';
    if (!sourceLanguage || !word.sourceText || !word.translatedText) {
      throw new Error('В старом словаре найдена некорректная карточка. Данные сохранены в исходной базе.');
    }
    return {
      sourceLanguage,
      targetLanguage,
      entry: {
        word: word.sourceText,
        definitions: [word.translatedText],
        part_of_speech: getDictionaryTextType(word.sourceText),
        level: 'A1',
        learning_level: Math.max(0, Math.min(Number.isInteger(word.learning_level) ? word.learning_level : 0, 9)),
        frequency_rank: Number.isFinite(word.addedAt) ? word.addedAt : index + 1,
        source_language: sourceLanguage,
        target_language: targetLanguage
      }
    };
  });

  if (importedEntries.length) {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('dictionaries', 'readwrite');
      const store = transaction.objectStore('dictionaries');
      const request = store.getAll();
      request.onsuccess = () => {
        const records = new Map(request.result.map((record) => [record.language, record]));
        importedEntries.forEach(({ sourceLanguage, targetLanguage, entry }) => {
          const record = records.get(sourceLanguage) || {
            catalogId: MY_VOCABEE_DATABASE,
            databaseName: MY_VOCABEE_DATABASE,
            title: 'Мой словарь',
            language: sourceLanguage,
            targetLanguage,
            isCustom: true,
            entries: []
          };
          const normalizedWord = entry.word.toLocaleLowerCase(sourceLanguage);
          const existingIndex = record.entries.findIndex((current) => (
            current.word.toLocaleLowerCase(sourceLanguage) === normalizedWord
            && (current.target_language || record.targetLanguage || 'ru') === targetLanguage
          ));
          if (existingIndex === -1) {
            record.entries.push(entry);
          } else {
            const current = record.entries[existingIndex];
            record.entries[existingIndex] = {
              ...current,
              definitions: [...new Set([...(current.definitions || []), ...entry.definitions])],
              learning_level: Math.max(current.learning_level || 0, entry.learning_level)
            };
          }
          record.updatedAt = Date.now();
          records.set(sourceLanguage, record);
        });
        records.forEach((record) => store.put(record));
      };
      request.onerror = () => transaction.abort();
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Не удалось перенести карточки в «Мой словарь».'));
      transaction.onabort = () => reject(transaction.error || new Error('Перенос карточек отменён.'));
    });
  }

  legacyDatabase.close();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error || new Error('Не удалось удалить старую базу карточек.'));
    request.onblocked = () => reject(new Error('Перенос выполнен, но удаление старой базы заблокировано другой вкладкой.'));
  });
}

function migrateLegacyLearningDictionaries(database) {
  if (legacyDictionaryMigration) return legacyDictionaryMigration;
  legacyDictionaryMigration = (async () => {
    if (!indexedDB.databases) return;
    const databases = await indexedDB.databases();
    const sourceNames = [DICTIONARY_DATABASE, PREVIOUS_DICTIONARY_DATABASE, LEGACY_DICTIONARY_DATABASE];
    for (const databaseName of sourceNames) {
      if (!databases.some(({ name }) => name === databaseName)) continue;
      const legacyDatabase = await openExistingDatabase(databaseName);
      if (legacyDatabase) {
        await migrateLearningWordsToMyDictionary(database, legacyDatabase, databaseName);
      }
    }
  })().catch((error) => {
    legacyDictionaryMigration = undefined;
    throw error;
  });
  return legacyDictionaryMigration;
}

function openMyVocabularyDatabase() {
  if (myVocabularyDatabase) return myVocabularyDatabase;

  myVocabularyDatabase = new Promise((resolve, reject) => {
    const request = indexedDB.open(MY_VOCABEE_DATABASE);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('dictionaries')) {
        database.createObjectStore('dictionaries', { keyPath: 'language' });
      }
    };
    request.onerror = () => reject(new Error(
      `Не удалось открыть «Мой словарь»: ${request.error?.message || 'ошибка IndexedDB'}`
    ));
    request.onblocked = () => reject(new Error('База «Мой словарь» занята другой вкладкой.'));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        myVocabularyDatabase = undefined;
      };
      migrateLegacyLearningDictionaries(database).then(() => {
        resolve(database);
      }).catch((error) => {
        database.close();
        myVocabularyDatabase = undefined;
        reject(error);
      });
    };
  }).catch((error) => {
    myVocabularyDatabase = undefined;
    throw error;
  });

  return myVocabularyDatabase;
}

async function getMyVocabularyEntries() {
  if (!indexedDB.databases) {
    throw new Error('Браузер не поддерживает проверку базы «Мой словарь».');
  }
  const databases = await indexedDB.databases();
  const hasMyDictionary = databases.some(({ name }) => name === MY_VOCABEE_DATABASE);
  const hasLegacyDictionary = [
    DICTIONARY_DATABASE,
    PREVIOUS_DICTIONARY_DATABASE,
    LEGACY_DICTIONARY_DATABASE
  ].some((name) => databases.some((database) => database.name === name));
  if (!hasMyDictionary && !hasLegacyDictionary) return [];

  const database = await openMyVocabularyDatabase();
  const records = await new Promise((resolve, reject) => {
    const request = database.transaction('dictionaries', 'readonly')
      .objectStore('dictionaries')
      .getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Не удалось прочитать «Мой словарь».'));
  });
  return records.flatMap((record) => (record.entries || []).map((entry) => ({
    ...entry,
    source_language: entry.source_language || record.language || 'en',
    target_language: entry.target_language || record.targetLanguage || 'ru'
  })));
}

function normalizeWordPayload(payload, learningLevel = 0) {
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
    part_of_speech: getDictionaryTextType(sourceText),
    sourceLang,
    targetLang,
    learning_level: learningLevel,
    addedAt: Date.now()
  };
}

async function addWordToMyDictionary(payload, { startLearning = false } = {}) {
  const word = normalizeWordPayload(payload, startLearning ? 1 : 0);
  const database = await openMyVocabularyDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('dictionaries', 'readwrite');
    const store = transaction.objectStore('dictionaries');
    let result;
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(new Error(
      `Не удалось добавить слово в «Мой словарь»: ${transaction.error?.message || 'ошибка IndexedDB'}`
    ));
    transaction.onabort = () => reject(new Error(
      `Добавление отменено: ${transaction.error?.message || 'ошибка IndexedDB'}`
    ));

    const lookup = store.get(word.sourceLang);
    lookup.onsuccess = () => {
      const current = lookup.result || {
        catalogId: MY_VOCABEE_DATABASE,
        databaseName: MY_VOCABEE_DATABASE,
        title: 'Мой словарь',
        language: word.sourceLang,
        targetLanguage: word.targetLang,
        isCustom: true,
        entries: []
      };
      const entries = current.entries || [];
      const normalizedText = word.sourceText.toLocaleLowerCase(word.sourceLang);
      const duplicateIndex = entries.findIndex((entry) => (
        entry.word.toLocaleLowerCase(word.sourceLang) === normalizedText
        && (entry.target_language || current.targetLanguage || 'ru') === word.targetLang
      ));
      if (duplicateIndex >= 0) {
        const existingEntry = entries[duplicateIndex];
        const currentLearningLevel = existingEntry.learning_level || 0;
        if (startLearning && currentLearningLevel === 0) {
          entries[duplicateIndex] = { ...existingEntry, learning_level: 1 };
          store.put({ ...current, entries, updatedAt: Date.now() });
          result = { duplicate: true, learningStarted: true };
        } else {
          result = {
            duplicate: true,
            alreadyLearning: startLearning && currentLearningLevel > 0 && currentLearningLevel < 9,
            alreadyLearned: startLearning && currentLearningLevel === 9
          };
        }
        return;
      }

      const entry = {
        word: word.sourceText,
        part_of_speech: word.part_of_speech,
        level: 'A1',
        learning_level: word.learning_level,
        definitions: [word.translatedText],
        frequency_rank: entries.length + 1,
        source_language: word.sourceLang,
        target_language: word.targetLang
      };
      store.put({
        ...current,
        catalogId: MY_VOCABEE_DATABASE,
        databaseName: MY_VOCABEE_DATABASE,
        title: 'Мой словарь',
        language: word.sourceLang,
        targetLanguage: word.targetLang,
        isCustom: true,
        entries: [...entries, entry],
        updatedAt: Date.now()
      });
      result = { duplicate: false };
    };
    lookup.onerror = () => transaction.abort();
  });
}

async function getDictionaryWords() {
  const entries = await getMyVocabularyEntries();
  return entries.map((entry, index) => ({
    id: JSON.stringify([
      entry.source_language,
      entry.target_language,
      entry.word.toLocaleLowerCase(entry.source_language)
    ]),
    sourceText: entry.word,
    translatedText: entry.definitions[0] || '',
    sourceLang: entry.source_language,
    targetLang: entry.target_language,
    learning_level: entry.learning_level || 0,
    addedAt: entry.frequency_rank || index
  }));
}

async function deleteIndexedDatabase(databaseName) {
  if ([DICTIONARY_DATABASE, PREVIOUS_DICTIONARY_DATABASE, LEGACY_DICTIONARY_DATABASE, MY_VOCABEE_DATABASE]
    .includes(databaseName)) {
    legacyDictionaryMigration = undefined;
  }
  if (databaseName === MY_VOCABEE_DATABASE) {
    const openRequest = myVocabularyDatabase;
    myVocabularyDatabase = undefined;
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
  if (message?.type === 'OPEN_EXTENSION_SETTINGS') {
    if (sender.id !== chrome.runtime.id) {
      sendResponse({ ok: false, error: 'Запрос на открытие настроек отклонён.' });
      return false;
    }
    chrome.tabs.create({ url: 'chrome://extensions/' }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.type === 'OPEN_DICTIONARY_QUICK_ACTION') {
    const validActions = new Set([
      'words-en', 'words-de'
    ]);
    if (sender.id !== chrome.runtime.id || !validActions.has(message.id)) {
      sendResponse({ ok: false, error: 'Неизвестный раздел словаря.' });
      return false;
    }

    const pageUrl = new URL(chrome.runtime.getURL('dictionary/dictionary.html'));
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
    'START_DICTIONARY_WORD_LEARNING',
    'GET_DICTIONARY_WORDS',
    'GET_MY_VOCABEE_DICTIONARY',
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
      PREVIOUS_DICTIONARY_DATABASE,
      'my-vocabee',
      LEGACY_DICTIONARY_DATABASE,
      'en-ru-vocabee',
      'de-ru-vocabee',
      'en-ru-everyday-phrases-vocabee',
      'en-ru-travel-phrases-vocabee',
      'vocabee-catalog'
    ]);
    if (!allowedDatabaseNames.has(message.databaseName)
      && !message.databaseName?.startsWith(CUSTOM_DICTIONARY_DATABASE_PREFIX)) {
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

  if (message.type === 'GET_MY_VOCABEE_DICTIONARY') {
    getMyVocabularyEntries()
      .then((entries) => sendResponse({ ok: true, entries }))
      .catch((error) => {
        console.error('Vocabee: could not load my vocabulary database', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  const saveRequest = addWordToMyDictionary(message.word, {
    startLearning: message.type === 'START_DICTIONARY_WORD_LEARNING'
  });
  saveRequest
    .then((result) => {
      sendResponse({ ok: true, ...result });
      chrome.runtime.sendMessage({ type: 'MY_DICTIONARY_UPDATED' }, () => {
        void chrome.runtime.lastError;
      });
    })
    .catch((error) => {
      console.error('Vocabee: could not add word to dictionary', error);
      sendResponse({ ok: false, error: error.message });
    });
  return true;
});
