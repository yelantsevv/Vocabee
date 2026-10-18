import { useCallback, useEffect, useState } from 'react';
import {
  deleteExtensionIndexedDatabase,
  getExtensionIndexedDatabases,
  saveDictionarySettings
} from '../../data/storage.js';
import { DEFAULT_DICTIONARY_SETTINGS } from '../../hooks/useDictionarySettings.js';
import styles from './DatabaseManager.module.css';

export function DatabaseManager() {
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [status, setStatus] = useState('Проверяю IndexedDB…');
  const [loading, setLoading] = useState(false);
  const isLocalSite = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const isExtensionPage = window.location.protocol === 'chrome-extension:';

  const refreshDatabases = useCallback(async () => {
    if (!indexedDB.databases) {
      setDatabases([]);
      setSelectedDatabase('');
      setStatus('Браузер не поддерживает просмотр списка баз IndexedDB.');
      return;
    }

    setLoading(true);
    try {
      const localList = (await indexedDB.databases())
        .map(({ name }) => name)
        .filter(Boolean)
        .sort((first, second) => first.localeCompare(second));
      let databaseOptions = localList.map((name) => ({
        value: `page:${name}`,
        name,
        source: 'page',
        label: `${name} · текущий сайт`
      }));
      let extensionList = [];
      let extensionError = '';

      if (isLocalSite) {
        try {
          extensionList = await getExtensionIndexedDatabases();
          databaseOptions = [
            ...extensionList.map((name) => ({
              value: `extension:${name}`,
              name,
              source: 'extension',
              label: `${name} · Vocabee`
            })),
            ...databaseOptions
          ];
        } catch (error) {
          extensionError = ` Не удалось проверить IndexedDB расширения: ${error.message}`;
        }
      } else if (isExtensionPage) {
        databaseOptions = localList.map((name) => ({
          value: `extension:${name}`,
          name,
          source: 'extension',
          label: `${name} · Vocabee`
        }));
      }

      setDatabases(databaseOptions);
      setSelectedDatabase((current) => (
        databaseOptions.some(({ value }) => value === current)
          ? current
          : databaseOptions[0]?.value || ''
      ));
      const count = isLocalSite ? extensionList.length + localList.length : localList.length;
      setStatus(`${count ? `Найдено баз: ${count}.` : 'В IndexedDB нет баз.'}${extensionError}`);
    } catch (error) {
      setStatus(`Не удалось прочитать IndexedDB: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [isExtensionPage, isLocalSite]);

  useEffect(() => { refreshDatabases(); }, [refreshDatabases]);

  async function deleteSelectedDatabase() {
    if (!selectedDatabase) return;

    const selected = databases.find(({ value }) => value === selectedDatabase);
    if (!selected) return;

    const { name: databaseName, source } = selected;
    setLoading(true);
    setStatus(`Удаляю базу «${databaseName}»…`);
    try {
      if (source === 'extension' && isLocalSite) {
        await deleteExtensionIndexedDatabase(databaseName);
      } else {
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(databaseName);
          request.onsuccess = resolve;
          request.onerror = () => reject(new Error(
            request.error?.message || 'ошибка IndexedDB'
          ));
          request.onblocked = () => reject(new Error(
            'Удаление заблокировано открытой вкладкой. Закройте её и повторите.'
          ));
        });
      }

      window.dispatchEvent(new CustomEvent('vocabee:indexeddb-deleted', {
        detail: { databaseName }
      }));
      await refreshDatabases();
      setStatus(`База «${databaseName}» удалена${source === 'extension' ? ' из Vocabee' : ' с сайта'}.`);
    } catch (error) {
      setStatus(`Не удалось удалить «${databaseName}»: ${error.message}`);
      setLoading(false);
    }
  }

  async function deleteAllData() {
    const confirmed = window.confirm(
      'Удалить все данные Vocabee: словари, прогресс обучения, настройки и историю? Это действие нельзя отменить.'
    );
    if (!confirmed) return;

    setLoading(true);
    setStatus('Удаляю все данные Vocabee…');
    const failures = [];
    try {
      let pageDatabaseNames = [];
      let extensionDatabaseNames = [];

      try {
        if (!indexedDB.databases) throw new Error('браузер не позволяет получить список IndexedDB');
        pageDatabaseNames = (await indexedDB.databases())
          .map(({ name }) => name)
          .filter(Boolean);
      } catch (error) {
        failures.push(`IndexedDB сайта: ${error.message}`);
      }
      if (isLocalSite) {
        try {
          extensionDatabaseNames = await getExtensionIndexedDatabases();
        } catch (error) {
          failures.push(`IndexedDB расширения: ${error.message}`);
        }
      }

      // Reset extension-backed preferences before removing the local mirror.
      await saveDictionarySettings(DEFAULT_DICTIONARY_SETTINGS);

      await Promise.all(extensionDatabaseNames.map(async (databaseName) => {
        try {
          await deleteExtensionIndexedDatabase(databaseName);
        } catch (error) {
          failures.push(`${databaseName}: ${error.message}`);
        }
      }));
      await Promise.all(pageDatabaseNames.map(async (databaseName) => {
        try {
          await new Promise((resolve, reject) => {
            let timeoutId;
            const request = indexedDB.deleteDatabase(databaseName);
            request.onsuccess = () => {
              clearTimeout(timeoutId);
              resolve();
            };
            request.onerror = () => {
              clearTimeout(timeoutId);
              reject(new Error(request.error?.message || `не удалось удалить базу «${databaseName}»`));
            };
            request.onblocked = () => {
              setStatus(`Закройте другие вкладки Vocabee для удаления базы «${databaseName}»…`);
            };
            timeoutId = setTimeout(() => {
              reject(new Error('удаление заблокировано другой вкладкой'));
            }, 8000);
          });
        } catch (error) {
          failures.push(`${databaseName}: ${error.message}`);
        }
      }));

      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        failures.push(`Локальное хранилище: ${error.message}`);
      }

      if (globalThis.caches) {
        try {
          const cacheNames = await caches.keys();
          const deletedCaches = await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
          if (deletedCaches.some((deleted) => !deleted)) failures.push('Не удалось удалить часть Cache Storage.');
        } catch (error) {
          failures.push(`Cache Storage: ${error.message}`);
        }
      }
      if (navigator.serviceWorker?.getRegistrations) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          const unregistered = await Promise.all(registrations.map((registration) => registration.unregister()));
          if (unregistered.some((removed) => !removed)) failures.push('Не удалось удалить часть Service Worker.');
        } catch (error) {
          failures.push(`Service Worker: ${error.message}`);
        }
      }

      if (failures.length) {
        setStatus(`Не всё удалось удалить: ${failures.join('; ')}. Перезагрузите страницу и повторите.`);
        setLoading(false);
        return;
      }

      setStatus('Данные удалены. Перезагружаю страницу…');
      window.location.reload();
    } catch (error) {
      setStatus(`Не удалось полностью удалить данные: ${error.message}`);
      setLoading(false);
    }
  }

  return (
    <section className={styles.manager} aria-labelledby="database-manager-title">
      <h2 id="database-manager-title">Базы данных</h2>
      <p>Список IndexedDB текущего контекста: расширения или открытого сайта.</p>
      <div className={styles.controls}>
        <select
          aria-label='Выберите базу IndexedDB'
          value={selectedDatabase}
          onChange={(event) => setSelectedDatabase(event.target.value)}
          disabled={loading || databases.length === 0}
        >
          {databases.length === 0
            ? <option value="">Базы не найдены</option>
            : databases.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="button" onClick={refreshDatabases} disabled={loading}>Обновить</button>
        <button
          type="button"
          onClick={deleteSelectedDatabase}
          disabled={loading || !selectedDatabase}
        >Удалить БД</button>
      </div>
      <button
        className={styles.deleteAllButton}
        type="button"
        onClick={deleteAllData}
        disabled={loading}
      >Удалить все данные</button>
      <p className={styles.status} role="status">{status}</p>
    </section>
  );
}
