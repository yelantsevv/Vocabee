import React from 'react';
import styles from './TooltipActions.module.css';

export function TooltipActions({ loading, translated, studyStatus, addStatus, feedback, onStudy, onAdd }) {
  const hasTranslation = Boolean(translated && translated !== 'Перевод недоступен');

  return (
    <div className={styles.actionsRoot}>
      <footer className={styles.footer}>
        <span>{loading ? 'Запрос к Google Translate' : 'Vocabee'}</span>
        <div className={styles.actions}>
          <button className={styles.study} type="button" disabled={loading || !hasTranslation || studyStatus === 'Добавляю…'} onClick={onStudy}>{studyStatus || 'Изучать'}</button>
          <button className={styles.addToDictionary} type="button" disabled={loading || !hasTranslation || addStatus === 'Сохраняю…'} onClick={onAdd}>{addStatus || 'Добавить в словарь'}</button>
          <span className={styles.feedback} role="status" aria-live="polite">{feedback}</span>
        </div>
      </footer>
    </div>
  );
}
