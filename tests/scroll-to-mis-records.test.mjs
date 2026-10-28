import assert from 'node:assert/strict';
import { scrollToMisRecords } from '../src/lib/scrollToMisRecords.js';

function installDom({ ios, withRoot }) {
  const calls = [];
  const root = {
    className: 'rootDiv',
    scrollTop: 0,
    scrollHeight: 2000,
    clientHeight: 700,
    offsetHeight: 700,
    scrollTo(opts) { calls.push(['root.scrollTo', opts]); this.scrollTop = opts.top; },
    getBoundingClientRect() { return { top: 0 }; },
  };
  const table = {
    id: 'finance-mis-table',
    parentElement: withRoot ? root : null,
    closest(sel) { return withRoot && sel === '.rootDiv' ? root : null; },
    getBoundingClientRect() { return { top: 900 }; },
    scrollIntoView() { calls.push(['scrollIntoView']); },
  };
  root.contains = () => true;
  const define = (key, value) => {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };
  define('navigator', {
    userAgent: ios ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' : 'Mozilla/5.0 (Linux; Android 14)',
    platform: ios ? 'iPhone' : 'Linux',
    maxTouchPoints: ios ? 5 : 0,
  });
  define('window', {
    scrollY: 40,
    scrollTo(opts) { calls.push(['window.scrollTo', opts]); },
    requestAnimationFrame(fn) { fn(); return 1; },
    setTimeout(fn) { fn(); return 1; },
    getComputedStyle() { return { overflowY: 'auto' }; },
  });
  define('document', {
    body: {},
    documentElement: { scrollTop: 0 },
    getElementById(id) { return id === table.id ? table : null; },
  });
  return { calls, root, table };
}

const ios = installDom({ ios: true, withRoot: true });
scrollToMisRecords('finance-mis-table');
assert.equal(ios.root.scrollTop, 884);
assert.equal(ios.calls.some((row) => row[0] === 'scrollIntoView'), false);
assert.equal(ios.calls.some((row) => row[0] === 'window.scrollTo'), false);

const android = installDom({ ios: false, withRoot: true });
scrollToMisRecords('finance-mis-table');
assert.deepEqual(android.calls[0], ['root.scrollTo', { top: 884, behavior: 'smooth' }]);
assert.equal(android.calls.some((row) => row[0] === 'window.scrollTo'), false);

console.log('scrollToMisRecords ok');
