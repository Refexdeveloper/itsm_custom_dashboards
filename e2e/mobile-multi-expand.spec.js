import { test, expect } from '@playwright/test';
import { e2eUrl, waitForDashboardReady } from './helpers.js';

/** Rapid expand / collapse of several mobile cards must not crash or reload the dashboard. */
const DASHBOARDS = ['admin', 'agent', 'extrovis-agent', 'extrovis-first', 'extrovis-final'];

for (const key of DASHBOARDS) {
  test(`${key}: rapid mobile expand does not crash`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const errors = [];
    let crashed = false;
    let loads = 0;
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('crash', () => { crashed = true; });
    page.on('load', () => { loads += 1; });
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
    await page.goto(e2eUrl(key));
    await waitForDashboardReady(page);
    for (const name of ['My Team', 'All Tickets']) {
      if (await page.locator('button[aria-label="Expand ticket"], button[aria-label="Collapse ticket"]').count()) break;
      const btn = page.getByRole('button', { name, exact: true });
      if (await btn.count()) { await btn.first().click({ force: true }); await page.waitForTimeout(600); }
    }
    const chevrons = page.locator('button[aria-label="Expand ticket"], button[aria-label="Collapse ticket"]');
    const n = Math.min(await chevrons.count(), 6);
    test.skip(n === 0, 'no mobile cards in mock data');
    const loadsBefore = loads;
    for (let round = 0; round < 4; round += 1) {
      for (let i = 0; i < n; i += 1) {
        await chevrons.nth(i).tap({ force: true }).catch(() => {});
        await page.waitForTimeout(80);
      }
    }
    await page.waitForTimeout(2500);
    console.log(`[multi-expand] ${key}: cards=${n} crashed=${crashed} reloads=${loads - loadsBefore} errors=${errors.length}`);
    for (const e of errors.slice(0, 8)) console.log(`  ${e.slice(0, 300)}`);
    expect(crashed).toBe(false);
    expect(loads - loadsBefore).toBe(0);
    await expect(page.getByText('Component failed to render')).toHaveCount(0);
    // React dev-only "unique key" warning fires on the agent My Team list before any expand.
    expect(errors.filter((e) => !/ResizeObserver|Non-Error|SDK not available|Failed to load resource|net::ERR|unique "key" prop/i.test(e))).toEqual([]);
    await page.close();
  });
}

for (const key of ['admin', 'agent']) {
  test(`${key}: mobile expand panel mounts only after the card settles open`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.goto(e2eUrl(key));
    await waitForDashboardReady(page);
    for (const name of ['My Team', 'All Tickets']) {
      if (await page.locator('button[aria-label="Expand ticket"]').count()) break;
      const btn = page.getByRole('button', { name, exact: true });
      if (await btn.count()) { await btn.first().click({ force: true }); await page.waitForTimeout(600); }
    }
    const expand = page.locator('button[aria-label="Expand ticket"]');
    test.skip((await expand.count()) === 0, 'no mobile cards in mock data');
    const placeholder = page.locator('[aria-label="Loading ticket details"]');

    await expand.first().tap({ force: true });
    await expect(placeholder).toHaveCount(1);
    await page.locator('button[aria-label="Collapse ticket"]').first().tap({ force: true });
    await page.waitForTimeout(500);
    await expect(placeholder).toHaveCount(0);
    await expect(page.locator('button[aria-label="Collapse ticket"]')).toHaveCount(0);

    await expand.first().tap({ force: true });
    await expect(placeholder).toHaveCount(1);
    await expect(placeholder).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('button[aria-label="Collapse ticket"]')).toHaveCount(1);
    await page.close();
  });
}
