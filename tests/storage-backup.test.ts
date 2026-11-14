import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateLesson } from "../src/learning/engine";
import { getLesson, initialDraft, initialLearning, restoreLearning } from "../src/learning/model";
import { mergeLearningJSON } from "../src/learning/persistence";
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

  it("backs up dropped drafts and keeps one overwriteable slot", async () => {
    const first = JSON.stringify({ ...initialLearning(), drafts: { unknown: { formula: "=12" } } });
    const api = await persist(first);
    expect(values.get(`${key}.backup`)).toBe(first);
    const second = JSON.stringify({ ...initialLearning(), results: [null] });
    values.set(key, second);
    api.readSessionItem(key); // Reconcile the external write before saving the same UI value.
    api.setSessionItem(key, JSON.stringify(initialLearning()));
    api.flushSessionItems();
    expect(values.get(`${key}.backup`)).toBe(second);
    expect([...values.keys()].sort()).toEqual([key, `${key}.backup`]);
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
    const api = await persist(JSON.stringify(initialLearning()));
    api.setSessionItem(key, JSON.stringify({ ...initialLearning(), results: [valid] }));
    api.flushSessionItems();
    expect(values.get(`${key}.backup`)).toBe("previous backup");
    const future = '{"version":99,"future":"untouched"}';
    values.set(key, future);
    api.setSessionItem(key, JSON.stringify(initialLearning()));
    api.flushSessionItems();
    expect(values.get(key)).toBe(future);
    expect(values.get(`${key}.backup`)).toBe("previous backup");
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
