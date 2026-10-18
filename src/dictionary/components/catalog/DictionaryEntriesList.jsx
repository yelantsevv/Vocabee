import catalogStyles from './DictionaryCatalogPanel.module.css';
import pageStyles from '../../styles/DictionaryPage.module.css';
import { DictionaryWordCard } from '../cards/DictionaryWordCard.jsx';
import { formatVerbForms, getEntryLearningLevel } from '../../utils/dictionaryUtils.js';

export function DictionaryEntriesList({
  entries,
  hasMatches,
  visibleCount,
  catalogView,
  selectedSourceLanguage,
  learningLevelOverrides,
  sourceCategories,
  hideTranslationsUntilHover,
  onAddToLearning,
  onSpeakWord
}) {
  const visibleEntries = entries.slice(0, visibleCount);

  return (
    <section
      className={pageStyles.wordList}
      aria-label={catalogView === 'phrases' ? 'Фразы' : 'Записи выбранного словаря'}
    >
      <ul>
        {visibleEntries.map((entry) => {
          const translationVisible = !hideTranslationsUntilHover;
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
              forms={formatVerbForms(entry, ' - ') || undefined}
              translationVisible={translationVisible}
              onAddToLearning={() => onAddToLearning(entry)}
              onSpeakWord={() => onSpeakWord(entry)}
            >
              {entry.examples?.length > 0 && (
                <section className={catalogStyles.entrySection} aria-label='Примеры'>
                  <ul className={catalogStyles.exampleList}>
                    {entry.examples
                      .filter((example) => (
                        sourceCategories.length === 0
                        || sourceCategories.includes(example.category)
                      ))
                      .map((example, index) => (
                        <li key={`${example.phrase}-${index}`}>
                          <span>{example.phrase}</span>
                          <span
                            className={translationVisible
                              ? catalogStyles.exampleTranslation
                              : `${catalogStyles.exampleTranslation} ${catalogStyles.exampleTranslationHidden}`}
                            data-translation-hidden={!translationVisible || undefined}
                          >{example.translation}</span>
                        </li>
                      ))}
                  </ul>
                </section>
              )}

              {(entry.synonyms?.length > 0 || entry.antonyms?.length > 0) && (
                <div className={catalogStyles.wordRelations}>
                  {entry.synonyms?.length > 0 && <p><strong>Синонимы:</strong> {entry.synonyms.join(', ')}</p>}
                  {entry.antonyms?.length > 0 && <p><strong>Антонимы:</strong> {entry.antonyms.join(', ')}</p>}
                </div>
              )}
            </DictionaryWordCard>
          );
        })}
      </ul>
      {!hasMatches && (
        <p className={pageStyles.message}>Ничего не найдено. Измените фильтры или поисковый запрос.</p>
      )}
    </section>
  );
}
