import clsx from 'clsx';
import { DictionaryEntryHeader } from './DictionaryEntryHeader.jsx';
import styles from './DictionaryWordCard.module.css';

export function DictionaryWordCard({
  className,
  word,
  translation,
  learningLevel,
  onLearningLevelChange,
  learningProgressLoaded,
  onDeleteEntry,
  forms,
  translationVisible = false,
  onRevealTranslation,
  onHideTranslation,
  onSpeakWord,
  children
}) {
  return (
    <li className={clsx(styles.card, className)}>
      <DictionaryEntryHeader
        word={word}
        translation={translation}
        learningLevel={learningLevel}
        onLearningLevelChange={onLearningLevelChange}
        onDeleteEntry={onDeleteEntry}
        learningProgressLoaded={learningProgressLoaded}
        forms={forms}
        translationVisible={translationVisible}
        onRevealTranslation={onRevealTranslation}
        onHideTranslation={onHideTranslation}
        onSpeakWord={onSpeakWord}
      />
      {children}
    </li>
  );
}
