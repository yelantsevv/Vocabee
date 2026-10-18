export function enterMobileFullscreen() {
  if (typeof document === 'undefined' || !window.matchMedia('(max-width: 640px)').matches) {
    return Promise.resolve(false);
  }
  if (document.fullscreenElement) return Promise.resolve(true);
  if (!document.documentElement.requestFullscreen) return Promise.resolve(false);

  try {
    return document.documentElement.requestFullscreen().then(() => true).catch(() => false);
  } catch {
    // Some mobile browsers only allow fullscreen in installed apps or do not support it.
    return Promise.resolve(false);
  }
}
