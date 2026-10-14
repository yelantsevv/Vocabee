import clsx from 'clsx';
import { useEffect, useState } from 'react';
import styles from './DictionaryPage.module.css';
import panelStyles from './SettingsPanel.module.css';
import { SettingsActionButtons } from './SettingsActionButtons.jsx';
import { DictionaryImportButton } from './DictionaryImportButton.jsx';
import { dictionaryQuickActions } from './dictionaryQuickActions.js';
import { DatabaseManager } from './DatabaseManager.jsx';
import { DictionaryStats } from './DictionaryStats.jsx';
import { DICTIONARY_THEMES } from './settings.js';
import { useInterfaceText } from './interfaceLanguage.jsx';

export function SettingsPanel({
  settings,
  updateSetting,
  settingsStatus,
  catalog,
  refreshButtonPosition,
  refreshButtonPositionEditing,
  onRefreshButtonPositionEditingChange,
  onResetRefreshButtonPosition,
  modal = false
}) {
  const t = useInterfaceText();
  const [englishVoices, setEnglishVoices] = useState([]);

  useEffect(() => {
    const speechSynthesis = window.speechSynthesis;
    if (!speechSynthesis) return undefined;

    const updateVoices = () => {
      setEnglishVoices(speechSynthesis.getVoices()
        .filter((voice) => /^en(?:-|$)/i.test(voice.lang))
        .sort((first, second) => first.name.localeCompare(second.name)));
    };

    updateVoices();
    speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
    return () => speechSynthesis.removeEventListener?.('voiceschanged', updateVoices);
  }, []);

  const selectedVoiceAvailable = englishVoices.some((voice) => voice.voiceURI === settings.speechVoiceURI);

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
  const hasEnglishDictionary = loadedSources.has('en');
  const actions = [
    ...(!hasEnglishDictionary ? [{
      label: catalog.remoteImportLoading ? t('Загружаю словарь EN → RU…') : t('Загрузить словарь EN → RU'),
      disabled: catalog.catalogLoading || catalog.remoteImportLoading,
      onClick: catalog.importDictionaryFromUrl
    }] : []),
    ...loadedSourceActions
  ];

  return (
    <section className={clsx(styles.content, modal && panelStyles.modalContent)} aria-label={t('Настройки')}>
      <section className={panelStyles.settings} aria-label={t('Настройки Vocabee')}>
        <SettingsActionButtons
          actions={actions}
          firstAction={(
            <DictionaryImportButton
              key="import-dictionary"
              inputRef={catalog.importInputRef}
              onImportFile={catalog.importDictionaryFile}
              fill
            />
          )}
        />
        <DictionaryStats sources={catalog.availableSources} />
        <label className={panelStyles.voiceSetting} htmlFor="interface-language">
          <span><strong>{t('Язык интерфейса')}</strong></span>
          <select
            id="interface-language"
            value={settings.interfaceLanguage}
            onChange={(event) => updateSetting('interfaceLanguage', event.target.value)}
          >
            <option value="en">{t('Английский')}</option>
            <option value="ru">{t('Русский')}</option>
          </select>
        </label>
        <section className={panelStyles.fontSizeSettings} aria-label={t('Размер текста')}>
          <label className={panelStyles.fontSizeControl} htmlFor="content-font-size">
            <span>
              <strong>{t('Основной текст')}</strong>
            </span>
            <output htmlFor="content-font-size">{settings.contentFontSize} px</output>
            <input
              id="content-font-size"
              type="range"
              min="18"
              max="48"
              step="1"
              value={settings.contentFontSize}
              onChange={(event) => updateSetting('contentFontSize', event.target.value)}
            />
          </label>
          <label className={panelStyles.fontSizeControl} htmlFor="additional-font-size">
            <span>
              <strong>{t('Дополнительный текст')}</strong>
            </span>
            <output htmlFor="additional-font-size">{settings.additionalFontSize} px</output>
            <input
              id="additional-font-size"
              type="range"
              min="12"
              max="28"
              step="1"
              value={settings.additionalFontSize}
              onChange={(event) => updateSetting('additionalFontSize', event.target.value)}
            />
          </label>
        </section>
        <fieldset className={panelStyles.themeSetting}>
          <legend>{t('Тема приложения')}</legend>
          <div className={panelStyles.themeOptions}>
            {DICTIONARY_THEMES.map(({ id, label }) => (
              <label
                className={panelStyles.themeOption}
                data-theme-option={id}
                key={id}
              >
                <input
                  type="radio"
                  name="dictionary-theme"
                  value={id}
                  checked={settings.theme === id}
                  onChange={() => updateSetting('theme', id)}
                />
                <span className={panelStyles.themeSwatch} aria-hidden="true" />
                <span>{t(label)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {catalog.importStatus && <p className={panelStyles.settingsStatus} role="status">{t(catalog.importStatus)}</p>}
        <label className={panelStyles.batchSizeSetting} htmlFor="cards-per-load">
          <span>{t('Карточек за загрузку')}</span>
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
        <label className={panelStyles.voiceSetting} htmlFor="english-speech-voice">
          <span>
            <strong>{t('Голос английской озвучки')}</strong>
          </span>
          <select
            id="english-speech-voice"
            value={settings.speechVoiceURI || ''}
            onChange={(event) => updateSetting('speechVoiceURI', event.target.value)}
          >
            <option value="">{t('Автоматический голос')}</option>
            {settings.speechVoiceURI && !selectedVoiceAvailable && (
              <option value={settings.speechVoiceURI}>{t('Сохранённый голос недоступен')}</option>
            )}
            {englishVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} · {voice.lang}{voice.default ? ` · ${t('по умолчанию')}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className={panelStyles.toggleSetting} htmlFor="hide-translations-until-hover">
          <span>{t('Скрывать перевод до наведения')}</span>
          <input
            id="hide-translations-until-hover"
            type="checkbox"
            checked={settings.hideTranslationsUntilHover}
            onChange={(event) => updateSetting('hideTranslationsUntilHover', event.target.checked)}
          />
        </label>
        <section className={panelStyles.positionSetting} aria-labelledby="refresh-button-position-title">
          <h2 id="refresh-button-position-title">{t('Положение кнопки обновления')}</h2>
          <label className={panelStyles.positionToggle} htmlFor="edit-refresh-button-position">
            <span>{t('Перемещать кнопку')}</span>
            <input
              id="edit-refresh-button-position"
              type="checkbox"
              checked={refreshButtonPositionEditing}
              onChange={(event) => onRefreshButtonPositionEditingChange(event.target.checked)}
            />
          </label>
          <label className={panelStyles.positionToggle} htmlFor="show-refresh-button">
            <span>{t('Скрыть кнопку обновления')}</span>
            <input
              id="show-refresh-button"
              type="checkbox"
              checked={!settings.showRefreshButton}
              onChange={(event) => updateSetting('showRefreshButton', !event.target.checked)}
            />
          </label>
          <p className={panelStyles.positionHint}>
            {t('Включите настройку, перетащите появившуюся кнопку в нужное место и выключите её.')}
          </p>
          <button
            className={panelStyles.positionReset}
            type="button"
            onClick={onResetRefreshButtonPosition}
            disabled={!refreshButtonPosition}
          >{t('Сбросить положение')}</button>
        </section>
        {settingsStatus && <p className={panelStyles.settingsStatus} role="status">{t(settingsStatus)}</p>}
        <DatabaseManager />
      </section>
    </section>
  );
}
