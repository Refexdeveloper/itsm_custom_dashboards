/** Scroll a KPI click to the MIS table. One scrollport only — never the window. */

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iP(hone|ad|od)/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1;
}

function canScroll(node) {
  if (!node || node === document.body || node === document.documentElement) return false;
  const overflowY = window.getComputedStyle(node).overflowY;
  if (!/(auto|scroll|overlay|hidden)/.test(overflowY)) return false;
  return node.scrollHeight > node.clientHeight + 8;
}

function scrollPort(port, el) {
  const top = Math.max(
    0,
    el.getBoundingClientRect().top - port.getBoundingClientRect().top + port.scrollTop - 16,
  );
  // iOS WebKit leaves a blank viewport when scrollIntoView or window.scrollTo
  // run inside the Kissflow iframe. Move the dashboard panel directly.
  if (isIosDevice()) {
    port.scrollTop = top;
    void port.offsetHeight;
    return;
  }
  try {
    port.scrollTo({ top, behavior: 'smooth' });
  } catch {
    port.scrollTop = top;
  }
}

function scrollTargetIntoView(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return false;
  const root = typeof el.closest === 'function' ? el.closest('.rootDiv') : null;
  if (root) {
    scrollPort(root, el);
    return true;
  }
  let node = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    if (canScroll(node)) {
      scrollPort(node, el);
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function scrollToMisRecords(elementId = 'itsm-mis-table') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.requestAnimationFrame(() => {
    if (scrollTargetIntoView(elementId)) return;
    window.setTimeout(() => scrollTargetIntoView(elementId), 120);
    window.setTimeout(() => scrollTargetIntoView(elementId), 320);
  });
}
