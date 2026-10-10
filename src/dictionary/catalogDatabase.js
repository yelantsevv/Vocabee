const DATABASES_BY_LANGUAGE = {
  en: 'en-ru-vocabee',
  de: 'de-ru-vocabee'
};
const LEGACY_DATABASE_NAME = 'vocabee-catalog';
const STORE_NAME = 'dictionaries';

let legacyMigration;

function openCatalogDatabase(language) {
  const databaseName = DATABASES_BY_LANGUAGE[language];
  if (!databaseName) return Promise.reject(new Error('Неизвестный язык словаря.'));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
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

async function writeRecord(language, record) {
  const database = await openCatalogDatabase(language);
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
      if (DATABASES_BY_LANGUAGE[record?.language] && Array.isArray(record.entries)) {
        await writeRecord(record.language, record);
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

export async function readCatalogDictionaries() {
  await migrateLegacyCatalog();
  const knownDatabases = indexedDB.databases ? await indexedDB.databases() : [];
  const installedNames = new Set(knownDatabases.map(({ name }) => name));
  const records = await Promise.all(Object.entries(DATABASES_BY_LANGUAGE)
    .filter(([, databaseName]) => installedNames.has(databaseName))
    .map(async ([language]) => {
    const database = await openCatalogDatabase(language);
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(language);
        request.onsuccess = () => resolve(request.result ? [request.result] : []);
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
    }));
  return records.flat();
}

export async function writeCatalogDictionary(language, entries) {
  await migrateLegacyCatalog();
  await writeRecord(language, { language, entries, updatedAt: Date.now() });
}
