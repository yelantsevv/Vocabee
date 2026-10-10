const DICTIONARY_DATABASE = 'vocabee-dictionary';
const DICTIONARY_STORE = 'words';
const SOURCE_LANGUAGES = ['en', 'de'];
const TARGET_LANGUAGES = ['en', 'ru', 'uk', 'de'];

let dictionaryDatabase;

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
      database.onversionchange = () => database.close();
      resolve(database);
    };
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'ADD_DICTIONARY_WORD' && message?.type !== 'GET_DICTIONARY_WORDS') {
    return false;
  }

  if (sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, error: 'Запрос на сохранение отклонён.' });
    return false;
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
