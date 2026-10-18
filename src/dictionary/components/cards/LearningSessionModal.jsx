import { useEffect, useRef, useState } from 'react';
import styles from './LearningSessionModal.module.css';
import { formatVerbForms } from '../../utils/dictionaryUtils.js';

export function LearningSessionModal({
  entries,
  catalogView,
  speechVoiceURIs = {},
  initialIndex = 0,
  getLearningLevel,
  onSetLearningLevel,
  onClose
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [translationVisible, setTranslationVisible] = useState(false);
  const [translationClickArmed, setTranslationClickArmed] = useState(false);
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

  const forms = formatVerbForms(entry);
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
    const scrollContainer = event.target.closest(`.${styles.cardContent}`);
    touchStartRef.current = touch
      ? { x: touch.clientX, y: touch.clientY, scrollContainer }
      : null;
  }

  function handleTouchEnd(event) {
    if (!touchStartRef.current) return;
    const touchStart = touchStartRef.current;
    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    touchStartRef.current = null;
    const swipeThreshold = 20;
    const swipeLength = Math.hypot(deltaX, deltaY);
    if (swipeLength < swipeThreshold) return;

    const angleFromVertical = Math.atan2(Math.abs(deltaX), Math.abs(deltaY)) * (180 / Math.PI);
    if (angleFromVertical <= 45 && touchStart.scrollContainer) {
      const { scrollContainer } = touchStart;
      const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const canScroll = deltaY < 0
        ? scrollContainer.scrollTop < maxScrollTop - 1
        : scrollContainer.scrollTop > 1;
      if (maxScrollTop > 1 && canScroll) return;
    }

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
  }

  function playWithGoogleVoice() {
    const parameters = new URLSearchParams({
      client: 'gtx',
      ie: 'UTF-8',
      tl: entryLanguage === 'de' ? 'de' : 'en',
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

  function toggleSpeechAudio() {
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
    utterance.lang = entryLanguage === 'de' ? 'de-DE' : 'en-US';
    const voices = speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.voiceURI === speechVoiceURIs[entryLanguage]
      && new RegExp(`^${entryLanguage}(?:-|$)`, 'i').test(voice.lang))
      || voices.find((voice) => new RegExp(`^${entryLanguage}(?:-|$)`, 'i').test(voice.lang))
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
            <button className={styles.closeButton} type="button" onClick={onClose} aria-label='Закрыть изучение'>
              <span className={styles.closeSymbol} aria-hidden="true">×</span>
              <span className={styles.closeLabel}>Закрыть</span>
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
            {['en', 'de'].includes(entryLanguage) ? (
              <section
                className={styles.englishBlock}
                role="button"
                tabIndex={0}
                onClick={toggleSpeechAudio}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleSpeechAudio();
                  }
                }}
                aria-label={audioPlaying ? 'Остановить озвучивание текста' : `Озвучить: ${spokenText}`}
                aria-pressed={audioPlaying}
                title='Нажмите, чтобы озвучить текст'
              >
                <h3>{entry.word}</h3>
                {forms && <p className={styles.forms}>{forms}</p>}
                {example && <p className={styles.example}>{example.phrase || example.example}</p>}
              </section>
            ) : (
              <section className={styles.englishBlock} aria-label='Текст на иностранном языке'>
                <h3>{entry.word}</h3>
                {forms && <p className={styles.forms}>{forms}</p>}
                {example && <p className={styles.example}>{example.phrase || example.example}</p>}
              </section>
            )}
            <section
              className={styles.translationBlock}
              role="button"
              tabIndex={0}
              aria-label={translationVisible ? 'Перевод показан' : 'Показать перевод и примеры'}
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
                <p className={styles.translationHint}>Показать перевод</p>
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
      </section>
    </div>
  );
}
