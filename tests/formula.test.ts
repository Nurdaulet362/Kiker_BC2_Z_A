import { describe, expect, it } from "vitest";
import { calculate, calculateGrid, verify } from "../src/formula";
import {
  CORRECT_EXAMPLE,
  ORIGINAL_FORMULA,
  initialProgress,
  restoreProgress,
  expectedRevenue,
} from "../src/model";

describe("cancelled order exercise", () => {
  it.each([
    ["SUM(C2:C101)", "prefix"],
    [`=${"1".repeat(1000)}`, "length"],
    ["=SUM(", "syntax"],
    ["=SUM(E5)", "range"],
    ['=WEBSERVICE("https://example.com")', "function"],
    ['="text"', "result"],
    ['=SUMIF(B:B,"Paid",C:C)', "range"],
    ["=SUM(C:C)", "range"],
  ])("preserves the error code for %s", (formula, code) => {
    expect(calculateGrid(formula, [["Order", "Status", "Amount"]])).toMatchObject({ code });
  });
  it("reproduces the hidden mistake and detects a learner-created counterexample", () => {
    const { rows } = initialProgress();
    expect(calculate(ORIGINAL_FORMULA, rows).value).toBe(1200);
    rows.push({ id: "ORD-1046", status: "Cancelled", amount: "300" });
    expect(calculate(ORIGINAL_FORMULA, rows).value).toBe(1500);
    expect(expectedRevenue(rows)).toBe(1200);
    expect(calculate(CORRECT_EXAMPLE, rows).value).toBe(1200);
  });
  it("accepts alternative formulas by their behavior", () => {
    for (const formula of [
      CORRECT_EXAMPLE,
      '=SUMIF($B$2:$B$101,"Paid",$C$2:$C$101)+0',
      '=ROUND(SUMIF(B2:B101,"Paid",C2:C101),2)',
    ]) {
      const checks = verify(formula, initialProgress().rows);
      expect(checks).toHaveLength(19);
      expect(checks.filter((check) => !check.passed)).toEqual([]);
    }
  });
  it("rejects a hardcoded total, partial ranges and excluding only cancelled orders", () => {
    for (const formula of [
      "=1200",
      '=SUMIF(B2:B6,"Paid",C2:C6)',
      '=SUMIF(B2:B101,"<>Cancelled",C2:C101)',
    ]) {
      expect(
        verify(formula, initialProgress().rows).some((check) => !check.passed),
      ).toBe(true);
    }
  });
  it("returns errors for invalid amounts, formulas and out-of-bounds references", () => {
    const rows = initialProgress().rows;
    for (const formula of [
      "SUM(C2:C101)",
      "=SUM(",
      "=SUM(C2:C999999)",
      "=D1",
      '=WEBSERVICE("https://example.com")',
      "=1/0",
    ]) {
      expect(calculate(formula, rows).error).toBeTruthy();
    }
    for (const amount of ["", "abc", "-5", "1.999", "1000001"]) {
      expect(
        calculate(CORRECT_EXAMPLE, [{ id: "1", status: "Paid", amount }]).error,
      ).toBeTruthy();
    }
  });
  it("handles empty data, cents and zero amounts", () => {
    expect(calculate(CORRECT_EXAMPLE, []).value).toBe(0);
    expect(
      expectedRevenue([
        { id: "1", status: "Paid", amount: "0.10" },
        { id: "2", status: "Paid", amount: "0.20" },
      ]),
    ).toBe(0.3);
  });
  it("distinguishes scientific notation from bounded cell references", () => {
    const rows = initialProgress().rows;
    for (const [formula, expected] of [
      ["=SUM(C2:C101)*1E5", 120000000],
      ["=SUM(C2:C101)+2.5e3", 3700],
      ["=SUM(C2:C101)*1E-3", 1.2],
      ["=SUM(C2:C101)*1e-5", 0.012],
      ["=SUM(C2:C101)*1E-5", 0.012],
      ['=IF("1E5"="1E+5",0,SUM(C2:C101))', 1200],
      ['=IF("E5"="E+5",0,SUM(C2:C101))', 1200],
      ["=ROUND(SUM(C2:C101),2)", 1200],
      ["=SUM($C$2:$C$101)", 1200],
      ['=SUMIF(B2:B101,"Paid",C2:C101)+SUM(A101)', 1200],
    ] as const) {
      expect(calculate(formula, rows), formula).toEqual({ value: expected });
    }
    for (const formula of [
      "=SUM(E5)", "=SUM($E$5)", "=SUM(C2:C102)", "=SUM(AA1)",
      "=SUM(A102)", "=SUM(B0:B101)",
    ]) {
      expect(calculate(formula, rows).error, formula).toMatch(/100 data rows/);
    }
  });
  it("restores valid progress and recovers from corrupt local storage", () => {
    const original = initialProgress();
    expect(restoreProgress(JSON.stringify(original))).toEqual(original);
    for (const invalid of [
      "{bad",
      "{}",
      "null",
      JSON.stringify({ ...original, stage: "complete" }),
      JSON.stringify({ ...original, hints: -1 }),
    ]) {
      expect(restoreProgress(invalid)).toEqual(original);
    }
  });
  it("recovers valid guided evidence and counters independently of corrupt draft fields", () => {
    const state = initialProgress();
    state.rows.push({ id: "ORD-1046", status: "Cancelled", amount: "300" });
    state.formula = CORRECT_EXAMPLE;
    state.stage = "complete";
    state.evidence = { reported: 1500, expected: 1200, rows: state.rows.map(row => ({ ...row })) };
    state.attempts = 7;
    state.hints = 2;
    state.completedAt = "2026-11-14T10:00:00.000Z";
    expect(restoreProgress(JSON.stringify(state))).toEqual(state);
    expect(restoreProgress(JSON.stringify({ ...state, hints: -1 }))).toEqual({ ...state, hints: 0 });
    expect(restoreProgress(JSON.stringify({ ...state, attempts: null }))).toEqual({ ...state, attempts: 0 });
    expect(restoreProgress(JSON.stringify({ ...state, rows: [null] }))).toEqual({
      ...state, rows: initialProgress().rows, stage: "investigate", completedAt: null,
    });
    expect(restoreProgress(JSON.stringify({ ...state, formula: null }))).toEqual({
      ...state, formula: ORIGINAL_FORMULA, stage: "investigate", completedAt: null,
    });
    expect(restoreProgress(JSON.stringify({ ...state, completedAt: "broken" }))).toEqual({
      ...state, stage: "repair", completedAt: null,
    });
    for (const evidence of [null, {}, { ...state.evidence, rows: [null] }, { ...state.evidence, reported: null }]) {
      expect(restoreProgress(JSON.stringify({ ...state, evidence }))).toEqual({
        ...state, evidence: null, stage: "investigate", completedAt: null,
      });
    }
    expect(restoreProgress(JSON.stringify({ ...state, version: 99 }))).toEqual(initialProgress());
  });
  it("keeps incomplete guided edits instead of mistaking input validation for corrupt storage", () => {
    const state = initialProgress();
    state.rows[0].amount = "unfinished";
    state.attempts = 4;
    state.hints = 1;
    expect(restoreProgress(JSON.stringify(state))).toEqual(state);
  });

});
