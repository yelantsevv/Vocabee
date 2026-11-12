import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './DictionaryCatalogPanel.module.css';
import commonStyles from '../../styles/DictionaryPage.module.css';
import { getEntryLearningLevel, MAX_LEARNING_LEVEL } from '../../utils/dictionaryUtils.js';
import { getCatalogEntryKey, shuffleEntries } from '../../utils/catalogEntries.js';
import { LearningSessionModal } from '../cards/LearningSessionModal.jsx';
import { enterMobileFullscreen } from '../../utils/mobileFullscreen.js';
import { FilteredProgressBar } from './FilteredProgressBar.jsx';
import { DictionaryEntriesList } from './DictionaryEntriesList.jsx';
import { CatalogFilterPanel } from './CatalogFilterPanel.jsx';
import { ExtensionInstallGuide } from './ExtensionInstallGuide.jsx';

function getNextCardSet(entries, currentEntries, visibleCount) {
  const shuffledEntries = shuffleEntries(entries);
  if (shuffledEntries.length < 2) return shuffledEntries;

  const pageSize = Math.min(visibleCount, shuffledEntries.length);
  const currentPage = currentEntries.slice(0, pageSize).map(getCatalogEntryKey);
  const hasSamePage = (candidate) => {
    const candidatePage = candidate.slice(0, pageSize).map(getCatalogEntryKey);
    if (entries.length > pageSize) {
      const currentKeys = new Set(currentPage);
      return candidatePage.length === currentKeys.size
        && candidatePage.every((key) => currentKeys.has(key));
    }
    return candidatePage.every((key, index) => key === currentPage[index]);
  };

  if (!hasSamePage(shuffledEntries)) return shuffledEntries;

  for (let offset = 1; offset < shuffledEntries.length; offset += 1) {
    const rotatedEntries = [
      ...shuffledEntries.slice(offset),
      ...shuffledEntries.slice(0, offset)
    ];
    if (!hasSamePage(rotatedEntries)) return rotatedEntries;
  }

  return shuffledEntries;
}

