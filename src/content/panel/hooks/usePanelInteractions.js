import { useRef } from 'react';

export function usePanelInteractions({ panelRef, panelState, setPanelState, save }) {
  const dragOrigin = useRef(null);
  const resizeOrigin = useRef(null);
  const currentState = useRef(panelState);
  currentState.current = panelState;

  function handleHeaderPointerDown(event) {
    if (event.target.closest('button')) return;
    dragOrigin.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: currentState.current.x,
      y: currentState.current.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handleHeaderPointerMove(event) {
    if (!dragOrigin.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const origin = dragOrigin.current;
    const bounds = panelRef.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(origin.x + event.clientX - origin.pointerX, window.innerWidth - bounds.width - 8));
    const y = Math.max(8, Math.min(origin.y + event.clientY - origin.pointerY, window.innerHeight - Math.min(bounds.height, 48) - 8));
    setPanelState((current) => ({ ...current, x, y }));
    currentState.current = { ...currentState.current, x, y };
  }

  function handleHeaderPointerUp(event) {
    if (!dragOrigin.current) return;
    dragOrigin.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    save(currentState.current);
  }

  function handleResizePointerDown(event) {
    if (currentState.current.minimized) return;
    const bounds = panelRef.current.getBoundingClientRect();
    resizeOrigin.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      width: bounds.width,
      height: bounds.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function handleResizePointerMove(event) {
    if (!resizeOrigin.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const origin = resizeOrigin.current;
    const maxWidth = Math.max(1, window.innerWidth - 16);
    const maxHeight = Math.max(1, window.innerHeight - 16);
    const width = Math.max(Math.min(280, maxWidth), Math.min(maxWidth, origin.width + event.clientX - origin.pointerX));
    const height = Math.max(Math.min(200, maxHeight), Math.min(maxHeight, origin.height + event.clientY - origin.pointerY));
    setPanelState((current) => ({ ...current, width, height }));
    currentState.current = { ...currentState.current, width, height };
    event.stopPropagation();
  }

  function handleResizePointerUp(event) {
    if (!resizeOrigin.current) return;
    resizeOrigin.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    save(currentState.current);
    event.stopPropagation();
  }

  return {
    handleHeaderPointerDown,
    handleHeaderPointerMove,
    handleHeaderPointerUp,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp
  };
}
