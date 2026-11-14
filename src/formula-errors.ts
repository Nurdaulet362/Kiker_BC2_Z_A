export type FormulaErrorCode =
  | "syntax"
  | "range"
  | "function"
  | "arguments"
  | "shape"
  | "result"
  | "length"
  | "prefix"
  | "timeout"
  | "start";

export type FormulaIssue = {
  error: string;
  code?: FormulaErrorCode;
  params?: Record<string, string | number>;
};

export type FormulaFailure = FormulaIssue & { code: FormulaErrorCode };

type Language = "en" | "ru";
type Parameters = NonNullable<FormulaIssue["params"]>;
type Message = (params: Parameters) => string;

const messages: Record<Language, Record<FormulaErrorCode, Message>> = {
  en: {
    syntax: () => "Could not calculate this formula. Check the function, commas, quotes and matching parentheses.",
    range: ({ end }) => `Use ranges through row 101, for example C2:C101. Use cells from A1 to ${end ?? "C101"}; this exercise has room for 100 data rows.`,
    function: ({ fn }) => `${fn ?? "This function"} is outside this exercise. Try SUMIF, SUM or IF.`,
    arguments: ({ fn }) => `${fn ?? "This function"} needs ${fn === "SUMIFS" ? "a sum range followed by " : ""}one or more range/criterion pairs. Use cell references for ranges and fill every argument.`,
    shape: ({ fn }) => `${fn ?? "This function"} ranges must have the same number of rows and columns.`,
    result: () => "Your formula needs to return one number, or the text N/A when the brief requires it.",
    length: () => "Keep your formula under 1,000 characters.",
    prefix: () => "Start your formula with =, for example =SUM(C2:C101).",
    timeout: () => "That formula took too long. Simplify it and try again.",
    start: () => "Could not start the report checker. Reload and try again; your work stays saved in this browser.",
  },
  ru: {
    syntax: () => "Не удалось вычислить формулу. Проверьте функцию, запятые, кавычки и парные скобки.",
    range: ({ end }) => `Используйте диапазоны до строки 101, например C2:C101. Допустимые ячейки: от A1 до ${end ?? "C101"}; в задании 100 строк данных.`,
    function: ({ fn }) => `${fn ? `Функция ${fn}` : "Эта функция"} недоступна в задании. Попробуйте SUMIF, SUM или IF.`,
    arguments: ({ fn }) => `${fn ?? "Функция"}: ${fn === "SUMIFS" ? "сначала укажите диапазон сумм, затем " : "укажите "}одну или несколько пар «диапазон, условие». Используйте ссылки на ячейки для диапазонов и заполните все аргументы.`,
    shape: ({ fn }) => `Диапазоны ${fn ?? "функции"} должны иметь одинаковое число строк и столбцов.`,
    result: () => "Формула должна возвращать одно число или текст N/A, если это требуется в условии.",
    length: () => "Формула должна содержать не более 1000 символов.",
    prefix: () => "Начните формулу со знака =, например =SUM(C2:C101).",
    timeout: () => "Время ожидания расчёта истекло. Упростите формулу и попробуйте ещё раз.",
    start: () => "Не удалось запустить проверку отчёта. Перезагрузите страницу и попробуйте ещё раз; ваша работа сохранена в этом браузере.",
  },
};

function isFormulaErrorCode(value: unknown): value is FormulaErrorCode {
  return typeof value === "string" && Object.hasOwn(messages.en, value);
}

function validParams(value: unknown): Parameters | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).filter((entry): entry is [string, string | number] =>
    typeof entry[1] === "string" || (typeof entry[1] === "number" && Number.isFinite(entry[1])),
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function formulaFailure(code: FormulaErrorCode, params?: Parameters): FormulaFailure {
  return { error: messages.en[code](params ?? {}), code, ...(params ? { params } : {}) };
}

export function localizeFormulaError(issue: FormulaIssue, language: Language): string {
  return isFormulaErrorCode(issue.code)
    ? messages[language][issue.code](issue.params ?? {})
    : issue.error;
}

export function formulaIssue(error: unknown): FormulaIssue {
  const fallback = messages.en.syntax({});
  if (!error || typeof error !== "object") return { error: fallback };
  const value = error as { error?: unknown; code?: unknown; params?: unknown };
  const message = error instanceof Error ? error.message : value.error;
  const params = validParams(value.params);
  return {
    error: typeof message === "string" && message ? message : fallback,
    ...(isFormulaErrorCode(value.code) ? { code: value.code } : {}),
    ...(params ? { params } : {}),
  };
}

export class FormulaWorkerError extends Error {
  readonly code: FormulaErrorCode;

  constructor(code: FormulaErrorCode) {
    super(messages.en[code]({}));
    this.name = "FormulaWorkerError";
    this.code = code;
  }
}
