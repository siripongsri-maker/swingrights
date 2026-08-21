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
  await page.getByRole('button', { name: 'ยินยอมและเริ่มเล่า' }).click();
  const composer = page.locator('textarea[placeholder], input[placeholder]').last();
  await composer.fill('e2e highlight probe');
  await page.getByLabel('ส่ง').click();
  await page.getByRole('button', { name: 'ร่างกายและชีวิต', exact: true }).click();
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

test('AreaPicker shows match-reason badges (prefix / alias / exact)', async ({ page }) => {
  await reachAreaStage(page);
  await page.getByRole('combobox').first().click();
  const input = page.locator('[cmdk-input]');
  await expect(input).toBeVisible();

  // prefix: "เชียง" matches the start of "เชียงใหม่"
  await input.fill('เชียง');
  const chiangItem = page.locator('[cmdk-item]', { hasText: 'เชียงใหม่' }).first();
  await expect(chiangItem).toBeVisible();
  await expect(chiangItem.getByText('ขึ้นต้นด้วยคำค้น')).toBeVisible();

  // alias: "khorat" only matches via nickname → นครราชสีมา
  await input.fill('khorat');
  const khoratItem = page.locator('[cmdk-item]', { hasText: 'นครราชสีมา' }).first();
  await expect(khoratItem).toBeVisible();
  await expect(khoratItem.getByText('ชื่อที่นิยมเรียก')).toBeVisible();

  // exact: typing the full normalized province name
  await input.fill('ภูเก็ต');
  const phuketItem = page.locator('[cmdk-item]', { hasText: 'ภูเก็ต' }).first();
  await expect(phuketItem).toBeVisible();
  await expect(phuketItem.getByText('ตรงทุกตัวอักษร')).toBeVisible();

  // empty search → no badges
  await input.fill('');
  await expect(page.locator('[cmdk-item] >> text=ตรงทุกตัวอักษร')).toHaveCount(0);
});

test('AreaPicker match-reason badges follow the selected language (EN)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('swing.lang', 'en'));
  await page.goto('/report');
  await page.getByRole('button', { name: /consent|agree|start/i }).first().click();
  const composer = page.locator('textarea[placeholder], input[placeholder]').last();
  await composer.fill('e2e reason badge probe');
  await page.getByRole('button', { name: /send/i }).click();
  await page.getByRole('button', { name: /body|physical|life/i }).first().click();
  await page.getByRole('button', { name: /confirm/i }).click();
  await page.getByRole('button', { name: /skip/i }).click();
  await page.getByRole('combobox').first().click();
  const input = page.locator('[cmdk-input]');
  await expect(input).toBeVisible();

  await input.fill('bangkok');
  const bkkItem = page.locator('[cmdk-item]', { hasText: 'กรุงเทพมหานคร' }).first();
  await expect(bkkItem).toBeVisible();
  await expect(bkkItem.getByText('Exact match')).toBeVisible();
});
