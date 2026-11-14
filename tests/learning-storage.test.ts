import { describe, expect, it, vi } from "vitest";
import { evaluateLesson } from "../src/learning/engine";
import {
  MAX_RESULTS, beginLesson, getLesson, initialDraft, initialLearning,
  isLessonComplete, migrate, restoreLearning, saveLessonDraft, setLearningGoal,
  type HintLevel, type LearningState, type LessonInput, type LessonResult,
} from "../src/learning/model";
import { mergeLearning, mergeLearningJSON, prepareLessonInput, recordLessonResult } from "../src/learning/persistence";

const lessonId = "revenue-cancelled";
const early = "2026-11-14T10:00:00.000Z";
const later = "2026-11-14T10:00:01.000Z";

function solved(attempt = 1, hintLevel: HintLevel = 0): LessonInput {
  const lesson = getLesson(lessonId);
  return {
    ...initialDraft(lessonId, attempt), lessonId, attempt, hintLevel,
    formula: lesson.solution, diagnosis: lesson.correctDiagnosis, transfer: lesson.transfer.correct,
  };
}

function result(id: string, attempt = 1, hintLevel: HintLevel = 0): LessonResult {
  return { ...evaluateLesson(solved(attempt, hintLevel)), id, at: early };
}

function draftState(attempt = 1, hintLevel: HintLevel = 0, updatedAt = early): LearningState {
  return {
    ...initialLearning(), attempts: { [lessonId]: attempt },
    drafts: { [lessonId]: { ...initialDraft(lessonId, attempt), hintLevel, updatedAt } },
  };
}

function expectAssisted(entry: LessonResult) {
  expect(entry.hintLevel).toBe(3);
  expect(entry.solutionRevealed).toBe(true);
  expect(entry.breakdown).toEqual({ diagnosis: 20, repair: 25, transfer: 30 });
  expect(entry.score).toBe(75);
  expect(entry.breakdown!.diagnosis + entry.breakdown!.repair + entry.breakdown!.transfer).toBe(entry.score);
  expect(entry.snapshot?.hintLevel).toBe(3);
  expect(isLessonComplete(entry)).toBe(false);
}

