import React, { useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import { TooltipActions } from './components/TooltipActions.jsx';
import { TooltipHeader } from './components/TooltipHeader.jsx';
import { useTranslationTooltip } from './hooks/useTranslationTooltip.js';
import { DictionaryWordCard } from '../../shared/DictionaryWordCard.jsx';
import styles from './TranslationTooltip.module.css';

export function TranslationTooltip({ app }) {
  const tooltipRef = useRef(null);
  const {
    tooltip,
    feedback,
    studyStatus,
    addStatus,
    pointerInside,
    hideTimer,
    hideTooltip,
    scheduleTooltipHide,
    setPointerInside,
    startLearning,
    addToDictionary,
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
          onClose={() => hideTooltip(true)}
        />
        <ul className={styles.cardList}>
          <DictionaryWordCard
            word={tooltip.text}
            translation={tooltip.loading ? 'Перевожу…' : tooltip.details?.translated || 'Перевод недоступен'}
            translationVisible
            forms={tooltip.details?.pronunciation}
          />
        </ul>
        <TooltipActions
          loading={tooltip.loading}
          translated={tooltip.details?.translated}
          studyStatus={studyStatus}
          addStatus={addStatus}
          feedback={feedback}
          onStudy={startLearning}
          onAdd={addToDictionary}
        />
      </div>
    </div>
  );
}
