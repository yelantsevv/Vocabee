import { useCallback, useEffect, useState } from 'react';

export function useDictionary(app, active) {
  const [words, setWords] = useState([]);
  const [status, setStatus] = useState('Загружаю словарь…');

  const load = useCallback(() => {
    setStatus('Загружаю словарь…');
    setWords([]);
    chrome.runtime.sendMessage({ type: 'GET_DICTIONARY_WORDS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not request dictionary', chrome.runtime.lastError.message);
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
  }, []);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  return { words, status, load };
}
