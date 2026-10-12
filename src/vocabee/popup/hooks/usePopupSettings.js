import { useEffect, useState } from 'react';

const storage = chrome.storage.sync || chrome.storage.local;

export function usePopupSettings() {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    function applySettings(settings) {
      if (typeof settings.enabled === 'boolean') setEnabled(settings.enabled);
    }

    storage.get({ enabled: true, lang: 'ru' }, (settings) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not load popup settings', chrome.runtime.lastError.message);
        return;
      }
      applySettings(settings);
      if (settings.lang !== 'ru') {
        storage.set({ lang: 'ru' }, () => {
          if (chrome.runtime.lastError) {
            console.error('Vocabee: could not set Russian translation', chrome.runtime.lastError.message);
          }
        });
      }
    });

    const onStorageChange = (changes, areaName) => {
      if (areaName !== 'sync' && areaName !== 'local') return;
      applySettings({
        ...(changes.enabled ? { enabled: changes.enabled.newValue } : {}),
      });
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, []);

  function save(nextEnabled) {
    storage.set({ enabled: nextEnabled }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save popup settings', chrome.runtime.lastError.message);
      }
    });
  }

  function changeEnabled(nextEnabled) {
    setEnabled(nextEnabled);
    save(nextEnabled);
  }

  return { enabled, changeEnabled };
}
