import { describe, expect, it } from "vitest";
import { calculateGrid } from "../src/formula";
import { assess, conversionChecks, preview } from "../src/simulation/evaluate";
import {
  bestChannel,
  channelMetrics,
  initialTrial,
  restoreTrial,
  validateScenario,
  type Answers,
} from "../src/simulation/model";

const correct: Answers = {
  revenue: '=SUMIF(B2:B101,"Paid",C2:C101)',
  conversion: '=IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101))',
  channel: "Email",
  evidence: "contribution",
  limitation: "limited",
  note: "Run a small test.",
};
describe("sales operations work trial", () => {
  it("exposes distinct revenue, denominator and budget mistakes in the starting draft", () => {
    const state = initialTrial();
    expect(new Set(state.scenario.orders.map((o) => o.id)).size).toBe(
      state.scenario.orders.length,
    );
    const result = preview(state.scenario, state.answers);
    expect(result.revenue.value).toBe(3280);
    expect(result.conversion.value).toBeCloseTo(0.075);
    expect(channelMetrics(state.scenario).map((c) => c.revenue)).toEqual([
      900, 900,
    ]);
    expect(channelMetrics(state.scenario).map((c) => c.contribution)).toEqual([
      700, -200,
    ]);
    expect(
      assess(
        state.scenario,
        {
          ...state.answers,
          channel: "Ads",
          evidence: "volume",
          limitation: "guaranteed",
        },
        60,
      ).score,
    ).toBeLessThan(50);
  });
  it("passes the correct solution across fresh datasets whose best channel changes", () => {
    for (let seed = 0; seed < 10; seed++) {
      const { scenario } = initialTrial(seed);
      const result = assess(
        scenario,
        { ...correct, channel: seed % 2 ? "Ads" : "Email" },
        120,
      );
      expect(result.score).toBe(100);
      expect(result.skills.flatMap((s) => s.checks)).toHaveLength(30);
    }
  });
  it("rejects constants and an average of rates on unseen channel sizes and new rows", () => {
    const { scenario } = initialTrial();
    for (const formula of [
      "=0.06",
      "=AVERAGE(D2:D3)",
      "=SUM(C2:C3)/SUM(B2:B3)",
    ])
      expect(conversionChecks(formula, scenario).some((c) => !c.passed)).toBe(
        true,
      );
    expect(
      conversionChecks(correct.conversion, scenario).every((c) => c.passed),
    ).toBe(true);
  });
  it("handles no leads as N/A, no paid orders as zero, and validates inconsistent source data", () => {
    expect(
      calculateGrid(
        '=IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101))',
        [
          ["Channel", "Leads", "Paid", "Rate"],
          ["Email", 0, 0, "N/A"],
        ],
        4,
      ).value,
    ).toBe("N/A");
    const { scenario } = initialTrial();
    scenario.channels[0].leads = "4";
    expect(validateScenario(scenario)).toContain(
      "Paid orders cannot exceed leads",
    );
    scenario.channels[0].leads = "50";
    scenario.channels[0].spend = "-5";
    expect(validateScenario(scenario)).toContain("spend must be");
  });
  it("changes the recommendation when costs change and holds when neither option is justified", () => {
    const { scenario } = initialTrial();
    scenario.channels[0].spend = "1200";
    expect(bestChannel(scenario)).toBe("Neither");
    scenario.channels[1].spend = "100";
    expect(bestChannel(scenario)).toBe("Ads");
    scenario.channels[0].spend = "100";
    expect(bestChannel(scenario)).toBe("Neither");
    scenario.channels[0].spend = "0";
    expect(bestChannel(scenario)).toBe("Ads");
  });
  it("links status edits across revenue, paid conversion counts and channel economics", () => {
    const { scenario } = initialTrial();
    scenario.orders[0].status = "Cancelled";
    const [email] = channelMetrics(scenario);
    expect(email.paid).toBe(4);
    expect(email.revenue).toBe(660);
    expect(preview(scenario, correct).conversion.value).toBeCloseTo(14 / 250);
    expect(assess(scenario, correct, 0).score).toBe(100);
  });
  it("restores a completed session and recovers safely from malformed saved state", () => {
    const state = initialTrial();
    state.startedAt = new Date().toISOString();
    state.stage = "result";
    state.answers = correct;
    state.submissions = [assess(state.scenario, correct, 30)];
    expect(restoreTrial(JSON.stringify(state))).toEqual(state);
    for (const raw of [
      "null",
      "{oops",
      JSON.stringify({ ...state, answers: null }),
      JSON.stringify({ ...state, submissions: [{}] }),
    ])
      expect(restoreTrial(raw)).toEqual(initialTrial());
  });
});
