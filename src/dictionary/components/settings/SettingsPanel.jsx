import clsx from 'clsx';
import { useEffect, useState } from 'react';
import styles from '../../styles/DictionaryPage.module.css';
import panelStyles from './SettingsPanel.module.css';
import { SettingsActionButtons } from './SettingsActionButtons.jsx';
import { dictionaryQuickActions } from '../../config/dictionaryQuickActions.js';
import { DatabaseManager } from './DatabaseManager.jsx';
import { DictionaryStats } from '../catalog/DictionaryStats.jsx';
import { DICTIONARY_THEMES } from '../../utils/settings.js';

export function SettingsPanel({
  settings,
  updateSetting,
  settingsStatus,
  catalog,
  speechLanguage = 'en',
  modal = false
}) {
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    const speechSynthesis = window.speechSynthesis;
    if (!speechSynthesis) return undefined;

    const updateVoices = () => {
      let voices = [];

      try {
        voices = speechSynthesis.getVoices();
      } catch {
        return;
      }

      const languagePrefix = speechLanguage.toLowerCase();
      const languageVoices = voices
        .filter((voice) => {
          const voiceLanguage = voice.lang?.replaceAll('_', '-').toLowerCase();
          return voiceLanguage === languagePrefix || voiceLanguage?.startsWith(`${languagePrefix}-`);
        })
        .sort((first, second) => first.name.localeCompare(second.name));

      setAvailableVoices((currentVoices) => {
        const currentURIs = currentVoices.map((voice) => voice.voiceURI).join('|');
        const nextURIs = languageVoices.map((voice) => voice.voiceURI).join('|');
        return currentURIs === nextURIs ? currentVoices : languageVoices;
      });
    };

    updateVoices();

    // Mobile browsers may populate the voice list asynchronously or only
    // after the page has been shown again.
    const retryTimers = [150, 500, 1200, 2500].map((delay) => window.setTimeout(updateVoices, delay));
    const supportsVoiceEvents = typeof speechSynthesis.addEventListener === 'function';
    let previousVoiceChangeHandler;

    if (supportsVoiceEvents) {
      speechSynthesis.addEventListener('voiceschanged', updateVoices);
    } else if ('onvoiceschanged' in speechSynthesis) {
      previousVoiceChangeHandler = speechSynthesis.onvoiceschanged;
      speechSynthesis.onvoiceschanged = updateVoices;
    }

    const updateWhenVisible = () => {
      if (!document.hidden) updateVoices();
    };

    document.addEventListener('visibilitychange', updateWhenVisible);
    window.addEventListener('pageshow', updateVoices);

    return () => {
      retryTimers.forEach(window.clearTimeout);
      if (supportsVoiceEvents) {
        speechSynthesis.removeEventListener('voiceschanged', updateVoices);
      } else if (speechSynthesis.onvoiceschanged === updateVoices) {
        speechSynthesis.onvoiceschanged = previousVoiceChangeHandler || null;
      }
      document.removeEventListener('visibilitychange', updateWhenVisible);
      window.removeEventListener('pageshow', updateVoices);
    };
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
    <section className={clsx(styles.content, modal && panelStyles.modalContent)} aria-label='Настройки'>
      <section className={panelStyles.settings} aria-label='Настройки Vocabee'>
        <SettingsActionButtons
          actions={actions}
        />
        <DictionaryStats sources={catalog.availableSources} selectedSourceLanguage={catalog.selectedSourceLanguage} />
        <section className={panelStyles.fontSizeSettings} aria-label='Размер текста'>
          <label className={panelStyles.fontSizeControl} htmlFor="content-font-size">
            <span>
              <strong>Основной текст</strong>
            </span>
            <select
              id="content-font-size"
              value={settings.contentFontSize}
              onChange={(event) => updateSetting('contentFontSize', event.target.value)}
            >
              {[18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48].map((size) => (
                <option key={size} value={size}>{size} px</option>
              ))}
            </select>
          </label>
          <label className={panelStyles.fontSizeControl} htmlFor="additional-font-size">
            <span>
              <strong>Дополнительный текст</strong>
            </span>
            <select
              id="additional-font-size"
              value={settings.additionalFontSize}
              onChange={(event) => updateSetting('additionalFontSize', event.target.value)}
            >
              {[12, 14, 16, 17, 18, 20, 22, 24, 26, 28].map((size) => (
                <option key={size} value={size}>{size} px</option>
              ))}
            </select>
          </label>
        </section>
        <fieldset className={panelStyles.themeSetting}>
          <legend>Тема приложения</legend>
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
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {catalog.importStatus && <p className={panelStyles.settingsStatus} role="status">{catalog.importStatus}</p>}
        <label className={panelStyles.batchSizeSetting} htmlFor="cards-per-load">
          <span>Карточек за загрузку</span>
          <select
            id="cards-per-load"
            value={settings.cardsPerLoad}
            onChange={(event) => updateSetting('cardsPerLoad', event.target.value)}
          >
            {[2, 5, 10, 20].map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
          {availableVoices.length === 0 && (
            <small>Дополнительные голоса {speechLanguage.toUpperCase()} не предоставлены браузером устройства.</small>
          )}
        </label>
        <label className={panelStyles.voiceSetting} htmlFor="dictionary-speech-voice">
          <span>
            <strong>Голос озвучки · {speechLanguage.toUpperCase()}</strong>
          </span>
          <select
            id="dictionary-speech-voice"
            value={speechVoiceURI}
            onChange={(event) => updateSetting('speechVoiceURIs', {
              ...settings.speechVoiceURIs,
              [speechLanguage]: event.target.value
            })}
          >
            <option value="">Автоматический голос</option>
            {speechVoiceURI && !selectedVoiceAvailable && (
              <option value={speechVoiceURI}>Сохранённый голос недоступен</option>
            )}
            {availableVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} · {voice.lang}{voice.default ? ' · по умолчанию' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className={panelStyles.toggleSetting} htmlFor="hide-translations-until-hover">
          <span>Скрывать перевод</span>
          <input
            id="hide-translations-until-hover"
            type="checkbox"
            checked={settings.hideTranslationsUntilHover}
            onChange={(event) => updateSetting('hideTranslationsUntilHover', event.target.checked)}
          />
        </label>
        <label className={panelStyles.batchSizeSetting} htmlFor="examples-per-card">
          <span>Примеров на карточке</span>
          <select
            id="examples-per-card"
            value={settings.examplesPerCard}
            onChange={(event) => updateSetting('examplesPerCard', event.target.value)}
          >
            {[0, 1, 2, 3].map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </label>
        <label className={panelStyles.toggleSetting} htmlFor="show-word-relations">
          <span>Показывать синонимы и антонимы</span>
          <input
            id="show-word-relations"
            type="checkbox"
            checked={settings.showWordRelations}
            onChange={(event) => updateSetting('showWordRelations', event.target.checked)}
          />
        </label>
        <DatabaseManager />
      </section>
    </section>
  );
}
