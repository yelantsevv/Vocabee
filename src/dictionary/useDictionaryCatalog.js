import { useEffect, useMemo, useRef, useState } from 'react';
import sourceDictionary from '../../dictionary/en-ru.json';
import germanRussianDictionary from '../../dictionary/de-ru.json';
import {
  getEntryLearningLevel,
  getLearnedEntryKey,
  IMPORTED_DICTIONARIES_KEY,
  LEARNED_ENTRIES_KEY,
  matchesVerbType,
  normalizeImportedEntries
} from './dictionaryUtils.js';

const CATALOG_FILTERS_KEY = 'vocabee-dictionary-catalog-filters';
const AVAILABLE_LEVELS = ['A1', 'A2', 'B1', 'B2'];
const AVAILABLE_VERB_TYPES = ['regular', 'irregular', 'phrasal'];

function readCatalogFilters() {
  const defaults = {
    selectedSourceLanguage: 'en',
    sourceLevels: ['A1', 'A2', 'B1'],
    sourceVerbTypes: ['irregular', 'phrasal'],
    sourceSort: 'popular',
    sourceSearch: '',
    progressView: 'all'
  };

  try {
    const saved = JSON.parse(localStorage.getItem(CATALOG_FILTERS_KEY) || '{}');
    return {
      selectedSourceLanguage: ['en', 'de'].includes(saved.selectedSourceLanguage)
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

export function useDictionaryCatalog() {
  const [initialFilters] = useState(readCatalogFilters);
  const [selectedSourceLanguage, setSelectedSourceLanguage] = useState(initialFilters.selectedSourceLanguage);
  const [sourceLevels, setSourceLevels] = useState(initialFilters.sourceLevels);
  const [sourceVerbTypes, setSourceVerbTypes] = useState(initialFilters.sourceVerbTypes);
  const [sourceSort, setSourceSort] = useState(initialFilters.sourceSort);
  const [sourceSearch, setSourceSearch] = useState(initialFilters.sourceSearch);
  const [progressView, setProgressView] = useState(initialFilters.progressView);
  const [importStatus, setImportStatus] = useState('');
  const importInputRef = useRef(null);
  const [importedDictionaries, setImportedDictionaries] = useState(() => (
    readStoredObject(IMPORTED_DICTIONARIES_KEY)
  ));
  const [learningLevelOverrides, setLearningLevelOverrides] = useState(() => (
    readStoredObject(LEARNED_ENTRIES_KEY, true)
  ));

  useEffect(() => {
    try {
      localStorage.setItem(CATALOG_FILTERS_KEY, JSON.stringify({
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

  const selectedSourceDictionary = useMemo(() => {
    const baseEntries = selectedSourceLanguage === 'de' ? germanRussianDictionary : sourceDictionary;
    const entries = new Map(baseEntries.map((entry) => [entry.word.toLocaleLowerCase(), entry]));
    for (const entry of importedDictionaries[selectedSourceLanguage] || []) {
      entries.set(entry.word.toLocaleLowerCase(), entry);
    }
    return [...entries.values()];
  }, [importedDictionaries, selectedSourceLanguage]);

  const learnedCount = selectedSourceDictionary.filter((entry) => (
    getEntryLearningLevel(entry, selectedSourceLanguage, learningLevelOverrides) === 9
  )).length;
  const inProgressCount = selectedSourceDictionary.filter((entry) => {
    const level = getEntryLearningLevel(entry, selectedSourceLanguage, learningLevelOverrides);
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

      return matchesLevel && matchesType && (!query || searchableText.includes(query)) && matchesProgress;
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

  function addToLearning(entry) {
    const key = getLearnedEntryKey(selectedSourceLanguage, entry.word);
    setLearningLevelOverrides((current) => {
      const currentLevel = getEntryLearningLevel(entry, selectedSourceLanguage, current);
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
    sum + getEntryLearningLevel(entry, language, overrides)
  ), 0);
  return Math.round(total / (entries.length * 9) * 100);
}
