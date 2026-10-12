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
