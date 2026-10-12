import { useEffect, useMemo, useRef, useState } from 'react';
import sourceDictionary from '../../dictionary/en-ru.json';
import germanRussianDictionary from '../../dictionary/de-ru.json';
import phraseCategories from '../../dictionary/phrase-categories.json';
import {
  CATALOG_SOURCES,
  createCustomDictionary as createStoredCustomDictionary,
  readCatalogDictionaries,
  writeCustomDictionary,
  writeCatalogDictionary
} from './catalogDatabase.js';
import { getMyVocabularyEntries } from './storage.js';
import {
  getEntryLearningLevel,
  getLearnedEntryKey,
  LEARNED_ENTRIES_KEY,
  matchesVerbType,
  normalizeImportedEntries
} from './dictionaryUtils.js';

const CATALOG_FILTERS_KEY = 'vocabee-dictionary-catalog-filters';
const CATALOG_FILTERS_VERSION = 4;
const AVAILABLE_LEVELS = ['A1', 'A2', 'B1', 'B2'];
const AVAILABLE_VERB_TYPES = ['regular', 'irregular', 'modal', 'phrasal'];
const PROGRESS_VIEWS = ['learning', 'learned', 'remaining'];
const SOURCE_CONNECTIONS_KEY = 'vocabee-dictionary-source-connections';
const DEFAULT_SOURCE_CONNECTIONS = { my: true, language: true };
const AVAILABLE_CATEGORIES = new Set(phraseCategories.map(({ id }) => id));

function createMyDictionaryRecord(entries) {
  if (!entries.length) return null;
  return {
    catalogId: 'my-vocabee',
    databaseName: 'my-vocabee',
    title: 'Мой словарь',
    language: entries[0].source_language || 'en',
    targetLanguage: entries[0].target_language || 'ru',
    isCustom: true,
    entries
  };
}

function readSourceConnections() {
  try {
    const saved = JSON.parse(localStorage.getItem(SOURCE_CONNECTIONS_KEY) || '{}');
    return {
      my: typeof saved.my === 'boolean' ? saved.my : DEFAULT_SOURCE_CONNECTIONS.my,
      language: typeof saved.language === 'boolean' ? saved.language : DEFAULT_SOURCE_CONNECTIONS.language
    };
  } catch {
    return DEFAULT_SOURCE_CONNECTIONS;
  }
}

function getCatalogSourceIds(language, sourceConnections) {
  return [
    ...(sourceConnections.my ? ['my-vocabee'] : []),
    ...(sourceConnections.language && ['en', 'de'].includes(language) ? [language] : [])
  ];
}

function readCatalogFilters() {
  const defaults = {
    selectedSourceLanguage: null,
    sourceLevels: ['A1', 'A2', 'B1'],
    sourceVerbTypes: ['irregular', 'phrasal'],
    sourceCategories: [],
    sourceSearch: '',
    progressViews: PROGRESS_VIEWS
  };

  try {
    const saved = JSON.parse(localStorage.getItem(CATALOG_FILTERS_KEY) || '{}');
    const isMigrated = saved.version === CATALOG_FILTERS_VERSION;
    return {
      selectedSourceLanguage: isMigrated
        && ([...Object.keys(CATALOG_SOURCES), 'all'].includes(saved.selectedSourceLanguage)
          || String(saved.selectedSourceLanguage || '').startsWith('custom-dictionary-'))
        ? saved.selectedSourceLanguage
        : defaults.selectedSourceLanguage,
      sourceLevels: Array.isArray(saved.sourceLevels)
        ? saved.sourceLevels.filter((level) => AVAILABLE_LEVELS.includes(level))
        : defaults.sourceLevels,
      sourceVerbTypes: Array.isArray(saved.sourceVerbTypes)
        ? saved.sourceVerbTypes.filter((type) => AVAILABLE_VERB_TYPES.includes(type))
        : defaults.sourceVerbTypes,
      sourceCategories: Array.isArray(saved.sourceCategories)
        ? saved.sourceCategories.filter((category) => AVAILABLE_CATEGORIES.has(category))
        : [],
      sourceSearch: typeof saved.sourceSearch === 'string' ? saved.sourceSearch : defaults.sourceSearch,
      progressViews: Array.isArray(saved.progressViews)
        ? saved.progressViews.filter((view) => PROGRESS_VIEWS.includes(view))
        : saved.progressView === 'all'
          ? PROGRESS_VIEWS
          : PROGRESS_VIEWS.includes(saved.progressView)
            ? [saved.progressView]
            : defaults.progressViews
    };
  } catch {
    return defaults;
  }
}

function readStoredObject(key, legacyArrayAsLearned = false) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || (legacyArrayAsLearned ? '[]' : '{}'));
    if (legacyArrayAsLearned && Array.isArray(saved)) {
      return Object.fromEntries(saved.map((item) => [item, 9]));
    }
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

