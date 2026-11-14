import { expect, type Page } from "@playwright/test";
import type { Lesson } from "../../src/learning/model";

// The expected mode must match the production build under test. Do not infer it
// from the page: a missing gate/banner must fail rather than select another path.
export const demoAccess = process.env.VITE_DEMO_ACCESS === "true";

export async function expectPricing(page: Page, language: "en" | "ru" = "en") {
  await expect(page).toHaveURL(/#pricing$/);
  await expect(page.getByTestId("pricing-screen")).toBeVisible();
  await expect(page.getByRole("heading", {
    name: language === "en" ? "Choose your practice plan" : "Выберите план обучения", exact: true,
  })).toBeVisible();
  await expect(page.locator(".sim-app, .lr-workspace, .lr-review")).toHaveCount(0);
}

export async function trialIsLocked(page: Page, language: "en" | "ru" = "en") {
  if (demoAccess) {
    await expect(page.getByTestId("demo-access-banner")).toBeVisible();
    return false;
  }
  await expectPricing(page, language);
  await expect(page.getByTestId("demo-access-banner")).toHaveCount(0);
  return true;
}

export async function expectLessonDestination(page: Page, lesson: Lesson, language: "en" | "ru") {
  if (!demoAccess && lesson.level === "practice") {
    await expectPricing(page, language);
  } else {
    await expect(page).toHaveURL(new RegExp(`#lesson/${lesson.id}$`));
    await expect(page.locator(".lr-workspace h1")).toHaveText(lesson.title[language]);
  }
}
