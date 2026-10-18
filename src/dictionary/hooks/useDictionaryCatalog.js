import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATALOG_SOURCES,
  createCustomDictionary as createStoredCustomDictionary,
  readCatalogDictionaries,
  writeCustomDictionary,
  writeCatalogDictionary
} from '../data/catalogDatabase.js';
import { getMyVocabularyEntries } from '../data/storage.js';
import { DEFAULT_DICTIONARY_URL, DEFAULT_GERMAN_DICTIONARY_URL } from '../config/dictionaryConfig.js';
import {
  getEntryLearningLevel,
  getLearnedEntryKey,
  LEARNED_ENTRIES_KEY,
  MAX_LEARNING_LEVEL,
  normalizeImportedEntries
} from '../utils/dictionaryUtils.js';
import { filterCatalogEntries } from '../utils/catalogFiltering.js';
import {
  filterEntriesByProgress,
  getAverageProgress,
  getStudySessionEntries
} from '../utils/catalogProgress.js';
import {
  addLearningStat,
  createLearningStats,
  createMyDictionaryRecord,
  getCatalogSourceIds,
  readLearningLevelOverrides,
  readCatalogFilters,
  readSourceConnections,
  readStoredObject,
  CATALOG_FILTERS_VERSION,
  CATALOG_FILTERS_KEY,
  DICTIONARY_STATS_KEY,
  SOURCE_CONNECTIONS_KEY
} from '../utils/catalogPreferences.js';

