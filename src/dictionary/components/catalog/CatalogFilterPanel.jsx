import clsx from 'clsx';
import styles from './DictionaryCatalogPanel.module.css';
import phraseCategories from '../../data/phrase-categories.json';
import { DictionarySearch } from './DictionarySearch.jsx';
import { FilterButtonIcon } from './FilterButtonIcon.jsx';
import { FilteredProgressBar } from './FilteredProgressBar.jsx';
import { useInterfaceText } from '../../i18n/interfaceLanguage.jsx';
import { toggleArrayValue } from '../../utils/catalogEntries.js';

export function CatalogFilterPanel({
  catalog,
  filtersRef,
  searchLanguage,
  progressValue,
  onOpenSettings,
  onStartLearning
}) {
  const t = useInterfaceText();
  const {
    selectedSourceLanguage,
    catalogView,
    setCatalogView,
    availableSources,
    sourceLevels,
    setSourceLevels,
    sourceVerbTypes,
    setSourceVerbTypes,
    sourceCategories,
    setSourceCategories,
    sourceSearch,
    setSourceSearch,
    progressViews,
    setProgressViews,
    sourceConnections,
    setSourceConnections,
    studySessionEntries
  } = catalog;
  const loadedLanguages = availableSources.filter(({ id }) => ['en', 'de'].includes(id));
  const activeLanguage = loadedLanguages.find(({ id }) => id === selectedSourceLanguage) || loadedLanguages[0];
  const isGermanDictionary = selectedSourceLanguage === 'de';

  function toggleSourceConnection(source) {
    setSourceConnections((current) => ({ ...current, [source]: !current[source] }));
  }

  return (
    <section ref={filtersRef} className={styles.dictionaryFilters} aria-label={t('Фильтры словаря')}>
      <FilteredProgressBar value={progressValue} />
      <div className={styles.filterLayout}>
        <div className={styles.filterLeftGroup}>
          <div className={styles.filterLeftTopRow}>
            <div className={styles.sourceViewButtons} role="group" aria-label={t('Раздел словаря')}>
              <label
                className={clsx(styles.sourceViewButton, styles.mobileCategoryControl, sourceCategories.length > 0 && styles.selected)}
                aria-label={t('Категории фраз')}
                title={sourceCategories[0]
                  ? t(phraseCategories.find(({ id }) => id === sourceCategories[0])?.label)
                  : t('Категории фраз')}
              >
                <span className={styles.mobileCategoryIcon} aria-hidden="true">
                  <FilterButtonIcon name="categories" />
                </span>
                <select
                  className={styles.mobileCategorySelect}
                  aria-label={t('Категории фраз')}
                  value={sourceCategories[0] || ''}
                  onChange={(event) => setSourceCategories(event.target.value ? [event.target.value] : [])}
                >
                  <option value="">{t('Все категории')}</option>
                  {phraseCategories.map(({ id, label }) => <option key={id} value={id}>{t(label)}</option>)}
                </select>
              </label>
              <button
                className={clsx(styles.sourceViewButton, styles.myDictionarySourceButton, sourceConnections.my && styles.selected)}
                type="button"
                aria-label={t(sourceConnections.my ? 'Отключить мой словарь' : 'Подключить мой словарь')}
                aria-pressed={sourceConnections.my}
                title={t(sourceConnections.my ? 'Мой словарь подключён' : 'Подключить мой словарь')}
                onClick={() => toggleSourceConnection('my')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5.5c2.8-1 5.5-.6 8 1.1v13c-2.5-1.7-5.2-2.1-8-1.1v-13Z" />
                  <path d="M20 5.5c-2.8-1-5.5-.6-8 1.1v13c2.5-1.7 5.2-2.1 8-1.1v-13Z" />
                </svg>
              </button>
              <button
                className={clsx(styles.sourceViewButton, styles.languageSourceButton, sourceConnections.language && activeLanguage && styles.selected)}
                type="button"
                aria-label={`${activeLanguage?.label || t('Языковой словарь')}: ${t(sourceConnections.language ? 'подключён' : 'отключён')}`}
                aria-pressed={Boolean(sourceConnections.language && activeLanguage)}
                title={activeLanguage
                  ? `${activeLanguage.label} · ${sourceConnections.language ? 'подключён' : 'отключён'}`
                  : t('Сначала загрузите EN → RU или DE → RU в настройках')}
                disabled={!activeLanguage}
                onClick={() => toggleSourceConnection('language')}
              >{activeLanguage?.id === 'de' ? '🇩🇪' : '🇬🇧'}</button>
              <button
                className={clsx(styles.sourceViewButton, styles.mobileSettingsButton)}
                type="button"
                aria-label={t('Открыть настройки')}
                title={t('Настройки')}
                onClick={onOpenSettings}
              ><FilterButtonIcon name="settings" /></button>
              <button
                className={clsx(styles.sourceViewButton, styles.wordsViewButton, catalogView === 'words' && styles.selected)}
                type="button"
                aria-label={t('Слова')}
                title={`${t('Слова')} · Words`}
                aria-pressed={catalogView === 'words'}
                onClick={() => setCatalogView('words')}
              >Words</button>
              <button
                className={clsx(styles.sourceViewButton, styles.phrasesViewButton, catalogView === 'phrases' && styles.selected)}
                type="button"
                aria-label={t('Фразы')}
                title={`${t('Фразы')} · Phrases`}
                aria-pressed={catalogView === 'phrases'}
                onClick={() => setCatalogView('phrases')}
              >Phrases</button>
            </div>
            <fieldset className={styles.filterGroup} aria-label={t('Уровень')}>
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
          <div className={styles.filterLeftBottomRow}>
            <label className={styles.filterField}>
              <select
                id="source-categories"
                aria-label={t('Категории фраз')}
                value={sourceCategories[0] || ''}
                onChange={(event) => setSourceCategories(event.target.value ? [event.target.value] : [])}
              >
                <option value="">{t('Все категории')}</option>
                {phraseCategories.map(({ id, label }) => <option key={id} value={id}>{t(label)}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className={styles.filterRightGroup}>
          <fieldset className={clsx(styles.filterGroup, styles.verbTypeGroup)} aria-label={t(catalogView === 'phrases' ? 'Тип слова — источника фразы' : 'Тип глагола')}>
            <div className={clsx(styles.filterChips, styles.verbTypeChips)}>
              {[
                ['regular', 'Regular', 'Правильные', 'Правил.', 'Слабые', 'Слабые глаголы'],
                ['irregular', 'Irregular', 'Неправильные', 'Неправ.', 'Сильные', 'Сильные глаголы'],
                ['modal', 'Modal', 'Модальные', 'Модал.', 'Мод.', 'Модальные глаголы'],
                ['phrasal', 'Phrasal', 'Фразовые', 'Фразов.', 'Отдел.', 'Отделяемые глаголы']
              ].map(([type, englishLabel, russianLabel, shortLabel, germanShortLabel, germanLabel]) => (
                <button
                  className={clsx(styles.filterChip, styles.typeChip, sourceVerbTypes.includes(type) && styles.selected)}
                  key={type}
                  type="button"
                  aria-label={t(isGermanDictionary ? germanLabel : russianLabel)}
                  title={`${t(isGermanDictionary ? germanLabel : russianLabel)} · ${englishLabel}`}
                  aria-pressed={sourceVerbTypes.includes(type)}
                  onClick={() => toggleArrayValue(setSourceVerbTypes, type)}
                ><span>{t(isGermanDictionary ? germanShortLabel : shortLabel)}</span></button>
              ))}
              <div className={styles.desktopSearchControl}>
                <DictionarySearch
                  variant="filter"
                  selectedSourceLanguage={searchLanguage}
                  sourceSearch={sourceSearch}
                  onSourceSearchChange={setSourceSearch}
                />
              </div>
            </div>
          </fieldset>
          <div className={styles.progressFilters} role="group" aria-label={t('Статус изучения слов')}>
            <button
              className={styles.startLearningButton}
              type="button"
              aria-label={t('Начать изучение')}
              title={t('Начать изучение')}
              disabled={studySessionEntries.length === 0}
              onClick={() => onStartLearning(studySessionEntries)}
            ><span>{t('Начать')}</span></button>
            {[
              ['learning', 'Learning', 'Изучаю', 'Учу'],
              ['learned', 'Learned', 'Изученные', 'Выучено'],
              ['remaining', 'Not learned', 'Не изученные', 'К изучению']
            ].map(([view, englishLabel, russianLabel, shortLabel]) => (
              <button
                className={clsx(styles.progressButton, progressViews.includes(view) && styles.selected)}
                key={view}
                type="button"
                aria-label={t(russianLabel)}
                title={`${t(russianLabel)} · ${englishLabel}`}
                aria-pressed={progressViews.includes(view)}
                onClick={() => toggleArrayValue(setProgressViews, view)}
              ><span>{t(shortLabel)}</span></button>
            ))}
            <button
              className={`${styles.progressButton} ${styles.settingsButton} ${styles.desktopSettingsButton}`}
              type="button"
              aria-label={t('Открыть настройки')}
              title={t('Настройки')}
              onClick={onOpenSettings}
            ><FilterButtonIcon name="settings" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
