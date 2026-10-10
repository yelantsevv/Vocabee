import React, { useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import { TooltipActions } from './components/TooltipActions.jsx';
import { TooltipHeader } from './components/TooltipHeader.jsx';
import { useTranslationTooltip } from './hooks/useTranslationTooltip.js';
import styles from './TranslationTooltip.module.css';

export function TranslationTooltip({ app }) {
  const tooltipRef = useRef(null);
  const {
    tooltip,
    feedback,
    addStatus,
    pointerInside,
    hideTimer,
    hideTooltip,
    scheduleTooltipHide,
    setPointerInside,
    addToDictionary,
    changeTargetLanguage,
    copyTranslation,
    speakText
  } = useTranslationTooltip(app);

  useLayoutEffect(() => {
    const element = tooltipRef.current;
    if (!element || !tooltip.visible || !tooltip.anchorRect) return;
    const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    const playerBounds = player?.getBoundingClientRect();
    const bounds = playerBounds && playerBounds.width > 0
      ? playerBounds
      : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight };
    const padding = 8;
    const width = Math.max(1, Math.min(360, bounds.width - padding * 2));
    const maxHeight = Math.max(120, bounds.height - padding * 2);
    const preferredHeight = Math.min(280, maxHeight);
    element.style.width = `${width}px`;
    element.style.maxHeight = `${maxHeight}px`;
    element.style.overflowY = 'auto';
    const tooltipHeight = element.getBoundingClientRect().height;
    const centeredLeft = tooltip.anchorRect.left + (tooltip.anchorRect.width - width) / 2;
    const left = Math.max(bounds.left + padding, Math.min(centeredLeft, bounds.right - width - padding));
    const top = Math.max(bounds.top + padding, tooltip.anchorRect.top - Math.min(tooltipHeight, preferredHeight));
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }, [tooltip.visible, tooltip.text, tooltip.details, tooltip.loading, tooltip.anchorRect]);

  return (
    <div className={styles.tooltipRoot}>
      <div
        ref={tooltipRef}
        id="vocabee-tooltip"
        className={clsx(styles.tooltip, { [styles.visible]: tooltip.visible })}
        data-visible={tooltip.visible}
        data-pointer-inside={pointerInside.current ? 'true' : 'false'}
        onPointerEnter={() => {
          clearTimeout(hideTimer.current);
          setPointerInside(true);
          if (tooltipRef.current) tooltipRef.current.dataset.pointerInside = 'true';
        }}
        onPointerLeave={() => {
          setPointerInside(false);
          if (tooltipRef.current) tooltipRef.current.dataset.pointerInside = 'false';
          scheduleTooltipHide();
        }}
      >
        <TooltipHeader
          app={app}
          tooltip={tooltip}
          onLanguageChange={changeTargetLanguage}
          onSpeak={speakText}
          onClose={() => hideTooltip(true)}
        />
        <TooltipActions
          loading={tooltip.loading}
          translated={tooltip.details?.translated}
          addStatus={addStatus}
          feedback={feedback}
          targetLanguage={app.state.lang || 'ru'}
          onSpeak={speakText}
          onCopy={copyTranslation}
          onAdd={addToDictionary}
        />
      </div>
    </div>
  );
}
