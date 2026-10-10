import React from 'react';
import styles from './TooltipActions.module.css';

export function TooltipActions({ loading, translated, addStatus, feedback, targetLanguage, onSpeak, onCopy, onAdd }) {
  const hasTranslation = Boolean(translated && translated !== 'Перевод недоступен');
  const canSpeak = typeof window.speechSynthesis !== 'undefined';

  return (
    <div className={styles.actionsRoot}>
      <div className={styles.translationRow}>
        <div className={styles.translation}>{loading ? 'Перевожу…' : translated || 'Перевод недоступен'}</div>
        <button className={styles.speak} type="button" data-speech="translation" aria-label="Озвучить перевод" disabled={loading || !canSpeak || !hasTranslation} onClick={() => onSpeak(translated, targetLanguage)}>🔊</button>
      </div>
      <footer className={styles.footer}>
        <span>{loading ? 'Запрос к Google Translate' : 'Vocabee'}</span>
        <div className={styles.actions}>
          <button className={styles.copy} type="button" disabled={loading} onClick={onCopy}>Копировать</button>
          <button className={styles.addToDictionary} type="button" disabled={loading || !hasTranslation || addStatus === 'Сохраняю…'} onClick={onAdd}>{addStatus || 'Добавить в словарь'}</button>
          <span className={styles.feedback} role="status" aria-live="polite">{feedback}</span>
        </div>
      </footer>
    </div>
  );
}
