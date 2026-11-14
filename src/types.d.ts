declare module "fast-formula-parser" {
  class FormulaError extends Error {
    constructor(error: string, message?: string, details?: unknown);
    readonly details?: unknown;
  }
  export default class FormulaParser {
    static FormulaError: typeof FormulaError;
    constructor(options: Record<string, unknown>);
    parse(
      expression: string,
      position: { row: number; col: number; sheet: string },
    ): unknown;
  }
}
