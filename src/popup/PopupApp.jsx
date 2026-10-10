import { useState } from 'react';
import styles from './popup.module.css';
import { Brand } from './components/Brand.jsx';
import { DictionaryNotice } from './components/DictionaryNotice.jsx';
import { PopupFooter } from './components/PopupFooter.jsx';
import { SettingsCard } from './components/SettingsCard.jsx';
import { usePopupSettings } from './hooks/usePopupSettings.js';
import { useSourceLanguage } from './hooks/useSourceLanguage.js';

export function PopupApp() {
  const settings = usePopupSettings();
  const sourceLanguage = useSourceLanguage();
  const [dictionaryNoticeVisible, setDictionaryNoticeVisible] = useState(false);

  return (
    <main className={styles.popup}>
      <Brand />
      <SettingsCard
        enabled={settings.enabled}
        language={settings.language}
        sourceLanguage={sourceLanguage}
        onEnabledChange={settings.changeEnabled}
        onLanguageChange={settings.changeLanguage}
      />
      <DictionaryNotice
        visible={dictionaryNoticeVisible}
        onOpen={() => setDictionaryNoticeVisible(true)}
      />
      <PopupFooter />
    </main>
  );
}
