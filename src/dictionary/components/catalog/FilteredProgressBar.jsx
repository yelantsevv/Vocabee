import styles from './DictionaryCatalogPanel.module.css';

export function FilteredProgressBar({ value, sticky = false, mobilePinned = false }) {
  return (
    <div
      className={`${styles.overallProgress}${sticky ? ` ${styles.stickyProgress}` : ''}${mobilePinned ? ` ${styles.mobilePinnedProgress}` : ''}`}
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
