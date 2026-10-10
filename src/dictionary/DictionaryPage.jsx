import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import styles from './DictionaryPage.module.css';
import {
  getDictionaryData,
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
import { SavedWordsPanel } from './SavedWordsPanel.jsx';
import { DictionaryCatalogPanel } from './DictionaryCatalogPanel.jsx';
import { SettingsPanel } from './SettingsPanel.jsx';
import { useDictionaryCatalog } from './useDictionaryCatalog.js';
import { phraseSections } from './phraseSections.js';
import { PhraseSectionPanel } from './PhraseSectionPanel.jsx';

const DEFAULT_SETTINGS = {
  enabled: true,
  lang: 'ru',
  dictionaryFontSize: DEFAULT_DICTIONARY_FONT_SIZE,
  interfaceFontScale: DEFAULT_INTERFACE_FONT_SCALE
};

export function DictionaryPage() {
  const [words, setWords] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Загружаю словарь…');
  const [connection, setConnection] = useState({ source: 'loading', warning: '' });
  const [activeView, setActiveView] = useState('dictionary');
  const [activePhraseSection, setActivePhraseSection] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);
  const catalog = useDictionaryCatalog();

  function loadBuiltinDictionary(language) {
    catalog.setSelectedSourceLanguage(language);
    setActivePhraseSection(null);
    setActiveView('dictionaries');
  }

  function loadPhraseSection(sectionKey) {
    setActivePhraseSection(phraseSections[sectionKey]);
    setActiveView('dictionaries');
  }

  useEffect(() => {
    const requestedPreset = new URLSearchParams(window.location.search).get('load');
    if (requestedPreset === 'words-en') loadBuiltinDictionary('en');
    if (requestedPreset === 'words-de') loadBuiltinDictionary('de');
    if (requestedPreset?.startsWith('phrase-')) {
      const sectionKey = requestedPreset.slice('phrase-'.length);
      if (phraseSections[sectionKey]) loadPhraseSection(sectionKey);
    }
  }, []);

  const loadDictionary = useCallback(() => {
    setStatus('Загружаю словарь…');
    getDictionaryData().then((result) => {
      setWords(result.words);
      setConnection({ source: result.source, warning: result.warning || '' });
      setStatus('');
    }).catch((error) => {
      console.error('Vocabee: could not load dictionary page', error);
      setStatus(error.message || 'Не удалось загрузить словарь.');
    });
  }, []);

  useEffect(() => {
    loadDictionary();
  }, [loadDictionary, loadVersion]);

  useEffect(() => {
    let active = true;
    getDictionarySettings(DEFAULT_SETTINGS).then((result) => {
      if (!active) return;
      setSettings({
        enabled: Boolean(result.enabled),
        lang: targetLanguages.includes(result.lang) ? result.lang : DEFAULT_SETTINGS.lang,
        dictionaryFontSize: normalizeDictionaryFontSize(result.dictionaryFontSize),
        interfaceFontScale: normalizeInterfaceFontScale(result.interfaceFontScale)
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
      interfaceFontScale: normalizeInterfaceFontScale
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

  return (
    <main className={styles.page} style={pageStyle}>
      <header className={styles.header}>
        <a className={styles.brand} href="./dictionary.html" aria-label="Vocabee — мой словарь">
          <span className={styles.logo} aria-hidden="true">V</span>
          <span>Vocabee</span>
        </a>
        {activeView === 'dictionary' && (
          <button
            className={styles.navButton}
            type="button"
            aria-label="Обновить словарь"
            title="Обновить словарь"
            onClick={() => setLoadVersion((version) => version + 1)}
          >↻</button>
        )}
        <nav className={styles.navigation} aria-label="Разделы Vocabee">
          <button
            className={clsx(styles.navButton, activeView === 'dictionary' && styles.active)}
            type="button"
            aria-pressed={activeView === 'dictionary'}
            aria-label="Мой словарь"
            title="Мой словарь"
            onClick={() => setActiveView('dictionary')}
          >▤</button>
          <button
            className={clsx(styles.navButton, activeView === 'dictionaries' && styles.active)}
            type="button"
            aria-pressed={activeView === 'dictionaries'}
            aria-label="Словари"
            title="Словари"
            onClick={() => setActiveView('dictionaries')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m3.5 6 6.5-2 4.5 1.5v14L10 18l-6.5 2V6Z" />
              <path d="M14.5 5.5 20.5 4v14l-6 1.5M10 4v14M6 8l2.5-.8M6 11l2.5-.8M16.5 8l2-.5M16.5 11l2-.5" />
            </svg>
          </button>
          <button
            className={clsx(styles.navButton, activeView === 'settings' && styles.active)}
            type="button"
            aria-pressed={activeView === 'settings'}
            aria-label="Настройки"
            title="Настройки"
            onClick={() => setActiveView('settings')}
          >⚙</button>
        </nav>
      </header>

      {connection.warning && (
        <p className={styles.connectionWarning} role="status">
          {connection.warning} Чтобы загрузить слова расширения, пересоберите его, перезагрузите в Chrome и обновите страницу.
        </p>
      )}

      {activeView === 'dictionary' ? (
        <SavedWordsPanel words={words} search={search} onSearchChange={setSearch} status={status} />
      ) : activeView === 'dictionaries' ? (
        activePhraseSection
          ? <PhraseSectionPanel section={activePhraseSection} onBack={() => setActivePhraseSection(null)} />
          : <DictionaryCatalogPanel
              catalog={catalog}
              onSearchChange={catalog.setSourceSearch}
              onToggleLearningLevel={catalog.toggleLearningLevel}
            />
      ) : (
        <SettingsPanel
          settings={settings}
          updateSetting={updateSetting}
          settingsStatus={settingsStatus}
          catalog={catalog}
          onLoadDictionary={loadBuiltinDictionary}
          onLoadPhraseSection={loadPhraseSection}
        />
      )}

      <footer className={styles.footer}>
        {connection.source === 'extension'
          ? 'Подключено к локальному словарю расширения.'
          : 'Слова сайта хранятся отдельно от IndexedDB расширения.'}
      </footer>
    </main>
  );
}
