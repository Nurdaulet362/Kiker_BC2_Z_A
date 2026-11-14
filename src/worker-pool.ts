import { FormulaWorkerError, formulaIssue } from "./formula-errors";

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: unknown) => void;
  timer?: ReturnType<typeof setTimeout>;
  signal?: AbortSignal;
  onAbort: () => void;
};

export type WorkerPool = {
  request<T>(payload: object, signal?: AbortSignal): Promise<T>;
  dispose(): void;
};

const aborted = () => new DOMException("The operation was aborted.", "AbortError");

export function createWorkerPool(factory: () => Worker, timeoutMs: number): WorkerPool {
  let worker: Worker | undefined;
  let nextId = 0;
  let disposed = false;
  const pending = new Map<number, PendingRequest>();

  function take(id: number): PendingRequest | undefined {
    const entry = pending.get(id);
    if (!entry) return undefined;
    pending.delete(id);
    if (entry.timer !== undefined) clearTimeout(entry.timer);
    entry.signal?.removeEventListener("abort", entry.onAbort);
    return entry;
  }

  function stop(error: unknown): void {
    const previous = worker;
    worker = undefined;
    if (previous) {
      previous.onmessage = null;
      previous.onerror = null;
      previous.terminate();
    }
    for (const id of pending.keys()) take(id)?.reject(error);
  }

  function start(): Worker {
    if (worker) return worker;
    const current = factory();
    worker = current;
    current.onmessage = event => {
      if (worker !== current) return;
      const data: unknown = event.data;
      if (!data || typeof data !== "object" || !("id" in data) || typeof data.id !== "number") return;
      if ("error" in data && typeof data.error === "string") {
        const issue = formulaIssue(data);
        const error = Object.assign(new Error(issue.error), {
          ...(issue.code ? { code: issue.code } : {}),
          ...(issue.params ? { params: issue.params } : {}),
        });
        take(data.id)?.reject(error);
      } else if ("result" in data) {
        take(data.id)?.resolve(data.result);
      }
    };
    current.onerror = () => {
      if (worker === current) stop(new FormulaWorkerError("start"));
    };
    return current;
  }

  return {
    request<T>(payload: object, signal?: AbortSignal): Promise<T> {
      if (disposed || signal?.aborted) return Promise.reject(aborted());
      return new Promise<T>((resolve, reject) => {
        let current: Worker;
        try {
          current = start();
        } catch {
          stop(new FormulaWorkerError("start"));
          reject(new FormulaWorkerError("start"));
          return;
        }
        const id = ++nextId;
        const onAbort = () => take(id)?.reject(aborted());
        const entry: PendingRequest = {
          resolve: result => resolve(result as T), reject, signal, onAbort,
        };
        pending.set(id, entry);
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted) {
          onAbort();
          return;
        }
        try {
          current.postMessage({ ...payload, id });
        } catch {
          stop(new FormulaWorkerError("start"));
          return;
        }
        // Construction and posting happen before the request timeout starts.
        // A synchronous fake response/abort can already have settled it.
        if (pending.has(id)) {
          entry.timer = setTimeout(() => {
            if (worker === current && pending.has(id)) stop(new FormulaWorkerError("timeout"));
          }, timeoutMs);
        }
      });
    },
    dispose() {
      disposed = true;
      stop(aborted());
    },
  };
}
