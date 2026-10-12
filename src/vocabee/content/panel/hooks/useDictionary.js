import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLanguagePairs } from '../settings.js';

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
      setStatus(response.words.length
        ? `Сохранено слов: ${response.words.length}`
        : 'Пока нет сохранённых слов. Добавляй их из карточки перевода.');
    });
  }, []);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const languagePairs = useMemo(
    () => getLanguagePairs(words, app, app.state.sourceLang, app.state.lang),
    [app, words, app.state.sourceLang, app.state.lang]
  );

  return { words, status, languagePairs, load };
}
