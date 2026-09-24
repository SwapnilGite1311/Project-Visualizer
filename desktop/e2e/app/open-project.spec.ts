import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';
import { desktopDir, enginePath, fixtureSmall } from '../helpers/paths';

test('start → open project → map', async () => {
  // A fresh profile keeps the test independent of the developer's own settings.
  const userData = mkdtempSync(join(tmpdir(), 'pv-e2e-'));
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userData}`],
    cwd: desktopDir,
    env: { ...process.env, PV_ENGINE_PATH: enginePath() },
  });
  try {
    const page = await app.firstWindow();
    await page.waitForFunction(async () => (await window.pv.invoke('pv:app.info')).value?.engineStatus === 'ready', null, {
      timeout: 30000,
    });
    await page.evaluate((root) => window.pv.invoke('pv:settings.set', { key: 'recentProjects', value: [root] }), fixtureSmall);
    await page.reload();
    await page.getByText('pyproj_small', { exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('pyproj_small', { timeout: 30000 });
    await expect(page.locator('[data-area="center"] canvas').first()).toBeAttached({ timeout: 30000 });
    await expect(page.getByText('Engine ready')).toBeVisible();
  } finally {
    await app.close();
  }
});
