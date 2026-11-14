import { describe, expect, it } from "vitest";
import { chooseChannel } from "../src/decision";
import { bestChannel, initialTrial, validateScenario } from "../src/simulation/model";
import { evaluateLesson, expectedDecision, previewLessonValue } from "../src/learning/engine";
import { LESSONS, getLesson, initialDraft, initialLearning, isLessonComplete, normalizeRows, parseCellNumber, recommendLesson, restoreLearning, shuffleOptions, validateLessonRows, type LessonInput } from "../src/learning/model";

function solution(id: string): LessonInput {
  const lesson = getLesson(id);
  return { ...initialDraft(id), lessonId: id, formula: lesson.solution, diagnosis: lesson.correctDiagnosis, decision: lesson.correctDecision ?? "", transfer: lesson.transfer.correct };
}

describe("adaptive learning cases", () => {
  it("persists score components that add up for correct, partial, incorrect and assisted attempts", () => {
    for (const lesson of LESSONS) {
      for (const hintLevel of [0, 2, 3] as const) {
        const correct = { ...solution(lesson.id), hintLevel };
        for (const input of [
          correct,
          { ...correct, formula: lesson.initialFormula, decision: "", transfer: "", diagnosis: "" },
          { ...correct, formula: "=1200", diagnosis: "" },
          { ...correct, transfer: "wrong" },
        ]) {
          const result = evaluateLesson(input);
          const breakdown = result.breakdown!;
          expect(breakdown.diagnosis + breakdown.repair + breakdown.transfer).toBe(result.score);
          expect(breakdown.diagnosis).toBe(result.diagnosisPassed ? 20 : 0);
          expect(breakdown.transfer).toBe(result.transferPassed ? 30 : 0);
          expect(Number.isInteger(breakdown.repair)).toBe(true);
          expect(breakdown.repair).toBeLessThanOrEqual(hintLevel === 3 ? 25 : 50);
          const state = { ...initialLearning(), results: [result] };
          expect(restoreLearning(JSON.stringify(state)).results[0].breakdown).toEqual(breakdown);
        }
      }
    }
  });
  it("retains legacy results without a breakdown and drops only an inconsistent breakdown", () => {
    const result = evaluateLesson(solution("revenue-cancelled"));
    const legacy = { ...result };
    delete legacy.breakdown;
    const inconsistent = { ...result, breakdown: { diagnosis: 20, repair: 49, transfer: 30 } };
    const restored = restoreLearning(JSON.stringify({ ...initialLearning(), results: [legacy, inconsistent, result] }));
    expect(restored.results).toEqual([legacy, result]);
  });
  it("agrees with the legacy decision on 1000 seeded pairs of channel revenues and spends", () => {
    let seed = 362;
    const amount = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return (seed % 10000001) / 100;
    };
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      let emailRevenue = amount(), adsRevenue = amount();
      const emailSpend = i % 13 === 0 ? 0 : amount();
      const adsSpend = i % 11 === 0 ? 0 : amount();
      if (i % 17 === 0) { emailRevenue = emailSpend * 2; adsRevenue = adsSpend * 2; }
      const scenario = initialTrial().scenario;
      scenario.orders = [
        { id: "E-1", channel: "Email", status: "Paid", amount: emailRevenue.toFixed(2) },
        { id: "A-1", channel: "Ads", status: "Paid", amount: adsRevenue.toFixed(2) },
      ];
      scenario.channels = [
        { name: "Email", leads: "1", spend: emailSpend.toFixed(2) },
        { name: "Ads", leads: "1", spend: adsSpend.toFixed(2) },
      ];
      expect(validateScenario(scenario)).toBeNull();
      const winner = bestChannel(scenario);
      const normalized = winner === "Neither" ? "hold" : winner.toLowerCase();
      expect(expectedDecision([
        ["Email", Number(emailRevenue.toFixed(2)), emailSpend, 1],
        ["Ads", Number(adsRevenue.toFixed(2)), adsSpend, 1],
      ]), `pair ${i}`).toBe(normalized);
      seen.add(normalized);
    }
    expect([...seen].sort()).toEqual(["ads", "email", "hold"]);
  });
  it("uses positive unrounded channel ratios and a 1e-9 tie tolerance", () => {
    const choose = (revenue: number, spend: number, otherRevenue: number, otherSpend: number) => chooseChannel([
      { name: "Email", revenue, spend },
      { name: "Ads", revenue: otherRevenue, spend: otherSpend },
    ]);
    expect(choose(1500, 500, 1800, 600)).toBe("hold");
    expect(choose(0, 0, 0, 0)).toBe("hold");
    expect(choose(900, 0, 1800, 600)).toBe("Ads");
    expect(choose(800, 1000, 1600, 2000)).toBe("hold");
    expect(choose(100.004, 100, 100, 100)).toBe("Email");
    expect(choose(1.0000000005, 1, 1, 1)).toBe("hold");
    expect(choose(2.0000000005, 1, 2, 1)).toBe("hold");
    expect(choose(2.000000002, 1, 2, 1)).toBe("Email");
    expect(chooseChannel([])).toBe("hold");
  });
  it("shuffles repeatably and distributes correct answers across every position", () => {
    for (const lesson of LESSONS) {
      expect(lesson.transfer.options).toHaveLength(4);
      for (const [kind, options, correct] of [
        ["diagnosis", lesson.diagnosis, lesson.correctDiagnosis],
        ["transfer", lesson.transfer.options, lesson.transfer.correct],
      ] as const) {
        const original = options.map(option => option.id);
        expect(new Set(original).size).toBe(options.length);
        const counts = Array<number>(options.length).fill(0);
        for (let attempt = 1; attempt <= 200; attempt += 1) {
          const seed = `${lesson.id}:${attempt}:${kind}`;
          const shuffled = shuffleOptions(options, seed);
          expect(shuffled).toEqual(shuffleOptions(options, seed));
          expect(shuffled.map(option => option.id).sort()).toEqual([...original].sort());
          counts[shuffled.findIndex(option => option.id === correct)] += 1;
        }
        expect(options.map(option => option.id)).toEqual(original);
        for (const count of counts) expect(count, `${lesson.id}/${kind}: ${counts}`).toBeGreaterThanOrEqual(30);
      }
      if (lesson.decisionOptions) expect(new Set(lesson.decisionOptions.map(option => option.id)).size).toBe(lesson.decisionOptions.length);
    }
  });
  it("limits repair credit and completion only when the full solution was revealed", () => {
    for (const lesson of LESSONS) {
      for (const hintLevel of [0, 1, 2, 3] as const) {
        const result = evaluateLesson({ ...solution(lesson.id), hintLevel });
        expect(result.score).toBe(hintLevel === 3 ? 75 : 100);
        expect(result.hintLevel).toBe(hintLevel);
        expect(result.solutionRevealed).toBe(hintLevel === 3);
        expect(result.snapshot?.hintLevel).toBe(hintLevel);
        expect(isLessonComplete(result)).toBe(hintLevel !== 3);
      }
      expect(lesson.hints).toHaveLength(3);
      if (lesson.kind === "formula") {
        for (const hint of lesson.hints.slice(0, 2)) {
          expect(hint.en).not.toContain(lesson.solution);
          expect(hint.ru).not.toContain(lesson.solution);
        }
      }
    }
    const state = initialLearning();
    state.results = [evaluateLesson({ ...solution("revenue-cancelled"), hintLevel: 3 })];
    expect(recommendLesson(state).lessonId).toBe("revenue-refunds");
    expect(isLessonComplete({ ...state.results[0], score: 100 })).toBe(false);
  });
  it("restores old hint-free drafts, results and snapshots as level zero", () => {
    const state = initialLearning();
    state.drafts["revenue-cancelled"] = initialDraft("revenue-cancelled");
    state.results = [evaluateLesson(solution("revenue-cancelled"))];
    const legacy = JSON.parse(JSON.stringify(state));
    delete legacy.drafts["revenue-cancelled"].hintLevel;
    delete legacy.results[0].hintLevel;
    delete legacy.results[0].solutionRevealed;
    delete legacy.results[0].snapshot.hintLevel;
    expect(restoreLearning(JSON.stringify(legacy))).toEqual(state);
    state.drafts["revenue-cancelled"].hintLevel = 3;
    state.results = [evaluateLesson({ ...solution("revenue-cancelled"), hintLevel: 3 })];
    expect(restoreLearning(JSON.stringify(state))).toEqual(state);
    expect(initialDraft("revenue-cancelled").hintLevel).toBe(0);
  });
  it("parses decimal and space-grouped numbers without guessing ambiguous separators", () => {
    for (const [raw, value] of [
      ["12,5", 12.5], ["12.5", 12.5], ["12.50", 12.5],
      ["1 000", 1000], ["1\u00a0000", 1000], ["1\u202f000", 1000],
      ["1000", 1000], [" 2 300,25 ", 2300.25], ["0", 0],
    ] as const) expect(parseCellNumber(raw), raw).toEqual({ value });
    for (const raw of ["1,000", "1.000", "2,300"])
      expect(parseCellNumber(raw), raw).toEqual({ error: "ambiguous" });
    for (const raw of ["", " ", "1,000,000", "1.000,50", "12abc", "1e3", "12.", "12,", "-1"])
      expect(parseCellNumber(raw), raw).toEqual({ error: "invalid" });
    const lesson = getLesson("revenue-cancelled");
    const rows = initialDraft(lesson.id).rows;
    rows[2][2] = "2,300";
    expect(validateLessonRows(lesson, rows)).toMatch(/without a thousands separator/);
    expect(() => evaluateLesson({ ...solution(lesson.id), rows })).toThrow(/without a thousands separator/);
  });
  it("verifies every intended solution against its report and independent edge cases", () => {
    for (const lesson of LESSONS) {
      const result = evaluateLesson(solution(lesson.id));
      expect(result.score, lesson.id).toBe(100);
      expect(result.repairPassed, lesson.id).toBe(true);
      expect(result.checks.filter((check) => !check.passed), lesson.id).toEqual([]);
      if (lesson.kind === "formula") expect(result.checks.length).toBeGreaterThanOrEqual(6);
    }
  });
  it("reproduces the initial error in each formula case", () => {
    const expected = [2030, 0.3, 1100, 0.1];
    const formulaLessons = LESSONS.filter((lesson) => lesson.kind === "formula");
    formulaLessons.forEach((lesson, i) => {
      expect(previewLessonValue(lesson.id, lesson.rows, lesson.initialFormula).value).toBeCloseTo(expected[i]);
      expect(evaluateLesson({ ...solution(lesson.id), formula: lesson.initialFormula }).repairPassed).toBe(false);
    });
  });
  it("rejects memorized totals, short ranges, incorrect refunds and an average of rates", () => {
    for (const [id, formula] of [
      ["revenue-cancelled", "=1200"],
      ["revenue-cancelled", '=SUMIF(B2:B6,"Paid",C2:C6)'],
      ["revenue-cancelled", '=SUMIF(B2:B50,"Paid",C2:C50)'],
      ["revenue-cancelled", '=SUMIF(B2:B101,"<>Cancelled",C2:C101)'],
      ["revenue-refunds", '=SUMIF(B2:B101,"Paid",C2:C101)-SUM(D2:D101)'],
      ["conversion-weighted", "=AVERAGE(D2:D3)"],
      ["conversion-growth", "=SUM(C2:C4)/SUM(B2:B4)"],
      ["conversion-growth", '=IF(SUM(B2:B50)=0,"N/A",SUM(C2:C50)/SUM(B2:B50))'],
      ["conversion-growth", "=SUM(C2:C101)/SUM(B2:B101)"],
    ]) expect(evaluateLesson({ ...solution(id), formula }).repairPassed, formula).toBe(false);
  });
  it("accepts behaviorally equivalent formulas, preserving formula independence", () => {
    expect(evaluateLesson({ ...solution("revenue-cancelled"), formula: '=ROUND(SUMIF($B$2:$B$101,"Paid",$C$2:$C$101),2)' }).score).toBe(100);
    expect(evaluateLesson({ ...solution("conversion-weighted"), formula: '=IFERROR(SUM(C2:C101)/SUM(B2:B101),"N/A")' }).score).toBe(100);
  });
  it("responds to edits and validates impossible input data before grading", () => {
    const input = solution("revenue-cancelled");
    input.rows[2][2] = 999999;
    expect(previewLessonValue(input.lessonId, input.rows, input.formula).value).toBe(1200);
    input.rows[0][2] = 100;
    expect(previewLessonValue(input.lessonId, input.rows, input.formula).value).toBe(820);
    const refunds = solution("revenue-refunds");
    refunds.rows[0][3] = 501;
    expect(() => evaluateLesson(refunds)).toThrow(/refund/);
    const conversion = solution("conversion-weighted");
    conversion.rows[0][1] = 2;
    expect(validateLessonRows(getLesson(conversion.lessonId), conversion.rows)).toMatch(/Sales/);
    conversion.rows[0][1] = NaN;
    expect(() => evaluateLesson(conversion)).toThrow();
    expect(normalizeRows(getLesson(conversion.lessonId), [["Ads", 100, 5, 0.9]])[0][3]).toBe(0.05);
  });
  it("scores decisions from edited evidence, and holds for ties, losses and zero spend", () => {
    const input = solution("decisions-return");
    input.rows[0][2] = 2000;
    expect(evaluateLesson(input).repairPassed).toBe(false);
    expect(evaluateLesson({ ...input, decision: "ads" }).repairPassed).toBe(true);
    expect(expectedDecision([["Email", 1500, 500, 10], ["Ads", 1800, 600, 20]])).toBe("hold");
    expect(expectedDecision([["Email", 0, 0, 0], ["Ads", 0, 0, 0]])).toBe("hold");
    expect(expectedDecision([["Email", 900, 0, 10], ["Ads", 1800, 600, 20]])).toBe("ads");
    expect(evaluateLesson(solution("decisions-hold")).score).toBe(100);
  });
  it("routes a mistake to a new case in the weak skill and respects the chosen goal", () => {
    const state = initialLearning();
    expect(recommendLesson(state).lessonId).toBe("revenue-cancelled");
    state.results.push(evaluateLesson({ ...solution("conversion-weighted"), formula: "=0" }));
    expect(recommendLesson(state).lessonId).toBe("conversion-growth");
    state.goal = "decisions";
    expect(recommendLesson(state).lessonId).toBe("decisions-return");
    state.goal = "all";
    state.results = [evaluateLesson(solution("revenue-cancelled"))];
    expect(recommendLesson(state).lessonId).toBe("conversion-weighted");
  });
  it("recommends more practice when transfer fails or one edge case fails despite a high score", () => {
    const state = initialLearning();
    state.results.push(evaluateLesson({ ...solution("revenue-cancelled"), transfer: "1250" }));
    expect(state.results[0].repairPassed).toBe(true);
    expect(state.results[0].transferPassed).toBe(false);
    expect(recommendLesson(state).lessonId).toBe("revenue-refunds");
    state.results = [evaluateLesson({ ...solution("revenue-cancelled"), formula: '=SUMIF(B2:B50,"Paid",C2:C50)' })];
    expect(state.results[0].score).toBeGreaterThanOrEqual(80);
    expect(state.results[0].repairPassed).toBe(false);
    expect(recommendLesson(restoreLearning(JSON.stringify(state))).lessonId).toBe("revenue-refunds");
  });
  it("persists valid progress and snapshots independently from later edits", () => {
    const state = initialLearning();
    const input = solution("revenue-cancelled");
    state.results.push(evaluateLesson(input));
    state.drafts[input.lessonId] = initialDraft(input.lessonId);
    input.rows[0][2] = 999;
    expect(state.results[0].snapshot?.rows[0][2]).toBe(480);
    expect(restoreLearning(JSON.stringify(state))).toEqual(state);
    for (const raw of ["{broken", "null", "{}", JSON.stringify({ ...state, version: 1 }), JSON.stringify({ ...state, results: {} })]) expect(restoreLearning(raw)).toEqual(initialLearning());
    expect(restoreLearning(JSON.stringify({ ...state, results: [{ lessonId: "unknown", score: 100 }] })).results).toEqual([]);
  });
});
