import styles from './DictionarySearch.module.css';

const SEARCH_PLACEHOLDER = 'Поиск слова или перевода';

export function DictionarySearch({
  activeView,
  selectedSourceLanguage,
  savedWordsSearch,
  onSavedWordsSearchChange,
  sourceSearch,
  onSourceSearchChange
}) {
  const isSavedWordsView = activeView === 'dictionary';
  const isCatalogView = activeView === 'dictionaries'
    && Boolean(selectedSourceLanguage);

  if (!isSavedWordsView && !isCatalogView) return null;

  const value = isSavedWordsView ? savedWordsSearch : sourceSearch;
  const onChange = isSavedWordsView ? onSavedWordsSearchChange : onSourceSearchChange;

  return (
    <label className={styles.search}>
      <span className={styles.icon} aria-hidden="true">⌕</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={SEARCH_PLACEHOLDER}
        aria-label={SEARCH_PLACEHOLDER}
      />
    </label>
  );
}
