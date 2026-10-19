import { useCallback, useEffect, useRef, useState } from 'react';

const LEGACY_STORAGE_KEY = 'vocabeeExtensionLearningProgress';

function sendLearningLevelUpdate(entry) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'SET_MY_DICTIONARY_LEARNING_LEVEL', entry }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!response?.ok || !response.updated) {
        reject(new Error(response?.error || 'Карточка больше не найдена в словаре расширения.'));
      } else {
        resolve();
      }
    });
  });
}

function getExtensionDictionaryWords() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'GET_DICTIONARY_WORDS' }, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (!response?.ok) reject(new Error(response?.error || 'Не удалось прочитать словарь расширения.'));
      else resolve(response.words || []);
    });
  });
}

export function useExtensionLearningProgress(words, dictionaryLoaded, updateDictionaryLearningLevel) {
  const migrationStarted = useRef(false);
  const [learningProgressLoaded, setLearningProgressLoaded] = useState(false);

  useEffect(() => {
    if (!dictionaryLoaded || migrationStarted.current) return;
    if (!words.length) {
      setLearningProgressLoaded(true);
      return;
    }
    migrationStarted.current = true;
    setLearningProgressLoaded(false);

    chrome.storage.local.get({ [LEGACY_STORAGE_KEY]: {} }, async (settings) => {
      if (chrome.runtime.lastError) {
        setLearningProgressLoaded(true);
        return;
      }
      const savedLevels = settings[LEGACY_STORAGE_KEY];
      if (!savedLevels || typeof savedLevels !== 'object') {
        setLearningProgressLoaded(true);
        return;
      }

      try {
        const allWords = await getExtensionDictionaryWords();
        const updates = allWords.flatMap((word) => {
          const level = savedLevels[word.id];
          if (!Number.isInteger(level) || level < 0 || level > 3 || level === word.learning_level) return [];
          return [sendLearningLevelUpdate({
            word: word.sourceText,
            sourceLang: word.sourceLang,
            targetLang: word.targetLang,
            learningLevel: level
          })];
        });
        await Promise.all(updates);
        chrome.storage.local.remove(LEGACY_STORAGE_KEY);
        if (updates.length) {
          const allWords = await getExtensionDictionaryWords();
          allWords.forEach((word) => updateDictionaryLearningLevel?.(word, word.learning_level));
        }
      } catch (error) {
        console.error('Vocabee: could not migrate extension learning progress', error);
      } finally {
        setLearningProgressLoaded(true);
      }
    });
  }, [dictionaryLoaded, updateDictionaryLearningLevel, words]);

  const setLearningLevel = useCallback(async (word, level) => {
    try {
      await sendLearningLevelUpdate({
        word: word.sourceText,
        sourceLang: word.sourceLang,
        targetLang: word.targetLang,
        learningLevel: level
      });
      updateDictionaryLearningLevel?.(word, level);
    } catch (error) {
      console.error('Vocabee: could not save extension learning progress', error);
    }
  }, [updateDictionaryLearningLevel]);

  return { setLearningLevel, learningProgressLoaded };
}
