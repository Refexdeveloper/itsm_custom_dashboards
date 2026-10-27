/** Scroll KPI clicks to the MIS table. Kissflow often scrolls a parent, not window. */
export function scrollToMisRecords(elementId = 'itsm-mis-table') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const scrollTargetIntoView = () => {
    const el = document.getElementById(elementId);
    if (!el) return false;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    } catch {
      /* ignore */
    }
    let node = el.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = window.getComputedStyle(node);
      const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY)
        && node.scrollHeight > node.clientHeight + 8;
      if (canScrollY) {
        const top = el.getBoundingClientRect().top
          - node.getBoundingClientRect().top
          + node.scrollTop
          - 16;
        node.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        break;
      }
      node = node.parentElement;
    }
    const pageY = el.getBoundingClientRect().top
      + (window.scrollY || document.documentElement.scrollTop || 0)
      - 16;
    window.scrollTo({ top: Math.max(0, pageY), behavior: 'smooth' });
    return true;
  };
  window.requestAnimationFrame(() => {
    if (scrollTargetIntoView()) return;
    window.setTimeout(scrollTargetIntoView, 120);
    window.setTimeout(scrollTargetIntoView, 320);
  });
}
