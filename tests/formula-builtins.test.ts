import { describe, expect, it } from "vitest";
import FormulaParser from "fast-formula-parser";
import { calculateGrid } from "../src/formula";
import { builtinFunctions } from "../src/formula-builtins";
import { localizeFormulaError } from "../src/formula-errors";
import { evaluateLesson } from "../src/learning/engine";
import { getLesson, initialDraft, isLessonComplete } from "../src/learning/model";

// The UI stores strings/numbers. Exercise the documented parser extension with
// boolean/error cells too, so its reference semantics are explicit.
function parseCells(expression: string, data: unknown[][]): unknown {
  const cell = (row: number, col: number) => data[row - 1]?.[col - 1] ?? null;
  const parser = new FormulaParser({
    functions: builtinFunctions,
    onCell: ({ row, col }: { row: number; col: number }) => cell(row, col),
    onRange: ({ from, to }: { from: { row: number; col: number }; to: { row: number; col: number } }) =>
      Array.from({ length: to.row - from.row + 1 }, (_, row) =>
        Array.from({ length: to.col - from.col + 1 }, (_, col) => cell(from.row + row, from.col + col))),
  });
  return parser.parse(expression, { row: 103, col: 3, sheet: "Orders" });
}

describe("supported formula functions", () => {
  it.each([
    ["SUM", "=SUM(1,2)", 3],
    ["SUMIF", '=SUMIF(A1:A2,">1",B1:B2)', 20],
    ["SUMIFS", '=SUMIFS(B1:B2,A1:A2,">1")', 20],
    ["SUMPRODUCT", "=SUMPRODUCT(A1:A2,B1:B2)", 50],
    ["IF", "=IF(1=1,10,20)", 10],
    ["IFERROR", "=IFERROR(1/0,10)", 10],
    ["COUNT", "=COUNT(A1:B2)", 4],
    ["COUNTA", "=COUNTA(A1:B2)", 4],
    ["COUNTIF", '=COUNTIF(A1:A2,">1")', 1],
    ["COUNTIFS", '=COUNTIFS(A1:A2,">1")', 1],
    ["AVERAGE", "=AVERAGE(A1:A2)", 1.5],
    ["MIN", "=MIN(A1:A2)", 1],
    ["MAX", "=MAX(A1:A2)", 2],
    ["ABS", "=ABS(-2)", 2],
    ["ROUND", "=ROUND(2.123,2)", 2.12],
    ["AND", "=IF(AND(1=1,2=2),1,0)", 1],
    ["OR", "=IF(OR(1=1,2=1),1,0)", 1],
    ["NOT", "=IF(NOT(1=2),1,0)", 1],
    ["N", "=N(12)", 12],
  ] as const)("calculates %s through the application parser", (_name, formula, expected) => {
    expect(calculateGrid(formula, [[1, 10], [2, 20]])).toEqual({ value: expected });
  });
});

