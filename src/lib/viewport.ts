export function bindGameViewport(win: Window, root: HTMLElement): () => void {
  const viewport = win.visualViewport;
  const update = () => {
    // Let deliberate pinch zoom work without repeatedly repositioning the game UI.
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
    const height = Math.max(1, Math.min(win.innerHeight, viewport?.height ?? win.innerHeight));
    const top = Math.max(0, Math.min(viewport?.offsetTop ?? 0, win.innerHeight - height));
    root.style.setProperty('--visible-height', `${height}px`);
    root.style.setProperty('--visible-top', `${top}px`);
  };
  viewport?.addEventListener('resize', update);
  viewport?.addEventListener('scroll', update);
  win.addEventListener('resize', update);
  update();
  return () => {
    viewport?.removeEventListener('resize', update);
    viewport?.removeEventListener('scroll', update);
    win.removeEventListener('resize', update);
    root.style.removeProperty('--visible-height');
    root.style.removeProperty('--visible-top');
  };
}
