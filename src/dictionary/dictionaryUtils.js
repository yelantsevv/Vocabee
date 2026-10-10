export const languageNames = {
  en: 'Английский',
  ru: 'Русский',
  de: 'Немецкий',
  uk: 'Украинский'
};

export const targetLanguages = ['en', 'ru', 'uk', 'de'];
export const LEARNED_ENTRIES_KEY = 'vocabee-learned-source-entries';
export const IMPORTED_DICTIONARIES_KEY = 'vocabee-imported-dictionaries-v1';

const VALID_PARTS_OF_SPEECH = new Set([
  'noun', 'verb', 'phrasal_verb', 'adjective', 'adverb', 'preposition',
  'pronoun', 'conjunction', 'particle'
]);
const VALID_CEFR_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

export function getLearnedEntryKey(language, word) {
  return `${language}:${word.toLocaleLowerCase()}`;
}

export function getEntryLearningLevel(entry, language, overrides) {
  const override = overrides[getLearnedEntryKey(language, entry.word)];
  return Number.isInteger(override) ? override : entry.learning_level ?? 0;
}

export function normalizeImportedEntries(payload) {
  const entries = Array.isArray(payload) ? payload : payload?.entries || payload?.words;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('В JSON не найден список записей словаря.');
  }

  return entries.map((entry, index) => {
    if (!entry || typeof entry.word !== 'string' || !entry.word.trim()) {
      throw new Error(`У записи №${index + 1} отсутствует слово.`);
    }
    if (!Array.isArray(entry.definitions) || !entry.definitions.every((item) => typeof item === 'string')) {
      throw new Error(`У записи «${entry.word}» неверный список переводов.`);
    }
    if (entry.learning_level !== undefined
      && (!Number.isInteger(entry.learning_level) || entry.learning_level < 0 || entry.learning_level > 9)) {
      throw new Error(`У записи «${entry.word}» уровень знания должен быть от 0 до 9.`);
    }

    return {
      ...entry,
      word: entry.word.trim(),
      part_of_speech: VALID_PARTS_OF_SPEECH.has(entry.part_of_speech) ? entry.part_of_speech : 'verb',
      level: VALID_CEFR_LEVELS.has(entry.level) ? entry.level : 'A1',
      learning_level: entry.learning_level ?? 0,
      frequency_rank: Number.isFinite(entry.frequency_rank) ? entry.frequency_rank : 10000 + index,
      definitions: entry.definitions
    };
  });
}

export function matchesVerbType(entry, type, language) {
  if (type === 'regular') return entry.is_irregular === false;
  if (type === 'irregular') return entry.is_irregular === true;
  if (type === 'phrasal') {
    return entry.part_of_speech === 'phrasal_verb'
      || (language === 'de' && entry.info?.includes('отделяемый глагол'));
  }
  return false;
}

export function getLanguagePairs(words) {
  return [...new Set(words.map((word) =>
    `${languageNames[word.sourceLang] || word.sourceLang} → ${languageNames[word.targetLang] || word.targetLang}`
  ))];
}

export function formatAddedDate(timestamp) {
  return new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' })
    .format(new Date(timestamp));
}
