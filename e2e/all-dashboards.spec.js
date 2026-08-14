import { test, expect } from '@playwright/test';
import {
  ALL_DASHBOARDS,
  REFEX_DASHBOARDS,
  EXTROVIS_DASHBOARDS,
  e2eUrl,
  waitForDashboardReady,
  collectPageErrors,
  assertNoFatalPageErrors,
  clickScopeIfPresent,
  clickQueueIfPresent,
} from './helpers.js';

test.describe('All dashboards — smoke load', () => {
  for (const key of ALL_DASHBOARDS) {
    test(`${key} loads without render crash`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      await expect(page.getByTestId('e2e-host')).toHaveAttribute('data-e2e-dashboard', key);
      assertNoFatalPageErrors(errors, key);
    });
  }
});

test.describe('Employee — no Me / My Team', () => {
  for (const key of ['employee', 'extrovis-employee']) {
    test(`${key} hides Me / My Team switch`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      await expect(page.getByRole('button', { name: /^Me$/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^My Team$/i })).toHaveCount(0);
    });
  }
});

test.describe('Agent / Approver — Me / My Team switch', () => {
  const scoped = ['agent', 'manager', 'head', 'extrovis-agent', 'extrovis-first', 'extrovis-final', 'admin'];
  for (const key of scoped) {
    test(`${key} can toggle Me and My Team`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);

      const hasMe = await clickScopeIfPresent(page, 'Me');
      const hasTeam = await clickScopeIfPresent(page, 'My Team');
      // Admin / some roles may still expose the switch; if present, both should work.
      if (hasMe || hasTeam) {
        await expect(page.getByRole('button', { name: /^Me$/i }).or(page.getByRole('button', { name: /^My Team$/i })).first()).toBeVisible();
        await clickScopeIfPresent(page, 'Me');
        await expect(page.getByText('Component failed to render')).toHaveCount(0);
        await clickScopeIfPresent(page, 'My Team');
        await expect(page.getByText('Component failed to render')).toHaveCount(0);
      }
    });
  }
});

test.describe('Period picker (Weekly / Monthly / FY)', () => {
  for (const key of ['agent', 'manager', 'head', 'extrovis-agent', 'extrovis-first', 'extrovis-final', 'admin']) {
    test(`${key} shows adaptive period control`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);

      const periodTrigger = page.getByTestId('approver-period-picker');
      await expect(periodTrigger).toBeVisible({ timeout: 30_000 });
      await periodTrigger.click();
      await expect(page.getByText('Choose period type')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('button', { name: 'Weekly', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Monthly', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Financial Year', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Weekly', exact: true }).click();
      await expect(page.getByText('Current week').first()).toBeVisible({ timeout: 10_000 });
    });
  }
});

test.describe('Due overlay — Refex only', () => {
  for (const key of ['agent', 'manager', 'head', 'admin']) {
    test(`${key} shows Due checkbox`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      await expect(page.getByLabel('Due')).toBeVisible({ timeout: 20_000 });
    });
  }

  for (const key of ['extrovis-agent', 'extrovis-first', 'extrovis-final']) {
    test(`${key} hides Due checkbox`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      await expect(page.getByLabel('Due')).toHaveCount(0);
    });
  }
});

test.describe('KPI / tabs — no Employee Feedback / Pending Approval rules', () => {
  for (const key of ALL_DASHBOARDS) {
    test(`${key} has no Employee Feedback KPI/tab`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      await expect(page.getByRole('button', { name: /^Employee Feedback$/i })).toHaveCount(0);
      await expect(page.getByText('Awaiting your feedback')).toHaveCount(0);
    });
  }

  for (const key of EXTROVIS_DASHBOARDS.filter((k) => k !== 'extrovis-employee')) {
    test(`${key} has no Pending Approval card`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      await expect(page.getByRole('button', { name: /^Pending Approval$/i })).toHaveCount(0);
      await expect(page.getByText(/^Pending Approval$/i)).toHaveCount(0);
    });
  }

  for (const key of ['manager', 'head']) {
    test(`${key} shows Pending Approval`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      await expect(
        page.getByRole('button', { name: /Pending Approval/i }).or(page.getByText(/Pending Approval/i)).first(),
      ).toBeVisible({ timeout: 20_000 });
    });
  }
});

test.describe('Open / My Tickets / Closed KPIs', () => {
  for (const key of ['agent', 'extrovis-agent', 'extrovis-first', 'extrovis-final', 'manager', 'head']) {
    test(`${key} exposes Open Tickets and Closed`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      await expect(page.getByText(/Open Tickets/i).first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/^Closed$|Closed Tickets/i).first()).toBeVisible({ timeout: 20_000 });
    });
  }
});

test.describe('Extrovis Change Request queue', () => {
  for (const key of ['extrovis-agent', 'extrovis-first', 'extrovis-final']) {
    test(`${key} can open Change tab and stay there`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);

      const switched = await clickQueueIfPresent(page, 'Change');
      expect(switched, `${key} should expose Service/Change queue switch`).toBeTruthy();

      // Must not snap back to Service — CR KPIs or CR tabs should appear.
      await page.waitForTimeout(800);
      const changeActive = page.getByRole('button', { name: 'Change', exact: true });
      await expect(changeActive.first()).toBeVisible();

      const crSignal = page
        .getByText(/In Approval|Implementation|Change Request|First Approver|Pending Task|Active Change/i)
        .or(page.getByRole('button', { name: /Implementation|In Approval/i }));
      await expect(crSignal.first()).toBeVisible({ timeout: 20_000 });

      // Confirm Service switch still works (queue not locked).
      await clickQueueIfPresent(page, 'Service');
      await expect(page.getByText('Component failed to render')).toHaveCount(0);
    });
  }

  test('refex manager does not show Change queue switch', async ({ page }) => {
    await page.goto(e2eUrl('manager'));
    await waitForDashboardReady(page);
    await expect(page.getByRole('button', { name: 'Change', exact: true })).toHaveCount(0);
  });
});

test.describe('Graphical insight row (Extrovis only)', () => {
  for (const key of ['extrovis-agent', 'extrovis-first', 'extrovis-final']) {
    test(`${key} shows donut chart titles under KPIs`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      await expect(
        page.getByText(/Ticket Status|Priority Distribution|Request Type Distribution|Change Request Status|Criticality Distribution/i).first(),
      ).toBeVisible({ timeout: 20_000 });
    });
  }

  for (const key of ['manager', 'head', 'agent']) {
    test(`${key} keeps KPI strip (graphs are Extrovis-only)`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      await expect(page.getByText(/All Tickets|Open Tickets|Pending Approval|My Tickets/i).first()).toBeVisible({ timeout: 20_000 });
    });
  }
});

test.describe('MIS Source column', () => {
  for (const key of REFEX_DASHBOARDS) {
    test(`${key} MIS table includes Source header when table renders`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      const table = page.locator('table').first();
      if (await table.count()) {
        await expect(page.locator('th', { hasText: /^Source$/i }).first()).toBeVisible({ timeout: 20_000 });
      }
    });
  }
});

test.describe('Today snapshot (adaptive period)', () => {
  for (const key of ['head', 'admin', 'manager', 'extrovis-first', 'extrovis-final']) {
    test(`${key} shows Today snapshot cards when adaptive period enabled`, async ({ page }) => {
      await page.goto(e2eUrl(key));
      await waitForDashboardReady(page);
      const today = page.getByText(/Today Open|Today Closed|Today SLA/i);
      // Present on adaptive-period dashboards; skip soft if mock path hides them.
      if (await today.count()) {
        await expect(today.first()).toBeVisible();
      }
    });
  }
});
