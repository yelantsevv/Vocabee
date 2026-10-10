import React from 'react';
import styles from './TooltipHeader.module.css';

export function TooltipHeader({ app, tooltip, onLanguageChange, onSpeak, onClose }) {
  const canSpeak = typeof window.speechSynthesis !== 'undefined';

  return (
    <header className={styles.headerRoot}>
      <div>
        <div className={styles.language}>
          {app.languageNames[app.state.sourceLang] || 'Английский'}
          <span className={styles.languageArrow}>→</span>
          <select className={styles.targetLanguage} aria-label="Язык перевода" value={app.state.lang} onChange={(event) => onLanguageChange(event.target.value)}>
            {app.targetLanguages.map((language) => <option key={language} value={language}>{app.languageNames[language]}</option>)}
          </select>
        </div>
        <div className={styles.wordRow}>
          <div className={styles.title}>{tooltip.text}</div>
          <button className={styles.speak} type="button" data-speech="source" aria-label="Озвучить исходный текст" disabled={tooltip.loading || !canSpeak} onClick={() => onSpeak(tooltip.text, app.state.sourceLang)}>🔊</button>
        </div>
        {tooltip.details?.pronunciation && <div className={styles.pronunciation}>{tooltip.details.pronunciation}</div>}
      </div>
      <button className={styles.close} type="button" aria-label="Закрыть перевод" onClick={onClose}>×</button>
    </header>
  );
}