export function useDictionaryCatalog() {
  const [initialFilters] = useState(readCatalogFilters);
  const [selectedSourceLanguage, setSelectedSourceLanguageState] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [sourceLevels, setSourceLevelsState] = useState(initialFilters.sourceLevels);
  const [sourceVerbTypes, setSourceVerbTypesState] = useState(initialFilters.sourceVerbTypes);
  const [sourceCategories, setSourceCategoriesState] = useState(initialFilters.sourceCategories);
  const [progressViews, setProgressViewsState] = useState(initialFilters.progressViews);
  const [sourceConnections, setSourceConnections] = useState(readSourceConnections);
  const [catalogView, setCatalogViewState] = useState(initialFilters.catalogView);
  const [importStatus, setImportStatus] = useState('');
  const [remoteImportLoading, setRemoteImportLoading] = useState(false);
  const [sourceMetadata, setSourceMetadata] = useState(CATALOG_SOURCES);
  const catalogMutationRef = useRef(0);
  const [importedDictionaries, setImportedDictionaries] = useState({});
  const [learningLevelOverrides, setLearningLevelOverrides] = useState(() => (
    readLearningLevelOverrides()
  ));
  const persistedFiltersRef = useRef({
    catalogView: initialFilters.catalogView,
    selectedSourceLanguage: initialFilters.selectedSourceLanguage,
    sourceLevels: initialFilters.sourceLevels,
    sourceVerbTypes: initialFilters.sourceVerbTypes,
    sourceCategories: initialFilters.sourceCategories,
    progressViews: initialFilters.progressViews
  });

  function updateFilter(name, value) {
    const currentFilters = persistedFiltersRef.current;
    const nextValue = typeof value === 'function' ? value(currentFilters[name]) : value;
    const persistedValue = name === 'selectedSourceLanguage'
      && nextValue === null
      && catalogLoading
      ? currentFilters[name]
      : nextValue;
    const nextFilters = { ...currentFilters, [name]: persistedValue };
    persistedFiltersRef.current = nextFilters;

    const stateSetters = {
      catalogView: setCatalogViewState,
      selectedSourceLanguage: setSelectedSourceLanguageState,
      sourceLevels: setSourceLevelsState,
      sourceVerbTypes: setSourceVerbTypesState,
      sourceCategories: setSourceCategoriesState,
      progressViews: setProgressViewsState
    };
    stateSetters[name](nextValue);

    try {
      localStorage.setItem(CATALOG_FILTERS_KEY, JSON.stringify({
        version: CATALOG_FILTERS_VERSION,
        ...nextFilters
      }));
    } catch (error) {
      console.warn('Vocabee: unable to save dictionary filters.', error);
    }
  }

  function setCatalogView(value) { updateFilter('catalogView', value); }
  function setSelectedSourceLanguage(value) { updateFilter('selectedSourceLanguage', value); }
  function setSourceLevels(value) { updateFilter('sourceLevels', value); }
  function setSourceVerbTypes(value) { updateFilter('sourceVerbTypes', value); }
  function setSourceCategories(value) { updateFilter('sourceCategories', value); }
  function setProgressViews(value) { updateFilter('progressViews', value); }

  useEffect(() => {
    let active = true;
    const mutationAtStart = catalogMutationRef.current;
    async function loadCatalogFromDatabase() {
      try {
        let records = await readCatalogDictionaries();
        try {
          const myDictionary = createMyDictionaryRecord(await getMyVocabularyEntries());
          if (myDictionary) records.push(myDictionary);
        } catch (error) {
          console.info('Vocabee: extension my-dictionary database is unavailable.', error);
        }
        const legacyDictionaries = readStoredObject('vocabee-imported-dictionaries-v1');
        const existingLanguages = new Set(records.map(({ catalogId, language }) => catalogId || language));
        const legacyRecords = await Promise.all(Object.entries(legacyDictionaries)
          .filter(([language, entries]) => (
            ['en', 'de'].includes(language) && Array.isArray(entries) && !existingLanguages.has(language)
          ))
          .map(async ([language, entries]) => {
            await writeCatalogDictionary(language, entries);
            return { language, entries, updatedAt: 0 };
          }));
        records = [...records, ...legacyRecords];
        localStorage.removeItem('vocabee-imported-dictionaries-v1');
        if (!active || mutationAtStart !== catalogMutationRef.current) return;

        records.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const dictionaries = Object.fromEntries(records.map(({ catalogId, language, entries }) => [
          catalogId || language,
          entries
        ]));
        const metadata = { ...CATALOG_SOURCES };
        for (const record of records) {
          if (!record.isCustom) continue;
          const sourceId = record.catalogId || record.language;
          metadata[sourceId] = {
            id: sourceId,
            databaseName: record.databaseName,
            language: record.language,
            targetLanguage: record.targetLanguage || 'ru',
            title: record.title,
            label: sourceId === 'my-vocabee'
              ? '📘 Мой словарь'
              : `✏️ ${record.title} · ${record.language.toUpperCase()} → ${(record.targetLanguage || 'ru').toUpperCase()}`,
            isCustom: true
          };
        }
        setSourceMetadata(metadata);
        setImportedDictionaries(dictionaries);
        const preferredLanguage = initialFilters.selectedSourceLanguage;
        const loadedLanguages = ['en', 'de'].filter((language) => dictionaries[language]);
        setSelectedSourceLanguage(
          Object.prototype.hasOwnProperty.call(dictionaries, preferredLanguage)
            ? preferredLanguage
            : loadedLanguages[0] || null
        );
      } catch (error) {
        if (active) setCatalogError(error.message || 'Не удалось прочитать базу словарей.');
      } finally {
        if (active) setCatalogLoading(false);
      }
    }
    loadCatalogFromDatabase();
    return () => { active = false; };
  }, [initialFilters.selectedSourceLanguage]);

  useEffect(() => {
    const handleDatabaseDeleted = (event) => {
      const databaseName = event.detail?.databaseName;
      const source = Object.entries(sourceMetadata)
        .find(([, item]) => item.databaseName === databaseName)?.[0];
      if (!source && databaseName !== 'vocabee-catalog') return;
      catalogMutationRef.current += 1;
      const remainingSources = Object.keys(importedDictionaries).filter((item) => item !== source);
      setImportedDictionaries((current) => {
        if (databaseName === 'vocabee-catalog') return {};
        const next = { ...current };
        delete next[source];
        return next;
      });
      if (source && sourceMetadata[source]?.isCustom) {
        setSourceMetadata((current) => {
          const next = { ...current };
          delete next[source];
          return next;
        });
      }
      if (databaseName === 'vocabee-catalog') {
        setSelectedSourceLanguage(null);
      } else if (selectedSourceLanguage === source) {
        setSelectedSourceLanguage(
          ['en', 'de'].find((language) => remainingSources.includes(language)) || null
        );
      }
      setCatalogError('');
      setCatalogLoading(false);
    };
    window.addEventListener('vocabee:indexeddb-deleted', handleDatabaseDeleted);
    return () => window.removeEventListener('vocabee:indexeddb-deleted', handleDatabaseDeleted);
  }, [importedDictionaries, selectedSourceLanguage, sourceMetadata]);

  useEffect(() => {
    const runtime = globalThis.chrome?.runtime;
    const refreshMyDictionary = () => {
      getMyVocabularyEntries().then((entries) => {
        const record = createMyDictionaryRecord(entries);
        setImportedDictionaries((current) => {
          const next = { ...current };
          if (record) next['my-vocabee'] = record.entries;
          else delete next['my-vocabee'];
          return next;
        });
        if (record) {
          setSourceMetadata((current) => ({
            ...current,
            'my-vocabee': {
              id: 'my-vocabee',
              databaseName: 'my-vocabee',
              language: record.language,
              targetLanguage: record.targetLanguage,
              title: 'Мой словарь',
              label: '📘 Мой словарь',
              isCustom: true
            }
          }));
        }
      }).catch((error) => console.warn('Vocabee: failed to refresh my dictionary.', error));
    };
    const handleRuntimeMessage = (message) => {
      if (message?.type === 'MY_DICTIONARY_UPDATED') refreshMyDictionary();
    };
    const handleWindowMessage = (event) => {
      if (event.source === window
        && event.origin === window.location.origin
        && event.data?.channel === 'VOCABEE_LOCAL_DICTIONARY'
        && event.data?.type === 'MY_DICTIONARY_UPDATED') {
        refreshMyDictionary();
      }
    };
    runtime?.onMessage?.addListener(handleRuntimeMessage);
    window.addEventListener('message', handleWindowMessage);
    return () => {
      runtime?.onMessage?.removeListener(handleRuntimeMessage);
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  useEffect(() => {
    if (catalogLoading) return;

    // Do not let the first post-load render replace persisted filters with
    // transient state from catalog initialization.
    const filters = {
      catalogView,
      selectedSourceLanguage: selectedSourceLanguage
        ?? persistedFiltersRef.current.selectedSourceLanguage,
      sourceLevels,
      sourceVerbTypes,
      sourceCategories,
      progressViews
    };
    persistedFiltersRef.current = filters;

    try {
      localStorage.setItem(CATALOG_FILTERS_KEY, JSON.stringify({
        version: CATALOG_FILTERS_VERSION,
        ...filters
      }));
    } catch (error) {
      console.warn('Vocabee: unable to save dictionary filters.', error);
    }
  }, [catalogLoading, catalogView, selectedSourceLanguage, sourceLevels, sourceVerbTypes, sourceCategories, progressViews]);

  useEffect(() => {
    try {
      localStorage.setItem(SOURCE_CONNECTIONS_KEY, JSON.stringify(sourceConnections));
    } catch (error) {
      console.warn('Vocabee: unable to save dictionary source connections.', error);
    }
  }, [sourceConnections]);

  const availableSources = useMemo(() => Object.keys(importedDictionaries)
    .filter((sourceId) => sourceMetadata[sourceId])
    .map((sourceId) => {
      const entries = importedDictionaries[sourceId] || [];
      const words = createLearningStats();
      const phrases = createLearningStats();

      for (const entry of entries) {
        const learningSource = sourceId === 'my-vocabee'
          ? `${sourceId}:${entry.source_language || sourceMetadata[sourceId].language}`
          : sourceId;
        if (entry.part_of_speech === 'phrase') {
          addLearningStat(phrases, entry, `${learningSource}:phrases`, learningLevelOverrides);
        } else {
          addLearningStat(words, entry, learningSource, learningLevelOverrides);
        }

        for (const example of entry.examples || []) {
          if (typeof example.phrase !== 'string' || !example.phrase.trim()) continue;
          addLearningStat(phrases, {
            word: example.phrase.trim(),
            learning_level: Number.isInteger(example.learning_level) ? example.learning_level : 0
          }, `${learningSource}:phrases`, learningLevelOverrides);
        }
      }

      return {
        id: sourceId,
        ...sourceMetadata[sourceId],
        words,
        phrases
      };
    }), [importedDictionaries, learningLevelOverrides, sourceMetadata]);

  useEffect(() => {
    if (catalogLoading) return;
    const statistics = {
      selectedSourceLanguage,
      updatedAt: Date.now(),
      sources: availableSources.map(({ id, words, phrases }) => ({
        id,
        words: { ...words },
        phrases: { ...phrases }
      }))
    };
    try {
      localStorage.setItem(DICTIONARY_STATS_KEY, JSON.stringify(statistics));
    } catch (error) {
      console.warn('Vocabee: unable to save dictionary statistics.', error);
    }
  }, [availableSources, catalogLoading, selectedSourceLanguage]);

  const selectedSourceDictionary = useMemo(() => {
    const sourceIds = getCatalogSourceIds(selectedSourceLanguage, sourceConnections);
    const entries = sourceIds.flatMap((sourceId) => (importedDictionaries[sourceId] || [])
      .map((entry) => ({
        ...entry,
        _catalogId: sourceId,
        _catalogLanguage: entry.source_language || sourceMetadata[sourceId].language,
        _learningSource: sourceId === 'my-vocabee'
          ? `${sourceId}:${entry.source_language || sourceMetadata[sourceId].language}`
          : sourceId
      })));
    if (catalogView !== 'phrases') {
      return entries.filter((entry) => entry.part_of_speech !== 'phrase');
    }

    return entries.flatMap((entry) => {
      const savedPhrase = entry.part_of_speech === 'phrase'
        ? [{
            ...entry,
            _isPhrase: true,
            _entryKey: `${entry.word}:saved-phrase`,
            _learningSource: `${entry._learningSource}:phrases`
          }]
        : [];
      const examplePhrases = (entry.examples || [])
        .filter((example) => typeof example.phrase === 'string' && example.phrase.trim())
        .map((example, index) => ({
          word: example.phrase.trim(),
          part_of_speech: entry.part_of_speech,
          is_irregular: entry.is_irregular,
          level: example.level || entry.level,
          learning_level: Number.isInteger(example.learning_level) ? example.learning_level : 0,
          frequency_rank: (entry.frequency_rank ?? 10000) + index / 100,
          definitions: [example.translation || ''],
          category: example.category || '',
          _isPhrase: true,
          _entryKey: `${entry.word}:${index}`,
          _catalogId: entry._catalogId,
          _catalogLanguage: entry._catalogLanguage,
          _learningSource: `${entry._learningSource}:phrases`
        }));
      return [...savedPhrase, ...examplePhrases];
    });
  }, [catalogView, importedDictionaries, selectedSourceLanguage, sourceConnections, sourceMetadata]);

  const sourceEntriesByFilters = useMemo(() => filterCatalogEntries(selectedSourceDictionary, {
    catalogView,
    selectedSourceLanguage,
    sourceCategories,
    sourceLevels,
    sourceVerbTypes,
    sourceMetadata
  }), [
    catalogView,
    selectedSourceDictionary,
    selectedSourceLanguage,
    sourceCategories,
    sourceLevels,
    sourceVerbTypes,
    sourceMetadata
  ]);

  const filteredSourceEntries = useMemo(() => filterEntriesByProgress(
    sourceEntriesByFilters,
    progressViews,
    selectedSourceLanguage,
    learningLevelOverrides
  ), [sourceEntriesByFilters, progressViews, learningLevelOverrides, selectedSourceLanguage]);
  const filteredDictionaryProgress = getAverageProgress(
    filteredSourceEntries,
    selectedSourceLanguage,
    learningLevelOverrides
  );

  const studySessionEntries = useMemo(() => getStudySessionEntries(
    sourceEntriesByFilters,
    progressViews,
    selectedSourceLanguage,
    learningLevelOverrides
  ), [sourceEntriesByFilters, learningLevelOverrides, selectedSourceLanguage, progressViews]);

  async function saveImportedDictionary(payload, sourceName, forcedLanguage) {
    const declaredLanguage = [
      payload?.language,
      payload?.source_language,
      payload?.sourceLang,
      payload?.dictionary,
      sourceName
    ].map((value) => String(value || '').toLowerCase())
      .map((value) => value.match(/(?:^|[^a-z])(en|de)(?:[-_.]|$)/)?.[1])
      .find(Boolean);
    const selectedMetadata = sourceMetadata[selectedSourceLanguage];
    const fallbackLanguage = selectedMetadata?.language;
    const language = forcedLanguage
      || (['en', 'de'].includes(declaredLanguage) ? declaredLanguage : fallbackLanguage);
    if (!language) throw new Error('Укажите язык базы в JSON (language: "en" или "de").');
    const importedEntries = normalizeImportedEntries(payload);
    if (!forcedLanguage && selectedMetadata?.isCustom) {
      if (selectedSourceLanguage !== 'my-vocabee' && language !== selectedMetadata.language) {
        throw new Error('Язык файла не совпадает с языком пользовательского словаря.');
      }
      const entryKey = (entry) => selectedSourceLanguage === 'my-vocabee'
        ? `${entry.source_language || selectedMetadata.language}:${entry.word.toLocaleLowerCase()}`
        : entry.word.toLocaleLowerCase();
      const nextEntries = new Map((importedDictionaries[selectedSourceLanguage] || [])
        .map((entry) => [entryKey(entry), entry]));
      for (const entry of importedEntries) {
        const importedEntry = selectedSourceLanguage === 'my-vocabee'
          ? { ...entry, source_language: language, target_language: selectedMetadata.targetLanguage || 'ru' }
          : entry;
        nextEntries.set(entryKey(importedEntry), importedEntry);
      }
      const entries = [...nextEntries.values()];
      catalogMutationRef.current += 1;
      await writeCustomDictionary({ ...selectedMetadata, catalogId: selectedSourceLanguage, entries });
      setImportedDictionaries((current) => ({ ...current, [selectedSourceLanguage]: entries }));
      setImportStatus(`Импортировано записей: ${importedEntries.length}.`);
      return;
    }
    const nextLanguageEntries = new Map(
      (importedDictionaries[language] || [])
        .map((entry) => [entry.word.toLocaleLowerCase(), entry])
    );
    for (const entry of importedEntries) {
      nextLanguageEntries.set(entry.word.toLocaleLowerCase(), entry);
    }
    const nextDictionaries = {
      ...importedDictionaries,
      [language]: [...nextLanguageEntries.values()]
    };
    catalogMutationRef.current += 1;
    await writeCatalogDictionary(language, nextDictionaries[language]);
    setImportedDictionaries(nextDictionaries);
    setSelectedSourceLanguage(language);
    setImportStatus(`Импортировано записей: ${importedEntries.length}.`);
  }

  async function importDictionaryFromUrl(language = 'en') {
    if (remoteImportLoading) return;
    setRemoteImportLoading(true);
    const languageLabel = language === 'de' ? 'DE' : 'EN';
    const dictionaryUrl = language === 'de' ? DEFAULT_GERMAN_DICTIONARY_URL : DEFAULT_DICTIONARY_URL;
    setImportStatus(`Скачиваю базу ${languageLabel} → RU…`);

    try {
      const response = await fetch(dictionaryUrl, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Сервер вернул HTTP ${response.status}.`);
      }
      const payload = await response.json();
      await saveImportedDictionary(payload, `${language}-ru.json`, language);
    } catch (error) {
      setImportStatus(`Не удалось загрузить базу ${languageLabel} → RU: ${error.message}`);
    } finally {
      setRemoteImportLoading(false);
    }
  }

  async function createCustomDictionary(details) {
    try {
      catalogMutationRef.current += 1;
      const dictionary = await createStoredCustomDictionary(details);
      const sourceId = dictionary.catalogId;
      setSourceMetadata((current) => ({
        ...current,
        [sourceId]: {
          id: sourceId,
          databaseName: dictionary.databaseName,
          language: dictionary.language,
          targetLanguage: dictionary.targetLanguage,
          title: dictionary.title,
          label: `✏️ ${dictionary.title} · ${dictionary.language.toUpperCase()} → ${dictionary.targetLanguage.toUpperCase()}`,
          isCustom: true
        }
      }));
      setImportedDictionaries((current) => ({ ...current, [sourceId]: [] }));
      setSelectedSourceLanguage(sourceId);
      setImportStatus(`Словарь «${dictionary.title}» создан.`);
      return true;
    } catch (error) {
      setImportStatus(error.message || 'Не удалось создать словарь.');
      return false;
    }
  }

  function updateEntryLearningLevel(entry, getNextLevel) {
    const learningSource = entry._learningSource || entry._catalogId || entry._catalogLanguage || selectedSourceLanguage;
    const key = getLearnedEntryKey(learningSource, entry.word);
    setLearningLevelOverrides((current) => {
      const currentLevel = getEntryLearningLevel(entry, learningSource, current);
      const nextLevel = Math.max(0, Math.min(MAX_LEARNING_LEVEL, getNextLevel(currentLevel)));
      if (nextLevel === currentLevel) return current;
      const next = { ...current };
      if (nextLevel === (entry.learning_level ?? 0)) delete next[key];
      else next[key] = nextLevel;
      localStorage.setItem(LEARNED_ENTRIES_KEY, JSON.stringify(next));
      return next;
    });
  }

  function addToLearning(entry) {
    updateEntryLearningLevel(entry, (level) => level + 1);
  }

  function setEntryLearningLevel(entry, level) {
    updateEntryLearningLevel(entry, () => level);
  }

  return {
    selectedSourceLanguage,
    setSelectedSourceLanguage,
    availableSources,
    catalogLoading,
    catalogError,
    sourceLevels,
    setSourceLevels,
    sourceVerbTypes,
    setSourceVerbTypes,
    sourceCategories,
    setSourceCategories,
    catalogView,
    setCatalogView,
    progressViews,
    setProgressViews,
    sourceConnections,
    setSourceConnections,
    importStatus,
    sourceMetadata,
    createCustomDictionary,
    importDictionaryFromUrl,
    remoteImportLoading,
    learningLevelOverrides,
    studySessionEntries,
    selectedSourceDictionary,
    filteredDictionaryProgress,
    filteredSourceEntries,
    addToLearning,
    setEntryLearningLevel
  };
}

