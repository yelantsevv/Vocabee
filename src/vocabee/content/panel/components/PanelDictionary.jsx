import clsx from 'clsx';
import styles from './PanelDictionary.module.css';
import { DictionaryWordCard } from './DictionaryWordCard.jsx';
import { WebsiteLink } from './WebsiteLink.jsx';

export function PanelDictionary({ words, status, fill, homepageUrl, onSpeakWord, onLearningLevelChange, learningProgressLoaded, onDeleteWord }) {
  return (
    <section className={clsx(styles.dictionaryRoot, { [styles.fill]: fill })}>
      <WebsiteLink href={homepageUrl} />
      <div className={styles.dictionary}>
        <p className={styles.status} role="status" aria-live="polite">{status}</p>
        <ul className={styles.list}>
          {words.map((word) => (
            <DictionaryWordCard
              key={word.id}
              word={word.sourceText}
              translation={word.translatedText}
              translationVisible
              learningLevel={word.learning_level || 0}
              learningProgressLoaded={learningProgressLoaded}
              onLearningLevelChange={(level) => onLearningLevelChange(word, level)}
              onDeleteEntry={() => onDeleteWord?.(word)}
              onSpeakWord={() => onSpeakWord?.(word.sourceText, word.sourceLang)}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
