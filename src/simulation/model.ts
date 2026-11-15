import type { FormulaIssue } from "../formula-errors";
import { expectedRevenue, validateRows, type Order } from "../model";
import { chooseChannel } from "../decision";

export const TRIAL_KEY = "fix-the-report.work-trial.v1";
export const CHANNELS = ["Email", "Ads"] as const;
export type ChannelName = (typeof CHANNELS)[number];
export type TrialOrder = Order & { channel: ChannelName };
export type Channel = { name: ChannelName; leads: string; spend: string };
export type Scenario = {
  seed: number;
  orders: TrialOrder[];
  channels: Channel[];
};
export type Answers = {
  revenue: string;
  conversion: string;
  channel: "" | ChannelName | "Neither";
  evidence: "" | "contribution" | "volume" | "conversion";
  limitation: "" | "guaranteed" | "limited" | "none";
  note: string;
};
export type TrialCheck = {
  code?: FormulaIssue["code"];
  params?: FormulaIssue["params"];
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  explanation: string;
};
export type SkillResult = {
  id: "revenue" | "conversion" | "judgment";
  name: string;
  score: number;
  maximum: number;
  checks: TrialCheck[];
};
export type Submission = {
  // Optional for version-1 reviews saved before cross-tab synchronization.
  id?: string;
  generation?: number;
  recordedAt?: string;
  score: number;
  skills: SkillResult[];
  at: string;
  seconds: number;
  // Optional only for reviews saved before submission snapshots were introduced.
  snapshot?: { scenario: Scenario; answers: Answers; hints: string[] };
};
export type TrialState = {
  version: 1;
  generation?: number;
  updatedAt?: string;
  stage: "home" | "work" | "result";
  scenario: Scenario;
  answers: Answers;
  active: "revenue" | "conversion" | "judgment";
  startedAt: string | null;
  submissions: Submission[];
  hints: string[];
};

export function createScenario(seed = 0): Scenario {
  const factor = 1 + (seed % 7) * 0.13;
  const amounts = (
    values: number[],
    channel: ChannelName,
    status: Order["status"],
  ): TrialOrder[] =>
    values.map((amount, index) => ({
      id: `${channel === "Email" ? "E" : "A"}-${status === "Pending" ? "W" : status[0]}${101 + index}`,
      channel,
      status,
      amount: (amount * factor).toFixed(2),
    }));
  const orders = [
    ...amounts([240, 180, 160, 120, 200], "Email", "Paid"),
    ...amounts([300], "Email", "Cancelled"),
    ...amounts([200], "Email", "Pending"),
    ...amounts([120, 90, 80, 100, 70, 90, 60, 80, 110, 100], "Ads", "Paid"),
    ...amounts([450, 350], "Ads", "Cancelled"),
    ...amounts([180], "Ads", "Pending"),
  ];
  return {
    seed,
    orders,
    channels: [
      {
        name: "Email",
        leads: String(50 + (seed % 4) * 10),
        spend: ((seed % 2 ? 1150 : 200) * factor).toFixed(2),
      },
      {
        name: "Ads",
        leads: String(200 + (seed % 5) * 20),
        spend: ((seed % 2 ? 250 : 1100) * factor).toFixed(2),
      },
    ],
  };
}

export function initialTrial(seed = 0): TrialState {
  return {
    version: 1,
    stage: "home",
    scenario: createScenario(seed),
    active: "revenue",
    startedAt: null,
    submissions: [],
    hints: [],
    answers: {
      revenue: "=SUM(C2:C101)",
      conversion: "=AVERAGE(D2:D3)",
      channel: "",
      evidence: "",
      limitation: "",
      note: "",
    },
  };
}

export function channelMetrics(scenario: Scenario) {
  return scenario.channels.map((channel) => {
    const orders = scenario.orders.filter(
      (order) => order.channel === channel.name,
    );
    const paid = orders.filter((order) => order.status === "Paid").length;
    const revenue = expectedRevenue(orders);
    const leads = Number(channel.leads),
      spend = Number(channel.spend);
    return {
      name: channel.name,
      leads,
      paid,
      revenue,
      spend,
      conversion: leads ? paid / leads : null,
      contribution: Math.round((revenue - spend) * 100) / 100,
    };
  });
}

export function validateScenario(scenario: Scenario): string | null {
  const rowError = validateRows(scenario.orders);
  if (rowError) return rowError;
  for (const channel of scenario.channels) {
    const paid = scenario.orders.filter(
      (o) => o.channel === channel.name && o.status === "Paid",
    ).length;
    if (
      !/^\d+$/.test(channel.leads) ||
      Number(channel.leads) > 1_000_000 ||
      Number(channel.leads) < paid
    )
      return `${channel.name} leads must be a whole number between ${paid} and 1,000,000. Paid orders cannot exceed leads.`;
    if (
      !/^\d+(\.\d{1,2})?$/.test(channel.spend) ||
      Number(channel.spend) > 1_000_000
    )
      return `${channel.name} spend must be from 0 to 1,000,000, with up to two decimal places.`;
  }
  return null;
}

export function conversionGrid(scenario: Scenario): (string | number)[][] {
  return [
    ["Channel", "Leads", "Paid orders", "Conversion"],
    ...channelMetrics(scenario).map((c) => [
      c.name,
      c.leads,
      c.paid,
      c.conversion ?? "N/A",
    ]),
  ];
}

