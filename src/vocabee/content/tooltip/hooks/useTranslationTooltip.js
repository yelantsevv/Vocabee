import { useCallback, useEffect, useRef, useState } from 'react';

const initialTooltip = { visible: false, text: '', details: null, loading: false, anchorRect: null, fontSize: 16 };

function isExtensionContextValid() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch (_error) {
    return false;
  }
}

export function useTranslationTooltip(app) {
  const [tooltip, setTooltip] = useState(initialTooltip);
  const [isAdded, setIsAdded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hideTimer = useRef(null);
  const activeRequest = useRef(0);
  const pointerInside = useRef(false);
  const savedEntries = useRef(null);

  const wordIsSaved = useCallback((entries, text) => {
    const sourceLanguage = app.state.sourceLang;
    const normalizedText = text.toLocaleLowerCase(sourceLanguage);
    return entries.some((entry) => (
      entry.word?.toLocaleLowerCase(sourceLanguage) === normalizedText
      && (entry.source_language || sourceLanguage) === sourceLanguage
      && (entry.target_language || 'ru') === app.state.lang
    ));
  }, [app]);

  const loadSavedEntries = useCallback((onLoaded) => {
    if (savedEntries.current) {
      onLoaded(savedEntries.current);
      return;
    }
    if (!isExtensionContextValid()) {
      onLoaded([]);
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: 'GET_MY_VOCABEE_DICTIONARY' }, (response) => {
        if (!isExtensionContextValid() || chrome.runtime.lastError || !response?.ok) {
          onLoaded([]);
          return;
        }
        savedEntries.current = response.entries || [];
        onLoaded(savedEntries.current);
      });
    } catch (_error) {
      onLoaded([]);
    }
  }, [app]);

  const hideTooltip = useCallback((force = false) => {
    if (!force && pointerInside.current) return;
    clearTimeout(hideTimer.current);
    activeRequest.current += 1;
    pointerInside.current = false;
    setTooltip((current) => ({ ...current, visible: false }));
    document.querySelectorAll('.vocabee-word').forEach((element) => {
      element.dataset.tooltipVisible = 'false';
    });
  }, []);

  const showTranslationPopup = useCallback(async (text, anchorRect, anchorElement = null, sourceFontSize = null) => {
    if (!app.state.enabled) return;
    clearTimeout(hideTimer.current);
    const requestId = ++activeRequest.current;
    const phrase = app.normalizeText(text);
    const safeRect = {
      left: anchorRect.left,
      top: anchorRect.top,
      right: anchorRect.right,
      bottom: anchorRect.bottom,
      width: anchorRect.width,
      height: anchorRect.height
    };
    const anchorFontSize = anchorElement
      ? Number.parseFloat(getComputedStyle(anchorElement).fontSize)
      : Number.parseFloat(sourceFontSize);
    pointerInside.current = false;
    setIsAdded(false);
    setIsSaving(false);
    setTooltip({
      visible: true,
      text: phrase,
      details: null,
      loading: true,
      anchorRect: safeRect,
      fontSize: Number.isFinite(anchorFontSize) ? anchorFontSize : 16
    });
    loadSavedEntries((entries) => {
      if (requestId === activeRequest.current) setIsAdded(wordIsSaved(entries, phrase));
    });
    if (anchorElement) anchorElement.dataset.tooltipVisible = 'true';
    const translation = await app.getTranslation(phrase);
    if (requestId !== activeRequest.current) return;
    setTooltip((current) => ({ ...current, details: translation, loading: false }));
  }, [app, loadSavedEntries, wordIsSaved]);

  const scheduleTooltipHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => hideTooltip(), 300);
  }, [hideTooltip]);

  const showWordTooltip = useCallback((wordElement) => {
    const selectedText = app.getSelectedTextInfo();
    if (selectedText) {
      showTranslationPopup(selectedText.text, selectedText.rect, null, selectedText.fontSize);
      return;
    }
    showTranslationPopup(wordElement.dataset.word, wordElement.getBoundingClientRect(), wordElement);
  }, [app, showTranslationPopup]);

  useEffect(() => {
    app.showTranslationPopup = showTranslationPopup;
    app.showWordTooltip = showWordTooltip;
    app.scheduleTooltipHide = scheduleTooltipHide;
    app.hideTooltip = hideTooltip;
    return () => {
      clearTimeout(hideTimer.current);
      if (app.showTranslationPopup === showTranslationPopup) delete app.showTranslationPopup;
      if (app.showWordTooltip === showWordTooltip) delete app.showWordTooltip;
      if (app.scheduleTooltipHide === scheduleTooltipHide) delete app.scheduleTooltipHide;
      if (app.hideTooltip === hideTooltip) delete app.hideTooltip;
    };
  }, [app, hideTooltip, scheduleTooltipHide, showTranslationPopup, showWordTooltip]);

  function addToDictionary() {
    const translatedText = tooltip.details?.translated || '';
    if (!translatedText || translatedText === 'Перевод недоступен' || isSaving || isAdded) return;
    if (!isExtensionContextValid()) return;
    setIsSaving(true);
    try {
      chrome.runtime.sendMessage({
      type: 'ADD_DICTIONARY_WORD',
      word: {
        sourceText: tooltip.text,
        translatedText,
        sourceLang: app.state.sourceLang,
        targetLang: app.state.lang
      }
      }, (response) => {
        if (!isExtensionContextValid() || chrome.runtime.lastError) {
          setIsSaving(false);
          return;
        }
        if (!response?.ok) {
          console.error('Vocabee: could not add word to dictionary', response?.error || 'Unknown error');
          setIsSaving(false);
          return;
        }
        savedEntries.current = null;
        setIsAdded(true);
        setIsSaving(false);
        app.refreshDictionaryView?.();
      });
    } catch (_error) {
      setIsSaving(false);
    }
  }

  return {
    tooltip,
    isAdded,
    isSaving,
    pointerInside,
    hideTimer,
    hideTooltip,
    scheduleTooltipHide,
    showTranslationPopup,
    addToDictionary,
    setPointerInside: (value) => { pointerInside.current = value; }
  };
}
