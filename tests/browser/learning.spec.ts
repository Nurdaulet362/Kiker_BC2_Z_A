import { expect, test, type Page } from "@playwright/test";
import { LESSONS, shuffleOptions } from "../../src/learning/model";
import { expectLessonDestination } from "./access-mode";

// These scenarios explicitly exercise Russian; later choices must survive reloads.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    if (localStorage.getItem("fix-the-report.language") === null) {
      localStorage.setItem("fix-the-report.language", "ru");
    }
  });
});

const cancelled = LESSONS.find((lesson) => lesson.id === "revenue-cancelled")!;
const refunds = LESSONS.find((lesson) => lesson.id === "revenue-refunds")!;
const diagnosis = cancelled.diagnosis.find(
  (option) => option.id === cancelled.correctDiagnosis,
)!;
const transfer = cancelled.transfer.options.find(
  (option) => option.id === cancelled.transfer.correct,
)!;

test("a timed-out worker shows the timeout reason in Russian and follows the language switch", async ({ page }) => {
  await page.addInitScript(() => {
    class SilentWorker {
      postMessage() {}
      terminate() {}
    }
    Object.defineProperty(window, "Worker", { value: SilentWorker });
  });
  await startCancelled(page);
  await expect(page.locator(".lr-output-error")).toContainText("Время ожидания расчёта истекло", { timeout: 10000 });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".lr-output-error")).toContainText(/too long|timed out/i);
});

test("successive previews and grading reuse the same learning worker", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const counts = { starts: 0 };
    Object.defineProperty(window, "workerCounts", { value: counts });
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        counts.starts += 1;
      }
    };
  });
  await startCancelled(page);
  await expect(page.locator(".lr-output strong")).toHaveText(/2\s?030/);
  await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill("=42");
  await expect(page.locator(".lr-output strong")).toHaveText(/42/);
  await submitCancelled(page);
  expect(await page.evaluate(() => (window as unknown as { workerCounts: { starts: number } }).workerCounts.starts)).toBe(1);
});

test("grading timeout retains its code when the learner switches to Russian", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: { type: string }) {
        if (message.type !== "grade") super.postMessage(message);
      }
    };
  });
  await startCancelled(page);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill(cancelled.solution);
  await page.getByRole("radio", { name: diagnosis.label.en, exact: true }).check();
  await page.getByRole("button", { name: "Check solution", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("too long", { timeout: 10000 });
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Время ожидания расчёта истекло");
});

test("reviews with the same timestamp open independently by id and keep the old timestamp route", async ({ page }) => {
  await page.addInitScript(() => {
    const base = { lessonId: "revenue-cancelled", score: 100, diagnosisPassed: true, repairPassed: true, transferPassed: true, hintLevel: 0, solutionRevealed: false, checks: [], at: "2026-11-14T10:00:00.000Z" };
    localStorage.setItem("fix-the-report.learning.v2", JSON.stringify({
      version: 2, goal: "all", drafts: {}, attempts: {}, results: [
        { ...base, id: "same-ms-a", score: 50, repairPassed: false, breakdown: { diagnosis: 20, repair: 0, transfer: 30 } },
        { ...base, id: "same-ms-b", breakdown: { diagnosis: 20, repair: 50, transfer: 30 } },
      ],
    }));
  });
  await page.goto("/#review/same-ms-a");
  await expect(page.locator(".lr-score-number")).toHaveText("50");
  await page.goto("/#review/same-ms-b");
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  await page.goto("/#review/2026-11-14T10:00:00.000Z");
  await expect(page.locator(".lr-score-number")).toHaveText("50");
});

async function startCancelled(page: Page) {
  await page.goto("/");
  await page.getByTestId(`lesson-${cancelled.id}`).click();
  await page.getByRole("button", { name: "Открыть отчёт", exact: true }).click();
}

async function submitCancelled(page: Page, formula = cancelled.solution) {
  await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill(formula);
  await page.getByRole("radio", { name: diagnosis.label.ru, exact: true }).check();
  await page.getByRole("button", { name: "Проверить решение", exact: true }).click();
  await page.getByRole("button", { name: "Закрепить навык", exact: true }).click();
  await page.getByRole("radio", { name: transfer.label.ru, exact: true }).check();
  await page.getByRole("button", { name: "Завершить задание", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Задание разобрано", exact: true })).toBeVisible();
}

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  ).toBe(false);
}

