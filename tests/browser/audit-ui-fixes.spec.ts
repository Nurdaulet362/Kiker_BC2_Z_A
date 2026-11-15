import { expect, test, type Locator, type Page } from "@playwright/test";
import { LEARNING_KEY, LESSONS, type Lesson } from "../../src/learning/model";
import { demoAccess, trialIsLocked } from "./access-mode";

type Language = "en" | "ru";
const revenue = LESSONS.find(lesson => lesson.id === "revenue-cancelled")!;
const decision = LESSONS.find(lesson => lesson.id === "decisions-return")!;
const copy = {
  en: { start: "Start lesson", resume: "Continue lesson", repeat: "Practice again", pro: "View Pro plan", home: "My learning", open: "Open the report", check: "Check solution", apply: "Apply the skill", finish: "Finish lesson" },
  ru: { start: "Начать занятие", resume: "Продолжить", repeat: "Повторить", pro: "Посмотреть тариф Pro", home: "Обучение", open: "Открыть отчёт", check: "Проверить решение", apply: "Закрепить навык", finish: "Завершить задание" },
};

async function setInitialLanguage(page: Page, language: Language) {
  await page.addInitScript(language => localStorage.setItem("fix-the-report.language", language), language);
}

async function chooseDiagnosis(page: Page, lesson: Lesson, language: Language) {
  await page.getByRole("radio", { name: lesson.diagnosis.find(option => option.id === lesson.correctDiagnosis)!.label[language], exact: true }).check();
}

async function expectCardAction(page: Page, lesson: Lesson, language: Language, action: string) {
  const cardButton = page.getByTestId(`lesson-${lesson.id}`);
  await expect(cardButton).toHaveText(action);
  await expect(cardButton).toHaveAccessibleName(`${action}: ${lesson.title[language]}`);
}

for (const language of ["en", "ru"] as const) {
  test(`lesson cards name their visible start, continue, repeat and locked actions in ${language}`, async ({ page }) => {
    await setInitialLanguage(page, language);
    await page.goto("/");
    const c = copy[language];
    for (const lesson of LESSONS) {
      await expectCardAction(page, lesson, language, !demoAccess && lesson.level === "practice" ? c.pro : c.start);
    }
    await page.getByRole("button", { name: `${c.start}: ${revenue.title[language]}`, exact: true }).click();
    await page.getByRole("navigation", { name: language === "en" ? "Main navigation" : "Основная навигация", exact: true }).getByRole("button", { name: c.home, exact: true }).click();
    await expectCardAction(page, revenue, language, c.resume);
    await page.getByRole("button", { name: `${c.resume}: ${revenue.title[language]}`, exact: true }).click();
    await page.getByRole("button", { name: c.open, exact: true }).click();
    await page.locator("#lr-formula").fill(revenue.solution);
    await chooseDiagnosis(page, revenue, language);
    await page.getByRole("button", { name: c.check, exact: true }).click();
    await page.getByRole("button", { name: c.apply, exact: true }).click();
    await page.getByRole("radio", { name: revenue.transfer.options.find(option => option.id === revenue.transfer.correct)!.label[language], exact: true }).check();
    await page.getByRole("button", { name: c.finish, exact: true }).click();
    await expect(page.locator(".lr-score-number")).toHaveText("100");
    await page.getByRole("navigation", { name: language === "en" ? "Main navigation" : "Основная навигация", exact: true }).getByRole("button", { name: c.home, exact: true }).click();
    await expectCardAction(page, revenue, language, c.repeat);
  });
}

const validationCases = {
  diagnosis: { en: "Choose the cause of the error first.", ru: "Сначала выберите причину ошибки в отчёте." },
  formula: { en: "Write a formula before checking your solution.", ru: "Введите формулу перед проверкой решения." },
  decision: { en: "Choose your recommendation before checking.", ru: "Выберите рекомендацию перед проверкой." },
  transfer: { en: "Choose an answer to the new situation.", ru: "Выберите ответ для новой ситуации." },
  rows: { en: "Enter numbers from 0 to 1,000,000.", ru: "Введите числа от 0 до 1 000 000 во все числовые ячейки." },
};

async function formValues(page: Page) {
  const controls = await page.locator(".lr-workspace input, .lr-workspace textarea").evaluateAll(elements => elements.map(element => {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    return { value: input.value, checked: input instanceof HTMLInputElement ? input.checked : undefined };
  }));
  const drafts = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).drafts, LEARNING_KEY);
  return { controls, drafts };
}

