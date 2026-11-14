import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL });
try {
  const page = await browser.newPage();
  await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173/");
  const measurement = await page.evaluate(async () => {
    const storage = await import("/src/session-storage.ts");
    const model = await import("/src/learning/model.ts");
    const { evaluateLesson } = await import("/src/learning/engine.ts");
    const { mergeLearningJSON } = await import("/src/learning/persistence.ts");
    const templates = model.LESSONS.map(lesson => evaluateLesson({
      ...model.initialDraft(lesson.id), lessonId: lesson.id, formula: lesson.solution,
      diagnosis: lesson.correctDiagnosis, decision: lesson.correctDecision ?? "", transfer: lesson.transfer.correct,
    }));
    const state = model.initialLearning();
    state.results = Array.from({ length: 100 }, (_, index) => ({
      ...structuredClone(templates[index % templates.length]), id: `benchmark-${String(index).padStart(3, "0")}`,
      at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    }));
    state.drafts["revenue-cancelled"] = model.initialDraft("revenue-cancelled", 101);
    state.attempts["revenue-cancelled"] = 101;
    const key = "fix-the-report.benchmark";
    storage.configureSessionItem(key, { version: 2, merge: mergeLearningJSON });
    const initial = JSON.stringify(state);
    localStorage.setItem(key, initial);
    const durations = [];
    // Serialization of the caller state is deliberately outside the measured API.
    for (let iteration = -20; iteration < 200; iteration += 1) {
      state.drafts["revenue-cancelled"].formula = `=${iteration + 1000}`;
      state.drafts["revenue-cancelled"].updatedAt = new Date(Date.now() + iteration + 20).toISOString();
      const value = JSON.stringify(state);
      const before = performance.now();
      storage.setSessionItem(key, value);
      const elapsed = performance.now() - before;
      if (iteration >= 0) durations.push(elapsed);
    }
    const flushStart = performance.now();
    storage.flushSessionItems();
    const flushMs = performance.now() - flushStart;
    localStorage.removeItem(key);
    durations.sort((a, b) => a - b);
    return {
      samples: durations.length, warmup: 20, results: state.results.length,
      snapshots: state.results.filter(result => result.snapshot).length,
      serializedBytes: new TextEncoder().encode(initial).length,
      flushMs,
      meanMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianMs: durations[Math.floor(durations.length * 0.5)],
      p95Ms: durations[Math.floor(durations.length * 0.95)], maxMs: durations.at(-1),
      userAgent: navigator.userAgent,
    };
  });
  console.log(JSON.stringify(measurement, null, 2));
} finally {
  await browser.close();
}
