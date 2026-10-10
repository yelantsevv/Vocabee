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
          {learningLevel === 0 ? (
            <button
              className={styles.addToLearningButton}
              type="button"
              aria-label={`Добавить «${word}» в обучение`}
              data-translation-trigger=""
              onPointerEnter={onRevealTranslation}
              onClick={onAddToLearning}
            ><span aria-hidden="true">+</span></button>
          ) : learningLevel === 9 ? (
            <span
              className={styles.learnedMark}
              aria-label="Слово выучено"
              data-translation-trigger=""
              onPointerEnter={onRevealTranslation}
            >✓</span>
          ) : (
            <div
              className={styles.progressCircle}
              role="progressbar"
              aria-label={`Уровень знания слова «${word}»: ${learningLevel} из 9`}
              data-translation-trigger=""
              aria-valuemin={0}
              aria-valuemax={9}
              aria-valuenow={learningLevel}
              style={{ '--progress-angle': `${learningLevel / 9 * 360}deg` }}
              onPointerEnter={onRevealTranslation}
            ><span>{learningLevel}/9</span></div>
          )}
        </div>
      </div>
    </div>
  );
}