test("an ambiguous thousands separator shows an error instead of changing the reported total", async ({ page }) => {
  await startCancelled(page);
  const amount = page.getByLabel("Сумма, $, строка 4", { exact: true });
  await amount.fill("2,300");
  await expect(page.getByRole("alert")).toContainText("Укажите число без разделителя тысяч, например 1000");
  await expect(page.locator(".lr-output strong")).toHaveText("—");
  await page.reload();
  await expect(amount).toHaveValue("2,300");
  await expect(page.getByRole("alert")).toContainText("Укажите число без разделителя тысяч");
  await amount.fill("2 300");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".lr-output strong")).toHaveText(/3\s?680/);
});

test("progressive hints require confirmation and a revealed solution does not complete the lesson", async ({ page }) => {
  await startCancelled(page);
  const hints = page.getByRole("region", { name: "Подсказки к занятию" });
  await page.getByRole("button", { name: "Подсказка, если понадобится", exact: true }).click();
  await expect(hints.getByText("Уровень 1", { exact: true })).toBeVisible();
  await expect(hints).not.toContainText(cancelled.solution);
  await page.getByRole("button", { name: "Следующая подсказка", exact: true }).click();
  await expect(hints.getByText("Уровень 2", { exact: true })).toBeVisible();
  await expect(hints).not.toContainText(cancelled.solution);
  await page.getByRole("button", { name: "Показать решение", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Продолжить самостоятельно" }).click();
  await expect(hints).not.toContainText(cancelled.solution);
  await page.getByRole("button", { name: "Показать решение", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Показать решение", exact: true }).click();
  await expect(hints).toContainText(cancelled.solution);
  await page.reload();
  await expect(hints.getByText("Уровень 3", { exact: true })).toBeVisible();
  await submitCancelled(page);
  await expect(page.locator(".lr-score-number")).toHaveText("75");
  await expect(page.getByRole("status")).toContainText("Вы смотрели решение — попробуйте похожий кейс");
  await page.reload();
  await expect(page.locator(".lr-score-number")).toHaveText("75");
  await page.getByRole("button", { name: "Моё обучение", exact: true }).click();
  const card = page.locator(".learn-course").filter({ has: page.getByTestId(`lesson-${cancelled.id}`) });
  await expect(card.locator(".learn-course-level")).toHaveText("Закрепите навык");
  await expect(page.locator(".learn-progress-ring strong")).toHaveText("0/6");
  await page.getByTestId(`lesson-${cancelled.id}`).click();
  await page.getByRole("button", { name: "Открыть отчёт", exact: true }).click();
  await expect(page.getByRole("button", { name: "Подсказка, если понадобится", exact: true })).toBeVisible();
});

test("answer order stays fixed during an attempt and uses the next attempt seed on retry", async ({ page }) => {
  await startCancelled(page);
  const ids = () => page.locator('input[name="diagnosis"]').evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
  const first = shuffleOptions(cancelled.diagnosis, `${cancelled.id}:1:diagnosis`).map(option => option.id);
  await expect.poll(ids).toEqual(first);
  await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill(cancelled.solution);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect.poll(ids).toEqual(first);
  await page.reload();
  await expect.poll(ids).toEqual(first);
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await submitCancelled(page);
  await page.getByRole("button", { name: "Попробовать ещё раз", exact: true }).click();
  await page.getByRole("button", { name: "Открыть отчёт", exact: true }).click();
  await expect.poll(ids).toEqual(shuffleOptions(cancelled.diagnosis, `${cancelled.id}:2:diagnosis`).map(option => option.id));
});

test("a saved draft keeps its seed beyond the hundred-result history limit", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("attempt-counter-fixture")) return;
    const result = { lessonId: "revenue-cancelled", score: 100, diagnosisPassed: true, repairPassed: true, transferPassed: true, hintLevel: 0, solutionRevealed: false, checks: [], at: "2026-11-14T10:00:00.000Z" };
    localStorage.setItem("fix-the-report.learning.v2", JSON.stringify({ version: 2, goal: "all", drafts: {}, attempts: { "revenue-cancelled": 120 }, results: Array.from({ length: 100 }, () => result) }));
    localStorage.setItem("attempt-counter-fixture", "set");
  });
  await startCancelled(page);
  const ids = () => page.locator('input[name="diagnosis"]').evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
  const expected = shuffleOptions(cancelled.diagnosis, `${cancelled.id}:121:diagnosis`).map(option => option.id);
  await expect.poll(ids).toEqual(expected);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("fix-the-report.learning.v2")!);
    state.results = [];
    localStorage.setItem("fix-the-report.learning.v2", JSON.stringify(state));
  });
  await page.reload();
  await expect.poll(ids).toEqual(expected);
  await submitCancelled(page);
  await page.getByRole("button", { name: "Попробовать ещё раз", exact: true }).click();
  await page.getByRole("button", { name: "Открыть отчёт", exact: true }).click();
  await expect.poll(ids).toEqual(shuffleOptions(cancelled.diagnosis, `${cancelled.id}:122:diagnosis`).map(option => option.id));
});

