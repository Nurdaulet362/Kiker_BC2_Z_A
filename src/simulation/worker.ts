import { createWorkerPool } from "../worker-pool";
import type { Preview } from "./evaluate";
import type { Answers, Scenario, Submission } from "./model";
const pool = createWorkerPool(() => new Worker(new URL("./trial.worker.ts", import.meta.url), { type: "module" }), 6000);

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
  return pool.request({ type, scenario, answers, seconds }, signal);
}
