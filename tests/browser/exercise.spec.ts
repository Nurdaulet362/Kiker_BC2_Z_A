import { expect, test } from "@playwright/test";

test("complete the exercise, persist progress, retry and handle formula errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".report-total")).toHaveText("$1,200.00");
  await page.getByRole("button", { name: "Test the report" }).click();
  await expect(page.getByText("So far, so good")).toBeVisible();
  await page.getByRole("button", { name: "Add order" }).click();
  await page.getByLabel("Status for ORD-1046").selectOption("Cancelled");
  await expect(page.locator(".report-total")).toHaveText("$1,500.00");
  await page.getByRole("button", { name: "Test the report" }).click();
  await expect(page.getByText("Mistake found")).toBeVisible();
  await page
    .getByRole("button", { name: "Fix the formula", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Make the formula hold up." }),
  ).toBeVisible();
  await page.getByLabel("Revenue formula").fill("=SUM(");
  await expect(page.getByRole("alert")).toContainText("Could not calculate");
  await page.getByLabel("Revenue formula").fill("=1200");
  await page.getByRole("button", { name: "Verify my formula" }).click();
  await expect(page.getByText(/of 19 checks passed/)).toBeVisible();
  await page
    .getByLabel("Revenue formula")
    .fill('=SUMIF(B2:B101,"Paid",C2:C101)');
  await page.getByRole("button", { name: "Verify my formula" }).click();
  await expect(
    page.getByRole("heading", { name: "This report holds up." }),
  ).toBeVisible();
  await expect(
    page.getByText("19 checks passed", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "This report holds up." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Practice with new numbers" }).click();
  await expect(
    page.getByRole("heading", { name: "The revenue that wasn’t." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile, empty rows, invalid amounts, hints, help and reset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "How it works" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await page.getByLabel("Amount for ORD-1041").fill("wrong");
  await expect(page.getByRole("alert")).toContainText("Row 2");
  await expect(
    page.getByRole("button", { name: "Test the report" }),
  ).toBeDisabled();
  await page.getByLabel("Amount for ORD-1041").fill("0");
  await page.getByRole("button", { name: "Need a small hint?" }).click();
  await expect(page.locator(".hint-copy")).toContainText("paid orders");
  const removeButtons = page.getByRole("button", { name: /^Remove ORD/ });
  while (await removeButtons.count()) await removeButtons.first().click();
  await expect(page.locator(".empty-table")).toBeVisible();
  await expect(page.locator(".report-total")).toHaveText("$0.00");
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep working" })
    .click();
  await expect(page.locator(".empty-table")).toBeVisible();
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start over", exact: true })
    .click();
  await expect(page.locator(".report-total")).toHaveText("$1,200.00");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});
