import clsx from 'clsx';
import { useId, useState } from 'react';
import { DictionaryEntryHeader } from './DictionaryEntryHeader.jsx';
import styles from './DictionaryWordCard.module.css';
import { useInterfaceText } from '../../i18n/interfaceLanguage.jsx';

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
  const t = useInterfaceText();
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
        aria-label={`${t('Показать перевод карточки: ')}${word}`}
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
