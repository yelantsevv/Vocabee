export const CATALOG_SOURCES = {
  en: {
    databaseName: 'en-ru-vocabee',
    language: 'en',
    label: '🇬🇧 EN → RU'
  },
  de: {
    databaseName: 'de-ru-vocabee',
    language: 'de',
    label: '🇩🇪 DE → RU'
  },
  everyday: {
    databaseName: 'en-ru-everyday-phrases-vocabee',
    language: 'en',
    label: '🇬🇧 EN → RU · Повседневные фразы'
  },
  travel: {
    databaseName: 'en-ru-travel-phrases-vocabee',
    language: 'en',
    label: '🇬🇧 EN → RU · Путешествия'
  }
};

const LEGACY_DATABASE_NAME = 'vocabee-catalog';
const STORE_NAME = 'dictionaries';
let legacyMigration;

function openCatalogDatabase(sourceId) {
  const source = CATALOG_SOURCES[sourceId];
  if (!source) return Promise.reject(new Error('Неизвестная база словаря.'));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(source.databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'language' });
      }
    };
    request.onerror = () => reject(new Error(
      `Не удалось открыть базу словарей: ${request.error?.message || 'ошибка IndexedDB'}`
    ));
    request.onblocked = () => reject(new Error('База словарей занята другой вкладкой.'));
    request.onsuccess = () => resolve(request.result);
  });
}

function readLegacyRecords() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DATABASE_NAME, 1);
    request.onerror = () => reject(request.error || new Error('Не удалось открыть старую базу словарей.'));
    request.onblocked = () => reject(new Error('Старая база словарей занята другой вкладкой.'));
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.close();
        resolve([]);
        return;
      }
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const requestRecords = transaction.objectStore(STORE_NAME).getAll();
      requestRecords.onsuccess = () => resolve(requestRecords.result);
      requestRecords.onerror = () => reject(requestRecords.error || new Error('Не удалось прочитать старую базу словарей.'));
      transaction.oncomplete = () => database.close();
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error('Чтение старой базы отменено.'));
      };
    };
  });
}

async function writeRecord(sourceId, record) {
  const database = await openCatalogDatabase(sourceId);
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Не удалось сохранить базу словаря.'));
      transaction.onabort = () => reject(transaction.error || new Error('Сохранение базы отменено.'));
    });
  } finally {
    database.close();
  }
}

async function migrateLegacyCatalog() {
  if (legacyMigration) return legacyMigration;
  legacyMigration = (async () => {
    if (!indexedDB.databases) return;
    const databases = await indexedDB.databases();
    if (!databases.some(({ name }) => name === LEGACY_DATABASE_NAME)) return;

    const records = await readLegacyRecords();
    for (const record of records) {
      if (['en', 'de'].includes(record?.language) && Array.isArray(record.entries)) {
        await writeRecord(record.language, {
          ...record,
          catalogId: record.language,
          title: CATALOG_SOURCES[record.language].label
        });
      }
    }

    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(LEGACY_DATABASE_NAME);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error || new Error('Не удалось удалить старую базу словарей.'));
      request.onblocked = () => reject(new Error('Закройте вкладки со старым словарём и повторите перенос.'));
    });
  })().catch((error) => {
    legacyMigration = undefined;
    throw error;
  });
  return legacyMigration;
}

async function readSourceRecord(sourceId) {
  const source = CATALOG_SOURCES[sourceId];
  const database = await openCatalogDatabase(sourceId);
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(source.language);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(
        `Не удалось прочитать базу словарей: ${request.error?.message || 'ошибка IndexedDB'}`
      ));
      transaction.onabort = () => reject(new Error(
        `Чтение базы отменено: ${transaction.error?.message || 'ошибка IndexedDB'}`
      ));
    });
  } finally {
    database.close();
  }
}

export async function readCatalogDictionaries() {
  await migrateLegacyCatalog();
  const knownDatabases = indexedDB.databases ? await indexedDB.databases() : [];
  const installedNames = new Set(knownDatabases.map(({ name }) => name));
  const sourceIds = Object.entries(CATALOG_SOURCES)
    .filter(([, source]) => installedNames.has(source.databaseName))
    .map(([sourceId]) => sourceId);
  const records = await Promise.all(sourceIds.map((sourceId) => readSourceRecord(sourceId)));
  return records.filter(Boolean).map((record) => ({
    ...record,
    catalogId: record.catalogId || record.language
  }));
}

export async function writeCatalogDictionary(language, entries) {
  await migrateLegacyCatalog();
  const source = CATALOG_SOURCES[language];
  if (!source) throw new Error('Неизвестный язык словаря.');
  await writeRecord(language, {
    language,
    catalogId: language,
    title: source.label,
    entries,
    updatedAt: Date.now()
  });
}

export async function writePhraseDictionary(sourceId, dictionary) {
  await migrateLegacyCatalog();
  const source = CATALOG_SOURCES[sourceId];
  if (!source || !['everyday', 'travel'].includes(sourceId)) {
    throw new Error('Неизвестный тематический словарь.');
  }
  await writeRecord(sourceId, {
    language: source.language,
    catalogId: sourceId,
    title: dictionary.title,
    entries: dictionary.entries,
    updatedAt: Date.now()
  });
}
