import { useCallback, useEffect, useState } from 'react';
import './styles/dictionaryThemes.css';
import styles from './styles/DictionaryPage.module.css';
import { DictionaryCatalogPanel } from './components/catalog/DictionaryCatalogPanel.jsx';
import { SettingsDialog } from './components/settings/SettingsDialog.jsx';
import { useDictionaryCatalog } from './hooks/useDictionaryCatalog.js';
import { enterMobileFullscreen } from './utils/mobileFullscreen.js';
import { useDictionarySettings } from './hooks/useDictionarySettings.js';

export function DictionaryPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    settings,
    appliedSettings,
    settingsStatus,
    updateSetting,
    commitPendingSettings,
    pageStyle
  } = useDictionarySettings();
  useEffect(() => {
    if (!window.matchMedia('(max-width: 640px)').matches) return undefined;

    const requestFullscreenOnInteraction = () => {
      enterMobileFullscreen().then((entered) => {
        if (!entered) return;
        document.removeEventListener('pointerdown', requestFullscreenOnInteraction, true);
        document.removeEventListener('keydown', requestFullscreenOnInteraction, true);
      });
    };

    document.addEventListener('pointerdown', requestFullscreenOnInteraction, true);
    document.addEventListener('keydown', requestFullscreenOnInteraction, true);
    return () => {
      document.removeEventListener('pointerdown', requestFullscreenOnInteraction, true);
      document.removeEventListener('keydown', requestFullscreenOnInteraction, true);
    };
  }, []);

  const closeSettings = useCallback(() => {
    commitPendingSettings();
    setSettingsOpen(false);
  }, [commitPendingSettings]);
  const openSettings = useCallback(() => {
    enterMobileFullscreen();
    setSettingsOpen(true);
  }, []);
  const catalog = useDictionaryCatalog();

  return (
    <main className={styles.page} style={pageStyle}>
      <DictionaryCatalogPanel
        catalog={catalog}
        settingsOpen={settingsOpen}
        onAddToLearning={catalog.addToLearning}
        onOpenSettings={openSettings}
        cardsPerLoad={appliedSettings.cardsPerLoad}
        hideTranslationsUntilHover={appliedSettings.hideTranslationsUntilHover}
        speechVoiceURIs={appliedSettings.speechVoiceURIs}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={closeSettings}
        pageStyle={pageStyle}
        settings={settings}
        updateSetting={updateSetting}
        settingsStatus={settingsStatus}
        catalog={catalog}
        speechLanguage={catalog.availableSources.find(({ id }) => id === catalog.selectedSourceLanguage)?.language === 'de' ? 'de' : 'en'}
      />

    </main>
  );
}
