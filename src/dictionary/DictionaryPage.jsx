import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './dictionaryThemes.css';
import styles from './DictionaryPage.module.css';
import {
  getDictionarySettings,
  saveDictionarySettings
} from './storage.js';
import {
  DEFAULT_DICTIONARY_FONT_SIZE,
  DEFAULT_DICTIONARY_THEME,
  DEFAULT_INTERFACE_FONT_SCALE,
  DEFAULT_CONTENT_FONT_SIZE,
  DEFAULT_ADDITIONAL_FONT_SIZE,
  DEFAULT_SPEECH_VOICE_URI,
  DEFAULT_INTERFACE_LANGUAGE,
  normalizeDictionaryTheme,
  normalizeDictionaryFontSize,
  normalizeInterfaceFontScale,
  normalizeContentFontSize,
  normalizeAdditionalFontSize,
  normalizeSpeechVoiceURI,
  normalizeInterfaceLanguage,
  normalizeRefreshButtonPosition
} from './settings.js';
import { targetLanguages } from './dictionaryUtils.js';
import { DictionaryCatalogPanel } from './DictionaryCatalogPanel.jsx';
import { SettingsPanel } from './SettingsPanel.jsx';
import { useDictionaryCatalog } from './useDictionaryCatalog.js';
import { enterMobileFullscreen, exitMobileFullscreen } from './mobileFullscreen.js';
import { InterfaceLanguageProvider } from './interfaceLanguage.jsx';

const DEFAULT_SETTINGS = {
  enabled: true,
  lang: 'ru',
  dictionaryFontSize: DEFAULT_DICTIONARY_FONT_SIZE,
  interfaceFontScale: DEFAULT_INTERFACE_FONT_SCALE,
  contentFontSize: DEFAULT_CONTENT_FONT_SIZE,
  additionalFontSize: DEFAULT_ADDITIONAL_FONT_SIZE,
  speechVoiceURI: DEFAULT_SPEECH_VOICE_URI,
  theme: DEFAULT_DICTIONARY_THEME,
  cardsPerLoad: 20,
  hideTranslationsUntilHover: true,
  refreshButtonPosition: null,
  showRefreshButton: true,
  interfaceLanguage: DEFAULT_INTERFACE_LANGUAGE
};

