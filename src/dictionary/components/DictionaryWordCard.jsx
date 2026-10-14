import clsx from 'clsx';
import { useId } from 'react';
import { DictionaryEntryHeader } from './DictionaryEntryHeader.jsx';
import styles from './DictionaryWordCard.module.css';

export function DictionaryWordCard({
  className,
  word,
  translation,
  learningLevel,
  forms,
  translationVisible = false,
  onAddToLearning,
  onSpeakWord,
  children
}) {
  const revealToggleId = useId();

  return (
    <li className={clsx(styles.card, className)}>
      <input
        className={styles.revealToggle}
        id={revealToggleId}
        type="checkbox"
        aria-label={`Показать перевод карточки «${word}»`}
      />
      <label
        className={styles.revealClickSurface}
        htmlFor={revealToggleId}
        aria-hidden="true"
      />
      <div className={styles.cardContent}>
        <DictionaryEntryHeader
          word={word}
          translation={translation}
          learningLevel={learningLevel}
          forms={forms}
          translationVisible={translationVisible}
          onAddToLearning={onAddToLearning}
          onSpeakWord={onSpeakWord}
        />
        {children}
      </div>
    </li>
  );
}
