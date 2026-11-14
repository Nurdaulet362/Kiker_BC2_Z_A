import { expect, test, type Locator, type Page } from "@playwright/test";
import { LESSONS, type LessonResult } from "../../src/learning/model";
import { expectLessonDestination } from "./access-mode";

const lesson = LESSONS.find(item => item.id === "revenue-cancelled")!;
const nextLesson = LESSONS.find(item => item.id === "conversion-weighted")!;
const relatedLesson = LESSONS.find(item => item.id === "revenue-refunds")!;
const diagnosis = lesson.diagnosis.find(option => option.id === lesson.correctDiagnosis)!;
const correctTransfer = lesson.transfer.options.find(option => option.id === lesson.transfer.correct)!;
const wrongTransfer = lesson.transfer.options.find(option => option.id !== lesson.transfer.correct)!;

async function startLesson(page: Page) {
  await page.goto("/");
  await page.getByTestId(`lesson-${lesson.id}`).click();
  await page.getByRole("button", { name: "Open the report", exact: true }).click();
}

async function finishLesson(page: Page, formula = lesson.solution, transferCorrect = true) {
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill(formula);
  await page.getByRole("radio", { name: diagnosis.label.en, exact: true }).check();
  await page.getByRole("button", { name: "Check solution", exact: true }).click();
  await page.getByRole("button", { name: "Apply the skill", exact: true }).click();
  await page.getByRole("radio", { name: (transferCorrect ? correctTransfer : wrongTransfer).label.en, exact: true }).check();
  await page.getByRole("button", { name: "Finish lesson", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your lesson review", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#review\//);
}

async function savedResult(page: Page): Promise<LessonResult> {
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("fix-the-report.learning.v2");
    return raw ? JSON.parse(raw).results.length : 0;
  })).toBe(1);
  return page.evaluate(() => JSON.parse(localStorage.getItem("fix-the-report.learning.v2")!).results[0]);
}

async function expectReason(page: Page, expected: RegExp) {
  await expect(page.locator(".lr-review-reason")).toHaveCount(1);
  await expect(page.locator(".lr-review-reason")).toContainText(expected);
}

async function expectVisibleFocus(locator: Locator) {
  await expect(locator).toBeFocused();
  expect(await locator.evaluate(element => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
  })).toBe(true);
}

test("completed review explains the result and preserves the same submission across RU, reload and EN", async ({ page }) => {
  await startLesson(page);
  await page.getByLabel("Amount, $, row 4", { exact: true }).fill("2300");
  await finishLesson(page);
  const reviewUrl = page.url();
  await expect(page.locator(".lr-completion-label")).toHaveText("Lesson completed");
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  await expect(page.locator(".lr-review-reason")).toHaveCount(1);
  await expect(page.locator(".lr-review-reason")).not.toBeEmpty();
  await expect(page.locator(".lr-review-item-top > span")).toHaveText(["20 / 20", "50 / 50", "30 / 30"]);
  await expect(page.locator(".lr-review-item")).toHaveCount(3);
  for (const item of await page.locator(".lr-review-item").all()) {
    await expect(item.locator("h2")).not.toBeEmpty();
    await expect(item.locator("p")).not.toBeEmpty();
  }
  await expect(page.getByRole("heading", { name: "Why the report was wrong", exact: true })).toBeVisible();
  await expect(page.locator(".lr-review-explanation > p")).toHaveText(lesson.explanation.en);
  const next = page.getByRole("region", { name: "Next step", exact: true });
  await expect(next.getByRole("button")).toHaveCount(2);
  await expect(next.getByRole("button", { name: "Next lesson", exact: true })).toHaveClass(/lr-btn-primary/);
  await expect(next.getByRole("button", { name: "Try again", exact: true })).toHaveClass(/lr-btn-secondary/);
  await expect(page.locator(".lr-review .lr-btn-primary")).toHaveCount(1);
  await expect(next).toContainText(nextLesson.title.en);
  await expect(page.locator(".lr-review")).not.toContainText(/\bPro\b|\bpricing\b|\bpaywall\b/i);
  const submitted = await savedResult(page);
  expect(submitted.snapshot?.rows[2][2]).toBe(2300);

  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expect(page.locator(".lr-completion-label")).toHaveText("Занятие пройдено");
  await expect(page.getByRole("heading", { name: "Почему в отчёте была ошибка", exact: true })).toBeVisible();
  await expect(page.locator(".lr-review-explanation > p")).toHaveText(lesson.explanation.ru);
  await expect(page.getByRole("region", { name: "Следующий шаг", exact: true }).getByRole("button")).toHaveCount(2);
  const russianReview = await page.locator(".lr-review").innerText();
  await page.reload();
  await expect(page).toHaveURL(reviewUrl);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator(".lr-review")).toHaveText(russianReview, { useInnerText: true });
  expect(await savedResult(page)).toEqual(submitted);

  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".lr-completion-label")).toHaveText("Lesson completed");
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  await next.getByRole("button", { name: "Next lesson", exact: true }).click();
  await expect(page.locator(".lr-workspace h1")).toHaveText(nextLesson.title.en);
});

