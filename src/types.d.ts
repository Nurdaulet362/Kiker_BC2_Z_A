declare module "fast-formula-parser" {
  export type FormulaArgument = {
    value: unknown;
    isArray: boolean;
    isRangeRef?: boolean;
    isCellRef?: boolean;
    omitted?: boolean;
  };
  class FormulaError extends Error {
    constructor(error: string, message?: string, details?: unknown);
    readonly details?: unknown;
  }
  export default class FormulaParser {
    static FormulaError: typeof FormulaError;
    static Types: { NUMBER: number };
    static FormulaHelpers: {
      flattenParams(
        params: FormulaArgument[],
        valueType: number | null,
        allowUnion: boolean,
        hook: (value: unknown) => void,
      ): void;
    };
    constructor(options: Record<string, unknown>);
    parse(
      expression: string,
      position: { row: number; col: number; sheet: string },
    ): unknown;
  }
}
