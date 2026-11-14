export type Status = "Paid" | "Cancelled" | "Pending";
export type Order = { id: string; status: Status; amount: string };
export type Stage = "investigate" | "repair" | "complete";
export type Evidence = { reported: number; expected: number; rows: Order[] };
export type Progress = {
  version: 1;
  rows: Order[];
  formula: string;
  stage: Stage;
  evidence: Evidence | null;
  hints: number;
  attempts: number;
  completedAt: string | null;
};
export const ORIGINAL_FORMULA = "=SUM(C2:C101)";
export const CORRECT_EXAMPLE = '=SUMIF(B2:B101,"Paid",C2:C101)';
export const STORAGE_KEY = "fix-the-report.cancelled-orders.v1";
export const STATUSES: Status[] = ["Paid", "Cancelled", "Pending"];
export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);

export function initialProgress(): Progress {
  return {
    version: 1,
    rows: [240, 180, 320, 160, 300].map((amount, index) => ({
      id: `ORD-${1041 + index}`,
      status: "Paid",
      amount: String(amount),
    })),
    formula: ORIGINAL_FORMULA,
    stage: "investigate",
    evidence: null,
    hints: 0,
    attempts: 0,
    completedAt: null,
  };
}

export function validateRows(rows: Order[]): string | null {
  if (rows.length > 100)
    return "This exercise supports up to 100 orders. Remove a row to continue.";
  for (const [index, row] of rows.entries()) {
    if (!STATUSES.includes(row.status))
      return `Choose a status for row ${index + 2}.`;
    if (
      !/^\d+(\.\d{1,2})?$/.test(row.amount) ||
      Number(row.amount) > 1_000_000
    ) {
      return `Row ${index + 2} needs an amount from 0 to 1,000,000 with up to two decimal places.`;
    }
  }
  return null;
}

export function expectedRevenue(rows: Order[]): number {
  const cents = rows
    .filter((row) => row.status === "Paid")
    .reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0);
  return cents / 100;
}

function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<Order>;
  return (
    typeof row.id === "string" &&
    row.id.length <= 50 &&
    STATUSES.includes(row.status as Status) &&
    typeof row.amount === "string" &&
    row.amount.length <= 30
  );
}

function validSavedRows(value: unknown): value is Order[] {
  return Array.isArray(value) && value.length <= 100 && value.every(isOrder);
}

function validSavedEvidence(value: unknown): value is Evidence {
  if (!value || typeof value !== "object") return false;
  const evidence = value as Evidence;
  return Number.isFinite(evidence.reported) && Number.isFinite(evidence.expected)
    && validSavedRows(evidence.rows) && validateRows(evidence.rows) === null;
}

export function restoreProgress(raw: string | null): Progress {
  const initial = initialProgress();
  if (!raw) return initial;
  try {
    const state = JSON.parse(raw) as Progress | null;
    if (!state || state.version !== 1) return initial;
    const rowsValid = validSavedRows(state.rows);
    const formulaValid = typeof state.formula === "string" && state.formula.length <= 1000;
    const evidence = validSavedEvidence(state.evidence) ? state.evidence : null;
    const completedAt = typeof state.completedAt === "string" && Number.isFinite(Date.parse(state.completedAt))
      ? state.completedAt : null;
    // Completion and repair depend on the current report and its recorded evidence.
    // An unrelated broken counter must not discard those valid parts of the attempt.
    const canResume = rowsValid && formulaValid && evidence !== null;
    const stage: Stage = canResume && state.stage === "complete" && completedAt
      ? "complete"
      : canResume && (state.stage === "repair" || state.stage === "complete") ? "repair" : "investigate";
    return {
      version: 1,
      rows: rowsValid ? state.rows : initial.rows,
      formula: formulaValid ? state.formula : initial.formula,
      stage,
      evidence,
      hints: Number.isInteger(state.hints) && state.hints >= 0 && state.hints <= 3 ? state.hints : 0,
      attempts: Number.isSafeInteger(state.attempts) && state.attempts >= 0 ? state.attempts : 0,
      completedAt: stage === "complete" ? completedAt : null,
    };
  } catch {
    return initial;
  }
}

export type Scenario = { name: string; description: string; rows: Order[] };
function orders(values: [Status, number][]): Order[] {
  return values.map(([status, amount], index) => ({
    id: `TEST-${index + 1}`,
    status,
    amount: String(amount),
  }));
}

export function verificationScenarios(current: Order[]): Scenario[] {
  const cases: Scenario[] = [
    {
      name: "Your report",
      description: "Your current orders match the business rule.",
      rows: current,
    },
    {
      name: "Every order paid",
      description: "Include every paid order, including cents.",
      rows: orders([
        ["Paid", 49.99],
        ["Paid", 250],
        ["Paid", 10.01],
      ]),
    },
    {
      name: "Mixed statuses",
      description: "Exclude both cancelled and pending orders.",
      rows: orders([
        ["Paid", 475],
        ["Cancelled", 900],
        ["Pending", 120],
        ["Paid", 25],
      ]),
    },
    {
      name: "All cancelled",
      description: "Return zero when every order is cancelled.",
      rows: orders([
        ["Cancelled", 75],
        ["Cancelled", 800],
      ]),
    },
    {
      name: "Different row order",
      description: "The paid status can appear anywhere.",
      rows: orders([
        ["Cancelled", 400],
        ["Paid", 65.25],
        ["Pending", 18],
        ["Paid", 34.75],
      ]),
    },
    {
      name: "New orders at the bottom",
      description: "Include a paid order on the final supported row.",
      rows: orders([
        ...Array.from({ length: 99 }, (): [Status, number] => ["Pending", 1]),
        ["Paid", 137.42],
      ]),
    },
    {
      name: "Zero and empty",
      description: "Handle an empty report without an error.",
      rows: [],
    },
  ];
  // Deterministic variations make failures reproducible while covering amounts and positions.
  for (let index = 0; index < 12; index++) {
    const values: [Status, number][] = Array.from(
      { length: 5 + index },
      (_, position) => [
        STATUSES[(index + position * 2) % 3],
        ((index * 173 + position * 239 + 137) % 50000) / 100,
      ],
    );
    cases.push({
      name: `Variation ${index + 1}`,
      description: "Different amounts, statuses and positions.",
      rows: orders(values),
    });
  }
  return cases;
}