describe("MIN, MAX and COUNTA", () => {
  it.each([
    ["=MIN(7,-3,0,7)", -3],
    ["=MAX(-7,-3)", -3],
    ["=MIN(A1:B3)", -4],
    ["=MAX(A1:B3)", 8],
    ["=MIN(A1,A1)", 8],
    ["=MAX(B2,B2)", -4],
    ['=MIN("-9",1=1,2)', -9],
    ['=MAX("9",1=1,2)', 9],
    ["=MIN(1=1,2)", 1],
    ["=MAX(1=1,0)", 1],
    ["=MIN(A4,5)", 5],
    ["=MAX(A4,-5)", -5],
    ["=MIN(0,5)", 0],
    ["=MAX(0,-5)", 0],
    ["=MIN(A4:B101)", 0],
    ["=MAX(A4:B101)", 0],
    ["=MIN(A3:B3)", 0],
    ["=MAX(A3:B3)", 0],
    ["=COUNTA(A1:B3)", 6],
    ["=COUNTA(A4:B101)", 0],
    ["=COUNTA(A4)", 0],
    ["=COUNTA(A1,A1)", 2],
    ['=COUNTA(0,"",1=1,1=2,"text")', 5],
    ['=COUNTA("MIN(,5)","MAX(,-5)","COUNTA(,1)")', 3],
    ['=MIN(IF(1=1,5,"MAX(,0)"),10)', 5],
    ['=MAX(IF(1=1,5,"MIN(,0)"),0)', 5],
  ] as const)("evaluates %s as %s", (formula, expected) => {
    // Numeric text and the empty string are values, but not numeric range entries.
    const mixed = [[8, 0], ["100", -4], ["note", ""]];
    expect(calculateGrid(formula, mixed)).toEqual({ value: expected });
  });

  it.each(["MIN", "MAX", "COUNTA"])("rejects missing arguments in %s without confusing them with blank cells", fn => {
    for (const args of ["", ",5", "5,,7", "5,"]) {
      const issue = calculateGrid(`=${fn}(${args})`, []);
      expect(issue).toMatchObject({ code: "arguments", params: { fn } });
      expect(issue.value).toBeUndefined();
      expect(issue.error).toContain("at least one");
      if (issue.error) expect(localizeFormulaError(issue, "ru")).toContain("хотя бы один");
    }
    for (const args of ["", "5,,7", "5,"]) {
      expect(calculateGrid(`=IFERROR(${fn}(${args}),42)`, [])).toEqual({ value: 42 });
    }
    // The leading-comma guard runs before evaluation, just as for SUMIFS/COUNTIFS.
    expect(calculateGrid(`=IFERROR(${fn}(,5),42)`, [])).toMatchObject({ code: "arguments", params: { fn } });
    expect(calculateGrid(`=${fn}(5,)+1`, [])).toMatchObject({ code: "arguments", params: { fn } });
    expect(calculateGrid(`=SUM(${fn}(5,),1)`, [])).toMatchObject({ code: "arguments", params: { fn } });
  });

  it.each(["MIN", "MAX"])("propagates invalid scalar and calculation errors in %s and lets IFERROR recover", fn => {
    for (const argument of ['"not a number"', '""', "1/0"]) {
      expect(calculateGrid(`=${fn}(${argument},5)`, []).error).toBeDefined();
      expect(calculateGrid(`=IFERROR(${fn}(${argument},5),42)`, [])).toEqual({ value: 42 });
    }
  });

  it("counts a calculated error as a nonempty value", () => {
    expect(calculateGrid("=COUNTA(1/0)", [])).toEqual({ value: 1 });
    expect(calculateGrid("=IFERROR(COUNTA(1/0),42)", [])).toEqual({ value: 1 });
  });

  it("ignores referenced booleans for MIN/MAX and counts them for COUNTA", () => {
    const cells = [[true, false, "7"], [null, "", 0], [8, -2, "label"]];
    expect(parseCells("MIN(A1:C3)", cells)).toBe(-2);
    expect(parseCells("MAX(A1:C3)", cells)).toBe(8);
    expect(parseCells("COUNTA(A1:C3)", cells)).toBe(8);
    expect(parseCells("MIN(A1)", cells)).toBe(0);
    expect(parseCells("MAX(A1)", cells)).toBe(0);
    expect(parseCells("COUNTA(A1)", cells)).toBe(1);
    expect(parseCells("COUNTA(A2)", cells)).toBe(0);
  });

  it.each(["MIN", "MAX"])("propagates errors from scalar references and ranges in %s", fn => {
    const cells = [[4], [new FormulaParser.FormulaError("#DIV/0!")], [-2]];
    for (const argument of ["A2", "A1:A3"]) {
      expect(parseCells(`${fn}(${argument})`, cells)).toBeInstanceOf(FormulaParser.FormulaError);
      expect(parseCells(`IFERROR(${fn}(${argument}),42)`, cells)).toBe(42);
    }
  });

  it("counts errors in references and ranges without swallowing other values", () => {
    const cells = [[0], [new FormulaParser.FormulaError("#DIV/0!")], [null], [""]];
    expect(parseCells("COUNTA(A2)", cells)).toBe(1);
    expect(parseCells("COUNTA(A1:A4)", cells)).toBe(3);
    expect(parseCells("IFERROR(COUNTA(A1:A4),42)", cells)).toBe(3);
  });

  it("accepts a MAX-wrapped first-lesson solution for all seven checks and 100 points", () => {
    const lesson = getLesson("revenue-cancelled");
    const result = evaluateLesson({
      ...initialDraft(lesson.id), lessonId: lesson.id,
      formula: '=MAX(0,SUMIF(B2:B101,"Paid",C2:C101))',
      diagnosis: lesson.correctDiagnosis, transfer: lesson.transfer.correct,
    });
    expect(result.checks).toHaveLength(7);
    expect(result.checks.every(check => check.passed)).toBe(true);
    expect(result.score).toBe(100);
    expect(result.breakdown).toEqual({ diagnosis: 20, repair: 50, transfer: 30 });
    expect(isLessonComplete(result)).toBe(true);
  });
});
