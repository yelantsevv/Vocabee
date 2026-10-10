import clsx from 'clsx';
import styles from './DictionaryPage.module.css';
import panelStyles from './SettingsPanel.module.css';
import { SettingsActionButtons } from '../settings/SettingsActionButtons.jsx';
import { DictionaryImportButton } from './DictionaryImportButton.jsx';
import { dictionaryQuickActions } from '../settings/dictionaryQuickActions.js';

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

export function SettingsPanel({ settings, updateSetting, settingsStatus, catalog, onLoadDictionary, onLoadPhraseSection }) {
  const quickLoadActions = [
    ...dictionaryQuickActions.map((action) => ({
      label: action.label,
      onClick: () => action.id.startsWith('words-')
        ? onLoadDictionary(action.id.slice('words-'.length))
        : onLoadPhraseSection(action.id.slice('phrase-'.length))
    }))
  ];

  return (
    <section className={styles.content} aria-label="Настройки">
      <section className={panelStyles.settings} aria-label="Настройки Vocabee">
        <SettingsActionButtons
          actions={quickLoadActions}
          firstAction={(
            <DictionaryImportButton
              key="import-dictionary"
              inputRef={catalog.importInputRef}
              onImportFile={catalog.importDictionaryFile}
              fill
            />
          )}
        />
        {catalog.importStatus && <p className={panelStyles.settingsStatus} role="status">{catalog.importStatus}</p>}
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