test("a hardcoded answer opens failed checks, stays practice-only and recommends the related case", async ({ page }) => {
  await startLesson(page);
  await finishLesson(page, "=1200");
  await expect(page.locator(".lr-completion-label")).toHaveText("Practice only");
  await expect(page.locator(".lr-score-number")).toHaveText("57");
  await expectReason(page, /check/i);
  await expect(page.locator(".lr-review-item-top > span")).toHaveText(["20 / 20", "7 / 50", "30 / 30"]);
  await expect(page.locator(".lr-checks")).toHaveAttribute("open", "");
  const submitted = await savedResult(page);
  const failed = submitted.checks.filter(check => !check.passed);
  expect(failed).toHaveLength(6);
  for (const check of failed) {
    const row = page.locator(".lr-checks li").filter({ has: page.getByText(check.label.en, { exact: true }) });
    await expect(row).toBeVisible();
    await expect(row).toContainText(check.expected);
    await expect(row).toContainText(check.actual);
  }
  const reviewUrl = page.url();
  await page.reload();
  await expect(page.locator(".lr-completion-label")).toHaveText("Practice only");
  await expect(page.locator(".lr-checks")).toHaveAttribute("open", "");
  expect(await savedResult(page)).toEqual(submitted);
  await page.getByRole("main").getByRole("button", { name: "My learning", exact: true }).click();
  await expect(page.locator(".learn-progress-ring strong")).toHaveText("0/6");
  await page.goto(reviewUrl);
  await page.getByRole("region", { name: "Next step", exact: true }).getByRole("button", { name: "Next lesson", exact: true }).click();
  await expectLessonDestination(page, relatedLesson, "en");
});

