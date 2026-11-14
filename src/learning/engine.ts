import type { FormulaIssue } from "../formula-errors";
import { calculateGrid } from "../formula";
import { chooseChannel } from "../decision";
import {
  formatLessonValue,
  getLesson,
  normalizeRows,
  validateLessonRows,
  type Copy,
  type Lesson,
  type LessonInput,
  type LessonResult,
  type Row,
} from "./model";

export type LessonPreview = { value?: number | string; error?: string; code?: FormulaIssue["code"]; params?: FormulaIssue["params"] };
const label = (en: string, ru: string): Copy => ({ en, ru });
const clone = (rows: Row[]): Row[] => rows.map((row) => [...row]);
const cents = (value: number) => Math.round(value * 100) / 100;

export function expectedLessonValue(lesson: Lesson, rows: Row[]): number | string {
  if (lesson.skill === "revenue") {
    return cents(rows.reduce((sum, row) => sum + (row[1] === "Paid" ? Number(row[2]) - (lesson.id === "revenue-refunds" ? Number(row[3]) : 0) : 0), 0));
  }
  if (lesson.skill === "conversion") {
    const leads = rows.reduce((sum, row) => sum + Number(row[1]), 0);
    return leads ? rows.reduce((sum, row) => sum + Number(row[2]), 0) / leads : "N/A";
  }
  return expectedDecision(rows);
}

export function expectedDecision(rows: Row[]): "email" | "ads" | "hold" {
  const winner = chooseChannel(rows.map(row => ({
    name: row[0] as "Email" | "Ads",
    revenue: Number(row[1]),
    spend: Number(row[2]),
  })));
  return winner === "Email" ? "email" : winner === "Ads" ? "ads" : "hold";
}

export function previewLessonValue(lessonId: string, rows: Row[], formula: string): LessonPreview {
  const lesson = getLesson(lessonId);
  const error = validateLessonRows(lesson, rows);
  if (error) return { error };
  if (lesson.kind === "decision") return { value: expectedDecision(rows) };
  return calculateGrid(formula, [lesson.columns.map((column) => column.en), ...normalizeRows(lesson, rows)], lesson.columns.length);
}

type Scenario = { label: Copy; rows: Row[] };
export function lessonScenarios(lesson: Lesson, currentRows: Row[]): Scenario[] {
  const scenarios: Scenario[] = [{ label: label("Your current report", "Твой текущий отчёт"), rows: clone(currentRows) }];
  if (lesson.skill === "revenue") {
    const refunds = lesson.id === "revenue-refunds";
    const row = (id: string, status: string, amount: number, refund = 0): Row => refunds ? [id, status, amount, refund] : [id, status, amount];
    scenarios.push(
      { label: label("A different mix of order statuses", "Другой набор статусов заказов"), rows: [row("T-1", "Paid", 127.35, 27.35), row("T-2", "Cancelled", 999, 80), row("T-3", "Pending", 400, 20), row("T-4", "Paid", 72.65, 10)] },
      { label: label("An order added below the original rows", "Заказ ниже исходных строк"), rows: [...clone(lesson.rows), ...Array.from({ length: 5 }, (_, i) => row(`P-${i}`, "Pending", 20)), row("NEW", "Paid", 83.15, 10.15)] },
      { label: label("No orders were paid", "Ни одного оплаченного заказа"), rows: [row("T-1", "Cancelled", 900, 30), row("T-2", "Pending", 120, 0)] },
      { label: label("Paid orders with zero amounts", "Оплаченные заказы с нулевыми суммами"), rows: [row("T-1", "Paid", 0), row("T-2", "Paid", 46.25, 6.25), row("T-3", "Cancelled", 1900, 50)] },
      { label: label("The last supported row (101)", "Последняя допустимая строка (101)"), rows: [...Array.from({ length: 99 }, (_, i) => row(`L-${i}`, "Pending", 0)), row("LAST", "Paid", 91.05, 11.05)] },
      { label: label("An empty report", "Пустой отчёт"), rows: [] },
    );
    if (refunds) scenarios.push({ label: label("A full refund and an excluded refund", "Полный возврат и возврат исключённого заказа"), rows: [row("T-1", "Paid", 90, 90), row("T-2", "Paid", 150, 30), row("T-3", "Cancelled", 500, 400)] });
  } else if (lesson.skill === "conversion") {
    scenarios.push(
      { label: label("Different channel sizes", "Каналы другого размера"), rows: [["Email", 20, 10, 0.5], ["Ads", 180, 18, 0.1]] },
      { label: label("A new channel below the original rows", "Новый канал ниже исходных строк"), rows: [["Email", 80, 8, 0.1], ["Ads", 120, 12, 0.1], ["Referral", 40, 20, 0.5], ["Partners", 60, 18, 0.3]] },
      { label: label("Leads, but no sales", "Лиды есть, продаж нет"), rows: [["Email", 20, 0, 0], ["Ads", 80, 0, 0]] },
      { label: label("No leads in any channel", "Ни в одном канале нет лидов"), rows: [["Email", 0, 0, "N/A"], ["Ads", 0, 0, "N/A"]] },
      { label: label("One empty channel", "Один пустой канал"), rows: [["Email", 0, 0, "N/A"], ["Ads", 40, 12, 0.3]] },
      { label: label("The last supported row (101)", "Последняя допустимая строка (101)"), rows: [...Array.from({ length: 99 }, (_, i): Row => [`L-${i}`, 0, 0, "N/A"]), ["Last", 50, 10, 0.2]] },
      { label: label("An empty report", "Пустой отчёт"), rows: [] },
    );
  }
  return scenarios;
}

