export function getDefaultPosition() {
  const panelWidth = Math.min(320, window.innerWidth - 16);
  return {
    x: Math.max(8, window.innerWidth - panelWidth - 24),
    y: 24
  };
}
