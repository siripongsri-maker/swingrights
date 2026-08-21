import { test, expect, type Page } from '@playwright/test';

/**
 * AreaPicker search-term highlighting.
 * Asserts that the matched substring is wrapped in <mark> inside the option
 * list — for Thai queries, romanized queries, fuzzy variants and aliases.
 */

async function reachAreaStage(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('swing.lang', 'th'));
  await page.goto('/report');
  await page.getByRole('button', { name: 'เริ่มเล่า' }).click();
  const composer = page.locator('textarea[placeholder], input[placeholder]').last();
  await composer.fill('e2e highlight probe');
  await page.getByLabel('ส่ง').click();
  await page.getByRole('button', { name: 'ด้านร่างกายและความปลอดภัย', exact: true }).click();
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await page.getByRole('button', { name: 'ข้าม', exact: true }).click();
  await expect(page.getByRole('combobox').first()).toBeVisible();
}

test('AreaPicker highlights matched text (TH / roman / fuzzy / alias)', async ({ page }) => {
  await reachAreaStage(page);

  // open the province dropdown
  await page.getByRole('combobox').first().click();
  const input = page.locator('[cmdk-input]');
  await expect(input).toBeVisible();

  // 1) Thai query → highlight inside the Thai label
  await input.fill('เชียง');
  const chiangItem = page.locator('[cmdk-item]', { hasText: 'เชียงใหม่' }).first();
  await expect(chiangItem).toBeVisible();
  await expect(chiangItem.locator('mark').first()).toHaveText('เชียง');

  // 2) Romanized query → highlight inside the English sub-label
  await input.fill('chiang');
  await expect(chiangItem.locator('mark').first()).toHaveText('Chiang');

  // 3) Fuzzy romanization variant (ph→p) still highlights the official spelling
  await input.fill('puket');
  const phuketItem = page.locator('[cmdk-item]', { hasText: 'ภูเก็ต' }).first();
  await expect(phuketItem).toBeVisible();
  await expect(phuketItem.locator('mark').first()).toHaveText('Phuket');

  // 4) Alias query ("khorat") highlights the official English name it maps to
  await input.fill('khorat');
  const khoratItem = page.locator('[cmdk-item]', { hasText: 'นครราชสีมา' }).first();
  await expect(khoratItem).toBeVisible();
  await expect(khoratItem.locator('mark').first()).toHaveText('Nakhon Ratchasima');

  // 5) No match → no stray marks rendered
  await input.fill('zzz');
  await expect(page.locator('[cmdk-item] mark')).toHaveCount(0);
});
