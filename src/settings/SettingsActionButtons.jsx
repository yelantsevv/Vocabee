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
      {visibleActions.map(({ label, onClick, disabled }) => (
        <button key={label} type="button" onClick={onClick} disabled={disabled}>
          {label}
        </button>
      ))}
    </div>
  );
}
