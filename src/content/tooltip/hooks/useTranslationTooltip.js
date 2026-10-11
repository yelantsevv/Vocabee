import { useCallback, useEffect, useRef, useState } from 'react';

const initialTooltip = { visible: false, text: '', details: null, loading: false, anchorRect: null };

export function useTranslationTooltip(app) {
  const [tooltip, setTooltip] = useState(initialTooltip);
  const [feedback, setFeedback] = useState('');
  const [studyStatus, setStudyStatus] = useState('');
  const [addStatus, setAddStatus] = useState('');
  const hideTimer = useRef(null);
  const activeRequest = useRef(0);
  const pointerInside = useRef(false);

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
    setStudyStatus('');
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

  function saveWord(messageType, setActionStatus, loadingLabel, idleLabel) {
    const translatedText = tooltip.details?.translated || '';
    if (!translatedText || translatedText === 'Перевод недоступен') return;
    setActionStatus(loadingLabel);
    setFeedback('');
    chrome.runtime.sendMessage({
      type: messageType,
      word: {
        sourceText: tooltip.text,
        translatedText,
        sourceLang: app.state.sourceLang,
        targetLang: app.state.lang
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not send dictionary request', chrome.runtime.lastError.message);
        setActionStatus(idleLabel);
        setFeedback('Не удалось связаться с Vocabee. Попробуйте ещё раз.');
        return;
      }
      if (!response?.ok) {
        setActionStatus(idleLabel);
        setFeedback(response?.error || 'Не удалось сохранить слово.');
        return;
      }
      if (messageType === 'START_DICTIONARY_WORD_LEARNING') {
        const status = response.alreadyLearned
          ? 'Уже выучено ✓'
          : response.alreadyLearning ? 'Уже изучается ✓' : 'Добавлено в обучение ✓';
        setActionStatus(status);
        setFeedback(response.alreadyLearned
          ? 'Это слово уже выучено.'
          : response.alreadyLearning ? 'Слово уже добавлено в обучение.' : 'Слово добавлено в обучение.');
      } else {
        setActionStatus(response.duplicate ? 'Уже в словаре ✓' : 'Добавлено ✓');
        setFeedback(response.duplicate ? 'Это слово уже сохранено.' : 'Слово сохранено.');
      }
      app.refreshDictionaryView?.();
    });
  }

  function startLearning() {
    saveWord('START_DICTIONARY_WORD_LEARNING', setStudyStatus, 'Добавляю…', 'Изучать');
  }

  function addToDictionary() {
    saveWord('ADD_DICTIONARY_WORD', setAddStatus, 'Сохраняю…', 'Добавить в словарь');
  }

  return {
    tooltip,
    feedback,
    studyStatus,
    addStatus,
    pointerInside,
    hideTimer,
    hideTooltip,
    scheduleTooltipHide,
    showTranslationPopup,
    startLearning,
    addToDictionary,
    setPointerInside: (value) => { pointerInside.current = value; }
  };
}
