export function toggleArrayValue(setValues, value) {
  setValues((currentValues) => (
    currentValues.includes(value)
      ? currentValues.filter((currentValue) => currentValue !== value)
      : [...currentValues, value]
  ));
}

export function shuffleEntries(entries) {
  const shuffledEntries = [...entries];
  for (let index = shuffledEntries.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledEntries[index], shuffledEntries[randomIndex]] = [shuffledEntries[randomIndex], shuffledEntries[index]];
  }
  return shuffledEntries;
}

export function getCatalogEntryKey(entry) {
  return `${entry._catalogId || entry._catalogLanguage}:${entry._entryKey || entry.word}`;
}
