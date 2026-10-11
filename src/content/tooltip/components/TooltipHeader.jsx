import React from 'react';
import styles from './TooltipHeader.module.css';

export function TooltipHeader({ onClose }) {
  return (
    <header className={styles.headerRoot}>
      <button className={styles.close} type="button" aria-label="Закрыть перевод" onClick={onClose}>×</button>
    </header>
  );
}
