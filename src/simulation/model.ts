import { expectedRevenue, validateRows, type Order } from "../model";

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
  score: number;
  skills: SkillResult[];
  at: string;
  seconds: number;
};
export type TrialState = {
  version: 1;
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
  const metrics = channelMetrics(scenario);
  const positive = metrics.filter((c) => c.contribution > 0 && c.spend > 0);
  if (!positive.length) return "Neither";
  const ranked = positive.sort(
    (a, b) => b.contribution / b.spend - a.contribution / a.spend,
  );
  if (
    ranked.length > 1 &&
    Math.abs(
      ranked[0].contribution / ranked[0].spend -
        ranked[1].contribution / ranked[1].spend,
    ) < 1e-9
  )
    return "Neither";
  return ranked[0].name;
}

export const rate = (value: number | "N/A" | null | undefined) =>
  value === null || value === "N/A"
    ? "N/A"
    : value === undefined
      ? "—"
      : `${(value * 100).toFixed(2)}%`;

export function restoreTrial(raw: string | null): TrialState {
  try {
    if (!raw) return initialTrial();
    const s = JSON.parse(raw) as TrialState;
    if (
      s.version !== 1 ||
      !["home", "work", "result"].includes(s.stage) ||
      !["revenue", "conversion", "judgment"].includes(s.active)
    )
      return initialTrial();
    if (
      !s.scenario ||
      !Number.isInteger(s.scenario.seed) ||
      s.scenario.seed < 0 ||
      s.scenario.seed > 1_000_000 ||
      !Array.isArray(s.scenario.orders) ||
      s.scenario.orders.length > 100 ||
      !s.scenario.orders.every(
        (o) =>
          o &&
          typeof o.id === "string" &&
          o.id.length < 60 &&
          CHANNELS.includes(o.channel) &&
          ["Paid", "Cancelled", "Pending"].includes(o.status) &&
          typeof o.amount === "string" &&
          o.amount.length <= 30,
      )
    )
      return initialTrial();
    if (
      !Array.isArray(s.scenario.channels) ||
      s.scenario.channels.length !== 2 ||
      !s.scenario.channels.every(
        (c, i) =>
          c.name === CHANNELS[i] &&
          typeof c.leads === "string" &&
          c.leads.length <= 30 &&
          typeof c.spend === "string" &&
          c.spend.length <= 30,
      )
    )
      return initialTrial();
    if (
      new Set(s.scenario.orders.map((o) => o.id)).size !==
      s.scenario.orders.length
    )
      return initialTrial();
    const a = s.answers;
    if (
      !a ||
      typeof a.revenue !== "string" ||
      a.revenue.length > 1000 ||
      typeof a.conversion !== "string" ||
      a.conversion.length > 1000 ||
      typeof a.note !== "string" ||
      a.note.length > 1200 ||
      !["", "Email", "Ads", "Neither"].includes(a.channel) ||
      !["", "contribution", "volume", "conversion"].includes(a.evidence) ||
      !["", "guaranteed", "limited", "none"].includes(a.limitation)
    )
      return initialTrial();
    if (
      !Array.isArray(s.hints) ||
      s.hints.length > 3 ||
      !s.hints.every((h) =>
        ["revenue", "conversion", "judgment"].includes(h),
      ) ||
      !Array.isArray(s.submissions) ||
      s.submissions.length > 50
    )
      return initialTrial();
    if (
      !s.submissions.every(
        (r) =>
          r &&
          Number.isFinite(r.score) &&
          r.score >= 0 &&
          r.score <= 100 &&
          Number.isFinite(r.seconds) &&
          typeof r.at === "string" &&
          Array.isArray(r.skills) &&
          r.skills.length === 3 &&
          r.skills.every(
            (k) =>
              k &&
              ["revenue", "conversion", "judgment"].includes(k.id) &&
              typeof k.name === "string" &&
              Number.isFinite(k.score) &&
              Number.isFinite(k.maximum) &&
              Array.isArray(k.checks) &&
              k.checks.length <= 30 &&
              k.checks.every(
                (c) =>
                  c &&
                  typeof c.name === "string" &&
                  typeof c.passed === "boolean" &&
                  typeof c.expected === "string" &&
                  typeof c.actual === "string" &&
                  typeof c.explanation === "string",
              ),
          ),
      )
    )
      return initialTrial();
    if (
      s.stage !== "home" &&
      (typeof s.startedAt !== "string" ||
        !Number.isFinite(Date.parse(s.startedAt)))
    )
      return initialTrial();
    if (s.stage === "result" && !s.submissions.length) return initialTrial();
    return s;
  } catch {
    return initialTrial();
  }
}
