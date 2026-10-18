import styles from './DictionaryCatalogPanel.module.css';

export function FilteredProgressBar({ value, sticky = false }) {
  return (
    <div
      className={`${styles.overallProgress}${sticky ? ` ${styles.stickyProgress}` : ''}`}
      role="progressbar"
      aria-label={`Прогресс отфильтрованного содержимого: ${value}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      title={`Прогресс выбранных записей: ${value}%`}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