test("a revealed solution explains the practice-only status and preserves the 75-point cap", async ({ page }) => {
  await startLesson(page);
  await page.getByRole("button", { name: "A hint, if you need one", exact: true }).click();
  await page.getByRole("button", { name: "Next hint", exact: true }).click();
  await page.getByRole("button", { name: "Show solution", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Show solution", exact: true }).click();
  await finishLesson(page);
  await expect(page.locator(".lr-completion-label")).toHaveText("Practice only");
  await expectReason(page, /viewed|revealed/i);
  await expect(page.locator(".lr-score-number")).toHaveText("75");
  await expect(page.locator(".lr-review-item-top > span")).toHaveText(["20 / 20", "25 / 50", "30 / 30"]);
  await expect(page.getByRole("status")).toContainText("25 out of 50");
  const submitted = await savedResult(page);
  expect(submitted.solutionRevealed).toBe(true);
  expect(submitted.checks.every(check => check.passed)).toBe(true);
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await page.reload();
  await expect(page.locator(".lr-completion-label")).toHaveText("Тренировочная попытка");
  await expect(page.locator(".lr-score-number")).toHaveText("75");
  expect(await savedResult(page)).toEqual(submitted);
  await page.getByRole("region", { name: "Следующий шаг", exact: true }).getByRole("button", { name: "Попробовать ещё раз", exact: true }).click();
  await expect(page.locator(".lr-workspace h1")).toHaveText(lesson.title.ru);
  await page.getByRole("button", { name: "Открыть отчёт", exact: true }).click();
  await expect(page.getByRole("button", { name: "Подсказка, если понадобится", exact: true })).toBeVisible();
});

test("a wrong transfer answer explains the failed application even when every formula check passed", async ({ page }) => {
  await startLesson(page);
  await finishLesson(page, lesson.solution, false);
  await expect(page.locator(".lr-completion-label")).toHaveText("Practice only");
  await expect(page.locator(".lr-score-number")).toHaveText("70");
  await expectReason(page, /new situation|transfer/i);
  await expect(page.locator(".lr-review-item-top > span")).toHaveText(["20 / 20", "50 / 50", "0 / 30"]);
  const submitted = await savedResult(page);
  expect(submitted.repairPassed).toBe(true);
  expect(submitted.transferPassed).toBe(false);
  await page.getByRole("main").getByRole("button", { name: "My learning", exact: true }).click();
  await expect(page.locator(".learn-progress-ring strong")).toHaveText("0/6");
});

test("an older below-threshold result explains its saved score without recomputing it", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("review-threshold-fixture")) return;
    localStorage.setItem("fix-the-report.learning.v2", JSON.stringify({
      version: 2, goal: "all", drafts: {}, results: [{
        id: "legacy-threshold", lessonId: "revenue-cancelled", score: 75,
        diagnosisPassed: false, repairPassed: true, transferPassed: true,
        breakdown: { diagnosis: 0, repair: 45, transfer: 30 },
        hintLevel: 0, solutionRevealed: false, checks: [], at: "2026-11-14T10:00:00.000Z",
      }],
    }));
    localStorage.setItem("review-threshold-fixture", "set");
  });
  await page.goto("/#review/legacy-threshold");
  await expect(page.locator(".lr-completion-label")).toHaveText("Practice only");
  await expectReason(page, /80/);
  await expect(page.locator(".lr-score-number")).toHaveText("75");
  await expect(page.locator(".lr-review-item-top > span")).toHaveText(["0 / 20", "45 / 50", "30 / 30"]);
  await page.reload();
  await expect(page.locator(".lr-score-number")).toHaveText("75");
  await expectReason(page, /80/);
});

test("the 375px review has no overflow and both next-step actions are keyboard accessible with visible focus", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await startLesson(page);
  await finishLesson(page, "=1200");
  await expect(page.locator(".lr-completion-label")).toHaveText("Practice only");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("heading", { name: "Your lesson review", exact: true })).toBeFocused();
  const next = page.getByRole("region", { name: "Next step", exact: true });
  const nextButton = next.getByRole("button", { name: "Next lesson", exact: true });
  const retryButton = next.getByRole("button", { name: "Try again", exact: true });
  // Start at the focus placed by the review; reach the real controls using Tab.
  for (let steps = 0; steps < 10 && !(await nextButton.evaluate(element => element === document.activeElement)); steps += 1) {
    await page.keyboard.press("Tab");
  }
  await expectVisibleFocus(nextButton);
  await page.keyboard.press("Tab");
  await expectVisibleFocus(retryButton);
  await page.keyboard.press("Enter");
  await expect(page.locator(".lr-workspace h1")).toHaveText(lesson.title.en);
  await page.goBack();
  await expect(page.locator(".lr-completion-label")).toHaveText("Practice only");
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("region", { name: "Следующий шаг", exact: true }).getByRole("button")).toHaveCount(2);
});

async function expectQuickNextInFirstScreen(page: Page, label: string) {
  const quickNext = page.locator(".lr-review-hero .lr-review-quick-next");
  await expect(quickNext).toHaveCount(1);
  await expect(quickNext).toHaveAccessibleName(label);
  await expect(quickNext).toBeVisible();
  // Visibility alone can pass for controls below the fold. Measure before any
  // click, focus or scrollIntoView so the check covers the initial review screen.
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  const box = await quickNext.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(await page.evaluate(() => scrollY)).toBe(0);
}

const failureIntro = {
  en: "You found a useful place to focus. Let’s turn these mistakes into practice.",
  ru: "Теперь понятно, что стоит потренировать. Разберём ошибки и закрепим навык.",
};
const revealedIntro = {
  en: "Use the solution as a model, then try again on your own.",
  ru: "Используйте решение как образец, затем попробуйте ещё раз самостоятельно.",
};

