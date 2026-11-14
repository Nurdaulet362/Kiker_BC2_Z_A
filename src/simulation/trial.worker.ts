import { formulaIssue } from "../formula-errors";
import { assess, preview } from "./evaluate";
import type { Answers, Scenario } from "./model";
self.onmessage = (
  event: MessageEvent<{
    type: "preview" | "assess";
    scenario: Scenario;
    answers: Answers;
    seconds: number;
  }>,
) => {
  try {
    const { type, scenario, answers, seconds } = event.data;
    self.postMessage({
      result:
        type === "preview"
          ? preview(scenario, answers)
          : assess(scenario, answers, seconds),
    });
  } catch (error) {
    self.postMessage({
      ...formulaIssue(error),
    });
  }
};
