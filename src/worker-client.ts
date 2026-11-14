import { createWorkerPool } from "./worker-pool";
import type { Order } from "./model";
import type { Calculation, Check } from "./formula";
const pool = createWorkerPool(() => new Worker(new URL("./formula.worker.ts", import.meta.url), { type: "module" }), 4000);

export function runCalculation(
  type: "calculate",
  formula: string,
  rows: Order[],
  signal?: AbortSignal,
): Promise<Calculation>;
export function runCalculation(
  type: "verify",
  formula: string,
  rows: Order[],
  signal?: AbortSignal,
): Promise<Check[]>;
export function runCalculation(
  type: "calculate" | "verify",
  formula: string,
  rows: Order[],
  signal?: AbortSignal,
): Promise<Calculation | Check[]> {
  return pool.request({ type, formula, rows }, signal);
}
