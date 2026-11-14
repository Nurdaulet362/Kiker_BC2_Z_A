import type { Preview } from "./evaluate";
import type { Answers, Scenario, Submission } from "./model";
export function runTrial(
  type: "preview",
  scenario: Scenario,
  answers: Answers,
  seconds?: number,
  signal?: AbortSignal,
): Promise<Preview>;
export function runTrial(
  type: "assess",
  scenario: Scenario,
  answers: Answers,
  seconds?: number,
  signal?: AbortSignal,
): Promise<Submission>;
export function runTrial(
  type: "preview" | "assess",
  scenario: Scenario,
  answers: Answers,
  seconds = 0,
  signal?: AbortSignal,
): Promise<Preview | Submission> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./trial.worker.ts", import.meta.url), {
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
        new Error("That formula took too long. Simplify it and try again."),
      );
    }, 6000);
    worker.onmessage = (event) => {
      cleanup();
      event.data.error
        ? reject(new Error(event.data.error))
        : resolve(event.data.result);
    };
    worker.onerror = () => {
      cleanup();
      reject(
        new Error(
          "Could not start the report checker. Reload and try again; your work stays saved in this browser.",
        ),
      );
    };
    signal?.addEventListener("abort", abort);
    if (signal?.aborted) {
      abort();
      return;
    }
    worker.postMessage({ type, scenario, answers, seconds });
  });
}
