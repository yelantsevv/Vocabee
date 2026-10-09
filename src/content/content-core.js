globalThis.Vocabee = globalThis.Vocabee || {};

(function (app) {
  const API_URL = 'https://translate.googleapis.com/translate_a/single';
  const translationCache = new Map();

  app.storage = chrome.storage.sync || chrome.storage.local;
  app.state = { enabled: true, lang: 'ru', sourceLang: 'en' };
  app.detectedCaptionLanguage = null;
  app.languageNames = {
    en: 'Английский',
    de: 'Немецкий',
    ru: 'Русский',
    uk: 'Украинский'
  };
  app.targetLanguages = ['en', 'ru', 'uk', 'de'];

  app.escapeHtml = function (value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  app.normalizeText = function (text) {
    return String(text || '').trim().replace(/\s+/g, ' ');
  };

  function getCachedTranslation(text) {
    const normalized = app.normalizeText(text).toLowerCase();
    if (!normalized || !/\p{Script=Latin}/u.test(normalized)) return null;
    const cacheKey = `${app.state.sourceLang}:${app.state.lang || 'ru'}:${normalized}`;
    return translationCache.get(cacheKey) || null;
  }

  async function fetchTranslation(text) {
    const normalized = app.normalizeText(text);
    if (!normalized || !/\p{Script=Latin}/u.test(normalized)) return null;

    const cached = getCachedTranslation(normalized);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: app.state.sourceLang,
        tl: app.state.lang || 'ru',
        q: normalized
      });
      params.append('dt', 't');
      const url = new URL(API_URL);
      url.search = params.toString();

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Google Translate request failed: ${response.status}`);
      const data = await response.json();
      const translated = Array.isArray(data?.[0])
        ? data[0].map((segment) => segment?.[0] || '').join('')
        : '';
      const pronunciation = data?.[0]?.find((segment) => segment?.[2])?.[2] || '';

      if (!translated) return null;

      const result = { translated, pronunciation };
      translationCache.set(
        `${app.state.sourceLang}:${app.state.lang || 'ru'}:${normalized.toLowerCase()}`,
        result
      );
      return result;
    } catch (error) {
      console.warn('Vocabee: Google Translate request failed', error);
      return null;
    }
  }

  app.getTranslation = async function (text) {
    const normalized = app.normalizeText(text);
    if (!normalized) return null;

    const cached = getCachedTranslation(normalized);
    if (cached) return cached;

    return await fetchTranslation(normalized) || {
      translated: 'Перевод недоступен',
      pronunciation: ''
    };
  };

  app.clearTranslationCache = function () {
    translationCache.clear();
  };

  app.setTargetLanguage = function (language) {
    if (!app.targetLanguages.includes(language)) {
      throw new Error(`Unsupported target language: ${language}`);
    }

    app.state.lang = language;
    app.clearTranslationCache();
    app.storage.set({ lang: language }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save target language', chrome.runtime.lastError.message);
      }
    });
  };
})(globalThis.Vocabee);
