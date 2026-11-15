import { createResultId } from "../learning/result-id";
import { initialTrial, restoreTrial, type Submission, type TrialState } from "./model";

const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const time = (value?: string) => value ? Date.parse(value) || 0 : 0;
const hints = (values: readonly string[]) => ["revenue", "conversion", "judgment"].filter(value => values.includes(value));
export const trialGeneration = (state: TrialState) => state.generation ?? state.scenario.seed;

function nextEdit(...after: (string | undefined)[]): string {
  return new Date(Math.min(8_640_000_000_000_000, Math.max(Date.now(), ...after.map(value => time(value) + 1)))).toISOString();
}

function draftKey(state: TrialState): string {
  // Merged history and hints must not change which original draft wins a tie.
  return JSON.stringify({ stage: state.stage, scenario: state.scenario, answers: state.answers,
    active: state.active, startedAt: state.startedAt });
}

function normalizedSubmission(result: Submission, state: TrialState): Submission {
  return { ...result, generation: result.generation ?? result.snapshot?.scenario.seed ?? trialGeneration(state) };
}

function submissionKey(result: Submission): string {
  if (result.id) return `id:${result.id}`;
  // Keep legacy payloads readable without inventing random IDs on every load.
  return `legacy:${submissionBodyKey(result)}`;
}

function submissionBodyKey(result: Submission): string {
  const { snapshot, ...body } = result;
  const { hints: _hints, ...snapshotBody } = snapshot ?? {};
  return JSON.stringify({ ...body, ...(snapshot ? { snapshot: snapshotBody } : {}) });
}

function mergeSubmission(a: Submission, b: Submission): Submission {
  const base = lexical(submissionBodyKey(a), submissionBodyKey(b)) >= 0 ? a : b;
  if (!base.snapshot) return base;
  return { ...base, snapshot: { ...base.snapshot, hints: hints([...(a.snapshot?.hints ?? []), ...(b.snapshot?.hints ?? [])]) } };
}

export function mergeTrial(a: TrialState, b: TrialState): TrialState {
  const aGeneration = trialGeneration(a), bGeneration = trialGeneration(b);
  const ordering = aGeneration - bGeneration || time(a.updatedAt) - time(b.updatedAt) || lexical(draftKey(a), draftKey(b));
  const draft = ordering >= 0 ? a : b;
  const generation = trialGeneration(draft);
  const byId = new Map<string, Submission>();
  for (const state of [a, b]) {
    const occurrences = new Map<string, number>();
    for (const source of state.submissions) {
      const result = normalizedSubmission(source, state);
      const identity = submissionKey(result);
      const occurrence = occurrences.get(identity) ?? 0;
      occurrences.set(identity, occurrence + 1);
      // Exact duplicate legacy records were previously allowed; keep their count.
      const key = result.id ? identity : `${identity}:${occurrence}`;
      const existing = byId.get(key);
      byId.set(key, existing ? mergeSubmission(existing, result) : result);
    }
  }
  // Retention remains 50 reviews. As with learning history, payloads beyond
  // retention cannot be recovered or reconciled after they have been removed.
  const submissions = [...byId.entries()].sort(([aKey, left], [bKey, right]) =>
    left.generation! - right.generation! || time(left.recordedAt ?? left.at) - time(right.recordedAt ?? right.at)
    || lexical(aKey, bKey)).slice(-50).map(([, result]) => result);
  return { ...draft, generation, submissions,
    hints: hints([...(aGeneration === generation ? a.hints : []), ...(bGeneration === generation ? b.hints : [])]),
  };
}

export function mergeTrialJSON(current: string | null, incoming: string): string {
  return JSON.stringify(mergeTrial(restoreTrial(current), restoreTrial(incoming)));
}

export function editTrial(previous: TrialState, next: TrialState): TrialState {
  return { ...next, generation: trialGeneration(next), updatedAt: nextEdit(previous.updatedAt, next.updatedAt) };
}

export function freshTrial(previous: TrialState): TrialState {
  const normalized = mergeTrial(previous, previous);
  return editTrial(previous, { ...initialTrial((previous.scenario.seed + 1) % 1_000_000),
    generation: trialGeneration(previous) + 1, submissions: normalized.submissions,
    stage: "work", startedAt: new Date().toISOString(),
  });
}

export function completedTrial(source: TrialState, result: Submission, submittedAt: string): TrialState {
  const submitted: Submission = { ...result, id: result.id ?? createResultId(), generation: trialGeneration(source), recordedAt: submittedAt,
    ...(result.snapshot ? { snapshot: { ...result.snapshot, hints: hints([...result.snapshot.hints, ...source.hints]) } } : {}),
  };
  return { ...source, generation: trialGeneration(source), stage: "result", updatedAt: submittedAt,
    submissions: [...source.submissions, submitted] };
}

export function currentTrialSubmissions(state: TrialState): Submission[] {
  return state.submissions.filter(result => normalizedSubmission(result, state).generation === trialGeneration(state));
}
