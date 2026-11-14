import { describe, expect, it } from "vitest";
import { calculateGrid } from "../src/formula";
import { localizeFormulaError } from "../src/formula-errors";
import { evaluateLesson, previewLessonValue } from "../src/learning/engine";
import { getLesson, initialDraft, isLessonComplete, type LessonInput } from "../src/learning/model";

const orders: (string | number)[][] = [
  ["Status", "Region", "Amount"],
  ["Paid", "East", 500],
  ["Paid", "West", 350],
  ["Cancelled", "East", 700],
  ["Paid", "East", 200],
  ["paid", "East", 800],
  ["Pending", "East", 100],
  ["Paid", "East", 0],
];

function solvedInput(id: string): LessonInput {
  const lesson = getLesson(id);
  return {
    ...initialDraft(id), lessonId: id, formula: lesson.solution,
    diagnosis: lesson.correctDiagnosis, decision: lesson.correctDecision ?? "",
    transfer: lesson.transfer.correct,
  };
}

describe("multiple-criteria formula functions", () => {
  it.each([
    ['=SUMIFS(C2:C8,A2:A8,"Paid",B2:B8,"East")', 700],
    ['=COUNTIFS(A2:A8,"Paid",B2:B8,"East")', 3],
    ['=SUMIFS(C2:C8,A2:A8,"Paid",C2:C8,">300")', 850],
    ['=COUNTIFS(A2:A8,"Paid",C2:C8,">300")', 2],
    ['=SUMIFS(C2:C8,A2:A8,"Paid",B2:B8,"East",C2:C8,">300")', 500],
    ['=COUNTIFS(A2:A8,"Paid",B2:B8,"East",C2:C8,">300")', 1],
    ['=SUMIFS(C2:C8,A2:A8,A2,B2:B8,B2)', 700],
    ['=COUNTIFS(A2:A8,A2,B2:B8,B2)', 3],
    ['=COUNTIFS(A2:A8,"Paid",C2:C8,">"&300)', 2],
    ['=SUMIFS(C2,A2,"Paid",B2,"East")', 500],
    ['=COUNTIFS(A2,"Paid",B2,"East")', 1],
    ['=SUMIFS(C2:C2,A2:A2,"Paid")', 500],
  ] as const)("evaluates %s as %s", (formula, expected) => {
    expect(calculateGrid(formula, orders)).toEqual({ value: expected });
  });

  it("matches aligned cells across two-dimensional ranges", () => {
    const data = [[1, 2], [3, 4], [5, 6], [7, 8]];
    expect(calculateGrid('=SUMIFS(A1:B2,A3:B4,">6")', data)).toEqual({ value: 7 });
    expect(calculateGrid('=COUNTIFS(A1:B2,">1",A3:B4,">6")', data)).toEqual({ value: 2 });
  });

  it("ignores text amounts exactly as SUMIF does", () => {
    const data = [["Paid", "100"], ["Paid", 25], ["Paid", "note"], ["Cancelled", 400]];
    expect(calculateGrid('=SUMIFS(B1:B4,A1:A4,"Paid")', data)).toEqual({ value: 25 });
    expect(calculateGrid('=SUMIFS(B1:B4,A1:A4,"Paid")', data)).toEqual(
      calculateGrid('=SUMIF(A1:A4,"Paid",B1:B4)', data),
    );
  });

  const caseData: (string | number)[][] = [
    ["Paid", 500], ["paid", 350], ["Pending", 200], ["PAID", 700],
    ["Paid", 100], ["Pa*d", 30], ["Pa?d", 40],
  ];
  it.each([
    ["Paid", 600, 2], ["paid", 350, 1], ["PAID", 700, 1],
    ["P*", 1570, 6], ["p*", 350, 1], ["Pa?d", 670, 4],
    ["Pa~*d", 0, 0], ["Pa~?d", 0, 0], ["<>Paid", 1320, 5],
  ] as const)("preserves existing case and wildcard matching for %s", (criterion, sum, count) => {
    const literal = JSON.stringify(criterion);
    const originalSum = calculateGrid(`=SUMIF(A1:A7,${literal},B1:B7)`, caseData);
    const originalCount = calculateGrid(`=COUNTIF(A1:A7,${literal})`, caseData);
    // Pin observed library behavior as well as parity, including its current
    // wildcard escaping limitation. This is not an Excel compatibility claim.
    expect(originalSum).toEqual({ value: sum });
    expect(originalCount).toEqual({ value: count });
    expect(calculateGrid(`=SUMIFS(B1:B7,A1:A7,${literal})`, caseData)).toEqual(originalSum);
    expect(calculateGrid(`=COUNTIFS(A1:A7,${literal})`, caseData)).toEqual(originalCount);
  });

  it.each(['0', '""', '"Paid"', '">300"'])("preserves matching over a bounded blank range for criterion %s", criterion => {
    const data: (string | number)[][] = [["Status", "Region", "Amount"]];
    const sum = calculateGrid(`=SUMIF(A2:A101,${criterion},C2:C101)`, data);
    const count = calculateGrid(`=COUNTIF(A2:A101,${criterion})`, data);
    expect(sum.error).toBeUndefined();
    expect(count.error).toBeUndefined();
    expect(calculateGrid(`=SUMIFS(C2:C101,A2:A101,${criterion})`, data)).toEqual(sum);
    expect(calculateGrid(`=COUNTIFS(A2:A101,${criterion})`, data)).toEqual(count);
  });

  it("returns zero for a completely empty Paid report", () => {
    expect(calculateGrid('=SUMIFS(C2:C101,B2:B101,"Paid")', [])).toEqual({ value: 0 });
    expect(calculateGrid('=COUNTIFS(B2:B101,"Paid")', [])).toEqual({ value: 0 });
  });

  it.each([
    ['=SUMIFS()', "SUMIFS"],
    ['=SUMIFS(C2:C8)', "SUMIFS"],
    ['=SUMIFS(C2:C8,A2:A8)', "SUMIFS"],
    ['=SUMIFS(C2:C8,A2:A8,"Paid",B2:B8)', "SUMIFS"],
    ['=SUMIFS(,A2:A8,"Paid")', "SUMIFS"],
    ['=SUMIFS(C2:C8,,"Paid")', "SUMIFS"],
    ['=SUMIFS(C2:C8,A2:A8,)', "SUMIFS"],
    ['=SUMIFS(123,A2:A8,"Paid")', "SUMIFS"],
    ['=COUNTIFS()', "COUNTIFS"],
    ['=COUNTIFS(A2:A8)', "COUNTIFS"],
    ['=COUNTIFS(A2:A8,"Paid",B2:B8)', "COUNTIFS"],
    ['=COUNTIFS(,"Paid")', "COUNTIFS"],
    ['=COUNTIFS(A2:A8,)', "COUNTIFS"],
    ['=COUNTIFS(1,"Paid")', "COUNTIFS"],
  ] as const)("returns a structured argument error for %s", (formula, fn) => {
    const result = calculateGrid(formula, orders);
    expect(result).toMatchObject({ code: "arguments", params: { fn } });
    expect(result.value).toBeUndefined();
    expect(result.error).toContain(fn);
    expect(localizeFormulaError(result as { error: string; code: "arguments"; params: { fn: string } }, "ru")).toMatch(/[а-яё]/i);
  });

  it.each([
    ['=SUMIFS(,C2:C3,B2:B3,"Paid")', "SUMIFS"],
    ['=COUNTIFS(,B2:B3,"Paid")', "COUNTIFS"],
  ] as const)("rejects a leading omitted argument before otherwise valid arguments: %s", (formula, fn) => {
    const data = [["ID", "Status", "Amount"], ["A", "Paid", 500], ["B", "Paid", 250]];
    // The installed parser drops a leading comma, making these malformed
    // expressions look like valid calls unless the omission is rejected first.
    expect(calculateGrid(formula, data)).toMatchObject({ code: "arguments", params: { fn } });
  });

  it.each([
    ['=SUMIFS(C2:C8,A2:A7,"Paid")', "SUMIFS"],
    ['=SUMIFS(C2:C8,A2:A8,"Paid",B2:B7,"East")', "SUMIFS"],
    ['=COUNTIFS(A2:A8,"Paid",B2:B7,"East")', "COUNTIFS"],
    ['=SUMIFS(A1:B2,A1:A4,">0")', "SUMIFS"],
    ['=COUNTIFS(A1:B2,">0",A1:A4,">0")', "COUNTIFS"],
    ['=SUMIFS(A1:B1,A1:A2,">0")', "SUMIFS"],
    ['=COUNTIFS(A1:B1,">0",A1:A2,">0")', "COUNTIFS"],
    ['=SUMIFS(C2:C8,A2:A7,"Paid")+1', "SUMIFS"],
    ['=SUM(SUMIFS(C2:C8,A2:A7,"Paid"),1)', "SUMIFS"],
    ['=COUNTIFS(A2:A8,"Paid",B2:B7,"East")+1', "COUNTIFS"],
    ['=SUM(COUNTIFS(A2:A8,"Paid",B2:B7,"East"),1)', "COUNTIFS"],
  ] as const)("rejects unequal range shapes, not just unequal cell counts: %s", (formula, fn) => {
    const result = calculateGrid(formula, orders);
    expect(result).toMatchObject({ code: "shape", params: { fn } });
    expect(result.value).toBeUndefined();
    expect(result.error).toContain(fn);
    expect(localizeFormulaError(result as { error: string; code: "shape"; params: { fn: string } }, "ru")).toMatch(/[а-яё]/i);
  });

  it("lets IFERROR recover from invalid ranges and keeps later calculations usable", () => {
    expect(calculateGrid('=IFERROR(SUMIFS(C2:C8,A2:A7,"Paid"),42)', orders)).toEqual({ value: 42 });
    expect(calculateGrid('=IFERROR(COUNTIFS(A2:A8,"Paid",B2:B7,"East"),43)', orders)).toEqual({ value: 43 });
    expect(calculateGrid('=IFERROR(SUMIFS(C2:C8,A2:A8),44)', orders)).toEqual({ value: 44 });
    expect(calculateGrid('=IFERROR(COUNTIFS(A2:A8),45)', orders)).toEqual({ value: 45 });
    expect(calculateGrid('=SUMIFS(C2:C8,A2:A8,"Paid")+1', orders)).toEqual({ value: 1051 });
  });

  it("passes all seven first-lesson checks with SUMIFS, including row 101 and an empty report", () => {
    const input = { ...solvedInput("revenue-cancelled"), formula: '=SUMIFS(C2:C101,B2:B101,"Paid")' };
    const result = evaluateLesson(input);
    expect(result.checks).toHaveLength(7);
    expect(result.checks.every(check => check.passed)).toBe(true);
    expect(result.checks.map(check => check.actual)).toEqual(result.checks.map(check => check.expected));
    expect(result.score).toBe(100);
    expect(result.breakdown).toEqual({ diagnosis: 20, repair: 50, transfer: 30 });
    expect(isLessonComplete(result)).toBe(true);
  });

  it.each([
    ["revenue-cancelled", 1200, 7],
    ["conversion-weighted", 15 / 110, 8],
    ["decisions-return", "email", 1],
    ["revenue-refunds", 750, 8],
    ["conversion-growth", 40 / 240, 8],
    ["decisions-hold", "hold", 1],
  ] as const)("keeps the pinned reference outcome and check count for %s", (id, expected, checkCount) => {
    const input = solvedInput(id);
    expect(previewLessonValue(id, input.rows, input.formula)).toEqual({ value: expected });
    const result = evaluateLesson(input);
    expect(result.checks).toHaveLength(checkCount);
    expect(result.checks.every(check => check.passed)).toBe(true);
    expect(result.score).toBe(100);
    expect(result.breakdown).toEqual({ diagnosis: 20, repair: 50, transfer: 30 });
    expect(isLessonComplete(result)).toBe(true);
  });
});
