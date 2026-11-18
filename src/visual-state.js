const number = (value, fallback, min, max) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export function motionPaused(document, window) {
  if (document.body.classList.contains('motion-paused')) return true;
  if (document.body.classList.contains('motion-enabled')) return false;
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function qualityFor(window) {
  const compact = window.innerWidth <= 760;
  return {
    dpr: Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.65),
    fps: compact ? 30 : 60,
    segments: compact ? 64 : 96,
  };
}

export function readVisualState(document, window, hero = document.querySelector('#hero-stage')) {
  const root = document.documentElement.style;
  const style = hero?.style;
  const raw = root.getPropertyValue('--light-rgb').split(',');
  const fallback = [243, 197, 170];
  const body = root.getPropertyValue('--body-mid').trim();
  return {
    body: /^#[a-f\d]{6}$/i.test(body) ? body : '#eeece7',
    light: fallback.map((value, index) => number(raw[index], value, 0, 255)),
    brightness: number(style?.getPropertyValue('--scene-brightness'), .65, .1, 1),
    on: hero?.dataset.on !== 'false',
    paused: motionPaused(document, window),
    pointerX: number(style?.getPropertyValue('--lamp-x'), 0, -7.5, 7.5) / 7.5,
    pointerY: number(style?.getPropertyValue('--lamp-y'), 0, -5.5, 5.5) / 5.5,
  };
}

/** One bounded invalidation loop per visible island, never a background GPU loop. */
export function createVisualController(element, { watchLight = true, document = element.ownerDocument, window = document.defaultView } = {}) {
  const hero = document.querySelector('#hero-stage');
  let renderer = null;
  let frame = null;
  let disposed = false;
  let resume = true;
  let lastFrame = -Infinity;
  const rect = element.getBoundingClientRect();
  let inView = rect.bottom > 0 && rect.top < window.innerHeight;
  let wasAllowed = false;

  const snapshot = () => readVisualState(document, window, hero);
  const allowed = () => !disposed && inView && !document.hidden && !motionPaused(document, window) && !window.navigator?.connection?.saveData;
  const stop = () => {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
  };
  const tick = timestamp => {
    frame = null;
    if (!renderer || !allowed()) return;
    if (timestamp - lastFrame >= 1000 / qualityFor(window).fps - .5) {
      lastFrame = timestamp;
      renderer();
    }
    frame = window.requestAnimationFrame(tick);
  };
  function refresh() {
    if (disposed) return;
    const canDraw = allowed();
    const paused = String(motionPaused(document, window) || Boolean(window.navigator?.connection?.saveData));
    if (element.dataset.effectsPaused !== paused) element.dataset.effectsPaused = paused;
    if (canDraw && !wasAllowed) {
      resume = true;
      lastFrame = -Infinity;
      renderer?.();
    }
    wasAllowed = canDraw;
    if (!canDraw) stop();
    else if (renderer && frame === null) frame = window.requestAnimationFrame(tick);
  }

  const observer = new window.MutationObserver(refresh);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (watchLight) {
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    if (hero) observer.observe(hero, { attributes: true, attributeFilter: ['data-on', 'style'] });
  }
  const intersection = new window.IntersectionObserver(entries => {
    for (const entry of entries) if (entry.target === element) inView = entry.isIntersecting;
    refresh();
  }, { threshold: 0 });
  intersection.observe(element);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('resize', refresh);
  window.navigator?.connection?.addEventListener?.('change', refresh);
  refresh();

  return {
    getSnapshot: snapshot,
    getQuality: () => qualityFor(window),
    isAnimating: () => Boolean(renderer && allowed()),
    consumeResume: () => { const value = resume; resume = false; return value; },
    attachRenderer(invalidate) {
      renderer = invalidate;
      if (allowed()) renderer();
      refresh();
      return () => { renderer = null; stop(); };
    },
    dispose() {
      disposed = true;
      stop();
      renderer = null;
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('resize', refresh);
      window.navigator?.connection?.removeEventListener?.('change', refresh);
      element.removeAttribute('data-effects-paused');
    },
  };
}