test("lesson review uses persisted score components and supports older reviews without them", async ({ page, browser }) => {
  await page.addInitScript(() => {
    const result = {
      lessonId: "revenue-cancelled", score: 80,
      diagnosisPassed: true, repairPassed: false, transferPassed: true,
      breakdown: { diagnosis: 15, repair: 40, transfer: 25 },
      hintLevel: 0, solutionRevealed: false,
      checks: [], at: "2026-11-14T10:00:00.000Z",
    };
    if (!localStorage.getItem("review-breakdown-fixture")) {
      localStorage.setItem("fix-the-report.learning.v2", JSON.stringify({ version: 2, results: [result], drafts: {}, goal: "all" }));
      localStorage.setItem("review-breakdown-fixture", "set");
    }
  });
  await page.goto("/#review/2026-11-14T10:00:00.000Z");
  await expect(page.locator(".lr-review-item-top > span")).toHaveText(["15 / 20", "40 / 50", "25 / 30"]);
  const legacyState = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("fix-the-report.learning.v2")!);
    delete state.results[0].breakdown;
    return state;
  });
  // A fresh browser has no richer copy to reconcile into this legacy fixture.
  const legacyContext = await browser.newContext();
  await legacyContext.addInitScript(state => localStorage.setItem("fix-the-report.learning.v2", JSON.stringify(state)), legacyState);
  const legacyPage = await legacyContext.newPage();
  await legacyPage.goto(new URL("/#review/2026-11-14T10:00:00.000Z", page.url()).href);
  await expect(legacyPage.locator(".lr-review-item-top > span")).toHaveText(["20 / 20", "30 / 50", "30 / 30"]);
  await legacyContext.close();
});

