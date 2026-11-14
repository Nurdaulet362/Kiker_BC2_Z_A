import type { LessonPreview } from "./engine";
import type { LessonInput, LessonResult, Row } from "./model";

function request<T>(payload: unknown, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Cancelled", "AbortError")); return; }
    const worker = new Worker(new URL("./learning.worker.ts", import.meta.url), { type: "module" });
    const cleanup = () => { clearTimeout(timeout); worker.terminate(); signal?.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); reject(new DOMException("Cancelled", "AbortError")); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error("That formula took too long. Simplify it and try again.")); }, 6000);
    worker.onmessage = (event) => { cleanup(); event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result); };
    worker.onerror = () => { cleanup(); reject(new Error("Could not start the report checker. Reload and try again; your work stays saved in this browser.")); };
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
