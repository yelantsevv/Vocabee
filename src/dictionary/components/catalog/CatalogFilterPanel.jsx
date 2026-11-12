import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './DictionaryCatalogPanel.module.css';
import phraseCategories from '../../data/phrase-categories.json';
import { FilterButtonIcon } from './FilterButtonIcon.jsx';
import { FilteredProgressBar } from './FilteredProgressBar.jsx';
import { toggleArrayValue } from '../../utils/catalogEntries.js';

export function CatalogFilterPanel({
  catalog,
  filtersRef,
  progressValue,
  onOpenSettings,
  onStartLearning,
  reviewMode = false,
  onToggleReviewMode = () => {},
  searchQuery = '',
  onSearchQueryChange = () => {},
  reverseDirection = false,
  onToggleDirection = () => {},
  hideTranslationsUntilHover = true,
  onToggleTranslationVisibility = () => {}
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRowRef = useRef(null);
  const searchInputRef = useRef(null);
  const mobileSearchButtonRef = useRef(null);
  const {
    selectedSourceLanguage,
    catalogView,
    setCatalogView,
    sourceLevels,
    setSourceLevels,
    sourceVerbTypes,
    setSourceVerbTypes,
    sourceCategories,
    setSourceCategories,
    progressViews,
    setProgressViews,
    studySessionEntries,
    myDictionaryRefreshing,
    myDictionaryRefreshError,
    refreshMyDictionary
  } = catalog;
  const isGermanDictionary = selectedSourceLanguage === 'de';
  const directionLanguage = selectedSourceLanguage === 'my-vocabee'
    ? catalog.myVocabeeLanguage || 'en'
    : catalog.availableSources.find(({ id }) => id === selectedSourceLanguage)?.language
      || (['en', 'de'].includes(selectedSourceLanguage) ? selectedSourceLanguage : 'en');

  function openSettings() {
    setMobileFiltersOpen(false);
    onOpenSettings();
  }

  function startLearning() {
    setMobileFiltersOpen(false);
    onStartLearning(studySessionEntries);
  }

  useEffect(() => {
    if (!mobileFiltersOpen) return undefined;

    const closeOnOutsidePress = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('#dictionary-catalog-filter-options')) return;
      if (target.closest('[aria-controls="dictionary-catalog-filter-options"]')) return;
      setMobileFiltersOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileFiltersOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (!mobileSearchOpen) return undefined;

    searchInputRef.current?.focus();
    const closeOnOutsidePress = (event) => {
      if (!searchRowRef.current?.contains(event.target)) {
        setMobileSearchOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setMobileSearchOpen(false);
      window.requestAnimationFrame(() => mobileSearchButtonRef.current?.focus());
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileSearchOpen]);

  return (
    <section
      ref={filtersRef}
      className={clsx(
        styles.dictionaryFilters,
        selectedSourceLanguage === 'my-vocabee' && styles.hasMyDictionaryRefresh,
        !mobileFiltersOpen && styles.dictionaryFiltersMobileCollapsed,
        mobileFiltersOpen && styles.dictionaryFiltersMobileOpen
      )}
      aria-label='Фильтры словаря'
    >
      <FilteredProgressBar value={progressValue} mobilePinned />
      <div
        ref={searchRowRef}
        className={clsx(styles.searchRow, mobileSearchOpen && styles.searchRowMobileOpen)}
      >
            <button
              className={clsx(styles.searchVisibilityButton, !hideTranslationsUntilHover && styles.searchVisibilityButtonVisible)}
              type="button"
              aria-label={hideTranslationsUntilHover ? 'Показать переводы' : 'Скрыть переводы'}
              aria-pressed={!hideTranslationsUntilHover}
              title={hideTranslationsUntilHover ? 'Показывать переводы' : 'Скрывать переводы'}
              onClick={onToggleTranslationVisibility}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {hideTranslationsUntilHover ? (
                  <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 9 5.7 9 7a10 10 0 0 1-2.2 3.1" /><path d="M6.2 6.2C3.9 7.7 3 10.4 3 12c0 1.3 3.8 7 9 7 1 0 1.9-.2 2.7-.6" /></>
                ) : (
                  <><path d="M2.5 12s3.2-7 9.5-7 9.5 7 9.5 7-3.2 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="3" /></>
                )}
              </svg>
            </button>
            <button
              ref={mobileSearchButtonRef}
              className={styles.mobileSearchButton}
              type="button"
              aria-label={mobileSearchOpen ? 'Поиск открыт' : 'Открыть поиск'}
              aria-controls="dictionary-mobile-search"
              aria-expanded={mobileSearchOpen}
              onClick={() => setMobileSearchOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.5 4.5" />
              </svg>
            </button>
            <div className={styles.searchBar}>
              <span className={styles.searchBarIcon} aria-hidden="true" />
              <input
                ref={searchInputRef}
                id="dictionary-mobile-search"
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Поиск по словам и переводу"
                aria-label="Поиск по словам и переводу"
              />
              {searchQuery && <button type="button" aria-label="Очистить поиск" onClick={() => onSearchQueryChange('')}>×</button>}
              <button
                className={styles.mobileSearchClose}
                type="button"
                aria-label="Закрыть поиск"
                onClick={() => {
                  setMobileSearchOpen(false);
                  window.requestAnimationFrame(() => mobileSearchButtonRef.current?.focus());
                }}
              >×</button>
            </div>
            <button
              className={styles.searchDirectionButton}
              type="button"
              aria-label="Изменить направление изучения"
              title="Изменить направление изучения"
              onClick={onToggleDirection}
            >{reverseDirection ? `RU → ${directionLanguage.toUpperCase()}` : `${directionLanguage.toUpperCase()} → RU`}</button>
        <button
          className={styles.startLearningButton}
          type="button"
          aria-label="Начать изучение"
          title="Начать изучение"
          disabled={studySessionEntries.length === 0}
          onClick={startLearning}
        ><span>Начать</span></button>
      </div>
      <div className={styles.filterControlsAnchor}>
        <div className={styles.mobileFiltersToggleSlot}>
          <button
            className={clsx(styles.mobileFiltersToggle, styles.mobileFiltersTogglePinned)}
            type="button"
            aria-label={mobileFiltersOpen ? 'Скрыть фильтры' : 'Показать фильтры'}
            aria-controls="dictionary-catalog-filter-options"
            aria-expanded={mobileFiltersOpen}
            onClick={() => setMobileFiltersOpen((open) => !open)}
          >
            <span className={styles.mobileFiltersChevron} aria-hidden="true" />
            <span className={styles.mobileFiltersChevron} aria-hidden="true" />
          </button>
        </div>
        <div
          id="dictionary-catalog-filter-options"
          className={clsx(
            styles.filterLayout,
            mobileFiltersOpen && styles.filterLayoutMobileOpen,
            mobileFiltersOpen && styles.filterLayoutMobilePinned
          )}
        >
        <div className={styles.filterLeftGroup}>
          <div className={styles.filterLeftTopRow}>
            <div className={styles.sourceViewButtons} role="group" aria-label='Раздел словаря'>
              <label
                className={clsx(styles.sourceViewButton, styles.categoryFilterControl, sourceCategories.length > 0 && styles.selected)}
                aria-label='Категории фраз'
                title={sourceCategories[0]
                  ? phraseCategories.find(({ id }) => id === sourceCategories[0])?.label
                  : 'Категории фраз'}
              >
                <span className={styles.categoryFilterIcon} aria-hidden="true">
                  <FilterButtonIcon name="categories" />
                </span>
                <select
                  className={styles.categoryFilterSelect}
                  aria-label='Категории фраз'
                  value={sourceCategories[0] || ''}
                  onChange={(event) => {
                    const category = event.target.value;
                    setSourceCategories(category ? [category] : []);
                    if (category) setCatalogView('phrases');
                  }}
                >
                  <option value="">Все категории</option>
                  {phraseCategories.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <button
                className={clsx(styles.sourceViewButton, styles.wordsViewButton, catalogView === 'words' && styles.selected)}
                type="button"
                disabled={sourceCategories.length > 0}
                aria-label='Слова'
                title="Слова"
                aria-pressed={catalogView === 'words'}
                onClick={() => setCatalogView('words')}
              >Слова</button>
              <button
                className={clsx(styles.sourceViewButton, styles.phrasesViewButton, catalogView === 'phrases' && styles.selected)}
                type="button"
                aria-label='Фразы'
                title="Фразы"
                aria-pressed={catalogView === 'phrases'}
                onClick={() => setCatalogView('phrases')}
              >Фразы</button>
              <button
                className={clsx(styles.sourceViewButton, styles.settingsControlButton)}
                type="button"
                aria-label='Открыть настройки'
                title='Настройки'
                onClick={openSettings}
              ><FilterButtonIcon name="settings" /></button>
            </div>
            <fieldset className={styles.filterGroup} aria-label='Уровень'>
              <div className={styles.levelControls}>
                <div className={styles.filterChips}>
                  {['A1', 'A2', 'B1', 'B2'].map((level) => (
                    <button
                      className={clsx(styles.filterChip, sourceLevels.includes(level) && styles.selected)}
                      key={level}
                      type="button"
                      aria-pressed={sourceLevels.includes(level)}
                      onClick={() => toggleArrayValue(setSourceLevels, level)}
                    >{level}</button>
                  ))}
                </div>
              </div>
            </fieldset>
          </div>
        </div>
        <div className={styles.filterRightGroup}>
          <fieldset className={clsx(styles.filterGroup, styles.verbTypeGroup)} aria-label={catalogView === 'phrases' ? 'Тип слова — источника фразы' : 'Тип глагола'}>
            <div className={clsx(styles.filterChips, styles.verbTypeChips)}>
              {[
                ['regular', 'Правильные', 'Правил.', 'Слабые глаголы', 'Слабые'],
                ['irregular', 'Неправильные', 'Неправ.', 'Сильные глаголы', 'Сильные'],
                ['modal', 'Модальные', 'Модал.', 'Модальные глаголы', 'Мод.'],
                ['phrasal', 'Фразовые', 'Фразов.', 'Отделяемые глаголы', 'Отдел.']
              ].map(([type, russianLabel, shortLabel, germanLabel, germanShortLabel]) => (
                <button
                  className={clsx(styles.filterChip, styles.typeChip, sourceVerbTypes.includes(type) && styles.selected)}
                  key={type}
                  type="button"
                  aria-label={isGermanDictionary ? germanLabel : russianLabel}
                  title={isGermanDictionary ? germanLabel : russianLabel}
                  aria-pressed={sourceVerbTypes.includes(type)}
                  onClick={() => toggleArrayValue(setSourceVerbTypes, type)}
                ><span>{isGermanDictionary ? germanShortLabel : shortLabel}</span></button>
              ))}
            </div>
          </fieldset>
          <div className={styles.progressFilters} role="group" aria-label='Статус изучения слов'>
            {[
              ['remaining', 'Не знаю'],
              ['learning', 'Учу'],
              ['learned', 'Знаю']
            ].map(([view, label]) => (
              <button
                className={clsx(styles.progressButton, progressViews.includes(view) && styles.selected)}
                key={view}
                type="button"
                aria-label={label}
                title={label}
                aria-pressed={progressViews.includes(view)}
                onClick={() => toggleArrayValue(setProgressViews, view)}
              ><span>{label}</span></button>
            ))}
            <button
              className={clsx(styles.progressButton, styles.reviewModeFilterButton, reviewMode && styles.selected)}
              type="button"
              aria-pressed={reviewMode}
              aria-label="Режим повторения"
              title="Режим повторения"
              onClick={onToggleReviewMode}
            ><span>Повтор</span></button>
          </div>
        </div>
        </div>
      </div>
      {selectedSourceLanguage === 'my-vocabee' && (
        <div className={styles.myDictionaryRefresh}>
          <button
            className={clsx(styles.myDictionaryRefreshButton, myDictionaryRefreshing && styles.refreshing)}
            type="button"
            aria-label={myDictionaryRefreshing ? 'Обновление словаря' : 'Обновить словарь'}
            title={myDictionaryRefreshing ? 'Обновление словаря…' : 'Обновить словарь'}
            aria-busy={myDictionaryRefreshing}
            disabled={myDictionaryRefreshing}
            onClick={refreshMyDictionary}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 7v5h-5" />
              <path d="M19.1 12a7.1 7.1 0 1 1-1.7-4.6L20 12" />
            </svg>
          </button>
          {myDictionaryRefreshError && <p role="status">{myDictionaryRefreshError}</p>}
        </div>
      )}
    </section>
  );
}
