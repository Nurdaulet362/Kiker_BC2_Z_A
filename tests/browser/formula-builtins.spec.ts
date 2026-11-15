import { expect, test } from "@playwright/test";
import { LESSONS, type LessonResult } from "../../src/learning/model";

test("MIN, COUNTA and a MAX solution work in the real worker and complete the first lesson at 100", async ({ page }) => {
  const lesson = LESSONS.find(item => item.id === "revenue-cancelled")!;
  const diagnosis = lesson.diagnosis.find(option => option.id === lesson.correctDiagnosis)!;
  const transfer = lesson.transfer.options.find(option => option.id === lesson.transfer.correct)!;
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("/#lesson/revenue-cancelled");
  await page.getByRole("button", { name: "Open the report", exact: true }).click();
  await page.getByLabel("Amount, $, row 4", { exact: true }).fill("2300");
  await expect(page.locator(".lr-output strong")).toHaveText("$3,680.00");

  const formula = page.getByRole("textbox", { name: "Your formula", exact: true });
  await formula.fill("=MIN(3,1)");
  await expect(page.locator(".lr-output strong")).toHaveText("$1.00");
  await formula.fill('=COUNTA("x",0)');
  await expect(page.locator(".lr-output strong")).toHaveText("$2.00");
  const solution = '=MAX(0,SUMIF(B2:B101,"Paid",C2:C101))';
  await formula.fill(solution);
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
    const saved = localStorage.getItem("fix-the-report.learning.v2");
    return saved ? JSON.parse(saved).results.length : 0;
  })).toBe(1);
  const saved: LessonResult = await page.evaluate(() => JSON.parse(localStorage.getItem("fix-the-report.learning.v2")!).results[0]);
  expect(saved.snapshot?.formula).toBe(solution);
  expect(saved.checks).toHaveLength(7);
  expect(saved.checks.every(check => check.passed)).toBe(true);
  expect(saved.breakdown).toEqual({ diagnosis: 20, repair: 50, transfer: 30 });
  expect(pageErrors).toEqual([]);
});
