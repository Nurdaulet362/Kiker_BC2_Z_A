import { expect, test } from "@playwright/test";
import { trialIsLocked } from "./access-mode";

for (const language of ["en", "ru"] as const) {
  test(`the ${language} homepage links to Work Trial with keyboard access at 375px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(language => localStorage.setItem("fix-the-report.language", language), language);
    await page.goto("/");
    const label = language === "en" ? "Work Trial" : "Рабочее задание (Work Trial)";
    const link = page.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "#trial");
    await expect(page.locator('a[href="#practice"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Reach the real anchor from the page's normal tab order, then activate it.
    for (let steps = 0; steps < 40 && !(await link.evaluate(element => element === document.activeElement)); steps += 1) {
      await page.keyboard.press("Tab");
    }
    await expect(link).toBeFocused();
    expect(await link.evaluate(element => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
    })).toBe(true);
    await page.keyboard.press("Enter");
    if (await trialIsLocked(page, language)) return;
    await expect(page).toHaveURL(/#trial$/);
    await expect(page.getByText(language === "en"
      ? "Find the cancelled order that breaks a revenue formula. A guided, seven-minute exercise."
      : "Найдите отменённый заказ, который искажает выручку. Семиминутное упражнение с подсказками.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: language === "en" ? "Start the work trial" : "Начать задание", exact: true }).click();
    // Work Trial keeps its existing USD formatting in both interface languages.
    await expect(page.locator(".sim-live-result strong")).toHaveText("$3,280.00");
    await expect(page.locator("html")).toHaveAttribute("lang", language);
  });
}

test("an in-page practice redirect replaces its history entry and keeps the lesson router in sync", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/#progress");
  await expect(page.getByRole("heading", { name: "See how far you’ve come", exact: true })).toBeVisible();
  await page.evaluate(() => { location.hash = "#practice"; });
  await expect(page).toHaveURL(/#lesson\/revenue-cancelled$/);
  await expect(page.getByRole("heading", { name: "The money that never arrived", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#progress$/);
  await expect(page.getByRole("heading", { name: "See how far you’ve come", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/#lesson\/revenue-cancelled$/);
  await expect(page.getByRole("heading", { name: "The money that never arrived", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open the report", exact: true }).click();
  await page.getByRole("textbox", { name: "Your formula", exact: true }).fill("=1200");
  await page.reload();
  await expect(page).toHaveURL(/#lesson\/revenue-cancelled$/);
  await expect(page.getByRole("textbox", { name: "Your formula", exact: true })).toHaveValue("=1200");
  expect(errors).toEqual([]);
});
