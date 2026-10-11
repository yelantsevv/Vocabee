export const dictionaryQuickActions = [
  { id: 'words-en', label: 'EN → RU' },
  { id: 'words-de', label: 'DE → RU' }
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
