import { useEffect, useState } from 'react';
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
  onStartLearning
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
    studySessionEntries
  } = catalog;
  const isGermanDictionary = selectedSourceLanguage === 'de';

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

  return (
    <section
      ref={filtersRef}
      className={clsx(
        styles.dictionaryFilters,
        !mobileFiltersOpen && styles.dictionaryFiltersMobileCollapsed,
        mobileFiltersOpen && styles.dictionaryFiltersMobileOpen
      )}
      aria-label='Фильтры словаря'
    >
      <FilteredProgressBar value={progressValue} mobilePinned />
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
              className={styles.startLearningButton}
              type="button"
              aria-label='Начать изучение'
              title='Начать изучение'
              disabled={studySessionEntries.length === 0}
              onClick={startLearning}
            ><span>Начать</span></button>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
