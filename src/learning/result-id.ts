let sequence = 0;

export function createResultId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  } catch {
    // Older/insecure browser contexts can expose crypto without usable UUIDs.
  }
  sequence += 1;
  return `result-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${sequence.toString(36)}`;
}
