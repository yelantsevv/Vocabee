import clsx from 'clsx';
import styles from './DictionaryPage.module.css';
import panelStyles from './SettingsPanel.module.css';

function FontSizeSetting({ id, label, value, unit, min, max, step, previewText, dictionaryPreview, onChange }) {
  return (
    <div className={panelStyles.fontSetting}>
      <label className={panelStyles.settingLabel} htmlFor={id}>
        <strong>{label}</strong>
        <output>{value}{unit}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className={clsx(panelStyles.settingPreview, dictionaryPreview && panelStyles.dictionaryPreview)}>
        Пример текста {previewText}
      </p>
    </div>
  );
}

export function SettingsPanel({ settings, updateSetting, settingsStatus, languageNames, targetLanguages }) {
  return (
    <section className={styles.content} aria-labelledby="settings-title">
      <div className={styles.titleRow}>
        <div>
          <h1 id="settings-title">Настройки</h1>
          <p className={styles.languagePair}>Параметры расширения и словаря</p>
        </div>
      </div>
      <section className={panelStyles.settings} aria-label="Настройки Vocabee">
        <label className={clsx(panelStyles.settingRow, panelStyles.toggleRow)} htmlFor="translation-enabled">
          <span className={panelStyles.settingCopy}>
            <strong>Перевод</strong>
            <small>Слова и фразы на YouTube</small>
          </span>
          <input
            id="translation-enabled"
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => updateSetting('enabled', event.target.checked)}
          />
          <span className={panelStyles.switch} aria-hidden="true" />
        </label>
        <div className={panelStyles.settingRow}>
          <span className={panelStyles.settingCopy}>
            <strong>Язык субтитров</strong>
            <small>Определяется автоматически на YouTube</small>
          </span>
          <span className={panelStyles.settingValue}>Автоматически</span>
        </div>
        <label className={panelStyles.settingRow} htmlFor="target-language">
          <span className={panelStyles.settingCopy}><strong>Переводить на</strong></span>
          <select
            id="target-language"
            value={settings.lang}
            onChange={(event) => updateSetting('lang', event.target.value)}
          >
            {targetLanguages.map((language) => (
              <option key={language} value={language}>{languageNames[language]}</option>
            ))}
          </select>
        </label>
        <FontSizeSetting
          id="interface-font-scale"
          label="Размер текста интерфейса"
          value={settings.interfaceFontScale}
          unit="%"
          min="80"
          max="140"
          step="5"
          previewText="интерфейса"
          onChange={(value) => updateSetting('interfaceFontScale', value)}
        />
        <FontSizeSetting
          id="dictionary-font-size"
          label="Размер текста словаря"
          value={settings.dictionaryFontSize}
          unit=" px"
          min="12"
          max="24"
          step="1"
          previewText="словаря"
          dictionaryPreview
          onChange={(value) => updateSetting('dictionaryFontSize', value)}
        />
        <p className={panelStyles.settingsFooter}>Поддерживаются английские и немецкие субтитры</p>
        {settingsStatus && <p className={panelStyles.settingsStatus} role="status">{settingsStatus}</p>}
      </section>
    </section>
  );
}
