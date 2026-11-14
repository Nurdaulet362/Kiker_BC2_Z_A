import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeStorage {
  values = new Map<string, string>();
  getItem = vi.fn((key: string) => this.values.get(key) ?? null);
  setItem = vi.fn((key: string, value: string) => { this.values.set(key, value); });
}

class FakeDocument extends EventTarget {
  visibilityState = "visible";
}

const encode = (...items: string[]) => JSON.stringify({ version: 2, items });
const policy = {
  version: 2,
  merge(current: string | null, incoming: string) {
    return encode(...[...new Set<string>([...(current ? JSON.parse(current).items : []), ...JSON.parse(incoming).items])].sort());
  },
};

describe("debounced, synchronized session storage", () => {
  let storage: FakeStorage;
  let browser: EventTarget;
  let page: FakeDocument;

  function storageEvent(key: string | null, area: unknown = storage) {
    const event = new Event("storage");
    Object.defineProperties(event, { key: { value: key }, storageArea: { value: area }, newValue: { value: "stale event payload" } });
    browser.dispatchEvent(event);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    storage = new FakeStorage();
    browser = new EventTarget();
    page = new FakeDocument();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", browser);
    vi.stubGlobal("document", page);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("updates memory immediately and writes only the last edit after 300ms", async () => {
    const api = await import("../src/session-storage");
    api.setSessionItem("draft", "first");
    expect(api.getSessionItem("draft")).toBe("first");
    expect(storage.setItem).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    api.setSessionItem("draft", "second");
    await vi.advanceTimersByTimeAsync(299);
    expect(storage.setItem).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith("draft", "second");
  });

  it("invalidates a cached value on a localStorage event and unsubscribes cleanly", async () => {
    const api = await import("../src/session-storage");
    storage.values.set("draft", "old");
    expect(api.getSessionItem("draft")).toBe("old");
    const changed = vi.fn();
    const unsubscribe = api.subscribe("draft", changed);
    storage.values.set("draft", "new");
    storageEvent("draft");
    expect(api.getSessionItem("draft")).toBe("new");
    expect(changed).toHaveBeenCalledTimes(1);
    storageEvent("draft");
    expect(changed).toHaveBeenCalledTimes(1);
    unsubscribe();
    storage.values.set("draft", "third");
    storageEvent("draft");
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("ignores events from other storage areas and handles a clear event for all cached keys", async () => {
    const api = await import("../src/session-storage");
    storage.values.set("a", "A");
    storage.values.set("b", "B");
    api.getSessionItem("a");
    api.getSessionItem("b");
    storage.values.clear();
    storageEvent("a", new FakeStorage());
    expect(api.getSessionItem("a")).toBe("A");
    storageEvent(null);
    expect(api.getSessionItem("a")).toBeNull();
    expect(api.getSessionItem("b")).toBeNull();
  });

  it("does not echo local or identical sets to value subscribers", async () => {
    const api = await import("../src/session-storage");
    api.getSessionItem("draft");
    const changed = vi.fn(() => api.setSessionItem("draft", api.getSessionItem("draft")!));
    api.subscribe("draft", changed);
    api.setSessionItem("draft", "edit");
    expect(changed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    api.setSessionItem("draft", "edit");
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(changed).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("flushes synchronously on explicit flush, pagehide and hidden visibility", async () => {
    const api = await import("../src/session-storage");
    api.setSessionItem("draft", "manual");
    api.flushSessionItems();
    expect(storage.values.get("draft")).toBe("manual");
    api.setSessionItem("draft", "leaving");
    browser.dispatchEvent(new Event("pagehide"));
    expect(storage.values.get("draft")).toBe("leaving");
    api.setSessionItem("draft", "background");
    page.dispatchEvent(new Event("visibilitychange"));
    expect(storage.values.get("draft")).toBe("leaving");
    page.visibilityState = "hidden";
    page.dispatchEvent(new Event("visibilitychange"));
    expect(storage.values.get("draft")).toBe("background");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports actual asynchronous save failure, retains memory and clears the warning after recovery", async () => {
    const api = await import("../src/session-storage");
    const status = vi.fn();
    const unsubscribe = api.subscribeSaveStatus("draft", status);
    expect(status).toHaveBeenLastCalledWith(false);
    storage.setItem.mockImplementationOnce(() => { throw new Error("Quota exceeded"); });
    api.setSessionItem("draft", "keep me");
    expect(status).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300);
    expect(status).toHaveBeenLastCalledWith(true);
    expect(api.getSessionItem("draft")).toBe("keep me");
    expect(api.readSessionItem("draft")).toBe("keep me");
    api.flushSessionItems();
    expect(storage.values.get("draft")).toBe("keep me");
    expect(status).toHaveBeenLastCalledWith(false);
    unsubscribe();
    storage.setItem.mockImplementationOnce(() => { throw new Error("Quota exceeded again"); });
    api.setSessionItem("draft", "later");
    api.flushSessionItems();
    expect(status).toHaveBeenCalledTimes(3);
  });

  it("preserves pending memory through read errors and retries when storage becomes available", async () => {
    const api = await import("../src/session-storage");
    const originalRead = storage.getItem.getMockImplementation()!;
    storage.getItem.mockImplementation(() => { throw new Error("Storage disabled"); });
    expect(api.getSessionItem("draft")).toBeNull();
    api.setSessionItem("draft", "in memory");
    expect(api.getSessionItem("draft")).toBe("in memory");
    api.flushSessionItems();
    expect(api.readSessionItem("draft")).toBe("in memory");
    expect(storage.setItem).not.toHaveBeenCalled();
    storage.getItem.mockImplementation(originalRead);
    api.flushSessionItems();
    expect(storage.values.get("draft")).toBe("in memory");
  });

  it("protects unknown future versions while allowing an empty in-memory session", async () => {
    const api = await import("../src/session-storage");
    const future = '{ "version": 99, "privateFutureData": [1, 2, 3] }';
    storage.values.set("learning", future);
    api.configureSessionItem("learning", policy);
    expect(api.getSessionItem("learning")).toBeNull();
    api.setSessionItem("learning", encode("new local attempt"));
    api.flushSessionItems();
    expect(api.getSessionItem("learning")).toBe(encode("new local attempt"));
    expect(api.readSessionItem("learning")).toBe(encode("new local attempt"));
    expect(storage.values.get("learning")).toBe(future);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("checks the physical version again if a newer application writes after our edit", async () => {
    const api = await import("../src/session-storage");
    api.configureSessionItem("trial", { version: 1 });
    api.setSessionItem("trial", JSON.stringify({ version: 1, answer: "local" }));
    const future = JSON.stringify({ version: 2, answer: "newer app" });
    storage.values.set("trial", future);
    await vi.advanceTimersByTimeAsync(300);
    expect(storage.values.get("trial")).toBe(future);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("merges fresh durable data with an unsaved local edit before writing", async () => {
    const api = await import("../src/session-storage");
    api.configureSessionItem("learning", policy);
    api.setSessionItem("learning", encode("local"));
    storage.values.set("learning", encode("remote"));
    expect(api.readSessionItem("learning")).toBe(encode("local", "remote"));
    api.flushSessionItems();
    expect(storage.values.get("learning")).toBe(encode("local", "remote"));
  });

  it("repairs a stale overwrite from another tab by merging its cached history and durable data", async () => {
    const api = await import("../src/session-storage");
    api.configureSessionItem("learning", policy);
    api.setSessionItem("learning", encode("first tab"));
    api.flushSessionItems();
    storage.values.set("learning", encode("second tab"));
    storageEvent("learning");
    expect(api.getSessionItem("learning")).toBe(encode("first tab", "second tab"));
    await vi.advanceTimersByTimeAsync(300);
    expect(storage.values.get("learning")).toBe(encode("first tab", "second tab"));
    const writes = storage.setItem.mock.calls.length;
    storageEvent("learning");
    await vi.advanceTimersByTimeAsync(300);
    expect(storage.setItem).toHaveBeenCalledTimes(writes);
  });
});

describe("cheap local enqueue", () => {
  it("does not read storage or merge until flush", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const values = new Map<string, string>();
    const storage = { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => values.set(key, value)) };
    vi.stubGlobal("localStorage", storage);
    try {
      const api = await import("../src/session-storage");
      const merge = vi.fn((_current: string | null, incoming: string) => incoming);
      api.configureSessionItem("local", { version: 2, merge });
      for (let i = 0; i < 50; i += 1) api.setSessionItem("local", JSON.stringify({ version: 2, answer: i }));
      expect(storage.getItem).not.toHaveBeenCalled();
      expect(merge).not.toHaveBeenCalled();
      expect(JSON.parse(api.getSessionItem("local")!).answer).toBe(49);
      await vi.advanceTimersByTimeAsync(300);
      expect(storage.getItem).toHaveBeenCalledTimes(1);
      expect(merge).toHaveBeenCalledTimes(1);
      expect(storage.setItem).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); vi.unstubAllGlobals(); }
  });
});
