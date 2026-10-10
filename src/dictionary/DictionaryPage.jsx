import { useCallback, useEffect, useMemo, useState } from 'react';
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

const languageNames = {
  en: 'Английский',
  ru: 'Русский',
  de: 'Немецкий',
  uk: 'Украинский'
};

const DEFAULT_SETTINGS = {
  enabled: true,
  lang: 'ru',
  dictionaryFontSize: DEFAULT_DICTIONARY_FONT_SIZE,
  interfaceFontScale: DEFAULT_INTERFACE_FONT_SCALE
};

const targetLanguages = ['en', 'ru', 'uk', 'de'];

function getLanguagePairs(words) {
  return [...new Set(words.map((word) =>
    `${languageNames[word.sourceLang] || word.sourceLang} → ${languageNames[word.targetLang] || word.targetLang}`
  ))];
}

function FontSizeSetting({ id, label, value, unit, min, max, step, previewText, dictionaryPreview, onChange }) {
  return (
    <div className={styles.fontSetting}>
      <label className={styles.settingLabel} htmlFor={id}>
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
      <p className={clsx(styles.settingPreview, dictionaryPreview && styles.dictionaryPreview)}>
        Пример текста {previewText}
      </p>
    </div>
  );
}

function formatAddedDate(timestamp) {
  return new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' })
    .format(new Date(timestamp));
}

export function DictionaryPage() {
  const [words, setWords] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Загружаю словарь…');
  const [connection, setConnection] = useState({ source: 'loading', warning: '' });
  const [activeView, setActiveView] = useState('dictionary');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);

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
        lang: result.lang,
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

  const filteredWords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return words;
    return words.filter((word) =>
      `${word.sourceText} ${word.translatedText}`.toLocaleLowerCase().includes(query)
    );
  }, [search, words]);

  const languagePairs = getLanguagePairs(words);

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
            className={clsx(styles.navButton, activeView === 'settings' && styles.active)}
            type="button"
            aria-pressed={activeView === 'settings'}
            aria-label="Настройки"
            title="Настройки"
            onClick={() => setActiveView('settings')}
          >⚙</button>
          {activeView === 'dictionary' && (
            <button
              className={styles.navButton}
              type="button"
              aria-label="Обновить словарь"
              title="Обновить словарь"
              onClick={() => setLoadVersion((version) => version + 1)}
            >↻</button>
          )}
        </nav>
      </header>

      {connection.warning && (
        <p className={styles.connectionWarning} role="status">
          {connection.warning} Чтобы загрузить слова расширения, пересоберите его, перезагрузите в Chrome и обновите страницу.
        </p>
      )}

      {activeView === 'dictionary' ? (
        <section className={styles.content} aria-labelledby="dictionary-title">
          <div className={styles.titleRow}>
            <div>
              <h1 id="dictionary-title">Мой словарь</h1>
              {languagePairs.length > 0 && (
                <p className={styles.languagePair}>{languagePairs.join(' · ')}</p>
              )}
            </div>
            <p className={styles.count}>Сохранено слов: <strong>{words.length}</strong></p>
          </div>

          <label className={styles.search}>
            <span className={styles.searchIcon} aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Найти слово или перевод"
              aria-label="Найти слово или перевод"
            />
          </label>

          <section className={styles.wordList} aria-label="Сохранённые слова" aria-live="polite">
            {status ? (
              <p className={styles.message} role="status">{status}</p>
            ) : filteredWords.length ? (
              <ul>
                {filteredWords.map((word) => (
                  <li className={styles.word} key={word.id}>
                    <div className={styles.wordPair}>
                      <strong>{word.sourceText}</strong>
                      <span>{word.translatedText}</span>
                    </div>
                    <small>{formatAddedDate(word.addedAt)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.message}>
                {search
                  ? 'По запросу ничего не найдено.'
                  : 'Словарь пока пуст. Добавляйте слова из карточек перевода на YouTube.'}
              </p>
            )}
          </section>
        </section>
      ) : (
        <section className={styles.content} aria-labelledby="settings-title">
          <div className={styles.titleRow}>
            <div>
              <h1 id="settings-title">Настройки</h1>
              <p className={styles.languagePair}>Параметры расширения и словаря</p>
            </div>
          </div>
          <section className={styles.settings} aria-label="Настройки Vocabee">
            <label className={clsx(styles.settingRow, styles.toggleRow)} htmlFor="translation-enabled">
              <span className={styles.settingCopy}>
                <strong>Перевод</strong>
                <small>Слова и фразы на YouTube</small>
              </span>
              <input
                id="translation-enabled"
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) => updateSetting('enabled', event.target.checked)}
              />
              <span className={styles.switch} aria-hidden="true" />
            </label>
            <div className={styles.settingRow}>
              <span className={styles.settingCopy}>
                <strong>Язык субтитров</strong>
                <small>Определяется автоматически на YouTube</small>
              </span>
              <span className={styles.settingValue}>Автоматически</span>
            </div>
            <label className={styles.settingRow} htmlFor="target-language">
              <span className={styles.settingCopy}><strong>Переводить на</strong></span>
              <select
                id="target-language"
                value={settings.lang}
                onChange={(event) => updateSetting('lang', event.target.value)}
              >
                {targetLanguages.map((language) => (
                  <option key={language} value={language}>{languageNames[language]}</option>
                ))}
              </select>
            </label>
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
            <p className={styles.settingsFooter}>Поддерживаются английские и немецкие субтитры</p>
            {settingsStatus && <p className={styles.settingsStatus} role="status">{settingsStatus}</p>}
          </section>
        </section>
      )}

      <footer className={styles.footer}>
        {connection.source === 'extension'
          ? 'Подключено к локальному словарю расширения.'
          : 'Слова сайта хранятся отдельно от IndexedDB расширения.'}
      </footer>
    </main>
  );
}
