import { useEffect, useRef, useState } from 'react';
import styles from './LearningSessionModal.module.css';
import entryHeaderStyles from './DictionaryEntryHeader.module.css';
import { useInterfaceText } from '../interfaceLanguage.jsx';

export function LearningSessionModal({
  entries,
  catalogView,
  speechVoiceURI = '',
  initialIndex = 0,
  getLearningLevel,
  onSetLearningLevel,
  onDeleteEntry,
  onClose
}) {
  const t = useInterfaceText();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [translationVisible, setTranslationVisible] = useState(false);
  const [translationClickArmed, setTranslationClickArmed] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const touchStartRef = useRef(null);
  const entry = entries[currentIndex];
  const entryLanguage = entry?._catalogLanguage || entry?.source_language || 'en';
  const spokenText = String(entry?.word || entry?.examples?.[0]?.phrase || '').trim();
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

  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setAudioPlaying(false);
  }, [entry?.word]);

  useEffect(() => () => {
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
  }, []);

  if (!entry) return null;

  const verbTypes = ['verb', 'i-verb', 'm-verb', 'ph-verb', 'r-verb', 'phrasal_verb', 'phrasal-verb'];
  const forms = verbTypes.includes(entry.type) && entry.forms?.past_simple && entry.forms?.past_participle
    ? `${entry.word} · ${entry.forms.past_simple} · ${entry.forms.past_participle}`
    : null;
  function rateAndContinue(nextLevel) {
    onSetLearningLevel(entry, nextLevel);
    setTranslationVisible(false);
    setTranslationClickArmed(false);
    if (currentIndex < entries.length - 1) setCurrentIndex(currentIndex + 1);
    else onClose();
  }

  function showTranslationOrAdvance() {
    if (translationClickArmed) {
      if (entries.length < 2) return;
      const nextIndices = entries.map((_, index) => index).filter((index) => index !== currentIndex);
      const randomIndex = nextIndices[Math.floor(Math.random() * nextIndices.length)];
      setCurrentIndex(randomIndex);
      setTranslationVisible(false);
      setTranslationClickArmed(false);
      setDeleteError('');
      return;
    }

    setTranslationClickArmed(true);
    if (!translationVisible) setTranslationVisible(true);
  }

  function handleTouchStart(event) {
    if (event.target.closest('button')) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleTouchEnd(event) {
    if (!touchStartRef.current || deleting) return;
    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    const swipeThreshold = 20;
    const swipeLength = Math.hypot(deltaX, deltaY);
    if (swipeLength < swipeThreshold) return;

    const angleFromVertical = Math.atan2(Math.abs(deltaX), Math.abs(deltaY)) * (180 / Math.PI);
    if (angleFromVertical <= 18) {
      onClose();
      return;
    }

    if (entries.length < 2) return;
    const nextIndices = entries.map((_, index) => index).filter((index) => index !== currentIndex);
    const randomIndex = nextIndices[Math.floor(Math.random() * nextIndices.length)];
    setCurrentIndex(randomIndex);
    setTranslationVisible(false);
    setTranslationClickArmed(false);
    setDeleteError('');
  }

  function playWithGoogleVoice() {
    const parameters = new URLSearchParams({
      client: 'gtx',
      ie: 'UTF-8',
      tl: 'en',
      q: spokenText
    });
    const audio = new Audio(`https://translate.googleapis.com/translate_tts?${parameters}`);
    audio.preload = 'auto';
    audio.referrerPolicy = 'no-referrer';
    audio.onplay = () => setAudioPlaying(true);
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = () => setAudioPlaying(false);
    audioRef.current = audio;
    audio.play().catch(() => setAudioPlaying(false));
  }

  function toggleEnglishAudio() {
    if (audioPlaying) {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      audioRef.current = null;
      window.speechSynthesis?.cancel();
      setAudioPlaying(false);
      return;
    }

    const speechSynthesis = window.speechSynthesis;
    if (!spokenText || !speechSynthesis || !window.SpeechSynthesisUtterance) {
      playWithGoogleVoice();
      return;
    }

    speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(spokenText);
    utterance.lang = 'en-US';
    const voices = speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.voiceURI === speechVoiceURI)
      || voices.find((voice) => /^en(?:-|$)/i.test(voice.lang))
      || null;
    utterance.onend = () => setAudioPlaying(false);
    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') {
        setAudioPlaying(false);
      } else {
        playWithGoogleVoice();
      }
    };
    setAudioPlaying(true);
    try {
      speechSynthesis.speak(utterance);
    } catch {
      playWithGoogleVoice();
    }
  }

  async function deleteCurrentEntry() {
    setDeleting(true);
    setDeleteError('');
    try {
      const removed = await onDeleteEntry(entry);
      if (!removed) return;
      setTranslationVisible(false);
      if (entries.length <= 1) onClose();
      else setCurrentIndex((index) => Math.min(index, entries.length - 2));
    } catch (error) {
      setDeleteError(t(error.message || 'Не удалось удалить слово из словаря.'));
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
        aria-label={t(catalogView === 'phrases' ? 'Изучение фраз' : 'Изучение слов')}
      >
        <header className={styles.header}>
          <div className={styles.headerActions}>
            <button
              className={styles.learnedButton}
              type="button"
              onClick={() => rateAndContinue(9)}
              disabled={learningLevel === 9}
            >{t(learningLevel === 9 ? '✓ Изучено' : '✓  Изученное')}</button>
            <button
              className={`${styles.learnedButton} ${styles.deleteButton}`}
              type="button"
              onClick={deleteCurrentEntry}
              disabled={deleting}
              aria-label={`${t('Удалить')} ${entry.word}`}
            >{deleting ? t('Удаление…') : t(catalogView === 'phrases' ? 'Удалить фразу' : 'Удалить слово')}</button>
            <div className={styles.headerLearningLevel}>
              {learningLevel === 9 ? (
                <span className={entryHeaderStyles.learnedMark} aria-label={t('Слово выучено')}>✓</span>
              ) : (
                <span
                  className={entryHeaderStyles.progressCircle}
                  role="progressbar"
              aria-label={`${t('Уровень знания: ')}${learningLevel}`}
                  aria-valuemin={0}
                  aria-valuemax={9}
                  aria-valuenow={learningLevel}
                  style={{ '--progress-angle': `${learningLevel / 9 * 360}deg` }}
                >
                  <span>{learningLevel}</span>
                </span>
              )}
            </div>
            <button className={styles.closeButton} type="button" onClick={onClose} aria-label={t('Закрыть изучение')}>
              <span className={styles.closeSymbol} aria-hidden="true">×</span>
              <span className={styles.closeLabel}>{t('Закрыть')}</span>
            </button>
          </div>
        </header>

        <div
          className={styles.card}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => { touchStartRef.current = null; }}
        >
          <div className={styles.cardContent}>
            {entryLanguage === 'en' ? (
              <section
                className={styles.englishBlock}
                role="button"
                tabIndex={0}
                onClick={toggleEnglishAudio}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleEnglishAudio();
                  }
                }}
                aria-label={audioPlaying ? t('Остановить озвучивание английского текста') : `${t('Озвучить: ')}${spokenText}`}
                aria-pressed={audioPlaying}
                title={t('Нажмите, чтобы озвучить английский текст')}
              >
                <h3>{entry.word}</h3>
                {forms && <p className={styles.forms}>{forms}</p>}
                {example && <p className={styles.example}>{example.phrase || example.example}</p>}
              </section>
            ) : (
              <section className={styles.englishBlock} aria-label={t('Текст на иностранном языке')}>
                <h3>{entry.word}</h3>
                {forms && <p className={styles.forms}>{forms}</p>}
                {example && <p className={styles.example}>{example.phrase || example.example}</p>}
              </section>
            )}
            <section
              className={styles.translationBlock}
              role="button"
              tabIndex={0}
              aria-label={t(translationVisible ? 'Перевод показан' : 'Показать перевод и примеры')}
              aria-expanded={translationVisible}
              onClick={showTranslationOrAdvance}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  showTranslationOrAdvance();
                }
              }}
            >
              {translationVisible ? (
                <>
                  <p className={styles.translation}>{entry.definitions?.join(' · ') || t('Перевод не указан')}</p>
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
                <p className={styles.translationHint}>{t('Показать перевод')}</p>
              )}
            </section>
          </div>

          <div className={styles.cardActions}>
            <div className={styles.knowledgeActions}>
              <button className={styles.dontKnowButton} type="button" onClick={() => rateAndContinue(learningLevel - 1)}>
                {t('Не знаю')}
              </button>
              <button className={styles.knowButton} type="button" onClick={() => rateAndContinue(learningLevel + 1)}>
                {t('Знаю')}
              </button>
            </div>
          </div>
        </div>
        {deleteError && <p className={styles.deleteError} role="alert">{deleteError}</p>}
      </section>
    </div>
  );
}
