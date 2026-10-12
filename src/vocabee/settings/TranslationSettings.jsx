import clsx from 'clsx';
import styles from './TranslationSettings.module.css';

export function TranslationSettings({
  idPrefix,
  variant = 'page',
  enabled,
  onEnabledChange
}) {
  const enabledId = `${idPrefix}-enabled`;

  return (
    <div className={styles.controls} data-variant={variant}>
      <label className={clsx(styles.row, styles.toggleRow)} htmlFor={enabledId}>
        <span className={styles.copy}>
          <strong>Перевод на русский</strong>
          <small>Слова и фразы на YouTube</small>
        </span>
        <input
          id={enabledId}
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        <span className={styles.toggle} aria-hidden="true" />
      </label>
    </div>
  );
}
