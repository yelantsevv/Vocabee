import styles from './DictionarySearch.module.css';

const SEARCH_PLACEHOLDER = 'Поиск слова или перевода';

export function DictionarySearch({
  activeView,
  selectedSourceLanguage,
  sourceSearch,
  onSourceSearchChange
}) {
  if (activeView !== 'dictionaries' || !selectedSourceLanguage) return null;

  return (
    <label className={styles.search}>
      <span className={styles.icon} aria-hidden="true">⌕</span>
      <input
        type="search"
        value={sourceSearch}
        onChange={(event) => onSourceSearchChange(event.target.value)}
        placeholder={SEARCH_PLACEHOLDER}
        aria-label={SEARCH_PLACEHOLDER}
      />
    </label>
  );
}
