import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './DictionaryCatalogPanel.module.css';
import commonStyles from './DictionaryPage.module.css';
import { getEntryLearningLevel } from './dictionaryUtils.js';
import { openBrowserExtensionSettings } from './storage.js';
import phraseCategories from './phrase-categories.json';
import { DictionaryWordCard } from './components/DictionaryWordCard.jsx';
import { DictionarySearch } from './DictionarySearch.jsx';

function toggleValue(values, setter, value) {
  setter(values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]);
}

function shuffleEntries(entries) {
  const shuffled = [...entries];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export function DictionaryCatalogPanel({
  catalog,
  searchLanguage,
  onAddToLearning,
  onOpenSettings,
  onRefreshCards,
  cardsPerLoad,
  hideTranslationsUntilHover,
  refreshVersion
}) {
  const [revealedTranslationWord, setRevealedTranslationWord] = useState(null);
  const [extensionSettingsError, setExtensionSettingsError] = useState('');
  const revealTranslationTimer = useRef(null);
  const cardListRef = useRef(null);
  const {
    selectedSourceLanguage,
    setSelectedSourceLanguage,
    catalogView,
    setCatalogView,
    availableSources,
    catalogLoading,
    catalogError,
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
    overallDictionaryProgress,
    selectedSourceDictionary,
    learnedCount,
    inProgressCount,
    remainingCount,
    learningLevelOverrides,
    filteredSourceEntries
  } = catalog;
  const [shuffledEntries, setShuffledEntries] = useState(() => shuffleEntries(filteredSourceEntries));
  const previousRefreshVersion = useRef(refreshVersion);
  const filteredEntryKeys = filteredSourceEntries.map((entry) => (
    `${entry._catalogId || entry._catalogLanguage}:${entry._entryKey || entry.word}`
  ));
  const filteredEntrySignature = JSON.stringify([...filteredEntryKeys].sort());
  const [displayedCardCount, setDisplayedCardCount] = useState(cardsPerLoad);
  const loadedLanguages = availableSources.filter(({ id }) => ['en', 'de'].includes(id));
  const hasMyDictionary = availableSources.some(({ id }) => id === 'my-vocabee');
  const activeLanguage = loadedLanguages.find(({ id }) => id === selectedSourceLanguage)
    || loadedLanguages[0];
  const hasViewableSource = (sourceConnections.my && hasMyDictionary)
    || (sourceConnections.language && Boolean(activeLanguage));
  useEffect(() => {
    if (previousRefreshVersion.current !== refreshVersion) {
      previousRefreshVersion.current = refreshVersion;
      setShuffledEntries(shuffleEntries(filteredSourceEntries));
      return;
    }

    setShuffledEntries((current) => {
      const currentKeys = new Set(filteredEntryKeys);
      const entriesByKey = new Map(filteredSourceEntries.map((entry) => [
        `${entry._catalogId || entry._catalogLanguage}:${entry._entryKey || entry.word}`,
        entry
      ]));
      const retainedEntries = current
        .filter((entry) => currentKeys.has(`${entry._catalogId || entry._catalogLanguage}:${entry._entryKey || entry.word}`))
        .map((entry) => entriesByKey.get(`${entry._catalogId || entry._catalogLanguage}:${entry._entryKey || entry.word}`));
      const retainedKeys = new Set(retainedEntries.map((entry) => (
        `${entry._catalogId || entry._catalogLanguage}:${entry._entryKey || entry.word}`
      )));
      const newEntries = filteredSourceEntries.filter((entry) => (
        !retainedKeys.has(`${entry._catalogId || entry._catalogLanguage}:${entry._entryKey || entry.word}`)
      ));
      return [...retainedEntries, ...shuffleEntries(newEntries)];
    });
  }, [filteredSourceEntries, filteredEntrySignature, refreshVersion]);

  useEffect(() => {
    setDisplayedCardCount(cardsPerLoad);
  }, [cardsPerLoad, filteredEntrySignature, refreshVersion]);

  function revealTranslation(word) {
    clearTimeout(revealTranslationTimer.current);
    revealTranslationTimer.current = setTimeout(() => setRevealedTranslationWord(word), 300);
  }

  function hideTranslation() {
    clearTimeout(revealTranslationTimer.current);
    revealTranslationTimer.current = null;
    setRevealedTranslationWord(null);
  }

  async function openExtensionSettings() {
    setExtensionSettingsError('');
    try {
      await openBrowserExtensionSettings();
    } catch (error) {
      setExtensionSettingsError(error.message || 'Не удалось открыть настройки расширений.');
    }
  }

  useEffect(() => () => clearTimeout(revealTranslationTimer.current), []);

  function toggleSourceConnection(source) {
    setSourceConnections((current) => ({ ...current, [source]: !current[source] }));
  }

  return (
    <section className={clsx(commonStyles.content, styles.dictionaryContent)} aria-label="Каталог словарей">
      <section className={styles.dictionaryFilters} aria-label="Фильтры словаря">
        <div
          className={styles.overallProgress}
          role="progressbar"
          aria-label={`Общий прогресс изучения выбранного словаря: ${overallDictionaryProgress}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overallDictionaryProgress}
          title={`Весь словарь: ${overallDictionaryProgress}%`}
        >
          <span style={{ width: `${overallDictionaryProgress}%` }} />
        </div>
        <div className={styles.filterLayout}>
          <div className={styles.filterLeftGroup}>
            <div className={styles.filterLeftTopRow}>
          <div className={styles.sourceViewButtons} role="group" aria-label="Раздел словаря">
              <button
                className={clsx(styles.sourceViewButton, sourceConnections.my && styles.selected)}
                type="button"
                aria-label={sourceConnections.my ? 'Отключить мой словарь' : 'Подключить мой словарь'}
                aria-pressed={sourceConnections.my}
                title={sourceConnections.my ? 'Мой словарь подключён' : 'Подключить мой словарь'}
                onClick={() => toggleSourceConnection('my')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5.5c2.8-1 5.5-.6 8 1.1v13c-2.5-1.7-5.2-2.1-8-1.1v-13Z" />
                  <path d="M20 5.5c-2.8-1-5.5-.6-8 1.1v13c2.5-1.7 5.2-2.1 8-1.1v-13Z" />
                </svg>
              </button>
              <button
                className={clsx(styles.sourceViewButton, sourceConnections.language && activeLanguage && styles.selected)}
                type="button"
                aria-label={`${activeLanguage?.label || 'Языковой словарь'}: ${sourceConnections.language ? 'подключён' : 'отключён'}`}
                aria-pressed={Boolean(sourceConnections.language && activeLanguage)}
                title={activeLanguage
                  ? `${activeLanguage.label} · ${sourceConnections.language ? 'подключён' : 'отключён'}`
                  : 'Сначала загрузите EN → RU или DE → RU в настройках'}
                disabled={!activeLanguage}
                onClick={() => toggleSourceConnection('language')}
              >{activeLanguage?.id === 'de' ? '🇩🇪' : '🇬🇧'}</button>
              <button
                className={clsx(styles.sourceViewButton, catalogView === 'words' && styles.selected)}
                type="button"
                aria-pressed={catalogView === 'words'}
                onClick={() => setCatalogView('words')}
              >Слова</button>
              <button
                className={clsx(styles.sourceViewButton, catalogView === 'phrases' && styles.selected)}
                type="button"
                aria-pressed={catalogView === 'phrases'}
                onClick={() => setCatalogView('phrases')}
              >Фразы</button>
          </div>

          <fieldset className={styles.filterGroup} aria-label="Уровень">
            <div className={styles.levelControls}>
              <div className={styles.filterChips}>
                {['A1', 'A2', 'B1', 'B2'].map((level) => (
                  <button
                    className={clsx(styles.filterChip, sourceLevels.includes(level) && styles.selected)}
                    key={level}
                    type="button"
                    aria-pressed={sourceLevels.includes(level)}
                    onClick={() => toggleValue(sourceLevels, setSourceLevels, level)}
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
              aria-label="Категории фраз"
              value={sourceCategories[0] || ''}
              onChange={(event) => setSourceCategories(event.target.value ? [event.target.value] : [])}
            >
              <option value="">Все категории</option>
              {phraseCategories.map(({ id, label }) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </label>
          <button
            className={styles.refreshCardsButton}
            type="button"
            aria-label="Обновить список карточек"
            title="Обновить список карточек"
            onClick={onRefreshCards}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 7v5h-5M4 17v-5h5" />
              <path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" />
            </svg>
          </button>
            </div>
          </div>
          <div className={styles.filterRightGroup}>
            <fieldset className={clsx(styles.filterGroup, styles.verbTypeGroup)} aria-label={catalogView === 'phrases' ? 'Тип слова — источника фразы' : 'Тип глагола'}>
              <div className={clsx(styles.filterChips, styles.verbTypeChips)}>
                {[
                  ['regular', '✅ Правильные'],
                  ['irregular', '⚡ Неправильные'],
                  ['modal', '🧩 Модальные'],
                  ['phrasal', '💬 Фразовые']
                ].map(([type, label]) => (
                  <button
                    className={clsx(styles.filterChip, styles.typeChip, sourceVerbTypes.includes(type) && styles.selected)}
                    key={type}
                    type="button"
                    aria-pressed={sourceVerbTypes.includes(type)}
                    onClick={() => toggleValue(sourceVerbTypes, setSourceVerbTypes, type)}
                  >{label}</button>
                ))}
                <DictionarySearch
                  variant="filter"
                  selectedSourceLanguage={searchLanguage}
                  sourceSearch={sourceSearch}
                  onSourceSearchChange={setSourceSearch}
                />
              </div>
            </fieldset>
            <div className={styles.progressFilters} role="group" aria-label="Статус изучения слов">
              <button
                className={styles.startLearningButton}
                type="button"
                onClick={() => {
                  setProgressViews(['remaining']);
                  requestAnimationFrame(() => cardListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                }}
              >Начать изучение</button>
              {[
                ['learning', `Изучаю (${inProgressCount})`],
                ['learned', `Изученные (${learnedCount})`],
                ['remaining', `Не изученные (${remainingCount})`]
              ].map(([view, label]) => (
                <button
                  className={clsx(styles.progressButton, progressViews.includes(view) && styles.selected)}
                  key={view}
                  type="button"
                  aria-pressed={progressViews.includes(view)}
                  onClick={() => toggleValue(progressViews, setProgressViews, view)}
                >{label}</button>
              ))}
              <button
                className={`${styles.progressButton} ${styles.settingsButton}`}
                type="button"
                aria-label="Открыть настройки"
                title="Настройки"
                onClick={onOpenSettings}
              >⚙</button>
            </div>
          </div>
        </div>
      </section>

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
      <p className={styles.dictionaryCount}>
        Показано {Math.min(displayedCardCount, shuffledEntries.length)} из {shuffledEntries.length} {catalogView === 'phrases' ? 'фраз' : 'слов'}
      </p>
      <section
        className={commonStyles.wordList}
        aria-label={catalogView === 'phrases' ? 'Фразы' : 'Записи выбранного словаря'}
        ref={cardListRef}
      >
        <ul>
          {shuffledEntries.slice(0, displayedCardCount).map((entry) => {
            const learningLevel = getEntryLearningLevel(
              entry,
              entry._learningSource || entry._catalogId || entry._catalogLanguage || selectedSourceLanguage,
              learningLevelOverrides
            );
            return (
              <DictionaryWordCard
                key={`${entry._catalogId || entry._catalogLanguage}:${entry._catalogLanguage}:${entry._entryKey || entry.word}`}
                word={entry.word}
                translation={entry.definitions.join(' · ')}
                learningLevel={learningLevel}
                forms={['verb', 'i-verb', 'm-verb', 'ph-verb', 'r-verb', 'phrasal_verb', 'phrasal-verb']
                  .includes(entry.part_of_speech)
                  && entry.forms?.past_simple && entry.forms?.past_participle
                  ? `${entry.word} - ${entry.forms.past_simple} - ${entry.forms.past_participle}`
                  : undefined}
                translationVisible={!hideTranslationsUntilHover || revealedTranslationWord === entry.word}
                onAddToLearning={() => onAddToLearning(entry)}
                onRevealTranslation={() => revealTranslation(entry.word)}
                onHideTranslation={hideTranslation}
              >
                {catalogView === 'phrases' && (
                  <p className={styles.phraseMetadata}>
                    Уровень {entry.level}
                    {entry.category && ` · ${phraseCategories.find(({ id }) => id === entry.category)?.label || entry.category}`}
                  </p>
                )}
                {entry.examples?.length > 0 && (
                  <section className={styles.entrySection} aria-label="Примеры">
                    <ul className={styles.exampleList}>
                      {entry.examples
                        .filter((example) => (
                          sourceCategories.length === 0
                          || sourceCategories.includes(example.category)
                        ))
                        .map((example, index) => (
                        <li key={`${example.phrase}-${index}`}>
                          <span>{example.phrase}</span>
                          <span
                            className={clsx(styles.exampleTranslation, (!hideTranslationsUntilHover || revealedTranslationWord === entry.word) && styles.exampleTranslationVisible)}
                            aria-hidden={hideTranslationsUntilHover && revealedTranslationWord !== entry.word}
                          >{example.translation}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {(entry.synonyms?.length > 0 || entry.antonyms?.length > 0) && (
                  <div className={styles.wordRelations}>
                    {entry.synonyms?.length > 0 && <p><strong>Синонимы:</strong> {entry.synonyms.join(', ')}</p>}
                    {entry.antonyms?.length > 0 && <p><strong>Антонимы:</strong> {entry.antonyms.join(', ')}</p>}
                  </div>
                )}

              </DictionaryWordCard>
            );
          })}
        </ul>
        {filteredSourceEntries.length === 0 && (
          <p className={commonStyles.message}>Ничего не найдено. Измените фильтры или поисковый запрос.</p>
        )}
      </section>
      {displayedCardCount < shuffledEntries.length && (
        <button
          className={styles.loadMoreButton}
          type="button"
          onClick={() => setDisplayedCardCount((count) => count + cardsPerLoad)}
        >
          Показать ещё {cardsPerLoad}
        </button>
      )}
      </>}
    </section>
  );
}
