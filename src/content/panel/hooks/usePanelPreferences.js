import { useCallback, useEffect, useState } from 'react';

export function usePanelPreferences(app) {
  const [enabled, setEnabled] = useState(app.state.enabled);
  const [targetLanguage, setTargetLanguage] = useState(app.state.lang);
  const [sourceLanguage, setSourceLanguage] = useState(() => {
    const language = app.detectedCaptionLanguage;
    return language ? app.languageNames[language] : 'Не найден';
  });

  useEffect(() => {
    app.storage.get({ enabled: true, lang: 'ru' }, (settings) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not load panel settings', chrome.runtime.lastError.message);
        return;
      }
      setEnabled(Boolean(settings.enabled));
      setTargetLanguage(settings.lang || 'ru');
    });

    const onStorageChange = (changes, areaName) => {
      if (areaName !== 'sync' && areaName !== 'local') return;
      if (changes.enabled) setEnabled(Boolean(changes.enabled.newValue));
      if (changes.lang) setTargetLanguage(changes.lang.newValue || 'ru');
    };
    app.storage.onChanged.addListener(onStorageChange);
    return () => app.storage.onChanged.removeListener(onStorageChange);
  }, [app]);

  const refreshSourceLanguage = useCallback(() => {
    app.updateDetectedSourceLanguage();
    const language = app.detectedCaptionLanguage;
    setSourceLanguage(language ? app.languageNames[language] : 'Не найден');
  }, [app]);

  const changeEnabled = useCallback((nextEnabled) => {
    setEnabled(nextEnabled);
    app.state.enabled = nextEnabled;
    app.storage.set({ enabled: nextEnabled }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save translation setting', chrome.runtime.lastError.message);
      }
    });
  }, [app]);

  const changeLanguage = useCallback((nextLanguage) => {
    try {
      app.setTargetLanguage(nextLanguage);
      setTargetLanguage(nextLanguage);
    } catch (error) {
      console.error('Vocabee: could not change target language', error);
    }
  }, [app]);

  return { enabled, targetLanguage, sourceLanguage, refreshSourceLanguage, changeEnabled, changeLanguage };
}
