import { useCallback, useEffect, useRef, useState } from 'react';

const initialTooltip = { visible: false, text: '', details: null, loading: false, anchorRect: null };

export function useTranslationTooltip(app) {
  const [tooltip, setTooltip] = useState(initialTooltip);
  const [feedback, setFeedback] = useState('');
  const [addStatus, setAddStatus] = useState('');
  const hideTimer = useRef(null);
  const activeRequest = useRef(0);
  const pointerInside = useRef(false);
  const currentUtterance = useRef(null);

  const hideTooltip = useCallback((force = false) => {
    if (!force && pointerInside.current) return;
    clearTimeout(hideTimer.current);
    activeRequest.current += 1;
    pointerInside.current = false;
    setTooltip((current) => ({ ...current, visible: false }));
    if (currentUtterance.current && typeof window.speechSynthesis !== 'undefined') {
      window.speechSynthesis.cancel();
      currentUtterance.current = null;
    }
    document.querySelectorAll('.vocabee-word').forEach((element) => {
      element.dataset.tooltipVisible = 'false';
    });
  }, []);

  const showTranslationPopup = useCallback(async (text, anchorRect, anchorElement = null) => {
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
    pointerInside.current = false;
    setFeedback('');
    setAddStatus('');
    setTooltip({ visible: true, text: phrase, details: null, loading: true, anchorRect: safeRect });
    if (anchorElement) anchorElement.dataset.tooltipVisible = 'true';
    const translation = await app.getTranslation(phrase);
    if (requestId !== activeRequest.current) return;
    setTooltip((current) => ({ ...current, details: translation, loading: false }));
  }, [app]);

  const scheduleTooltipHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => hideTooltip(), 300);
  }, [hideTooltip]);

  const showWordTooltip = useCallback((wordElement) => {
    const selectedText = app.getSelectedTextInfo();
    if (selectedText) {
      showTranslationPopup(selectedText.text, selectedText.rect);
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
    if (!translatedText || translatedText === 'Перевод недоступен') return;
    setAddStatus('Сохраняю…');
    setFeedback('');
    chrome.runtime.sendMessage({
      type: 'ADD_DICTIONARY_WORD',
      word: {
        sourceText: tooltip.text,
        translatedText,
        sourceLang: app.state.sourceLang,
        targetLang: app.state.lang
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not send dictionary request', chrome.runtime.lastError.message);
        setAddStatus('Добавить в словарь');
        setFeedback('Не удалось связаться с Vocabee. Попробуйте ещё раз.');
        return;
      }
      if (!response?.ok) {
        setAddStatus('Добавить в словарь');
        setFeedback(response?.error || 'Не удалось сохранить слово.');
        return;
      }
      setAddStatus(response.duplicate ? 'Уже в словаре ✓' : 'Добавлено ✓');
      setFeedback(response.duplicate ? 'Это слово уже сохранено.' : 'Слово сохранено.');
      app.refreshDictionaryView?.();
    });
  }

  function changeTargetLanguage(language) {
    try {
      app.setTargetLanguage(language);
      showTranslationPopup(tooltip.text, tooltip.anchorRect);
    } catch (error) {
      console.error('Vocabee: could not change target language', error);
    }
  }

  function copyTranslation() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(`${tooltip.text} - ${tooltip.details?.translated || ''}`).catch((error) => {
      console.warn('Vocabee: could not copy translation', error);
    });
  }

  function speakText(text, language) {
    if (typeof window.speechSynthesis === 'undefined' || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.95;
    utterance.onerror = (event) => {
      console.warn('Vocabee: translation speech failed', event.error);
      currentUtterance.current = null;
    };
    utterance.onend = () => {
      currentUtterance.current = null;
    };
    currentUtterance.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  return {
    tooltip,
    feedback,
    addStatus,
    pointerInside,
    hideTimer,
    hideTooltip,
    scheduleTooltipHide,
    showTranslationPopup,
    addToDictionary,
    changeTargetLanguage,
    copyTranslation,
    speakText,
    setPointerInside: (value) => { pointerInside.current = value; }
  };
}
