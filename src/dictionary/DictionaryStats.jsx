import styles from './DictionaryStats.module.css';
import { useInterfaceText } from './interfaceLanguage.jsx';

const numberFormat = new Intl.NumberFormat('ru-RU');

export function DictionaryStats({ sources, selectedSourceLanguage }) {
  const t = useInterfaceText();
  const activeSource = sources.find(({ id }) => id === selectedSourceLanguage);
  const totals = activeSource || {
    words: { total: 0, inProgress: 0, learned: 0 },
    phrases: { total: 0, inProgress: 0, learned: 0 }
  };
  const dictionaryLanguage = selectedSourceLanguage === 'de' ? 'DE-RU' : 'EN-RU';
  const title = selectedSourceLanguage
    ? `Статистика словаря ${dictionaryLanguage}`
    : 'Статистика словарей';

  return (
    <section className={styles.stats} aria-labelledby="dictionary-stats-title">
      <header className={styles.header}>
        <div>
          <h2 id="dictionary-stats-title">{t(title)}</h2>
          {!activeSource && <p>{t('Сводка появится после загрузки словаря')}</p>}
        </div>
      </header>

      {activeSource && (
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
