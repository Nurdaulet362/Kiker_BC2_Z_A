import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173/";
const out = ".impeccable/review/ecc-qa";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const report = {
  baseURL,
  at: new Date().toISOString(),
  consoleErrors: [],
  failedRequests: [],
  httpErrors: [],
  screens: [],
  visualBaseline: "INCONCLUSIVE: no committed screenshot baseline",
};
function watch(target) {
  target.on("pageerror", (e) => report.consoleErrors.push(e.message));
  target.on("console", (m) => {
    if (m.type() === "error") report.consoleErrors.push(m.text());
  });
  target.on("requestfailed", (r) =>
    report.failedRequests.push({ url: r.url(), error: r.failure()?.errorText }),
  );
  target.on("response", (r) => {
    if (r.status() >= 400)
      report.httpErrors.push({ url: r.url(), status: r.status() });
  });
}
watch(page);
async function capture(name) {
  const storage = await page.evaluate(() => ({ ...localStorage }));
  const url = page.url();
  for (const width of [375, 768, 1440]) {
    const shot = await browser.newPage({
      viewport: { width, height: width === 375 ? 844 : 1000 },
      reducedMotion: "reduce",
    });
    watch(shot);
    await shot.addInitScript(
      (data) =>
        Object.entries(data).forEach(([key, value]) =>
          localStorage.setItem(key, value),
        ),
      storage,
    );
    await shot.goto(url);
    await shot.evaluate(() => document.fonts.ready);
    if (await shot.locator(".sim-live-result strong").count())
      await expect(shot.locator(".sim-live-result strong")).not.toHaveText(
        "Calculating…",
      );
    if (await shot.locator(".report-total").count())
      await expect(shot.locator(".report-total")).toHaveText("$1,200.00");
    await shot.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    const path = `${out}/${name}-${width}.png`;
    await shot.screenshot({ path, fullPage: true });
    const dimensions = await shot.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    report.screens.push({ state: name, width, path, ...dimensions });
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await shot.close();
  }
}

try {
  await page.goto(baseURL);
  await capture("home");
  await page.getByRole("button", { name: "Start the work trial" }).click();
  await expect(page.locator(".sim-live-result strong")).toHaveText("$3,280.00");
  await capture("revenue");
  await page.getByRole("button", { name: "Continue to conversion" }).click();
  await expect(page.locator(".sim-live-result strong")).toHaveText("7.50%");
  await capture("conversion");
  await page.getByRole("button", { name: "Continue to your decision" }).click();
  await page.getByRole("radio", { name: "Ads", exact: true }).check();
  await page
    .getByRole("radio", { name: "The number of paid orders", exact: true })
    .check();
  await page
    .getByRole("radio", {
      name: "The same return is guaranteed at a higher budget.",
    })
    .check();
  await capture("decision");
  await page.getByRole("button", { name: "Submit my work" }).click();
  await expect(page.locator(".sim-score strong")).toHaveText("17");
  await capture("review-failed");
  await page.getByRole("button", { name: "Practice my weakest skill" }).click();
  await page.getByRole("button", { name: /1 Repair the revenue/ }).click();
  await page
    .getByLabel("Paid revenue formula")
    .fill('=SUMIF(B2:B101,"Paid",C2:C101)');
  await page.getByRole("button", { name: "Continue to conversion" }).click();
  await page
    .getByLabel("Overall conversion formula")
    .fill('=IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101))');
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
  await page.getByRole("button", { name: "Submit my work" }).click();
  await expect(page.locator(".sim-score strong")).toHaveText("100");
  await capture("review-passed");
  await page
    .getByRole("link", { name: "Guided practice", exact: true })
    .click();
  await capture("guided-practice");
  expect(report.consoleErrors).toEqual([]);
  expect(report.failedRequests).toEqual([]);
  expect(report.httpErrors).toEqual([]);
  report.verdict = "PASS: production flow, requests and overflow checks";
} finally {
  await writeFile(`${out}/smoke.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
