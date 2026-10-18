import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './DictionaryCatalogPanel.module.css';
import commonStyles from '../../styles/DictionaryPage.module.css';
import { getEntryLearningLevel } from '../../utils/dictionaryUtils.js';
import { getCatalogEntryKey, shuffleEntries } from '../../utils/catalogEntries.js';
import { openBrowserExtensionSettings } from '../../data/storage.js';
import { LearningSessionModal } from '../cards/LearningSessionModal.jsx';
import { enterMobileFullscreen } from '../../utils/mobileFullscreen.js';
import { FilteredProgressBar } from './FilteredProgressBar.jsx';
import { DictionaryEntriesList } from './DictionaryEntriesList.jsx';
import { CatalogFilterPanel } from './CatalogFilterPanel.jsx';

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
  hideTranslationsUntilHover,
  examplesPerCard,
  showWordRelations,
  speechVoiceURIs
}) {
  const [extensionSettingsError, setExtensionSettingsError] = useState('');
  const [learningSessionEntries, setLearningSessionEntries] = useState(null);
  const [showStickyProgress, setShowStickyProgress] = useState(false);
  const filtersRef = useRef(null);
  const pullStartRef = useRef(null);
  const {
    selectedSourceLanguage,
    catalogView,
    availableSources,
    catalogLoading,
    catalogError,
    sourceCategories,
    sourceConnections,
    filteredDictionaryProgress,
    learningLevelOverrides,
    filteredSourceEntries,
    setEntryLearningLevel
  } = catalog;
  const [shuffledEntries, setShuffledEntries] = useState(() => shuffleEntries(filteredSourceEntries));
  const filteredEntryKeys = filteredSourceEntries.map(getCatalogEntryKey);
  const filteredEntrySignature = JSON.stringify([...filteredEntryKeys].sort());
  const [displayedCardCount, setDisplayedCardCount] = useState(cardsPerLoad);
  const numberFormat = new Intl.NumberFormat('ru-RU');
  const loadedLanguages = availableSources.filter(({ id }) => ['en', 'de'].includes(id));
  const hasMyDictionary = availableSources.some(({ id }) => id === 'my-vocabee');
  const activeLanguage = loadedLanguages.find(({ id }) => id === selectedSourceLanguage)
    || loadedLanguages[0];
  const hasViewableSource = (sourceConnections.my && hasMyDictionary)
    || (sourceConnections.language && Boolean(activeLanguage));
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

  function speakEntry(entry) {
    const text = String(entry?.word || '').trim();
    if (!text) return;

    const speechSynthesis = window.speechSynthesis;
    if (!speechSynthesis || !window.SpeechSynthesisUtterance) return;
    speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    const language = entry._catalogLanguage || entry.source_language || selectedSourceLanguage || 'en';
    utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
    const voices = speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.voiceURI === speechVoiceURIs?.[language]
      && new RegExp(`^${language}(?:-|$)`, 'i').test(voice.lang))
      || voices.find((voice) => new RegExp(`^${language}(?:-|$)`, 'i').test(voice.lang))
      || null;
    speechSynthesis.speak(utterance);
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

  async function openExtensionSettings() {
    setExtensionSettingsError('');
    try {
      await openBrowserExtensionSettings();
    } catch (error) {
      setExtensionSettingsError(error.message || 'Не удалось открыть настройки расширений.');
    }
  }

  return (
    <section
      className={clsx(commonStyles.content, styles.dictionaryContent)}
      aria-label='Каталог словарей'
      onTouchStart={handlePullStart}
      onTouchEnd={handlePullEnd}
      onTouchCancel={handlePullCancel}
    >
      <CatalogFilterPanel
        catalog={catalog}
        filtersRef={filtersRef}
        progressValue={filteredDictionaryProgress}
        onOpenSettings={onOpenSettings}
        onStartLearning={(entries) => {
          enterMobileFullscreen();
          setLearningSessionEntries(shuffleEntries(entries));
        }}
      />
      {(showStickyProgress || settingsOpen || learningSessionEntries) && (
        <FilteredProgressBar value={filteredDictionaryProgress} sticky />
      )}

      {catalogLoading ? (
        <p className={styles.emptyCatalog}>Проверяем базу словарей…</p>
      ) : catalogError ? (
        <div className={styles.emptyCatalog} role="status">
          <p>{catalogError}</p>
          <button type="button" onClick={onOpenSettings}>Открыть настройки</button>
        </div>
      ) : !hasViewableSource ? (
        <div className={styles.emptyCatalog}>
          {hasMyDictionary || loadedLanguages.length ? (
            <p>Оба источника отключены. Включите нужный словарь кнопками выше.</p>
          ) : (
            <>
              <p>База словарей пока не загружена. Установите расширение для «Моего словаря» или загрузите EN → RU / DE → RU.</p>
              <div className={styles.emptyCatalogActions}>
                <button type="button" onClick={openExtensionSettings}>Установить расширение</button>
                <button type="button" onClick={onOpenSettings}>Перейти в настройки и загрузить базу</button>
              </div>
              {extensionSettingsError && <p role="alert">{extensionSettingsError}</p>}
            </>
          )}
        </div>
      ) : <>
      <DictionaryEntriesList
        entries={shuffledEntries}
        hasMatches={filteredSourceEntries.length > 0}
        visibleCount={displayedCardCount}
        catalogView={catalogView}
        selectedSourceLanguage={selectedSourceLanguage}
        learningLevelOverrides={learningLevelOverrides}
        sourceCategories={sourceCategories}
        hideTranslationsUntilHover={hideTranslationsUntilHover}
        examplesPerCard={examplesPerCard}
        showWordRelations={showWordRelations}
        onAddToLearning={onAddToLearning}
        onSpeakWord={speakEntry}
      />
      {displayedCardCount < shuffledEntries.length && (
        <button
          className={styles.loadMoreButton}
          type="button"
          onClick={() => setDisplayedCardCount((count) => count + cardsPerLoad)}
        >
           {numberFormat.format(Math.min(displayedCardCount, shuffledEntries.length))} из {numberFormat.format(shuffledEntries.length)}
        </button>
      )}
      </>}
      {learningSessionEntries && (
        <LearningSessionModal
          entries={learningSessionEntries}
          catalogView={catalogView}
          examplesPerCard={examplesPerCard}
          speechVoiceURIs={speechVoiceURIs}
          getLearningLevel={(entry) => getEntryLearningLevel(
            entry,
            entry._learningSource || entry._catalogId || entry._catalogLanguage || selectedSourceLanguage,
            learningLevelOverrides
          )}
          onSetLearningLevel={setEntryLearningLevel}
          onClose={() => {
            setLearningSessionEntries(null);
          }}
        />
      )}
    </section>
  );
}
