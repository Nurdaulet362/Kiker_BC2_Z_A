import { restoreLearning } from "./model";

/** Whether a source string would lose recoverable records when replaced. */
export function needsLearningBackup(source: string, merged: string): boolean {
  const audit = { discarded: false };
  const restored = restoreLearning(source, audit);
  if (audit.discarded) return true;
  const next = restoreLearning(merged);
  if (restored.results.length > next.results.length) return true;
  const ids = new Set(next.results.map(result => result.id));
  if (restored.results.some(result => !ids.has(result.id))) return true;
  // A confirmed completion intentionally removes its draft. Preserve recovery
  // copies for actual loss, including an unconfirmed draft being superseded.
  return Object.entries(restored.drafts).some(([lessonId, draft]) => {
    if ((next.closedAttempts[lessonId] ?? 0) >= draft.attempt) return false;
    const replacement = next.drafts[lessonId];
    return !replacement || replacement.attempt !== draft.attempt;
  });
}
