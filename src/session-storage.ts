type StoragePolicy = {
  version: number;
  merge?: (current: string | null, incoming: string) => string;
  needsBackup?: (source: string, merged: string) => boolean;
};

const sessionItems = new Map<string, string | null>();
const pending = new Map<string, string>();
const backupSources = new Map<string, string>();
const policies = new Map<string, StoragePolicy>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Map<string, Set<() => void>>();
const saveListeners = new Map<string, Set<(failed: boolean) => void>>();
const saveFailures = new Map<string, boolean>();

function saveStatus(key: string, failed: boolean): void {
  if ((saveFailures.get(key) ?? false) === failed) return;
  saveFailures.set(key, failed);
  saveListeners.get(key)?.forEach(listener => listener(failed));
}

function publish(key: string, value: string | null, notify = true): void {
  const changed = !sessionItems.has(key) || sessionItems.get(key) !== value;
  sessionItems.set(key, value);
  if (changed && notify) listeners.get(key)?.forEach(listener => listener());
}

function clearTimer(key: string): void {
  const timer = timers.get(key);
  if (timer !== undefined) clearTimeout(timer);
  timers.delete(key);
}

function queue(key: string, value: string, restart = false): void {
  pending.set(key, value);
  if (restart) clearTimer(key);
  if (!timers.has(key)) timers.set(key, setTimeout(() => flushKey(key), 300));
}

function futureVersion(key: string, raw: string | null): boolean {
  const policy = policies.get(key);
  if (!policy || !raw) return false;
  try {
    const state: unknown = JSON.parse(raw);
    return !!state && typeof state === "object" && "version" in state && typeof state.version === "number" && state.version > policy.version;
  } catch {
    return false;
  }
}

function physicalValue(key: string): { value: string | null } | null {
  try {
    return { value: localStorage.getItem(key) };
  } catch {
    saveStatus(key, true);
    return null;
  }
}

function mergeValue(key: string, current: string | null, incoming: string): string {
  return policies.get(key)?.merge?.(current, incoming) ?? incoming;
}

function flushKey(key: string): void {
  clearTimer(key);
  const incoming = pending.get(key);
  if (incoming === undefined) return;
  const physical = physicalValue(key);
  if (!physical) return;
  // Recheck the durable version, including another tab's write after our edit.
  if (futureVersion(key, physical.value)) {
    saveStatus(key, true);
    return;
  }
  try {
    const merged = mergeValue(key, physical.value, incoming);
    const needsBackup = policies.get(key)?.needsBackup;
    // Prefer durable bytes when both inputs lose data; keep one backup slot.
    const original = needsBackup ? [physical.value, backupSources.get(key), incoming].find(
      (source): source is string => typeof source === "string" && needsBackup(source, merged),
    ) : undefined;
    // Even an unchanged primary value may have filtered an invalid local input.
    // Backup failure aborts replacement and leaves all pending memory intact.
    if (original !== undefined) localStorage.setItem(`${key}.backup`, original);
    if (merged !== physical.value) localStorage.setItem(key, merged);
    backupSources.delete(key);
    pending.delete(key);
    publish(key, merged);
    saveStatus(key, false);
  } catch {
    saveStatus(key, true);
  }
}

export function configureSessionItem(key: string, policy: StoragePolicy): void {
  policies.set(key, policy);
  const cached = sessionItems.get(key);
  if (cached && futureVersion(key, cached)) {
    clearTimer(key);
    pending.delete(key);
    publish(key, null);
    saveStatus(key, true);
  }
}

export function readSessionItem(key: string): string | null {
  const physical = physicalValue(key);
  if (!physical) return sessionItems.get(key) ?? pending.get(key) ?? null;
  if (futureVersion(key, physical.value)) {
    saveStatus(key, true);
    if (!sessionItems.has(key)) publish(key, null);
    return sessionItems.get(key) ?? null;
  }
  try {
    const cached = sessionItems.get(key);
    const local = pending.get(key) ?? cached;
    const value = policies.get(key)?.merge && local !== undefined && local !== null
      ? mergeValue(key, physical.value, local)
      : pending.get(key) ?? physical.value;
    const needsBackup = policies.get(key)?.needsBackup;
    if (needsBackup && typeof local === "string" && value !== null && needsBackup(local, value)) backupSources.set(key, local);
    if (value !== null && (value !== physical.value || backupSources.has(key))) queue(key, value);
    else {
      pending.delete(key);
      clearTimer(key);
      saveStatus(key, false);
    }
    publish(key, value);
    return value;
  } catch {
    saveStatus(key, true);
    return sessionItems.get(key) ?? pending.get(key) ?? null;
  }
}

export function getSessionItem(key: string): string | null {
  return sessionItems.has(key) ? sessionItems.get(key)! : readSessionItem(key);
}

export function setSessionItem(key: string, value: string): void {
  if (sessionItems.get(key) === value && !saveFailures.get(key)) return;
  // Keep the original queued bytes until reconciliation, including records a
  // stricter validator may reject. No disk read, parse or merge per keystroke.
  queue(key, value, true);
  publish(key, value, false);
}

export function subscribe(key: string, callback: () => void): () => void {
  const callbacks = listeners.get(key) ?? new Set();
  callbacks.add(callback);
  listeners.set(key, callbacks);
  return () => {
    callbacks.delete(callback);
    if (!callbacks.size) listeners.delete(key);
  };
}

export function subscribeSaveStatus(key: string, callback: (failed: boolean) => void): () => void {
  const callbacks = saveListeners.get(key) ?? new Set();
  callbacks.add(callback);
  saveListeners.set(key, callbacks);
  callback(saveFailures.get(key) ?? false);
  return () => {
    callbacks.delete(callback);
    if (!callbacks.size) saveListeners.delete(key);
  };
}

export function flushSessionItems(): void {
  for (const key of [...pending.keys()]) flushKey(key);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", event => {
    try {
      if (event.storageArea !== null && event.storageArea !== localStorage) return;
    } catch {
      return;
    }
    const keys = event.key === null
      ? new Set([...sessionItems.keys(), ...pending.keys(), ...policies.keys(), ...listeners.keys()])
      : [event.key];
    for (const key of keys) readSessionItem(key);
  });
  window.addEventListener("pagehide", flushSessionItems);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSessionItems();
  });
}
