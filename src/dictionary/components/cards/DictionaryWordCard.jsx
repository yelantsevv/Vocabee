import clsx from 'clsx';
import { useId, useState } from 'react';
import { DictionaryEntryHeader } from './DictionaryEntryHeader.jsx';
import { MAX_LEARNING_LEVEL } from '../../utils/dictionaryUtils.js';
import styles from './DictionaryWordCard.module.css';

export function DictionaryWordCard({
  className,
  word,
  translation,
  learningLevel,
  forms,
  translationVisible = false,
  onAddToLearning,
  onDeleteEntry,
  onSpeakWord,
  children
}) {
  const revealToggleId = useId();
  const [revealed, setRevealed] = useState(false);

  return (
    <li className={clsx(styles.card, revealed && styles.revealed, className)}>
      <input
        className={styles.revealToggle}
        id={revealToggleId}
        type="checkbox"
        checked={revealed}
        onChange={(event) => setRevealed(event.target.checked)}
        aria-label={`Показать перевод карточки: ${word}`}
      />
      <label
        className={styles.revealClickSurface}
        htmlFor={revealToggleId}
        aria-hidden="true"
        onClick={(event) => {
          event.preventDefault();
          setRevealed((current) => !current);
        }}
      />
      <div className={styles.cardContent}>
        <DictionaryEntryHeader
          word={word}
          translation={translation}
          forms={forms}
          translationVisible={translationVisible}
          onSpeakWord={onSpeakWord}
        />
        {children}
      </div>
      {(onAddToLearning || learningLevel === MAX_LEARNING_LEVEL || onDeleteEntry) && (
        <div className={styles.cardActions}>
          {learningLevel < MAX_LEARNING_LEVEL && onAddToLearning ? (
            <button
              className={learningLevel === 0 ? styles.addToLearningButton : styles.progressCircle}
              type="button"
              aria-label={`Повысить уровень знания: ${word}: ${learningLevel}`}
              title={`Повысить уровень знания: ${learningLevel}`}
              style={learningLevel > 0 ? { '--progress-angle': `${learningLevel / MAX_LEARNING_LEVEL * 360}deg` } : undefined}
              onClick={onAddToLearning}
            >
              {learningLevel === 0 ? <span aria-hidden="true">+</span> : <span>{learningLevel}</span>}
            </button>
          ) : learningLevel === MAX_LEARNING_LEVEL ? (
            <span className={styles.learnedMark} aria-label="Слово выучено">✓</span>
          ) : null}
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
      )}
    </li>
  );
}
