import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './DictionaryCatalogPanel.module.css';
import commonStyles from './DictionaryPage.module.css';
import { getEntryLearningLevel } from './dictionaryUtils.js';

function toggleValue(values, setter, value) {
  setter(values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]);
}

export function DictionaryCatalogPanel({ catalog, onAddToLearning, onOpenSettings }) {
  const [revealedTranslationWord, setRevealedTranslationWord] = useState(null);
  const revealTranslationTimer = useRef(null);
  const {
    selectedSourceLanguage,
    setSelectedSourceLanguage,
    availableSourceLanguages,
    catalogLoading,
    catalogError,
    sourceLevels,
    setSourceLevels,
    sourceVerbTypes,
    setSourceVerbTypes,
    sourceSort,
    setSourceSort,
    progressView,
    setProgressView,
    overallDictionaryProgress,
    selectedSourceDictionary,
    selectedLevelEntries,
    levelLearningProgress,
    learnedCount,
    inProgressCount,
    learningLevelOverrides,
    filteredSourceEntries
  } = catalog;

  function revealTranslation(word) {
    clearTimeout(revealTranslationTimer.current);
    revealTranslationTimer.current = setTimeout(() => setRevealedTranslationWord(word), 300);
  }

  function hideTranslation() {
    clearTimeout(revealTranslationTimer.current);
    revealTranslationTimer.current = null;
    setRevealedTranslationWord(null);
  }

  useEffect(() => () => clearTimeout(revealTranslationTimer.current), []);

  return (
    <section className={clsx(commonStyles.content, styles.dictionaryContent)} aria-label="Каталог словарей">
      {selectedSourceLanguage && <section className={styles.dictionaryFilters} aria-label="Фильтры словаря">
        {selectedSourceLanguage && <div
          className={styles.overallProgress}
          role="progressbar"
          aria-label={`Общий прогресс изучения выбранного словаря: ${overallDictionaryProgress}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overallDictionaryProgress}
          title={`Весь словарь: ${overallDictionaryProgress}%`}
        >
          <span style={{ width: `${overallDictionaryProgress}%` }} />
        </div>}
        <div className={styles.filterTopRow}>
          <div className={styles.sourceControls}>
            <label className={styles.filterField}>
              <select
                aria-label="Словарь"
                value={selectedSourceLanguage}
                onChange={(event) => setSelectedSourceLanguage(event.target.value)}
              >
                <option value="all">🌐 Все словари</option>
                {availableSourceLanguages.includes('en') && <option value="en">🇬🇧 EN → RU</option>}
                {availableSourceLanguages.includes('de') && <option value="de">🇩🇪 DE → RU</option>}
              </select>
            </label>
            <label className={styles.filterField}>
              <select
                id="source-sort"
                aria-label="Сортировка"
                value={sourceSort}
                onChange={(event) => setSourceSort(event.target.value)}
              >
                <option value="popular">🔥 По популярности</option>
                <option value="alphabetical">🔤 По алфавиту</option>
                <option value="progress">🧠 Сначала меньше прогресс</option>
                <option value="progress-desc">🧠 Сначала больше прогресс</option>
              </select>
            </label>
          </div>

          {selectedSourceLanguage && <div className={styles.filterStack}>
            <fieldset className={styles.filterGroup} aria-label="Уровень">
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
            </fieldset>
            <div className={styles.levelProgress}>
              <div className={styles.levelProgressLabel}>
                <span>Прогресс изучения</span>
                <span>{levelLearningProgress}%</span>
              </div>
              <div
                className={styles.levelProgressTrack}
                role="progressbar"
                aria-label="Прогресс изучения слов выбранных уровней"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={levelLearningProgress}
              >
                <span style={{ width: `${levelLearningProgress}%` }} />
              </div>
              <span className={styles.levelProgressHint}>
                {sourceLevels.length ? sourceLevels.join(', ') : 'Все уровни'} · {selectedLevelEntries.length} слов
              </span>
            </div>
          </div>}

          {selectedSourceLanguage && <fieldset className={clsx(styles.filterGroup, styles.verbTypeGroup)} aria-label="Тип глагола">
            <div className={clsx(styles.filterChips, styles.verbTypeChips)}>
              {[
                ['regular', '✅ Правильные'],
                ['irregular', '⚡ Неправильные'],
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
            </div>
            <div className={styles.progressFilters} role="group" aria-label="Статус изучения слов">
              {[
                ['learning', `В изучении · ${inProgressCount}`],
                ['learned', `Изученные · ${learnedCount}`],
                ['all', 'Все слова']
              ].map(([view, label]) => (
                <button
                  className={clsx(styles.progressButton, progressView === view && styles.selected)}
                  key={view}
                  type="button"
                  aria-pressed={progressView === view}
                  onClick={() => setProgressView(view)}
                >{label}</button>
              ))}
            </div>
          </fieldset>}
        </div>
      </section>}

      {catalogLoading ? (
        <p className={styles.emptyCatalog}>Проверяем базу словарей…</p>
      ) : catalogError ? (
        <div className={styles.emptyCatalog} role="status">
          <p>{catalogError}</p>
          <button type="button" onClick={onOpenSettings}>Открыть настройки</button>
        </div>
      ) : !selectedSourceLanguage ? (
        <div className={styles.emptyCatalog}>
          <p>База словарей пока не загружена.</p>
          <button type="button" onClick={onOpenSettings}>Перейти в настройки и загрузить базу</button>
        </div>
      ) : <>
      <p className={styles.dictionaryCount}>
        Показано {filteredSourceEntries.length} из {selectedSourceDictionary.length} слов
      </p>
      <section className={commonStyles.wordList} aria-label="Записи выбранного словаря">
        <ul>
          {filteredSourceEntries.map((entry) => {
            const learningLevel = getEntryLearningLevel(
              entry,
              entry._catalogLanguage || selectedSourceLanguage,
              learningLevelOverrides
            );
            return (
              <li className={styles.entryCard} key={`${entry._catalogLanguage}:${entry.word}`}>
                <div className={styles.entryHeader}>
                  <div className={styles.entryMain}>
                    <div className={styles.entryWordBlock}>
                      <h2>{entry.word}</h2>
                      {entry.is_irregular && ['verb', 'phrasal_verb'].includes(entry.part_of_speech) && entry.forms?.past_simple && entry.forms?.past_participle && (
                        <p className={styles.inlineForms}>
                          {entry.word} - {entry.forms.past_simple} - {entry.forms.past_participle}
                        </p>
                      )}
                    </div>
                    <div
                      className={styles.entryTranslationBlock}
                      onMouseLeave={hideTranslation}
                      onFocus={() => revealTranslation(entry.word)}
                      onBlur={hideTranslation}
                    >
                      <p
                        className={clsx(styles.entryTranslation, revealedTranslationWord === entry.word && styles.entryTranslationVisible)}
                        aria-hidden={revealedTranslationWord !== entry.word}
                      >{entry.definitions.join(' · ')}</p>
                      {learningLevel === 0 ? (
                        <button
                          className={styles.addToLearningButton}
                          type="button"
                          aria-label={`Добавить «${entry.word}» в обучение`}
                          data-translation-trigger=""
                          onPointerEnter={() => revealTranslation(entry.word)}
                          onClick={() => onAddToLearning(entry)}
                        ><span aria-hidden="true">+</span></button>
                      ) : learningLevel === 9 ? (
                        <span className={styles.learnedMark} aria-label="Слово выучено" data-translation-trigger="" onPointerEnter={() => revealTranslation(entry.word)}>✓</span>
                      ) : (
                        <div
                          className={styles.progressCircle}
                          role="progressbar"
                          aria-label={`Уровень знания слова «${entry.word}»: ${learningLevel} из 9`}
                          data-translation-trigger=""
                          aria-valuemin={0}
                          aria-valuemax={9}
                          aria-valuenow={learningLevel}
                          style={{ '--progress-angle': `${learningLevel / 9 * 360}deg` }}
                          onPointerEnter={() => revealTranslation(entry.word)}
                        ><span>{learningLevel}/9</span></div>
                      )}
                    </div>
                  </div>
                </div>

                {entry.examples?.length > 0 && (
                  <section className={styles.entrySection} aria-label="Примеры">
                    <ul className={styles.exampleList}>
                      {entry.examples.map((example, index) => (
                        <li key={`${example.phrase}-${index}`}>
                          <span>{example.phrase}</span>
                          <span
                            className={clsx(styles.exampleTranslation, revealedTranslationWord === entry.word && styles.exampleTranslationVisible)}
                            aria-hidden={revealedTranslationWord !== entry.word}
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

              </li>
            );
          })}
        </ul>
        {filteredSourceEntries.length === 0 && (
          <p className={commonStyles.message}>Ничего не найдено. Измените фильтры или поисковый запрос.</p>
        )}
      </section>
      </>}
    </section>
  );
}
