import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../styles/DictionaryPage.module.css';
import { SettingsPanel } from './SettingsPanel.jsx';

export function SettingsDialog({
  open,
  onClose,
  pageStyle,
  settings,
  updateSetting,
  settingsStatus,
  catalog,
  speechLanguage,
  refreshButtonPositionEditing,
  onRefreshButtonPositionEditingChange,
  onResetRefreshButtonPosition
}) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal((
    <div
      className={styles.settingsModalBackdrop}
      style={pageStyle}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={styles.settingsModal} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
        <header className={styles.settingsModalHeader}>
          <h2 id="settings-modal-title">Настройки</h2>
          <button
            ref={closeButtonRef}
            className={styles.settingsModalClose}
            type="button"
            aria-label="Закрыть настройки"
            onClick={onClose}
          >×</button>
        </header>
        <SettingsPanel
          settings={settings}
          updateSetting={updateSetting}
          settingsStatus={settingsStatus}
          catalog={catalog}
          speechLanguage={speechLanguage}
          refreshButtonPosition={settings.refreshButtonPosition}
          refreshButtonPositionEditing={refreshButtonPositionEditing}
          onRefreshButtonPositionEditingChange={onRefreshButtonPositionEditingChange}
          onResetRefreshButtonPosition={onResetRefreshButtonPosition}
          modal
        />
      </section>
    </div>
  ), document.body);
}
