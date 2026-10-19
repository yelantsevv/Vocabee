import { useCallback, useEffect, useState } from 'react';

function isExtensionContextValid() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch (_error) {
    return false;
  }
}

export function useDictionary(app, active, sourceLanguage = 'en') {
  const [words, setWords] = useState([]);
  const [status, setStatus] = useState('Загружаю словарь…');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    if (!isExtensionContextValid()) return;
    setStatus('Загружаю словарь…');
    setWords([]);
    setLoaded(false);
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
        setLoaded(true);
      });
    } catch (error) {
      if (isExtensionContextValid()) console.error('Vocabee: could not request dictionary', error);
      setStatus('Не удалось загрузить словарь. Попробуйте открыть его снова.');
    }
  }, [app]);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const languageWords = words.filter((word) => (word.sourceLang || sourceLanguage) === sourceLanguage);
  const visibleStatus = status || (languageWords.length ? '' : 'Нет сохранённых слов на выбранном языке.');

  return { words: languageWords, status: visibleStatus, load, loaded };
}
