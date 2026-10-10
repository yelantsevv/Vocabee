import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './DictionaryPage.module.css';
import sourceDictionary from '../../dictionary/en-ru.json';
import germanRussianDictionary from '../../dictionary/de-ru.json';
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
const LEARNED_ENTRIES_KEY = 'vocabee-learned-source-entries';
const IMPORTED_DICTIONARIES_KEY = 'vocabee-imported-dictionaries-v1';
const VALID_PARTS_OF_SPEECH = new Set([
  'noun', 'verb', 'phrasal_verb', 'adjective', 'adverb', 'preposition',
  'pronoun', 'conjunction', 'particle'
]);
const VALID_CEFR_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

function getLearnedEntryKey(language, word) {
  return `${language}:${word.toLocaleLowerCase()}`;
}

function getEntryLearningLevel(entry, language, overrides) {
  const override = overrides[getLearnedEntryKey(language, entry.word)];
  return Number.isInteger(override) ? override : entry.learning_level ?? 0;
}

function normalizeImportedEntries(payload) {
  const entries = Array.isArray(payload) ? payload : payload?.entries || payload?.words;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('В JSON не найден список записей словаря.');
  }

  return entries.map((entry, index) => {
    if (!entry || typeof entry.word !== 'string' || !entry.word.trim()) {
      throw new Error(`У записи №${index + 1} отсутствует слово.`);
    }
    if (!Array.isArray(entry.definitions) || !entry.definitions.every((item) => typeof item === 'string')) {
      throw new Error(`У записи «${entry.word}» неверный список переводов.`);
    }
    if (entry.learning_level !== undefined
      && (!Number.isInteger(entry.learning_level) || entry.learning_level < 0 || entry.learning_level > 9)) {
      throw new Error(`У записи «${entry.word}» уровень знания должен быть от 0 до 9.`);
    }

    return {
      ...entry,
      word: entry.word.trim(),
      part_of_speech: VALID_PARTS_OF_SPEECH.has(entry.part_of_speech) ? entry.part_of_speech : 'verb',
      level: VALID_CEFR_LEVELS.has(entry.level) ? entry.level : 'A1',
      learning_level: entry.learning_level ?? 0,
      frequency_rank: Number.isFinite(entry.frequency_rank) ? entry.frequency_rank : 10000 + index,
      definitions: entry.definitions
    };
  });
}

