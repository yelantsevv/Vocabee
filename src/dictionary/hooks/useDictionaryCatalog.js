import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATALOG_SOURCES,
  createCustomDictionary as createStoredCustomDictionary,
  readCatalogDictionaries,
  writeCustomDictionary,
  writeCatalogDictionary
} from '../data/catalogDatabase.js';
import {
  deleteMyVocabularyEntry as deleteStoredMyVocabularyEntry,
  getMyVocabularyEntries,
  setMyVocabularyLearningLevel
} from '../data/storage.js';
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
  readStoredObject,
  CATALOG_FILTERS_VERSION,
  CATALOG_FILTERS_KEY,
  DICTIONARY_STATS_KEY
} from '../utils/catalogPreferences.js';

const MY_VOCABEE_LANGUAGE_KEY = 'vocabee-my-dictionary-language';

function readMyVocabeeLanguage() {
  try {
    return localStorage.getItem(MY_VOCABEE_LANGUAGE_KEY) === 'de' ? 'de' : 'en';
  } catch {
    return 'en';
  }
}

export function useDictionaryCatalog() {
  const [initialFilters] = useState(readCatalogFilters);
  const [selectedSourceLanguage, setSelectedSourceLanguageState] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [sourceLevels, setSourceLevelsState] = useState(initialFilters.sourceLevels);
  const [sourceVerbTypes, setSourceVerbTypesState] = useState(initialFilters.sourceVerbTypes);
  const [sourceCategories, setSourceCategoriesState] = useState(initialFilters.sourceCategories);
  const [progressViews, setProgressViewsState] = useState(initialFilters.progressViews);
  const [myVocabeeLanguage, setMyVocabeeLanguageState] = useState(readMyVocabeeLanguage);
  const [catalogView, setCatalogViewState] = useState(initialFilters.catalogView);
  const [importStatus, setImportStatus] = useState('');
  const [myDictionaryRefreshing, setMyDictionaryRefreshing] = useState(false);
  const [myDictionaryRefreshError, setMyDictionaryRefreshError] = useState('');
  const [remoteImportLoading, setRemoteImportLoading] = useState(false);
  const [sourceMetadata, setSourceMetadata] = useState(CATALOG_SOURCES);
  const catalogMutationRef = useRef(0);
  const myDictionaryRevisionRef = useRef(0);
  const lastMyDictionaryReturnRefreshRef = useRef(0);
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

  function setMyVocabeeLanguage(value) {
    const language = value === 'de' ? 'de' : 'en';
    setMyVocabeeLanguageState(language);
    try {
      localStorage.setItem(MY_VOCABEE_LANGUAGE_KEY, language);
    } catch (error) {
      console.warn('Vocabee: unable to save Vocabee dictionary language.', error);
    }
  }

  function clearMyDictionaryProgressOverrides() {
    setLearningLevelOverrides((current) => {
      const next = Object.fromEntries(Object.entries(current)
        .filter(([key]) => !key.startsWith('my-vocabee:')));
      if (Object.keys(next).length === Object.keys(current).length) return current;
      localStorage.setItem(LEARNED_ENTRIES_KEY, JSON.stringify(next));
      return next;
    });
  }

  const refreshMyDictionary = useCallback(async () => {
    const refreshRevision = myDictionaryRevisionRef.current + 1;
    myDictionaryRevisionRef.current = refreshRevision;
    setMyDictionaryRefreshing(true);
    setMyDictionaryRefreshError('');

    try {
      const entries = await getMyVocabularyEntries();
      if (refreshRevision !== myDictionaryRevisionRef.current) return;

      setLearningLevelOverrides((current) => {
        const next = Object.fromEntries(Object.entries(current)
          .filter(([key]) => !key.startsWith('my-vocabee:')));
        if (Object.keys(next).length === Object.keys(current).length) return current;
        localStorage.setItem(LEARNED_ENTRIES_KEY, JSON.stringify(next));
        return next;
      });

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
    } catch (error) {
      if (refreshRevision === myDictionaryRevisionRef.current) {
        setMyDictionaryRefreshError(error.message || 'Не удалось обновить личный словарь.');
      }
    } finally {
      if (refreshRevision === myDictionaryRevisionRef.current) setMyDictionaryRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const mutationAtStart = catalogMutationRef.current;
    const myDictionaryRevisionAtStart = myDictionaryRevisionRef.current;
    async function loadCatalogFromDatabase() {
      try {
        let records = await readCatalogDictionaries();
        let myDictionaryLoaded = false;
        try {
          const myDictionaryEntries = await getMyVocabularyEntries();
          if (myDictionaryRevisionAtStart === myDictionaryRevisionRef.current) {
            myDictionaryLoaded = true;
            const myDictionary = createMyDictionaryRecord(myDictionaryEntries);
            if (myDictionary) records.push(myDictionary);
          }
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
        if (myDictionaryLoaded) clearMyDictionaryProgressOverrides();

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
            : loadedLanguages[0] || (dictionaries['my-vocabee'] ? 'my-vocabee' : null)
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
    const refreshFromUpdateSignal = () => { void refreshMyDictionary(); };
    const handleRuntimeMessage = (message) => {
      if (message?.type === 'MY_DICTIONARY_UPDATED') refreshFromUpdateSignal();
    };
    const handleDictionaryUpdateEvent = (event) => {
      if (event.detail?.action) refreshFromUpdateSignal();
    };
    const handleExtensionBridgeMessage = (event) => {
      const message = event.data;
      if (event.source !== window
        || event.origin !== window.location.origin
        || message?.channel !== 'VOCABEE_LOCAL_DICTIONARY'
        || message?.type !== 'MY_DICTIONARY_UPDATED') return;

      window.dispatchEvent(new CustomEvent('vocabee:my-dictionary-updated', {
        detail: {
          action: message.action || 'updated',
          learningLevelUpdate: message.learningLevelUpdate
        }
      }));
    };
    runtime?.onMessage?.addListener(handleRuntimeMessage);
    window.addEventListener('vocabee:my-dictionary-updated', handleDictionaryUpdateEvent);
    window.addEventListener('message', handleExtensionBridgeMessage);
    return () => {
      runtime?.onMessage?.removeListener(handleRuntimeMessage);
      window.removeEventListener('vocabee:my-dictionary-updated', handleDictionaryUpdateEvent);
      window.removeEventListener('message', handleExtensionBridgeMessage);
    };
  }, [refreshMyDictionary]);

  useEffect(() => {
    if (selectedSourceLanguage !== 'my-vocabee') return undefined;

    const refreshAfterReturn = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastMyDictionaryReturnRefreshRef.current < 1200) return;
      lastMyDictionaryReturnRefreshRef.current = now;
      void refreshMyDictionary();
    };

    document.addEventListener('visibilitychange', refreshAfterReturn);
    window.addEventListener('focus', refreshAfterReturn);
    return () => {
      document.removeEventListener('visibilitychange', refreshAfterReturn);
      window.removeEventListener('focus', refreshAfterReturn);
    };
  }, [refreshMyDictionary, selectedSourceLanguage]);

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

  const availableSources = useMemo(() => Object.keys(importedDictionaries)
    .filter((sourceId) => sourceMetadata[sourceId])
    .map((sourceId) => {
      const sourceEntries = importedDictionaries[sourceId] || [];
      const entries = sourceId === 'my-vocabee'
        ? sourceEntries.filter((entry) => (entry.source_language || 'en') === myVocabeeLanguage)
        : sourceEntries;
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
    }), [importedDictionaries, learningLevelOverrides, myVocabeeLanguage, sourceMetadata]);

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
    const sourceIds = getCatalogSourceIds(selectedSourceLanguage);
    const entries = sourceIds.flatMap((sourceId) => (importedDictionaries[sourceId] || [])
      .filter((entry) => sourceId !== 'my-vocabee'
        || (entry.source_language || 'en') === myVocabeeLanguage)
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
  }, [catalogView, importedDictionaries, myVocabeeLanguage, selectedSourceLanguage, sourceMetadata]);

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
    const currentLevel = getEntryLearningLevel(entry, learningSource, learningLevelOverrides);
    const nextLevel = Math.max(0, Math.min(MAX_LEARNING_LEVEL, getNextLevel(currentLevel)));
    if (nextLevel === currentLevel) return;

    const isExtensionDictionaryEntry = entry._catalogId === 'my-vocabee'
      && ['en', 'de'].includes(entry.source_language || entry._catalogLanguage);
    const next = { ...learningLevelOverrides };
    if (nextLevel === (entry.learning_level ?? 0) && !isExtensionDictionaryEntry) delete next[key];
    else next[key] = nextLevel;
    setLearningLevelOverrides(next);
    if (!isExtensionDictionaryEntry) {
      localStorage.setItem(LEARNED_ENTRIES_KEY, JSON.stringify(next));
    }

    if (isExtensionDictionaryEntry) {
      setMyVocabularyLearningLevel({
        word: entry.word,
        sourceLang: entry.source_language || entry._catalogLanguage,
        targetLang: entry.target_language || 'ru',
        learningLevel: nextLevel
      }).catch((error) => {
        setLearningLevelOverrides((current) => {
          if (current[key] !== nextLevel) return current;
          const restored = { ...current };
          delete restored[key];
          localStorage.setItem(LEARNED_ENTRIES_KEY, JSON.stringify(restored));
          return restored;
        });
        console.warn('Vocabee: failed to sync learning progress with the extension.', error);
      });
    }
  }

  function addToLearning(entry) {
    updateEntryLearningLevel(entry, (level) => level + 1);
  }

  function setEntryLearningLevel(entry, level) {
    updateEntryLearningLevel(entry, () => level);
  }

  async function deleteMyVocabeeEntry(entry) {
    try {
      const removed = await deleteStoredMyVocabularyEntry({
        word: entry.word,
        sourceLang: entry.source_language || entry._catalogLanguage,
        targetLang: entry.target_language || 'ru'
      });
      if (!removed) return false;
      const language = entry.source_language || entry._catalogLanguage;
      const normalizedWord = entry.word.toLocaleLowerCase(language);
      const learningProgressKey = getLearnedEntryKey(`my-vocabee:${language}`, entry.word);
      setLearningLevelOverrides((current) => {
        const phraseProgressKey = getLearnedEntryKey(`my-vocabee:${language}:phrases`, entry.word);
        if (!(learningProgressKey in current) && !(phraseProgressKey in current)) return current;
        const next = { ...current };
        delete next[learningProgressKey];
        delete next[phraseProgressKey];
        localStorage.setItem(LEARNED_ENTRIES_KEY, JSON.stringify(next));
        return next;
      });
      setImportedDictionaries((current) => ({
        ...current,
        'my-vocabee': (current['my-vocabee'] || []).filter((item) => (
          (item.source_language || 'en') !== language
          || item.word?.toLocaleLowerCase(language) !== normalizedWord
          || (item.target_language || 'ru') !== (entry.target_language || 'ru')
        ))
      }));
      return true;
    } catch (error) {
      setImportStatus(error.message || 'Не удалось удалить карточку из Моего словаря.');
      return false;
    }
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
    myVocabeeLanguage,
    setMyVocabeeLanguage,
    importStatus,
    myDictionaryRefreshing,
    myDictionaryRefreshError,
    refreshMyDictionary,
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
    setEntryLearningLevel,
    deleteMyVocabeeEntry
  };
}