export function DictionaryPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshButtonPositionEditing, setRefreshButtonPositionEditing] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [appliedSettings, setAppliedSettings] = useState(DEFAULT_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState('');
  const [cardRefreshVersion, setCardRefreshVersion] = useState(0);
  const settingsCloseButtonRef = useRef(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const closeSettings = useCallback(() => {
    setAppliedSettings(settingsRef.current);
    setRefreshButtonPositionEditing(false);
    setSettingsOpen(false);
    exitMobileFullscreen();
  }, []);
  const openSettings = useCallback(() => {
    enterMobileFullscreen();
    setSettingsOpen(true);
  }, []);
  const catalog = useDictionaryCatalog();

  useEffect(() => {
    document.documentElement.lang = settings.interfaceLanguage;
    document.title = settings.interfaceLanguage === 'en' ? 'My Dictionary — Vocabee' : 'Мой словарь — Vocabee';
  }, [settings.interfaceLanguage]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    settingsCloseButtonRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeSettings();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [settingsOpen, closeSettings]);

  useEffect(() => {
    let active = true;
    getDictionarySettings(DEFAULT_SETTINGS).then((result) => {
      if (!active) return;
      const loadedSettings = {
        enabled: Boolean(result.enabled),
        lang: targetLanguages.includes(result.lang) ? result.lang : DEFAULT_SETTINGS.lang,
        dictionaryFontSize: normalizeDictionaryFontSize(result.dictionaryFontSize),
        interfaceFontScale: normalizeInterfaceFontScale(result.interfaceFontScale),
        contentFontSize: normalizeContentFontSize(result.contentFontSize),
        additionalFontSize: normalizeAdditionalFontSize(result.additionalFontSize),
        speechVoiceURI: normalizeSpeechVoiceURI(result.speechVoiceURI),
        interfaceLanguage: normalizeInterfaceLanguage(result.interfaceLanguage),
        theme: normalizeDictionaryTheme(result.theme),
        cardsPerLoad: Number.isInteger(result.cardsPerLoad) && result.cardsPerLoad >= 1 && result.cardsPerLoad <= 200
          ? result.cardsPerLoad
          : DEFAULT_SETTINGS.cardsPerLoad,
        hideTranslationsUntilHover: result.hideTranslationsUntilHover !== false,
        refreshButtonPosition: normalizeRefreshButtonPosition(result.refreshButtonPosition),
        showRefreshButton: result.showRefreshButton !== false
      };
      setSettings(loadedSettings);
      setAppliedSettings(loadedSettings);
      if (result.source === 'website') {
        setSettingsStatus('Настройки расширения недоступны: изменения сохраняются только на этом сайте.');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function updateSetting(key, value) {
    const normalizers = {
      theme: normalizeDictionaryTheme,
      dictionaryFontSize: normalizeDictionaryFontSize,
      interfaceFontScale: normalizeInterfaceFontScale,
      contentFontSize: normalizeContentFontSize,
      additionalFontSize: normalizeAdditionalFontSize,
      speechVoiceURI: normalizeSpeechVoiceURI,
      interfaceLanguage: normalizeInterfaceLanguage,
      refreshButtonPosition: normalizeRefreshButtonPosition,
      cardsPerLoad: (value) => Math.min(200, Math.max(1, Math.round(Number(value)) || DEFAULT_SETTINGS.cardsPerLoad))
    };
    const nextValue = normalizers[key] ? normalizers[key](value) : value;
    const nextSettings = { ...settings, [key]: nextValue };
    setSettings(nextSettings);
    if (key === 'theme') {
      document.documentElement.dataset.dictionaryTheme = nextValue;
    }
    if (key === 'refreshButtonPosition') {
      setAppliedSettings((current) => ({ ...current, refreshButtonPosition: nextValue }));
    }
    if (key === 'showRefreshButton') {
      setAppliedSettings((current) => ({ ...current, showRefreshButton: nextValue }));
    }
    if (key === 'contentFontSize' || key === 'additionalFontSize') {
      setAppliedSettings((current) => ({ ...current, [key]: nextValue }));
    }

    try {
      await saveDictionarySettings(nextSettings);
      setSettingsStatus('');
    } catch (error) {
      console.error('Vocabee: could not save dictionary settings', error);
      setSettingsStatus(`Не удалось сохранить настройки: ${error.message}`);
    }
  }

  const pageStyle = {
    '--vocabee-ui-font-scale': appliedSettings.interfaceFontScale / 100,
    '--vocabee-dictionary-font-size': `${appliedSettings.dictionaryFontSize}px`,
    '--vocabee-content-font-size': `${appliedSettings.contentFontSize}px`,
    '--vocabee-additional-font-size': `${appliedSettings.additionalFontSize}px`
  };
  function refreshCards() {
    setCardRefreshVersion((version) => version + 1);
  }

  return (
    <InterfaceLanguageProvider language={settings.interfaceLanguage}>
    <main className={styles.page} style={pageStyle}>
      <DictionaryCatalogPanel
        catalog={catalog}
        settingsOpen={settingsOpen}
        searchLanguage={catalog.selectedSourceLanguage || (
          ['my', 'words', 'phrases'].includes(catalog.catalogView) ? 'my-vocabee' : null
        )}
        onAddToLearning={catalog.addToLearning}
        onOpenSettings={openSettings}
        onRefreshCards={refreshCards}
        refreshButtonPosition={appliedSettings.refreshButtonPosition}
        refreshButtonPositionEditing={refreshButtonPositionEditing}
        onRefreshButtonPositionChange={(position) => updateSetting('refreshButtonPosition', position)}
        cardsPerLoad={appliedSettings.cardsPerLoad}
        hideTranslationsUntilHover={appliedSettings.hideTranslationsUntilHover}
        speechVoiceURI={appliedSettings.speechVoiceURI}
        showRefreshButton={appliedSettings.showRefreshButton}
        refreshVersion={cardRefreshVersion}
      />

      {settingsOpen && createPortal((
        <div
          className={styles.settingsModalBackdrop}
          style={pageStyle}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSettings();
          }}
        >
          <section className={styles.settingsModal} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
            <header className={styles.settingsModalHeader}>
              <h2 id="settings-modal-title">{settings.interfaceLanguage === 'en' ? 'Settings' : 'Настройки'}</h2>
              <button
                ref={settingsCloseButtonRef}
                className={styles.settingsModalClose}
                type="button"
                aria-label={settings.interfaceLanguage === 'en' ? 'Close settings' : 'Закрыть настройки'}
                onClick={closeSettings}
              >×</button>
            </header>
            <SettingsPanel
              settings={settings}
              updateSetting={updateSetting}
              settingsStatus={settingsStatus}
              catalog={catalog}
              refreshButtonPosition={settings.refreshButtonPosition}
              refreshButtonPositionEditing={refreshButtonPositionEditing}
              onRefreshButtonPositionEditingChange={setRefreshButtonPositionEditing}
              onResetRefreshButtonPosition={() => {
                setRefreshButtonPositionEditing(false);
                updateSetting('refreshButtonPosition', null);
              }}
              modal
            />
          </section>
        </div>
      ), document.body)}

    </main>
    </InterfaceLanguageProvider>
  );
}