for (const scenario of [
  { name: "success", formula: lesson.solution, reveal: false, score: 100, target: nextLesson },
  { name: "failure", formula: "=1200", reveal: false, score: 57, target: relatedLesson },
  { name: "revealed", formula: lesson.solution, reveal: true, score: 75, target: relatedLesson },
]) {
  test(`375px ${scenario.name} review offers the same next lesson in the first screen in EN and RU`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await startLesson(page);
    if (scenario.name === "success") {
      await page.getByLabel("Amount, $, row 4", { exact: true }).fill("2300");
    }
    if (scenario.reveal) {
      await page.getByRole("button", { name: "A hint, if you need one", exact: true }).click();
      await page.getByRole("button", { name: "Next hint", exact: true }).click();
      await page.getByRole("button", { name: "Show solution", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Show solution", exact: true }).click();
    }
    await finishLesson(page, scenario.formula);
    const reviewUrl = page.url();
    const submitted = await savedResult(page);
    expect(submitted.score).toBe(scenario.score);
    expect(submitted.solutionRevealed).toBe(scenario.reveal);

    for (const language of ["en", "ru"] as const) {
      if (language === "ru") {
        await page.getByRole("button", { name: "Русский", exact: true }).click();
        await page.reload();
        await expect(page.locator("html")).toHaveAttribute("lang", "ru");
      }
      const buttonLabel = language === "en" ? "Next lesson" : "Следующее задание";
      const sectionLabel = language === "en" ? "Next step" : "Следующий шаг";
      const status = scenario.name === "success"
        ? (language === "en" ? "Lesson completed" : "Занятие пройдено")
        : (language === "en" ? "Practice only" : "Тренировочная попытка");
      await expect(page.locator(".lr-completion-label")).toHaveText(status);
      await expect(page.locator(".lr-score-number")).toHaveText(String(scenario.score));
      const hero = page.locator(".lr-review-hero");
      if (scenario.reveal) {
        await expect(hero.getByText(revealedIntro[language], { exact: true })).toBeVisible();
        await expect(hero.getByText(failureIntro[language], { exact: true })).toHaveCount(0);
      } else if (scenario.name === "failure") {
        await expect(hero.getByText(failureIntro[language], { exact: true })).toBeVisible();
        await expect(hero.getByText(revealedIntro[language], { exact: true })).toHaveCount(0);
      }
      await expectQuickNextInFirstScreen(page, buttonLabel);
      const nextStep = page.getByRole("region", { name: sectionLabel, exact: true });
      await expect(nextStep.getByRole("button")).toHaveCount(2);
      await expect(page.getByRole("button", { name: buttonLabel, exact: true })).toHaveCount(2);

      if (scenario.name === "success") {
        await page.setViewportSize({ width: 600, height: 812 });
        await expectQuickNextInFirstScreen(page, buttonLabel);
        await page.setViewportSize({ width: 601, height: 812 });
        await expect(page.locator(".lr-review-quick-next")).toBeHidden();
        await expect(page.getByRole("button", { name: buttonLabel, exact: true })).toHaveCount(1);
        await expect(nextStep.getByRole("button")).toHaveCount(2);
        await page.setViewportSize({ width: 375, height: 812 });
        await expectQuickNextInFirstScreen(page, buttonLabel);
      }
      expect(await savedResult(page)).toEqual(submitted);

      // Exercise both entry points: the shortcut must keep the recommendation
      // used by the existing Next step action, including practice-only attempts.
      await page.locator(".lr-review-quick-next").click();
      await expectLessonDestination(page, scenario.target, language);
      const recommendedUrl = page.url();
      await page.goto(reviewUrl);
      await nextStep.getByRole("button", { name: buttonLabel, exact: true }).click();
      await expect(page).toHaveURL(recommendedUrl);
      await expectLessonDestination(page, scenario.target, language);
      await page.goto(reviewUrl);
      await expect(page.locator(".lr-score-number")).toHaveText(String(scenario.score));
      expect(await savedResult(page)).toEqual(submitted);
    }
  });
}
