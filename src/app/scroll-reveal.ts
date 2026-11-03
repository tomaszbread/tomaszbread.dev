// Wejscia przy przewijaniu, przeniesione ze strony Digital Diggera (shared/scroll-reveal.ts).
// Blok z atrybutem data-reveal pojawia sie i podjezdza 18px, gdy wchodzi na ekran. Kiedy
// calkiem z niego wyjdzie - w dol albo w gore - jest znowu uzbrajany, wiec wejscie powtarza
// sie przy przewijaniu w obie strony. Wartosc atrybutu to opoznienie w ms (najwyzej 160).
// To, co widac od razu po wejsciu na strone, pojawia sie bez animacji.
export function createScrollReveals(root: HTMLElement) {
  const elements = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
  const pending = new Set<HTMLElement>();
  const animations = new Map<HTMLElement, Animation>();
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let observer: IntersectionObserver | undefined;
  let enabled = false;

  const cancel = (element: HTMLElement) => {
    animations.get(element)?.cancel();
    animations.delete(element);
  };
  const arm = (element: HTMLElement) => {
    cancel(element);
    pending.add(element);
    element.setAttribute('data-reveal-state', 'pending');
  };

  const show = (element: HTMLElement, animate: boolean) => {
    pending.delete(element);
    cancel(element);
    element.removeAttribute('data-reveal-state');
    if (!animate || element.contains(root.ownerDocument.activeElement)
      || typeof element.animate !== 'function') return;
    const animation = element.animate([
      { opacity: 0, translate: '0 18px' },
      { opacity: 1, translate: '0 0' },
    ], {
      duration: 600,
      delay: Math.max(0, Math.min(160, Number(element.dataset['reveal']) || 0)),
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      fill: 'backwards',
    });
    animations.set(element, animation);
    animation.onfinish = () => {
      if (animations.get(element) !== animation) return;
      animations.delete(element);
      const bounds = element.getBoundingClientRect();
      if (enabled && (bounds.bottom <= 0 || bounds.top >= window.innerHeight)) arm(element);
    };
  };
  const finishAll = () => {
    enabled = false;
    observer?.disconnect();
    pending.forEach((element) => show(element, false));
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  };
  // fokus z klawiatury nie moze trafic w niewidoczny blok
  const onFocus = (event: FocusEvent) => {
    const element = (event.target as Element).closest<HTMLElement>('[data-reveal]');
    if (!element) return;
    if (pending.has(element)) show(element, false);
    cancel(element);
  };

  const sync = () => {
    if (preference.matches || typeof IntersectionObserver === 'undefined') {
      finishAll();
      return;
    }
    if (enabled) return;
    enabled = true;
    observer ??= new IntersectionObserver((entries) => {
      if (!enabled) return;
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting && pending.has(element)) show(element, true);
        else if (!entry.isIntersecting) {
          const bounds = entry.boundingClientRect;
          // wlasne 18px podjazdu nie moze ponownie uruchomic obserwatora na krawedzi ekranu
          const atEdge = bounds.top < window.innerHeight + 20 && bounds.bottom > -20;
          if (!animations.has(element) || !atEdge) arm(element);
        }
      });
    }, { threshold: 0 });
    for (const element of elements) {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight && bounds.bottom > 0) show(element, false);
      else arm(element);
      observer.observe(element);
    }
  };
  sync();
  preference.addEventListener('change', sync);
  root.addEventListener('focusin', onFocus);
  return {
    destroy() {
      finishAll();
      preference.removeEventListener('change', sync);
      root.removeEventListener('focusin', onFocus);
    },
  };
}
