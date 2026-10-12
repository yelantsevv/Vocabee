import React from 'react';
import clsx from 'clsx';
import { TranslationSettings } from '../../../settings/TranslationSettings.jsx';
import { SettingsSwitch } from '../../../settings/SettingsSwitch.jsx';
import styles from './PanelSettings.module.css';

function FontSizeSetting({ id, label, value, unit, min, max, step, previewText, showPreview = true, dictionaryPreview = false, onChange }) {
  return (
    <div className={styles.fontSetting}>
      <label className={styles.fontSettingLabel} htmlFor={id}>
        <strong>{label}</strong>
        <output className={styles.fontSettingValue}>{value}{unit}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
      {showPreview && <p className={clsx(styles.fontSettingPreview, dictionaryPreview && styles.dictionaryFontPreview)}>Пример текста {previewText}</p>}
    </div>
  );
}

export function PanelSettings({ preferences, dictionaryFontSize, interfaceFontScale, theme, onThemeChange, onDictionaryFontSizeChange, onInterfaceFontScaleChange, }) {
  return (
    <section className={styles.settingsRoot} data-panel-content="settings">
      <TranslationSettings
        idPrefix="panel"
        variant="panel"
        enabled={preferences.enabled}
        onEnabledChange={preferences.changeEnabled}
      />
      <SettingsSwitch
        id="vocabee-color-theme"
        label="Тема оформления"
        checked={theme === 'dark'}
        onChange={(isDark) => onThemeChange(isDark ? 'dark' : 'light')}
      />
      <FontSizeSetting id="vocabee-interface-font-scale" label="Размер текста интерфейса" value={interfaceFontScale} unit="%" min="80" max="140" step="5" previewText="интерфейса" showPreview={false} onChange={onInterfaceFontScaleChange} />
      <FontSizeSetting id="vocabee-dictionary-font-size" label="Размер текста словаря" value={dictionaryFontSize} unit=" px" min="12" max="24" step="1" previewText="словаря" dictionaryPreview onChange={onDictionaryFontSizeChange} />
    </section>
  );
}
