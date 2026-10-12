(function (app) {
  function getSelectionScope(node) {
    const element = node instanceof Element ? node : node?.parentElement;
    return element?.closest('#ytp-caption-window-container .ytp-caption-segment') || null;
  }

  app.getSelectedTextInfo = function () {
    const selection = window.getSelection();
    const text = app.normalizeText(selection?.toString());
    if (!selection || selection.isCollapsed || !text) return null;

    const range = selection.getRangeAt(0);
    const startScope = getSelectionScope(range.startContainer);
    const endScope = getSelectionScope(range.endContainer);
    if (!startScope || startScope !== endScope) return null;

    const rect = range.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      text,
      rect,
      fontSize: Number.parseFloat(getComputedStyle(startScope).fontSize)
    };
  };

  app.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' && areaName !== 'local') return;
    if (changes.enabled) app.state.enabled = Boolean(changes.enabled.newValue);
  });

  app.translateSelectedPhrase = function () {
    if (!app.state.enabled) return;
    const selectedText = app.getSelectedTextInfo();
    if (!selectedText || selectedText.text.split(/\s+/).length < 2) return;
    app.showTranslationPopup(selectedText.text, selectedText.rect, null, selectedText.fontSize);
  };

  if (window.location.hostname !== 'www.youtube.com') return;

  let suppressNextSelectionTranslation = false;
  let suppressSelectionTimer;

  document.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('#vocabee-tooltip')) return;
    if (event.target.closest('#vocabee-react-panel-root')) return;
    if (getSelectionScope(event.target)) return;

    app.hideTooltip(true);
    window.getSelection()?.removeAllRanges();
    suppressNextSelectionTranslation = true;
    clearTimeout(suppressSelectionTimer);
    suppressSelectionTimer = setTimeout(() => {
      suppressNextSelectionTranslation = false;
    }, 1000);
  }, true);

  document.addEventListener('mouseup', (event) => {
    if (event.target instanceof Element && event.target.closest('#vocabee-tooltip')) return;
    setTimeout(() => {
      if (suppressNextSelectionTranslation) {
        suppressNextSelectionTranslation = false;
        clearTimeout(suppressSelectionTimer);
        return;
      }
      app.translateSelectedPhrase();
    }, 0);
  }, true);

  document.addEventListener('keyup', (event) => {
    if (event.shiftKey || event.key.startsWith('Arrow')) {
      setTimeout(app.translateSelectedPhrase, 0);
    }
  }, true);

  function makeCaptionTextSelectable() {
    document.querySelectorAll('.ytp-caption-window-container .caption-window').forEach((captionWindow) => {
      if (captionWindow.getAttribute('draggable') !== 'false') {
        captionWindow.setAttribute('draggable', 'false');
      }
    });
  }

  function stopCaptionWindowDrag(event) {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('#ytp-caption-window-container .ytp-caption-segment')) return;
    event.stopPropagation();
  }

  document.addEventListener('pointerdown', stopCaptionWindowDrag, true);
  document.addEventListener('mousedown', stopCaptionWindowDrag, true);
  document.addEventListener('dragstart', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('#ytp-caption-window-container')) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  function wrapTextNode(textNode) {
    const text = textNode?.textContent || '';
    if (!/\p{Script=Latin}/u.test(text)) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    const regex = /\p{Script=Latin}[\p{Script=Latin}'’-]*/gu;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const word = match[0];
      const start = match.index;
      const end = start + word.length;
      if (start > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));

      const span = document.createElement('span');
      span.className = 'vocabee-word';
      span.dataset.word = word;
      span.textContent = word;
      span.addEventListener('mouseenter', () => app.showWordTooltip(span));
      span.addEventListener('mouseleave', app.scheduleTooltipHide);
      fragment.appendChild(span);
      lastIndex = end;
    }

    if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode.replaceChild(fragment, textNode);
  }

  app.decorateCaptionNode = function (node) {
    if (!node || node.closest('.vocabee-word')) return;

    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: (textNode) => {
        const parent = textNode.parentElement;
        if (!parent || parent.closest('.vocabee-word')) return NodeFilter.FILTER_REJECT;
        return /\p{Script=Latin}/u.test(textNode.textContent)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    const textNodes = [];
    let textNode = walker.nextNode();
    while (textNode) {
      textNodes.push(textNode);
      textNode = walker.nextNode();
    }
    textNodes.forEach(wrapTextNode);
  };

  app.makeCaptionTextSelectable = makeCaptionTextSelectable;
})(globalThis.Vocabee);
