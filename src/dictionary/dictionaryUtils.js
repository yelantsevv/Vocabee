import { targetLanguages as targetLanguageOptions } from '../shared/languages.js';

export const languageNames = {
  en: 'Английский',
  ru: 'Русский',
  de: 'Немецкий',
  uk: 'Украинский'
};

export const targetLanguages = targetLanguageOptions.map(([code]) => code);
export const LEARNED_ENTRIES_KEY = 'vocabee-learned-source-entries';
export const IMPORTED_DICTIONARIES_KEY = 'vocabee-imported-dictionaries-v1';

const VALID_PARTS_OF_SPEECH = new Set([
  'noun', 'verb', 'r-verb', 'i-verb', 'm-verb', 'ph-verb',
  'phrasal_verb', 'phrasal-verb', 'separable_verb', 'adjective', 'adverb', 'preposition',
  'pronoun', 'conjunction', 'particle', 'phrase'
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
      word: entry.word.trim(),
      part_of_speech: entry.part_of_speech === 'phrasal-verb'
        ? 'phrasal_verb'
        : VALID_PARTS_OF_SPEECH.has(entry.part_of_speech)
          ? entry.part_of_speech
          : 'verb',
      level: VALID_CEFR_LEVELS.has(entry.level) ? entry.level : 'A1',
      learning_level: entry.learning_level ?? 0,
      frequency_rank: Number.isFinite(entry.frequency_rank) ? entry.frequency_rank : 10000 + index,
      definitions: entry.definitions,
      ...(typeof entry.is_irregular === 'boolean' ? { is_irregular: entry.is_irregular } : {}),
      ...(Array.isArray(entry.synonyms) ? { synonyms: entry.synonyms } : {}),
      ...(Array.isArray(entry.antonyms) ? { antonyms: entry.antonyms } : {}),
      ...(Array.isArray(entry.examples) ? { examples: entry.examples } : {}),
      ...(entry.forms && typeof entry.forms === 'object' ? { forms: entry.forms } : {})
    };
  });
}

export function matchesVerbType(entry, type, language) {
  if (type === 'regular') {
    return entry.part_of_speech === 'r-verb'
      || (entry.part_of_speech === 'verb' && entry.is_irregular === false);
  }
  if (type === 'irregular') {
    return entry.part_of_speech === 'i-verb'
      || (entry.part_of_speech === 'verb' && entry.is_irregular === true);
  }
  if (type === 'modal') return entry.part_of_speech === 'm-verb';
  if (type === 'phrasal') {
    return ['ph-verb', 'phrasal_verb', 'phrasal-verb'].includes(entry.part_of_speech)
      || (language === 'de' && entry.part_of_speech === 'separable_verb');
  }
  return false;
}
