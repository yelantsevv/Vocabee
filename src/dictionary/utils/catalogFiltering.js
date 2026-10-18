import { matchesVerbType } from './dictionaryUtils.js';

function getSearchableText(entry) {
  return [
    entry.word,
    ...entry.definitions,
    ...(entry.synonyms || []),
    ...(entry.examples || []).flatMap((example) => [
      example.phrase,
      example.translation,
      example.category || ''
    ])
  ].join(' ').toLocaleLowerCase();
}

function matchesEntryFilters(entry, filters) {
  const language = entry._catalogLanguage || filters.selectedSourceLanguage;
  const isCustomSource = filters.sourceMetadata[entry._catalogId]?.isCustom;
  const matchesCategory = filters.catalogView !== 'phrases'
    || filters.sourceCategories.length === 0
    || filters.sourceCategories.includes(entry.category);
  const matchesLevel = filters.sourceLevels.length === 0 || filters.sourceLevels.includes(entry.level);
  const matchesType = entry._isPhrase
    ? (isCustomSource && entry.part_of_speech === 'phrase')
      || filters.sourceVerbTypes.length === 0
      || filters.sourceVerbTypes.some((type) => matchesVerbType(entry, type, language))
    : isCustomSource
      || entry.part_of_speech === 'phrase'
      || filters.sourceVerbTypes.length === 0
      || filters.sourceVerbTypes.some((type) => matchesVerbType(entry, type, language));
  const matchesSearch = !filters.query || getSearchableText(entry).includes(filters.query);
  return matchesLevel && matchesType && matchesCategory && matchesSearch;
}

export function filterCatalogEntries(entries, filters) {
  const normalizedFilters = {
    ...filters,
    query: filters.sourceSearch.trim().toLocaleLowerCase()
  };
  return entries
    .filter((entry) => matchesEntryFilters(entry, normalizedFilters))
    .sort((first, second) => (first.frequency_rank ?? Infinity) - (second.frequency_rank ?? Infinity));
}
