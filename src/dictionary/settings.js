export const DEFAULT_DICTIONARY_FONT_SIZE = 16;
export const DEFAULT_INTERFACE_FONT_SCALE = 100;
export const DEFAULT_CONTENT_FONT_SIZE = 30;
export const DEFAULT_ADDITIONAL_FONT_SIZE = 16;
export const DEFAULT_SPEECH_VOICE_URI = '';
export const DICTIONARY_THEMES = [
  { id: 'classic-dark', label: 'Классическая · Тёмная' },
  { id: 'android-light', label: 'Облачная · Светлая' },
  { id: 'airy-light', label: 'Чёрно-белая · Светлая' },
  { id: 'aurora-dark', label: 'Северное сияние · Тёмная' }
];
export const DEFAULT_DICTIONARY_THEME = 'classic-dark';

export function normalizeDictionaryTheme(value) {
  return DICTIONARY_THEMES.some(({ id }) => id === value)
    ? value
    : DEFAULT_DICTIONARY_THEME;
}

export function normalizeDictionaryFontSize(value) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return DEFAULT_DICTIONARY_FONT_SIZE;
  return Math.max(12, Math.min(24, Math.round(parsedValue)));
}

export function normalizeInterfaceFontScale(value) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return DEFAULT_INTERFACE_FONT_SCALE;
  return Math.max(80, Math.min(140, Math.round(parsedValue / 5) * 5));
}

export function normalizeContentFontSize(value) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return DEFAULT_CONTENT_FONT_SIZE;
  return Math.max(18, Math.min(48, Math.round(parsedValue)));
}

export function normalizeAdditionalFontSize(value) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return DEFAULT_ADDITIONAL_FONT_SIZE;
  return Math.max(12, Math.min(28, Math.round(parsedValue)));
}

export function normalizeSpeechVoiceURI(value) {
  return typeof value === 'string' ? value : DEFAULT_SPEECH_VOICE_URI;
}

export function normalizeRefreshButtonPosition(value) {
  if (!value || typeof value !== 'object') return null;
  const { x, y } = value;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y))
  };
}
