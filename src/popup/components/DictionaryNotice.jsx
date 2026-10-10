import React from 'react';
import styles from './DictionaryNotice.module.css';

export function DictionaryNotice({ visible, onOpen }) {
  return (
    <>
      <button className={styles.dictionaryButton} type="button" onClick={onOpen}>
        <span className={styles.dictionaryIcon} aria-hidden="true">✦</span>
        <span>Мой словарь</span>
        <span className={styles.buttonArrow} aria-hidden="true">→</span>
      </button>
      {visible && (
        <p className={styles.dictionaryMessage} role="status">
          Открой YouTube и нажми значок Vocabee, чтобы посмотреть словарь.
        </p>
      )}
    </>
  );
}
