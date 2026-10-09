(function (app) {
  function getDefaultPosition() {
    const panelWidth = Math.min(320, window.innerWidth - 16);
    return {
      x: Math.max(8, window.innerWidth - panelWidth - 24),
      y: 24
    };
  }

  let panel;
  let panelState = {
    visible: false,
    minimized: false,
    activeView: 'dictionary',
    ...getDefaultPosition()
  };
  let positionSaveTimer;
  let dictionaryFontSizeSaveTimer;
  let interfaceFontScaleSaveTimer;
  let dictionaryFontSize = 16;
  let interfaceFontScale = 100;

  function normalizeDictionaryFontSize(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return 16;
    return Math.max(12, Math.min(24, Math.round(parsedValue)));
  }

  function applyDictionaryFontSize(value) {
    dictionaryFontSize = normalizeDictionaryFontSize(value);
    const sizeInput = panel.querySelector('#vocabee-dictionary-font-size');
    const sizeValue = panel.querySelector('.vocabee-dictionary-font-size-value');
    sizeInput.value = String(dictionaryFontSize);
    sizeValue.textContent = `${dictionaryFontSize} px`;
    panel.style.setProperty('--vocabee-dictionary-font-size', `${dictionaryFontSize}px`);
  }

  function saveDictionaryFontSize() {
    clearTimeout(dictionaryFontSizeSaveTimer);
    app.storage.set({ dictionaryFontSize }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save dictionary font size', chrome.runtime.lastError.message);
      }
    });
  }

  function normalizeInterfaceFontScale(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return 100;
    return Math.max(80, Math.min(140, Math.round(parsedValue / 5) * 5));
  }

  function applyInterfaceFontScale(value) {
    interfaceFontScale = normalizeInterfaceFontScale(value);
    const sizeInput = panel.querySelector('#vocabee-interface-font-scale');
    const sizeValue = panel.querySelector('.vocabee-interface-font-scale-value');
    sizeInput.value = String(interfaceFontScale);
    sizeValue.textContent = `${interfaceFontScale}%`;
    panel.style.setProperty('--vocabee-ui-font-scale', String(interfaceFontScale / 100));
  }

  function saveInterfaceFontScale() {
    clearTimeout(interfaceFontScaleSaveTimer);
    app.storage.set({ interfaceFontScale }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save interface font scale', chrome.runtime.lastError.message);
      }
    });
  }

  function clampPosition(x, y) {
    const bounds = panel.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - Math.min(bounds.height, 48) - 8))
    };
  }

  function applyState() {
    const maxWidth = Math.max(1, window.innerWidth - 16);
    const maxHeight = Math.max(1, window.innerHeight - 16);
    if (Number.isFinite(panelState.width)) {
      panelState.width = Math.max(Math.min(280, maxWidth), Math.min(panelState.width, maxWidth));
    }
    if (Number.isFinite(panelState.height)) {
      panelState.height = Math.max(Math.min(200, maxHeight), Math.min(panelState.height, maxHeight));
    }
    panel.hidden = false;
    panel.style.visibility = panelState.visible ? '' : 'hidden';
    panel.classList.toggle('is-minimized', panelState.minimized);
    panel.classList.toggle('has-custom-size', Number.isFinite(panelState.width) && Number.isFinite(panelState.height));
    panel.style.width = Number.isFinite(panelState.width) ? `${panelState.width}px` : '';
    panel.style.height = !panelState.minimized && Number.isFinite(panelState.height)
      ? `${panelState.height}px`
      : '';
    panel.style.left = `${panelState.x}px`;
    panel.style.top = `${panelState.y}px`;
    const position = clampPosition(panelState.x, panelState.y);
    panelState = { ...panelState, ...position };
    panel.style.left = `${panelState.x}px`;
    panel.style.top = `${panelState.y}px`;
    panel.querySelectorAll('[data-panel-content]').forEach((view) => {
      view.hidden = view.dataset.panelContent !== panelState.activeView;
    });
    panel.hidden = !panelState.visible;
    panel.style.visibility = '';
    panel.querySelector('.vocabee-panel-minimize').setAttribute(
      'aria-label',
      panelState.minimized ? 'Развернуть панель' : 'Свернуть панель'
    );
    panel.querySelector('.vocabee-panel-minimize').textContent = panelState.minimized ? '+' : '−';
    panel.querySelectorAll('[data-panel-target]').forEach((button) => {
      const isActive = button.dataset.panelTarget === panelState.activeView;
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function saveState() {
    app.storage.set({ vocabeePanel: panelState }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save panel state', chrome.runtime.lastError.message);
      }
    });
  }

  function updateSourceLanguage() {
    app.updateDetectedSourceLanguage();
    const language = app.detectedCaptionLanguage
      ? app.languageNames[app.detectedCaptionLanguage]
      : 'Не найден';
    const languageLabel = panel.querySelector('.vocabee-panel-source-language');
    if (languageLabel.textContent !== language) {
      languageLabel.textContent = language;
    }
  }
  app.refreshFloatingPanelLanguage = updateSourceLanguage;

  function buildPanel() {
    panel = document.createElement('section');
    panel.className = 'vocabee-floating-panel';
    panel.setAttribute('aria-label', 'Vocabee');
    panel.hidden = true;
    panel.innerHTML = `
      <header class="vocabee-floating-header">
        <button class="vocabee-panel-home" type="button" aria-label="Открыть словарь">
          <span class="vocabee-panel-brand-mark" aria-hidden="true">V</span>
          <span class="vocabee-panel-brand">Vocabee</span>
        </button>
        <button class="vocabee-panel-control vocabee-panel-section-switch" type="button" data-panel-target="dictionary" aria-label="Мой словарь" title="Мой словарь">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H17a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V5.5Zm3-.5a.5.5 0 0 0-.5.5v10.6c.16-.06.33-.1.5-.1h11V6a1 1 0 0 0-1-1H7Z"/><path d="M9 8h7v1.8H9zm0 4h7v1.8H9z"/></svg>
        </button>
        <button class="vocabee-panel-control vocabee-panel-section-switch" type="button" data-panel-target="settings" aria-label="Настройки" title="Настройки">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.8 7.8 0 0 0 0-2l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L15 3h-4l-.4 2.9a8 8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1L11 22h4l.4-2.9a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2.1-1.6ZM13 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" transform="translate(-1 -0.5) scale(.96)"/></svg>
        </button>
        <button class="vocabee-panel-control vocabee-panel-minimize" type="button">−</button>
        <button class="vocabee-panel-control vocabee-panel-close" type="button" aria-label="Закрыть панель">×</button>
      </header>
      <div class="vocabee-floating-content">
        <section class="vocabee-panel-view" data-panel-content="settings" hidden>
          <label class="vocabee-floating-row vocabee-floating-toggle" for="vocabee-panel-enabled">
            <span class="vocabee-floating-label">
              <strong>Перевод</strong>
              <small>Слова и фразы на YouTube</small>
            </span>
            <input type="checkbox" id="vocabee-panel-enabled" />
            <span class="vocabee-floating-switch" aria-hidden="true"></span>
          </label>
          <div class="vocabee-floating-row">
            <span class="vocabee-floating-label">
              <strong>Язык субтитров</strong>
              <small>Определяется автоматически</small>
            </span>
            <span class="vocabee-panel-source-language">Не найден</span>
          </div>
          <label class="vocabee-floating-row" for="vocabee-panel-language">
            <span class="vocabee-floating-label"><strong>Переводить на</strong></span>
            <select id="vocabee-panel-language" aria-label="Язык перевода">
              ${app.targetLanguages.map((language) =>
                `<option value="${language}">${app.languageNames[language]}</option>`
              ).join('')}
            </select>
          </label>
          <div class="vocabee-font-setting">
            <label class="vocabee-font-setting-label" for="vocabee-interface-font-scale">
              <strong>Размер текста интерфейса</strong>
              <output class="vocabee-font-setting-value vocabee-interface-font-scale-value" for="vocabee-interface-font-scale">100%</output>
            </label>
            <input id="vocabee-interface-font-scale" type="range" min="80" max="140" step="5" value="100" />
            <p class="vocabee-font-setting-preview">Пример текста интерфейса</p>
          </div>
          <div class="vocabee-font-setting">
            <label class="vocabee-font-setting-label" for="vocabee-dictionary-font-size">
              <strong>Размер текста словаря</strong>
              <output class="vocabee-font-setting-value vocabee-dictionary-font-size-value" for="vocabee-dictionary-font-size">16 px</output>
            </label>
            <input id="vocabee-dictionary-font-size" type="range" min="12" max="24" step="1" value="16" />
            <p class="vocabee-font-setting-preview vocabee-dictionary-font-preview">Пример текста словаря</p>
          </div>
          <p class="vocabee-panel-footer">
            Поддерживаются английские и немецкие субтитры
          </p>
        </section>
        <section class="vocabee-panel-view" data-panel-content="dictionary">
          <div class="vocabee-dictionary-heading">
            <h2 class="vocabee-dictionary-title">Мой словарь</h2>
            <p class="vocabee-dictionary-language-pair"></p>
          </div>
          <div class="vocabee-dictionary">
            <p class="vocabee-dictionary-status" role="status" aria-live="polite">Загружаю словарь…</p>
            <ul class="vocabee-dictionary-list"></ul>
          </div>
          <p class="vocabee-dictionary-hint">Добавляй слова из карточки перевода на YouTube.</p>
        </section>
      </div>
      <div class="vocabee-panel-resize-handle" role="separator" aria-label="Изменить размер панели" title="Перетащите, чтобы изменить размер"></div>
    `;
    document.body.appendChild(panel);

    const enabledInput = panel.querySelector('#vocabee-panel-enabled');
    const languageSelect = panel.querySelector('#vocabee-panel-language');
    const dictionaryFontSizeInput = panel.querySelector('#vocabee-dictionary-font-size');
    const interfaceFontScaleInput = panel.querySelector('#vocabee-interface-font-scale');
    enabledInput.checked = app.state.enabled;
    languageSelect.value = app.state.lang;
    applyDictionaryFontSize(dictionaryFontSize);
    applyInterfaceFontScale(interfaceFontScale);

    enabledInput.addEventListener('change', () => {
      app.state.enabled = enabledInput.checked;
      app.storage.set({ enabled: app.state.enabled }, () => {
        if (chrome.runtime.lastError) {
          console.error('Vocabee: could not save translation setting', chrome.runtime.lastError.message);
        }
      });
    });

    languageSelect.addEventListener('change', () => {
      app.setTargetLanguage(languageSelect.value);
    });

    dictionaryFontSizeInput.addEventListener('input', () => {
      applyDictionaryFontSize(dictionaryFontSizeInput.value);
      clearTimeout(dictionaryFontSizeSaveTimer);
      dictionaryFontSizeSaveTimer = setTimeout(saveDictionaryFontSize, 1000);
    });
    dictionaryFontSizeInput.addEventListener('change', saveDictionaryFontSize);

    interfaceFontScaleInput.addEventListener('input', () => {
      applyInterfaceFontScale(interfaceFontScaleInput.value);
      clearTimeout(interfaceFontScaleSaveTimer);
      interfaceFontScaleSaveTimer = setTimeout(saveInterfaceFontScale, 1000);
    });
    interfaceFontScaleInput.addEventListener('change', saveInterfaceFontScale);

    panel.querySelector('.vocabee-panel-home').addEventListener('click', () => {
      panelState.activeView = 'dictionary';
      panelState.minimized = false;
      applyState();
      saveState();
      loadDictionary();
    });

    panel.querySelectorAll('[data-panel-target]').forEach((button) => {
      button.addEventListener('click', () => {
        panelState.activeView = button.dataset.panelTarget;
        panelState.minimized = false;
        applyState();
        saveState();
        if (panelState.activeView === 'dictionary') loadDictionary();
      });
    });
    panel.querySelector('.vocabee-panel-minimize').addEventListener('click', () => {
      panelState.minimized = !panelState.minimized;
      applyState();
      saveState();
    });
    panel.querySelector('.vocabee-panel-close').addEventListener('click', () => {
      panelState.visible = false;
      applyState();
      saveState();
    });

    const dragHandle = panel.querySelector('.vocabee-floating-header');
    let dragOrigin;
    dragHandle.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      dragOrigin = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: panelState.x,
        y: panelState.y
      };
      dragHandle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    dragHandle.addEventListener('pointermove', (event) => {
      if (!dragOrigin || !dragHandle.hasPointerCapture(event.pointerId)) return;
      const nextPosition = clampPosition(
        dragOrigin.x + event.clientX - dragOrigin.pointerX,
        dragOrigin.y + event.clientY - dragOrigin.pointerY
      );
      panelState = { ...panelState, ...nextPosition };
      applyState();
    });
    dragHandle.addEventListener('pointerup', (event) => {
      if (!dragOrigin) return;
      dragOrigin = null;
      if (dragHandle.hasPointerCapture(event.pointerId)) {
        dragHandle.releasePointerCapture(event.pointerId);
      }
      saveState();
    });
    dragHandle.addEventListener('pointercancel', () => {
      dragOrigin = null;
      saveState();
    });

    const resizeHandle = panel.querySelector('.vocabee-panel-resize-handle');
    let resizeOrigin;
    resizeHandle.addEventListener('pointerdown', (event) => {
      if (panelState.minimized) return;
      const bounds = panel.getBoundingClientRect();
      resizeOrigin = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        width: bounds.width,
        height: bounds.height
      };
      resizeHandle.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    });
    resizeHandle.addEventListener('pointermove', (event) => {
      if (!resizeOrigin || !resizeHandle.hasPointerCapture(event.pointerId)) return;
      const maxWidth = Math.max(1, window.innerWidth - 16);
      const maxHeight = Math.max(1, window.innerHeight - 16);
      panelState.width = Math.max(
        Math.min(280, maxWidth),
        Math.min(maxWidth, resizeOrigin.width + event.clientX - resizeOrigin.pointerX)
      );
      panelState.height = Math.max(
        Math.min(200, maxHeight),
        Math.min(maxHeight, resizeOrigin.height + event.clientY - resizeOrigin.pointerY)
      );
      applyState();
      event.stopPropagation();
    });
    const finishResize = (event) => {
      if (!resizeOrigin) return;
      resizeOrigin = null;
      if (resizeHandle.hasPointerCapture(event.pointerId)) {
        resizeHandle.releasePointerCapture(event.pointerId);
      }
      saveState();
      event.stopPropagation();
    };
    resizeHandle.addEventListener('pointerup', finishResize);
    resizeHandle.addEventListener('pointercancel', finishResize);

    for (const eventName of ['pointerdown', 'pointerup', 'click', 'dblclick']) {
      panel.addEventListener(eventName, (event) => event.stopPropagation());
    }
  }

  function renderDictionary(words) {
    const list = panel.querySelector('.vocabee-dictionary-list');
    const status = panel.querySelector('.vocabee-dictionary-status');
    const languagePair = panel.querySelector('.vocabee-dictionary-language-pair');
    list.replaceChildren();

    const languagePairs = words.length
      ? [...new Set(words.map((word) =>
          `${app.languageNames[word.sourceLang] || word.sourceLang} → ${app.languageNames[word.targetLang] || word.targetLang}`
        ))]
      : [`${app.languageNames[app.detectedCaptionLanguage || app.state.sourceLang] || app.detectedCaptionLanguage || app.state.sourceLang} → ${app.languageNames[app.state.lang] || app.state.lang}`];
    languagePair.textContent = languagePairs.join(' · ');

    if (words.length === 0) {
      status.textContent = 'Пока нет сохранённых слов. Добавляй их из карточки перевода.';
      return;
    }

    status.textContent = `Сохранено слов: ${words.length}`;
    for (const word of words) {
      const item = document.createElement('li');
      item.className = 'vocabee-dictionary-item';

      const pair = document.createElement('div');
      pair.className = 'vocabee-dictionary-pair';

      const source = document.createElement('strong');
      source.className = 'vocabee-dictionary-source';
      source.textContent = word.sourceText;

      const translated = document.createElement('span');
      translated.className = 'vocabee-dictionary-translation';
      translated.textContent = word.translatedText;

      const details = document.createElement('small');
      details.className = 'vocabee-dictionary-details';
      const date = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' })
        .format(new Date(word.addedAt));
      details.textContent = date;

      pair.append(source, translated);
      item.append(pair, details);
      list.append(item);
    }
  }

  function loadDictionary() {
    const status = panel.querySelector('.vocabee-dictionary-status');
    const list = panel.querySelector('.vocabee-dictionary-list');
    status.textContent = 'Загружаю словарь…';
    list.replaceChildren();

    chrome.runtime.sendMessage({ type: 'GET_DICTIONARY_WORDS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not request dictionary', chrome.runtime.lastError.message);
        status.textContent = 'Не удалось загрузить словарь. Попробуйте открыть его снова.';
        return;
      }
      if (!response?.ok) {
        console.error('Vocabee: dictionary request failed', response?.error);
        status.textContent = response?.error || 'Не удалось загрузить словарь.';
        return;
      }
      renderDictionary(response.words);
    });
  }

  app.refreshDictionaryView = function () {
    if (panelState.activeView === 'dictionary') loadDictionary();
  };

  function togglePanel(sendResponse) {
    if (panelState.visible && !panelState.minimized) {
      panelState.visible = false;
    } else {
      if (!panelState.visible) panelState.activeView = 'dictionary';
      panelState.visible = true;
      panelState.minimized = false;
    }
    updateSourceLanguage();
    applyState();
    saveState();
    if (panelState.visible && panelState.activeView === 'dictionary') loadDictionary();
    sendResponse?.({ visible: panelState.visible });
  }

  buildPanel();
  app.storage.get({ vocabeePanel: panelState, dictionaryFontSize, interfaceFontScale }, (settings) => {
    if (chrome.runtime.lastError) {
      console.error('Vocabee: could not load panel state', chrome.runtime.lastError.message);
      return;
    }
    applyDictionaryFontSize(settings.dictionaryFontSize);
    applyInterfaceFontScale(settings.interfaceFontScale);
    const savedState = settings.vocabeePanel || {};
    const isOldDefaultPosition = savedState.x === 24 && savedState.y === 92;
    panelState = {
      ...panelState,
      ...savedState,
      width: Number.isFinite(savedState.width) ? savedState.width : undefined,
      height: Number.isFinite(savedState.height) ? savedState.height : undefined,
      activeView: savedState.activeView === 'settings' ? 'settings' : 'dictionary',
      ...(isOldDefaultPosition ? getDefaultPosition() : {})
    };
    applyState();
    updateSourceLanguage();
    if (panelState.visible && !panelState.minimized && panelState.activeView === 'dictionary') {
      loadDictionary();
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'TOGGLE_VOCABEE_PANEL') return false;
    togglePanel(sendResponse);
    return false;
  });

  app.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' && areaName !== 'local') return;
    if (changes.enabled) {
      app.state.enabled = Boolean(changes.enabled.newValue);
      panel.querySelector('#vocabee-panel-enabled').checked = app.state.enabled;
    }
    if (changes.lang) {
      app.state.lang = changes.lang.newValue || 'ru';
      panel.querySelector('#vocabee-panel-language').value = app.state.lang;
    }
    if (changes.dictionaryFontSize) {
      applyDictionaryFontSize(changes.dictionaryFontSize.newValue);
    }
    if (changes.interfaceFontScale) {
      applyInterfaceFontScale(changes.interfaceFontScale.newValue);
    }
  });

  window.addEventListener('resize', () => {
    applyState();
    clearTimeout(positionSaveTimer);
    positionSaveTimer = setTimeout(saveState, 150);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !panelState.visible) return;
    panelState.visible = false;
    applyState();
    saveState();
  });
})(globalThis.Vocabee);
