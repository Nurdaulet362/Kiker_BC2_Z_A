import { handleFormulaRequest } from "./formula-worker-handler";

self.onmessage = (event: MessageEvent) => {
  self.postMessage(handleFormulaRequest(event.data));
};
