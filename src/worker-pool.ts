import { FormulaWorkerError, formulaIssue } from "./formula-errors";

type PendingRequest = {
  message: { id: number; [key: string]: unknown };
  resolve?: (result: unknown) => void;
  reject?: (error: unknown) => void;
  signal?: AbortSignal;
  onAbort: () => void;
  cancelled: boolean;
  posted: boolean;
  replays: number;
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
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let watchedId: number | undefined;
  // Entries track work still owned by the worker, including aborted promises.
  // Map insertion order is the worker's FIFO order; replies remain matched by ID.
  const pending = new Map<number, PendingRequest>();

  function detach(entry: PendingRequest): void {
    entry.signal?.removeEventListener("abort", entry.onAbort);
    entry.signal = undefined;
  }

  function take(id: number): PendingRequest | undefined {
    const entry = pending.get(id);
    if (!entry) return undefined;
    pending.delete(id);
    detach(entry);
    return entry;
  }

  function clearWatchdog(): void {
    if (watchdog !== undefined) clearTimeout(watchdog);
    watchdog = undefined;
    watchedId = undefined;
  }

  function terminateWorker(): void {
    clearWatchdog();
    const previous = worker;
    worker = undefined;
    if (previous) {
      previous.onmessage = null;
      previous.onerror = null;
      previous.terminate();
    }
  }

  function stop(error: unknown): void {
    terminateWorker();
    for (const id of pending.keys()) take(id)?.reject?.(error);
  }

  function watchOldest(): void {
    const oldest = pending.entries().next().value;
    if (oldest?.[0] === watchedId && watchdog !== undefined) return;
    clearWatchdog();
    if (!worker || !oldest || !oldest[1].posted) return;
    const [id] = oldest;
    const current = worker;
    watchedId = id;
    watchdog = setTimeout(() => {
      if (worker !== current || pending.keys().next().value !== id) return;
      // Only this request has consumed its execution budget. Followers have
      // merely waited behind it, so they must not receive its timeout error.
      terminateWorker();
      take(id)?.reject?.(new FormulaWorkerError("timeout"));
      for (const [otherId, entry] of pending) {
        if (entry.cancelled) take(otherId);
        else if (entry.replays >= 1) {
          // One automatic replay per request. A second interrupted start is
          // surfaced as a restart failure, never as that request's timeout.
          take(otherId)?.reject?.(new FormulaWorkerError("start"));
        } else {
          entry.replays += 1;
          entry.posted = false;
        }
      }
      if (!pending.size) return;
      try {
        const replacement = start();
        for (const entry of pending.values()) {
          if (worker !== replacement) break;
          post(replacement, entry);
        }
      } catch {
        stop(new FormulaWorkerError("start"));
      }
    }, timeoutMs);
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
        take(data.id)?.reject?.(error);
      } else if ("result" in data) {
        take(data.id)?.resolve?.(data.result);
      }
      watchOldest();
    };
    current.onerror = () => {
      if (worker === current) stop(new FormulaWorkerError("start"));
    };
    return current;
  }

  function post(current: Worker, entry: PendingRequest): void {
    try {
      current.postMessage(entry.message);
    } catch {
      if (worker === current) stop(new FormulaWorkerError("start"));
      return;
    }
    // Construction and posting are outside the execution budget. A synchronous
    // fake reply can already have removed this entry; native replies are async.
    if (worker !== current || !pending.has(entry.message.id)) return;
    entry.posted = true;
    watchOldest();
  }

  return {
    request<T>(payload: object, signal?: AbortSignal): Promise<T> {
      if (disposed || signal?.aborted) return Promise.reject(aborted());
      return new Promise<T>((resolve, reject) => {
        let current: Worker;
        let message: PendingRequest["message"];
        try {
          current = start();
          // Replays must use the submitted data even if a caller later edits it.
          message = { ...structuredClone(payload), id: ++nextId };
        } catch {
          stop(new FormulaWorkerError("start"));
          reject(new FormulaWorkerError("start"));
          return;
        }
        const onAbort = () => {
          const entry = pending.get(message.id);
          if (!entry || entry.cancelled) return;
          entry.cancelled = true;
          detach(entry);
          entry.reject?.(aborted());
          entry.reject = undefined;
          entry.resolve = undefined;
          // The computation still runs in the worker. Keep its queue position
          // and watchdog until its reply arrives or the worker is terminated.
        };
        const entry: PendingRequest = {
          message, resolve: result => resolve(result as T), reject, signal,
          onAbort, cancelled: false, posted: false, replays: 0,
        };
        pending.set(message.id, entry);
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted) {
          onAbort();
          take(message.id);
          return;
        }
        post(current, entry);
      });
    },
    dispose() {
      disposed = true;
      stop(aborted());
    },
  };
}
