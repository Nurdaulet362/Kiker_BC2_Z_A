import { expect, test, type Page } from "@playwright/test";
import { evaluateLesson } from "../../src/learning/engine";
import { initialDraft, initialLearning, LEARNING_KEY, LESSONS, type LearningState } from "../../src/learning/model";
import { recordLessonResult } from "../../src/learning/persistence";

const demo = process.env.VITE_DEMO_ACCESS === "true";
const first = LESSONS.find(lesson => lesson.id === "revenue-cancelled")!;
const pro = LESSONS.find(lesson => lesson.id === "revenue-refunds")!;

async function expectBanner(page: Page, language: "en" | "ru" = "en") {
  const banner = page.getByTestId("demo-access-banner");
  if (demo) {
    await expect(banner).toHaveText(language === "en" ? "Demo access — not a purchase" : "Демо-доступ — не покупка");
    await expect(banner).toBeVisible();
    const box = await banner.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  } else {
    await expect(banner).toHaveCount(0);
  }
}

async function expectPricing(page: Page) {
  await expect(page).toHaveURL(/#pricing$/);
  await expect(page.getByTestId("pricing-screen")).toBeVisible();
  await expect(page.locator(".lr-workspace, .lr-review, .sim-app")).toHaveCount(0);
  await expectBanner(page);
}

async function seedLearning(page: Page, state: LearningState) {
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: LEARNING_KEY, state });
}

async function learningState(page: Page): Promise<LearningState> {
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), LEARNING_KEY)).not.toBeNull();
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), LEARNING_KEY);
}

for (const language of ["en", "ru"] as const) {
  test(`pricing explains the two plans without a payment form in ${language} at 375px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(language => localStorage.setItem("fix-the-report.language", language), language);
    await page.goto("/#pricing");
    const pricing = page.getByTestId("pricing-screen");
    await expect(pricing.getByRole("heading", { level: 1 })).toHaveText(language === "en" ? "Choose your practice plan" : "Выберите план обучения");
    const free = pricing.getByRole("region", { name: "Free", exact: true });
    const paid = pricing.getByRole("region", { name: "Pro", exact: true });
    await expect(free).toContainText(language === "en" ? "3 foundation lessons" : "3 базовых занятия");
    await expect(free).toContainText(language === "en" ? "Repeat the foundation lessons as often as you need" : "Повторяйте базовые занятия сколько нужно");
    await expect(paid).toContainText(language === "en" ? "3 practice-level lessons" : "3 занятия уровня «Закрепление»");
    await expect(paid).toContainText("Work Trial");
    await expect(paid).toContainText("$19");
    await expect(paid).toContainText(language === "en" ? "/month" : "/месяц");
    await expect(paid).toContainText(language === "en" ? "Payments are not connected yet. This is a product test." : "Оплата пока не подключена. Это тест продукта.");
    await expect(pricing.getByRole("link", { name: /Get notified|Узнать о запуске/ })).toHaveCount(0);
    await expect(pricing.locator("form, input, iframe")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expectBanner(page, language);
    const freeLink = free.getByRole("link");
    await freeLink.focus();
    expect(await freeLink.evaluate(element => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
    })).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#lesson\/revenue-cancelled$/);
    await expect(page.locator(".lr-workspace h1")).toHaveText(first.title[language]);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expectBanner(page, language);
  });
}

test("all three practice routes respect the build mode on direct entry and reload", async ({ page }) => {
  for (const lesson of LESSONS.filter(lesson => lesson.level === "practice")) {
    await page.goto(`/#lesson/${lesson.id}`);
    if (demo) {
      await expect(page.locator(".lr-workspace h1")).toHaveText(lesson.title.en);
      await expectBanner(page);
    } else await expectPricing(page);
    await page.reload();
    if (demo) {
      await expect(page.locator(".lr-workspace h1")).toHaveText(lesson.title.en);
      await expectBanner(page);
    } else await expectPricing(page);
  }
});

