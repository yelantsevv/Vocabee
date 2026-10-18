import styles from './DictionaryCatalogPanel.module.css';
import { useInterfaceText } from '../../i18n/interfaceLanguage.jsx';

export function FilteredProgressBar({ value, sticky = false }) {
  const t = useInterfaceText();
  return (
    <div
      className={`${styles.overallProgress}${sticky ? ` ${styles.stickyProgress}` : ''}`}
      role="progressbar"
      aria-label={`${t('Прогресс отфильтрованного содержимого: ')}${value}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      title={`${t('Прогресс выбранных записей: ')}${value}%`}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
