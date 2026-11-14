const sessionItems = new Map<string, string | null>();

export function getSessionItem(key: string): string | null {
  if (sessionItems.has(key)) return sessionItems.get(key)!;
  const value = localStorage.getItem(key);
  sessionItems.set(key, value);
  return value;
}

export function setSessionItem(key: string, value: string): void {
  // Keep drafts across route unmounts even when browser storage rejects writes.
  sessionItems.set(key, value);
  localStorage.setItem(key, value);
}
