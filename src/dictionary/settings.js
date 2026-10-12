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
