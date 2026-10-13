import { useEffect, useState } from 'react';
import styles from './LearningSessionModal.module.css';
import entryHeaderStyles from './DictionaryEntryHeader.module.css';

export function LearningSessionModal({
  entries,
  catalogView,
  initialIndex = 0,
  getLearningLevel,
  onSetLearningLevel,
  onClose
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const entry = entries[currentIndex];
  const learningLevel = entry ? getLearningLevel(entry) : 0;
  const example = entry?.examples?.[0];
  const translationExamples = entry?.examples?.slice(0, 3) || [];

  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    const currentPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousBodyOverflow;
      root.style.overflow = previousRootOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entries.length, onClose]);

  if (!entry) return null;

  const verbTypes = ['verb', 'i-verb', 'm-verb', 'ph-verb', 'r-verb', 'phrasal_verb', 'phrasal-verb'];
  const forms = verbTypes.includes(entry.type) && entry.forms?.past_simple && entry.forms?.past_participle
    ? `${entry.word} · ${entry.forms.past_simple} · ${entry.forms.past_participle}`
    : null;
  const itemKind = catalogView === 'phrases' ? 'Phrases' : 'Words';
  const formattedEntryCount = new Intl.NumberFormat('en-US').format(entries.length - currentIndex);

  function rateAndContinue(nextLevel) {
    onSetLearningLevel(entry, nextLevel);
    if (currentIndex < entries.length - 1) setCurrentIndex(currentIndex + 1);
    else onClose();
  }

  return (
    <div className={styles.backdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="learning-session-title">
        <header className={styles.header}>
          <div>
            <h2 id="learning-session-title" className={styles.sessionTitle}>
              <span>Learning</span>
              <span>{formattedEntryCount} {itemKind}</span>
            </h2>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.headerLearningLevel}>
              {learningLevel === 9 ? (
                <span className={entryHeaderStyles.learnedMark} aria-label="Слово изучено">✓</span>
              ) : (
                <span
                  className={entryHeaderStyles.progressCircle}
                  role="progressbar"
                  aria-label={`Уровень знания: ${learningLevel} из 9`}
                  aria-valuemin={0}
                  aria-valuemax={9}
                  aria-valuenow={learningLevel}
                  style={{ '--progress-angle': `${learningLevel / 9 * 360}deg` }}
                >
                  <span>{learningLevel}/9</span>
                </span>
              )}
            </div>
            <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Закрыть изучение">×</button>
          </div>
        </header>

        <div className={styles.card}>
          <div className={styles.cardContent}>
            <section className={styles.englishBlock} aria-label="Английский текст">
              <h3>{entry.word}</h3>
              {forms && <p className={styles.forms}>{forms}</p>}
              {example && <p className={styles.example}>{example.phrase || example.example}</p>}
            </section>
            <section className={styles.translationBlock} aria-label="Перевод">
              <p className={styles.translation}>{entry.definitions?.join(' · ') || 'Перевод не указан'}</p>
              {translationExamples.length > 0 && (
                <ul className={styles.translationExampleList}>
                  {translationExamples.map((item, index) => (
                    <li key={`${item.phrase}-${index}`}>
                      <span>{item.phrase}</span>
                      {item.translation && <span className={styles.exampleTranslation}>{item.translation}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className={styles.cardActions}>
            <div className={styles.knowledgeActions}>
              <button className={styles.dontKnowButton} type="button" onClick={() => rateAndContinue(learningLevel - 1)}>
                Не знаю
              </button>
              <button className={styles.knowButton} type="button" onClick={() => rateAndContinue(learningLevel + 1)}>
                Знаю
              </button>
            </div>
          </div>
        </div>
        <footer className={styles.footer}>
          <button
            className={styles.learnedButton}
            type="button"
            onClick={() => rateAndContinue(9)}
            disabled={learningLevel === 9}
          >{learningLevel === 9 ? '✓ Слово изучено' : '✓ Отметить как изученное'}</button>
        </footer>
      </section>
    </div>
  );
}
