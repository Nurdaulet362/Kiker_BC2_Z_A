import { createWorkerPool } from "../worker-pool";
import type { LessonPreview } from "./engine";
import type { LessonInput, LessonResult, Row } from "./model";

const pool = createWorkerPool(() => new Worker(new URL("./learning.worker.ts", import.meta.url), { type: "module" }), 6000);

export function previewLesson(lessonId: string, rows: Row[], formula: string, signal?: AbortSignal): Promise<LessonPreview> {
  return pool.request({ type: "preview", lessonId, rows, formula }, signal);
}

export function gradeLesson(input: LessonInput, signal?: AbortSignal): Promise<LessonResult> {
  return pool.request({ type: "grade", input }, signal);
}
