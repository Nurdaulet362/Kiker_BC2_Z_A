import { describe, expect, it, vi } from "vitest";
import { assess } from "../src/simulation/evaluate";
import { initialTrial, restoreTrial, type Submission, type TrialState } from "../src/simulation/model";
import { completedTrial, currentTrialSubmissions, editTrial, freshTrial, mergeTrial, mergeTrialJSON } from "../src/simulation/persistence";

const early = "2026-11-15T00:00:00.000Z";
const later = "2026-11-15T00:00:01.000Z";
const latest = "2026-11-15T00:00:02.000Z";
function working(generation = 0): TrialState {
  return { ...initialTrial(generation), generation, stage: "work", startedAt: early, updatedAt: early };
}
function result(id?: string): Submission {
  const state = initialTrial();
  return { ...assess(state.scenario, state.answers, 10), at: early, ...(id ? { id } : {}) };
}

describe("Work Trial reconciliation", () => {
  it("retains a completed review when a stale tab makes a later draft edit", () => {
    const before = working();
    const done = completedTrial(before, result("saved"), later);
    const staleEdit = { ...before, updatedAt: latest, answers: { ...before.answers, revenue: "=42" } };
    const merged = mergeTrial(done, staleEdit);
    expect(merged.stage).toBe("work");
    expect(merged.answers.revenue).toBe("=42");
    expect(merged.submissions.map(entry => entry.id)).toEqual(["saved"]);
    expect(restoreTrial(JSON.stringify(merged))).toEqual(merged);
    expect(JSON.parse(mergeTrialJSON(JSON.stringify(done), JSON.stringify(staleEdit)))).toEqual(merged);
  });

  it("keeps simultaneous same-time submissions distinct and merges them in either order", () => {
    const before = working();
    const first = completedTrial(before, result(), later);
    const second = completedTrial(before, result(), later);
    expect(first.submissions[0].id).not.toBe(second.submissions[0].id);
    const merged = mergeTrial(first, second);
    expect(merged.submissions).toHaveLength(2);
    expect(mergeTrial(second, first)).toEqual(merged);
    expect(mergeTrial(merged, merged)).toEqual(merged);
  });

  it("does not overwrite a newer draft when an older asynchronous assessment finishes", () => {
    const submitted = working();
    const newerEdit = { ...submitted, updatedAt: latest, answers: { ...submitted.answers, note: "new note" } };
    const done = completedTrial(submitted, result("older-response"), later);
    const merged = mergeTrial(newerEdit, done);
    expect(merged.stage).toBe("work");
    expect(merged.answers.note).toBe("new note");
    expect(merged.submissions[0].snapshot?.answers.note).toBe("");
  });

  it("keeps fresh assignments ahead of later stale edits and late responses without losing history", () => {
    const previous = { ...working(), hints: ["revenue"] };
    const fresh = freshTrial(previous);
    const late = completedTrial(previous, result("old-result"), "2099-01-01T00:00:00.000Z");
    const merged = mergeTrial(fresh, late);
    expect(merged.generation).toBe(1);
    expect(merged.scenario.seed).toBe(1);
    expect(merged.stage).toBe("work");
    expect(merged.hints).toEqual([]);
    expect(merged.submissions[0].id).toBe("old-result");
    expect(currentTrialSubmissions(merged)).toEqual([]);
    expect(mergeTrial(merged, { ...previous, updatedAt: "2099-01-02T00:00:00.000Z" })).toEqual(merged);
  });

  it("fresh keeps earlier reviews but starts the new assignment with no current review or hints", () => {
    const before = completedTrial({ ...working(), hints: ["revenue", "judgment"] }, result("prior"), later);
    const fresh = freshTrial(before);
    expect(fresh.submissions.map(entry => entry.id)).toEqual(["prior"]);
    expect(fresh.submissions[0].snapshot?.hints).toEqual(["revenue", "judgment"]);
    expect(fresh.hints).toEqual([]);
    expect(currentTrialSubmissions(fresh)).toEqual([]);
  });

  it("unions hints within one assignment and keeps recorded snapshots independent", () => {
    const a = { ...working(), hints: ["revenue"] };
    const b = { ...working(), updatedAt: later, hints: ["conversion"] };
    const merged = mergeTrial(a, b);
    expect(merged.hints).toEqual(["revenue", "conversion"]);
    expect(mergeTrial(b, a)).toEqual(merged);
    const submitted = result("same");
    const first = completedTrial(a, submitted, later);
    const second = completedTrial(b, submitted, later);
    expect(mergeTrial(first, second).submissions[0].snapshot?.hints).toEqual(["revenue", "conversion"]);
    expect(submitted.snapshot?.hints).toEqual([]);
  });

  it("remains commutative, idempotent and associative across three generations", () => {
    const a = completedTrial({ ...working(), hints: ["revenue"] }, result("a"), later);
    const b = { ...freshTrial(a), hints: ["conversion"] };
    const c = completedTrial(freshTrial(b), result("c"), latest);
    const originals = structuredClone([a, b, c]);
    const ab = mergeTrial(a, b);
    expect(ab).toEqual(mergeTrial(b, a));
    expect(mergeTrial(ab, ab)).toEqual(ab);
    expect(mergeTrial(mergeTrial(a, b), c)).toEqual(mergeTrial(a, mergeTrial(b, c)));
    expect([a, b, c]).toEqual(originals);
  });

  it("reads legacy version-1 results without IDs or metadata and deduplicates repeated copies", () => {
    const legacy = { ...initialTrial(3), stage: "result" as const, startedAt: early, submissions: [result()] };
    delete legacy.submissions[0].snapshot; // Older reviews predate snapshots too.
    expect(restoreTrial(JSON.stringify(legacy))).toEqual(legacy);
    const merged = mergeTrial(legacy, legacy);
    expect(merged.generation).toBe(3);
    expect(currentTrialSubmissions(merged)).toHaveLength(1);
    expect(merged.submissions[0].id).toBeUndefined();
    expect(mergeTrial(merged, legacy)).toEqual(merged);
    const next = freshTrial(merged);
    expect(next.submissions).toHaveLength(1);
    expect(currentTrialSubmissions(next)).toEqual([]);
  });

  it("preserves duplicate legacy records and normalizes hint order without creating duplicate reviews", () => {
    const review = result();
    review.snapshot!.hints = ["judgment", "revenue"];
    const old = { ...working(), submissions: [review, structuredClone(review)] };
    const merged = mergeTrial(old, old);
    expect(merged.submissions).toHaveLength(2);
    expect(mergeTrial(merged, old)).toEqual(merged);
    expect(mergeTrial(merged, merged)).toEqual(merged);
  });

  it("retains at most 50 global reviews and prioritizes the current assignment despite clock rollback", () => {
    const previous = { ...working(), submissions: Array.from({ length: 50 }, (_, i) => ({ ...result(`old-${i}`), at: "2099-01-01T00:00:00.000Z" })) };
    const fresh = freshTrial(previous);
    const completed = completedTrial(fresh, result("current"), later);
    const merged = mergeTrial(previous, completed);
    expect(merged.submissions).toHaveLength(50);
    expect(currentTrialSubmissions(merged).map(entry => entry.id)).toEqual(["current"]);
  });

  it("keeps explicit edits newer than a future saved timestamp without changing scoring", () => {
    const before = { ...working(), updatedAt: "2099-01-01T00:00:00.000Z" };
    const clock = vi.spyOn(Date, "now").mockReturnValue(0);
    try {
      const edit = editTrial(before, { ...before, answers: { ...before.answers, revenue: "=42" } });
      expect(Date.parse(edit.updatedAt!)).toBeGreaterThan(Date.parse(before.updatedAt));
      expect(mergeTrial(before, edit).answers.revenue).toBe("=42");
    } finally { clock.mockRestore(); }
  });

  it("keeps future envelopes unreadable and ignores invalid optional draft metadata", () => {
    expect(restoreTrial(JSON.stringify({ ...working(), version: 99 }))).toEqual(initialTrial());
    const saved = initialTrial();
    expect(restoreTrial(JSON.stringify({ ...saved, generation: -1, updatedAt: "bad" }))).toEqual(saved);
  });
});