test("a locked recommendation does not start an attempt or add entitlement fields", async ({ page }) => {
  const failed = evaluateLesson({ ...initialDraft(first.id), lessonId: first.id, formula: "=1200", diagnosis: first.correctDiagnosis, transfer: first.transfer.correct });
  await seedLearning(page, recordLessonResult(initialLearning(), failed));
  await page.goto("/");
  await expect(page.locator(".learn-feature h2")).toHaveText(pro.title.en);
  const before = await learningState(page);
  await page.locator(".learn-feature .lr-btn-primary").click();
  if (demo) {
    await expect(page.locator(".lr-workspace h1")).toHaveText(pro.title.en);
    await expectBanner(page);
    expect(Object.keys(await learningState(page)).sort()).toEqual(Object.keys(before).sort());
  } else {
    await expectPricing(page);
    await page.reload();
    expect(await learningState(page)).toEqual(before);
    await page.goto("/");
    await page.getByTestId(`lesson-${pro.id}`).click();
    await expectPricing(page);
    expect(await learningState(page)).toEqual(before);
  }
});

test("all foundation lessons remain accessible and a completed free lesson can be repeated", async ({ page }) => {
  for (const lesson of LESSONS.filter(lesson => lesson.level === "foundation")) {
    await page.goto(`/#lesson/${lesson.id}`);
    await expect(page.locator(".lr-workspace h1")).toHaveText(lesson.title.en);
  }
  await page.goto(`/#lesson/${first.id}`);
  await page.getByRole("button", { name: "Open the report", exact: true }).click();
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill(first.solution);
  await page.getByRole("radio", { name: first.diagnosis.find(item => item.id === first.correctDiagnosis)!.label.en, exact: true }).check();
  await page.getByRole("button", { name: "Check solution", exact: true }).click();
  await page.getByRole("button", { name: "Apply the skill", exact: true }).click();
  await page.getByRole("radio", { name: "$900", exact: true }).check();
  await page.getByRole("button", { name: "Finish lesson", exact: true }).click();
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".lr-workspace h1")).toHaveText(first.title.en);
  await expect(page.getByTestId("pricing-screen")).toHaveCount(0);
});

test("saved Pro reviews use the same gate without losing the stored result", async ({ page }) => {
  const result = evaluateLesson({ ...initialDraft(pro.id), lessonId: pro.id, formula: pro.solution, diagnosis: pro.correctDiagnosis, transfer: pro.transfer.correct });
  await seedLearning(page, recordLessonResult(initialLearning(), result));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const before = await learningState(page);
  for (const reviewId of [result.id, result.at]) {
    await page.goto(`/#review/${reviewId}`);
    if (demo) {
      await expect(page.locator(".lr-score-number")).toHaveText("100");
      await expectBanner(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expectBanner(page);
      await page.getByRole("button", { name: "Русский", exact: true }).click();
      await expectBanner(page, "ru");
      await page.getByRole("button", { name: "English", exact: true }).click();
    } else await expectPricing(page);
    expect((await learningState(page)).results).toEqual(before.results);
  }
});

test("protected navigation uses replace so Back and Forward do not loop", async ({ page }) => {
  await page.goto("/#progress");
  await expect(page.getByRole("heading", { name: "See how far you’ve come", exact: true })).toBeVisible();
  await page.evaluate(() => { location.hash = "#lesson/revenue-refunds"; });
  if (demo) await expect(page.locator(".lr-workspace h1")).toHaveText(pro.title.en);
  else await expectPricing(page);
  await page.goBack();
  await expect(page).toHaveURL(/#progress$/);
  await page.goForward();
  if (demo) await expect(page).toHaveURL(/#lesson\/revenue-refunds$/);
  else await expectPricing(page);
});

test("stored access claims cannot change the build gate and Work Trial keeps its banner while scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    localStorage.setItem("VITE_DEMO_ACCESS", "true");
    localStorage.setItem("DEMO_ACCESS", "true");
    localStorage.setItem("fix-the-report.pro", "true");
  });
  await page.goto("/#trial");
  if (!demo) {
    await expectPricing(page);
    expect(await page.evaluate(() => localStorage.getItem("fix-the-report.work-trial.v1"))).toBeNull();
    return;
  }
  await expectBanner(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expectBanner(page);
  await page.getByRole("button", { name: "Start the work trial", exact: true }).click();
  await expect(page.locator(".sim-live-result strong")).toHaveText("$3,280.00");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expectBanner(page);
  await page.goto(`/#lesson/${pro.id}`);
  await expectBanner(page);
  await page.getByRole("button", { name: "Open the report", exact: true }).click();
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill(pro.solution);
  await expect(page.locator(".lr-output strong")).toHaveText("$750.00");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expectBanner(page);
});
