import { describe, expect, it } from "vitest";
import { LESSONS, MAX_RESULTS, initialDraft, initialLearning, type HintLevel, type LearningState, type LessonResult } from "../src/learning/model";
import { mergeLearning } from "../src/learning/persistence";

type StateWithHints = LearningState & { attemptHints: Record<string, Record<string, HintLevel>> };
const epoch = Date.parse("2026-11-14T10:00:00.000Z");
const date = (tick: number) => new Date(epoch + tick * 1000).toISOString();
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

// Deliberately independent of mergeLearning: build internally consistent saved
// states from the domain rules. No merge call or restore-and-merge normalization
// prepares the inputs for the algebra assertions below.
function randomState(seed: number): StateWithHints {
  let cursor = seed >>> 0;
  const pick = (bound: number) => {
    cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
    return cursor % bound;
  };
  const state: StateWithHints = { ...initialLearning(), attemptHints: {} };
  const saturated = seed % 23 === 0;
  const attemptCount = saturated ? 8 : 1 + (seed % 8);
  const addHint = (lessonId: string, attempt: number, hint: HintLevel) => {
    if (!hint) return;
    const levels = state.attemptHints[lessonId] ??= {};
    levels[attempt] = Math.max(levels[attempt] ?? 0, hint) as HintLevel;
  };
  for (const [lessonIndex, lesson] of LESSONS.entries()) {
    let closed = pick(5);
    for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
      const level = pick(4) as HintLevel;
      // Sparse evidence can outlive its draft or reviewed result.
      if (pick(3) === 0) addHint(lesson.id, attempt, level);
      for (let variant = 0; variant < 2; variant += 1) {
        if (!saturated && pick(3) !== 0) continue;
        const identity = lessonIndex * 16 + (attempt - 1) * 2 + variant;
        const diagnosis = identity % 2 ? 20 : 0;
        const transfer = identity % 3 ? 30 : 0;
        const rawRepair = [0, 10, 25, 40, 50][identity % 5];
        const repair = level === 3 ? Math.min(rawRepair, 25) : rawRepair;
        const snapshot = {
          lessonId: lesson.id, attempt, hintLevel: level, rows: lesson.rows.map(row => [...row]),
          formula: lesson.solution, diagnosis: lesson.correctDiagnosis,
          decision: lesson.correctDecision ?? "", transfer: lesson.transfer.correct,
        };
        const result: LessonResult = {
          id: `result-${identity}`, lessonId: lesson.id, attempt, at: date(identity),
          hintLevel: level, solutionRevealed: level === 3,
          score: diagnosis + repair + transfer,
          diagnosisPassed: diagnosis === 20, repairPassed: rawRepair === 50, transferPassed: transfer === 30,
          checks: [{ label: { en: "Generated check", ru: "Проверка генератора" }, passed: rawRepair === 50, expected: "1", actual: rawRepair === 50 ? "1" : "0" }],
          ...(pick(4) === 0 ? {} : { breakdown: { diagnosis, repair, transfer } }),
          ...(pick(4) === 0 ? {} : { snapshot }),
        };
        state.results.push(result);
        addHint(lesson.id, attempt, level);
        closed = Math.max(closed, attempt);
      }
    }
    if (closed) state.closedAttempts[lesson.id] = closed;
    if (pick(3) !== 0) {
      const attempt = closed + 1 + pick(3);
      const level = Math.max(pick(4), state.attemptHints[lesson.id]?.[attempt] ?? 0) as HintLevel;
      const draft = { ...initialDraft(lesson.id, attempt), hintLevel: level, updatedAt: date(pick(3)), formula: `=${pick(100)}` };
      const { hintLevel, ...body } = draft;
      // JSON field order is not part of the domain. Exercise both ordinary and
      // older persisted layouts where the mutable hint field comes first.
      state.drafts[lesson.id] = pick(2) ? draft : { hintLevel, ...body };
      addHint(lesson.id, attempt, level);
    }
    const levels = state.attemptHints[lesson.id] ?? {};
    const attempted = Math.max(closed, state.drafts[lesson.id]?.attempt ?? 0, ...Object.keys(levels).map(Number));
    if (attempted) state.attempts[lesson.id] = attempted;
  }
  const goals = ["all", "revenue", "conversion", "decisions"] as const;
  state.goal = goals[pick(goals.length)];
  state.goalUpdatedAt = date(pick(3));
  state.results.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || compare(a.id, b.id));
  return state;
}