for (const initial of ["en", "ru"] as const) {
  for (const kind of Object.keys(validationCases) as (keyof typeof validationCases)[]) {
    test(`${kind} validation follows ${initial} language changes without losing inputs`, async ({ page }) => {
      await setInitialLanguage(page, initial);
      const lesson = kind === "decision" ? decision : revenue;
      const c = copy[initial];
      await page.goto(`/#lesson/${lesson.id}`);
      await page.getByRole("button", { name: c.open, exact: true }).click();
      await page.locator(".lr-sheet input").first().fill(kind === "rows" ? "invalid" : "2300");
      if (kind !== "diagnosis" && kind !== "rows") await chooseDiagnosis(page, lesson, initial);
      if (kind === "formula") await page.locator("#lr-formula").fill("");
      if (kind === "transfer") {
        await page.locator("#lr-formula").fill(revenue.solution);
        await page.getByRole("button", { name: c.check, exact: true }).click();
        await page.getByRole("button", { name: c.apply, exact: true }).click();
      }
      await page.getByRole("button", { name: kind === "transfer" ? c.finish : c.check, exact: true }).click();
      // Row validation also appears by the table; exercise the stored submit error here.
      const alert = page.locator(kind === "transfer" ? ".lr-transfer-panel" : ".lr-answer-panel").getByRole("alert");
      await expect(alert).toHaveText(validationCases[kind][initial]);
      // Wait for the actual edited draft, not merely an earlier debounced save.
      const expectedRows = lesson.rows.map(row => [...row]);
      expectedRows[0][lesson.editableColumns[0]] = kind === "rows" ? "invalid" : 2300;
      await expect.poll(() => page.evaluate(({ key, id }) => {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved).drafts[id] : null;
      }, { key: LEARNING_KEY, id: lesson.id })).toMatchObject({
        rows: expectedRows,
        formula: kind === "formula" ? "" : kind === "transfer" ? revenue.solution : lesson.initialFormula,
        diagnosis: kind === "diagnosis" || kind === "rows" ? "" : lesson.correctDiagnosis,
        decision: "", transfer: "", step: kind === "transfer" ? 2 : 1,
      });
      const before = await formValues(page);
      const other = initial === "en" ? "ru" : "en";
      await page.getByRole("button", { name: other === "ru" ? "Русский" : "English", exact: true }).click();
      await expect(alert).toHaveText(validationCases[kind][other]);
      expect(await formValues(page)).toEqual(before);
      await page.getByRole("button", { name: initial === "ru" ? "Русский" : "English", exact: true }).click();
      await expect(alert).toHaveText(validationCases[kind][initial]);
      expect(await formValues(page)).toEqual(before);
    });
  }
}

async function reachWithTab(page: Page, region: Locator) {
  for (let step = 0; step < 60; step++) {
    await page.keyboard.press("Tab");
    if (await region.evaluate(element => element === document.activeElement)) return;
  }
  await expect(region).toBeFocused();
}

for (const language of ["en", "ru"] as const) {
  test(`all Work Trial tables allow keyboard scrolling at 375px in ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setInitialLanguage(page, language);
    await page.goto("/#trial");
    if (await trialIsLocked(page, language)) return;
    await page.getByRole("button", { name: language === "en" ? "Start the work trial" : "Начать задание", exact: true }).click();
    const stages = [
      { en: "Orders table, scroll horizontally if needed", ru: "Таблица заказов, при необходимости прокрутите вправо", next: { en: "Continue to conversion", ru: "Перейти к конверсии" } },
      { en: "Acquisition table, scroll horizontally if needed", ru: "Таблица привлечения, при необходимости прокрутите вправо", next: { en: "Continue to your decision", ru: "Перейти к решению" } },
      { en: "Channel economics table, scroll horizontally if needed", ru: "Таблица экономики каналов, при необходимости прокрутите вправо", next: null },
    ];
    for (const stage of stages) {
      const region = page.getByRole("region", { name: stage[language], exact: true });
      await expect(region).toBeVisible();
      expect(await region.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
      await reachWithTab(page, region);
      await expect(region).toBeFocused();
      for (let key = 0; key < 20; key++) await page.keyboard.press("ArrowRight");
      await expect.poll(() => region.evaluate(element => {
        const lastColumn = element.querySelector("thead th:last-child")!.getBoundingClientRect();
        const viewport = element.getBoundingClientRect();
        return element.scrollLeft > 0 && lastColumn.right <= viewport.right + 1 && lastColumn.left >= viewport.left;
      })).toBe(true);
      await expect(region.locator("thead th").last()).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (stage.next) await page.getByRole("button", { name: stage.next[language], exact: true }).click();
    }
  });
}
