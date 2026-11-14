import { restoreLearning } from "./model";

/** Whether a source string would lose recoverable records when replaced. */
export function needsLearningBackup(source: string, merged: string): boolean {
  const audit = { discarded: false };
  const restored = restoreLearning(source, audit);
  if (audit.discarded) return true;
  const next = restoreLearning(merged);
  const ids = new Set(next.results.map(result => result.id));
  if (restored.results.some(result => !ids.has(result.id))) return true;
  // Closing or superseding a draft also removes a record. Keep its original
  // bytes in the single backup slot, even when that removal is intentional.
  return Object.entries(restored.drafts).some(([lessonId, draft]) => {
    const replacement = next.drafts[lessonId];
    return !replacement || replacement.attempt !== draft.attempt;
  });
}