function matchesVerbType(entry, type, language) {
  if (type === 'regular') return entry.is_irregular === false;
  if (type === 'irregular') return entry.is_irregular === true;
  if (type === 'phrasal') {
    return entry.part_of_speech === 'phrasal_verb'
      || (language === 'de' && entry.info?.includes('отделяемый глагол'));
  }
  return false;
}

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
  const [selectedSourceLanguage, setSelectedSourceLanguage] = useState('en');
  const [sourceLevels, setSourceLevels] = useState(['A1', 'A2', 'B1']);
  const [sourceVerbTypes, setSourceVerbTypes] = useState(['irregular', 'phrasal']);
  const [sourceSort, setSourceSort] = useState('popular');
  const [sourceSearch, setSourceSearch] = useState('');
  const [progressView, setProgressView] = useState('all');
  const [importStatus, setImportStatus] = useState('');
  const importInputRef = useRef(null);
  const [importedDictionaries, setImportedDictionaries] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(IMPORTED_DICTIONARIES_KEY) || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  });
  const [learningLevelOverrides, setLearningLevelOverrides] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LEARNED_ENTRIES_KEY) || '[]');
      if (Array.isArray(saved)) return Object.fromEntries(saved.map((key) => [key, 9]));
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  });
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
  const selectedSourceDictionary = useMemo(() => {
    const baseEntries = selectedSourceLanguage === 'de' ? germanRussianDictionary : sourceDictionary;
    const entries = new Map(baseEntries.map((entry) => [entry.word.toLocaleLowerCase(), entry]));
    for (const entry of importedDictionaries[selectedSourceLanguage] || []) {
      entries.set(entry.word.toLocaleLowerCase(), entry);
    }
    return [...entries.values()];
  }, [importedDictionaries, selectedSourceLanguage]);
  const learnedCount = selectedSourceDictionary.filter((entry) =>
    getEntryLearningLevel(entry, selectedSourceLanguage, learningLevelOverrides) === 9
  ).length;
  const inProgressCount = selectedSourceDictionary.filter((entry) => {
    const level = getEntryLearningLevel(entry, selectedSourceLanguage, learningLevelOverrides);
    return level > 0 && level < 9;
  }).length;
  const overallDictionaryProgress = selectedSourceDictionary.length
    ? Math.round(selectedSourceDictionary.reduce((total, entry) => (
      total + getEntryLearningLevel(entry, selectedSourceLanguage, learningLevelOverrides)
    ), 0) / (selectedSourceDictionary.length * 9) * 100)
    : 0;
  const selectedLevelEntries = selectedSourceDictionary.filter((entry) =>
    sourceLevels.length === 0 || sourceLevels.includes(entry.level)
  );
  const levelLearningProgress = selectedLevelEntries.length
    ? Math.round(selectedLevelEntries.reduce((total, entry) => (
      total + getEntryLearningLevel(entry, selectedSourceLanguage, learningLevelOverrides)
    ), 0) / (selectedLevelEntries.length * 9) * 100)
    : 0;
  const filteredSourceEntries = useMemo(() => {
    const query = sourceSearch.trim().toLocaleLowerCase();
    const entries = selectedSourceDictionary.filter((entry) => {
      const learningLevel = getEntryLearningLevel(entry, selectedSourceLanguage, learningLevelOverrides);
      const searchableText = [
        entry.word,
        ...entry.definitions,
        ...(entry.synonyms || []),
        ...(entry.examples || []).flatMap((example) => [example.phrase, example.translation])
      ].join(' ').toLocaleLowerCase();

      const matchesLevel = sourceLevels.length === 0 || sourceLevels.includes(entry.level);
      const matchesType = sourceVerbTypes.length === 0
        || sourceVerbTypes.some((type) => matchesVerbType(entry, type, selectedSourceLanguage));
      const matchesProgress = progressView === 'all'
        || (progressView === 'learning' && learningLevel > 0 && learningLevel < 9)
        || (progressView === 'learned' && learningLevel === 9);

      return matchesLevel
        && matchesType
        && (!query || searchableText.includes(query))
        && matchesProgress;
    });

    if (sourceSort === 'alphabetical') {
      return entries.sort((a, b) => a.word.localeCompare(b.word, selectedSourceLanguage));
    }
    if (sourceSort === 'progress' || sourceSort === 'progress-desc') {
      return entries.sort((a, b) => {
        const progressDifference = getEntryLearningLevel(a, selectedSourceLanguage, learningLevelOverrides)
          - getEntryLearningLevel(b, selectedSourceLanguage, learningLevelOverrides);
        return (sourceSort === 'progress-desc' ? -progressDifference : progressDifference)
          || (a.frequency_rank ?? Infinity) - (b.frequency_rank ?? Infinity);
      });
    }
    return entries.sort((a, b) => (a.frequency_rank ?? Infinity) - (b.frequency_rank ?? Infinity));
  }, [
    learningLevelOverrides,
    progressView,
    selectedSourceDictionary,
    selectedSourceLanguage,
    sourceSearch,
    sourceSort,
    sourceLevels,
    sourceVerbTypes
  ]);

  function toggleLearningLevel(entry) {
    const key = getLearnedEntryKey(selectedSourceLanguage, entry.word);
    setLearningLevelOverrides((current) => {
      const currentLevel = getEntryLearningLevel(entry, selectedSourceLanguage, current);
      const nextLevel = currentLevel === 9
        ? (entry.learning_level === 9 ? 0 : entry.learning_level ?? 0)
        : 9;
      const next = { ...current };
      if (nextLevel === (entry.learning_level ?? 0)) delete next[key];
      else next[key] = nextLevel;
      localStorage.setItem(LEARNED_ENTRIES_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggleFilterValue(setter, values, value) {
    setter(values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value]);
  }

  async function importDictionaryFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedEntries = normalizeImportedEntries(JSON.parse(await file.text()));
      const nextLanguageEntries = new Map(
        (importedDictionaries[selectedSourceLanguage] || [])
          .map((entry) => [entry.word.toLocaleLowerCase(), entry])
      );
      for (const entry of importedEntries) {
        nextLanguageEntries.set(entry.word.toLocaleLowerCase(), entry);
      }
      const nextDictionaries = {
        ...importedDictionaries,
        [selectedSourceLanguage]: [...nextLanguageEntries.values()]
      };
      localStorage.setItem(IMPORTED_DICTIONARIES_KEY, JSON.stringify(nextDictionaries));
      setImportedDictionaries(nextDictionaries);
      setImportStatus(`Импортировано записей: ${importedEntries.length}.`);
    } catch (error) {
      setImportStatus(`Не удалось импортировать базу: ${error.message}`);
    } finally {
      event.target.value = '';
    }
  }

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
      ) : activeView === 'dictionaries' ? (
        <section className={clsx(styles.content, styles.dictionaryContent)} aria-label="Каталог словарей">
          <section className={styles.dictionaryFilters} aria-label="Фильтры словаря">
            <div
              className={styles.overallProgress}
              role="progressbar"
              aria-label={`Общий прогресс изучения выбранного словаря: ${overallDictionaryProgress}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overallDictionaryProgress}
              title={`Весь словарь: ${overallDictionaryProgress}%`}
            >
              <span style={{ width: `${overallDictionaryProgress}%` }} />
            </div>
            <div className={styles.filterTopRow}>
              <div className={styles.sourceControls}>
                <div className={styles.sourcePickerGroup}>
                  <div className={styles.importControl}>
                    <input
                      ref={importInputRef}
                      className={styles.hiddenFileInput}
                      type="file"
                      accept=".json,application/json"
                      aria-label="Выбрать JSON-файл словаря для импорта"
                      onChange={importDictionaryFile}
                    />
                    <button
                      className={styles.importButton}
                      type="button"
                      aria-label="Импортировать базу словаря"
                      title="Импорт базы"
                      onClick={() => importInputRef.current?.click()}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" />
                      </svg>
                    </button>
                  </div>
                  <label className={styles.filterField}>
                    <select id="source-dictionary" aria-label="Словарь" value={selectedSourceLanguage} onChange={(event) => setSelectedSourceLanguage(event.target.value)}>
                      <option value="en">🇬🇧 EN → RU</option>
                      <option value="de">🇩🇪 DE → RU</option>
                    </select>
                  </label>
                </div>
                <label className={styles.filterField}>
                  <select id="source-sort" aria-label="Сортировка" value={sourceSort} onChange={(event) => setSourceSort(event.target.value)}>
                    <option value="popular">🔥 По популярности</option>
                    <option value="alphabetical">🔤 По алфавиту</option>
                    <option value="progress">🧠 Сначала меньше прогресс</option>
                    <option value="progress-desc">🧠 Сначала больше прогресс</option>
                  </select>
                </label>
              </div>
              <div className={styles.filterStack}>
                <fieldset className={styles.filterGroup} aria-label="Уровень">
                  <div className={styles.filterChips}>
                    {['A1', 'A2', 'B1', 'B2'].map((level) => (
                      <button
                        className={clsx(styles.filterChip, sourceLevels.includes(level) && styles.selected)}
                        key={level}
                        type="button"
                        aria-pressed={sourceLevels.includes(level)}
                        onClick={() => toggleFilterValue(setSourceLevels, sourceLevels, level)}
                      >{level}</button>
                    ))}
                  </div>
                </fieldset>
                <div className={styles.levelProgress}>
                  <div className={styles.levelProgressLabel}>
                    <span>Прогресс изучения</span>
                    <span>{levelLearningProgress}%</span>
                  </div>
                  <div
                    className={styles.levelProgressTrack}
                    role="progressbar"
                    aria-label="Прогресс изучения слов выбранных уровней"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={levelLearningProgress}
                  >
                    <span style={{ width: `${levelLearningProgress}%` }} />
                  </div>
                  <span className={styles.levelProgressHint}>
                    {sourceLevels.length ? sourceLevels.join(', ') : 'Все уровни'} · {selectedLevelEntries.length} слов
                  </span>
                </div>
              </div>
              <fieldset className={clsx(styles.filterGroup, styles.verbTypeGroup)} aria-label="Тип глагола">
                <div className={clsx(styles.filterChips, styles.verbTypeChips)}>
                  {[
                    ['regular', '✅ Правильные'],
                    ['irregular', '⚡ Неправильные'],
                    ['phrasal', '💬 Фразовые']
                  ].map(([type, label]) => (
                    <button
                      className={clsx(styles.filterChip, styles.typeChip, sourceVerbTypes.includes(type) && styles.selected)}
                      key={type}
                      type="button"
                      aria-pressed={sourceVerbTypes.includes(type)}
                      onClick={() => toggleFilterValue(setSourceVerbTypes, sourceVerbTypes, type)}
                    >{label}</button>
                  ))}
                </div>
                <div className={styles.progressFilters} role="group" aria-label="Статус изучения слов">
                  {[
                    ['learning', `В изучении · ${inProgressCount}`],
                    ['learned', `Изученные · ${learnedCount}`],
                    ['all', 'Все слова']
                  ].map(([view, label]) => (
                    <button
                      className={clsx(styles.progressButton, progressView === view && styles.selected)}
                      key={view}
                      type="button"
                      aria-pressed={progressView === view}
                      onClick={() => setProgressView(view)}
                    >{label}</button>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className={styles.filterBottomRow}>
              <label className={clsx(styles.search, styles.dictionarySearch)}>
                <span className={styles.searchIcon} aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={sourceSearch}
                  onChange={(event) => setSourceSearch(event.target.value)}
                  placeholder="Поиск слова, фразы или перевода…"
                  aria-label="Поиск слова, фразы или перевода"
                />
              </label>
            </div>
            {importStatus && <p className={styles.importStatus} role="status">{importStatus}</p>}
          </section>
          <p className={styles.dictionaryCount}>
            Показано {filteredSourceEntries.length} из {selectedSourceDictionary.length} слов
          </p>
          <section className={styles.wordList} aria-label="Записи выбранного словаря">
            <ul>
              {filteredSourceEntries.map((entry) => {
                const learningLevel = getEntryLearningLevel(entry, selectedSourceLanguage, learningLevelOverrides);
                return (
                  <li className={styles.word} key={entry.word}>
                    <div className={styles.wordPair}>
                      <strong>{entry.word}</strong>
                      <span>{entry.definitions.join(' · ')}</span>
                    </div>
                    {entry.examples?.[0] && (
                      <small>{entry.examples[0].phrase} — {entry.examples[0].translation}</small>
                    )}
                    <button
                      className={clsx(styles.learnedButton, learningLevel === 9 && styles.learned)}
                      type="button"
                      aria-pressed={learningLevel === 9}
                      onClick={() => toggleLearningLevel(entry)}
                    >{learningLevel === 9 ? '✓ Изучено · 9/9' : `Отметить изученным · ${learningLevel}/9`}</button>
                  </li>
                );
              })}
            </ul>
            {filteredSourceEntries.length === 0 && <p className={styles.message}>Ничего не найдено. Измените фильтры или поисковый запрос.</p>}
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
