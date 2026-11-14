import { expect, test } from "@playwright/test";
import { LESSONS } from "../../src/learning/model";

const lesson = LESSONS.find(item => item.id === "revenue-cancelled")!;

test("a cancelled hung preview does not make the next preview or queued grading fail", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const counts = { starts: 0, messages: 0 };
    Object.defineProperty(window, "workerRecoveryCounts", { value: counts });
    window.Worker = class extends NativeWorker {
      private stalled: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.stalled = ++counts.starts === 1;
      }
      postMessage(message: unknown) {
        counts.messages += 1;
        // Simulate a worker stuck on its first calculation; the replacement is real.
        if (!this.stalled) super.postMessage(message);
      }
    };
  });
  await page.goto(`/#lesson/${lesson.id}`);
  await page.getByRole("button", { name: "Открыть отчёт", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { workerRecoveryCounts: { messages: number } }).workerRecoveryCounts.messages)).toBe(1);
  await page.getByRole("textbox", { name: "Ваша формула", exact: true }).fill(lesson.solution);
  await expect.poll(() => page.evaluate(() => (window as unknown as { workerRecoveryCounts: { messages: number } }).workerRecoveryCounts.messages)).toBe(2);
  await page.getByRole("radio", { name: lesson.diagnosis.find(option => option.id === lesson.correctDiagnosis)!.label.ru, exact: true }).check();
  await page.getByRole("button", { name: "Проверить решение", exact: true }).click();
  await expect(page.getByRole("button", { name: "Закрепить навык", exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".lr-output strong")).toHaveText(/1\s?200/);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Закрепить навык", exact: true }).click();
  await page.getByRole("radio", { name: lesson.transfer.options.find(option => option.id === lesson.transfer.correct)!.label.ru, exact: true }).check();
  await page.getByRole("button", { name: "Завершить задание", exact: true }).click();
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  expect(await page.evaluate(() => (window as unknown as { workerRecoveryCounts: { starts: number } }).workerRecoveryCounts.starts)).toBe(2);
});
