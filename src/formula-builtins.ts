import FormulaParser, { type FormulaArgument } from "fast-formula-parser";
import { formulaFailure, type FormulaFailure } from "./formula-errors";

type FunctionName = "MIN" | "MAX" | "COUNTA";
const { FormulaHelpers, Types } = FormulaParser;

class BuiltinArgumentError extends FormulaParser.FormulaError {
  readonly issue: FormulaFailure;

  constructor(fn: FunctionName) {
    const issue = formulaFailure("arguments", { fn });
    super("#VALUE!", issue.error);
    this.issue = issue;
  }
}

// The parser may wrap a function error when evaluating surrounding operators.
export function builtinFailure(value: unknown): FormulaFailure | undefined {
  while (value instanceof FormulaParser.FormulaError) {
    if (value instanceof BuiltinArgumentError) return value.issue;
    value = value.details;
  }
}

function requireArguments(fn: FunctionName, args: FormulaArgument[]): void {
  if (!args.length || args.some(arg => arg.omitted)) throw new BuiltinArgumentError(fn);
}

function extremum(fn: "MIN" | "MAX", args: FormulaArgument[]): number {
  requireArguments(fn, args);
  let result: number | undefined;
  // Reuse SUM/AVERAGE's public helper for scalar coercion and reference flattening.
  // Referenced text/booleans/blanks are ignored; scalar values use library coercion.
  FormulaHelpers.flattenParams(args, Types.NUMBER, true, value => {
    if (value instanceof FormulaParser.FormulaError) throw value;
    if (typeof value === "number") {
      result = result === undefined ? value : fn === "MIN" ? Math.min(result, value) : Math.max(result, value);
    }
  });
  return result ?? 0;
}

export const builtinFunctions = {
  MIN: (...args: FormulaArgument[]) => extremum("MIN", args),
  MAX: (...args: FormulaArgument[]) => extremum("MAX", args),
  COUNTA: (...args: FormulaArgument[]) => {
    requireArguments("COUNTA", args);
    let count = 0;
    // Empty text, booleans and errors are nonempty values; absent cells are null.
    FormulaHelpers.flattenParams(args, null, true, value => {
      if (value !== null && value !== undefined) count += 1;
    });
    return count;
  },
};
