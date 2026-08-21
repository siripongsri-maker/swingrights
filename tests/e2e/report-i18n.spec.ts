import { test, expect, type Page } from '@playwright/test';
import { DICT, LANGS, type Lang } from '../../src/i18n';

/**
 * i18n coverage for the anonymous self-report chat flow (/report).
 * Asserts that every stage renders labels, placeholders and bot messages
 * in the selected language, matching the central dictionary exactly.
 */

/** Same fallback chain as the I18nProvider: lang → en → th → key. */
function txt(lang: Lang, key: string): string {
  const e = (DICT as Record<string, { th: string; en: string } & Partial<Record<Lang, string>>>)[key];
  if (!e) throw new Error(`Missing dict key: ${key}`);
  return e[lang] ?? e.en ?? e.th;
}

async function openReport(page: Page, lang: Lang) {
  await page.goto('/');
  await page.evaluate((l) => localStorage.setItem('swing.lang', l), lang);
  await page.goto('/report');
  await expect(page.getByText(txt(lang, 'report.title')).first()).toBeVisible();
}

/** Assert no raw i18n keys leaked into the rendered page. */
async function expectNoRawKeys(page: Page) {
  const body = await page.innerText('body');
  expect(body).not.toMatch(/\b(report|common|area)\.[a-z0-9.]+\b/);
}

const STORY_TEXT = 'e2e i18n probe';

for (const lang of LANGS) {
  test(`self-report flow renders fully in ${lang.id} (${lang.label})`, async ({ page }) => {
    await openReport(page, lang.id);

    // --- stage 1: consent ---
    await expect(page.getByText(txt(lang.id, 'report.chat.greet'), { exact: false }).first()).toBeVisible();
    await expect(page.getByText(txt(lang.id, 'report.consent.title'), { exact: false }).first()).toBeVisible();
    await expect(page.getByText(txt(lang.id, 'report.consent.body'), { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: txt(lang.id, 'report.chat.start') }).click();
    await expect(page.getByText(txt(lang.id, 'report.chat.agreed')).first()).toBeVisible();

    // --- stage 2: story ---
    await expect(page.getByText(txt(lang.id, 'report.story.title'), { exact: false }).first()).toBeVisible();
    await expect(page.getByText(txt(lang.id, 'report.story.hint'), { exact: false }).first()).toBeVisible();
    const composer = page.locator(`textarea[placeholder], input[placeholder]`).last();
    await expect(composer).toHaveAttribute('placeholder', txt(lang.id, 'report.chat.input.placeholder'));
    await composer.fill(STORY_TEXT);
    await page.getByLabel(txt(lang.id, 'report.chat.send')).click();
    await expect(page.getByText(STORY_TEXT).first()).toBeVisible();

    // --- stage 3: violation types ---
    await expect(page.getByText(txt(lang.id, 'report.type.title'), { exact: false }).first()).toBeVisible();
    for (const k of ['body', 'labor', 'health', 'property', 'other'] as const) {
      await expect(page.getByRole('button', { name: txt(lang.id, `report.type.${k}`), exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: txt(lang.id, 'report.type.body'), exact: true }).click();
    await page.getByRole('button', { name: txt(lang.id, 'report.chat.confirm'), exact: true }).click();
    await expect(page.getByText(txt(lang.id, 'report.type.body'), { exact: false }).first()).toBeVisible();

    // --- stage 4: photos ---
    await expect(page.getByText(txt(lang.id, 'report.chat.photos.ask'), { exact: false }).first()).toBeVisible();
    await expect(page.getByText(txt(lang.id, 'report.photo.add'), { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: txt(lang.id, 'report.chat.skip'), exact: true }).click();
    await expect(page.getByText(txt(lang.id, 'report.chat.skipped')).first()).toBeVisible();

    // --- stage 5: area ---
    await expect(page.getByText(txt(lang.id, 'report.area.title'), { exact: false }).first()).toBeVisible();
    await expect(page.getByText(txt(lang.id, 'common.optional'), { exact: false }).first()).toBeVisible();
    await expect(page.getByText(txt(lang.id, 'report.area.hint'), { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: txt(lang.id, 'report.chat.skip'), exact: true }).click();

    // --- stage 6: contact (stop before submit — no junk cases) ---
    await expect(page.getByText(txt(lang.id, 'report.contact.title'), { exact: false }).first()).toBeVisible();
    await expect(page.getByText(txt(lang.id, 'report.contact.hint'), { exact: false }).first()).toBeVisible();
    await expect(page.getByPlaceholder(txt(lang.id, 'report.contact.name'))).toBeVisible();
    await expect(page.getByPlaceholder(txt(lang.id, 'report.contact.phone'))).toBeVisible();
    await expect(page.getByRole('button', { name: txt(lang.id, 'report.submit') })).toBeVisible();

    await expectNoRawKeys(page);
  });
}

test('switching language mid-flow localizes subsequent bot messages', async ({ page }) => {
  await openReport(page, 'th');
  await expect(page.getByText(txt('th', 'report.chat.greet'), { exact: false }).first()).toBeVisible();

  // switch TH → EN via the header toggle
  await page.getByLabel('Language / ภาษา').click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByText(txt('en', 'report.title')).first()).toBeVisible();

  // messages sent BEFORE the switch stay in Thai (they are chat history)…
  await expect(page.getByText(txt('th', 'report.chat.greet'), { exact: false }).first()).toBeVisible();
  // …but everything the bot says after the switch must be English
  await page.getByRole('button', { name: txt('en', 'report.chat.start') }).click();
  await expect(page.getByText(txt('en', 'report.chat.agreed')).first()).toBeVisible();
  await expect(page.getByText(txt('en', 'report.story.title'), { exact: false }).first()).toBeVisible();
  const composer = page.locator(`textarea[placeholder], input[placeholder]`).last();
  await expect(composer).toHaveAttribute('placeholder', txt('en', 'report.chat.input.placeholder'));
  await expectNoRawKeys(page);
});
