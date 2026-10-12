(function (app) {
  if (window.location.hostname !== 'www.youtube.com') return;

  let pointerInPauseArea = false;
  let pointerX = -1;
  let pointerY = -1;
  let pauseAreaCheckTimer;

  function getPauseArea(target) {
    if (!(target instanceof Element)) return null;

    const tooltip = target.closest('#vocabee-tooltip');
    if (tooltip) return tooltip.dataset.visible === 'true' ? tooltip : null;

    const caption = target.closest('.ytp-caption-segment');
    return caption && app.isVisibleCaption(caption) ? caption : null;
  }

  function isPointerOverPauseArea() {
    if (pointerX < 0 || pointerY < 0) return false;
    const pauseArea = getPauseArea(document.elementFromPoint(pointerX, pointerY));
    if (!pauseArea) return false;

    const bounds = pauseArea.getBoundingClientRect();
    return pointerX >= bounds.left && pointerX <= bounds.right &&
      pointerY >= bounds.top && pointerY <= bounds.bottom;
  }

  function pauseVideo() {
    const video = document.querySelector('video');
    if (!video || video.paused) return;
    video.dataset.vocabeePausedByTooltip = 'true';
    video.pause();
  }

  function resumeVideo() {
    const video = document.querySelector('video');
    if (!video || video.dataset.vocabeePausedByTooltip !== 'true' || isPointerOverPauseArea()) return;
    video.play().catch(() => {});
    delete video.dataset.vocabeePausedByTooltip;
  }

  function updatePauseAreaState() {
    pointerInPauseArea = isPointerOverPauseArea();
    if (pointerInPauseArea) pauseVideo();
    else resumeVideo();
  }

  function handlePointerOver(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!getPauseArea(event.target)) return;
    pointerInPauseArea = true;
    pauseVideo();
  }

  function handlePointerOut(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!getPauseArea(event.target)) return;
    clearTimeout(pauseAreaCheckTimer);
    pauseAreaCheckTimer = setTimeout(updatePauseAreaState, 100);
  }

  document.addEventListener('pointerover', handlePointerOver, true);
  document.addEventListener('pointerout', handlePointerOut, true);
  document.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (getPauseArea(event.target)) {
      clearTimeout(pauseAreaCheckTimer);
      pointerInPauseArea = true;
      pauseVideo();
    } else if (pointerInPauseArea) {
      clearTimeout(pauseAreaCheckTimer);
      pauseAreaCheckTimer = setTimeout(updatePauseAreaState, 100);
    }
  }, true);
  document.addEventListener('play', () => {
    if (!isPointerOverPauseArea()) return;
    pointerInPauseArea = true;
    pauseVideo();
  }, true);

  app.isVisibleCaption = function (caption) {
    const bounds = caption.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;

    let element = caption;
    while (element && element !== document.body) {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false;
      }
      element = element.parentElement;
    }

    return Boolean(caption.textContent.trim());
  };
})(globalThis.Vocabee);
