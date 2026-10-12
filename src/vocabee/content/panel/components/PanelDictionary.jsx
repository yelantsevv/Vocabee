import React from 'react';
import clsx from 'clsx';
import styles from './PanelDictionary.module.css';
import { DictionaryWordCard } from './DictionaryWordCard.jsx';

export function PanelDictionary({ words, status, fill }) {
  return (
    <section className={clsx(styles.dictionaryRoot, { [styles.fill]: fill })}>
      <div className={styles.dictionary}>
        <p className={styles.status} role="status" aria-live="polite">{status}</p>
        <ul className={styles.list}>
          {words.map((word) => (
            <DictionaryWordCard
              key={word.id}
              word={word.sourceText}
              translation={word.translatedText}
              translationVisible
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
