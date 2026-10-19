import clsx from 'clsx';
import { ExtensionLearningProgress } from './ExtensionLearningProgress.jsx';
import styles from './DictionaryEntryHeader.module.css';

export function DictionaryEntryHeader({
  word,
  translation,
  learningLevel = 0,
  onLearningLevelChange,
  onDeleteEntry,
  learningProgressLoaded = true,
  forms,
  translationVisible = false,
  onRevealTranslation,
  onHideTranslation,
  onSpeakWord
}) {
  return (
    <div className={styles.entryHeader}>
      <div className={styles.entryMain}>
        <div className={styles.entryWordBlock}>
          <h2>{onSpeakWord
            ? <button className={styles.speakWordButton} type="button" aria-label={`Озвучить: ${word}`} title="Озвучить слово" onClick={onSpeakWord}>{word}</button>
            : word}
          </h2>
          {forms && <p className={styles.inlineForms}>{forms}</p>}
        </div>
        <div
          className={styles.entryTranslationBlock}
          onMouseLeave={onHideTranslation}
          onFocus={onRevealTranslation}
          onBlur={onHideTranslation}
        >
          <p
            className={clsx(styles.entryTranslation, translationVisible && styles.entryTranslationVisible)}
            aria-hidden={!translationVisible}
          >{translation}</p>
          <div className={styles.cardActions}>
            <ExtensionLearningProgress
              word={word}
              level={learningLevel}
              disabled={!learningProgressLoaded}
              onChange={onLearningLevelChange}
            />
            {onDeleteEntry && (
              <button
                className={styles.deleteEntryButton}
                type="button"
                aria-label={`Удалить «${word}» из Моего словаря`}
                title="Удалить карточку из Моего словаря"
                onClick={onDeleteEntry}
              ><span aria-hidden="true">−</span></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
