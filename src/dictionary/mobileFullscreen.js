export function enterMobileFullscreen() {
  if (typeof document === 'undefined' || !window.matchMedia('(max-width: 640px)').matches) return;
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;

  document.documentElement.requestFullscreen().catch(() => {
    // Some mobile browsers only allow fullscreen in installed apps or do not support it.
  });
}

export function exitMobileFullscreen() {
  if (typeof document === 'undefined' || !document.fullscreenElement) return;

  document.exitFullscreen().catch(() => {});
}
