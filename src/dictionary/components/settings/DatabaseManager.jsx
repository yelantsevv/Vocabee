import { useState } from 'react';
import {
  deleteExtensionIndexedDatabase,
  getExtensionIndexedDatabases,
  saveDictionarySettings
} from '../../data/storage.js';
import { DEFAULT_DICTIONARY_SETTINGS } from '../../hooks/useDictionarySettings.js';
import styles from './DatabaseManager.module.css';

export function DatabaseManager() {
  const [status, setStatus] = useState('Готово к очистке.');
  const [loading, setLoading] = useState(false);

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
      // The extension is optional. If its bridge is unavailable, keep clearing
      // this site's storage without treating that as an error.
      try {
        const extensionDatabases = await getExtensionIndexedDatabases(1000);
        if (Array.isArray(extensionDatabases)) extensionDatabaseNames = extensionDatabases;
      } catch {
        // The extension bridge is optional for the standalone web app.
      }

      try {
        await saveDictionarySettings(DEFAULT_DICTIONARY_SETTINGS);
      } catch (error) {
        failures.push(`Настройки: ${error.message}`);
      }

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
        const remainingDatabases = (await indexedDB.databases())
          .map(({ name }) => name)
          .filter(Boolean);
        if (remainingDatabases.length) {
          failures.push(`Остались базы IndexedDB сайта: ${remainingDatabases.join(', ')}`);
        }
      } catch (error) {
        failures.push(`Не удалось проверить IndexedDB сайта: ${error.message}`);
      }

      try {
        localStorage.clear();
      } catch (error) {
        failures.push(`localStorage: ${error.message}`);
      }
      try {
        sessionStorage.clear();
      } catch (error) {
        failures.push(`sessionStorage: ${error.message}`);
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
      <h2 id="database-manager-title">Управление данными</h2>
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
