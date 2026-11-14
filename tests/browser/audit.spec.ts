import { expect, test, type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";

const revenue = '=SUMIF(B2:B101,"Paid",C2:C101)';
const conversion = '=IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101))';

test("a saved review describes its submission, even after the draft is edited", async ({
  page,
}) => {
  await page.goto("/#trial");
  await page.getByRole("button", { name: "Start the work trial" }).click();
  await page.getByRole("button", { name: /3 Defend your decision/ }).click();
  await page.getByRole("radio", { name: "Ads", exact: true }).check();
  await page
    .getByRole("radio", { name: "More paid orders show which channel can absorb more budget", exact: true })
    .check();
  await page
    .getByRole("radio", {
      name: "A positive return means the budget can be scaled without added risk.",
    })
    .check();
  await page
    .getByLabel(/Your handoff note/)
    .fill("My original recommendation.");
  await page.getByRole("button", { name: "Submit my work" }).click();
  await expect(page.locator(".sim-score strong")).toHaveText("17");
  await page.getByRole("button", { name: "Practice my weakest skill" }).click();
  await page.getByRole("button", { name: /1 Repair the revenue/ }).click();
  await page.getByLabel("Paid revenue formula").fill(revenue);
  await page.getByRole("button", { name: "Show a worked hint" }).click();
  await page.getByRole("button", { name: /3 Defend your decision/ }).click();
  await page.getByLabel("Ad spend for Ads").fill("50");
  await page
    .getByLabel(/Your handoff note/)
    .fill("This is an unsubmitted draft.");
  await page.getByRole("button", { name: "Fix the Report home" }).click();
  await page.getByRole("button", { name: "View review" }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my review" }).click();
  const download = await downloadEvent;
  const body = await readFile((await download.path())!, "utf8");
  expect(body).toContain("Revenue: =SUM(C2:C101)");
  expect(body).toContain("My original recommendation.");
  expect(body).not.toContain("This is an unsubmitted draft.");
  expect(body).toContain("Hints used: 0");
  expect(body).toContain('"spend": "1100.00"');
  expect(body).not.toContain('"spend": "50"');
  await expect(page.getByText("0 worked hints opened")).toBeVisible();
  await page.reload();
  await expect(page.locator(".sim-score strong")).toHaveText("17");
  await expect(page.getByText("0 worked hints opened")).toBeVisible();
});

test("keyboard help dialog keeps the background inert and restores focus", async ({
  page,
}) => {
  await page.goto("/#trial");
  const trigger = page.getByRole("button", { name: "About this work trial" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    // Native dialogs allow Tab into browser chrome, represented by body focus.
    expect(
      await dialog.evaluate(
        (el) =>
          document.activeElement === document.body ||
          el.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Start exploring" }).click();
  await expect(trigger).toBeFocused();
});

test("zero paid orders and zero leads can be completed with N/A conversion", async ({
  page,
}) => {
  await page.goto("/#trial");
  await page.getByRole("button", { name: "Start the work trial" }).click();
  await page.getByLabel("Paid revenue formula").fill(revenue);
  for (const status of await page.getByRole("combobox").all()) {
    await status.selectOption("Cancelled");
  }
  await expect(page.locator(".sim-live-result strong")).toHaveText("$0.00");
  await page.getByRole("button", { name: "Continue to conversion" }).click();
  await page.getByLabel("Leads for Email").fill("0");
  await page.getByLabel("Leads for Ads").fill("0");
  await page.getByLabel("Overall conversion formula").fill(conversion);
  await expect(page.locator(".sim-live-result strong")).toHaveText("N/A");
  await page.getByRole("button", { name: "Continue to your decision" }).click();
  await page
    .getByRole("radio", { name: "Hold the budget and investigate" })
    .check();
  await page
    .getByRole("radio", { name: "Contribution per dollar of ad spend" })
    .check();
  await page
    .getByRole("radio", {
      name: "One week is limited evidence. Run a small test and measure it.",
    })
    .check();
  await page.getByRole("button", { name: "Submit my work" }).click();
  await expect(page.locator(".sim-score strong")).toHaveText("100");
});

test("unavailable browser storage warns clearly and leaves the trial usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.goto("/#trial");
  await expect(
    page.getByText(/Your browser cannot save this session/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start the work trial" }).click();
  await page.getByLabel("Paid revenue formula").fill(revenue);
  await expect(page.locator(".sim-live-result strong")).toHaveText("$1,800.00");
  await expect(
    page.getByText("Saving unavailable in this browser"),
  ).toBeVisible();
});

test("both exercise drafts survive route changes when browser storage is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.goto("/#trial");
  await page.getByRole("button", { name: "Start the work trial" }).click();
  await page.getByLabel("Paid revenue formula").fill(revenue);
  await page
    .getByRole("link", { name: "Guided practice", exact: true })
    .click();
  await expect(
    page.getByText(/Your browser cannot save progress/),
  ).toBeVisible();
  await page.getByLabel("Amount for ORD-1041").fill("321.45");
  await page.getByLabel("Status for ORD-1041").selectOption("Cancelled");

  await page.getByRole("link", { name: "Back to work simulations" }).click();
  await expect(page.getByLabel("Paid revenue formula")).toHaveValue(revenue);
  await expect(
    page.getByText(/Your browser cannot save this session/),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Guided practice", exact: true })
    .click();
  await expect(page.getByLabel("Amount for ORD-1041")).toHaveValue("321.45");
  await expect(page.getByLabel("Status for ORD-1041")).toHaveValue("Cancelled");
  await expect(
    page.getByText(/Your browser cannot save progress/),
  ).toBeVisible();
});

test("the complete work trial can be submitted using only the keyboard", async ({
  page,
}) => {
  const tabTo = async (target: Locator, reverse = false) => {
    for (let step = 0; step < 110; step++) {
      if (await target.evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press(reverse ? "Shift+Tab" : "Tab");
    }
    await expect(target).toBeFocused();
  };
  await page.goto("/#trial");
  await tabTo(page.getByRole("button", { name: "Start the work trial" }));
  await page.keyboard.press("Enter");
  await tabTo(page.getByLabel("Paid revenue formula"));
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(revenue);
  await tabTo(
    page.getByRole("button", { name: /2 Check the conversion/ }),
    true,
  );
  await page.keyboard.press("Enter");
  await tabTo(page.getByLabel("Overall conversion formula"));
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(conversion);
  await tabTo(page.getByRole("button", { name: "Continue to your decision" }));
  await page.keyboard.press("Enter");
  for (const name of [
    "Email",
    "Contribution per dollar of ad spend",
    "A positive return means the budget can be scaled without added risk.",
  ]) {
    await tabTo(page.getByRole("radio", { name, exact: true }));
    await page.keyboard.press("Space");
  }
  await page.keyboard.press("ArrowDown");
  await tabTo(page.getByRole("button", { name: "Submit my work" }));
  await page.keyboard.press("Enter");
  await expect(page.locator(".sim-score strong")).toHaveText("100");
});

test("guided practice sidebar content remains reachable in a short desktop window", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1152, height: 630 });
  await page.goto("/#practice");
  const footer = page.getByText("Guest session · saved locally");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeInViewport();
  const bounds = await page.locator(".sidebar").boundingBox();
  const text = await footer.boundingBox();
  expect(text!.y + text!.height).toBeLessThanOrEqual(
    bounds!.y + bounds!.height,
  );
});
