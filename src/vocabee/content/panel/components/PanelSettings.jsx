import { SettingsSwitch } from '../../../components/settings/SettingsSwitch.jsx';
import { DictionaryWordCard } from './DictionaryWordCard.jsx';
import { WebsiteLink } from './WebsiteLink.jsx';
import styles from './PanelSettings.module.css';

function FontSizeSetting({ id, label, value, unit, min, max, step, onChange, children }) {
  return (
    <div className={styles.fontSetting}>
      <label className={styles.fontSettingLabel} htmlFor={id}>
        <strong>{label}</strong>
        <output className={styles.fontSettingValue}>{value}{unit}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
      {children}
    </div>
  );
}

export function PanelSettings({ preferences, homepageUrl, subtitleLanguage, onSubtitleLanguageChange, dictionaryFontSize, interfaceFontScale, theme, onThemeChange, onDictionaryFontSizeChange, onInterfaceFontScaleChange, }) {
  return (
    <section className={styles.settingsRoot} data-panel-content="settings">
      <WebsiteLink href={homepageUrl} />
      <label className={styles.languageSetting} htmlFor="vocabee-subtitle-language">
        <strong>Язык субтитров</strong>
        <select id="vocabee-subtitle-language" value={subtitleLanguage} onChange={(event) => onSubtitleLanguageChange(event.target.value)}>
          <option value="en">Английский (EN)</option>
          <option value="de">Немецкий (DE)</option>
        </select>
      </label>
      <SettingsSwitch
        id="panel-enabled"
        label="Перевод субтитров"
        checked={preferences.enabled}
        onChange={preferences.changeEnabled}
      />
      <SettingsSwitch
        id="vocabee-color-theme"
        label="Тема оформления"
        checked={theme === 'dark'}
        onChange={(isDark) => onThemeChange(isDark ? 'dark' : 'light')}
      />
      <FontSizeSetting id="vocabee-interface-font-scale" label="Размер текста интерфейса" value={interfaceFontScale} unit="%" min="80" max="140" step="5" onChange={onInterfaceFontScaleChange} />
      <FontSizeSetting id="vocabee-dictionary-font-size" label="Размер текста словаря" value={dictionaryFontSize} unit=" px" min="12" max="24" step="1" onChange={onDictionaryFontSizeChange}>
        <ul className={styles.dictionaryPreview} aria-label="Пример карточки словаря">
          <DictionaryWordCard word="beautiful" translation="красивый" translationVisible />
        </ul>
      </FontSizeSetting>
    </section>
  );
}
