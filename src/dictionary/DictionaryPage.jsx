import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './DictionaryPage.module.css';
import {
  getDictionarySettings,
  saveDictionarySettings
} from './storage.js';
import {
  DEFAULT_DICTIONARY_FONT_SIZE,
  DEFAULT_INTERFACE_FONT_SCALE,
  normalizeDictionaryFontSize,
  normalizeInterfaceFontScale
} from '../content/panel/settings.js';
import { targetLanguages } from './dictionaryUtils.js';
import { DictionaryCatalogPanel } from './DictionaryCatalogPanel.jsx';
import { SettingsPanel } from './SettingsPanel.jsx';
import { useDictionaryCatalog } from './useDictionaryCatalog.js';

const DEFAULT_SETTINGS = {
  enabled: true,
  lang: 'ru',
  dictionaryFontSize: DEFAULT_DICTIONARY_FONT_SIZE,
  interfaceFontScale: DEFAULT_INTERFACE_FONT_SCALE,
  cardsPerLoad: 20
};

export function DictionaryPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState('');
  const [cardRefreshVersion, setCardRefreshVersion] = useState(0);
  const settingsCloseButtonRef = useRef(null);
  const catalog = useDictionaryCatalog();

  useEffect(() => {
    if (!settingsOpen) return undefined;
    settingsCloseButtonRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [settingsOpen]);

  async function loadBuiltinDictionary(language) {
    await catalog.loadBuiltinDictionary(language);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPreset = params.get('load');
    if (requestedPreset) {
      params.delete('load');
      const remainingQuery = params.toString();
      const cleanUrl = `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`;
      window.history.replaceState(window.history.state, '', cleanUrl);
    }

    if (requestedPreset === 'words-en') {
      loadBuiltinDictionary('en');
    }
    if (requestedPreset === 'words-de') {
      loadBuiltinDictionary('de');
    }
  }, []);

  useEffect(() => {
    let active = true;
    getDictionarySettings(DEFAULT_SETTINGS).then((result) => {
      if (!active) return;
      setSettings({
        enabled: Boolean(result.enabled),
        lang: targetLanguages.includes(result.lang) ? result.lang : DEFAULT_SETTINGS.lang,
        dictionaryFontSize: normalizeDictionaryFontSize(result.dictionaryFontSize),
        interfaceFontScale: normalizeInterfaceFontScale(result.interfaceFontScale),
        cardsPerLoad: Number.isInteger(result.cardsPerLoad) && result.cardsPerLoad >= 1 && result.cardsPerLoad <= 200
          ? result.cardsPerLoad
          : DEFAULT_SETTINGS.cardsPerLoad
      });
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
      dictionaryFontSize: normalizeDictionaryFontSize,
      interfaceFontScale: normalizeInterfaceFontScale,
      cardsPerLoad: (value) => Math.min(200, Math.max(1, Math.round(Number(value)) || DEFAULT_SETTINGS.cardsPerLoad))
    };
    const nextValue = normalizers[key] ? normalizers[key](value) : value;
    const nextSettings = { ...settings, [key]: nextValue };
    setSettings(nextSettings);
    setSettingsStatus('Сохраняю настройки…');

    try {
      const destination = await saveDictionarySettings(nextSettings);
      setSettingsStatus(destination === 'extension'
        ? 'Настройки сохранены в расширении.'
        : 'Расширение не подключено. Настройки сохранены только на этом сайте.');
    } catch (error) {
      console.error('Vocabee: could not save dictionary settings', error);
      setSettingsStatus(`Не удалось сохранить настройки: ${error.message}`);
    }
  }

  const pageStyle = {
    '--vocabee-ui-font-scale': settings.interfaceFontScale / 100,
    '--vocabee-dictionary-font-size': `${settings.dictionaryFontSize}px`
  };
  function refreshCards() {
    setCardRefreshVersion((version) => version + 1);
  }

  return (
    <main className={styles.page} style={pageStyle}>
      <DictionaryCatalogPanel
        catalog={catalog}
        searchLanguage={catalog.selectedSourceLanguage || (
          ['my', 'words', 'phrases'].includes(catalog.catalogView) ? 'my-vocabee' : null
        )}
        onAddToLearning={catalog.addToLearning}
        onOpenSettings={() => setSettingsOpen(true)}
        onRefreshCards={refreshCards}
        cardsPerLoad={settings.cardsPerLoad}
        refreshVersion={cardRefreshVersion}
      />

      {settingsOpen && createPortal((
        <div
          className={styles.settingsModalBackdrop}
          style={pageStyle}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <section className={styles.settingsModal} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
            <header className={styles.settingsModalHeader}>
              <h2 id="settings-modal-title">Настройки</h2>
              <button
                ref={settingsCloseButtonRef}
                className={styles.settingsModalClose}
                type="button"
                aria-label="Закрыть настройки"
                onClick={() => setSettingsOpen(false)}
              >×</button>
            </header>
            <SettingsPanel
              settings={settings}
              updateSetting={updateSetting}
              settingsStatus={settingsStatus}
              catalog={catalog}
              onLoadDictionary={loadBuiltinDictionary}
              modal
            />
          </section>
        </div>
      ), document.body)}

      <footer className={styles.footer}>
        Карточки и языковые базы отображаются в разделе «Словари».
      </footer>
    </main>
  );
}