export function DictionaryCatalogPanel({
  catalog,
  settingsOpen = false,
  onAddToLearning,
  onOpenSettings,
  cardsPerLoad,
  hideTranslationsUntilHover = true,
  examplesPerCard,
  showWordRelations,
  reviewMode = false,
  onToggleReviewMode = () => {},
  onToggleTranslationVisibility = () => {},
  speechVoiceURIs
}) {
  const [learningSessionEntries, setLearningSessionEntries] = useState(null);
  const [showStickyProgress, setShowStickyProgress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reverseDirection, setReverseDirection] = useState(false);
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filtersRef = useRef(null);
  const pullStartRef = useRef(null);
  const {
    selectedSourceLanguage,
    catalogView,
    availableSources,
    catalogLoading,
    catalogError,
    sourceCategories,
    filteredDictionaryProgress,
    learningLevelOverrides,
    sourceEntriesByFilters,
    filteredSourceEntries: catalogFilteredEntries,
    setEntryLearningLevel
  } = catalog;
  const visibleByReviewMode = useMemo(() => {
    const isHiddenEntry = (entry) => {
      const source = entry._learningSource || entry._catalogId || entry._catalogLanguage || selectedSourceLanguage;
      const key = `${source}:${String(entry.word || '').toLocaleLowerCase()}`;
      return catalog.hiddenEntryKeys?.has(key);
    };
    return (entry) => {
      if (!reviewMode) return !isHiddenEntry(entry);
      const source = entry._learningSource || entry._catalogId || entry._catalogLanguage || selectedSourceLanguage;
      return isHiddenEntry(entry)
        && getEntryLearningLevel(entry, source, learningLevelOverrides) === MAX_LEARNING_LEVEL;
    };
  }, [reviewMode, catalog.hiddenEntryKeys, selectedSourceLanguage, learningLevelOverrides]);
  const filteredSourceEntries = useMemo(() => (reviewMode ? sourceEntriesByFilters : catalogFilteredEntries || [])
    .filter(visibleByReviewMode), [catalogFilteredEntries, sourceEntriesByFilters, reviewMode, visibleByReviewMode]);
  const visibleStudySessionEntries = useMemo(() => (reviewMode ? sourceEntriesByFilters : catalog.studySessionEntries || [])
    .filter(visibleByReviewMode), [reviewMode, sourceEntriesByFilters, catalog.studySessionEntries, visibleByReviewMode]);
  const [shuffledEntries, setShuffledEntries] = useState(() => shuffleEntries(filteredSourceEntries));
  const filteredEntryKeys = filteredSourceEntries.map(getCatalogEntryKey);
  const filteredEntrySignature = JSON.stringify([...filteredEntryKeys].sort());
  const searchedSourceEntries = filteredSourceEntries.filter((entry) => {
    const query = normalizedSearchQuery;
    if (!query) return true;
    return [entry.word, ...(entry.definitions || [])]
      .some((value) => String(value || '').toLocaleLowerCase().includes(query));
  });
  const [displayedCardCount, setDisplayedCardCount] = useState(cardsPerLoad);
  const numberFormat = new Intl.NumberFormat('ru-RU');
  const loadedLanguages = availableSources.filter(({ id }) => ['en', 'de'].includes(id));
  const hasMyDictionary = availableSources.some(({ id }) => id === 'my-vocabee');
  const hasViewableSource = selectedSourceLanguage === 'my-vocabee'
    ? hasMyDictionary
    : availableSources.some(({ id }) => id === selectedSourceLanguage);
  const isPageAtTop = () => Math.max(
    window.scrollY,
    document.documentElement.scrollTop,
    document.body.scrollTop
  ) <= 0;

  function handlePullStart(event) {
    pullStartRef.current = null;
    if (learningSessionEntries || !isPageAtTop()) return;

    const touch = event.touches[0];
    if (!touch) return;
    pullStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handlePullEnd(event) {
    const start = pullStartRef.current;
    pullStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaY = touch.clientY - start.y;
    const deltaX = touch.clientX - start.x;
    if (deltaY < 36 || Math.abs(deltaX) > Math.max(36, deltaY * 0.8)) return;

    setShuffledEntries((current) => getNextCardSet(filteredSourceEntries, current, cardsPerLoad));
    setDisplayedCardCount(cardsPerLoad);
  }

  function handlePullCancel() {
    pullStartRef.current = null;
  }

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
  }, []);

  function speakText(text, language) {
    const spokenText = String(text || '').trim();
    if (!spokenText) return;

    const speechSynthesis = window.speechSynthesis;
    if (!speechSynthesis || !window.SpeechSynthesisUtterance) return;
    speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(spokenText);
    utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
    const voices = speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.voiceURI === speechVoiceURIs?.[language]
      && new RegExp(`^${language}(?:-|$)`, 'i').test(voice.lang))
      || voices.find((voice) => new RegExp(`^${language}(?:-|$)`, 'i').test(voice.lang))
      || null;
    speechSynthesis.speak(utterance);
  }

  function speakEntry(entry) {
    const language = entry._catalogLanguage || entry.source_language || selectedSourceLanguage || 'en';
    speakText(entry?.word, language);
  }

  function speakExample(text, entry) {
    const language = entry._catalogLanguage || entry.source_language || selectedSourceLanguage || 'en';
    speakText(text, language);
  }

  useEffect(() => {
    let stickyVisible = false;
    const updateStickyProgress = () => {
      const filterPanel = filtersRef.current;
      if (!filterPanel) return;

      const nextStickyVisible = filterPanel.getBoundingClientRect().top < 0;
      if (nextStickyVisible === stickyVisible) return;
      stickyVisible = nextStickyVisible;
      setShowStickyProgress(nextStickyVisible);
    };

    updateStickyProgress();
    window.addEventListener('scroll', updateStickyProgress, { passive: true });
    window.addEventListener('resize', updateStickyProgress);
    return () => {
      window.removeEventListener('scroll', updateStickyProgress);
      window.removeEventListener('resize', updateStickyProgress);
    };
  }, []);

  useEffect(() => {
    setShuffledEntries((current) => {
      const currentKeys = new Set(filteredEntryKeys);
      const entriesByKey = new Map(filteredSourceEntries.map((entry) => [getCatalogEntryKey(entry), entry]));
      const retainedEntries = current
        .filter((entry) => currentKeys.has(getCatalogEntryKey(entry)))
        .map((entry) => entriesByKey.get(getCatalogEntryKey(entry)));
      const retainedKeys = new Set(retainedEntries.map(getCatalogEntryKey));
      const newEntries = filteredSourceEntries.filter((entry) => (
        !retainedKeys.has(getCatalogEntryKey(entry))
      ));
      return [...retainedEntries, ...shuffleEntries(newEntries)];
    });
  }, [filteredSourceEntries, filteredEntrySignature]);

  useEffect(() => {
    setDisplayedCardCount(cardsPerLoad);
  }, [cardsPerLoad, filteredEntrySignature]);

  return (
    <section
      className={clsx(commonStyles.content, styles.dictionaryContent)}
      aria-label="Каталог словарей"
      onTouchStart={handlePullStart}
      onTouchEnd={handlePullEnd}
      onTouchCancel={handlePullCancel}
    >
      <CatalogFilterPanel
        catalog={{ ...catalog, studySessionEntries: visibleStudySessionEntries }}
        filtersRef={filtersRef}
        progressValue={filteredDictionaryProgress}
        onOpenSettings={onOpenSettings}
        onStartLearning={(entries) => {
          enterMobileFullscreen();
          setLearningSessionEntries(shuffleEntries(entries));
        }}
        reviewMode={reviewMode}
        onToggleReviewMode={() => {
          setSearchQuery('');
          setDisplayedCardCount(cardsPerLoad);
          onToggleReviewMode();
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={(value) => {
          setSearchQuery(value);
          setDisplayedCardCount(cardsPerLoad);
        }}
        reverseDirection={reverseDirection}
        onToggleDirection={() => setReverseDirection((value) => !value)}
        hideTranslationsUntilHover={hideTranslationsUntilHover}
        onToggleTranslationVisibility={onToggleTranslationVisibility}
      />
      {(showStickyProgress || settingsOpen || learningSessionEntries) && (
        <FilteredProgressBar value={filteredDictionaryProgress} sticky />
      )}

      {catalogLoading ? (
        <p className={styles.emptyCatalog}>Проверяем базу словарей…</p>
      ) : catalogError ? (
        <div className={styles.emptyCatalog} role="status">
          <p>{catalogError}</p>
          <button type="button" onClick={onOpenSettings}>
            Открыть настройки
          </button>
        </div>
      ) : !hasViewableSource ? (
        <div className={styles.emptyCatalog}>
          {hasMyDictionary || loadedLanguages.length ? (
            <p>
              Выберите словарь кнопками выше.
            </p>
          ) : (
            <>
              <p>
                Словарь не загружен. В настройках загрузите EN → RU / DE → RU
                или установите расширение для YouTube.
              </p>
              <div className={styles.emptyCatalogActions}>
                <button type="button" onClick={onOpenSettings}>
                  Перейти в настройки и загрузить словарь
                </button>
              </div>
              <ExtensionInstallGuide />
            </>
          )}
        </div>
      ) : (
        <>
          <DictionaryEntriesList
            entries={normalizedSearchQuery ? searchedSourceEntries : shuffledEntries}
            hasMatches={searchedSourceEntries.length > 0}
            visibleCount={displayedCardCount}
            catalogView={catalogView}
            selectedSourceLanguage={selectedSourceLanguage}
            reverseDirection={reverseDirection}
            learningLevelOverrides={learningLevelOverrides}
            sourceCategories={sourceCategories}
            hideTranslationsUntilHover={hideTranslationsUntilHover}
            examplesPerCard={examplesPerCard}
            showWordRelations={showWordRelations}
            onAddToLearning={onAddToLearning}
            onDeleteMyVocabeeEntry={catalog.deleteMyVocabeeEntry}
            onSpeakWord={speakEntry}
            onSpeakExample={speakExample}
          />
          {displayedCardCount < (normalizedSearchQuery ? searchedSourceEntries.length : shuffledEntries.length) && (
            <button
              className={styles.loadMoreButton}
              type="button"
              onClick={() =>
                setDisplayedCardCount((count) => count + cardsPerLoad)
              }
            >
              {numberFormat.format(
                Math.min(displayedCardCount, normalizedSearchQuery ? searchedSourceEntries.length : shuffledEntries.length),
              )}{" "}
              из {numberFormat.format(normalizedSearchQuery ? searchedSourceEntries.length : shuffledEntries.length)}
            </button>
          )}
        </>
      )}
      {learningSessionEntries && (
        <LearningSessionModal
          entries={learningSessionEntries}
          catalogView={catalogView}
          examplesPerCard={examplesPerCard}
          reverseDirection={reverseDirection}
          onToggleDirection={() => setReverseDirection((value) => !value)}
          speechVoiceURIs={speechVoiceURIs}
          getLearningLevel={(entry) =>
            getEntryLearningLevel(
              entry,
              entry._learningSource ||
                entry._catalogId ||
                entry._catalogLanguage ||
                selectedSourceLanguage,
              learningLevelOverrides,
            )
          }
          onSetLearningLevel={setEntryLearningLevel}
          onHideEntry={catalog.hideEntry}
          onClose={() => {
            setLearningSessionEntries(null);
          }}
        />
      )}
    </section>
  );
}
