import { expect } from '@playwright/test';

export const REFEX_DASHBOARDS = ['employee', 'agent', 'manager', 'head'];
export const EXTROVIS_DASHBOARDS = [
  'extrovis-employee',
  'extrovis-agent',
  'extrovis-first',
  'extrovis-final',
];
export const ALL_DASHBOARDS = [...REFEX_DASHBOARDS, ...EXTROVIS_DASHBOARDS, 'admin'];

export function e2eUrl(dashboard) {
  return `/?e2e=1&dashboard=${dashboard}`;
}

export async function waitForDashboardReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByTestId('e2e-host')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Component failed to render')).toHaveCount(0);

  const ready = page
    .locator('table')
    .or(page.getByTestId('approver-period-picker'))
    .or(page.getByRole('button', { name: /All Tickets|Open Tickets|My Tickets|Pending Approval/i }))
    .or(page.getByText(/Tech Support|IT Manager|IT Head|First Level|Final Level|Helpdesk|No records|Preview|Admin/i));
  await expect(ready.first()).toBeAttached({ timeout: 45_000 });

  await expect(page.getByText('Loading dashboard...')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByText('Loading your requests...')).toHaveCount(0, { timeout: 30_000 });
}

export function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

export function assertNoFatalPageErrors(errors, label) {
  expect(
    errors.filter((e) => !/ResizeObserver|Non-Error|SDK not available/i.test(e)),
    `page errors on ${label}: ${errors.join(' | ')}`,
  ).toEqual([]);
}

export async function clickScopeIfPresent(page, label) {
  const btn = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

export async function clickQueueIfPresent(page, label) {
  // Prefer exact queue switch labels ("Service" / "Change") over create-menu "Change Request".
  const exact = page.getByRole('button', { name: label, exact: true });
  if (await exact.count()) {
    await exact.first().click({ force: true });
    await page.waitForTimeout(400);
    return true;
  }
  const btn = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
  if (await btn.count()) {
    await btn.first().click({ force: true });
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}
