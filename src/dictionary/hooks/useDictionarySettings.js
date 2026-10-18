import { useCallback, useEffect, useRef, useState } from 'react';
import { getDictionarySettings, saveDictionarySettings } from '../data/storage.js';
import {
  DEFAULT_DICTIONARY_FONT_SIZE,
  DEFAULT_DICTIONARY_THEME,
  DEFAULT_INTERFACE_FONT_SCALE,
  DEFAULT_CONTENT_FONT_SIZE,
  DEFAULT_ADDITIONAL_FONT_SIZE,
  DEFAULT_SPEECH_VOICE_URIS,
  normalizeDictionaryTheme,
  normalizeDictionaryFontSize,
  normalizeInterfaceFontScale,
  normalizeContentFontSize,
  normalizeAdditionalFontSize,
  normalizeSpeechVoiceURIS,
  normalizeRefreshButtonPosition
} from '../utils/settings.js';
import { targetLanguages } from '../utils/dictionaryUtils.js';

export const DEFAULT_DICTIONARY_SETTINGS = {
  enabled: true,
  lang: 'ru',
  dictionaryFontSize: DEFAULT_DICTIONARY_FONT_SIZE,
  interfaceFontScale: DEFAULT_INTERFACE_FONT_SCALE,
  contentFontSize: DEFAULT_CONTENT_FONT_SIZE,
  additionalFontSize: DEFAULT_ADDITIONAL_FONT_SIZE,
  speechVoiceURIs: DEFAULT_SPEECH_VOICE_URIS,
  theme: DEFAULT_DICTIONARY_THEME,
  cardsPerLoad: 20,
  hideTranslationsUntilHover: true,
  refreshButtonPosition: null,
  showRefreshButton: true
};

function normalizeLoadedSettings(result) {
  return {
    enabled: Boolean(result.enabled),
    lang: targetLanguages.includes(result.lang) ? result.lang : DEFAULT_DICTIONARY_SETTINGS.lang,
    dictionaryFontSize: normalizeDictionaryFontSize(result.dictionaryFontSize),
    interfaceFontScale: normalizeInterfaceFontScale(result.interfaceFontScale),
    contentFontSize: normalizeContentFontSize(result.contentFontSize),
    additionalFontSize: normalizeAdditionalFontSize(result.additionalFontSize),
    speechVoiceURIs: normalizeSpeechVoiceURIS(result.speechVoiceURIs, result.speechVoiceURI),
    theme: normalizeDictionaryTheme(result.theme),
    cardsPerLoad: Number.isInteger(result.cardsPerLoad) && result.cardsPerLoad >= 1 && result.cardsPerLoad <= 200
      ? result.cardsPerLoad
      : DEFAULT_DICTIONARY_SETTINGS.cardsPerLoad,
    hideTranslationsUntilHover: result.hideTranslationsUntilHover !== false,
    refreshButtonPosition: normalizeRefreshButtonPosition(result.refreshButtonPosition),
    showRefreshButton: result.showRefreshButton !== false
  };
}

function normalizeSettingValue(key, value) {
  const normalizers = {
    theme: normalizeDictionaryTheme,
    dictionaryFontSize: normalizeDictionaryFontSize,
    interfaceFontScale: normalizeInterfaceFontScale,
    contentFontSize: normalizeContentFontSize,
    additionalFontSize: normalizeAdditionalFontSize,
    refreshButtonPosition: normalizeRefreshButtonPosition,
    cardsPerLoad: (setting) => Math.min(
      200,
      Math.max(1, Math.round(Number(setting)) || DEFAULT_DICTIONARY_SETTINGS.cardsPerLoad)
    )
  };
  return normalizers[key] ? normalizers[key](value) : value;
}

export function useDictionarySettings() {
  const [settings, setSettings] = useState(DEFAULT_DICTIONARY_SETTINGS);
  const [appliedSettings, setAppliedSettings] = useState(DEFAULT_DICTIONARY_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState('');
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    document.documentElement.lang = 'ru';
    document.title = 'Мой словарь — Vocabee';
  }, []);

  useEffect(() => {
    let active = true;
    getDictionarySettings(DEFAULT_DICTIONARY_SETTINGS).then((result) => {
      if (!active) return;
      const loadedSettings = normalizeLoadedSettings(result);
      setSettings(loadedSettings);
      setAppliedSettings(loadedSettings);
      if (result.source === 'website') {
        setSettingsStatus('Настройки расширения недоступны: изменения сохраняются только на этом сайте.');
      }
    });
    return () => { active = false; };
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    const nextValue = normalizeSettingValue(key, value);
    const nextSettings = { ...settingsRef.current, [key]: nextValue };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    if (key === 'theme') document.documentElement.dataset.dictionaryTheme = nextValue;
    if (['refreshButtonPosition', 'showRefreshButton', 'contentFontSize', 'additionalFontSize'].includes(key)) {
      setAppliedSettings((current) => ({ ...current, [key]: nextValue }));
    }

    try {
      await saveDictionarySettings(nextSettings);
      setSettingsStatus('');
    } catch (error) {
      console.error('Vocabee: could not save dictionary settings', error);
      setSettingsStatus(`Не удалось сохранить настройки: ${error.message}`);
    }
  }, []);

  const commitPendingSettings = useCallback(() => {
    setAppliedSettings(settingsRef.current);
  }, []);

  const pageStyle = {
    '--vocabee-ui-font-scale': appliedSettings.interfaceFontScale / 100,
    '--vocabee-dictionary-font-size': `${appliedSettings.dictionaryFontSize}px`,
    '--vocabee-content-font-size': `${appliedSettings.contentFontSize}px`,
    '--vocabee-additional-font-size': `${appliedSettings.additionalFontSize}px`
  };

  return {
    settings,
    appliedSettings,
    settingsStatus,
    updateSetting,
    commitPendingSettings,
    pageStyle
  };
}
