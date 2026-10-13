import { useEffect, useState } from 'react';
import styles from './LearningSessionModal.module.css';
import entryHeaderStyles from './DictionaryEntryHeader.module.css';

export function LearningSessionModal({
  entries,
  catalogView,
  initialIndex = 0,
  getLearningLevel,
  onSetLearningLevel,
  onDeleteEntry,
  onClose
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [translationVisible, setTranslationVisible] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
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
  function rateAndContinue(nextLevel) {
    onSetLearningLevel(entry, nextLevel);
    setTranslationVisible(false);
    if (currentIndex < entries.length - 1) setCurrentIndex(currentIndex + 1);
    else onClose();
  }

  async function deleteCurrentEntry() {
    if (!window.confirm(`Удалить «${entry.word}» из словаря?`)) return;

    setDeleting(true);
    setDeleteError('');
    try {
      const removed = await onDeleteEntry(entry);
      if (!removed) return;
      setTranslationVisible(false);
      if (entries.length <= 1) onClose();
      else setCurrentIndex((index) => Math.min(index, entries.length - 2));
    } catch (error) {
      setDeleteError(error.message || 'Не удалось удалить слово из словаря.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={catalogView === 'phrases' ? 'Изучение фраз' : 'Изучение слов'}
      >
        <header className={styles.header}>
          <div className={styles.headerActions}>
            <button
              className={styles.learnedButton}
              type="button"
              onClick={() => rateAndContinue(9)}
              disabled={learningLevel === 9}
            >{learningLevel === 9 ? '✓ Изучено' : '✓  Изученное'}</button>
            <button
              className={styles.deleteButton}
              type="button"
              onClick={deleteCurrentEntry}
              disabled={deleting}
              aria-label={`Удалить ${entry.word} из словаря`}
            >{deleting ? 'Удаление…' : 'Удалить'}</button>
            <div className={styles.headerLearningLevel}>
              {learningLevel === 9 ? (
                <span className={entryHeaderStyles.learnedMark} aria-label="Слово изучено">✓</span>
              ) : (
                <span
                  className={entryHeaderStyles.progressCircle}
                  role="progressbar"
                  aria-label={`Уровень знания: ${learningLevel}`}
                  aria-valuemin={0}
                  aria-valuemax={9}
                  aria-valuenow={learningLevel}
                  style={{ '--progress-angle': `${learningLevel / 9 * 360}deg` }}
                >
                  <span>{learningLevel}</span>
                </span>
              )}
            </div>
            <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Закрыть изучение">×</button>
          </div>
        </header>

        <div className={styles.card}>
          <div
            className={styles.cardContent}
            role="group"
            tabIndex={0}
            aria-label="Нажмите на карточку, чтобы показать перевод"
            aria-expanded={translationVisible}
            onClick={() => setTranslationVisible(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setTranslationVisible(true);
              }
            }}
          >
            <section className={styles.englishBlock} aria-label="Английский текст">
              <h3>{entry.word}</h3>
              {forms && <p className={styles.forms}>{forms}</p>}
              {example && <p className={styles.example}>{example.phrase || example.example}</p>}
            </section>
            <section className={styles.translationBlock} aria-label="Перевод">
              {translationVisible ? (
                <>
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
                </>
              ) : (
                <p className={styles.translationHint}></p>
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
        {deleteError && <p className={styles.deleteError} role="alert">{deleteError}</p>}
      </section>
    </div>
  );
}
