import FormulaParser from "fast-formula-parser";
import { formulaFailure, type FormulaFailure } from "./formula-errors";

type Argument = {
  value: unknown;
  isArray: boolean;
  isRangeRef?: boolean;
  isCellRef?: boolean;
  omitted?: boolean;
};
type Context = {
  functions: { COUNTIF: (range: Argument, criterion: Argument) => number };
};
type FunctionName = "SUMIFS" | "COUNTIFS";

class MultiCriteriaError extends FormulaParser.FormulaError {
  readonly issue: FormulaFailure;

  constructor(code: "arguments" | "shape", fn: FunctionName) {
    const issue = formulaFailure(code, { fn });
    super("#VALUE!", issue.error);
    this.issue = issue;
  }
}

// Parser operators can wrap a thrown FormulaError in another FormulaError.
// Keep our structured issue, while letting the library's IFERROR handle it.
export function multiCriteriaFailure(value: unknown): FormulaFailure | undefined {
  while (value instanceof FormulaParser.FormulaError) {
    if (value instanceof MultiCriteriaError) return value.issue;
    value = value.details;
  }
}

function evaluate(fn: FunctionName, context: Context, args: Argument[]): number {
  const offset = fn === "SUMIFS" ? 1 : 0;
  if (args.length < offset + 2 || (args.length - offset) % 2 || args.some(arg => arg.omitted)) {
    throw new MultiCriteriaError("arguments", fn);
  }
  const matrix = (arg: Argument): unknown[][] => {
    if (!arg.isRangeRef && !arg.isCellRef) throw new MultiCriteriaError("arguments", fn);
    return arg.isRangeRef ? arg.value as unknown[][] : [[arg.value]];
  };
  const pairs = Array.from({ length: (args.length - offset) / 2 }, (_, i) => ({
    range: matrix(args[offset + i * 2]), criterion: args[offset + i * 2 + 1],
  }));
  const values = offset ? matrix(args[0]) : pairs[0].range;
  const width = values[0]?.length ?? 0;
  if (pairs.some(({ range }) => range.length !== values.length || range.some(row => row.length !== width))) {
    throw new MultiCriteriaError("shape", fn);
  }
  let total = 0;
  values.forEach((row, r) => row.forEach((value, c) => {
    if (offset && typeof value !== "number") return;
    // Reuse COUNTIF's complete matcher (the same Criteria + Infix as SUMIF).
    // Preserve its criterion wrapper, case, wildcards and blank-cell semantics.
    const matches = pairs.every(({ range, criterion }) => context.functions.COUNTIF(
      { value: [[range[r][c]]], isArray: false, isRangeRef: true }, criterion,
    ) === 1);
    if (matches) total += offset ? value as number : 1;
  }));
  return total;
}

export const multiCriteriaFunctions = {
  SUMIFS: (context: Context, ...args: Argument[]) => evaluate("SUMIFS", context, args),
  COUNTIFS: (context: Context, ...args: Argument[]) => evaluate("COUNTIFS", context, args),
};
