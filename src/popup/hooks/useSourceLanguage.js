import { useEffect, useState } from 'react';

export function useSourceLanguage() {
  const [sourceLanguage, setSourceLanguage] = useState('Определяется…');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not find active tab', chrome.runtime.lastError.message);
        setSourceLanguage('Недоступно');
        return;
      }

      const tabId = tabs[0]?.id;
      if (tabId === undefined) {
        setSourceLanguage('Недоступно');
        return;
      }

      chrome.tabs.sendMessage(tabId, { type: 'GET_LANGUAGE_STATUS' }, (status) => {
        if (chrome.runtime.lastError || !status) {
          setSourceLanguage('Откройте видео на YouTube');
          return;
        }
        setSourceLanguage(status.sourceLanguage);
      });
    });
  }, []);

  return sourceLanguage;
}
