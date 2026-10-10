export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'phrasal_verb'
  | 'separable_verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'pronoun'
  | 'conjunction'
  | 'particle'
  | 'phrase';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type LearningLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface WordExample {
  level: CEFRLevel;
  phrase: string;
  translation: string;
}

export interface VerbForms {
  past_simple?: string;
  past_participle?: string;
}

export interface DictionaryEntry {
  word: string;
  part_of_speech: PartOfSpeech;
  level: CEFRLevel;
  learning_level: LearningLevel;
  frequency_rank: number;
  is_irregular?: boolean;
  definitions: string[];
  synonyms?: string[];
  antonyms?: string[];
  examples?: WordExample[];
  forms?: VerbForms;
}

export interface FormIndexEntry {
  form: string;
  target_word: string;
}
