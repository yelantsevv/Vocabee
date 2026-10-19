import styles from './DictionaryStats.module.css';

const numberFormat = new Intl.NumberFormat('ru-RU');

export function DictionaryStats({ sources, selectedSourceLanguage, myVocabeeLanguage = 'en' }) {
  const activeSource = sources.find(({ id }) => id === selectedSourceLanguage);
  const totals = activeSource || {
    words: { total: 0, inProgress: 0, learned: 0 },
    phrases: { total: 0, inProgress: 0, learned: 0 }
  };
  const dictionaryName = selectedSourceLanguage === 'my-vocabee'
    ? `Vocabee ${myVocabeeLanguage.toUpperCase()}`
    : selectedSourceLanguage === 'de'
      ? 'DE-RU'
      : selectedSourceLanguage === 'en'
        ? 'EN-RU'
        : activeSource?.title;
  const title = dictionaryName
    ? `Статистика словаря ${dictionaryName}`
    : 'Статистика словарей';

  return (
    <section className={styles.stats} aria-labelledby="dictionary-stats-title">
      <header className={styles.header}>
        <div>
          <h2 id="dictionary-stats-title">{title}</h2>
          {!activeSource && <p>Сводка появится после загрузки словаря</p>}
        </div>
      </header>

      {activeSource && (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Тип</th>
                <th scope="col">Всего</th>
                <th scope="col">В процессе</th>
                <th scope="col">Изучено</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Слова</th>
                <td>{numberFormat.format(totals.words.total)}</td>
                <td>{numberFormat.format(totals.words.inProgress)}</td>
                <td>{numberFormat.format(totals.words.learned)}</td>
              </tr>
              <tr>
                <th scope="row">Фразы</th>
                <td>{numberFormat.format(totals.phrases.total)}</td>
                <td>{numberFormat.format(totals.phrases.inProgress)}</td>
                <td>{numberFormat.format(totals.phrases.learned)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
