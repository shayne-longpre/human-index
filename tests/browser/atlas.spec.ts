import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import axe from 'axe-core';

const releaseId = 'atlas-mvp-2026-10-24-r12';

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

test('loads a source-native population grid and pins it in the exact-view bundle', async ({ page }) => {
  await page.goto(`/?release=${releaseId}&metric=population_total&year=2020&surface=ghsl-ghs-pop-r2023a`);
  await waitForRelease(page);
  await expect(page.getByRole('heading', { name: 'Where people were modeled to live' })).toBeVisible();
  await expect(page.getByRole('region', { name: /World map for 2020 GHSL GHS-POP population grid/ })).toBeVisible();
  await expect(page.locator('.legend-surface')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download all covered bins · CSV' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download this exact view · JSON' }).click();
  const downloaded = await downloadPromise;
  const path = await downloaded.path();
  if (!path) throw new Error('Browser did not expose the population view bundle');
  const bundle = JSON.parse(await readFile(path, 'utf8')) as {
    view: { layers: { population_grid_source_id: string }; effective_dates: { population_grid: number } };
    population_surface: { snapshot: { year: number; source_release_id: string }; artifact: { sha256: string } };
  };
  expect(bundle.view.layers.population_grid_source_id).toBe('ghsl-ghs-pop-r2023a');
  expect(bundle.view.effective_dates.population_grid).toBe(2020);
  expect(bundle.population_surface.snapshot).toMatchObject({ year: 2020, source_release_id: 'ghsl-ghs-pop-r2023a' });
  expect(bundle.population_surface.artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
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

test('economic source tables expose exact dates, missing coverage, and original locators', async ({ page }) => {
  await page.goto(`/?page=economics&release=${releaseId}&indicator=maddison-gdppc-2011-international-dollars&year=1820`);
  await expect(page.getByRole('heading', { name: 'What we know about material life.' })).toBeVisible();
  await expect(page.getByText('55 / 169')).toBeVisible();
  await expect(page.locator('.economics-controls')).toHaveScreenshot('economics-controls-desktop.png');
  await page.getByRole('button', { name: /United Kingdom GBR/ }).click();
  await expect(page.getByText(/Full data!A\d+:F\d+/)).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.getByLabel('Indicator').selectOption('wdi-si-pov-gini');
  await page.getByLabel('Exact source year').selectOption('2025');
  await expect(page.getByText('4 / 217')).toBeVisible();
  await expect(page.getByText('Unknown / not reported').first()).toBeVisible();
  await expect(page).toHaveURL(/indicator=wdi-si-pov-gini&year=2025/);

  await page.getByLabel('Indicator').selectOption('wdi-si-pov-dday');
  await page.getByLabel('Exact source year').selectOption('2020');
  await expect(page.getByText('70 / 217')).toBeVisible();
  await expect(page.getByText('percent of population · 2020 CE')).toBeVisible();
});

test('PIP survey tables retain source records and disclose welfare basis', async ({ page }) => {
  await page.goto(`/?page=economics&release=${releaseId}&indicator=pip-gini-2021-ppp&year=2020`);
  await expect(page.getByRole('heading', { name: 'National survey records at 2020 CE' })).toBeVisible();
  await expect(page.locator('.economics-context')).toContainText('72');
  await page.locator('.economics-table-scroll tbody button').first().click();
  await expect(page.getByText(/Welfare basis: (income|consumption)/)).toBeVisible();
  await expect(page.getByText(/PIP API CSV row \d+/)).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test('PWT tables show source units and original workbook cells', async ({ page }) => {
  await page.goto(`/?page=economics&release=${releaseId}&indicator=pwt11-ctfp&year=2020`);
  await expect(page.getByRole('heading', { name: 'Total factor productivity level, PWT 11' })).toBeVisible();
  await page.getByRole('button', { name: /United States USA/ }).click();
  await expect(page.getByText(/Original locator: Data!Q\d+/)).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test('institutional tables keep zero, unknown, and religion policy distinct from affiliation', async ({ page }) => {
  await page.goto(`/?page=institutions&release=${releaseId}&indicator=vdem16-v2x_suffr&year=1789`);
  await expect(page.getByRole('heading', { name: 'What institutions did—and what we can document.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Legal suffrage among statutory adults' })).toBeVisible();
  await expect(page.locator('.economics-table-scroll tbody')).toContainText('0% of statutory adults');
  await expect(page.locator('.economics-table-scroll tbody')).toContainText('Unknown / not reported');
  await page.locator('.economics-table-scroll tbody button').first().click();
  await expect(page.getByText(/vdem.RData::vdem\[\d+\]::v2x_suffr/)).toBeVisible();
  await page.getByLabel('Source variable').selectOption('vdem16-v2clrelig_ord');
  await expect(page.getByText(/not a share of people or religious affiliation/)).toBeVisible();
  await expect(page.locator('.economics-table-scroll tbody')).toContainText(/respected/);
  await expect(page).toHaveURL(/indicator=vdem16-v2clrelig_ord&year=1789/);
  await expectNoSeriousAccessibilityViolations(page);
});

test('local research keeps religion, written law, and sampled historical claims separate', async ({ page }) => {
  const staged = await Promise.all(['wrp', 'ccp', 'seshat', 'candidates'].map(async (name) =>
    (await page.request.get(`/local-research/${name}.json`)).ok()));
  await page.goto(`/?page=research&release=${releaseId}`);
  await expect(page.getByRole('heading', { name: 'Three sources. Different questions.' })).toBeVisible();
  if (!staged.every(Boolean)) {
    await expect(page.getByRole('alert')).toContainText('Run the local stage commands');
    return;
  }
  await expect(page.getByText(/1,960 WRP records have at least one CCP/)).toBeVisible();
  await page.getByLabel('Find source place, code, or variable').fill('USA');
  await page.getByLabel('Exact source year').selectOption('2000');
  await page.locator('.economics-table-scroll tbody button').first().click();
  await expect(page.getByRole('heading', { name: 'Same-code, same-year CCP candidates' })).toBeVisible();
  await expect(page.getByText(/territorial identity is unreviewed/)).toBeVisible();
  await page.getByRole('button', { name: 'Comparative Constitutions' }).click();
  await expect(page.getByRole('heading', { name: 'Constitution characteristics' })).toBeVisible();
  await page.getByRole('button', { name: 'Seshat Equinox' }).click();
  await page.getByLabel('Find source place, code, or variable').fill('Impeachment');
  await expect(page.locator('.economics-table-scroll tbody')).toContainText('Impeachment');
  await expectNoSeriousAccessibilityViolations(page);
});

test('fails closed when a pinned release is unavailable', async ({ page }) => {
  await page.goto('/?release=atlas-mvp-does-not-exist&metric=population_total&year=2024');
  await expect(page.getByRole('heading', { name: 'The evidence release could not be opened.' })).toBeVisible();
  await expect(page.getByText(/pins Atlas release atlas-mvp-does-not-exist/)).toBeVisible();
});
