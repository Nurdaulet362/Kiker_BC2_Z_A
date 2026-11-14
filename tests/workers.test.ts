import { afterEach, describe, expect, it, vi } from "vitest";
import { handleFormulaRequest } from "../src/formula-worker-handler";
import { initialProgress } from "../src/model";
import { runCalculation } from "../src/worker-client";

afterEach(() => vi.unstubAllGlobals());

describe("formula worker failures", () => {
  it("returns the request id for calculations, verification and caught exceptions", () => {
    const request = { id: 17, type: "calculate" as const, formula: "=SUM(C2:C101)", rows: initialProgress().rows };
    expect(handleFormulaRequest(request)).toEqual({ id: 17, result: { value: 1200 } });
    expect(handleFormulaRequest({ ...request, type: "verify" }).result).toHaveLength(19);
    const invalid = { ...request, rows: null as unknown as typeof request.rows };
    const response = handleFormulaRequest(invalid);
    expect(response.id).toBe(17);
    expect("error" in response && response.error).toBeTruthy();
    expect(response).not.toHaveProperty("result");
  });

  it("distinguishes a computation error from a worker startup error", async () => {
    class FakeWorker {
      static last: FakeWorker;
      onmessage?: (event: { data: unknown }) => void;
      onerror?: () => void;
      constructor() { FakeWorker.last = this; }
      terminate = vi.fn();
      postMessage = vi.fn();
    }
    vi.stubGlobal("Worker", FakeWorker);
    const computation = runCalculation("calculate", "=1", []);
    FakeWorker.last.onmessage?.({ data: { id: 1, error: "Computation failed" } });
    await expect(computation).rejects.toThrow("Computation failed");
    const startup = runCalculation("calculate", "=1", []);
    FakeWorker.last.onerror?.();
    await expect(startup).rejects.toMatchObject({ code: "start" });
  });
});
