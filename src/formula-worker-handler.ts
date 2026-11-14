import { calculate, verify } from "./formula";
import type { Order } from "./model";

export type FormulaRequest = {
  id: number;
  type: "calculate" | "verify";
  formula: string;
  rows: Order[];
};

// Independent of the worker global so failures can be tested directly.
export function handleFormulaRequest(request: FormulaRequest) {
  try {
    const { id, type, formula, rows } = request;
    return { id, result: type === "verify" ? verify(formula, rows) : calculate(formula, rows) };
  } catch (error) {
    return {
      id: request.id,
      error: error instanceof Error ? error.message : "Could not check this report. Please try again.",
    };
  }
}
