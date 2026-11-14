declare module "fast-formula-parser" {
  export default class FormulaParser {
    constructor(options: Record<string, unknown>);
    parse(
      expression: string,
      position: { row: number; col: number; sheet: string },
    ): unknown;
  }
}
