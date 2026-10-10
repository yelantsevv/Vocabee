import styles from './DictionaryPage.module.css';
import panelStyles from './SavedWordsPanel.module.css';
import { getEntryLearningLevel, getLanguagePairs } from './dictionaryUtils.js';
import { DictionaryEntryHeader } from '../shared/DictionaryEntryHeader.jsx';
import cardStyles from '../shared/DictionaryEntryHeader.module.css';

export function SavedWordsPanel({ words, search, status, catalog }) {
  const query = search.trim().toLocaleLowerCase();
  const languagePairs = getLanguagePairs(words);
  const filteredWords = query
    ? words.filter((word) => `${word.sourceText} ${word.translatedText}`.toLocaleLowerCase().includes(query))
    : words;

  return (
    <section className={styles.content} aria-label="Сохранённые слова">
      <div className={styles.titleRow}>
        <div>
          {languagePairs.length > 0 && (
            <p className={styles.languagePair}>{languagePairs.join(' · ')}</p>
          )}
        </div>
        <p className={panelStyles.count}>Сохранено слов: <strong>{words.length}</strong></p>
      </div>

      <section className={`${styles.wordList} ${panelStyles.savedWordsList}`} aria-label="Сохранённые слова" aria-live="polite">
        {status ? (
          <p className={styles.message} role="status">{status}</p>
        ) : filteredWords.length ? (
          <ul>
            {filteredWords.map((word) => {
              const entry = catalog.selectedSourceDictionary.find((item) => (
                item._catalogLanguage === word.sourceLang
                && item.word.toLocaleLowerCase() === word.sourceText.toLocaleLowerCase()
              )) || {
                word: word.sourceText,
                _catalogLanguage: word.sourceLang,
                learning_level: 0
              };
              const learningSource = entry._catalogId || entry._catalogLanguage;
              const learningLevel = getEntryLearningLevel(
                entry,
                learningSource,
                catalog.learningLevelOverrides
              );

              return (
                <li className={`${cardStyles.entryCard} ${panelStyles.savedWordCard}`} key={word.id}>
                  <DictionaryEntryHeader
                    word={word.sourceText}
                    translation={word.translatedText}
                    learningLevel={learningLevel}
                    translationVisible
                    onAddToLearning={() => catalog.addToLearning(entry)}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.message}>
            {search
              ? 'По запросу ничего не найдено.'
              : 'Словарь пока пуст. Добавляйте слова из карточек перевода на YouTube.'}
          </p>
        )}
      </section>
    </section>
  );
}
