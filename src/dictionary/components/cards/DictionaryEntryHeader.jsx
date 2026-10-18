import styles from './DictionaryEntryHeader.module.css';

export function DictionaryEntryHeader({
  word,
  translation,
  forms,
  translationVisible = false,
  onSpeakWord
}) {
  return (
    <div className={styles.entryHeader}>
      <div className={styles.entryMain}>
        <div className={styles.entryWordBlock}>
          {onSpeakWord ? (
            <h2>
              <button
                className={styles.speakWordButton}
                type="button"
                aria-label={`Озвучить: ${word}`}
                title='Озвучить слово или фразу'
                data-translation-trigger=""
                onClick={onSpeakWord}
              >
                {word}
              </button>
            </h2>
          ) : <h2>{word}</h2>}
          {forms && <p className={styles.inlineForms}>{forms}</p>}
        </div>
        <div className={styles.entryTranslationBlock}>
          <p
            className={translationVisible
              ? styles.entryTranslation
              : `${styles.entryTranslation} ${styles.entryTranslationHidden}`}
            data-translation-hidden={!translationVisible || undefined}
          >{translation}</p>
        </div>
      </div>
    </div>
  );
}
