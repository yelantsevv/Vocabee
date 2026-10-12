import clsx from 'clsx';
import { SettingsSwitch } from './SettingsSwitch.jsx';
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
      {variant === 'compact' ? (
        <label className={clsx(styles.row, styles.toggleRow)} htmlFor={enabledId}>
          <span className={styles.copy}>
            <strong>Перевод субтитров</strong>
          </span>
          <input
            id={enabledId}
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
          <span className={styles.toggle} aria-hidden="true" />
        </label>
      ) : (
        <SettingsSwitch
          id={enabledId}
          label="Перевод субтитров"
          checked={enabled}
          onChange={onEnabledChange}
        />
      )}
    </div>
  );
}
