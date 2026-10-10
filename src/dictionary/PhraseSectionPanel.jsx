import clsx from 'clsx';
import commonStyles from './DictionaryPage.module.css';
import styles from './PhraseSectionPanel.module.css';

export function PhraseSectionPanel({ section, onBack }) {
  return (
    <section className={clsx(commonStyles.content, styles.phraseContent)} aria-labelledby="phrase-section-title">
      <header className={styles.phraseHeader}>
        <div>
          <h1 id="phrase-section-title">{section.title}</h1>
          <p>{section.description} · {section.phrases.length} фраз</p>
        </div>
        <button className={styles.backButton} type="button" onClick={onBack}>← К словарю</button>
      </header>
      <section className={commonStyles.wordList} aria-label={section.title}>
        <ul>
          {section.phrases.map(([phrase, translation]) => (
            <li className={commonStyles.word} key={phrase}>
              <div className={commonStyles.wordPair}>
                <strong>{phrase}</strong>
                <span>{translation}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
