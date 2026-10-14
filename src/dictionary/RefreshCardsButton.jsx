import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './RefreshCardsButton.module.css';
import { useInterfaceText } from './interfaceLanguage.jsx';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function RefreshCardsButton({
  position,
  positionEditing,
  onPositionChange,
  onRefresh
}) {
  const t = useInterfaceText();
  const buttonRef = useRef(null);
  const dragRef = useRef(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }));

  useEffect(() => {
    const updateViewport = () => {
      const nextViewport = { width: window.innerWidth, height: window.innerHeight };
      setViewport(nextViewport);
      if (positionEditing) {
        const bounds = buttonRef.current?.getBoundingClientRect();
        const width = bounds?.width || 46;
        const height = bounds?.height || 46;
        setDragPosition((current) => current && ({
          left: clamp(current.left, 0, Math.max(0, nextViewport.width - width)),
          top: clamp(current.top, 0, Math.max(0, nextViewport.height - height))
        }));
      }
    };
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [positionEditing]);

  useLayoutEffect(() => {
    if (!positionEditing) {
      setDragPosition(null);
      dragRef.current = null;
      return;
    }

    const bounds = buttonRef.current?.getBoundingClientRect();
    if (bounds) setDragPosition({ left: bounds.left, top: bounds.top });
  }, [positionEditing]);

  const buttonWidth = buttonRef.current?.offsetWidth || 46;
  const buttonHeight = buttonRef.current?.offsetHeight || 46;
  const savedPosition = position
    ? {
        left: position.x * Math.max(0, viewport.width - buttonWidth),
        top: position.y * Math.max(0, viewport.height - buttonHeight)
      }
    : null;
  const activePosition = positionEditing ? (dragPosition || savedPosition) : savedPosition;

  function startDrag(event) {
    if (!positionEditing || event.button !== 0) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: bounds.left,
      startTop: bounds.top
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!positionEditing || !drag || drag.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const left = clamp(
      drag.startLeft + event.clientX - drag.startX,
      0,
      Math.max(0, window.innerWidth - bounds.width)
    );
    const top = clamp(
      drag.startTop + event.clientY - drag.startY,
      0,
      Math.max(0, window.innerHeight - bounds.height)
    );
    setDragPosition({ left, top });
  }

  function finishDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;

    const bounds = event.currentTarget.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - bounds.width);
    const maxTop = Math.max(0, window.innerHeight - bounds.height);
    onPositionChange({
      x: maxLeft ? clamp(bounds.left, 0, maxLeft) / maxLeft : 0,
      y: maxTop ? clamp(bounds.top, 0, maxTop) / maxTop : 0
    });
  }

  return (
    <div className={styles.sticky} data-position-editing={positionEditing ? 'true' : undefined}>
      <button
        ref={buttonRef}
        className={clsx(styles.button, positionEditing && styles.editing, !positionEditing && position && styles.customPosition)}
        data-drag-position={positionEditing && activePosition ? 'true' : undefined}
        style={activePosition ? {
          left: `${activePosition.left}px`,
          top: `${activePosition.top}px`
        } : undefined}
        type="button"
        aria-label={t(positionEditing ? 'Перетащить кнопку обновления' : 'Обновить список карточек')}
        title={t(positionEditing ? 'Перетащите кнопку в нужное место' : 'Обновить список карточек')}
        onClick={(event) => {
          if (positionEditing) event.preventDefault();
          else onRefresh();
        }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" />
        </svg>
      </button>
    </div>
  );
}
