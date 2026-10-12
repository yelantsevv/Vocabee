import styles from './SettingsSwitch.module.css';

export function SettingsSwitch({ id, label, checked, onChange }) {
  return (
    <label className={styles.row} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
