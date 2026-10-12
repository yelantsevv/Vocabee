import { useEffect, useState } from 'react';

export const DEFAULT_THEME = 'dark';

export function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    const storage = chrome.storage.sync || chrome.storage.local;
    storage.get({ theme: DEFAULT_THEME }, (settings) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not load theme', chrome.runtime.lastError.message);
        return;
      }
      setTheme(normalizeTheme(settings.theme));
    });

    const onStorageChange = (changes, areaName) => {
      if ((areaName === 'sync' || areaName === 'local') && changes.theme) {
        setTheme(normalizeTheme(changes.theme.newValue));
      }
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, []);

  function changeTheme(nextTheme) {
    const normalized = normalizeTheme(nextTheme);
    setTheme(normalized);
    const storage = chrome.storage.sync || chrome.storage.local;
    storage.set({ theme: normalized }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save theme', chrome.runtime.lastError.message);
      }
    });
  }

  return [theme, changeTheme];
}
