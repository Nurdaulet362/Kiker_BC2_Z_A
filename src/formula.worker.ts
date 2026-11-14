import { calculate, verify } from "./formula";
import type { Order } from "./model";
self.onmessage = (
  event: MessageEvent<{
    id: number;
    type: "calculate" | "verify";
    formula: string;
    rows: Order[];
  }>,
) => {
  const { id, type, formula, rows } = event.data;
  const result =
    type === "verify" ? verify(formula, rows) : calculate(formula, rows);
  self.postMessage({ id, result });
};
