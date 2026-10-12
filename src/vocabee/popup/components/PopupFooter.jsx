import React from 'react';
import styles from './PopupFooter.module.css';

export function PopupFooter() {
  return (
    <div className={styles.footer}>
      <span className={styles.statusDot} aria-hidden="true"></span>
      <span>Поддерживаются английские и немецкие субтитры</span>
    </div>
  );
}
