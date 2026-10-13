import styles from './popup.module.css';
import { DictionaryNotice } from './components/DictionaryNotice.jsx';
import { PopupFooter } from './components/PopupFooter.jsx';
import { TranslationSettings } from '../components/settings/TranslationSettings.jsx';
import { usePopupSettings } from './hooks/usePopupSettings.js';
import { useTheme } from '../shared/hooks/useTheme.js';

export function PopupApp() {
  const settings = usePopupSettings();
  const [theme, changeTheme] = useTheme();

  return (
    <main className={styles.popup} data-theme={theme}>
      <TranslationSettings
        idPrefix="popup"
        variant="compact"
        enabled={settings.enabled}
        onEnabledChange={settings.changeEnabled}
      />
      <label className={styles.themeSetting} htmlFor="popup-color-theme">
        Тема оформления
        <select id="popup-color-theme" value={theme} onChange={(event) => changeTheme(event.target.value)}>
          <option value="light">Светлая</option>
          <option value="dark">Тёмная</option>
        </select>
      </label>
      <DictionaryNotice
        onOpen={() => chrome.tabs.create({
          url: 'https://yelantsevv.github.io/Vocabee/'
        })}
      />
      <PopupFooter />
    </main>
  );
}
