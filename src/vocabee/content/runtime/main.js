(function (app) {
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
    app.storage.get({ enabled: true }, (settings) => {
      app.state = { ...app.state, enabled: Boolean(settings.enabled), lang: 'ru', sourceLang: 'en' };
      if (app.state.enabled) processCaptions();
    });
  }

  app.storage.onChanged.addListener((changes, areaName) => {
    if ((areaName !== 'sync' && areaName !== 'local') || !changes.enabled) return;
    app.state.enabled = Boolean(changes.enabled.newValue);
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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') app.hideTooltip(true);
  });

})(globalThis.Vocabee);
