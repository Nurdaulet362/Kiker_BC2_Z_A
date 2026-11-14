import { FormulaWorkerError } from "../formula-errors";
import type { LessonPreview } from "./engine";
import type { LessonInput, LessonResult, Row } from "./model";

function request<T>(payload: unknown, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Cancelled", "AbortError")); return; }
    const worker = new Worker(new URL("./learning.worker.ts", import.meta.url), { type: "module" });
    const cleanup = () => { clearTimeout(timeout); worker.terminate(); signal?.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); reject(new DOMException("Cancelled", "AbortError")); };
    const timeout = setTimeout(() => { cleanup(); reject(new FormulaWorkerError("timeout")); }, 6000);
    worker.onmessage = (event) => { cleanup(); event.data.error ? reject(Object.assign(new Error(event.data.error), { code: event.data.code, params: event.data.params })) : resolve(event.data.result); };
    worker.onerror = () => { cleanup(); reject(new FormulaWorkerError("start")); };
    signal?.addEventListener("abort", abort, { once: true });
    worker.postMessage(payload);
  });
}

export function previewLesson(lessonId: string, rows: Row[], formula: string, signal?: AbortSignal): Promise<LessonPreview> {
  return request({ type: "preview", lessonId, rows, formula }, signal);
}

export function gradeLesson(input: LessonInput, signal?: AbortSignal): Promise<LessonResult> {
  return request({ type: "grade", input }, signal);
}
