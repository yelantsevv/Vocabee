import {
  DICTIONARY_DATABASE,
  DICTIONARY_STORE,
  LEGACY_DICTIONARY_DATABASE,
  MY_VOCABEE_DATABASE,
  PREVIOUS_DICTIONARY_DATABASE,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES
} from './constants.js';

let myVocabularyDatabase;
let legacyDictionaryMigration;

function getDictionaryTextType(text) {
  const wordCount = text.trim().split(/\s+/u).filter(Boolean).length;
  return wordCount > 1 ? 'phrase' : 'noun';
}

function normalizeLearningLevel(level) {
  if (!Number.isInteger(level) || level <= 0) return 0;
  if (level <= 3) return level;
  return Math.min(3, Math.ceil(level * 3 / 9));
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
            alreadyLearning: startLearning && normalizeLearningLevel(currentLearningLevel) > 0
              && normalizeLearningLevel(currentLearningLevel) < 3,
            alreadyLearned: startLearning && normalizeLearningLevel(currentLearningLevel) === 3
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

async function deleteWordFromMyDictionary({ word, sourceLang, targetLang }) {
  if (typeof word !== 'string' || !word.trim()
    || !SOURCE_LANGUAGES.includes(sourceLang)
    || !TARGET_LANGUAGES.includes(targetLang)) {
    throw new Error('Не удалось определить удаляемое слово и его языковую пару.');
  }

  const database = await openMyVocabularyDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('dictionaries', 'readwrite');
    const store = transaction.objectStore('dictionaries');
    let removed = false;
    transaction.oncomplete = () => resolve(removed);
    transaction.onerror = () => reject(new Error(
      `Не удалось удалить слово из «Мой словарь»: ${transaction.error?.message || 'ошибка IndexedDB'}`
    ));
    transaction.onabort = () => reject(new Error(
      `Удаление отменено: ${transaction.error?.message || 'ошибка IndexedDB'}`
    ));

    const lookup = store.get(sourceLang);
    lookup.onsuccess = () => {
      const current = lookup.result;
      if (!current) return;
      const normalizedWord = word.trim().toLocaleLowerCase(sourceLang);
      const entries = (current.entries || []).filter((entry) => {
        const matches = entry.word?.toLocaleLowerCase(sourceLang) === normalizedWord
          && (entry.target_language || current.targetLanguage || 'ru') === targetLang;
        if (matches) removed = true;
        return !matches;
      });
      if (removed) store.put({ ...current, entries, updatedAt: Date.now() });
    };
    lookup.onerror = () => transaction.abort();
  });
}

async function updateMyDictionaryLearningLevel({ word, sourceLang, targetLang, learningLevel }) {
  if (typeof word !== 'string' || !word.trim()
    || !SOURCE_LANGUAGES.includes(sourceLang)
    || !TARGET_LANGUAGES.includes(targetLang)
    || !Number.isInteger(learningLevel) || learningLevel < 0 || learningLevel > 3) {
    throw new Error('Не удалось сохранить уровень изучения карточки.');
  }

  const database = await openMyVocabularyDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('dictionaries', 'readwrite');
    const store = transaction.objectStore('dictionaries');
    let updated = false;
    transaction.oncomplete = () => resolve(updated);
    transaction.onerror = () => reject(new Error(
      `Не удалось сохранить прогресс карточки: ${transaction.error?.message || 'ошибка IndexedDB'}`
    ));
    transaction.onabort = () => reject(new Error('Сохранение прогресса карточки отменено.'));

    const lookup = store.get(sourceLang);
    lookup.onsuccess = () => {
      const current = lookup.result;
      if (!current) return;
      const normalizedWord = word.trim().toLocaleLowerCase(sourceLang);
      const entries = (current.entries || []).map((entry) => {
        const matches = entry.word?.toLocaleLowerCase(sourceLang) === normalizedWord
          && (entry.target_language || current.targetLanguage || 'ru') === targetLang;
        if (!matches) return entry;
        updated = true;
        return { ...entry, learning_level: learningLevel };
      });
      if (updated) store.put({ ...current, entries, updatedAt: Date.now() });
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
    learning_level: normalizeLearningLevel(entry.learning_level),
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

export {
  addWordToMyDictionary,
  deleteWordFromMyDictionary,
  updateMyDictionaryLearningLevel,
  deleteIndexedDatabase,
  getDictionaryWords,
  getMyVocabularyEntries,
  listIndexedDatabases
};
