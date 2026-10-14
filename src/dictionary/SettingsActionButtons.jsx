import styles from './SettingsActionButtons.module.css';
import { useInterfaceText } from './interfaceLanguage.jsx';

export function SettingsActionButtons({ variant = 'page', firstAction, actions = [], ariaLabel = 'Дополнительные настройки' }) {
  const t = useInterfaceText();
  const visibleActions = actions;
  return (
    <div
      className={styles.actions}
      data-variant={variant}
      data-count={visibleActions.length + Number(Boolean(firstAction))}
      role="group"
      aria-label={t(ariaLabel)}
    >
      {firstAction}
      {visibleActions.map(({ label, onClick, disabled, checked, active }) => (
        <button
          className={active ? styles.active : undefined}
          key={label}
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={active}
        >
          <span>{t(label)}</span>
          {checked && <span className={styles.checkmark} aria-label={t('База подключена')}>✓</span>}
        </button>
      ))}
    </div>
  );
}
