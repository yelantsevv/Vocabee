import { useCallback, useEffect, useRef, useState } from 'react';

function isExtensionContextValid() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch (_error) {
    return false;
  }
}

export function useDictionary(active, sourceLanguage = 'en') {
  const [words, setWords] = useState([]);
  const [status, setStatus] = useState('Загружаю словарь…');
  const [loaded, setLoaded] = useState(false);
  const latestLoadId = useRef(0);

  const load = useCallback(() => {
    if (!isExtensionContextValid()) return;
    const loadId = latestLoadId.current + 1;
    latestLoadId.current = loadId;
    setStatus('Загружаю словарь…');
    try {
      chrome.runtime.sendMessage({ type: 'GET_DICTIONARY_WORDS' }, (response) => {
        if (loadId !== latestLoadId.current) return;
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
  }, []);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  useEffect(() => {
    const handleDictionaryUpdate = (message) => {
      if (message?.type === 'MY_DICTIONARY_UPDATED' && active) load();
    };
    chrome.runtime.onMessage.addListener(handleDictionaryUpdate);
    return () => chrome.runtime.onMessage.removeListener(handleDictionaryUpdate);
  }, [active, load]);

  const updateLearningLevel = useCallback((word, learningLevel) => {
    setWords((currentWords) => currentWords.map((entry) => (
      entry.id === word.id ? { ...entry, learning_level: learningLevel } : entry
    )));
  }, []);

  const languageWords = words.filter((word) => (word.sourceLang || sourceLanguage) === sourceLanguage);
  const visibleStatus = status || (languageWords.length ? '' : 'Нет сохранённых слов на выбранном языке.');

  return { words: languageWords, status: visibleStatus, load, loaded, updateLearningLevel };
}
