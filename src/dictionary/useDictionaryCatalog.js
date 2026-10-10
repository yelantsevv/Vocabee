import { useEffect, useMemo, useRef, useState } from 'react';
import sourceDictionary from '../../dictionary/en-ru/en-ru.json';
import germanRussianDictionary from '../../dictionary/de-ru/de-ru.json';
import {
  CATALOG_SOURCES,
  readCatalogDictionaries,
  writeCatalogDictionary,
  writePhraseDictionary
} from './catalogDatabase.js';
import { phraseDictionaries } from './phraseDictionaries.js';
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
const AVAILABLE_VERB_TYPES = ['regular', 'irregular', 'phrasal'];

function readCatalogFilters() {
  const defaults = {
    selectedSourceLanguage: null,
    sourceLevels: ['A1', 'A2', 'B1'],
    sourceVerbTypes: ['irregular', 'phrasal'],
    sourceSort: 'popular',
    sourceSearch: '',
    progressView: 'all'
  };

  try {
    const saved = JSON.parse(localStorage.getItem(CATALOG_FILTERS_KEY) || '{}');
    const isMigrated = saved.version === CATALOG_FILTERS_VERSION;
    return {
      selectedSourceLanguage: isMigrated
        && [...Object.keys(CATALOG_SOURCES), 'all'].includes(saved.selectedSourceLanguage)
        ? saved.selectedSourceLanguage
        : defaults.selectedSourceLanguage,
      sourceLevels: Array.isArray(saved.sourceLevels)
        ? saved.sourceLevels.filter((level) => AVAILABLE_LEVELS.includes(level))
        : defaults.sourceLevels,
      sourceVerbTypes: Array.isArray(saved.sourceVerbTypes)
        ? saved.sourceVerbTypes.filter((type) => AVAILABLE_VERB_TYPES.includes(type))
        : defaults.sourceVerbTypes,
      sourceSort: ['popular', 'alphabetical', 'progress', 'progress-desc'].includes(saved.sourceSort)
        ? saved.sourceSort
        : defaults.sourceSort,
      sourceSearch: typeof saved.sourceSearch === 'string' ? saved.sourceSearch : defaults.sourceSearch,
      progressView: ['all', 'learning', 'learned'].includes(saved.progressView)
        ? saved.progressView
        : defaults.progressView
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

async function movePreviouslyMergedPhrasesToSeparateDatabases(records) {
  const baseRecord = records.find(({ catalogId, language }) => (catalogId || language) === 'en');
  if (!baseRecord) return records;

  const existingSourceIds = new Set(records.map(({ catalogId, language }) => catalogId || language));
  const remainingEntries = [...baseRecord.entries];
  let movedEntries = false;

  for (const [sourceId, dictionary] of Object.entries(phraseDictionaries)) {
    if (existingSourceIds.has(sourceId)) continue;
    const phraseWords = new Set(dictionary.entries.map((entry) => entry.word.toLocaleLowerCase()));
    const phrases = remainingEntries.filter((entry) => (
      entry.part_of_speech === 'phrase' && phraseWords.has(entry.word.toLocaleLowerCase())
    ));
    if (!phrases.length) continue;

    await writePhraseDictionary(sourceId, { ...dictionary, entries: phrases });
    const movedWords = new Set(phrases.map((entry) => entry.word.toLocaleLowerCase()));
    for (let index = remainingEntries.length - 1; index >= 0; index -= 1) {
      if (movedWords.has(remainingEntries[index].word.toLocaleLowerCase())) remainingEntries.splice(index, 1);
    }
    existingSourceIds.add(sourceId);
    movedEntries = true;
  }

  if (!movedEntries) return records;
  await writeCatalogDictionary('en', remainingEntries);
  return readCatalogDictionaries();
}

export function useDictionaryCatalog() {
  const [initialFilters] = useState(readCatalogFilters);
  const [selectedSourceLanguage, setSelectedSourceLanguage] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [sourceLevels, setSourceLevels] = useState(initialFilters.sourceLevels);
  const [sourceVerbTypes, setSourceVerbTypes] = useState(initialFilters.sourceVerbTypes);
  const [sourceSort, setSourceSort] = useState(initialFilters.sourceSort);
  const [sourceSearch, setSourceSearch] = useState(initialFilters.sourceSearch);
  const [progressView, setProgressView] = useState(initialFilters.progressView);
  const [importStatus, setImportStatus] = useState('');
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
        records = await movePreviouslyMergedPhrasesToSeparateDatabases(records);
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
        setImportedDictionaries(dictionaries);
        const preferredLanguage = initialFilters.selectedSourceLanguage;
        setSelectedSourceLanguage(preferredLanguage === 'all' && records.length
          ? 'all'
          : dictionaries[preferredLanguage]
          ? preferredLanguage
          : records.length > 1 ? 'all' : records[0]?.catalogId || records[0]?.language || null);
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
      const source = Object.entries(CATALOG_SOURCES)
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
      if (databaseName === 'vocabee-catalog') {
        setSelectedSourceLanguage(null);
      } else if (selectedSourceLanguage === source
        || (selectedSourceLanguage === 'all' && !remainingSources.length)) {
        setSelectedSourceLanguage(remainingSources.length > 1 ? 'all' : remainingSources[0] || null);
      }
      setCatalogError('');
      setCatalogLoading(false);
    };
    window.addEventListener('vocabee:indexeddb-deleted', handleDatabaseDeleted);
    return () => window.removeEventListener('vocabee:indexeddb-deleted', handleDatabaseDeleted);
  }, [importedDictionaries, selectedSourceLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem(CATALOG_FILTERS_KEY, JSON.stringify({
        version: CATALOG_FILTERS_VERSION,
        selectedSourceLanguage,
        sourceLevels,
        sourceVerbTypes,
        sourceSort,
        sourceSearch,
        progressView
      }));
    } catch (error) {
      console.warn('Vocabee: unable to save dictionary filters.', error);
    }
  }, [selectedSourceLanguage, sourceLevels, sourceVerbTypes, sourceSort, sourceSearch, progressView]);

  const availableSources = useMemo(() => Object.keys(importedDictionaries)
    .filter((sourceId) => CATALOG_SOURCES[sourceId])
    .map((sourceId) => ({ id: sourceId, ...CATALOG_SOURCES[sourceId] })), [importedDictionaries]);
  const selectedSourceDictionary = useMemo(() => {
    if (!selectedSourceLanguage) return [];
    const sourceIds = selectedSourceLanguage === 'all'
      ? availableSources.map(({ id }) => id)
      : [selectedSourceLanguage];
    return sourceIds.flatMap((sourceId) => (importedDictionaries[sourceId] || [])
      .map((entry) => ({
        ...entry,
        _catalogId: sourceId,
        _catalogLanguage: CATALOG_SOURCES[sourceId].language
      })));
  }, [availableSources, importedDictionaries, selectedSourceLanguage]);

  const learnedCount = selectedSourceDictionary.filter((entry) => (
    getEntryLearningLevel(entry, entry._catalogId || entry._catalogLanguage || selectedSourceLanguage, learningLevelOverrides) === 9
  )).length;
  const inProgressCount = selectedSourceDictionary.filter((entry) => {
    const level = getEntryLearningLevel(entry, entry._catalogId || entry._catalogLanguage || selectedSourceLanguage, learningLevelOverrides);
    return level > 0 && level < 9;
  }).length;
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
        entry._catalogId || entryLanguage,
        learningLevelOverrides
      );
      const searchableText = [
        entry.word,
        ...entry.definitions,
        ...(entry.synonyms || []),
        ...(entry.examples || []).flatMap((example) => [example.phrase, example.translation])
      ].join(' ').toLocaleLowerCase();

      const matchesLevel = sourceLevels.length === 0 || sourceLevels.includes(entry.level);
      const matchesType = entry.part_of_speech === 'phrase'
        || sourceVerbTypes.length === 0
        || sourceVerbTypes.some((type) => matchesVerbType(entry, type, entryLanguage));
      const matchesProgress = progressView === 'all'
        || (progressView === 'learning' && learningLevel > 0 && learningLevel < 9)
        || (progressView === 'learned' && learningLevel === 9);

      return matchesLevel && matchesType && (!query || searchableText.includes(query)) && matchesProgress;
    });

    if (sourceSort === 'alphabetical') {
      return entries.sort((a, b) => a.word.localeCompare(b.word, a._catalogLanguage || selectedSourceLanguage));
    }
    if (sourceSort === 'progress' || sourceSort === 'progress-desc') {
      return entries.sort((a, b) => {
        const progressDifference = getEntryLearningLevel(a, a._catalogId || a._catalogLanguage || selectedSourceLanguage, learningLevelOverrides)
          - getEntryLearningLevel(b, b._catalogId || b._catalogLanguage || selectedSourceLanguage, learningLevelOverrides);
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
      const fallbackLanguage = CATALOG_SOURCES[selectedSourceLanguage]?.language;
      const language = ['en', 'de'].includes(declaredLanguage) ? declaredLanguage : fallbackLanguage;
      if (!language) throw new Error('Укажите язык базы в JSON (language: "en" или "de").');
      const importedEntries = normalizeImportedEntries(payload);
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

  async function loadPhraseDictionary(sectionKey) {
    const dictionary = phraseDictionaries[sectionKey];
    if (!dictionary) return false;

    try {
      catalogMutationRef.current += 1;
      await writePhraseDictionary(sectionKey, dictionary);
      setImportedDictionaries((current) => ({ ...current, [sectionKey]: dictionary.entries }));
      setSelectedSourceLanguage(sectionKey);
      setImportStatus('');
      return true;
    } catch (error) {
      setImportStatus(error.message || 'Не удалось загрузить набор фраз.');
      return false;
    }
  }

  function addToLearning(entry) {
    const learningSource = entry._catalogId || entry._catalogLanguage || selectedSourceLanguage;
    const key = getLearnedEntryKey(learningSource, entry.word);
    setLearningLevelOverrides((current) => {
      const currentLevel = getEntryLearningLevel(entry, learningSource, current);
      if (currentLevel > 0) return current;

      const nextLevel = 1;
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
    loadPhraseDictionary,
    sourceLevels,
    setSourceLevels,
    sourceVerbTypes,
    setSourceVerbTypes,
    sourceSort,
    setSourceSort,
    sourceSearch,
    setSourceSearch,
    progressView,
    setProgressView,
    importStatus,
    importInputRef,
    importDictionaryFile,
    learningLevelOverrides,
    selectedSourceDictionary,
    learnedCount,
    inProgressCount,
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
    sum + getEntryLearningLevel(entry, entry._catalogId || entry._catalogLanguage || language, overrides)
  ), 0);
  return Math.round(total / (entries.length * 9) * 100);
}
