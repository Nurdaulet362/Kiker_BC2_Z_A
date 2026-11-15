import { expect, test, type Page } from "@playwright/test";
import { trialIsLocked } from "./access-mode";

const key = "fix-the-report.work-trial.v1";
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key);

async function solve(page: Page) {
  await page.getByLabel("Paid revenue formula").fill('=SUMIF(B2:B101,"Paid",C2:C101)');
  await page.getByRole("button", { name: "Continue to conversion", exact: true }).click();
  await page.getByLabel("Overall conversion formula").fill('=IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101))');
  await page.getByRole("button", { name: "Continue to your decision", exact: true }).click();
  await page.getByRole("radio", { name: "Email", exact: true }).check();
  await page.getByRole("radio", { name: "Contribution per dollar of ad spend", exact: true }).check();
  await page.getByRole("radio", { name: "One week is limited evidence. Run a small test and measure it.", exact: true }).check();
}

test("an old Work Trial tab cannot erase a completed review with its next edit", async ({ page, context }) => {
  await page.goto("/#trial");
  if (await trialIsLocked(page)) return;
  await page.getByRole("button", { name: "Start the work trial", exact: true }).click();
  await expect.poll(async () => (await read(page))?.stage).toBe("work");
  const other = await context.newPage();
  // Model a suspended tab whose queued storage events have not been delivered.
  await other.addInitScript(() => {
    const original = window.addEventListener.bind(window);
    window.addEventListener = ((type: string, ...args: unknown[]) => {
      if (type !== "storage") (original as (...args: unknown[]) => void)(type, ...args);
    }) as typeof window.addEventListener;
  });
  await other.goto("/#trial");
  await expect(other.getByLabel("Paid revenue formula")).toBeVisible();
  await solve(page);
  await page.getByRole("button", { name: "Submit my work", exact: true }).click();
  await expect(page.locator(".sim-score strong")).toHaveText("100");
  await expect.poll(async () => (await read(page))?.submissions?.length).toBe(1);
  await other.getByLabel("Paid revenue formula").fill("=42");
  await expect.poll(async () => (await read(page))?.answers?.revenue).toBe("=42");
  for (const tab of [page, other]) {
    await tab.reload();
    expect((await read(tab)).submissions).toHaveLength(1);
    expect((await read(tab)).submissions[0].score).toBe(100);
  }
});

test("Work Trial synchronizes views and keeps two simultaneous submissions after reload", async ({ page, context }) => {
  await page.goto("/#trial");
  if (await trialIsLocked(page)) return;
  await page.getByRole("button", { name: "Start the work trial", exact: true }).click();
  await solve(page);
  await expect.poll(async () => (await read(page))?.answers?.channel).toBe("Email");
  const other = await context.newPage();
  await other.goto("/#trial");
  await expect(other.getByRole("button", { name: "Submit my work", exact: true })).toBeVisible();
  await Promise.all([page, other].map(tab => tab.getByRole("button", { name: "Submit my work", exact: true }).click()));
  await expect.poll(async () => (await read(page))?.submissions?.length).toBe(2);
  for (const tab of [page, other]) {
    await expect(tab.locator(".sim-score strong")).toHaveText("100");
    await tab.reload();
    await expect(tab.locator(".sim-score strong")).toHaveText("100");
    const saved = await read(tab);
    expect(saved.submissions).toHaveLength(2);
    expect(new Set(saved.submissions.map((entry: { id: string }) => entry.id)).size).toBe(2);
  }
});

test("a late Work Trial assessment adds its review without replacing a newer same-assignment edit", async ({ page, context }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: unknown) {
        if ((message as { type?: string }).type === "assess") setTimeout(() => super.postMessage(message), 1500);
        else super.postMessage(message);
      }
    };
  });
  await page.goto("/#trial");
  if (await trialIsLocked(page)) return;
  await page.getByRole("button", { name: "Start the work trial", exact: true }).click();
  await solve(page);
  await expect.poll(async () => (await read(page))?.answers?.channel).toBe("Email");
  const other = await context.newPage();
  await other.goto("/#trial");
  await page.getByRole("button", { name: "Submit my work", exact: true }).click();
  await other.getByRole("button", { name: /Repair the revenue/ }).click();
  await other.getByLabel("Paid revenue formula").fill("=42");
  await expect.poll(async () => (await read(page))?.answers?.revenue).toBe("=42");
  await expect.poll(async () => (await read(page))?.submissions?.length).toBe(1);
  for (const tab of [page, other]) {
    await tab.reload();
    await expect(tab.getByLabel("Paid revenue formula")).toHaveValue("=42");
    const saved = await read(tab);
    expect(saved.stage).toBe("work");
    expect(saved.submissions[0].score).toBe(100);
    expect(saved.submissions[0].snapshot.answers.revenue).toBe('=SUMIF(B2:B101,"Paid",C2:C101)');
  }
});

test("a fresh Work Trial keeps past reviews and cannot be replaced by an old assignment tab", async ({ page, context }) => {
  await page.goto("/#trial");
  if (await trialIsLocked(page)) return;
  await page.getByRole("button", { name: "Start the work trial", exact: true }).click();
  await expect.poll(async () => (await read(page))?.stage).toBe("work");
  const other = await context.newPage();
  await other.addInitScript(() => {
    const original = window.addEventListener.bind(window);
    window.addEventListener = ((type: string, ...args: unknown[]) => {
      if (type !== "storage") (original as (...args: unknown[]) => void)(type, ...args);
    }) as typeof window.addEventListener;
  });
  await other.goto("/#trial");
  await solve(page);
  await page.getByRole("button", { name: "Submit my work", exact: true }).click();
  await expect(page.locator(".sim-score strong")).toHaveText("100");
  await page.getByRole("button", { name: "Try a fresh assignment", exact: true }).click();
  await page.getByRole("button", { name: "Start fresh assignment", exact: true }).click();
  await expect.poll(async () => (await read(page))?.generation).toBe(1);
  await other.getByLabel("Paid revenue formula").fill("=42");
  // Its local flush publishes the reconciled newer assignment back to the tab.
  await expect(other.getByLabel("Paid revenue formula")).toHaveValue("=SUM(C2:C101)");
  for (const tab of [page, other]) {
    await tab.reload();
    const saved = await read(tab);
    expect(saved.generation).toBe(1);
    expect(saved.scenario.seed).toBe(1);
    expect(saved.stage).toBe("work");
    expect(saved.submissions).toHaveLength(1);
    expect(saved.submissions[0].generation).toBe(0);
    expect(saved.submissions[0].score).toBe(100);
    expect(saved.hints).toEqual([]);
  }
});
