import styles from './DictionaryStats.module.css';
import { useInterfaceText } from './interfaceLanguage.jsx';

const numberFormat = new Intl.NumberFormat('ru-RU');

export function DictionaryStats({ sources }) {
  const t = useInterfaceText();
  const totals = sources.reduce((total, source) => ({
    words: {
      total: total.words.total + source.words.total,
      inProgress: total.words.inProgress + source.words.inProgress,
      learned: total.words.learned + source.words.learned
    },
    phrases: {
      total: total.phrases.total + source.phrases.total,
      inProgress: total.phrases.inProgress + source.phrases.inProgress,
      learned: total.phrases.learned + source.phrases.learned
    }
  }), {
    words: { total: 0, inProgress: 0, learned: 0 },
    phrases: { total: 0, inProgress: 0, learned: 0 }
  });

  return (
    <section className={styles.stats} aria-labelledby="dictionary-stats-title">
      <header className={styles.header}>
        <div>
          <h2 id="dictionary-stats-title">{t('Статистика словарей')}</h2>
          {sources.length === 0 && <p>{t('Сводка появится после загрузки словаря')}</p>}
        </div>
      </header>

      {sources.length > 0 && (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('Тип')}</th>
                <th scope="col">{t('Всего')}</th>
                <th scope="col">{t('В процессе')}</th>
                <th scope="col">{t('Изучено')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t('Слова')}</th>
                <td>{numberFormat.format(totals.words.total)}</td>
                <td>{numberFormat.format(totals.words.inProgress)}</td>
                <td>{numberFormat.format(totals.words.learned)}</td>
              </tr>
              <tr>
                <th scope="row">{t('Фразы')}</th>
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