describe("learning state reconciliation", () => {
  it("unions IDs including equal timestamps and keeps the highest attempt counter", () => {
    const a = { ...initialLearning(), results: [result("left", 2)], attempts: { [lessonId]: 7 } };
    const b = { ...initialLearning(), results: [result("right", 3)], attempts: { [lessonId]: 5 } };
    const before = structuredClone([a, b]);
    const merged = mergeLearning(a, b);
    expect(merged.results.map(entry => entry.id)).toEqual(["left", "right"]);
    expect(merged.attempts[lessonId]).toBe(7);
    expect(merged.closedAttempts[lessonId]).toBe(3);
    expect([a, b]).toEqual(before);
  });

  it("takes the later draft body but never lowers the hint level within an attempt", () => {
    const a = draftState(2, 3, early);
    const b = draftState(2, 0, later);
    b.drafts[lessonId].formula = "=42";
    b.drafts[lessonId].rows[0][2] = 42;
    const merged = mergeLearning(a, b);
    expect(merged.drafts[lessonId]).toEqual({ ...b.drafts[lessonId], hintLevel: 3 });
    expect(mergeLearning(b, a)).toEqual(merged);
    expect(saveLessonDraft(merged, lessonId, { ...b.drafts[lessonId], hintLevel: 0 }).drafts[lessonId].hintLevel).toBe(3);
  });

  it("keeps a new attempt unassisted even when an older attempt was edited later", () => {
    const old = draftState(2, 3, later);
    const fresh = draftState(3, 0, early);
    const merged = mergeLearning(old, fresh);
    expect(merged.drafts[lessonId]).toEqual(fresh.drafts[lessonId]);
    expect(merged.attempts[lessonId]).toBe(3);
    expect(prepareLessonInput(merged, solved(3)).hintLevel).toBe(0);
  });

  it("retains completion tombstones after history eviction and ignores stale writes", () => {
    const completed = { ...initialLearning(), closedAttempts: { [lessonId]: 12 }, attempts: { [lessonId]: 12 } };
    const stale = draftState(12, 3, later);
    const merged = mergeLearning(completed, stale);
    expect(merged.results).toEqual([]);
    expect(merged.drafts[lessonId]).toBeUndefined();
    expect(saveLessonDraft(merged, lessonId, stale.drafts[lessonId])).toBe(merged);
    const resumed = beginLesson(restoreLearning(JSON.stringify(merged)), lessonId);
    expect(resumed.drafts[lessonId].attempt).toBe(13);
    expect(resumed.drafts[lessonId].hintLevel).toBe(0);
  });

  it("preserves an explicit breakdown when another copy of the same ID lacks it", () => {
    const rich = { ...result("same"), score: 80, breakdown: { diagnosis: 15, repair: 40, transfer: 25 } };
    const legacy: LessonResult = { ...rich };
    delete legacy.breakdown;
    const merged = mergeLearning({ ...initialLearning(), results: [legacy] }, { ...initialLearning(), results: [rich] });
    expect(merged.results).toEqual([rich]);
    expect(merged.results[0].breakdown!.diagnosis + merged.results[0].breakdown!.repair + merged.results[0].breakdown!.transfer).toBe(80);
  });

  it("reconciles same-ID solution use and caps the preserved score components", () => {
    const unassisted = result("same");
    const revealed = { ...unassisted, hintLevel: 3 as const, solutionRevealed: true };
    delete revealed.breakdown;
    const a = { ...initialLearning(), results: [unassisted] };
    const b = { ...initialLearning(), results: [revealed] };
    const merged = mergeLearning(a, b);
    expect(merged.results).toHaveLength(1);
    expectAssisted(merged.results[0]);
    expect(mergeLearning(b, a)).toEqual(merged);
  });

  it.each([true, false])("caps a revealed legacy result without a breakdown (attempt recorded: %s)", recordedAttempt => {
    const legacy = { ...result("legacy"), hintLevel: 3 as const, solutionRevealed: true };
    delete legacy.breakdown;
    if (!recordedAttempt) {
      delete legacy.attempt;
      if (legacy.snapshot) delete legacy.snapshot.attempt;
    }
    const merged = mergeLearning(initialLearning(), { ...initialLearning(), results: [legacy] });
    expect(merged.results[0]).toMatchObject({ hintLevel: 3, solutionRevealed: true, score: 75 });
    expect(merged.results[0].breakdown).toBeUndefined();
    expect(isLessonComplete(merged.results[0])).toBe(false);
    if (!recordedAttempt) expect(merged.results[0].attempt).toBeUndefined();
  });

  it("shares solution evidence across distinct results of the same attempt only", () => {
    const a = { ...initialLearning(), results: [result("revealed", 1, 3)] };
    const b = { ...initialLearning(), results: [result("stale-result", 1), result("new-result", 2)] };
    const merged = mergeLearning(a, b);
    expectAssisted(merged.results.find(entry => entry.id === "stale-result")!);
    expect(merged.results.find(entry => entry.id === "new-result")!.score).toBe(100);
    expect(merged.results.find(entry => entry.id === "new-result")!.hintLevel).toBe(0);
  });

  it("records a late worker result with the draft's current hints and closes only that attempt", () => {
    const state = draftState(4, 3);
    const recorded = recordLessonResult(state, result("submitted", 4));
    expectAssisted(recorded.results[0]);
    expect(recorded.drafts[lessonId]).toBeUndefined();
    expect(recorded.closedAttempts[lessonId]).toBe(4);
    expect(recorded.attempts[lessonId]).toBe(4);
    const fresh = draftState(5, 0);
    const lateOldResult = recordLessonResult(fresh, result("late-old", 4));
    expect(lateOldResult.drafts[lessonId]).toEqual(fresh.drafts[lessonId]);
  });

  it("prepares grading from same-attempt draft and result hints without changing the input", () => {
    const input = solved(2);
    const state = draftState(2, 3);
    expect(prepareLessonInput(state, input).hintLevel).toBe(3);
    expect(input.hintLevel).toBe(0);
    expect(prepareLessonInput(draftState(3, 3), input).hintLevel).toBe(0);
    const completed = { ...initialLearning(), results: [result("prior", 2, 3)] };
    expect(prepareLessonInput(completed, input).hintLevel).toBe(3);
    expect(prepareLessonInput(completed, solved(3)).hintLevel).toBe(0);
  });

  it("merges commutatively and idempotently with deterministic goals and timestamp ties", () => {
    const a = { ...draftState(2, 3, early), goal: "revenue" as const, goalUpdatedAt: early };
    const b = { ...draftState(2, 0, later), goal: "conversion" as const, goalUpdatedAt: later };
    b.drafts[lessonId].formula = "=42";
    const merged = mergeLearning(a, b);
    expect(merged.goal).toBe("conversion");
    expect(mergeLearning(b, a)).toEqual(merged);
    expect(mergeLearning(merged, merged)).toEqual(merged);
    expect(mergeLearning(merged, a)).toEqual(merged);
    const tied = { ...a, goalUpdatedAt: later };
    expect(mergeLearning(tied, b)).toEqual(mergeLearning(b, tied));
    const c = { ...draftState(2, 1, early), goal: "decisions" as const, goalUpdatedAt: early };
    expect(mergeLearning(mergeLearning(a, b), c)).toEqual(mergeLearning(a, mergeLearning(b, c)));
    const selected = setLearningGoal(merged, "decisions");
    expect(selected.goal).toBe("decisions");
    expect(Number.isFinite(Date.parse(selected.goalUpdatedAt!))).toBe(true);
  });

  it("bounds the union to MAX_RESULTS without losing attempt and completion counters", () => {
    const template = result("template", 200);
    const entries = Array.from({ length: MAX_RESULTS + 7 }, (_, index) => ({
      ...template, id: `result-${String(index).padStart(3, "0")}`,
    }));
    const a = { ...initialLearning(), results: entries.slice(0, 60) };
    const b = { ...initialLearning(), results: entries.slice(60) };
    const merged = mergeLearning(a, b);
    expect(merged.results).toEqual(entries.slice(-MAX_RESULTS));
    expect(merged.attempts[lessonId]).toBe(200);
    expect(merged.closedAttempts[lessonId]).toBe(200);
    expect(JSON.parse(mergeLearningJSON(JSON.stringify(a), JSON.stringify(b)))).toEqual(merged);
  });
});