export function useDictionaryCatalog() {
  const [initialFilters] = useState(readCatalogFilters);
  const [selectedSourceLanguage, setSelectedSourceLanguage] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [sourceLevels, setSourceLevels] = useState(initialFilters.sourceLevels);
  const [sourceVerbTypes, setSourceVerbTypes] = useState(initialFilters.sourceVerbTypes);
  const [sourceCategories, setSourceCategories] = useState(initialFilters.sourceCategories);
  const [sourceSearch, setSourceSearch] = useState(initialFilters.sourceSearch);
  const [progressViews, setProgressViews] = useState(initialFilters.progressViews);
  const [sourceConnections, setSourceConnections] = useState(readSourceConnections);
  const [catalogView, setCatalogView] = useState('words');
  const [importStatus, setImportStatus] = useState('');
  const [sourceMetadata, setSourceMetadata] = useState(CATALOG_SOURCES);
  const importInputRef = useRef(null);
  const catalogMutationRef = useRef(0);
  const [importedDictionaries, setImportedDictionaries] = useState({});
  const [learningLevelOverrides, setLearningLevelOverrides] = useState(() => (
    readStoredObject(LEARNED_ENTRIES_KEY, true)
  ));

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
          loadedLanguages.includes(preferredLanguage)
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
    try {
      localStorage.setItem(CATALOG_FILTERS_KEY, JSON.stringify({
        version: CATALOG_FILTERS_VERSION,
        selectedSourceLanguage,
        sourceLevels,
        sourceVerbTypes,
        sourceCategories,
        sourceSearch,
        progressViews
      }));
    } catch (error) {
      console.warn('Vocabee: unable to save dictionary filters.', error);
    }
  }, [selectedSourceLanguage, sourceLevels, sourceVerbTypes, sourceCategories, sourceSearch, progressViews]);

  useEffect(() => {
    try {
      localStorage.setItem(SOURCE_CONNECTIONS_KEY, JSON.stringify(sourceConnections));
    } catch (error) {
      console.warn('Vocabee: unable to save dictionary source connections.', error);
    }
  }, [sourceConnections]);

  const availableSources = useMemo(() => Object.keys(importedDictionaries)
    .filter((sourceId) => sourceMetadata[sourceId])
    .map((sourceId) => ({ id: sourceId, ...sourceMetadata[sourceId] })), [importedDictionaries, sourceMetadata]);
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
    if (catalogView !== 'phrases') return entries;

    return entries.flatMap((entry) => (entry.examples || [])
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
      })));
  }, [catalogView, importedDictionaries, selectedSourceLanguage, sourceConnections, sourceMetadata]);

  const progressCountEntries = catalogView === 'phrases'
    ? selectedSourceDictionary.filter((entry) => {
      const entryLanguage = entry._catalogLanguage || selectedSourceLanguage;
      const matchesLevel = sourceLevels.length === 0 || sourceLevels.includes(entry.level);
      const matchesType = sourceVerbTypes.length === 0
        || sourceVerbTypes.some((type) => matchesVerbType(entry, type, entryLanguage));
      const matchesCategory = sourceCategories.length === 0 || sourceCategories.includes(entry.category);
      return matchesLevel && matchesType && matchesCategory;
    })
    : selectedSourceDictionary;
  const learnedCount = progressCountEntries.filter((entry) => (
    getEntryLearningLevel(entry, entry._learningSource || entry._catalogId || entry._catalogLanguage || selectedSourceLanguage, learningLevelOverrides) === 9
  )).length;
  const inProgressCount = progressCountEntries.filter((entry) => {
    const level = getEntryLearningLevel(entry, entry._learningSource || entry._catalogId || entry._catalogLanguage || selectedSourceLanguage, learningLevelOverrides);
    return level > 0 && level < 9;
  }).length;
  const remainingCount = progressCountEntries.filter((entry) => (
    getEntryLearningLevel(entry, entry._learningSource || entry._catalogId || entry._catalogLanguage || selectedSourceLanguage, learningLevelOverrides) === 0
  )).length;
  const overallDictionaryProgress = getAverageProgress(
    selectedSourceDictionary,
    selectedSourceLanguage,
    learningLevelOverrides
  );
  const selectedLevelEntries = selectedSourceDictionary.filter((entry) => (
    sourceLevels.length === 0 || sourceLevels.includes(entry.level)
  ));
  const levelLearningProgress = getAverageProgress(
    selectedLevelEntries,
    selectedSourceLanguage,
    learningLevelOverrides
  );

  const filteredSourceEntries = useMemo(() => {
    const query = sourceSearch.trim().toLocaleLowerCase();
    const entries = selectedSourceDictionary.filter((entry) => {
      const entryLanguage = entry._catalogLanguage || selectedSourceLanguage;
      const learningLevel = getEntryLearningLevel(
        entry,
        entry._learningSource || entry._catalogId || entryLanguage,
        learningLevelOverrides
      );
      const searchableText = [
        entry.word,
        ...entry.definitions,
        ...(entry.synonyms || []),
        ...(entry.examples || []).flatMap((example) => [
          example.phrase,
          example.translation,
          example.category || ''
        ])
      ].join(' ').toLocaleLowerCase();
      const matchesCategory = catalogView !== 'phrases'
        || sourceCategories.length === 0
        || sourceCategories.includes(entry.category);

      const matchesLevel = sourceLevels.length === 0 || sourceLevels.includes(entry.level);
      const matchesType = entry._isPhrase
        ? sourceVerbTypes.length === 0
          || sourceVerbTypes.some((type) => matchesVerbType(entry, type, entryLanguage))
        : sourceMetadata[entry._catalogId]?.isCustom
          || entry.part_of_speech === 'phrase'
          || sourceVerbTypes.length === 0
          || sourceVerbTypes.some((type) => matchesVerbType(entry, type, entryLanguage));
      const progressCategory = learningLevel === 9
        ? 'learned'
        : learningLevel > 0
          ? 'learning'
          : 'remaining';
      const matchesProgress = progressViews.length === 0 || progressViews.includes(progressCategory);
      return matchesLevel && matchesType && matchesCategory
        && (!query || searchableText.includes(query)) && matchesProgress;
    });

    return entries.sort((a, b) => (a.frequency_rank ?? Infinity) - (b.frequency_rank ?? Infinity));
  }, [
    learningLevelOverrides,
    progressViews,
    selectedSourceDictionary,
    selectedSourceLanguage,
    sourceSearch,
    sourceCategories,
    sourceLevels,
    sourceVerbTypes,
    sourceMetadata
  ]);

  async function importDictionaryFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text());
      const declaredLanguage = [
        payload?.language,
        payload?.source_language,
        payload?.sourceLang,
        payload?.dictionary,
        file.name
      ].map((value) => String(value || '').toLowerCase())
        .map((value) => value.match(/(?:^|[^a-z])(en|de)(?:[-_.]|$)/)?.[1])
        .find(Boolean);
      const selectedMetadata = sourceMetadata[selectedSourceLanguage];
      const fallbackLanguage = selectedMetadata?.language;
      const language = ['en', 'de'].includes(declaredLanguage) ? declaredLanguage : fallbackLanguage;
      if (!language) throw new Error('Укажите язык базы в JSON (language: "en" или "de").');
      const importedEntries = normalizeImportedEntries(payload);
      if (selectedMetadata?.isCustom) {
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
    } catch (error) {
      setImportStatus(`Не удалось импортировать базу: ${error.message}`);
    } finally {
      event.target.value = '';
    }
  }

  async function loadBuiltinDictionary(language) {
    if (!['en', 'de'].includes(language)) return;
    try {
      const entries = language === 'de' ? germanRussianDictionary : sourceDictionary;
      catalogMutationRef.current += 1;
      await writeCatalogDictionary(language, entries);
      setImportedDictionaries((current) => ({ ...current, [language]: entries }));
      setSelectedSourceLanguage(language);
      setImportStatus(`База ${language.toUpperCase()} → RU загружена.`);
    } catch (error) {
      setImportStatus(error.message || 'Не удалось сохранить базу словаря.');
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

  function addToLearning(entry) {
    const learningSource = entry._learningSource || entry._catalogId || entry._catalogLanguage || selectedSourceLanguage;
    const key = getLearnedEntryKey(learningSource, entry.word);
    setLearningLevelOverrides((current) => {
      const currentLevel = getEntryLearningLevel(entry, learningSource, current);
      if (currentLevel >= 9) return current;

      const nextLevel = Math.min(currentLevel + 1, 9);
      const next = { ...current };
      if (nextLevel === (entry.learning_level ?? 0)) delete next[key];
      else next[key] = nextLevel;
      localStorage.setItem(LEARNED_ENTRIES_KEY, JSON.stringify(next));
      return next;
    });
  }

  return {
    selectedSourceLanguage,
    setSelectedSourceLanguage,
    availableSources,
    catalogLoading,
    catalogError,
    loadBuiltinDictionary,
    sourceLevels,
    setSourceLevels,
    sourceVerbTypes,
    setSourceVerbTypes,
    sourceCategories,
    setSourceCategories,
    sourceSearch,
    catalogView,
    setCatalogView,
    setSourceSearch,
    progressViews,
    setProgressViews,
    sourceConnections,
    setSourceConnections,
    importStatus,
    sourceMetadata,
    createCustomDictionary,
    importInputRef,
    importDictionaryFile,
    learningLevelOverrides,
    selectedSourceDictionary,
    learnedCount,
    inProgressCount,
    remainingCount,
    overallDictionaryProgress,
    selectedLevelEntries,
    levelLearningProgress,
    filteredSourceEntries,
    addToLearning
  };
}

function getAverageProgress(entries, language, overrides) {
  if (!entries.length) return 0;
  const total = entries.reduce((sum, entry) => (
    sum + getEntryLearningLevel(entry, entry._learningSource || entry._catalogId || entry._catalogLanguage || language, overrides)
  ), 0);
  return Math.round(total / (entries.length * 9) * 100);
}
