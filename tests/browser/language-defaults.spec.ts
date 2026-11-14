import { expect, test, type Page } from "@playwright/test";
import { LESSONS } from "../../src/learning/model";

const languageKey = "fix-the-report.language";
const titles = {
  en: "Fix the Report — Spreadsheet assessment practice",
  ru: "Fix the Report — практика работы с таблицами",
};
const descriptions = {
  en: "Train on realistic sales-ops and analyst tasks: fix a report, explain a decision, and get feedback in minutes.",
  ru: "Тренируйтесь на задачах по продажам и аналитике: исправляйте отчёты, объясняйте решения и получайте разбор за несколько минут.",
};
const headlines = {
  en: "Practice for your next spreadsheet assessment.",
  ru: "Подготовьтесь к следующему тестовому заданию по таблицам.",
};
const routes = ["/", "/#progress", "/#lesson/revenue-cancelled", "/#trial", "/#practice"];

// A Russian browser preference must never override the product default.
test.use({ locale: "ru-RU" });

async function expectLanguage(page: Page, language: "en" | "ru") {
  await expect(page.locator("html")).toHaveAttribute("lang", language);
  await expect(page).toHaveTitle(titles[language]);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", descriptions[language]);
  const english = page.getByRole("button", { name: "English", exact: true });
  const russian = page.getByRole("button", { name: "Русский", exact: true });
  await expect(english).toBeVisible();
  await expect(russian).toBeVisible();
  await expect(english).toHaveAttribute("aria-pressed", String(language === "en"));
  await expect(russian).toHaveAttribute("aria-pressed", String(language === "ru"));
}

for (const route of routes) {
  test(`a fresh Russian-browser context opens ${route} in English`, async ({ page }) => {
    await page.goto(route);
    expect(await page.evaluate(() => navigator.language)).toBe("ru-RU");
    await expectLanguage(page, "en");
    if (route === "/#practice") {
      await expect(page).toHaveURL(/#lesson\/revenue-cancelled$/);
      await expect(page.getByRole("heading", { name: "The money that never arrived", exact: true })).toBeVisible();
    }
    if (route === "/") {
      await expect(page.getByRole("heading", { name: headlines.en, exact: true })).toBeVisible();
      await expect(page.getByText(descriptions.en, { exact: true })).toBeVisible();
    }
  });
}

test("the initial HTML already contains English metadata before React runs", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('<html lang="en">');
  expect(html).toContain(`<title>${titles.en}</title>`);
  expect(html).toContain(`content="${descriptions.en}"`);
});

test("both language choices persist through reload using the existing storage key", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expectLanguage(page, "en");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expectLanguage(page, "ru");
  await expect(page.getByRole("heading", { name: headlines.ru, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.reload();
  await expectLanguage(page, "ru");
  expect(await page.evaluate(key => localStorage.getItem(key), languageKey)).toBe("ru");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expectLanguage(page, "en");
  await page.reload();
  await expectLanguage(page, "en");
  expect(await page.evaluate(key => localStorage.getItem(key), languageKey)).toBe("en");
  expect(await page.evaluate(() => localStorage.getItem("fix-the-report.lang"))).toBeNull();
});

for (const saved of ["ru", "en", "invalid"]) {
  test(`a previously saved ${saved} language is handled consistently on every route`, async ({ page }) => {
    await page.addInitScript(({ key, saved }) => {
      if (localStorage.getItem("language-fixture-installed")) return;
      localStorage.setItem(key, saved);
      localStorage.setItem("language-fixture-installed", "yes");
    }, { key: languageKey, saved });
    const expected = saved === "ru" ? "ru" : "en";
    for (const route of routes) {
      await page.goto(route);
      await expectLanguage(page, expected);
      if (route === "/#practice") await expect(page).toHaveURL(/#lesson\/revenue-cancelled$/);
    }
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), languageKey)).toBe(expected);
  });
}

test("blocked storage keeps the English default and allows switching within the open tab", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); };
  });
  await page.goto("/");
  await expectLanguage(page, "en");
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expectLanguage(page, "ru");
  await page.evaluate(() => { location.hash = "#progress"; });
  await expectLanguage(page, "ru");
  await page.evaluate(() => { location.hash = "#practice"; });
  await expect(page).toHaveURL(/#lesson\/revenue-cancelled$/);
  await expectLanguage(page, "ru");
  await expect(page.getByRole("heading", { name: "Деньги, которых не было", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expectLanguage(page, "en");
  await page.reload();
  await expectLanguage(page, "en");
});

test("a fresh English lesson completes with real input and keeps the language switch in its review", async ({ page }) => {
  const lesson = LESSONS.find(item => item.id === "revenue-cancelled")!;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByTestId(`lesson-${lesson.id}`).click();
  await expectLanguage(page, "en");
  await page.getByRole("button", { name: "Open the report", exact: true }).click();
  await page.getByLabel("Amount, $, row 4", { exact: true }).fill("2300");
  await expect(page.locator(".lr-output strong")).toHaveText(/3,680/);
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill(lesson.solution);
  await expect(page.locator(".lr-output strong")).toHaveText(/1,200/);
  await page.getByRole("radio", { name: lesson.diagnosis.find(option => option.id === lesson.correctDiagnosis)!.label.en, exact: true }).check();
  await page.getByRole("button", { name: "Check solution", exact: true }).click();
  await page.getByRole("button", { name: "Apply the skill", exact: true }).click();
  await page.getByRole("radio", { name: lesson.transfer.options.find(option => option.id === lesson.transfer.correct)!.label.en, exact: true }).check();
  await page.getByRole("button", { name: "Finish lesson", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your lesson review", exact: true })).toBeVisible();
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  await expectLanguage(page, "en");
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Задание разобрано", exact: true })).toBeVisible();
  await expectLanguage(page, "ru");
  await page.reload();
  await expectLanguage(page, "ru");
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  expect(errors).toEqual([]);
});