describe("learning migrations and recovered metadata", () => {
  it("migrates a v1 envelope to v2, preserves valid records and normalizes legacy fields", () => {
    const legacyResult = { ...result("old") } as Partial<LessonResult>;
    delete legacyResult.id;
    delete legacyResult.hintLevel;
    delete legacyResult.solutionRevealed;
    if (legacyResult.snapshot) delete (legacyResult.snapshot as Partial<LessonInput>).hintLevel;
    const raw = JSON.stringify({
      version: 1, goal: "all", results: [legacyResult, null, { lessonId: "unknown" }],
      drafts: { "conversion-weighted": initialDraft("conversion-weighted") },
    });
    const migrated = migrate(raw);
    expect(migrated.version).toBe(2);
    expect(migrated.results).toHaveLength(1);
    expect(migrated.results[0].id).toBe(`legacy-${early}-0`);
    expect(migrated.results[0].breakdown).toEqual({ diagnosis: 20, repair: 50, transfer: 30 });
    expect(migrated.results[0].hintLevel).toBe(0);
    expect(migrated.results[0].snapshot?.hintLevel).toBe(0);
    expect(migrated.drafts["conversion-weighted"].attempt).toBe(1);
    expect(restoreLearning(raw)).toEqual(migrated);
    expect(migrate(JSON.stringify(migrated))).toEqual(migrated);
  });

  it("uses an empty in-memory state for unknown versions or malformed envelopes", () => {
    const future = JSON.stringify({ ...draftState(1, 3), version: 99 });
    for (const raw of [future, JSON.stringify({ ...initialLearning(), version: 0 }), "null", "{}", "{broken"]) {
      expect(migrate(raw)).toEqual(initialLearning());
      expect(restoreLearning(raw)).toEqual(initialLearning());
    }
  });

  it("restores tombstones and does not reopen a stale completed draft", () => {
    const state = { ...draftState(9, 3), closedAttempts: { [lessonId]: 9 }, goal: "decisions" as const, goalUpdatedAt: later };
    const restored = restoreLearning(JSON.stringify(state));
    // Restoration retains conflicting hint evidence until reconciliation can cap
    // matching results; the normalized app state must not reopen the old draft.
    expect(mergeLearning(restored, initialLearning()).drafts[lessonId]).toBeUndefined();
    expect(restored.closedAttempts[lessonId]).toBe(9);
    expect(restored.attempts[lessonId]).toBe(9);
    expect(restored.goalUpdatedAt).toBe(later);
    expect(beginLesson(restored, lessonId).drafts[lessonId].attempt).toBe(10);
  });
});


describe("merge regression boundaries", () => {
  it("never lets derived legacy components replace explicit ones, regardless of merge order", () => {
    const rich = { ...result("same"), score: 80, breakdown: { diagnosis: 15, repair: 40, transfer: 25 } };
    const legacy: LessonResult = { ...rich, hintLevel: 3, solutionRevealed: true };
    delete legacy.breakdown;
    const a = { ...initialLearning(), results: [rich] };
    const b = { ...initialLearning(), results: [legacy] };
    const expected = mergeLearning(a, b);
    expect(expected.results[0].breakdown).toEqual({ diagnosis: 15, repair: 25, transfer: 25 });
    expect(expected.results[0].score).toBe(65);
    expect(mergeLearning(b, a)).toEqual(expected);
    const normalizedLegacy = restoreLearning(JSON.stringify(mergeLearning(initialLearning(), b)));
    expect(normalizedLegacy.results[0].breakdown).toBeUndefined();
    expect(mergeLearning(a, normalizedLegacy)).toEqual(expected);
    expect(mergeLearning(normalizedLegacy, a)).toEqual(expected);
  });

  it("keeps a new edit newer than saved data when the system clock moves backwards", () => {
    const state = draftState(1, 0, "2099-01-01T00:00:00.000Z");
    state.goalUpdatedAt = "2099-01-01T00:00:00.000Z";
    const clock = vi.spyOn(Date, "now").mockReturnValue(0);
    try {
      const edited = saveLessonDraft(state, lessonId, { ...state.drafts[lessonId], formula: "=42" });
      expect(Date.parse(edited.drafts[lessonId].updatedAt!)).toBeGreaterThan(Date.parse(state.drafts[lessonId].updatedAt!));
      expect(mergeLearning(state, edited).drafts[lessonId].formula).toBe("=42");
      const goal = setLearningGoal(state, "decisions");
      expect(mergeLearning(state, goal).goal).toBe("decisions");
    } finally { clock.mockRestore(); }
  });
});
