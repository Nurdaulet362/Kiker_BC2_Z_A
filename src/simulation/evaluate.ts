import {
  calculate,
  calculateGrid,
  verify,
  type GridCalculation,
} from "../formula";
import { money } from "../model";
import {
  bestChannel,
  conversionGrid,
  rate,
  validateScenario,
  type Answers,
  type Scenario,
  type SkillResult,
  type Submission,
  type TrialCheck,
} from "./model";

export type Preview = { revenue: GridCalculation; conversion: GridCalculation };
export function preview(scenario: Scenario, answers: Answers): Preview {
  const error = validateScenario(scenario);
  if (error) return { revenue: { error }, conversion: { error } };
  return {
    revenue: calculate(answers.revenue, scenario.orders),
    conversion: calculateGrid(answers.conversion, conversionGrid(scenario), 4),
  };
}

export function conversionChecks(
  formula: string,
  scenario: Scenario,
): TrialCheck[] {
  const grid = (rows: [string, number, number][]) => [
    ["Channel", "Leads", "Paid orders", "Conversion"],
    ...rows.map(([name, leads, paid]) => [
      name,
      leads,
      paid,
      leads ? paid / leads : "N/A",
    ]),
  ];
  const tests = [
    { name: "Your report", data: conversionGrid(scenario) },
    {
      name: "Different audience sizes",
      data: grid([
        ["Email", 10, 5],
        ["Ads", 100, 10],
      ]),
    },
    {
      name: "Equal audience sizes",
      data: grid([
        ["Email", 50, 10],
        ["Ads", 50, 5],
      ]),
    },
    {
      name: "No paid orders",
      data: grid([
        ["Email", 30, 0],
        ["Ads", 200, 0],
      ]),
    },
    {
      name: "No leads: return N/A",
      data: grid([
        ["Email", 0, 0],
        ["Ads", 0, 0],
      ]),
    },
    {
      name: "A new channel",
      data: grid([
        ["Email", 20, 2],
        ["Ads", 100, 15],
        ["Referral", 40, 20],
      ]),
    },
    {
      name: "One empty channel",
      data: grid([
        ["Email", 0, 0],
        ["Ads", 80, 20],
      ]),
    },
    {
      name: "New channel on row 101",
      data: grid([
        ...Array.from({ length: 99 }, (_, i): [string, number, number] => [
          `Channel ${i}`,
          0,
          0,
        ]),
        ["New", 125, 17],
      ]),
    },
  ];
  return tests.map((test) => {
    const leads = test.data
      .slice(1)
      .reduce((sum, row) => sum + Number(row[1]), 0);
    const paid = test.data
      .slice(1)
      .reduce((sum, row) => sum + Number(row[2]), 0);
    const expected = leads ? paid / leads : "N/A";
    const result = calculateGrid(formula, test.data, 4);
    const passed =
      expected === "N/A"
        ? result.value === "N/A"
        : typeof result.value === "number" &&
          Math.abs(result.value - expected) < 1e-8;
    return {
      name: test.name,
      passed,
      expected: rate(expected),
      actual: result.error ?? rate(result.value),
      explanation:
        "Divide all paid orders by all leads. Return the text N/A when total leads are zero. Keep the full precision in your formula.",
    };
  });
}

export function assess(
  scenario: Scenario,
  answers: Answers,
  seconds: number,
): Submission {
  const error = validateScenario(scenario);
  if (error) throw new Error(error);
  const revenue: TrialCheck[] = verify(answers.revenue, scenario.orders).map(
    (check) => ({
      name: check.name,
      passed: check.passed,
      expected: money(check.expected),
      actual:
        check.error ??
        (check.actual === null ? "No result" : money(check.actual)),
      explanation: check.description,
    }),
  );
  const conversion = conversionChecks(answers.conversion, scenario);
  const winner = bestChannel(scenario);
  const judgment: TrialCheck[] = [
    {
      name: "Choose the next controlled test",
      passed: answers.channel === winner,
      expected:
        winner === "Neither"
          ? "Neither: hold the budget and investigate"
          : `${winner}: a small controlled test`,
      actual: answers.channel || "Not answered",
      explanation:
        "Choose the channel with the higher positive contribution per dollar of ad spend. If neither is positive, or the ratios tie, hold the budget. Zero spend cannot support an efficiency estimate.",
    },
    {
      name: "Use an economic reason",
      passed: answers.evidence === "contribution",
      expected: "Contribution per dollar of ad spend",
      actual: {
        "": "Not answered",
        contribution: "Contribution per dollar of ad spend",
        volume: "More paid orders show which channel can absorb more budget",
        conversion: "A higher conversion rate means the next customer will cost less",
      }[answers.evidence],
      explanation:
        "Contribution here means paid revenue minus ad spend. Compare contribution / ad spend; customer count alone misses acquisition cost.",
    },
    {
      name: "State the limit of the evidence",
      passed: answers.limitation === "limited",
      expected: "One week does not prove future returns",
      actual: {
        "": "Not answered",
        guaranteed: "A positive return means the budget can be scaled without added risk.",
        limited: "One week does not prove future returns",
        none: "Once the formulas are verified, this week is enough evidence for a full rollout.",
      }[answers.limitation],
      explanation:
        "Recommend a small experiment, measure its outcome, and do not promise that past efficiency continues as spend increases.",
    },
  ];
  const skills: SkillResult[] = [
    {
      id: "revenue",
      name: "Revenue accuracy",
      score: Math.round(
        (revenue.filter((c) => c.passed).length / revenue.length) * 40,
      ),
      maximum: 40,
      checks: revenue,
    },
    {
      id: "conversion",
      name: "Metric reasoning",
      score: Math.round(
        (conversion.filter((c) => c.passed).length / conversion.length) * 35,
      ),
      maximum: 35,
      checks: conversion,
    },
    {
      id: "judgment",
      name: "Business judgment",
      score:
        (judgment[0].passed ? 10 : 0) +
        (judgment[1].passed ? 10 : 0) +
        (judgment[2].passed ? 5 : 0),
      maximum: 25,
      checks: judgment,
    },
  ];
  return {
    score: skills.reduce((sum, skill) => sum + skill.score, 0),
    skills,
    at: new Date().toISOString(),
    seconds,
    snapshot: {
      scenario: structuredClone(scenario),
      answers: { ...answers },
      hints: [],
    },
  };
}
