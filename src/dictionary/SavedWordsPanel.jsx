import styles from './DictionaryPage.module.css';
import panelStyles from './SavedWordsPanel.module.css';
import { formatAddedDate, getLanguagePairs } from './dictionaryUtils.js';

export function SavedWordsPanel({ words, search, status }) {
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

      <section className={styles.wordList} aria-label="Сохранённые слова" aria-live="polite">
        {status ? (
          <p className={styles.message} role="status">{status}</p>
        ) : filteredWords.length ? (
          <ul>
            {filteredWords.map((word) => (
              <li className={styles.word} key={word.id}>
                <div className={styles.wordPair}>
                  <strong>{word.sourceText}</strong>
                  <span>{word.translatedText}</span>
                </div>
                <small>{formatAddedDate(word.addedAt)}</small>
              </li>
            ))}
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
