import FormulaParser from "fast-formula-parser";
import {
  expectedRevenue,
  validateRows,
  verificationScenarios,
  type Order,
} from "./model";

export type Calculation =
  { value: number; error?: never } | { error: string; value?: never };
export type GridCalculation =
  { value: number | "N/A"; error?: never } | { error: string; value?: never };
export type Check = {
  name: string;
  description: string;
  expected: number;
  actual: number | null;
  passed: boolean;
  error?: string;
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
    return {
      error: "Revenue must be a number, including zero for an empty report.",
    };
  return result as Calculation;
}

export function calculateGrid(
  formula: string,
  data: (string | number)[][],
  lastColumn = 3,
): GridCalculation {
  const end = `${String.fromCharCode(64 + lastColumn)}101`;
  if (!formula.trim().startsWith("="))
    return { error: "Start your formula with =, for example =SUM(C2:C101)." };
  if (formula.length > 1000)
    return { error: "Keep your formula under 1,000 characters." };
  const expression = formula.trim().slice(1);
  const withoutStrings = expression.replace(/"(?:[^"]|"")*"/g, '""');
  if (/[!\[\]{}]/.test(withoutStrings))
    return { error: `Use cells on this sheet, from A1 to ${end}.` };
  for (const match of withoutStrings.matchAll(/([A-Z][A-Z0-9_.]*)\s*\(/gi)) {
    if (!FUNCTIONS.has(match[1].toUpperCase()))
      return {
        error: `${match[1].toUpperCase()} is outside this exercise. Try SUMIF, SUM or IF.`,
      };
  }
  for (const match of withoutStrings.matchAll(/\$?([A-Z]+)\$?(\d+)/gi)) {
    if (
      match[1].length !== 1 ||
      match[1].toUpperCase().charCodeAt(0) - 64 > lastColumn ||
      Number(match[2]) > 101 ||
      Number(match[2]) < 1
    ) {
      return {
        error: `Use cells from A1 to ${end}. This exercise has room for 100 data rows.`,
      };
    }
  }
  const cell = (row: number, col: number) => data[row - 1]?.[col - 1] ?? null;
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
        if (from.row < 1 || to.row > 101 || from.col < 1 || to.col > lastColumn)
          throw new Error("range");
        return Array.from({ length: to.row - from.row + 1 }, (_, index) =>
          Array.from({ length: to.col - from.col + 1 }, (_, column) =>
            cell(from.row + index, from.col + column),
          ),
        );
      },
    });
    const value = parser.parse(expression, {
      row: 103,
      col: 3,
      sheet: "Orders",
    });
    if (value === "N/A") return { value };
    if (typeof value !== "number" || !Number.isFinite(value))
      return {
        error:
          "Your formula needs to return one number, or the text N/A when the brief requires it.",
      };
    return { value };
  } catch {
    return {
      error:
        "Could not calculate this formula. Check the function, commas, quotes and matching parentheses.",
    };
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
      ...(result.error ? { error: result.error } : {}),
    };
  });
}
