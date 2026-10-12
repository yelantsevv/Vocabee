import { useCallback, useEffect, useState } from 'react';

function isExtensionContextValid() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch (_error) {
    return false;
  }
}

export function useDictionary(app, active) {
  const [words, setWords] = useState([]);
  const [status, setStatus] = useState('Загружаю словарь…');

  const load = useCallback(() => {
    if (!isExtensionContextValid()) return;
    setStatus('Загружаю словарь…');
    setWords([]);
    try {
      chrome.runtime.sendMessage({ type: 'GET_DICTIONARY_WORDS' }, (response) => {
        if (!isExtensionContextValid() || chrome.runtime.lastError) {
          if (isExtensionContextValid()) console.error('Vocabee: could not request dictionary', chrome.runtime.lastError.message);
          setStatus('Не удалось загрузить словарь. Попробуйте открыть его снова.');
          return;
        }
        if (!response?.ok) {
          console.error('Vocabee: dictionary request failed', response?.error);
          setStatus(response?.error || 'Не удалось загрузить словарь.');
          return;
        }
        setWords(response.words);
        setStatus(response.words.length ? '' : 'Нет сохранённых слов.');
      });
    } catch (error) {
      if (isExtensionContextValid()) console.error('Vocabee: could not request dictionary', error);
      setStatus('Не удалось загрузить словарь. Попробуйте открыть его снова.');
    }
  }, [app]);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  return { words, status, load };
}
