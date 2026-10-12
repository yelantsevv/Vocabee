import clsx from 'clsx';
import styles from './DictionaryPage.module.css';
import panelStyles from './SettingsPanel.module.css';
import { SettingsActionButtons } from './SettingsActionButtons.jsx';
import { DictionaryImportButton } from './DictionaryImportButton.jsx';
import { dictionaryQuickActions } from './dictionaryQuickActions.js';
import { DatabaseManager } from './DatabaseManager.jsx';

export function SettingsPanel({ settings, updateSetting, settingsStatus, catalog, modal = false }) {
  const loadedSources = new Set(catalog.availableSources.map(({ id }) => id));
  const loadedSourceActions = dictionaryQuickActions
    .filter((action) => loadedSources.has(action.id.slice('words-'.length)))
    .map((action) => {
      const sourceId = action.id.slice('words-'.length);
      const active = catalog.selectedSourceLanguage === sourceId;
      return {
        label: action.label,
        checked: true,
        active,
        disabled: catalog.catalogLoading,
        onClick: () => catalog.setSelectedSourceLanguage(sourceId)
      };
    });

  return (
    <section className={clsx(styles.content, modal && panelStyles.modalContent)} aria-label="Настройки">
      <section className={panelStyles.settings} aria-label="Настройки Vocabee">
        <SettingsActionButtons
          actions={loadedSourceActions}
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
        <label className={panelStyles.toggleSetting} htmlFor="hide-translations-until-hover">
          <span>Скрывать перевод до наведения</span>
          <input
            id="hide-translations-until-hover"
            type="checkbox"
            checked={settings.hideTranslationsUntilHover}
            onChange={(event) => updateSetting('hideTranslationsUntilHover', event.target.checked)}
          />
        </label>
        {settingsStatus && <p className={panelStyles.settingsStatus} role="status">{settingsStatus}</p>}
        <DatabaseManager />
      </section>
    </section>
  );
}
