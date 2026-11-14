import { expect, test } from "@playwright/test";
import { initialProgress, STORAGE_KEY } from "../../src/model";
import { TRIAL_KEY } from "../../src/simulation/model";
import { getLesson, initialDraft, initialLearning, LEARNING_KEY, saveLessonDraft } from "../../src/learning/model";

const lesson = getLesson("revenue-cancelled");
const lessonRoute = /#lesson\/revenue-cancelled$/;

// These records belong to the retired route. Opening its URL must not read,
// normalize, migrate or rotate any of its saved bytes, including backup slots.
const legacyRecords = {
  [STORAGE_KEY]: JSON.stringify({ ...initialProgress(), attempts: 9 }, null, 2),
  [`${STORAGE_KEY}.backup`]: " { damaged old draft ",
  [`${STORAGE_KEY}.backup.prev`]: "older distinct backup\n",
  [TRIAL_KEY]: ' {"version":99,"preserve":"future trial data"} ',
  [`${TRIAL_KEY}.backup`]: "trial backup",
  [`${TRIAL_KEY}.backup.prev`]: "previous trial backup",
};

test("the old practice URL redirects to a complete lesson without changing legacy saved bytes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(records => {
    if (localStorage.getItem("legacy-route-fixture")) return;
    for (const [key, value] of Object.entries(records)) localStorage.setItem(key, value);
    localStorage.setItem("legacy-route-fixture", "set");
  }, legacyRecords);
  await page.goto("/#practice");
  await expect(page).toHaveURL(lessonRoute);
  await expect(page.locator(".lr-workspace h1")).toHaveText(lesson.title.en);
  await expect(page.locator(".report-total")).toHaveCount(0);
  await page.getByRole("button", { name: "Open the report", exact: true }).click();
  await page.getByLabel("Amount, $, row 4", { exact: true }).fill("2300");
  await expect(page.locator(".lr-output strong")).toHaveText("$3,680.00");
  await page.reload();
  await expect(page).toHaveURL(lessonRoute);
  await expect(page.getByLabel("Amount, $, row 4", { exact: true })).toHaveValue("2300");
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill("=SUM(");
  await expect(page.locator(".lr-output")).toContainText("Could not calculate");
  await page.getByRole("radio", { name: "Order status is ignored", exact: true }).check();
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill("=1200");
  await page.getByRole("button", { name: "Check solution", exact: true }).click();
  await expect(page.locator(".lr-inline-feedback")).toContainText("There is still something to explore");
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill(lesson.solution);
  await page.getByRole("button", { name: "Check solution", exact: true }).click();
  await expect(page.locator(".lr-inline-feedback")).toContainText("Your solution holds up");
  await page.getByRole("button", { name: "Apply the skill", exact: true }).click();
  await page.getByRole("radio", { name: "$900", exact: true }).check();
  await page.getByRole("button", { name: "Finish lesson", exact: true }).click();
  await expect(page.locator(".lr-completion-label")).toHaveText("Lesson completed");
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  await page.reload();
  await expect(page.locator(".lr-score-number")).toHaveText("100");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".lr-workspace h1")).toHaveText(lesson.title.en);
  const actual = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(legacyRecords));
  expect(actual).toEqual(legacyRecords);
  expect(errors).toEqual([]);
});

test("the mobile practice redirect keeps lesson validation, zero amounts, hints and reset usable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#practice");
  await expect(page).toHaveURL(lessonRoute);
  await page.getByRole("button", { name: "Open the report", exact: true }).click();
  const amount = page.getByLabel("Amount, $, row 2", { exact: true });
  await amount.fill("wrong");
  await expect(page.getByRole("alert")).toContainText("Enter numbers");
  await page.getByRole("button", { name: "Check solution", exact: true }).click();
  await expect(page.locator(".lr-answer-panel").getByRole("alert")).toContainText("Enter numbers");
  await expect(page.getByRole("button", { name: "Apply the skill", exact: true })).toHaveCount(0);
  await expect(page.locator(".lr-review")).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{"results":[]}').results, LEARNING_KEY)).toEqual([]);
  await amount.fill("0");
  await page.getByLabel("Amount, $, row 3", { exact: true }).fill("0");
  await page.getByLabel("Amount, $, row 5", { exact: true }).fill("0");
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill(lesson.solution);
  await expect(page.locator(".lr-output strong")).toHaveText("$0.00");
  await page.getByRole("button", { name: "A hint, if you need one", exact: true }).click();
  await expect(page.getByRole("region", { name: "Lesson hints", exact: true })).toContainText("First keep only paid orders");
  await page.getByRole("button", { name: "Next hint", exact: true }).click();
  await page.getByRole("button", { name: "Show solution", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Keep trying myself", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset data", exact: true }).click();
  await expect(amount).toHaveValue("480");
  await expect(page.getByLabel("Amount, $, row 4", { exact: true })).toHaveValue("650");
  await expect(page.locator(".lr-output strong")).toHaveText("$1,200.00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("a direct practice redirect resumes an existing first-lesson draft instead of replacing it", async ({ page }) => {
  const draft = initialDraft(lesson.id, 7);
  draft.step = 1;
  draft.rows[2][2] = 2310;
  draft.formula = lesson.solution;
  draft.diagnosis = lesson.correctDiagnosis;
  draft.hintLevel = 1;
  const state = saveLessonDraft(initialLearning(), lesson.id, draft);
  await page.addInitScript(({ key, state }) => {
    if (localStorage.getItem("existing-lesson-fixture")) return;
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem("existing-lesson-fixture", "set");
  }, { key: LEARNING_KEY, state });
  await page.goto("/#practice");
  await expect(page).toHaveURL(lessonRoute);
  await expect(page.getByRole("textbox", { name: "Your formula", exact: true })).toHaveValue(lesson.solution);
  await expect(page.getByLabel("Amount, $, row 4", { exact: true })).toHaveValue("2310");
  await expect(page.getByRole("radio", { name: "Order status is ignored", exact: true })).toBeChecked();
  await expect(page.getByRole("region", { name: "Lesson hints", exact: true })).toContainText("Level 1");
  await page.reload();
  await expect(page.getByLabel("Amount, $, row 4", { exact: true })).toHaveValue("2310");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).drafts["revenue-cancelled"].attempt, LEARNING_KEY)).toBe(7);
});
