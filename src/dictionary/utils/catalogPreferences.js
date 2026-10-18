import phraseCategories from '../data/phrase-categories.json';
import { CATALOG_SOURCES } from '../data/catalogDatabase.js';
import { getEntryLearningLevel } from './dictionaryUtils.js';

export const CATALOG_FILTERS_KEY = 'vocabee-dictionary-catalog-filters';
export const SOURCE_CONNECTIONS_KEY = 'vocabee-dictionary-source-connections';
export const DICTIONARY_STATS_KEY = 'vocabee-dictionary-stats-v1';
export const CATALOG_FILTERS_VERSION = 4;
export const DEFAULT_SOURCE_CONNECTIONS = { my: true, language: true };

const availableLevels = ['A1', 'A2', 'B1', 'B2'];
const availableVerbTypes = ['regular', 'irregular', 'modal', 'phrasal'];
const progressViews = ['learning', 'learned', 'remaining'];
const availableCategories = new Set(phraseCategories.map(({ id }) => id));

export function createMyDictionaryRecord(entries) {
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

export function readSourceConnections() {
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

export function getCatalogSourceIds(language, sourceConnections) {
  const selectedSourceIds = sourceConnections.language
    && (CATALOG_SOURCES[language] || String(language || '').startsWith('custom-dictionary-'))
    ? [language]
    : [];

  return [
    ...(sourceConnections.my ? ['my-vocabee'] : []),
    ...selectedSourceIds
  ];
}

export function createLearningStats() {
  return { total: 0, inProgress: 0, learned: 0 };
}

export function addLearningStat(stats, entry, language, overrides) {
  const level = getEntryLearningLevel(entry, language, overrides);
  stats.total += 1;
  if (level === 9) stats.learned += 1;
  else if (level > 0) stats.inProgress += 1;
}

export function readCatalogFilters() {
  const defaults = {
    catalogView: 'words',
    selectedSourceLanguage: null,
    sourceLevels: ['A1', 'A2', 'B1'],
    sourceVerbTypes: ['irregular', 'phrasal'],
    sourceCategories: [],
    progressViews
  };

  try {
    const saved = JSON.parse(localStorage.getItem(CATALOG_FILTERS_KEY) || '{}');
    const selectedSourceLanguage = [
      ...Object.keys(CATALOG_SOURCES),
      'all',
      'my-vocabee'
    ].includes(saved.selectedSourceLanguage)
      || String(saved.selectedSourceLanguage || '').startsWith('custom-dictionary-')
      ? saved.selectedSourceLanguage
      : defaults.selectedSourceLanguage;
    const sourceCategories = Array.isArray(saved.sourceCategories)
      ? saved.sourceCategories.filter((category) => availableCategories.has(category))
      : [];

    return {
      catalogView: sourceCategories.length > 0
        ? 'phrases'
        : ['words', 'phrases'].includes(saved.catalogView) ? saved.catalogView : defaults.catalogView,
      selectedSourceLanguage,
      sourceLevels: Array.isArray(saved.sourceLevels)
        ? saved.sourceLevels.filter((level) => availableLevels.includes(level))
        : defaults.sourceLevels,
      sourceVerbTypes: Array.isArray(saved.sourceVerbTypes)
        ? saved.sourceVerbTypes.filter((type) => availableVerbTypes.includes(type))
        : defaults.sourceVerbTypes,
      sourceCategories,
      progressViews: Array.isArray(saved.progressViews)
        ? saved.progressViews.filter((view) => progressViews.includes(view))
        : saved.progressView === 'all'
          ? progressViews
          : progressViews.includes(saved.progressView)
            ? [saved.progressView]
            : defaults.progressViews
    };
  } catch {
    return defaults;
  }
}

export function readStoredObject(key, legacyArrayAsLearned = false) {
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
