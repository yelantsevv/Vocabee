import styles from './SettingsActionButtons.module.css';

export function SettingsActionButtons({ variant = 'page', firstAction, actions = [], ariaLabel = 'Дополнительные настройки' }) {
  const visibleActions = actions;
  return (
    <div
      className={styles.actions}
      data-variant={variant}
      data-count={visibleActions.length + Number(Boolean(firstAction))}
      role="group"
      aria-label={ariaLabel}
    >
      {firstAction}
      {visibleActions.map(({ label, onClick, disabled, checked }) => (
        <button className={checked ? styles.checked : undefined} key={label} type="button" onClick={onClick} disabled={disabled}>
          <span>{label}</span>
          {checked && <span className={styles.checkmark} aria-label="База подключена">✓</span>}
        </button>
      ))}
    </div>
  );
}
