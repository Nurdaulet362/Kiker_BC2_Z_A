import { expect, test } from "@playwright/test";
import { trialIsLocked } from "./access-mode";
const revenue = '=SUMIF(B2:B101,"Paid",C2:C101)';
const conversion = '=IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101))';

test("work trial: diagnose, repair, explain, persist, download and solve a new assignment", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#trial");
  if (await trialIsLocked(page)) {
    expect(errors).toEqual([]);
    return;
  }
  await page.getByRole("button", { name: "Start the work trial" }).click();
  await expect(page.locator(".sim-live-result strong")).toHaveText("$3,280.00");
  await page.getByRole("button", { name: "Continue to conversion" }).click();
  await expect(page.locator(".sim-live-result strong")).toHaveText("7.50%");
  await page.getByRole("button", { name: "Continue to your decision" }).click();
  await page.getByRole("radio", { name: "Ads", exact: true }).check();
  await page
    .getByRole("radio", { name: "More paid orders show which channel can absorb more budget", exact: true })
    .check();
  await page
    .getByRole("radio", {
      name: "A positive return means the budget can be scaled without added risk.",
    })
    .check();
  await page.getByRole("button", { name: "Submit my work" }).click();
  await expect(
    page.getByRole("heading", { name: "Now you know what to practice." }),
  ).toBeVisible();
  const first = await page.locator(".sim-score strong").innerText();
  expect(Number(first)).toBeLessThan(50);
  await page.getByRole("button", { name: "Practice my weakest skill" }).click();
  await page.getByRole("button", { name: /Repair the revenue/ }).click();
  await page.getByLabel("Paid revenue formula").fill(revenue);
  await expect(page.locator(".sim-live-result strong")).toHaveText("$1,800.00");
  await page.getByRole("button", { name: "Continue to conversion" }).click();
  await page.getByLabel("Overall conversion formula").fill(conversion);
  await expect(page.locator(".sim-live-result strong")).toHaveText("6.00%");
  await page.reload();
  await expect(page.getByLabel("Overall conversion formula")).toHaveValue(
    conversion,
  );
  await page.getByRole("button", { name: "Continue to your decision" }).click();
  await page.getByRole("radio", { name: "Email", exact: true }).check();
  await page
    .getByRole("radio", {
      name: "Contribution per dollar of ad spend",
      exact: true,
    })
    .check();
  await page
    .getByRole("radio", {
      name: "One week is limited evidence. Run a small test and measure it.",
    })
    .check();
  await page
    .getByLabel(/Your handoff note/)
    .fill("Test Email carefully and measure the next cohort.");
  await page.getByRole("button", { name: "Submit my work" }).click();
  await expect(
    page.getByRole("heading", { name: "You can defend this report." }),
  ).toBeVisible();
  await expect(page.locator(".sim-score strong")).toHaveText("100");
  await expect(page.getByTestId("demo-access-banner")).toBeVisible();
  await expect(page.getByText(`First submission: ${first}/100`)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my review" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "fix-the-report-review.md",
  );
  await page.reload();
  await expect(page.locator(".sim-score strong")).toHaveText("100");
  await page.getByRole("button", { name: "Try a fresh assignment" }).click();
  await page.getByRole("button", { name: "Start fresh assignment" }).click();
  await page.getByLabel("Paid revenue formula").fill(revenue);
  await page.getByRole("button", { name: "Continue to conversion" }).click();
  await page.getByLabel("Overall conversion formula").fill(conversion);
  await page.getByRole("button", { name: "Continue to your decision" }).click();
  await page.getByRole("radio", { name: "Ads", exact: true }).check();
  await page
    .getByRole("radio", {
      name: "Contribution per dollar of ad spend",
      exact: true,
    })
    .check();
  await page
    .getByRole("radio", {
      name: "One week is limited evidence. Run a small test and measure it.",
    })
    .check();
  await page.getByRole("button", { name: "Submit my work" }).click();
  await expect(page.locator(".sim-score strong")).toHaveText("100");
  expect(errors).toEqual([]);
});

test("mobile: errors, source changes, hints, restore, and first lesson navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#trial");
  if (await trialIsLocked(page)) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    return;
  }
  await page.getByRole("button", { name: "Start the work trial" }).click();
  await page.getByLabel("Amount for E-P101").fill("wrong");
  await expect(page.getByText(/Row 2 needs an amount/).first()).toBeVisible();
  await page.getByLabel("Amount for E-P101").fill("240");
  await page.getByRole("button", { name: "Show a worked hint" }).click();
  await expect(page.getByRole("status")).toContainText("SUMIF");
  await page.getByRole("button", { name: "Continue to conversion" }).click();
  await expect(
    page.getByRole("heading", { name: "Check the conversion", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Check the conversion", exact: true }),
  ).toBeInViewport();
  await page.getByLabel("Leads for Email").fill("1");
  await expect(
    page.getByText(/Paid orders cannot exceed leads/).first(),
  ).toBeVisible();
  await page.getByLabel("Leads for Email").fill("50");
  await page.getByLabel("Overall conversion formula").fill("=SUM(");
  await expect(page.getByRole("alert")).toContainText("Could not calculate");
  await page.getByLabel("Overall conversion formula").fill(conversion);
  await page.getByRole("button", { name: "Continue to your decision" }).click();
  await expect(
    page.getByRole("heading", { name: "Defend your decision", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Defend your decision", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Submit my work" }),
  ).toBeDisabled();
  await page.getByLabel("Ad spend for Ads").fill("50");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page
    .getByRole("link", { name: "Guided practice", exact: true })
    .click();
  await expect(page).toHaveURL(/#lesson\/revenue-cancelled$/);
  await expect(
    page.getByRole("heading", { name: "The money that never arrived", exact: true }),
  ).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "My learning", exact: true }).click();
  await page.getByRole("link", { name: "Work Trial", exact: true }).click();
  await expect(page).toHaveURL(/#trial$/);
  await expect(page.getByLabel("Ad spend for Ads")).toHaveValue("50");
  await page.getByRole("button", { name: "Restore source data" }).click();
  await page.getByRole("button", { name: "Keep my edits" }).click();
  await expect(page.getByLabel("Ad spend for Ads")).toHaveValue("50");
  await page.getByRole("button", { name: "Restore source data" }).click();
  await page.getByRole("button", { name: "Restore data", exact: true }).click();
  await expect(page.getByLabel("Ad spend for Ads")).toHaveValue("1100.00");
  await page.getByRole("button", { name: /Check the conversion/ }).click();
  await expect(page.getByLabel("Overall conversion formula")).toHaveValue(
    conversion,
  );
});
