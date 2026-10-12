import styles from './DictionaryNotice.module.css';

export function DictionaryNotice({ onOpen }) {
  return (
    <button className={styles.dictionaryButton} type="button" onClick={onOpen}>
      Добавить в словарь
    </button>
  );
}
