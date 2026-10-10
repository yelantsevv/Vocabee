import React from 'react';
import clsx from 'clsx';
import styles from './PanelSettings.module.css';

function FontSizeSetting({ id, label, value, unit, min, max, step, previewText, dictionaryPreview = false, onChange }) {
  return (
    <div className={styles.fontSetting}>
      <label className={styles.fontSettingLabel} htmlFor={id}>
        <strong>{label}</strong>
        <output className={styles.fontSettingValue}>{value}{unit}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
      <p className={clsx(styles.fontSettingPreview, dictionaryPreview && styles.dictionaryFontPreview)}>Пример текста {previewText}</p>
    </div>
  );
}

export function PanelSettings({ app, preferences, dictionaryFontSize, interfaceFontScale, onDictionaryFontSizeChange, onInterfaceFontScaleChange }) {
  return (
    <section className={styles.settingsRoot} data-panel-content="settings">
      <label className={clsx(styles.row, styles.toggleRow)} htmlFor="vocabee-panel-enabled">
        <span className={styles.label}><strong>Перевод</strong><small>Слова и фразы на YouTube</small></span>
        <input type="checkbox" id="vocabee-panel-enabled" checked={preferences.enabled} onChange={(event) => preferences.changeEnabled(event.target.checked)} />
        <span className={styles.switch} aria-hidden="true"></span>
      </label>
      <div className={styles.row}>
        <span className={styles.label}><strong>Язык субтитров</strong><small>Определяется автоматически</small></span>
        <span className={styles.sourceLanguage}>{preferences.sourceLanguage}</span>
      </div>
      <label className={styles.row} htmlFor="vocabee-panel-language">
        <span className={styles.label}><strong>Переводить на</strong></span>
        <select id="vocabee-panel-language" aria-label="Язык перевода" value={preferences.targetLanguage} onChange={(event) => preferences.changeLanguage(event.target.value)}>
          {app.targetLanguages.map((language) => <option key={language} value={language}>{app.languageNames[language]}</option>)}
        </select>
      </label>
      <FontSizeSetting id="vocabee-interface-font-scale" label="Размер текста интерфейса" value={interfaceFontScale} unit="%" min="80" max="140" step="5" previewText="интерфейса" onChange={onInterfaceFontScaleChange} />
      <FontSizeSetting id="vocabee-dictionary-font-size" label="Размер текста словаря" value={dictionaryFontSize} unit=" px" min="12" max="24" step="1" previewText="словаря" dictionaryPreview onChange={onDictionaryFontSizeChange} />
      <p className={styles.settingsFooter}>Поддерживаются английские и немецкие субтитры</p>
    </section>
  );
}