function cases() {
  return Array.from({ length: 500 }, (_, index) => {
    const seed = 362 + index * 17;
    return { seed, a: randomState(seed), b: randomState(seed + 1), c: randomState(seed + 2) };
  });
}

function expectMonotone(merged: StateWithHints, sources: StateWithHints[], seed: number) {
  for (const source of sources) {
    for (const result of source.results) {
      const retained = merged.results.find(entry => entry.id === result.id);
      if (retained) expect(retained.hintLevel, `result hint ${seed}/${result.id}`).toBeGreaterThanOrEqual(result.hintLevel);
    }
    for (const lesson of LESSONS) {
      const before = source.drafts[lesson.id], after = merged.drafts[lesson.id];
      if (before && after?.attempt === before.attempt) expect(after.hintLevel, `draft hint ${seed}/${lesson.id}`).toBeGreaterThanOrEqual(before.hintLevel);
      expect(merged.closedAttempts[lesson.id] ?? 0, `closed ${seed}/${lesson.id}`).toBeGreaterThanOrEqual(source.closedAttempts[lesson.id] ?? 0);
      expect(merged.attempts[lesson.id] ?? 0, `attempt ${seed}/${lesson.id}`).toBeGreaterThanOrEqual(source.attempts[lesson.id] ?? 0);
      for (const [attempt, level] of Object.entries(source.attemptHints[lesson.id] ?? {})) {
        expect(merged.attemptHints[lesson.id]?.[attempt] ?? 0, `hint ${seed}/${lesson.id}/${attempt}`).toBeGreaterThanOrEqual(level);
      }
    }
  }
}

describe("generated learning merge laws", () => {
  it("is commutative for 500 independently generated pairs without mutating either input", () => {
    for (const { seed, a, b } of cases()) {
      const original = structuredClone([a, b]);
      expect(mergeLearning(a, b), `seed ${seed}`).toEqual(mergeLearning(b, a));
      expect([a, b], `inputs at seed ${seed}`).toEqual(original);
    }
  });

  it("is idempotent on all 1500 canonical generated saved states", () => {
    for (const { seed, a, b, c } of cases()) {
      for (const state of [a, b, c]) expect(mergeLearning(state, state), `seed ${seed}`).toEqual(state);
    }
  });

  it("is associative for 500 triples whose entire result union fits MAX_RESULTS", () => {
    let largestUnion = 0;
    for (const { seed, a, b, c } of cases()) {
      const unionSize = new Set([...a.results, ...b.results, ...c.results].map(result => result.id)).size;
      largestUnion = Math.max(largestUnion, unionSize);
      expect(unionSize).toBeLessThanOrEqual(MAX_RESULTS);
      expect(mergeLearning(mergeLearning(a, b), c), `seed ${seed}`).toEqual(mergeLearning(a, mergeLearning(b, c)));
    }
    // Six lessons × eight attempts × two result IDs = 96; saturated seeds
    // exercise the history boundary rather than only small disjoint samples.
    expect(largestUnion).toBeGreaterThanOrEqual(90);
  });

  it("never lowers observed hints or closed attempts across the 500 pairs and triples", () => {
    for (const { seed, a, b, c } of cases()) {
      expectMonotone(mergeLearning(a, b) as StateWithHints, [a, b], seed);
      expectMonotone(mergeLearning(mergeLearning(a, b), c) as StateWithHints, [a, b, c], seed);
    }
  });
});

it("retains old hint evidence after a newer draft arrives before the old result", () => {
  const id = "revenue-cancelled";
  const a = { ...initialLearning(), attempts: { [id]: 1 }, attemptHints: { [id]: { "1": 3 as const } }, drafts: { [id]: { ...initialDraft(id, 1), hintLevel: 3 as const } } };
  const b = { ...initialLearning(), attempts: { [id]: 2 }, drafts: { [id]: initialDraft(id, 2) } };
  const c: LearningState = {
    ...initialLearning(), attempts: { [id]: 1 }, closedAttempts: { [id]: 1 },
    results: [{ id: "old-result", lessonId: id, attempt: 1, at: date(0), hintLevel: 0, solutionRevealed: false,
      score: 100, diagnosisPassed: true, repairPassed: true, transferPassed: true, checks: [],
      breakdown: { diagnosis: 20, repair: 50, transfer: 30 } }],
  };
  const merged = mergeLearning(mergeLearning(a, b), c);
  expect(merged.results[0].score).toBe(75);
  expect(merged.results[0].solutionRevealed).toBe(true);
  expect(merged).toEqual(mergeLearning(a, mergeLearning(b, c)));
  expect(merged.drafts[id].hintLevel).toBe(0);
});
