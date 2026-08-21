import { test, expect, type Page } from '@playwright/test';

/**
 * AreaPicker postcode search.
 * Asserts flexible zip matching (partial digits, spaced/dashed formats)
 * at province/district/subdistrict levels and that zip codes are shown
 * as chips inside subdistrict options.
 */

async function reachAreaStage(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('swing.lang', 'th'));
  await page.goto('/report');
  await page.getByRole('button', { name: 'ยินยอมและเริ่มเล่า' }).click();
  const composer = page.locator('textarea[placeholder], input[placeholder]').last();
  await composer.fill('e2e zip probe');
  await page.getByLabel('ส่ง').click();
  await page.getByRole('button', { name: 'ร่างกายและชีวิต', exact: true }).click();
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await page.getByRole('button', { name: 'ข้าม', exact: true }).click();
  await expect(page.getByRole('combobox').first()).toBeVisible();
}

test('AreaPicker searches by postcode at every level and shows zip chips', async ({ page }) => {
  await reachAreaStage(page);

  // 1) Province level: a postcode narrows down to กรุงเทพมหานคร
  await page.getByRole('combobox').nth(0).click();
  let input = page.locator('[cmdk-input]');
  await input.fill('10200');
  const bkk = page.locator('[cmdk-item]', { hasText: 'กรุงเทพมหานคร' }).first();
  await expect(bkk).toBeVisible();
  await bkk.click();

  // 2) District level: spaced zip "10 200" still matches เขตพระนคร
  await page.getByRole('combobox').nth(1).click();
  input = page.locator('[cmdk-input]');
  await input.fill('10 200');
  const phraNakhon = page.locator('[cmdk-item]', { hasText: 'เขตพระนคร' }).first();
  await expect(phraNakhon).toBeVisible();
  await phraNakhon.click();

  // 3) Subdistrict level: dashed zip "10-200" matches, and options show zip chips
  await page.getByRole('combobox').nth(2).click();
  input = page.locator('[cmdk-input]');
  await input.fill('10-200');
  const firstItem = page.locator('[cmdk-item]').first();
  await expect(firstItem).toBeVisible();
  await expect(page.locator('[cmdk-item] .font-mono', { hasText: '10200' }).first()).toBeVisible();

  // 4) Partial zip prefix "102" lists subdistricts with matching postcodes
  await input.fill('102');
  await expect(page.locator('[cmdk-item]').first()).toBeVisible();
  expect(await page.locator('[cmdk-item] .font-mono').count()).toBeGreaterThan(0);
});