export function bestChannel(scenario: Scenario): Answers["channel"] {
  const winner = chooseChannel(channelMetrics(scenario));
  return winner === "hold" ? "Neither" : winner;
}

export const rate = (value: number | "N/A" | null | undefined) =>
  value === null || value === "N/A"
    ? "N/A"
    : value === undefined
      ? "—"
      : `${(value * 100).toFixed(2)}%`;

function validSavedScenario(value: unknown): value is Scenario {
  if (!value || typeof value !== "object") return false;
  const scenario = value as Scenario;
  return (
    Number.isInteger(scenario.seed) &&
    scenario.seed >= 0 &&
    scenario.seed <= 1_000_000 &&
    Array.isArray(scenario.orders) &&
    scenario.orders.length <= 100 &&
    scenario.orders.every(
      (o) =>
        o &&
        typeof o.id === "string" &&
        o.id.length < 60 &&
        CHANNELS.includes(o.channel) &&
        ["Paid", "Cancelled", "Pending"].includes(o.status) &&
        typeof o.amount === "string" &&
        o.amount.length <= 30,
    ) &&
    new Set(scenario.orders.map((o) => o.id)).size === scenario.orders.length &&
    Array.isArray(scenario.channels) &&
    scenario.channels.length === 2 &&
    scenario.channels.every(
      (c, i) =>
        c &&
        c.name === CHANNELS[i] &&
        typeof c.leads === "string" &&
        c.leads.length <= 30 &&
        typeof c.spend === "string" &&
        c.spend.length <= 30,
    )
  );
}

function validSavedAnswers(value: unknown): value is Answers {
  if (!value || typeof value !== "object") return false;
  const a = value as Answers;
  return (
    typeof a.revenue === "string" &&
    a.revenue.length <= 1000 &&
    typeof a.conversion === "string" &&
    a.conversion.length <= 1000 &&
    typeof a.note === "string" &&
    a.note.length <= 1200 &&
    ["", "Email", "Ads", "Neither"].includes(a.channel) &&
    ["", "contribution", "volume", "conversion"].includes(a.evidence) &&
    ["", "guaranteed", "limited", "none"].includes(a.limitation)
  );
}

function validSavedHints(hints: unknown): hints is string[] {
  return (
    Array.isArray(hints) &&
    hints.length <= 3 &&
    hints.every((h) => ["revenue", "conversion", "judgment"].includes(h))
  );
}

function validSavedSubmission(value: unknown): value is Submission {
  if (!value || typeof value !== "object") return false;
  const result = value as Submission;
  return (result.id === undefined || (typeof result.id === "string" && /^[A-Za-z0-9_.:-]{1,200}$/.test(result.id)))
    && (result.generation === undefined || (Number.isSafeInteger(result.generation) && result.generation >= 0))
    && (result.recordedAt === undefined || (typeof result.recordedAt === "string" && result.recordedAt.length <= 40 && Number.isFinite(Date.parse(result.recordedAt))))
    && Number.isFinite(result.score) && result.score >= 0 && result.score <= 100
    && Number.isFinite(result.seconds)
    && typeof result.at === "string" && Number.isFinite(Date.parse(result.at))
    && (result.snapshot === undefined || (
      !!result.snapshot && validSavedScenario(result.snapshot.scenario)
      && validSavedAnswers(result.snapshot.answers) && validSavedHints(result.snapshot.hints)
      && validateScenario(result.snapshot.scenario) === null
    ))
    && Array.isArray(result.skills) && result.skills.length === 3
    && result.skills.every(skill => skill
      && ["revenue", "conversion", "judgment"].includes(skill.id)
      && typeof skill.name === "string" && Number.isFinite(skill.score) && Number.isFinite(skill.maximum)
      && Array.isArray(skill.checks) && skill.checks.length <= 30
      && skill.checks.every(check => check
        && typeof check.name === "string" && typeof check.passed === "boolean"
        && typeof check.expected === "string" && typeof check.actual === "string"
        && typeof check.explanation === "string"));
}

export function restoreTrial(raw: string | null): TrialState {
  const initial = initialTrial();
  try {
    if (!raw) return initial;
    const state = JSON.parse(raw) as TrialState | null;
    if (!state || state.version !== 1) return initial;
    // History is independent of the current draft: validate each review before
    // deciding whether the report being edited can be resumed.
    const submissions = Array.isArray(state.submissions)
      ? state.submissions.filter(validSavedSubmission).slice(-50) : [];
    const recovered = { ...initial, submissions };
    if (!["home", "work", "result"].includes(state.stage)
      || !["revenue", "conversion", "judgment"].includes(state.active)
      || !validSavedScenario(state.scenario) || !validSavedAnswers(state.answers)
      || !validSavedHints(state.hints)) return recovered;
    if (state.stage !== "home" && (typeof state.startedAt !== "string"
      || !Number.isFinite(Date.parse(state.startedAt)))) return recovered;
    if (state.stage === "result" && submissions.length === 0) return recovered;
    const { generation, updatedAt, ...legacy } = state;
    return { ...legacy, submissions,
      ...(Number.isSafeInteger(generation) && generation! >= 0 ? { generation } : {}),
      ...(typeof updatedAt === "string" && updatedAt.length <= 40 && Number.isFinite(Date.parse(updatedAt)) ? { updatedAt } : {}),
    };
  } catch {
    return initial;
  }
}
