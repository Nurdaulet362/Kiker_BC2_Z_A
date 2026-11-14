import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateLesson } from "../src/learning/engine";
import { getLesson, initialDraft, initialLearning, restoreLearning } from "../src/learning/model";
import { mergeLearningJSON, recordLessonResult } from "../src/learning/persistence";
import { needsLearningBackup } from "../src/learning/storage-backup";

const key = "fix-the-report.learning.v2";
const lesson = getLesson("revenue-cancelled");
const valid = evaluateLesson({ ...initialDraft(lesson.id), lessonId: lesson.id,
  formula: lesson.solution, diagnosis: lesson.correctDiagnosis, transfer: lesson.transfer.correct });

let values: Map<string, string>;
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  values = new Map();
  storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  };
  vi.stubGlobal("localStorage", storage);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

async function persist(raw: string) {
  const api = await import("../src/session-storage");
  api.configureSessionItem(key, { version: 2, merge: mergeLearningJSON, needsBackup: needsLearningBackup });
  values.set(key, raw);
  const restored = restoreLearning(api.getSessionItem(key));
  api.setSessionItem(key, JSON.stringify(restored));
  api.flushSessionItems();
  return api;
}

describe("backup before filtering saved learning data", () => {
  it("retains exact source bytes before removing an invalid result from the primary key", async () => {
    const raw = JSON.stringify({ ...initialLearning(), results: [valid, { ...valid, id: "invalid", score: -1 }] }, null, 2);
    await persist(raw);
    expect(JSON.parse(values.get(key)!).results.map((r: { id: string }) => r.id)).toEqual([valid.id]);
    expect(values.get(`${key}.backup`)).toBe(raw);
    expect(storage.setItem.mock.calls.map(([key]) => key)).toEqual([`${key}.backup`, key]);
  });

  it.each(["{broken", '{"version":2,"results":"unexpected"}', '{"version":0,"draft":"unreadable"}'])("backs up a nonempty source that restores as empty: %s", async raw => {
    await persist(raw);
    expect(values.get(`${key}.backup`)).toBe(raw);
    expect(restoreLearning(values.get(key)!)).toEqual(initialLearning());
  });

  it("keeps exact bytes from two consecutive losses in the two backup slots", async () => {
    const first = JSON.stringify({ ...initialLearning(), drafts: { unknown: { formula: "=12" } } });
    const api = await persist(first);
    expect(values.get(`${key}.backup`)).toBe(first);
    const second = JSON.stringify({ ...initialLearning(), results: [null] });
    values.set(key, second);
    api.readSessionItem(key); // Reconcile the external write before saving the same UI value.
    api.setSessionItem(key, JSON.stringify(initialLearning()));
    api.flushSessionItems();
    expect(values.get(`${key}.backup`)).toBe(second);
    expect(values.get(`${key}.backup.prev`)).toBe(first);
    expect([...values.keys()].sort()).toEqual([key, `${key}.backup`, `${key}.backup.prev`]);
    expect(storage.setItem.mock.calls.slice(-3).map(([target]) => target)).toEqual([`${key}.backup.prev`, `${key}.backup`, key]);
  });

  it("does not replace the original if the backup cannot be written", async () => {
    const raw = JSON.stringify({ ...initialLearning(), results: [null, valid] });
    storage.setItem.mockImplementation((target: string, value: string) => {
      if (target.endsWith(".backup")) throw new Error("Backup quota exceeded");
      values.set(target, value);
    });
    const api = await persist(raw);
    expect(values.get(key)).toBe(raw);
    expect(JSON.parse(api.getSessionItem(key)!).results).toHaveLength(1);
    expect(storage.setItem.mock.calls.every(([target]) => target === `${key}.backup`)).toBe(true);
  });

  it("leaves a previous backup alone for valid empty state, safe edits and future versions", async () => {
    values.set(`${key}.backup`, "previous backup");
    values.set(`${key}.backup.prev`, "older backup");
    const api = await persist(JSON.stringify(initialLearning()));
    api.setSessionItem(key, JSON.stringify({ ...initialLearning(), results: [valid] }));
    api.flushSessionItems();
    expect(values.get(`${key}.backup`)).toBe("previous backup");
    expect(values.get(`${key}.backup.prev`)).toBe("older backup");
    const future = '{"version":99,"future":"untouched"}';
    values.set(key, future);
    api.setSessionItem(key, JSON.stringify(initialLearning()));
    api.flushSessionItems();
    expect(values.get(key)).toBe(future);
    expect(values.get(`${key}.backup`)).toBe("previous backup");
    expect(values.get(`${key}.backup.prev`)).toBe("older backup");
    expect(storage.setItem.mock.calls.every(([target]) => target === key)).toBe(true);
  });

  it("keeps a damaged source through two ordinary draft completions", async () => {
    const raw = JSON.stringify({ ...initialLearning(), results: [null] }, null, 2);
    values.set(`${key}.backup`, "older loss");
    const api = await persist(raw);
    storage.setItem.mockClear();
    for (const attempt of [1, 2]) {
      const draft = initialDraft(lesson.id, attempt);
      const state = restoreLearning(values.get(key)!);
      api.setSessionItem(key, JSON.stringify({ ...state, drafts: { [lesson.id]: draft }, attempts: { [lesson.id]: attempt } }));
      api.flushSessionItems();
      const result = evaluateLesson({ ...draft, lessonId: lesson.id, formula: lesson.solution,
        diagnosis: lesson.correctDiagnosis, transfer: lesson.transfer.correct });
      api.setSessionItem(key, JSON.stringify(recordLessonResult(restoreLearning(values.get(key)!), result)));
      api.flushSessionItems();
      expect(restoreLearning(values.get(key)!).closedAttempts[lesson.id]).toBe(attempt);
      expect(restoreLearning(values.get(key)!).drafts[lesson.id]).toBeUndefined();
      expect(values.get(`${key}.backup`)).toBe(raw);
      expect(values.get(`${key}.backup.prev`)).toBe("older loss");
    }
    expect(storage.setItem.mock.calls.every(([target]) => target === key)).toBe(true);
  });

  it("still backs up an unconfirmed draft superseded by a new attempt", async () => {
    const source = { ...initialLearning(), drafts: { [lesson.id]: initialDraft(lesson.id) }, attempts: { [lesson.id]: 1 } };
    const raw = JSON.stringify(source);
    expect(needsLearningBackup(raw, JSON.stringify(initialLearning()))).toBe(true);
    const api = await persist(raw);
    api.setSessionItem(key, JSON.stringify({ ...source, drafts: { [lesson.id]: initialDraft(lesson.id, 2) }, attempts: { [lesson.id]: 2 } }));
    api.flushSessionItems();
    expect(values.get(`${key}.backup`)).toBe(raw);
    expect(restoreLearning(values.get(key)!).drafts[lesson.id].attempt).toBe(2);
  });

  it.each([".backup.prev", ".backup"])("leaves the primary unchanged when writing %s fails", async suffix => {
    const raw = JSON.stringify({ ...initialLearning(), results: [null, valid] });
    values.set(`${key}.backup`, "previous loss");
    values.set(`${key}.backup.prev`, "older loss");
    storage.setItem.mockImplementation((target: string, value: string) => {
      if (target === `${key}${suffix}`) throw new Error("Backup quota exceeded");
      values.set(target, value);
    });
    const api = await persist(raw);
    expect(values.get(key)).toBe(raw);
    expect(values.get(`${key}.backup`)).toBe("previous loss");
    expect(storage.setItem.mock.calls.some(([target]) => target === key)).toBe(false);
    const status = vi.fn();
    api.subscribeSaveStatus(key, status);
    expect(status).toHaveBeenLastCalledWith("unavailable");
    storage.setItem.mockImplementation((target: string, value: string) => { values.set(target, value); });
    api.flushSessionItems();
    expect(restoreLearning(values.get(key)!).results).toHaveLength(1);
    expect(values.get(`${key}.backup`)).toBe(raw);
    expect(values.get(`${key}.backup.prev`)).toBe("previous loss");
    expect(status).toHaveBeenLastCalledWith("ok");
  });

  it("does not overwrite either slot when reading the current backup fails", async () => {
    const raw = JSON.stringify({ ...initialLearning(), results: [null] });
    values.set(`${key}.backup`, "previous loss");
    values.set(`${key}.backup.prev`, "older loss");
    storage.getItem.mockImplementation((target: string) => {
      if (target === `${key}.backup`) throw new Error("Backup read unavailable");
      return values.get(target) ?? null;
    });
    const api = await persist(raw);
    expect(values.get(key)).toBe(raw);
    expect(values.get(`${key}.backup`)).toBe("previous loss");
    expect(values.get(`${key}.backup.prev`)).toBe("older loss");
    expect(storage.setItem).not.toHaveBeenCalled();
    const status = vi.fn();
    api.subscribeSaveStatus(key, status);
    expect(status).toHaveBeenLastCalledWith("unavailable");
  });

  it("does not rotate the same source again when retrying a failed primary write", async () => {
    const raw = JSON.stringify({ ...initialLearning(), results: [null, valid] }, null, 2);
    values.set(`${key}.backup`, "previous loss");
    values.set(`${key}.backup.prev`, "older loss");
    storage.setItem.mockImplementation((target: string, value: string) => {
      if (target === key) throw new Error("Primary quota exceeded");
      values.set(target, value);
    });
    const api = await persist(raw);
    expect(values.get(key)).toBe(raw);
    expect(values.get(`${key}.backup`)).toBe(raw);
    expect(values.get(`${key}.backup.prev`)).toBe("previous loss");
    storage.setItem.mockClear();
    storage.setItem.mockImplementation((target: string, value: string) => { values.set(target, value); });
    api.flushSessionItems();
    expect(storage.setItem.mock.calls.map(([target]) => target)).toEqual([key]);
    expect(values.get(`${key}.backup`)).toBe(raw);
    expect(values.get(`${key}.backup.prev`)).toBe("previous loss");
    expect(restoreLearning(values.get(key)!).results).toHaveLength(1);
  });
});

it.each([false, true])("backs up invalid incoming bytes even when the primary value stays unchanged (fresh read: %s)", async freshRead => {
  const api = await persist(JSON.stringify(initialLearning()));
  const incoming = JSON.stringify({ ...initialLearning(), results: [null] }, null, 2);
  api.setSessionItem(key, incoming);
  if (freshRead) api.readSessionItem(key);
  api.flushSessionItems();
  expect(values.get(`${key}.backup`)).toBe(incoming);
  expect(restoreLearning(values.get(key)!)).toEqual(initialLearning());
});


it.each([
  { attempts: { "revenue-cancelled": "7" } },
  { closedAttempts: { "revenue-cancelled": "6" } },
  { attempts: { "unknown-lesson": 7 } },
  { attempts: null },
  { goalUpdatedAt: "not-a-date" },
  { addedByAnotherValidator: { progress: "recoverable" } },
])("backs up discarded progress metadata: %j", async fields => {
  const raw = JSON.stringify({ ...initialLearning(), ...fields }, null, 2);
  await persist(raw);
  expect(values.get(`${key}.backup`)).toBe(raw);
  expect(restoreLearning(values.get(key)!)).toEqual(initialLearning());
});
