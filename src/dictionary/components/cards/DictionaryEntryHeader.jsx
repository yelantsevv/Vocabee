import styles from './DictionaryEntryHeader.module.css';
import { useInterfaceText } from '../../i18n/interfaceLanguage.jsx';

export function DictionaryEntryHeader({
  word,
  translation,
  learningLevel,
  forms,
  translationVisible = false,
  onAddToLearning,
  onSpeakWord
}) {
  const t = useInterfaceText();
  return (
    <div className={styles.entryHeader}>
      <div className={styles.entryMain}>
        <div className={styles.entryWordBlock}>
          {onSpeakWord ? (
            <h2>
              <button
                className={styles.speakWordButton}
                type="button"
                aria-label={`${t('Озвучить: ')}${word}`}
                title={t('Озвучить слово или фразу')}
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
          {learningLevel < 9 && onAddToLearning ? (
            <button
              className={learningLevel === 0 ? styles.addToLearningButton : styles.progressCircle}
              type="button"
              aria-label={`${t('Повысить уровень знания: ')}${word}: ${learningLevel}`}
              data-translation-trigger=""
              title={`${t('Повысить уровень знания: ')}${learningLevel}`}
              style={learningLevel > 0 ? { '--progress-angle': `${learningLevel / 9 * 360}deg` } : undefined}
              onClick={onAddToLearning}
            >
              {learningLevel === 0
                ? <span aria-hidden="true">+</span>
                : <span>{learningLevel}</span>}
            </button>
          ) : learningLevel === 9 ? (
            <span
              className={styles.learnedMark}
              aria-label={t('Слово выучено')}
              data-translation-trigger=""
            >✓</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
