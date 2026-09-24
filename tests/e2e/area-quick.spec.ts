import { test, expect, type Page } from '@playwright/test';

/**
 * AreaPicker quick actions:
 *  - "จังหวัดใกล้ฉัน" picks the province closest to the device location
 *  - clear-search button inside each dropdown resets the query
 *  - EN/local name toggle swaps the primary display language
 *  - denied geolocation shows guidance and offers manual search
 */

async function reachAreaStage(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('swing.lang', 'th'));
  await page.goto('/report');
  await page.getByRole('button', { name: 'ยินยอมและเริ่มเล่า' }).click();
  const composer = page.locator('textarea[placeholder], input[placeholder]').last();
  await composer.fill('e2e quick-actions probe');
  await page.getByLabel('ส่ง').click();
  await page.getByRole('button', { name: 'ร่างกายและชีวิต', exact: true }).click();
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await page.getByRole('button', { name: 'ข้าม', exact: true }).click();
  await expect(page.getByRole('combobox').first()).toBeVisible();
}

test.skip('nearest-province button picks the province closest to mocked geolocation', async ({ context, page }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 13.75, longitude: 100.5 }); // central Bangkok
  await reachAreaStage(page);

  await page.getByRole('button', { name: 'จังหวัดใกล้ฉัน' }).click();
  await expect(page.getByRole('combobox').first()).toContainText('กรุงเทพมหานคร');
});

test('clear-search button resets the dropdown query', async ({ page }) => {
  await reachAreaStage(page);
  await page.getByRole('combobox').first().click();
  const input = page.locator('[cmdk-input]');
  await expect(input).toBeVisible();

  await input.fill('เชียง');
  const clearBtn = page.getByRole('button', { name: 'ล้างคำค้นหา' });
  await expect(clearBtn).toBeVisible();
  await clearBtn.click();
  await expect(input).toHaveValue('');
  // full unfiltered list is back (77 provinces > the filtered 3)
  expect(await page.locator('[cmdk-item]').count()).toBeGreaterThan(10);
});

test('EN/local toggle swaps the primary display name', async ({ page }) => {
  await reachAreaStage(page);

  await page.getByRole('button', { name: 'สลับชื่อ EN/ท้องถิ่น' }).click();
  await page.getByRole('combobox').first().click();
  // primary label is now the English name
  const chiang = page.locator('[cmdk-item]', { hasText: 'Chiang Mai' }).first();
  await expect(chiang).toBeVisible();
  await chiang.click();
  // trigger shows English first, Thai in parentheses
  await expect(page.getByRole('combobox').first()).toContainText('Chiang Mai (เชียงใหม่)');
});

test.skip('denied geolocation shows guidance and offers manual search', async ({ page }) => {
  await reachAreaStage(page);

  // Mock geolocation to permanently deny, like a real browser block
  await page.evaluate(() => {
    navigator.geolocation.getCurrentPosition = (_success, error, _options) => {
      error?.({ code: 1, message: 'User denied Geolocation' } as GeolocationPositionError);
    };
  });

  await page.getByRole('button', { name: 'จังหวัดใกล้ฉัน' }).click();

  // Guidance banner is shown
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('ไม่สามารถเข้าถึงตำแหน่งได้');
  await expect(page.getByRole('button', { name: 'กรอกพื้นที่เอง' })).toBeVisible();

  // Province dropdown opens automatically for manual search
  await expect(page.locator('[cmdk-input]')).toBeVisible();
  await expect(page.locator('[cmdk-item]').first()).toBeVisible();
});
