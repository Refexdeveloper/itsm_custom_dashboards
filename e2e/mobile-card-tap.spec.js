import { test, expect } from '@playwright/test';
import { e2eUrl, waitForDashboardReady } from './helpers.js';

/**
 * A tap on a mobile ticket card must do what a desktop row click does:
 * open the Kissflow form when the row is editable, otherwise expand.
 * The chevron alone always expands.
 */
const DASHBOARDS = ['agent', 'manager', 'head', 'employee', 'extrovis-agent', 'extrovis-first', 'extrovis-final', 'admin'];

async function instrument(page) {
  await page.addInitScript(() => {
    window.__formOpens = 0;
    const origOpen = window.open;
    window.open = (...args) => { window.__formOpens += 1; return origOpen ? null : null; };
    const origWarn = console.warn;
    console.warn = (...args) => {
      if (/form open failed|openPage failed|URL fallback/i.test(args.map(String).join(' '))) window.__formOpens += 1;
      origWarn.apply(console, args);
    };
  });
}

/** Same scope / tab path on desktop and mobile until a ticket shows. */
async function revealRows(page, rowSelector) {
  const has = async () => (await page.locator(rowSelector).count()) > 0;
  if (await has()) return [];
  const steps = [];
  const tryClick = async (name) => {
    const btn = page.getByRole('button', { name, exact: true });
    if (!(await btn.count())) return false;
    await btn.first().click({ force: true });
    await page.waitForTimeout(500);
    steps.push(name);
    return true;
  };
  for (const scope of [null, 'My Team']) {
    if (scope) await tryClick(scope);
    if (await has()) return steps;
    for (const tab of ['Open Tickets', 'Pending Approval', 'My Tickets', 'All Tickets', 'Closed']) {
      const clicked = await tryClick(tab);
      if (clicked && await has()) return steps;
    }
  }
  return steps;
}

async function replay(page, steps) {
  for (const name of steps) {
    const btn = page.getByRole('button', { name, exact: true });
    if (await btn.count()) {
      await btn.first().click({ force: true });
      await page.waitForTimeout(500);
    }
  }
}

async function outcome(page, expandedSelector) {
  await page.waitForTimeout(600);
  const opens = await page.evaluate(() => window.__formOpens || 0);
  const expanded = await page.locator(expandedSelector).count();
  return opens > 0 ? 'form' : (expanded > 0 ? 'expand' : 'none');
}

for (const key of DASHBOARDS) {
  test(`${key}: mobile card tap matches desktop row click`, async ({ browser }) => {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await instrument(desktop);
    await desktop.goto(e2eUrl(key));
    await waitForDashboardReady(desktop);
    const steps = await revealRows(desktop, 'tbody tr.cursor-pointer');
    const row = desktop.locator('tbody tr.cursor-pointer').first();
    if (!(await row.count())) {
      test.skip(true, 'no rows in mock data');
      return;
    }
    await row.locator('td:not([data-stop-row-nav])').nth(1).click({ force: true });
    const desktopResult = await outcome(desktop, 'button[aria-label="Collapse row"]');
    await desktop.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await instrument(mobile);
    await mobile.goto(e2eUrl(key));
    await waitForDashboardReady(mobile);
    await replay(mobile, steps);
    const chevron = mobile.locator('button[aria-label="Expand ticket"]').first();
    await expect(chevron, 'mobile card renders a separate expand chevron').toBeVisible({ timeout: 20_000 });
    const body = chevron.locator('xpath=following-sibling::button[1]');
    await body.tap();
    const mobileResult = await outcome(mobile, 'button[aria-label="Collapse ticket"]');
    console.log(`[tap-parity] ${key}: desktop=${desktopResult} mobile=${mobileResult} steps=${steps.join(">") || "default"}`);
    expect(mobileResult, `${key}: desktop=${desktopResult} mobile=${mobileResult}`).toBe(desktopResult);

    // Chevron expands without opening the form.
    if (mobileResult === 'form') {
      await mobile.evaluate(() => { window.__formOpens = 0; });
      await chevron.tap();
      await expect(mobile.locator('button[aria-label="Collapse ticket"]').first()).toBeVisible();
      expect(await mobile.evaluate(() => window.__formOpens)).toBe(0);
    }
    await mobile.close();
  });
}
