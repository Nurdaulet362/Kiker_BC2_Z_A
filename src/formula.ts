import { formulaFailure, type FormulaIssue } from "./formula-errors";
import FormulaParser from "fast-formula-parser";
import {
  expectedRevenue,
  validateRows,
  verificationScenarios,
  type Order,
} from "./model";

export type Calculation =
  { value: number; error?: never; code?: never; params?: never } | (FormulaIssue & { value?: never });
export type GridCalculation =
  { value: number | "N/A"; error?: never; code?: never; params?: never } | (FormulaIssue & { value?: never });
export type Check = {
  name: string;
  description: string;
  expected: number;
  actual: number | null;
  passed: boolean;
  error?: string;
  code?: FormulaIssue["code"];
  params?: FormulaIssue["params"];
};
const FUNCTIONS = new Set([
  "SUM",
  "SUMIF",
  "SUMPRODUCT",
  "IF",
  "IFERROR",
  "COUNT",
  "COUNTA",
  "COUNTIF",
  "AVERAGE",
  "MIN",
  "MAX",
  "ABS",
  "ROUND",
  "AND",
  "OR",
  "NOT",
  "N",
]);

export function calculate(formula: string, rows: Order[]): Calculation {
  const rowError = validateRows(rows);
  if (rowError) return { error: rowError };
  const data: (string | number)[][] = [
    ["Order", "Status", "Amount"],
    ...rows.map((row) => [row.id, row.status, Number(row.amount)]),
  ];
  const result = calculateGrid(formula, data);
  if (result.value === "N/A")
    return formulaFailure("result");
  return result as Calculation;
}

export function calculateGrid(
  formula: string,
  data: (string | number)[][],
  lastColumn = 3,
): GridCalculation {
  const end = `${String.fromCharCode(64 + lastColumn)}101`;
  if (!formula.trim().startsWith("="))
    return formulaFailure("prefix");
  if (formula.length > 1000)
    return formulaFailure("length");
  const expression = formula.trim().slice(1);
  const withoutStrings = expression.replace(/"(?:[^"]|"")*"/g, '""');
  if (/[!\[\]{}]/.test(withoutStrings))
    return formulaFailure("range", { end });
  for (const match of withoutStrings.matchAll(/([A-Z][A-Z0-9_.]*)\s*\(/gi)) {
    if (!FUNCTIONS.has(match[1].toUpperCase()))
      return formulaFailure("function", { fn: match[1].toUpperCase() });
  }
  const withoutNumbers = withoutStrings.replace(
    /(?<![A-Za-z_$.\d])\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    " ",
  );
  for (const match of withoutNumbers.matchAll(/\$?([A-Z]+)\$?(\d+)/gi)) {
    if (
      match[1].length !== 1 ||
      match[1].toUpperCase().charCodeAt(0) - 64 > lastColumn ||
      Number(match[2]) > 101 ||
      Number(match[2]) < 1
    ) {
      return formulaFailure("range", { end });
    }
  }
  const cell = (row: number, col: number) => data[row - 1]?.[col - 1] ?? null;
  let rangeExceeded = false;
  try {
    const parser = new FormulaParser({
      onCell: ({ row, col }: { row: number; col: number }) => cell(row, col),
      onRange: ({
        from,
        to,
      }: {
        from: { row: number; col: number };
        to: { row: number; col: number };
      }) => {
        if (from.row < 1 || to.row > 101 || from.col < 1 || to.col > lastColumn) {
          rangeExceeded = true;
          throw new Error("range");
        }
        return Array.from({ length: to.row - from.row + 1 }, (_, index) =>
          Array.from({ length: to.col - from.col + 1 }, (_, column) =>
            cell(from.row + index, from.col + column),
          ),
        );
      },
    });
    // The installed parser requires an explicit exponent sign (1E+5).
    // Quoted strings and cell references must keep their original spelling.
    const parserExpression = expression.replace(
      /"(?:[^"]|"")*"|(?<![A-Za-z_$.\d])(\d+(?:\.\d+)?)[eE](\d+)/g,
      (token, base: string | undefined, exponent: string) =>
        base === undefined ? token : `${base}E+${exponent}`,
    );
    const value = parser.parse(parserExpression, {
      row: 103,
      col: 3,
      sheet: "Orders",
    });
    if (value === "N/A") return { value };
    if (typeof value !== "number" || !Number.isFinite(value))
      return formulaFailure("result");
    return { value };
  } catch {
    return formulaFailure(rangeExceeded ? "range" : "syntax", rangeExceeded ? { end } : undefined);
  }
}

export function verify(formula: string, rows: Order[]): Check[] {
  return verificationScenarios(rows).map((scenario) => {
    const result = calculate(formula, scenario.rows);
    const expected = expectedRevenue(scenario.rows);
    return {
      name: scenario.name,
      description: scenario.description,
      expected,
      actual: result.value ?? null,
      passed:
        result.value !== undefined && Math.abs(result.value - expected) < 0.005,
      ...(result.error ? { error: result.error, code: result.code, params: result.params } : {}),
    };
  });
}
