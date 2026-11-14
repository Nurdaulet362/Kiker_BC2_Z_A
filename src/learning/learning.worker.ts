import { formulaIssue } from "../formula-errors";
import { evaluateLesson, previewLessonValue } from "./engine";
import type { LessonInput, Row } from "./model";

self.onmessage = (event: MessageEvent<{ type: "grade"; input: LessonInput } | { type: "preview"; lessonId: string; rows: Row[]; formula: string }>) => {
  try {
    const message = event.data;
    self.postMessage({ result: message.type === "grade" ? evaluateLesson(message.input) : previewLessonValue(message.lessonId, message.rows, message.formula) });
  } catch (error) {
    self.postMessage(formulaIssue(error));
  }
};
