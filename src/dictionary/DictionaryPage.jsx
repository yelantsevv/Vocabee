import { useCallback, useState } from 'react';
import './styles/dictionaryThemes.css';
import styles from './styles/DictionaryPage.module.css';
import { DictionaryCatalogPanel } from './components/catalog/DictionaryCatalogPanel.jsx';
import { SettingsDialog } from './components/settings/SettingsDialog.jsx';
import { useDictionaryCatalog } from './hooks/useDictionaryCatalog.js';
import { enterMobileFullscreen, exitMobileFullscreen } from './utils/mobileFullscreen.js';
import { InterfaceLanguageProvider } from './i18n/interfaceLanguage.jsx';
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
  const closeSettings = useCallback(() => {
    commitPendingSettings();
    setSettingsOpen(false);
    exitMobileFullscreen();
  }, [commitPendingSettings]);
  const openSettings = useCallback(() => {
    enterMobileFullscreen();
    setSettingsOpen(true);
  }, []);
  const catalog = useDictionaryCatalog();

  return (
    <InterfaceLanguageProvider>
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
    </InterfaceLanguageProvider>
  );
}
