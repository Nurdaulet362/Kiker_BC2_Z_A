import { describe, expect, it } from "vitest";
import {
  FormulaWorkerError,
  formulaFailure,
  formulaIssue,
  localizeFormulaError,
  type FormulaErrorCode,
  type FormulaIssue,
} from "../src/formula-errors";

const codes: FormulaErrorCode[] = ["syntax", "range", "function", "result", "length", "prefix", "timeout", "start"];

describe("structured formula errors", () => {
  it.each(codes)("provides English and Russian text for %s independently of the English source message", code => {
    const failure = formulaFailure(code);
    expect(failure.code).toBe(code);
    expect(failure.error.length).toBeGreaterThan(0);
    expect(localizeFormulaError(failure, "en")).toBe(failure.error);
    const russian = localizeFormulaError(failure, "ru");
    expect(russian).toMatch(/[а-яё]/i);
    expect(localizeFormulaError({ ...failure, error: "English copy has changed." }, "ru")).toBe(russian);
    expect(localizeFormulaError({ ...failure, error: "English copy has changed." }, "en")).toBe(failure.error);
  });

  it("preserves unknown messages without replacing their cause", () => {
    const issue = { error: "Unexpected checker issue: quota exceeded." };
    expect(localizeFormulaError(issue, "ru")).toBe(issue.error);
    expect(localizeFormulaError(issue, "en")).toBe(issue.error);
    const future = { ...issue, code: "future-code" } as unknown as FormulaIssue;
    expect(localizeFormulaError(future, "ru")).toBe(issue.error);
  });

  it("explains a timeout in Russian as a timeout", () => {
    const error = new FormulaWorkerError("timeout");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("timeout");
    expect(error.message).toBe(formulaFailure("timeout").error);
    const localized = localizeFormulaError(formulaIssue(error), "ru");
    expect(localized).toContain("Время ожидания расчёта истекло");
    expect(localized).not.toContain("неотрицательные числа");
    expect(localizeFormulaError(formulaIssue(new FormulaWorkerError("start")), "ru")).toContain("Не удалось запустить проверку");
  });

  it("includes the bounded range and disallowed function parameters in both languages", () => {
    const range = formulaFailure("range", { end: "D101" });
    expect(range.error).toContain("100 data rows");
    for (const language of ["en", "ru"] as const) {
      expect(localizeFormulaError(range, language)).toContain("D101");
      expect(localizeFormulaError(formulaFailure("function", { fn: "WEBSERVICE" }), language)).toContain("WEBSERVICE");
    }
    expect(localizeFormulaError(range, "ru")).toContain("Используйте диапазоны до строки 101, например C2:C101");
  });

  it("extracts native and serialized errors while validating structured metadata", () => {
    expect(formulaIssue(new Error("Original parser detail"))).toEqual({ error: "Original parser detail" });
    const failure = formulaFailure("function", { fn: "WEBSERVICE", limit: 1000 });
    expect(formulaIssue(failure)).toEqual(failure);
    expect(formulaIssue({ error: "detail", code: "invalid", params: { fn: "SUM", limit: 2, invalid: [], nested: {}, nan: NaN, infinite: Infinity } })).toEqual({
      error: "detail", params: { fn: "SUM", limit: 2 },
    });
    expect(formulaIssue({ error: "detail", code: "toString", params: [] })).toEqual({ error: "detail" });
    for (const input of [null, undefined, 0, {}, { error: 12 }]) {
      expect(formulaIssue(input)).toEqual({ error: formulaFailure("syntax").error });
    }
  });
});
