import { useState } from 'react';
import styles from './popup.module.css';
import { Brand } from './components/Brand.jsx';
import { DictionaryNotice } from './components/DictionaryNotice.jsx';
import { PopupFooter } from './components/PopupFooter.jsx';
import { TranslationSettings } from '../settings/TranslationSettings.jsx';
import { usePopupSettings } from './hooks/usePopupSettings.js';
import { useSourceLanguage } from './hooks/useSourceLanguage.js';

export function PopupApp() {
  const settings = usePopupSettings();
  const sourceLanguage = useSourceLanguage();
  const [dictionaryNoticeVisible, setDictionaryNoticeVisible] = useState(false);

  return (
    <main className={styles.popup}>
      <Brand />
      <TranslationSettings
        idPrefix="popup"
        variant="compact"
        enabled={settings.enabled}
        targetLanguage={settings.language}
        sourceLanguage={sourceLanguage}
        onEnabledChange={settings.changeEnabled}
        onTargetLanguageChange={settings.changeLanguage}
      />
      <DictionaryNotice
        visible={dictionaryNoticeVisible}
        onOpen={() => setDictionaryNoticeVisible(true)}
      />
      <PopupFooter />
    </main>
  );
}
