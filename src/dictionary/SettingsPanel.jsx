import clsx from 'clsx';
import styles from './DictionaryPage.module.css';
import panelStyles from './SettingsPanel.module.css';
import { SettingsActionButtons } from '../settings/SettingsActionButtons.jsx';
import { DictionaryImportButton } from './DictionaryImportButton.jsx';
import { dictionaryQuickActions } from '../settings/dictionaryQuickActions.js';
import { DatabaseManager } from './DatabaseManager.jsx';

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

export function SettingsPanel({ settings, updateSetting, settingsStatus, catalog, onLoadDictionary }) {
  const loadedSources = new Set(catalog.availableSources.map(({ id }) => id));
  const quickLoadActions = dictionaryQuickActions.map((action) => {
    const sourceId = action.id.slice('words-'.length);
    const checked = loadedSources.has(sourceId);
    const active = catalog.selectedSourceLanguage === sourceId;
    return {
      label: action.label,
      checked,
      active,
      disabled: catalog.catalogLoading,
      onClick: () => {
        if (checked) catalog.setSelectedSourceLanguage(sourceId);
        else onLoadDictionary(sourceId);
      }
    };
  });

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
        <label className={panelStyles.batchSizeSetting} htmlFor="cards-per-load">
          <span>Карточек за загрузку</span>
          <select
            id="cards-per-load"
            value={settings.cardsPerLoad}
            onChange={(event) => updateSetting('cardsPerLoad', event.target.value)}
          >
            {[5, 10, 20, 30, 50, 100, 200].map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </label>
        {settingsStatus && <p className={panelStyles.settingsStatus} role="status">{settingsStatus}</p>}
        <DatabaseManager />
      </section>
    </section>
  );
}
