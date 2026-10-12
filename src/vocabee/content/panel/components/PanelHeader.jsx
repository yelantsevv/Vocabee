import clsx from 'clsx';
import styles from './PanelHeader.module.css';

export function PanelHeader({ activeView, onSelectView, onPointerDown, onPointerMove, onPointerUp }) {
  return (
    <header
      className={styles.headerRoot}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <button className={styles.homeButton} type="button" aria-label="Словарь" aria-pressed={activeView === 'dictionary'} onClick={() => onSelectView('dictionary')}>
        <span className={styles.brandMark} aria-hidden="true">V</span>
        <span className={styles.brand}>Vocabee</span>
      </button>
      <button className={clsx(styles.control, styles.sectionSwitch)} type="button" aria-pressed={activeView === 'dictionary'} aria-label="Мой словарь" title="Мой словарь" onClick={() => onSelectView('dictionary')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H17a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V5.5Zm3-.5a.5.5 0 0 0-.5.5v10.6c.16-.06.33-.1.5-.1h11V6a1 1 0 0 0-1-1H7Z"/><path d="M9 8h7v1.8H9zm0 4h7v1.8H9z"/></svg>
      </button>
      <button className={clsx(styles.control, styles.sectionSwitch)} type="button" aria-pressed={activeView === 'settings'} aria-label="Настройки" title="Настройки" onClick={() => onSelectView('settings')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.8 7.8 0 0 0 0-2l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L15 3h-4l-.4 2.9a8 8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1L11 22h4l.4-2.9a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2.1-1.6ZM13 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" transform="translate(-1 -0.5) scale(.96)"/></svg>
      </button>
    </header>
  );
}
