export const DEFAULT_DICTIONARY_FONT_SIZE = 16;
export const DEFAULT_INTERFACE_FONT_SCALE = 100;

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

export function getDefaultPosition() {
  const panelWidth = Math.min(320, window.innerWidth - 16);
  return {
    x: Math.max(8, window.innerWidth - panelWidth - 24),
    y: 24
  };
}

export function getLanguagePairs(words, app, fallbackSource, fallbackTarget) {
  if (!words.length) {
    return [`${app.languageNames[fallbackSource] || fallbackSource} → ${app.languageNames[fallbackTarget] || fallbackTarget}`];
  }

  return [...new Set(words.map((word) =>
    `${app.languageNames[word.sourceLang] || word.sourceLang} → ${app.languageNames[word.targetLang] || word.targetLang}`
  ))];
}