export function evaluateLesson(input: LessonInput): LessonResult {
  const lesson = getLesson(input.lessonId);
  const invalid = validateLessonRows(lesson, input.rows);
  if (invalid) throw new Error(invalid);
  if (typeof input.formula !== "string" || input.formula.length > 1000) throw new Error("Keep your formula under 1,000 characters.");
  const hintLevel = input.hintLevel ?? 0;
  if (![0, 1, 2, 3].includes(hintLevel)) throw new Error("Invalid hint level.");
  const solutionRevealed = hintLevel === 3;
  const checks = lesson.kind === "formula"
    ? lessonScenarios(lesson, input.rows).map((scenario) => {
        const actual = previewLessonValue(lesson.id, scenario.rows, input.formula);
        const expected = expectedLessonValue(lesson, scenario.rows);
        return {
          label: scenario.label,
          passed: !actual.error && (typeof expected === "number" && typeof actual.value === "number" ? Math.abs(actual.value - expected) < (lesson.format === "money" ? 0.005 : 1e-8) : actual.value === expected),
          expected: formatLessonValue(expected, lesson.format),
          actual: actual.error ?? formatLessonValue(actual.value, lesson.format),
          ...(actual.code ? { code: actual.code, params: actual.params } : {}),
        };
      })
    : [{ label: label("Decision supported by this report", "Решение подтверждается этим отчётом"), passed: input.decision === expectedDecision(input.rows), expected: expectedDecision(input.rows), actual: input.decision || "—" }];
  const diagnosisPassed = input.diagnosis === lesson.correctDiagnosis;
  const repairPassed = checks.every((check) => check.passed);
  const transferPassed = input.transfer === lesson.transfer.correct;
  const repairPoints = Math.min(
    Math.round(50 * checks.filter((check) => check.passed).length / checks.length),
    solutionRevealed ? 25 : 50,
  );
  const breakdown = {
    diagnosis: diagnosisPassed ? 20 : 0,
    repair: repairPoints,
    transfer: transferPassed ? 30 : 0,
  };
  const score = breakdown.diagnosis + breakdown.repair + breakdown.transfer;
  return {
    hintLevel,
    solutionRevealed,
    lessonId: lesson.id,
    score,
    breakdown,
    diagnosisPassed,
    repairPassed,
    transferPassed,
    checks,
    at: new Date().toISOString(),
    snapshot: { ...input, hintLevel, rows: clone(input.rows) },
  };
}
