import React from 'react';
import clsx from 'clsx';
import { targetLanguages } from '../../shared/languages.js';
import styles from './SettingsCard.module.css';

export function SettingsCard({ enabled, language, sourceLanguage, onEnabledChange, onLanguageChange }) {
  return (
    <section className={styles.settingsCard} aria-label="Настройки перевода">
      <label className={clsx(styles.settingRow, styles.toggleRow)} htmlFor="enabled">
        <span className={styles.settingCopy}>
          <strong>Перевод</strong>
          <small>Слова и фразы на YouTube</small>
        </span>
        <input type="checkbox" id="enabled" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
        <span className={styles.toggle} aria-hidden="true"></span>
      </label>
      <div className={clsx(styles.settingRow, styles.languageRow)}>
        <span className={styles.settingCopy}>
          <strong>Язык субтитров</strong>
          <small>Определяется автоматически</small>
        </span>
        <span className={styles.languageValue}>{sourceLanguage}</span>
      </div>
      <label className={clsx(styles.settingRow, styles.targetRow)} htmlFor="lang">
        <span className={styles.settingCopy}><strong>Переводить на</strong></span>
        <select id="lang" aria-label="Язык перевода" value={language} onChange={(event) => onLanguageChange(event.target.value)}>
          {targetLanguages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </section>
  );
}
