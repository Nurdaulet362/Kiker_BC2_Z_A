import { FormulaWorkerError } from "./formula-errors";
import type { Order } from "./model";
import type { Calculation, Check } from "./formula";
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
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./formula.worker.ts", import.meta.url), {
      type: "module",
    });
    const cleanup = () => {
      clearTimeout(timeout);
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new FormulaWorkerError("timeout"),
      );
    }, 4000);
    worker.onmessage = (event) => {
      cleanup();
      event.data.error
        ? reject(Object.assign(new Error(event.data.error), { code: event.data.code, params: event.data.params }))
        : resolve(event.data.result);
    };
    worker.onerror = () => {
      cleanup();
      reject(
        new FormulaWorkerError("start"),
      );
    };
    signal?.addEventListener("abort", abort);
    if (signal?.aborted) {
      abort();
      return;
    }
    worker.postMessage({ id: 1, type, formula, rows });
  });
}
