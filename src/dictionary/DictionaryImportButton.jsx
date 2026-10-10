import styles from './DictionaryImportButton.module.css';

export function DictionaryImportButton({ inputRef, onImportFile, fill = false }) {
  return (
    <div className={styles.importControl}>
      <input
        ref={inputRef}
        className={styles.hiddenFileInput}
        type="file"
        accept=".json,application/json"
        aria-label="Выбрать JSON-файл словаря для импорта"
        onChange={onImportFile}
      />
      <button
        className={`${styles.importButton} ${fill ? styles.fillButton : ''}`}
        type="button"
        aria-label="Импортировать базу словаря"
        title="Импорт базы"
        onClick={() => inputRef.current?.click()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" />
        </svg>
      </button>
    </div>
  );
}
