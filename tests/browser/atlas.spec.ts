import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import axe from 'axe-core';

const releaseId = 'atlas-mvp-2026-09-22-r6';

async function waitForRelease(page: Page): Promise<void> {
  await expect(page.getByText(`Atlas release ${releaseId}`, { exact: true })).toBeVisible();
}

async function expectNoSeriousAccessibilityViolations(page: Page): Promise<void> {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const results = await (window as typeof window & {
      axe: { run: (root: Document) => Promise<{ violations: Array<{
        id: string;
        impact: string | null;
        nodes: Array<{ target: unknown; html: string }>;
      }> }> };
    }).axe.run(document);
    return results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => ({ target: node.target, html: node.html })),
      }));
  });
  expect(violations).toEqual([]);
}

test('pins the complete view, restores layer state through history, and downloads reproducible evidence', async ({ page }) => {
  await page.goto('/?metric=access_to_electricity&year=2024&place=USA');
  await waitForRelease(page);

  await expect(page).toHaveURL(new RegExp(`release=${releaseId}`));
  await expect(page).toHaveURL(/scale=published/);
  await expect(page).toHaveURL(/lng=8/);
  await expect(page.getByRole('button', { name: 'Historical borders & names' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.getByRole('button', { name: 'Historical borders & names' }).click();
  await expect(page).toHaveURL(/borders=0/);
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Historical borders & names' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/borders=1/);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download this exact view · JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    `atlas-view-${releaseId}-access_to_electricity-2024.json`,
  );
  const path = await download.path();
  if (!path) throw new Error('Browser did not expose the downloaded view bundle');
  const bundle = JSON.parse(await readFile(path, 'utf8')) as {
    view: { release_id: string; metric_id: string; requested_year: number; pinned_query: string };
    rows: unknown[];
    displayed_summary: { prevalence: { population: number } };
    provenance: { reconciliation_decisions: { decision_set_id: string } };
  };
  expect(bundle.view).toMatchObject({
    release_id: releaseId,
    metric_id: 'access_to_electricity',
    requested_year: 2024,
  });
  expect(bundle.view.pinned_query).toContain(`release=${releaseId}`);
  expect(bundle.rows).toHaveLength(217);
  expect(bundle.displayed_summary.prevalence.population).toBeGreaterThan(8_000_000_000);
  expect(bundle.provenance.reconciliation_decisions.decision_set_id).toBe(
    'atlas-reconciliation-2026-09-22-v1',
  );
  await expect(page.getByText('Exact-view bundle downloaded.')).toBeVisible();
});

test('renders stable deep-time and modern evidence panels at desktop and mobile sizes', async ({ page }) => {
  await page.goto(`/?release=${releaseId}&metric=population_total&year=-9999&borders=1&cities=1`);
  await waitForRelease(page);
  await expect(page.getByLabel('Requested date 10000 BCE')).toBeVisible();
  await expect(page.getByText('Global population estimate only')).toBeVisible();
  await expect(page.locator('.time-panel')).toHaveScreenshot('deep-time-desktop.png');

  await page.goto(`/?release=${releaseId}&metric=access_to_electricity&year=2024&borders=1&cities=1`);
  await waitForRelease(page);
  await expect(page.getByRole('img', { name: /91\.91% with access/ })).toBeVisible();
  await expect(page.locator('.population-panel')).toHaveScreenshot('electricity-summary-desktop.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await waitForRelease(page);
  await expect(page.locator('.time-panel')).toHaveScreenshot('electricity-time-mobile.png');
  await expect(page.locator('.method-strip')).toHaveScreenshot('exact-view-actions-mobile.png');
});

test('respects reduced motion and exposes core pages without serious accessibility violations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/?release=${releaseId}&metric=population_total&year=2024`);
  await waitForRelease(page);
  await expect(page.getByRole('button', { name: 'Play' })).toBeDisabled();
  await expect(page.getByText('Playback off: reduced motion')).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.goto(`/?page=sources&release=${releaseId}`);
  await waitForRelease(page);
  await expect(page.getByRole('heading', { name: /Sources, releases/ })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.goto(`/?page=review&release=${releaseId}`);
  await waitForRelease(page);
  await expect(page.getByText('336 linked · 15 rejected · 2 unresolved')).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test('fails closed when a pinned release is unavailable', async ({ page }) => {
  await page.goto('/?release=atlas-mvp-does-not-exist&metric=population_total&year=2024');
  await expect(page.getByRole('heading', { name: 'The evidence release could not be opened.' })).toBeVisible();
  await expect(page.getByText(/pins Atlas release atlas-mvp-does-not-exist/)).toBeVisible();
});
