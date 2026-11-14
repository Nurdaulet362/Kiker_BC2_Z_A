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
        new Error(
          "That calculation took too long. Try a simpler formula and run it again.",
        ),
      );
    }, 4000);
    worker.onmessage = (event) => {
      cleanup();
      resolve(event.data.result);
    };
    worker.onerror = () => {
      cleanup();
      reject(
        new Error(
          "The calculation could not start. Reload the page and try again. Your work is saved.",
        ),
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
