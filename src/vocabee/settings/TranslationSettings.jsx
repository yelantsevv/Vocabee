import clsx from 'clsx';
import { targetLanguages } from '../../shared/languages.js';
import styles from './TranslationSettings.module.css';

export function TranslationSettings({
  idPrefix,
  variant = 'page',
  enabled,
  sourceLanguage = '',
  targetLanguage,
  onEnabledChange,
  onTargetLanguageChange
}) {
  const enabledId = `${idPrefix}-enabled`;
  const languageId = `${idPrefix}-language`;

  return (
    <div className={styles.controls} data-variant={variant}>
      <label className={clsx(styles.row, styles.toggleRow)} htmlFor={enabledId}>
        <span className={styles.copy}>
          <strong>Перевод</strong>
          <small>Слова и фразы на YouTube</small>
        </span>
        <input
          id={enabledId}
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        <span className={styles.toggle} aria-hidden="true" />
      </label>

      <div className={clsx(styles.row, styles.languageRow)}>
        <span className={styles.copy}>
          <strong>Язык субтитров</strong>
          <small>Определяется автоматически на YouTube</small>
        </span>
        <div className={styles.languageControls}>
          {sourceLanguage && <span className={styles.sourceLanguage}>{sourceLanguage}</span>}
          <label className={styles.targetLanguage} htmlFor={languageId}>
            <span>Перевод</span>
            <select
              id={languageId}
              aria-label="Язык перевода"
              value={targetLanguage}
              onChange={(event) => onTargetLanguageChange(event.target.value)}
            >
              {targetLanguages.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
