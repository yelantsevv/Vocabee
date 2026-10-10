export const dictionaryQuickActions = [
  { id: 'words-en', label: 'Загрузить EN → RU' },
  { id: 'words-de', label: 'Загрузить DE → RU' },
  { id: 'phrase-everyday', label: 'Повседневные фразы' },
  { id: 'phrase-travel', label: 'Фразы для путешествий' }
];

export function openDictionaryQuickAction(id) {
  chrome.runtime.sendMessage({ type: 'OPEN_DICTIONARY_QUICK_ACTION', id }, (result) => {
    if (chrome.runtime.lastError) {
      console.error('Vocabee: could not open dictionary section', chrome.runtime.lastError.message);
      return;
    }
    if (!result?.ok) console.error('Vocabee: could not open dictionary section', result?.error);
  });
}