test("a complete Russian lesson saves its review and starts the recommended case", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startCancelled(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.getByLabel("Сумма, $, строка 4", { exact: true }).fill("2300");
  await expect(page.locator(".lr-output strong")).toHaveText(/3\s?680/);
  await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill(cancelled.solution);
  await expect(page.locator(".lr-output strong")).toHaveText(/1\s?200/);
  await submitCancelled(page);
  await expect(page.locator(".lr-score-number")).toContainText("100");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Задание разобрано", exact: true })).toBeVisible();
  await expect(page.locator(".lr-score-number")).toContainText("100");
  await page.getByRole("button", { name: "Следующее задание", exact: true }).click();
  await expect(page.getByRole("button", { name: "Открыть отчёт", exact: true })).toBeVisible();
  await expect(page.locator(".lr-workspace h1")).not.toHaveText(cancelled.title.ru);
  await page.getByRole("button", { name: "Мой прогресс", exact: true }).click();
  await expect(page.getByText(cancelled.title.ru, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(cancelled.title.ru, { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a hard-coded answer fails varied data and routes to a different case in the same skill", async ({ page }) => {
  await startCancelled(page);
  await submitCancelled(page, "=1200");
  const score = Number((await page.locator(".lr-score-number").innerText()).match(/\d+/)?.[0]);
  expect(score).toBeLessThan(100);
  await page.getByRole("button", { name: "Следующее задание", exact: true }).click();
  await expectLessonDestination(page, refunds, "ru");
});

test("language changes preserve the edited formula and diagnosis across reload", async ({ page }) => {
  await startCancelled(page);
  await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill(cancelled.solution);
  await page.getByRole("radio", { name: diagnosis.label.ru, exact: true }).check();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("textbox", { name: "Your formula", exact: true })).toHaveValue(cancelled.solution);
  await expect(page.getByRole("radio", { name: diagnosis.label.en, exact: true })).toBeChecked();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Your formula", exact: true })).toHaveValue(cancelled.solution);
  await expect(page.getByRole("radio", { name: diagnosis.label.en, exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Ваша формула", exact: true })).toHaveValue(cancelled.solution);
});

for (const width of [320, 375]) {
  test(`learning remains usable at ${width}px, including invalid formula and completed review`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/");
    await expectNoOverflow(page);
    await page.getByTestId(`lesson-${cancelled.id}`).click();
    await expectNoOverflow(page);
    await page.getByRole("button", { name: "Открыть отчёт", exact: true }).click();
    await expectNoOverflow(page);
    await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill("=SUM(");
    await expect(page.locator(".lr-output-error")).toBeVisible();
    await submitCancelled(page);
    await expect(page.locator(".lr-score-number")).toContainText("100");
    await expectNoOverflow(page);
    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your lesson review", exact: true })).toBeVisible();
    await expectNoOverflow(page);
  });
}

test("a decision changes with the edited costs and the review preserves that evidence", async ({ page }) => {
  const lesson = LESSONS.find((item) => item.id === "decisions-return")!;
  await page.goto("/");
  await page.getByTestId(`lesson-${lesson.id}`).click();
  await page.getByRole("button", { name: "Открыть отчёт", exact: true }).click();
  await page.getByLabel("Расходы, $, строка 3", { exact: true }).fill("400");
  const cause = lesson.diagnosis.find((option) => option.id === lesson.correctDiagnosis)!;
  await page.getByRole("radio", { name: cause.label.ru, exact: true }).check();
  const choice = lesson.decisionOptions!.find((option) => option.id === "ads")!;
  await page.getByRole("radio", { name: choice.label.ru, exact: true }).check();
  await page.getByRole("button", { name: "Проверить решение", exact: true }).click();
  await expect(page.locator(".lr-inline-feedback")).toContainText("Решение выдержало проверку");
  await page.getByRole("button", { name: "Закрепить навык", exact: true }).click();
  const newCase = lesson.transfer.options.find((option) => option.id === lesson.transfer.correct)!;
  await page.getByRole("radio", { name: newCase.label.ru, exact: true }).check();
  await page.getByRole("button", { name: "Завершить задание", exact: true }).click();
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  await page.locator(".lr-checks summary").click();
  await expect(page.locator(".lr-checks li")).toContainText(choice.label.ru);
  await page.reload();
  await page.locator(".lr-checks summary").click();
  await expect(page.locator(".lr-checks li")).toContainText(choice.label.ru);
});

test("mobile navigation is keyboard accessible and unsaved drafts survive in-tab navigation", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    localStorage.setItem("fix-the-report.language", "ru");
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); };
  });
  await startCancelled(page);
  await expect(page.getByText(/Хранилище браузера недоступно/)).toBeVisible();
  await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill(cancelled.solution);
  await page.getByRole("button", { name: "Моё обучение", exact: true }).click();
  await page.getByTestId(`lesson-${cancelled.id}`).click();
  await expect(page.getByRole("textbox", { name: "Ваша формула", exact: true })).toHaveValue(cancelled.solution);
  const trigger = page.getByRole("button", { name: "Открыть меню", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const navigation = page.getByRole("dialog", { name: "Навигация", exact: true });
  await expect(navigation).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(await navigation.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(navigation).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expectNoOverflow(page);
});
