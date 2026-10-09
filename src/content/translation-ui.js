(function (app) {
  let activeRequest = 0;
  let hideTimer;
  let currentUtterance = null;

  function buildTooltipHtml(text, details, loading = false) {
    const canSpeak = typeof window.speechSynthesis !== 'undefined';
    const hasTranslation = details?.translated && details.translated !== 'Перевод недоступен';
    const targetLanguageOptions = app.targetLanguages.map((language) => `
      <option value="${language}" ${app.state.lang === language ? 'selected' : ''}>
        ${app.languageNames[language]}
      </option>
    `).join('');

    return `
      <header class="vocabee-panel-header">
        <div>
          <div class="vocabee-language">
            ${app.languageNames[app.state.sourceLang] || 'Английский'}
            <span>→</span>
            <select class="vocabee-target-language" aria-label="Язык перевода">${targetLanguageOptions}</select>
          </div>
          <div class="vocabee-word-row">
            <div class="vocabee-title">${app.escapeHtml(text)}</div>
            <button class="vocabee-speak" type="button" data-speech="source" aria-label="Озвучить исходный текст" ${loading || !canSpeak ? 'disabled' : ''}>🔊</button>
          </div>
          ${details?.pronunciation ? `<div class="vocabee-pronunciation">${app.escapeHtml(details.pronunciation)}</div>` : ''}
        </div>
        <button class="vocabee-close" type="button" aria-label="Закрыть перевод">×</button>
      </header>
      <div class="vocabee-translation-row">
        <div class="vocabee-translation">${loading ? 'Перевожу…' : app.escapeHtml(details?.translated || 'Перевод недоступен')}</div>
        <button class="vocabee-speak" type="button" data-speech="translation" aria-label="Озвучить перевод" ${loading || !canSpeak || !hasTranslation ? 'disabled' : ''}>🔊</button>
      </div>
      <footer class="vocabee-panel-footer">
        <span>${loading ? 'Запрос к Google Translate' : 'Vocabee'}</span>
        <div class="vocabee-actions">
          <button class="vocabee-copy" type="button" ${loading ? 'disabled' : ''}>Копировать</button>
          <button class="vocabee-add-to-dictionary" type="button" ${loading || !hasTranslation ? 'disabled' : ''}>Добавить в словарь</button>
          <span class="vocabee-save-feedback" role="status" aria-live="polite"></span>
        </div>
      </footer>
    `;
  }

  function addToDictionary(tooltip, button) {
    const sourceText = tooltip.querySelector('.vocabee-title')?.textContent?.trim() || '';
    const translatedText = tooltip.querySelector('.vocabee-translation')?.textContent?.trim() || '';
    const feedback = tooltip.querySelector('.vocabee-save-feedback');
    const originalLabel = 'Добавить в словарь';

    button.disabled = true;
    button.textContent = 'Сохраняю…';
    feedback.textContent = '';

    chrome.runtime.sendMessage({
      type: 'ADD_DICTIONARY_WORD',
      word: {
        sourceText,
        translatedText,
        sourceLang: app.state.sourceLang,
        targetLang: app.state.lang
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not send dictionary request', chrome.runtime.lastError.message);
        button.disabled = false;
        button.textContent = originalLabel;
        feedback.textContent = 'Не удалось связаться с Vocabee. Попробуйте ещё раз.';
        return;
      }

      if (!response?.ok) {
        button.disabled = false;
        button.textContent = originalLabel;
        feedback.textContent = response?.error || 'Не удалось сохранить слово.';
        return;
      }

      button.textContent = response.duplicate ? 'Уже в словаре ✓' : 'Добавлено ✓';
      feedback.textContent = response.duplicate ? 'Это слово уже сохранено.' : 'Слово сохранено.';
      app.refreshDictionaryView?.();
    });
  }

  function speakText(text, language) {
    if (typeof window.speechSynthesis === 'undefined' || !text) return;

    window.speechSynthesis.cancel();
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = language;
    currentUtterance.rate = 0.95;
    currentUtterance.onerror = (event) => {
      console.warn('Vocabee: translation speech failed', event.error);
      currentUtterance = null;
    };
    currentUtterance.onend = () => {
      currentUtterance = null;
    };
    window.speechSynthesis.speak(currentUtterance);
  }

  function positionTooltip(tooltip, anchorRect) {
    const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    const playerBounds = player?.getBoundingClientRect();
    const bounds = playerBounds && playerBounds.width > 0
      ? playerBounds
      : {
          left: 0,
          top: 0,
          right: window.innerWidth,
          bottom: window.innerHeight,
          width: window.innerWidth,
          height: window.innerHeight
        };
    const padding = 8;
    const anchorGap = 0;
    const width = Math.min(360, bounds.width - padding * 2);
    const maxHeight = Math.max(120, bounds.height - padding * 2);
    const preferredHeight = Math.min(280, maxHeight);

    tooltip.style.width = `${width}px`;
    tooltip.style.maxHeight = `${maxHeight}px`;
    tooltip.style.overflowY = 'auto';

    const tooltipHeight = tooltip.getBoundingClientRect().height;
    const centeredLeft = anchorRect.left + (anchorRect.width - width) / 2;
    const left = Math.max(bounds.left + padding, Math.min(centeredLeft, bounds.right - width - padding));
    const top = Math.max(
      bounds.top + padding,
      anchorRect.top - Math.min(tooltipHeight, preferredHeight) - anchorGap
    );

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function makeTooltip() {
    const existing = document.getElementById('vocabee-tooltip');
    if (existing) return existing;

    const tooltip = document.createElement('div');
    tooltip.id = 'vocabee-tooltip';
    tooltip.className = 'vocabee-tooltip';
    document.body.appendChild(tooltip);

    tooltip.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      tooltip.dataset.pointerInside = 'true';
    });
    tooltip.addEventListener('mouseleave', () => {
      tooltip.dataset.pointerInside = 'false';
      app.scheduleTooltipHide();
    });
    tooltip.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('.vocabee-close')) {
        app.hideTooltip(true);
        return;
      }
      if (event.target.closest('.vocabee-copy')) {
        const source = tooltip.querySelector('.vocabee-title')?.textContent || '';
        const translation = tooltip.querySelector('.vocabee-translation')?.textContent || '';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(`${source} - ${translation}`).catch((error) => {
            console.warn('Vocabee: could not copy translation', error);
          });
        }
        return;
      }
      const addButton = event.target.closest('.vocabee-add-to-dictionary');
      if (addButton && !addButton.disabled) {
        addToDictionary(tooltip, addButton);
        return;
      }
      if (event.target.closest('.vocabee-target-language')) return;
      const button = event.target.closest('.vocabee-speak');
      if (button) {
        const isSource = button.dataset.speech === 'source';
        const text = tooltip.querySelector(isSource ? '.vocabee-title' : '.vocabee-translation')?.textContent || '';
        speakText(text, isSource ? app.state.sourceLang : app.state.lang || 'ru');
      }
    });
    tooltip.addEventListener('change', (event) => {
      if (!(event.target instanceof HTMLSelectElement) || !event.target.matches('.vocabee-target-language')) return;

      const text = tooltip.dataset.sourceText;
      const anchorRect = {
        left: Number(tooltip.dataset.anchorLeft),
        top: Number(tooltip.dataset.anchorTop),
        right: Number(tooltip.dataset.anchorRight),
        bottom: Number(tooltip.dataset.anchorBottom),
        width: Number(tooltip.dataset.anchorWidth),
        height: Number(tooltip.dataset.anchorHeight)
      };

      try {
        app.setTargetLanguage(event.target.value);
      } catch (error) {
        console.error('Vocabee: could not change target language', error);
        return;
      }

      if (text && Number.isFinite(anchorRect.left) && Number.isFinite(anchorRect.top)) {
        app.showTranslationPopup(text, anchorRect);
      }
    });

    return tooltip;
  }

  app.showTranslationPopup = async function (text, anchorRect, anchorElement = null) {
    if (!app.state.enabled) return;

    clearTimeout(hideTimer);
    const requestId = ++activeRequest;
    const tooltip = makeTooltip();
    const phrase = app.normalizeText(text);
    const alreadyVisible = tooltip.classList.contains('visible');
    tooltip.dataset.sourceText = phrase;
    tooltip.dataset.anchorLeft = String(anchorRect.left);
    tooltip.dataset.anchorTop = String(anchorRect.top);
    tooltip.dataset.anchorRight = String(anchorRect.right);
    tooltip.dataset.anchorBottom = String(anchorRect.bottom);
    tooltip.dataset.anchorWidth = String(anchorRect.width);
    tooltip.dataset.anchorHeight = String(anchorRect.height);
    tooltip.innerHTML = buildTooltipHtml(phrase, null, true);
    if (!alreadyVisible) tooltip.dataset.pointerInside = 'false';
    positionTooltip(tooltip, anchorRect);
    tooltip.classList.add('visible');

    if (anchorElement) anchorElement.dataset.tooltipVisible = 'true';
    const translation = await app.getTranslation(phrase);
    if (requestId !== activeRequest || !tooltip.classList.contains('visible')) return;
    tooltip.innerHTML = buildTooltipHtml(phrase, translation);
    positionTooltip(tooltip, anchorRect);
  };

  app.showWordTooltip = function (wordElement) {
    const selectedText = app.getSelectedTextInfo();
    if (selectedText) {
      app.showTranslationPopup(selectedText.text, selectedText.rect);
      return;
    }
    app.showTranslationPopup(wordElement.dataset.word, wordElement.getBoundingClientRect(), wordElement);
  };

  app.scheduleTooltipHide = function () {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => app.hideTooltip(), 300);
  };

  app.hideTooltip = function (force = false) {
    const tooltip = document.getElementById('vocabee-tooltip');
    if (!tooltip || (!force && tooltip.dataset.pointerInside === 'true')) return;

    clearTimeout(hideTimer);
    activeRequest++;
    tooltip.classList.remove('visible');
    if (currentUtterance && typeof window.speechSynthesis !== 'undefined') {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    }

    document.querySelectorAll('.vocabee-word').forEach((element) => {
      element.dataset.tooltipVisible = 'false';
    });
  };
})(globalThis.Vocabee);
