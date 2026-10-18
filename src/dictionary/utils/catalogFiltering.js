import { matchesVerbType } from './dictionaryUtils.js';

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
  return matchesLevel && matchesType && matchesCategory;
}

export function filterCatalogEntries(entries, filters) {
  return entries
    .filter((entry) => matchesEntryFilters(entry, filters))
    .sort((first, second) => (first.frequency_rank ?? Infinity) - (second.frequency_rank ?? Infinity));
}
