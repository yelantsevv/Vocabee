import React from 'react';
import clsx from 'clsx';
import styles from './PanelDictionary.module.css';

export function PanelDictionary({ words, status, languagePairs, fill }) {
  return (
    <section className={clsx(styles.dictionaryRoot, { [styles.fill]: fill })}>
      <div className={styles.heading}>
        <h2 className={styles.title}>Мой словарь</h2>
        <p className={styles.languagePair}>{languagePairs.join(' · ')}</p>
      </div>
      <div className={styles.dictionary}>
        <p className={styles.status} role="status" aria-live="polite">{status}</p>
        <ul className={styles.list}>
          {words.map((word) => (
            <li className={styles.item} key={word.id}>
              <div className={styles.pair}>
                <strong className={styles.source}>{word.sourceText}</strong>
                <span className={styles.translation}>{word.translatedText}</span>
              </div>
              <small className={styles.details}>
                {new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(new Date(word.addedAt))}
              </small>
            </li>
          ))}
        </ul>
      </div>
      <p className={styles.hint}>Добавляй слова из карточки перевода на YouTube.</p>
    </section>
  );
}
