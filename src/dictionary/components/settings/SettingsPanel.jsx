import clsx from 'clsx';
import { useEffect, useState } from 'react';
import styles from '../../styles/DictionaryPage.module.css';
import panelStyles from './SettingsPanel.module.css';
import { SettingsActionButtons } from './SettingsActionButtons.jsx';
import { dictionaryQuickActions } from '../../config/dictionaryQuickActions.js';
import { DatabaseManager } from './DatabaseManager.jsx';
import { DictionaryStats } from '../catalog/DictionaryStats.jsx';
import { DICTIONARY_THEMES } from '../../utils/settings.js';
import { useInterfaceText } from '../../i18n/interfaceLanguage.jsx';

export function SettingsPanel({
  settings,
  updateSetting,
  settingsStatus,
  catalog,
  speechLanguage = 'en',
  modal = false
}) {
  const t = useInterfaceText();
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    const speechSynthesis = window.speechSynthesis;
    if (!speechSynthesis) return undefined;

    const updateVoices = () => {
      setAvailableVoices(speechSynthesis.getVoices()
        .filter((voice) => new RegExp(`^${speechLanguage}(?:-|$)`, 'i').test(voice.lang))
        .sort((first, second) => first.name.localeCompare(second.name)));
    };

    updateVoices();
    speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
    return () => speechSynthesis.removeEventListener?.('voiceschanged', updateVoices);
  }, [speechLanguage]);

  const speechVoiceURI = settings.speechVoiceURIs?.[speechLanguage] || '';
  const selectedVoiceAvailable = availableVoices.some((voice) => voice.voiceURI === speechVoiceURI);

  const loadedSources = new Set(catalog.availableSources.map(({ id }) => id));
  const actions = dictionaryQuickActions.map((action) => {
      const sourceId = action.id.slice('words-'.length);
      const active = catalog.selectedSourceLanguage === sourceId;
      const loaded = loadedSources.has(sourceId);
      return {
        label: loaded ? action.label : `Загрузить словарь ${action.label}`,
        checked: loaded,
        active: loaded && active,
        disabled: catalog.catalogLoading || catalog.remoteImportLoading,
        onClick: loaded
          ? () => catalog.setSelectedSourceLanguage(sourceId)
          : () => catalog.importDictionaryFromUrl(sourceId)
      };
    });

  return (
    <section className={clsx(styles.content, modal && panelStyles.modalContent)} aria-label={t('Настройки')}>
      <section className={panelStyles.settings} aria-label={t('Настройки Vocabee')}>
        <SettingsActionButtons
          actions={actions}
        />
        <DictionaryStats sources={catalog.availableSources} selectedSourceLanguage={catalog.selectedSourceLanguage} />
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
        <label className={panelStyles.voiceSetting} htmlFor="dictionary-speech-voice">
          <span>
            <strong>{t('Голос озвучки')} · {speechLanguage.toUpperCase()}</strong>
          </span>
          <select
            id="dictionary-speech-voice"
            value={speechVoiceURI}
            onChange={(event) => updateSetting('speechVoiceURIs', {
              ...settings.speechVoiceURIs,
              [speechLanguage]: event.target.value
            })}
          >
            <option value="">{t('Автоматический голос')}</option>
            {speechVoiceURI && !selectedVoiceAvailable && (
              <option value={speechVoiceURI}>{t('Сохранённый голос недоступен')}</option>
            )}
            {availableVoices.map((voice) => (
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
        {settingsStatus && <p className={panelStyles.settingsStatus} role="status">{t(settingsStatus)}</p>}
        <DatabaseManager />
      </section>
    </section>
  );
}
