import {
  LESSONS, MAX_RESULTS, initialLearning, restoreLearning,
  type HintLevel, type LearningState, type LessonDraft, type LessonInput, type LessonResult,
} from "./model";

const timestamp = (value?: string) => value ? Date.parse(value) || 0 : 0;
const canonical = (value: unknown) => JSON.stringify(value);
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

function withHints(result: LessonResult, level: HintLevel): LessonResult {
  if (level === result.hintLevel && level < 3) return result;
  const original = result.breakdown ?? {
    diagnosis: result.diagnosisPassed ? 20 : 0,
    repair: result.score - (result.diagnosisPassed ? 20 : 0) - (result.transferPassed ? 30 : 0),
    transfer: result.transferPassed ? 30 : 0,
  };
  const breakdown = { ...original, repair: level === 3 ? Math.min(original.repair, 25) : original.repair };
  return {
    ...result, hintLevel: level, solutionRevealed: level === 3,
    // An inferred legacy breakdown must not outrank explicitly saved components.
    ...(result.breakdown ? { breakdown } : {}),
    score: breakdown.diagnosis + breakdown.repair + breakdown.transfer,
    ...(result.snapshot ? { snapshot: { ...result.snapshot, hintLevel: level } } : {}),
  };
}

function mergeResult(a: LessonResult, b: LessonResult): LessonResult {
  // Keep one coherent score/snapshot, preferring explicitly recorded components.
  const richness = (r: LessonResult) => Number(!!r.breakdown) * 2 + Number(!!r.snapshot);
  const base = richness(a) === richness(b)
    ? (lexical(canonical(a), canonical(b)) >= 0 ? a : b)
    : richness(a) > richness(b) ? a : b;
  const level = Math.max(a.hintLevel, b.hintLevel, a.solutionRevealed || b.solutionRevealed ? 3 : 0) as HintLevel;
  return withHints(base, level);
}

export function mergeLearning(a: LearningState, b: LearningState): LearningState {
  const byId = new Map<string, LessonResult>();
  for (const result of [...a.results, ...b.results]) {
    const prior = byId.get(result.id);
    byId.set(result.id, prior ? mergeResult(prior, result) : result);
  }
  for (const [id, result] of byId) byId.set(id, withHints(result, result.solutionRevealed ? 3 : result.hintLevel));
  const drafts: Record<string, LessonDraft> = {};
  const attempts: Record<string, number> = {};
  const closedAttempts: Record<string, number> = {};
  for (const lesson of LESSONS) {
    const id = lesson.id;
    const candidates = [a.drafts[id], b.drafts[id]].filter((d): d is LessonDraft => !!d);
    let closed = Math.max(a.closedAttempts[id] ?? 0, b.closedAttempts[id] ?? 0);
    for (const [resultId, result] of byId) {
      if (result.lessonId !== id || result.attempt === undefined) continue;
      closed = Math.max(closed, result.attempt);
      const evidence = [...byId.values()].filter(r => r.lessonId === id && r.attempt === result.attempt);
      const level = Math.max(result.hintLevel, ...evidence.map(r => r.solutionRevealed ? 3 : r.hintLevel), ...candidates.filter(d => d.attempt === result.attempt).map(d => d.hintLevel)) as HintLevel;
      byId.set(resultId, withHints(result, level));
    }
    if (closed > 0) closedAttempts[id] = closed;
    candidates.sort((left, right) => left.attempt - right.attempt
      || timestamp(left.updatedAt) - timestamp(right.updatedAt)
      || lexical(canonical(left), canonical(right)));
    const latest = candidates.at(-1);
    if (latest && latest.attempt > closed) {
      const hintLevel = Math.max(...candidates.filter(d => d.attempt === latest.attempt).map(d => d.hintLevel)) as HintLevel;
      drafts[id] = { ...latest, hintLevel };
    }
    const count = Math.max(a.attempts[id] ?? 0, b.attempts[id] ?? 0, closed, ...candidates.map(d => d.attempt));
    if (count > 0) attempts[id] = count;
  }
  const goalOwner = timestamp(a.goalUpdatedAt) === timestamp(b.goalUpdatedAt)
    ? lexical(a.goal, b.goal) >= 0 ? a : b
    : timestamp(a.goalUpdatedAt) > timestamp(b.goalUpdatedAt) ? a : b;
  const results = [...byId.values()].sort((left, right) => timestamp(left.at) - timestamp(right.at) || lexical(left.id, right.id)).slice(-MAX_RESULTS);
  return {
    version: 2, results, drafts, attempts, closedAttempts, goal: goalOwner.goal,
    ...(goalOwner.goalUpdatedAt ? { goalUpdatedAt: goalOwner.goalUpdatedAt } : {}),
  };
}

export function mergeLearningJSON(current: string | null, incoming: string): string {
  return JSON.stringify(mergeLearning(restoreLearning(current), restoreLearning(incoming)));
}

export function recordLessonResult(state: LearningState, result: LessonResult): LearningState {
  return mergeLearning(state, { ...initialLearning(), results: [result] });
}

export function prepareLessonInput(state: LearningState, input: LessonInput): LessonInput {
  const draft = state.drafts[input.lessonId];
  const levels = state.results.filter(result => result.lessonId === input.lessonId && result.attempt !== undefined && result.attempt === input.attempt).map(result => result.solutionRevealed ? 3 : result.hintLevel);
  return { ...input, hintLevel: Math.max(input.hintLevel, draft?.attempt === input.attempt ? draft.hintLevel : 0, ...levels) as HintLevel };
}
