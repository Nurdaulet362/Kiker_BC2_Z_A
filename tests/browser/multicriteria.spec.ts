import { expect, test, type Page } from "@playwright/test";
import { LESSONS, type LessonResult } from "../../src/learning/model";

const lesson = LESSONS.find(item => item.id === "revenue-cancelled")!;
const diagnosis = lesson.diagnosis.find(option => option.id === lesson.correctDiagnosis)!;
const transfer = lesson.transfer.options.find(option => option.id === lesson.transfer.correct)!;
const sumifs = '=SUMIFS(C2:C101,B2:B101,"Paid")';

type WorkerObservation = {
  starts: number;
  terminations: number;
  errors: string[];
  issues: { code: string; params?: Record<string, string | number> }[];
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const observation: WorkerObservation = { starts: 0, terminations: 0, errors: [], issues: [] };
    Object.defineProperty(window, "multiCriteriaWorker", { value: observation });
    // Keep the real worker and its protocol; observe only construction and replies.
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        observation.starts += 1;
        this.addEventListener("error", event => observation.errors.push(event.message));
        this.addEventListener("message", event => {
          const result = event.data?.result;
          if (typeof result?.code === "string") {
            observation.issues.push({ code: result.code, params: result.params });
          }
        });
      }
      terminate() {
        observation.terminations += 1;
        super.terminate();
      }
    };
  });
});

async function workerObservation(page: Page): Promise<WorkerObservation> {
  return page.evaluate(() => (window as unknown as { multiCriteriaWorker: WorkerObservation }).multiCriteriaWorker);
}

async function startLesson(page: Page) {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("/#lesson/revenue-cancelled");
  await page.getByRole("button", { name: "Open the report", exact: true }).click();
  await expect(page.locator(".lr-output strong")).toHaveText("$2,030.00");
  return pageErrors;
}

async function expectHealthyWorker(page: Page, pageErrors: string[]) {
  const observed = await workerObservation(page);
  expect(observed.starts).toBe(1);
  expect(observed.terminations).toBe(0);
  expect(observed.errors).toEqual([]);
  expect(pageErrors).toEqual([]);
}

test("SUMIFS passes all seven checks and completes the real first lesson at 100 points", async ({ page }) => {
  const pageErrors = await startLesson(page);
  await page.getByLabel("Amount, $, row 4", { exact: true }).fill("2300");
  await expect(page.locator(".lr-output strong")).toHaveText("$3,680.00");
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill(sumifs);
  await expect(page.locator(".lr-output strong")).toHaveText("$1,200.00");
  await page.getByRole("radio", { name: diagnosis.label.en, exact: true }).check();
  await page.getByRole("button", { name: "Check solution", exact: true }).click();
  await expect(page.getByText("Your solution holds up", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Apply the skill", exact: true }).click();
  await page.getByRole("radio", { name: transfer.label.en, exact: true }).check();
  await page.getByRole("button", { name: "Finish lesson", exact: true }).click();
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  await expect(page.locator(".lr-completion-label")).toHaveText("Lesson completed");
  await expect(page.locator(".lr-checks summary")).toContainText("7/7");
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("fix-the-report.learning.v2");
    return raw ? JSON.parse(raw).results.length : 0;
  })).toBe(1);
  const saved: LessonResult = await page.evaluate(() => JSON.parse(localStorage.getItem("fix-the-report.learning.v2")!).results[0]);
  expect(saved.snapshot?.formula).toBe(sumifs);
  expect(saved.checks).toHaveLength(7);
  expect(saved.checks.every(check => check.passed)).toBe(true);
  expect(saved.breakdown).toEqual({ diagnosis: 20, repair: 50, transfer: 30 });
  await expectHealthyWorker(page, pageErrors);
});

test("COUNTIFS applies both criteria and keeps the existing case-sensitive matching in the real worker", async ({ page }) => {
  const pageErrors = await startLesson(page);
  const formula = page.getByRole("textbox", { name: "Your formula", exact: true });
  await formula.fill('=COUNTIFS(B2:B101,"Paid",C2:C101,">300")');
  // The first lesson formats every numerical preview as USD, including counts.
  await expect(page.locator(".lr-output strong")).toHaveText("$3.00");
  await formula.fill('=COUNTIFS(B2:B101,"paid",C2:C101,">300")');
  await expect(page.locator(".lr-output strong")).toHaveText("$0.00");
  await formula.fill(sumifs);
  await expect(page.locator(".lr-output strong")).toHaveText("$1,200.00");
  await formula.fill('=SUMIFS(C2:C101,B2:B101,"paid")');
  await expect(page.locator(".lr-output strong")).toHaveText("$0.00");
  await formula.fill(sumifs);
  await expect(page.locator(".lr-output strong")).toHaveText("$1,200.00");
  await expectHealthyWorker(page, pageErrors);
});

test("SUMIFS and COUNTIFS shape and argument errors are structured, bilingual and recover without restarting the worker", async ({ page }) => {
  const pageErrors = await startLesson(page);
  const cases = [
    { fn: "SUMIFS", code: "shape", formula: '=SUMIFS(C2:C6,B2:B5,"Paid")' },
    { fn: "COUNTIFS", code: "shape", formula: '=COUNTIFS(B2:B6,"Paid",C2:C5,">300")' },
    { fn: "SUMIFS", code: "arguments", formula: "=SUMIFS(C2:C6,B2:B6)" },
    { fn: "COUNTIFS", code: "arguments", formula: "=COUNTIFS(B2:B6)" },
  ] as const;

  for (const scenario of cases) {
    await page.getByRole("textbox", { name: "Your formula", exact: true }).fill(scenario.formula);
    const error = page.locator(".lr-output-error");
    await expect(error).toContainText(scenario.code === "shape"
      ? `${scenario.fn} ranges must have the same number of rows and columns.`
      : `${scenario.fn} needs ${scenario.fn === "SUMIFS" ? "a sum range followed by " : ""}one or more range/criterion pairs.`);
    expect((await workerObservation(page)).issues).toContainEqual({ code: scenario.code, params: { fn: scenario.fn } });
    await page.getByRole("button", { name: "Русский", exact: true }).click();
    await expect(error).toContainText(scenario.code === "shape"
      ? `Диапазоны ${scenario.fn} должны иметь одинаковое число строк и столбцов.`
      : `${scenario.fn}: ${scenario.fn === "SUMIFS" ? "сначала укажите диапазон сумм, затем " : "укажите "}одну или несколько пар «диапазон, условие».`);
    await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill(sumifs);
    await expect(page.locator(".lr-output strong")).toHaveText(/1\s?200/);
    await expect(error).toHaveCount(0);
    await expectHealthyWorker(page, pageErrors);
    await page.getByRole("button", { name: "English", exact: true }).click();
  }
});
