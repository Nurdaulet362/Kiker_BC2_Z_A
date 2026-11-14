import { FUTURE_VERSION_WARNING } from "../../src/storage-messages";
import { expect, test, type Page } from "@playwright/test";
import { LESSONS, type Lesson } from "../../src/learning/model";

const key = "fix-the-report.learning.v2";
const cancelled = LESSONS.find(l => l.id === "revenue-cancelled")!;
const conversion = LESSONS.find(l => l.id === "conversion-weighted")!;

async function open(page: Page, lesson: Lesson) {
  await page.goto(`/#lesson/${lesson.id}`);
  await page.getByRole("button", { name: "Открыть отчёт", exact: true }).click();
}
async function complete(page: Page, lesson: Lesson) {
  await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill(lesson.solution);
  await page.getByRole("radio", { name: lesson.diagnosis.find(o => o.id === lesson.correctDiagnosis)!.label.ru, exact: true }).check();
  await page.getByRole("button", { name: "Проверить решение", exact: true }).click();
  await page.getByRole("button", { name: "Закрепить навык", exact: true }).click();
  await page.getByRole("radio", { name: lesson.transfer.options.find(o => o.id === lesson.transfer.correct)!.label.ru, exact: true }).check();
  await page.getByRole("button", { name: "Завершить задание", exact: true }).click();
  await expect(page.locator(".lr-score-number")).toBeVisible();
}

test("two tabs retain both real submissions after concurrent work and reloads", async ({ page, context }) => {
  const other = await context.newPage();
  await open(page, cancelled);
  await open(other, conversion);
  await Promise.all([complete(page, cancelled), complete(other, conversion)]);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).results.length, key)).toBe(2);
  for (const tab of [page, other]) {
    await tab.goto("/#progress");
    await expect(tab.locator(".learn-history-list button")).toHaveCount(2);
    await tab.reload();
    await expect(tab.locator(".learn-history-list button")).toHaveCount(2);
    const saved = await tab.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
    expect(saved.results.map((r: { lessonId: string }) => r.lessonId).sort()).toEqual([cancelled.id, conversion.id].sort());
    expect(saved.results.every((r: { score: number; breakdown: { diagnosis: number; repair: number; transfer: number } }) => r.breakdown.diagnosis + r.breakdown.repair + r.breakdown.transfer === r.score)).toBe(true);
  }
});

test("a solution revealed in one tab remains assisted when the other tab submits", async ({ page, context }) => {
  const other = await context.newPage();
  await open(page, cancelled);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!)?.drafts["revenue-cancelled"]?.step, key)).toBe(1);
  await other.goto(`/#lesson/${cancelled.id}`);
  await expect(other.getByRole("textbox", { name: "Ваша формула", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Подсказка, если понадобится", exact: true }).click();
  await page.getByRole("button", { name: "Следующая подсказка", exact: true }).click();
  await page.getByRole("button", { name: "Показать решение", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Показать решение", exact: true }).click();
  await expect(other.getByRole("region", { name: "Подсказки к занятию" })).toContainText("Уровень 3");
  await complete(other, cancelled);
  await expect(other.locator(".lr-score-number")).toHaveText("75");
  await other.reload();
  await expect(other.locator(".lr-score-number")).toHaveText("75");
  await expect.poll(() => page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    return { closed: saved.closedAttempts["revenue-cancelled"], draft: !!saved.drafts["revenue-cancelled"], hints: saved.results[0]?.hintLevel };
  }, key)).toEqual({ closed: 1, draft: false, hints: 3 });
});

test("the last input survives an immediate reload before the debounce expires", async ({ page }) => {
  await open(page, cancelled);
  await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill("=123.45");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Ваша формула", exact: true })).toHaveValue("=123.45");
});

for (const [route, storageKey] of [["/#lesson/revenue-cancelled", key], ["/#trial", "fix-the-report.work-trial.v1"], ["/#practice", "fix-the-report.cancelled-orders.v1"]]) {
  test(`future-version data stays untouched on ${route}`, async ({ page }) => {
    const future = '{"version":99,"futureData":"must remain byte-for-byte"}';
    await page.addInitScript(({ storageKey, future }) => {
      if (!localStorage.getItem("future-fixture-installed")) {
        localStorage.setItem(storageKey, future);
        localStorage.setItem("future-fixture-installed", "yes");
      }
    }, { storageKey, future });
    await page.goto(route);
    if (route.includes("lesson")) {
      await page.getByRole("button", { name: "Открыть отчёт", exact: true }).click();
      await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill("=42");
    } else if (route.includes("trial")) {
      await page.getByRole("button", { name: "Start the work trial", exact: true }).click();
      await page.getByLabel("Paid revenue formula").fill("=42");
    } else {
      await page.getByRole("button", { name: "Add order", exact: true }).click();
    }
    await page.getByRole("button", { name: "Русский", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: FUTURE_VERSION_WARNING.ru })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /Хранилище браузера недоступно|не может сохранить/ })).toHaveCount(0);
    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: FUTURE_VERSION_WARNING.en })).toBeVisible();
    await expect(page.getByText("Saving unavailable in this browser", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(k => localStorage.getItem(k), storageKey)).toBe(future);
    await page.reload();
    expect(await page.evaluate(k => localStorage.getItem(k), storageKey)).toBe(future);
  });
}

test("invalid saved results are removed from active history only after backing up the original bytes", async ({ page }) => {
  const result = { id: "kept-review", lessonId: "revenue-cancelled", score: 100, diagnosisPassed: true, repairPassed: true, transferPassed: true, hintLevel: 0, solutionRevealed: false, checks: [], at: "2026-11-14T10:00:00.000Z" };
  const original = JSON.stringify({ version: 2, goal: "all", drafts: {}, attempts: {}, results: [result, { ...result, id: "rejected-review", score: -1 }] }, null, 2);
  await page.addInitScript(({ key, original }) => localStorage.setItem(key, original), { key, original });
  await page.goto("/#progress");
  await expect(page.locator(".learn-history-list button")).toHaveCount(1);
  await expect.poll(() => page.evaluate(key => localStorage.getItem(`${key}.backup`), key)).toBe(original);
  const ids = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).results.map((r: { id: string }) => r.id), key);
  expect(ids).toEqual(["kept-review"]);
});
