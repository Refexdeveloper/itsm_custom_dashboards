/**
 * Legacy entry — full suite lives in all-dashboards.spec.js.
 * Kept so older npm scripts still resolve; smoke only for Refex.
 */
import { test, expect } from '@playwright/test';
import {
  REFEX_DASHBOARDS,
  e2eUrl,
  waitForDashboardReady,
  collectPageErrors,
  assertNoFatalPageErrors,
} from './helpers.js';

test.describe('Refex dashboards — smoke (legacy)', () => {
  for (const key of REFEX_DASHBOARDS) {
    test(`${key} loads without render crash`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      assertNoFatalPageErrors(errors, key);
      await expect(page.getByTestId('e2e-host')).toBeVisible();
    });
  }
});
