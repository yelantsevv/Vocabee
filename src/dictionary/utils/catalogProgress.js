import { getEntryLearningLevel } from './dictionaryUtils.js';

function getEntryProgressCategory(entry, selectedSourceLanguage, learningLevelOverrides) {
  const learningLevel = getEntryLearningLevel(
    entry,
    entry._learningSource || entry._catalogId || entry._catalogLanguage || selectedSourceLanguage,
    learningLevelOverrides
  );
  return {
    learningLevel,
    category: learningLevel === 9 ? 'learned' : learningLevel > 0 ? 'learning' : 'remaining'
  };
}

export function getAverageProgress(entries, selectedSourceLanguage, learningLevelOverrides) {
  if (!entries.length) return 0;
  const totalLevel = entries.reduce((total, entry) => (
    total + getEntryProgressCategory(entry, selectedSourceLanguage, learningLevelOverrides).learningLevel
  ), 0);
  return Math.round(totalLevel / (entries.length * 9) * 100);
}

export function filterEntriesByProgress(entries, progressViews, selectedSourceLanguage, learningLevelOverrides) {
  return entries.filter((entry) => {
    const { category } = getEntryProgressCategory(entry, selectedSourceLanguage, learningLevelOverrides);
    return progressViews.length === 0 || progressViews.includes(category);
  });
}

export function getStudySessionEntries(entries, progressViews, selectedSourceLanguage, learningLevelOverrides) {
  return entries
    .map((entry) => ({
      entry,
      ...getEntryProgressCategory(entry, selectedSourceLanguage, learningLevelOverrides)
    }))
    .filter(({ learningLevel, category }) => (
      learningLevel < 9 && (progressViews.length === 0 || progressViews.includes(category))
    ))
    .sort((first, second) => {
      const firstInProgress = first.learningLevel > 0 ? 0 : 1;
      const secondInProgress = second.learningLevel > 0 ? 0 : 1;
      return firstInProgress - secondInProgress
        || first.learningLevel - second.learningLevel
        || (first.entry.frequency_rank ?? Infinity) - (second.entry.frequency_rank ?? Infinity);
    })
    .map(({ entry }) => entry);
}
