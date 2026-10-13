import clsx from 'clsx';
import styles from './DictionaryEntryHeader.module.css';

export function DictionaryEntryHeader({
  word,
  translation,
  learningLevel,
  forms,
  translationVisible = false,
  onAddToLearning,
  onRevealTranslation,
  onHideTranslation
}) {
  return (
    <div className={styles.entryHeader}>
      <div className={styles.entryMain}>
        <div className={styles.entryWordBlock}>
          <h2>{word}</h2>
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
          {learningLevel < 9 && onAddToLearning ? (
            <button
              className={learningLevel === 0 ? styles.addToLearningButton : styles.progressCircle}
              type="button"
              aria-label={`Повысить уровень знания «${word}»: ${learningLevel}`}
              data-translation-trigger=""
              title={`Повысить уровень знания: ${learningLevel}`}
              style={learningLevel > 0 ? { '--progress-angle': `${learningLevel / 9 * 360}deg` } : undefined}
              onPointerEnter={onRevealTranslation}
              onClick={onAddToLearning}
            >
              {learningLevel === 0
                ? <span aria-hidden="true">+</span>
                : <span>{learningLevel}</span>}
            </button>
          ) : learningLevel === 9 ? (
            <span
              className={styles.learnedMark}
              aria-label="Слово выучено"
              data-translation-trigger=""
              onPointerEnter={onRevealTranslation}
            >✓</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
