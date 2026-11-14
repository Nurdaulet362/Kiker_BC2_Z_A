import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkerPool, type WorkerPool } from "../src/worker-pool";

class FakeWorker {
  onmessage: Worker["onmessage"] = null;
  onerror: Worker["onerror"] = null;
  messages: { id: number; [key: string]: unknown }[] = [];
  onPost?: () => void;
  terminate = vi.fn();

  postMessage(message: { id: number; [key: string]: unknown }) {
    this.messages.push(message);
    this.onPost?.();
  }

  reply(data: object) {
    this.onmessage?.call(this as unknown as Worker, { data } as MessageEvent);
  }

  crash() {
    this.onerror?.call(this as unknown as Worker, {} as ErrorEvent);
  }
}

describe("persistent worker pool", () => {
  const pools: WorkerPool[] = [];
  const setup = (timeout = 100) => {
    const workers: FakeWorker[] = [];
    const factory = vi.fn(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    });
    const pool = createWorkerPool(factory, timeout);
    pools.push(pool);
    return { pool, workers, factory };
  };

  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    for (const pool of pools.splice(0)) pool.dispose();
    vi.useRealTimers();
  });

  it("constructs lazily and routes concurrent out-of-order replies using monotonic IDs", async () => {
    const { pool, workers, factory } = setup();
    expect(factory).not.toHaveBeenCalled();
    const first = pool.request<number>({ value: "first", id: -1 });
    const second = pool.request<number>({ value: "second" });
    expect(factory).toHaveBeenCalledTimes(1);
    const [a, b] = workers[0].messages;
    expect(a.id).toBeGreaterThan(0);
    expect(b.id).toBe(a.id + 1);
    workers[0].reply({ id: b.id, result: 22 });
    workers[0].reply({ id: a.id, result: 11 });
    await expect(first).resolves.toBe(11);
    await expect(second).resolves.toBe(22);
    const third = pool.request<number>({ value: "third" });
    expect(factory).toHaveBeenCalledTimes(1);
    workers[0].reply({ id: workers[0].messages[2].id, result: 33 });
    await expect(third).resolves.toBe(33);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects all outstanding requests on timeout and lazily restarts with fresh IDs", async () => {
    const { pool, workers, factory } = setup();
    const first = pool.request({}).catch(error => error);
    await vi.advanceTimersByTimeAsync(50);
    const second = pool.request({}).catch(error => error);
    const previousId = workers[0].messages[1].id;
    await vi.advanceTimersByTimeAsync(50);
    expect(await first).toMatchObject({ code: "timeout" });
    expect(await second).toMatchObject({ code: "timeout" });
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    const next = pool.request<string>({});
    expect(factory).toHaveBeenCalledTimes(2);
    expect(workers[1].messages[0].id).toBeGreaterThan(previousId);
    workers[1].reply({ id: workers[1].messages[0].id, result: "restarted" });
    await expect(next).resolves.toBe("restarted");
  });

  it("aborts only its request, removes its listener and leaves its neighbor running", async () => {
    const { pool, workers } = setup();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const first = pool.request({}, controller.signal).catch(error => error);
    const second = pool.request<number>({});
    controller.abort();
    expect(await first).toMatchObject({ name: "AbortError" });
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(workers[0].terminate).not.toHaveBeenCalled();
    workers[0].reply({ id: workers[0].messages[0].id, result: "late aborted reply" });
    workers[0].reply({ id: workers[0].messages[1].id, result: 42 });
    await expect(second).resolves.toBe(42);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not construct or post for an already aborted signal", async () => {
    const { pool, factory } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(pool.request({}, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(factory).not.toHaveBeenCalled();
  });

  it("ignores late message and error callbacks from a replaced worker", async () => {
    const { pool, workers } = setup();
    const first = pool.request({}).catch(error => error);
    const oldWorker = workers[0];
    const staleMessage = oldWorker.onmessage!;
    const staleError = oldWorker.onerror!;
    oldWorker.crash();
    expect(await first).toMatchObject({ code: "start" });
    const next = pool.request<string>({});
    const nextId = workers[1].messages[0].id;
    staleMessage.call(oldWorker as unknown as Worker, { data: { id: nextId, result: "wrong worker" } } as MessageEvent);
    staleError.call(oldWorker as unknown as Worker, {} as ErrorEvent);
    expect(workers[1].terminate).not.toHaveBeenCalled();
    workers[1].reply({ id: nextId, result: "current worker" });
    await expect(next).resolves.toBe("current worker");
  });

  it("rejects an isolated computation error with its metadata and keeps the worker reusable", async () => {
    const { pool, workers, factory } = setup();
    const first = pool.request({}).catch(error => error);
    const second = pool.request<number>({});
    workers[0].reply({ id: workers[0].messages[0].id, error: "Function detail", code: "function", params: { fn: "UNKNOWN" } });
    expect(await first).toMatchObject({ message: "Function detail", code: "function", params: { fn: "UNKNOWN" } });
    workers[0].reply({ id: workers[0].messages[1].id, result: 9 });
    await expect(second).resolves.toBe(9);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(workers[0].terminate).not.toHaveBeenCalled();
  });

  it("recovers lazily after a constructor failure", async () => {
    const worker = new FakeWorker();
    const factory = vi.fn<() => Worker>()
      .mockImplementationOnce(() => { throw new Error("Worker unavailable"); })
      .mockReturnValue(worker as unknown as Worker);
    const pool = createWorkerPool(factory, 100);
    pools.push(pool);
    await expect(pool.request({})).rejects.toMatchObject({ code: "start" });
    const next = pool.request<number>({});
    worker.reply({ id: worker.messages[0].id, result: 7 });
    await expect(next).resolves.toBe(7);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("rejects every pending request and restarts after postMessage throws", async () => {
    const { pool, workers } = setup();
    const first = pool.request({}).catch(error => error);
    workers[0].onPost = () => { throw new Error("Cannot clone payload"); };
    const second = pool.request({}).catch(error => error);
    expect(await first).toMatchObject({ code: "start" });
    expect(await second).toMatchObject({ code: "start" });
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);
    const next = pool.request<number>({});
    workers[1].reply({ id: workers[1].messages[0].id, result: 8 });
    await expect(next).resolves.toBe(8);
  });

  it("starts the timeout after construction and postMessage complete", async () => {
    const worker = new FakeWorker();
    worker.onPost = () => { vi.advanceTimersByTime(200); };
    const factory = () => {
      vi.advanceTimersByTime(200);
      return worker as unknown as Worker;
    };
    const pool = createWorkerPool(factory, 100);
    pools.push(pool);
    const request = pool.request({}).catch(error => error);
    expect(worker.terminate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(99);
    expect(worker.terminate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await request).toMatchObject({ code: "timeout" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("disposes pending requests, timers and listeners and cannot create another worker", async () => {
    const { pool, workers, factory } = setup();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const request = pool.request({}, controller.signal).catch(error => error);
    pool.dispose();
    pool.dispose();
    expect(await request).toMatchObject({ name: "AbortError" });
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);
    expect(workers[0].onmessage).toBeNull();
    expect(workers[0].onerror).toBeNull();
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    await expect(pool.request({})).rejects.toMatchObject({ name: "AbortError" });
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
