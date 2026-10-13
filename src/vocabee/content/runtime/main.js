(function (app) {
  if (app.mainInitialized) return;
  app.mainInitialized = true;

  function findCaptionNodes() {
    return [...new Set(Array.from(document.querySelectorAll('#ytp-caption-window-container .ytp-caption-segment')))].filter((node) => {
      const text = (node.textContent || '').trim();
      return text.length > 0 && /\p{Script=Latin}/u.test(text);
    });
  }

  function processCaptions() {
    if (!app.state.enabled) return;
    app.makeCaptionTextSelectable();
    findCaptionNodes().forEach(app.decorateCaptionNode);
  }

  function loadSettings() {
    app.storage.get({ enabled: true, vocabeeTabEnabled: true }, (settings) => {
      const tabEnabled = settings.vocabeeTabEnabled !== false;
      app.state = {
        ...app.state,
        enabled: Boolean(settings.enabled) && tabEnabled,
        tabEnabled,
        lang: 'ru',
        sourceLang: 'en'
      };
      app.userEnabled = Boolean(settings.enabled);
      if (app.state.enabled) processCaptions();
      else app.clearCaptionProcessing();
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'TOGGLE_VOCABEE_APP') return false;
    app.state.tabEnabled = !app.state.tabEnabled;
    app.state.enabled = app.state.tabEnabled && app.userEnabled !== false;
    if (app.state.enabled) processCaptions();
    else {
      app.clearCaptionProcessing();
      app.hideTooltip(true);
    }
    app.storage.set({ vocabeeTabEnabled: app.state.tabEnabled });
    chrome.runtime.sendMessage({
      type: 'SET_VOCABEE_TAB_STATE',
      enabled: app.state.tabEnabled,
      panelVisible: app.state.tabEnabled
    });
    sendResponse?.({ enabled: app.state.tabEnabled });
    return false;
  });

  app.storage.onChanged.addListener((changes, areaName) => {
    if ((areaName !== 'sync' && areaName !== 'local') || !changes.enabled) return;
    app.userEnabled = Boolean(changes.enabled.newValue);
    app.state.enabled = app.userEnabled && app.state.tabEnabled !== false;
    if (app.state.enabled) processCaptions();
    else app.clearCaptionProcessing();
  });

  function observePage() {
    const observer = new MutationObserver(processCaptions);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['draggable']
    });
  }

  loadSettings();
  observePage();
  app.contentRuntimeReady = true;

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') app.hideTooltip(true);
  });

})(globalThis.Vocabee);
