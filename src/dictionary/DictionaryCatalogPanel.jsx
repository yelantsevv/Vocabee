import clsx from 'clsx';
import styles from './DictionaryCatalogPanel.module.css';
import commonStyles from './DictionaryPage.module.css';
import { getEntryLearningLevel } from './dictionaryUtils.js';

function toggleValue(values, setter, value) {
  setter(values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]);
}

export function DictionaryCatalogPanel({ catalog, onSearchChange, onToggleLearningLevel }) {
  const {
    selectedSourceLanguage,
    setSelectedSourceLanguage,
    sourceLevels,
    setSourceLevels,
    sourceVerbTypes,
    setSourceVerbTypes,
    sourceSort,
    setSourceSort,
    sourceSearch,
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
        <div className={styles.filterTopRow}>
          <div className={styles.sourceControls}>
            <div className={styles.sourcePickerGroup}>
              <label className={styles.filterField}>
                <select
                  id="source-dictionary"
                  aria-label="Словарь"
                  value={selectedSourceLanguage}
                  onChange={(event) => setSelectedSourceLanguage(event.target.value)}
                >
                  <option value="en">🇬🇧 EN → RU</option>
                  <option value="de">🇩🇪 DE → RU</option>
                </select>
              </label>
            </div>
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

          <div className={styles.filterStack}>
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
          </div>

          <fieldset className={clsx(styles.filterGroup, styles.verbTypeGroup)} aria-label="Тип глагола">
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
          </fieldset>
        </div>

        <div className={styles.filterBottomRow}>
          <label className={clsx(commonStyles.search, styles.dictionarySearch)}>
            <span className={commonStyles.searchIcon} aria-hidden="true">⌕</span>
            <input
              type="search"
              value={sourceSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Поиск слова, фразы или перевода…"
              aria-label="Поиск слова, фразы или перевода"
            />
          </label>
        </div>
      </section>

      <p className={styles.dictionaryCount}>
        Показано {filteredSourceEntries.length} из {selectedSourceDictionary.length} слов
      </p>
      <section className={commonStyles.wordList} aria-label="Записи выбранного словаря">
        <ul>
          {filteredSourceEntries.map((entry) => {
            const learningLevel = getEntryLearningLevel(entry, selectedSourceLanguage, learningLevelOverrides);
            return (
              <li className={commonStyles.word} key={entry.word}>
                <div className={commonStyles.wordPair}>
                  <strong>{entry.word}</strong>
                  <span>{entry.definitions.join(' · ')}</span>
                </div>
                {entry.examples?.[0] && (
                  <small>{entry.examples[0].phrase} — {entry.examples[0].translation}</small>
                )}
                <button
                  className={clsx(styles.learnedButton, learningLevel === 9 && styles.learned)}
                  type="button"
                  aria-pressed={learningLevel === 9}
                  onClick={() => onToggleLearningLevel(entry)}
                >{learningLevel === 9 ? '✓ Изучено · 9/9' : `Отметить изученным · ${learningLevel}/9`}</button>
              </li>
            );
          })}
        </ul>
        {filteredSourceEntries.length === 0 && (
          <p className={commonStyles.message}>Ничего не найдено. Измените фильтры или поисковый запрос.</p>
        )}
      </section>
    </section>
  );
}
