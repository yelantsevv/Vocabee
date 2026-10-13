import { useState } from 'react';
import styles from './DictionarySearch.module.css';

const SEARCH_PLACEHOLDER = 'Поиск слова или перевода';

export function DictionarySearch({
  variant,
  selectedSourceLanguage,
  sourceSearch,
  onSourceSearchChange
}) {
  const [isExpanded, setIsExpanded] = useState(Boolean(sourceSearch));
  if (!selectedSourceLanguage) return null;

  return (
    <div className={styles.searchControl} data-variant={variant}>
      <button
        className={styles.searchToggle}
        type="button"
        aria-label={isExpanded ? 'Скрыть поиск' : SEARCH_PLACEHOLDER}
        aria-expanded={isExpanded}
        title={isExpanded ? 'Скрыть поиск' : SEARCH_PLACEHOLDER}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="m15.5 15.5 4.2 4.2" />
        </svg>
      </button>
      {isExpanded && (
        <label className={styles.search}>
          <input
            autoFocus
            type="search"
            value={sourceSearch}
            onChange={(event) => onSourceSearchChange(event.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label={SEARCH_PLACEHOLDER}
          />
        </label>
      )}
    </div>
  );
}
