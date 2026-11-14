import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Russian follows the active assignment, saved review and guided lesson", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#trial");
  await page.getByRole("button", { name: "Start the work trial" }).click();
  const formula = '=SUMIF(B2:B101,"Paid",C2:C101)';
  await page.getByLabel("Paid revenue formula").fill(formula);

  await page.getByRole("button", { name: "Русский" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page).toHaveTitle(/практика работы с таблицами/);
  await expect(page.getByLabel("Формула выручки по оплатам")).toHaveValue(
    formula,
  );
  const status = page.getByLabel("Статус заказа E-P101");
  await expect(status.locator("option:checked")).toHaveText("Оплачен");
  await expect(status).toHaveValue("Paid");
  await page.getByLabel("Формула выручки по оплатам").fill("=SUM(");
  await expect(page.getByRole("alert")).toHaveText(
    /Не удалось вычислить формулу/,
  );
  await page.getByLabel("Формула выручки по оплатам").fill(formula);
  await page.getByRole("button", { name: "Перейти к конверсии" }).click();
  await page
    .getByLabel("Формула общей конверсии")
    .fill('=IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101))');
  await page.getByRole("button", { name: "Перейти к решению" }).click();
  await page.getByRole("radio", { name: "Рассылка", exact: true }).check();
  await page
    .getByRole("radio", { name: "Вклад на доллар рекламных расходов" })
    .check();
  await page.getByRole("radio", { name: /Данных за неделю мало/ }).check();
  await page.getByRole("button", { name: "Отправить на проверку" }).click();
  await expect(page.locator(".sim-score strong")).toHaveText("100");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать разбор" }).click();
  const download = await downloadPromise;
  const report = await readFile(await download.path(), "utf8");
  expect(report).toContain("Баллы: 100/100");
  expect(report).toContain("Все заказы оплачены");
  expect(report).toContain(formula);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Разбор задания", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(
    page.getByRole("heading", { name: "Your assignment review" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Русский" }).click();
  await page
    .getByRole("link", { name: "Тренировка с подсказками", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Выручка, которой не было" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Добавить заказ" }).click();
  await page.getByLabel("Статус заказа ORD-1046").selectOption("Cancelled");
  await page.getByRole("button", { name: "Проверить отчёт" }).click();
  await expect(page.getByText("Ошибка найдена", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});
