import { useEffect, useState } from 'react';
import { targetLanguages } from '../../shared/languages.js';

const storage = chrome.storage.sync || chrome.storage.local;

export function usePopupSettings() {
  const [enabled, setEnabled] = useState(true);
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    storage.get({ enabled: true, lang: 'ru' }, (settings) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not load popup settings', chrome.runtime.lastError.message);
        return;
      }
      setEnabled(Boolean(settings.enabled));
      setLanguage(settings.lang || 'ru');
    });
  }, []);

  function save(nextEnabled, nextLanguage) {
    storage.set({ enabled: nextEnabled, lang: nextLanguage }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save popup settings', chrome.runtime.lastError.message);
      }
    });
  }

  function changeEnabled(nextEnabled) {
    setEnabled(nextEnabled);
    save(nextEnabled, language);
  }

  function changeLanguage(nextLanguage) {
    if (!targetLanguages.some(([value]) => value === nextLanguage)) return;
    setLanguage(nextLanguage);
    save(enabled, nextLanguage);
  }

  return { enabled, language, changeEnabled, changeLanguage };
}
