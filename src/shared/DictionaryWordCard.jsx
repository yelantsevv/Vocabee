import clsx from 'clsx';
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
  onRevealTranslation,
  onHideTranslation,
  children
}) {
  return (
    <li className={clsx(styles.card, className)}>
      <DictionaryEntryHeader
        word={word}
        translation={translation}
        learningLevel={learningLevel}
        forms={forms}
        translationVisible={translationVisible}
        onAddToLearning={onAddToLearning}
        onRevealTranslation={onRevealTranslation}
        onHideTranslation={onHideTranslation}
      />
      {children}
    </li>
  );
}
