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

function draftBodyKey(draft: LessonDraft): string {
  const { hintLevel: _hint, ...body } = draft;
  return canonical(body);
}

function resultBodyKey(result: LessonResult): string {
  const { hintLevel: _hint, solutionRevealed: _revealed, score: _score, breakdown, snapshot, ...body } = result;
  const { hintLevel: _snapshotHint, ...snapshotBody } = snapshot ?? {};
  // These fields are immutable for a result ID. Merged hint evidence and its
  // score cap must not change which original payload wins a same-ID conflict.
  return canonical({ ...body,
    ...(breakdown ? { components: { diagnosis: breakdown.diagnosis, transfer: breakdown.transfer } } : {}),
    ...(snapshot ? { snapshot: snapshotBody } : {}),
  });
}

function repairPoints(result: LessonResult): number {
  return result.breakdown?.repair ?? result.score - (result.diagnosisPassed ? 20 : 0) - (result.transferPassed ? 30 : 0);
}

function mergeResult(a: LessonResult, b: LessonResult): LessonResult {
  // Keep one coherent score/snapshot, preferring explicitly recorded components.
  const richness = (r: LessonResult) => Number(!!r.breakdown) * 2 + Number(!!r.snapshot);
  const ordering = richness(a) - richness(b)
    || lexical(resultBodyKey(a), resultBodyKey(b))
    || repairPoints(a) - repairPoints(b);
  const base = ordering >= 0 ? a : b;
  const level = Math.max(a.hintLevel, b.hintLevel, a.solutionRevealed || b.solutionRevealed ? 3 : 0) as HintLevel;
  return withHints(base, level);
}

export function mergeLearning(a: LearningState, b: LearningState): LearningState {
  const byId = new Map<string, LessonResult>();
  for (const result of [...a.results, ...b.results]) {
    const prior = byId.get(result.id);
    byId.set(result.id, prior ? mergeResult(prior, result) : result);
  }
  const normalized = [...byId.values()].map(result => withHints(result, result.solutionRevealed ? 3 : result.hintLevel));
  const attemptHints: LearningState["attemptHints"] = {};
  const hintedAttempts = new Map<string, number>();
  const completed = new Map<string, number>();
  const recordEvidence = (lessonId: string, attempt: number, level: HintLevel) => {
    if (level === 0) return;
    const levels = attemptHints[lessonId] ??= {};
    levels[attempt] = Math.max(levels[attempt] ?? 0, level) as HintLevel;
    hintedAttempts.set(lessonId, Math.max(hintedAttempts.get(lessonId) ?? 0, attempt));
  };
  for (const state of [a, b]) {
    for (const [lessonId, levels] of Object.entries(state.attemptHints)) {
      for (const [attempt, level] of Object.entries(levels)) recordEvidence(lessonId, Number(attempt), level);
    }
  }
  for (const result of normalized) {
    if (result.attempt === undefined) continue;
    recordEvidence(result.lessonId, result.attempt, result.hintLevel);
    completed.set(result.lessonId, Math.max(completed.get(result.lessonId) ?? 0, result.attempt));
  }
  for (const state of [a, b]) {
    for (const [lessonId, draft] of Object.entries(state.drafts)) recordEvidence(lessonId, draft.attempt, draft.hintLevel);
  }
  const reconciled = normalized.map(result => result.attempt === undefined ? result
    : withHints(result, attemptHints[result.lessonId]?.[result.attempt] ?? result.hintLevel));
  const drafts: Record<string, LessonDraft> = {};
  const attempts: Record<string, number> = {};
  const closedAttempts: Record<string, number> = {};
  for (const lesson of LESSONS) {
    const id = lesson.id;
    const candidates = [a.drafts[id], b.drafts[id]].filter((d): d is LessonDraft => !!d);
    const closed = Math.max(a.closedAttempts[id] ?? 0, b.closedAttempts[id] ?? 0, completed.get(id) ?? 0);
    if (closed > 0) closedAttempts[id] = closed;
    candidates.sort((left, right) => left.attempt - right.attempt
      || timestamp(left.updatedAt) - timestamp(right.updatedAt)
      || lexical(draftBodyKey(left), draftBodyKey(right)));
    const latest = candidates.at(-1);
    if (latest && latest.attempt > closed) {
      const hintLevel = attemptHints[id]?.[latest.attempt] ?? 0;
      drafts[id] = { ...latest, hintLevel };
    }
    const count = Math.max(a.attempts[id] ?? 0, b.attempts[id] ?? 0, closed, hintedAttempts.get(id) ?? 0, ...candidates.map(d => d.attempt));
    if (count > 0) attempts[id] = count;
  }
  const goalOwner = timestamp(a.goalUpdatedAt) === timestamp(b.goalUpdatedAt)
    ? lexical(`${a.goal}:${a.goalUpdatedAt ?? ""}`, `${b.goal}:${b.goalUpdatedAt ?? ""}`) >= 0 ? a : b
    : timestamp(a.goalUpdatedAt) > timestamp(b.goalUpdatedAt) ? a : b;
  // The algebraic contract covers canonical states whose full result union
  // fits MAX_RESULTS. Once history is truncated, a removed result payload is no
  // longer available to reconcile against a later copy: associativity is not
  // promised across that information-loss boundary. Hint evidence and closure
  // counters remain monotone independently of history retention.
  const results = reconciled.sort((left, right) => timestamp(left.at) - timestamp(right.at) || lexical(left.id, right.id)).slice(-MAX_RESULTS);
  return {
    version: 2, results, drafts, attempts, closedAttempts, attemptHints, goal: goalOwner.goal,
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
  return { ...input, hintLevel: Math.max(input.hintLevel, draft?.attempt === input.attempt ? draft.hintLevel : 0, input.attempt === undefined ? 0 : state.attemptHints[input.lessonId]?.[input.attempt] ?? 0, ...levels) as HintLevel };
}
