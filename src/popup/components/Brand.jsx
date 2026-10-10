import React from 'react';
import styles from './Brand.module.css';

export function Brand() {
  return (
    <header className={styles.brand}>
      <img className={styles.brandIcon} src="../icons/vocabee.svg" alt="" />
      <div className={styles.brandCopy}>
        <h1>Vocabee</h1>
        <p>Слова, которые остаются с тобой</p>
      </div>
      <span className={styles.freeBadge}>FREE</span>
    </header>
  );
}
