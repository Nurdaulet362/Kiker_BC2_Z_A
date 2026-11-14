import { describe, expect, it } from "vitest";
import { chooseChannel } from "../src/decision";
import { bestChannel, initialTrial, validateScenario } from "../src/simulation/model";
import { evaluateLesson, expectedDecision, previewLessonValue } from "../src/learning/engine";
import { LESSONS, beginLesson, getLesson, initialDraft, initialLearning, isLessonComplete, normalizeRows, parseCellNumber, recommendLesson, restoreLearning, shuffleOptions, validateLessonRows, type LessonInput } from "../src/learning/model";

function solution(id: string): LessonInput {
  const lesson = getLesson(id);
  return { ...initialDraft(id), lessonId: id, formula: lesson.solution, diagnosis: lesson.correctDiagnosis, decision: lesson.correctDecision ?? "", transfer: lesson.transfer.correct };
}

describe("adaptive learning cases", () => {
  it("preserves a draft seed and a monotonic attempt counter after history eviction", () => {
    const id = "revenue-cancelled";
    const state = initialLearning();
    state.attempts[id] = 120;
    const current = beginLesson(state, id);
    expect(current.drafts[id].attempt).toBe(121);
    expect(current.attempts[id]).toBe(121);
    const resumed = restoreLearning(JSON.stringify({ ...current, results: [] }));
    expect(beginLesson(resumed, id).drafts[id].attempt).toBe(121);
    delete resumed.drafts[id];
    expect(beginLesson(resumed, id).drafts[id].attempt).toBe(122);

    const legacy = JSON.parse(JSON.stringify({ ...initialLearning(), results: [evaluateLesson(solution(id))], drafts: { [id]: initialDraft(id) } }));
    delete legacy.attempts;
    delete legacy.drafts[id].attempt;
    const restored = restoreLearning(JSON.stringify(legacy));
    expect(restored.drafts[id].attempt).toBe(2);
    expect(restored.attempts[id]).toBe(2);
  });
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
          expect(breakdown.diagnosis + breakdown.repair + breakdown.transfer, `${lesson.id}, hint level ${hintLevel}`).toBe(result.score);
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
  it("checks both decision engines against an independent exact integer-cent oracle on 1000 pairs", () => {
    let seed = 362;
    const cents = (maximum: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % (maximum + 1);
    };
    const money = (value: number) => `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
    const reference = (emailRevenue: number, emailSpend: number, adsRevenue: number, adsSpend: number): "email" | "ads" | "hold" => {
      const emailNet = BigInt(emailRevenue) - BigInt(emailSpend);
      const adsNet = BigInt(adsRevenue) - BigInt(adsSpend);
      if (emailSpend === 0) return adsSpend > 0 && adsNet > 0n ? "ads" : "hold";
      if (adsSpend === 0) return emailNet > 0n ? "email" : "hold";
      if (emailNet <= 0n && adsNet <= 0n) return "hold";
      const left = emailNet * BigInt(adsSpend);
      const right = adsNet * BigInt(emailSpend);
      return left === right ? "hold" : left > right ? "email" : "ads";
    };
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      let emailRevenue = cents(10_000_000), adsRevenue = cents(10_000_000);
      // With denominators <= 10,000 cents, distinct exact ratios differ by
      // at least 1e-8. The oracle needs no floating-point tolerance; the
      // production 1e-9 tie boundary is covered separately below.
      const emailSpend = i % 13 === 0 ? 0 : cents(10_000);
      const adsSpend = i % 11 === 0 ? 0 : cents(10_000);
      if (i % 17 === 0) { emailRevenue = emailSpend * 2; adsRevenue = adsSpend * 2; }
      if (i % 19 === 0) { emailRevenue = Math.floor(emailSpend / 2); adsRevenue = Math.floor(adsSpend / 2); }
      const scenario = initialTrial().scenario;
      scenario.orders = [
        { id: "E-1", channel: "Email", status: "Paid", amount: money(emailRevenue) },
        { id: "A-1", channel: "Ads", status: "Paid", amount: money(adsRevenue) },
      ];
      scenario.channels = [
        { name: "Email", leads: "1", spend: money(emailSpend) },
        { name: "Ads", leads: "1", spend: money(adsSpend) },
      ];
      expect(validateScenario(scenario)).toBeNull();
      const expected = reference(emailRevenue, emailSpend, adsRevenue, adsSpend);
      const winner = bestChannel(scenario);
      const normalized = winner === "Neither" ? "hold" : winner.toLowerCase();
      expect(normalized, `legacy pair ${i}`).toBe(expected);
      expect(expectedDecision([
        ["Email", emailRevenue / 100, emailSpend / 100, 1],
        ["Ads", adsRevenue / 100, adsSpend / 100, 1],
      ]), `learning pair ${i}`).toBe(expected);
      seen.add(expected);
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
  it.each(["en", "ru"] as const)("does not make the correct option longest in more than half the questions (%s)", language => {
    const groups = {
      diagnosis: LESSONS.map(lesson => ({ options: lesson.diagnosis, correct: lesson.correctDiagnosis })),
      transfer: LESSONS.map(lesson => ({ options: lesson.transfer.options, correct: lesson.transfer.correct })),
      decision: LESSONS.filter(lesson => lesson.decisionOptions).map(lesson => ({ options: lesson.decisionOptions!, correct: lesson.correctDecision! })),
    };
    for (const [kind, questions] of Object.entries({ ...groups, all: Object.values(groups).flat() })) {
      const longest = questions.filter(question => {
        const correct = question.options.find(option => option.id === question.correct);
        expect(correct).toBeDefined();
        // Equal lengths count as longest too; ties cannot hide the cue.
        return [...correct!.label[language]].length === Math.max(...question.options.map(option => [...option.label[language]].length));
      }).length;
      expect(longest * 2, `${language}/${kind}: ${longest}/${questions.length}`).toBeLessThanOrEqual(questions.length);
    }
  });
  it.each(["decisions-return", "decisions-hold"])("caps revealed decision repairs at 25/50 and prevents completion (%s)", lessonId => {
    const revealed = evaluateLesson({ ...solution(lessonId), hintLevel: 3 });
    expect(revealed.solutionRevealed).toBe(true);
    expect(revealed.breakdown).toEqual({ diagnosis: 20, repair: 25, transfer: 30 });
    expect(revealed.score).toBe(75);
    expect(isLessonComplete(revealed)).toBe(false);
    expect(isLessonComplete({ ...revealed, score: 100 })).toBe(false);
    const restored = restoreLearning(JSON.stringify({ ...initialLearning(), results: [revealed] })).results[0];
    expect(restored).toEqual(revealed);
    expect(isLessonComplete(restored)).toBe(false);

    const withoutReveal = evaluateLesson({ ...solution(lessonId), hintLevel: 2 });
    expect(withoutReveal.solutionRevealed).toBe(false);
    expect(withoutReveal.breakdown?.repair).toBe(50);
    expect(isLessonComplete(withoutReveal)).toBe(true);
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
    state.attempts["revenue-cancelled"] = 1;
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
    state.attempts[input.lessonId] = 1;
    input.rows[0][2] = 999;
    expect(state.results[0].snapshot?.rows[0][2]).toBe(480);
    expect(restoreLearning(JSON.stringify(state))).toEqual(state);
    for (const raw of ["{broken", "null", "{}", JSON.stringify({ ...state, version: 1 }), JSON.stringify({ ...state, results: {} })]) expect(restoreLearning(raw)).toEqual(initialLearning());
    expect(restoreLearning(JSON.stringify({ ...state, results: [{ lessonId: "unknown", score: 100 }] })).results).toEqual([]);
  });
});
