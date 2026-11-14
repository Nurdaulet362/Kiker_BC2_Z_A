import { formulaIssue, type FormulaIssue } from "./formula-errors";
import { useErrorTranslation } from "./i18n";
import {
  feedback,
  LanguageSwitcher,
  LocalizedText,
  useTranslation,
} from "./i18n";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileSpreadsheet,
  FlaskConical,
  Lightbulb,
  LoaderCircle,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";
import {
  CORRECT_EXAMPLE,
  ORIGINAL_FORMULA,
  STORAGE_KEY,
  expectedRevenue,
  initialProgress,
  money,
  restoreProgress,
  validateRows,
  type Evidence,
  type Order,
  type Progress,
  type Status,
} from "./model";
import type { Calculation, Check as FormulaCheck } from "./formula";
import { runCalculation } from "./worker-client";
import { configureSessionItem, getSessionItem, setSessionItem, subscribeSaveStatus } from "./session-storage";

type Inspection = { kind: "match" | "found" | "error"; message: string };
const hints = [
  "The brief says paid orders. What should happen to the total if an order is cancelled?",
  "Try adding a $300 order with status Cancelled. Compare the report total with the sum of the Paid rows.",
  'SUMIF checks a condition before adding a value. Use column B for the status, "Paid" as the condition, and column C for the amount.',
];

export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const t = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={close}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
      className="modal"
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          aria-label={t("Close dialog")}
          className="icon-button"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <FileSpreadsheet size={23} strokeWidth={1.8} />
      </span>
      <span>
        fix the report<span className="brand-period">.</span>
      </span>
    </div>
  );
}

configureSessionItem(STORAGE_KEY, { version: 1 });

export function App() {
  const t = useTranslation();
  const errorText = useErrorTranslation();
  const [progress, setProgress] = useState<Progress>(() => {
    try {
      return restoreProgress(getSessionItem(STORAGE_KEY));
    } catch {
      return initialProgress();
    }
  });
  const [saveError, setSaveError] = useState(false);
  useEffect(() => subscribeSaveStatus(STORAGE_KEY, setSaveError), []);
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [calculating, setCalculating] = useState(true);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [checks, setChecks] = useState<FormulaCheck[] | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<FormulaIssue | null>(null);
  const [dialog, setDialog] = useState<"help" | "reset" | "review" | null>(
    () =>
      new URLSearchParams(location.search).has("review") ? "review" : null,
  );
  const [formulaHelp, setFormulaHelp] = useState(false);
  const formulaRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const verificationController = useRef<AbortController | null>(null);
  const { rows, stage, formula, evidence } = progress;
  const activeFormula = stage === "investigate" ? ORIGINAL_FORMULA : formula;
  const rowError = validateRows(rows);
  const expected = rowError ? null : expectedRevenue(rows);
  const paidCount = rows.filter((row) => row.status === "Paid").length;
  const cancelledCount = rows.filter(
    (row) => row.status === "Cancelled",
  ).length;

  useEffect(() => {
    try {
      setSessionItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      setSaveError(true);
    }
  }, [progress]);

  useEffect(() => {
    const controller = new AbortController();
    setCalculating(true);
    const timer = setTimeout(() => {
      runCalculation("calculate", activeFormula, rows, controller.signal)
        .then((result) => {
          setCalculation(result);
          setCalculating(false);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setCalculation(formulaIssue(error));
            setCalculating(false);
          }
        });
    }, 160);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeFormula, rows]);

  useEffect(() => () => verificationController.current?.abort(), []);
  useEffect(() => {
    if (stage !== "investigate") headingRef.current?.focus();
  }, [stage]);

  function editRows(nextRows: Order[]) {
    setProgress((state) => ({ ...state, rows: nextRows }));
    setInspection(null);
    setChecks(null);
    setVerifyError(null);
  }
  function updateOrder(index: number, change: Partial<Order>) {
    editRows(
      rows.map((row, position) =>
        position === index ? { ...row, ...change } : row,
      ),
    );
  }
  function addOrder() {
    const nextId =
      Math.max(
        1040,
        ...rows.map((row) => Number(row.id.replace("ORD-", "")) || 0),
      ) + 1;
    editRows([...rows, { id: `ORD-${nextId}`, status: "Paid", amount: "300" }]);
  }
  function inspect() {
    if (calculation?.value === undefined || expected === null) return;
    if (Math.abs(calculation.value - expected) < 0.005) {
      setInspection({
        kind: "match",
        message: t(
          "These numbers agree. Try a valid order that should be excluded from paid revenue, then test again.",
        ),
      });
      return;
    }
    const found: Evidence = {
      reported: calculation.value,
      expected,
      rows: structuredClone(rows),
    };
    setProgress((state) => ({ ...state, evidence: found }));
    setInspection({
      kind: "found",
      message: t(
        "You found a counterexample. The formula includes money that does not belong in paid revenue.",
      ),
    });
  }
  function startRepair() {
    setProgress((state) => ({ ...state, stage: "repair" }));
    setInspection(null);
  }
  async function verifyFormula() {
    setVerifying(true);
    setVerifyError(null);
    setChecks(null);
    const controller = new AbortController();
    verificationController.current = controller;
    setProgress((state) => ({ ...state, attempts: state.attempts + 1 }));
    try {
      const result = await runCalculation(
        "verify",
        formula,
        rows,
        controller.signal,
      );
      setChecks(result);
      if (result.every((check) => check.passed)) {
        setProgress((state) => ({
          ...state,
          stage: "complete",
          completedAt: new Date().toISOString(),
        }));
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError")
        setVerifyError(formulaIssue(error));
    } finally {
      setVerifying(false);
    }
  }
  function reset() {
    verificationController.current?.abort();
    setProgress(initialProgress());
    setInspection(null);
    setChecks(null);
    setVerifyError(null);
    setDialog(null);
    setFormulaHelp(false);
  }
  function retry() {
    reset();
    setProgress((state) => ({
      ...state,
      rows: state.rows.map((row) => ({
        ...row,
        amount: (Math.floor(Math.random() * 49000) + 1000) / 100 + "",
      })),
    }));
  }
  function closeDialog() {
    setDialog(null);
    if (new URLSearchParams(location.search).has("review"))
      history.replaceState(null, "", location.pathname);
  }

  const steps = [
    {
      title: t("Find the mistake"),
      description: t("Put the report to the test"),
      done: stage !== "investigate",
      current: stage === "investigate",
    },
    {
      title: t("Fix the formula"),
      description: t("Make the rule work"),
      done: stage === "complete",
      current: stage === "repair",
    },
    {
      title: t("Prove it works"),
      description: t("Check it against fresh data"),
      done: stage === "complete",
      current: false,
    },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-body">
          <div className="library-label">
            <BookOpen size={16} /> {t("Practice library")}{" "}
          </div>
          <div className="lesson-selected">
            <FileSpreadsheet size={19} />
            <div>
              <strong>{t("The cancelled order")}</strong>
              <span>{t("Revenue reporting")}</span>
            </div>
            <ChevronRight size={16} />
          </div>
          <div className="sidebar-divider" />
          <h2 className="sidebar-title">{t("Your path")}</h2>
          <ol className="steps">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className={`${step.current ? "current" : ""} ${step.done ? "done" : ""}`}
                aria-current={step.current ? "step" : undefined}
              >
                <span className="step-index">
                  {step.done ? <Check size={15} /> : index + 1}
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.description}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="learning-note">
            <ShieldCheck size={22} />
            <p>
              {t("A good report holds up")} <br />
              {t("when the data changes.")}{" "}
            </p>
          </div>
        </div>
        <div className="sidebar-footer">
          <span className="guest-avatar">Y</span>
          <div>
            <strong>{t("Your practice space")}</strong>
            <span>{t("Guest session · saved locally")}</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            {t("Practice")} <ChevronRight size={14} />
            <span>{t("The cancelled order")}</span>
          </div>
          <div className="topbar-actions">
            <LanguageSwitcher />
            <button className="text-button" onClick={() => setDialog("help")}>
              <CircleHelp size={17} /> {t("How it works")}{" "}
            </button>
          </div>
        </header>
        <div className="content">
          <a className="practice-return" href="#trial">
            <ArrowLeft size={14} />
            {t("Back to work simulations")}{" "}
          </a>
          {saveError && (
            <div role="status" className="notice warning">
              {t(
                "Your browser cannot save progress. Keep this tab open to continue your session.",
              )}{" "}
            </div>
          )}
          {stage === "complete" ? (
            <section className="completion">
              <div className="completion-check">
                <CheckCheck size={38} strokeWidth={1.6} />
              </div>
              <h1 ref={headingRef} tabIndex={-1}>
                {t("This report holds up.")}{" "}
              </h1>
              <p className="completion-lead">
                {t("You found the hidden mistake, repaired the formula,")}{" "}
                <br className="desktop-break" />{" "}
                {t("and passed 19 checks, including fresh data.")}{" "}
              </p>
              <div className="completed-report">
                <div className="completed-heading">
                  <FileSpreadsheet size={20} />
                  <strong>{t("The cancelled order")}</strong>
                  <span className="success-tag">
                    <Check size={14} /> {t("Completed")}{" "}
                  </span>
                </div>
                <div className="before-after">
                  <div>
                    <span>{t("Original report in your test")}</span>
                    <strong>{money(evidence!.reported)}</strong>
                  </div>
                  <ArrowRight size={22} />
                  <div>
                    <span>{t("Correct paid revenue")}</span>
                    <strong className="green-text">
                      {money(evidence!.expected)}
                    </strong>
                  </div>
                </div>
                <div className="formula-saved">
                  <span>{t("Your verified formula")}</span>
                  <code>{formula}</code>
                </div>
                <div className="completion-stats">
                  <span>
                    <ShieldCheck size={16} /> {t("19 checks passed")}{" "}
                  </span>
                  <span>
                    {t(
                      progress.attempts === 1 ? "{n} attempt" : "{n} attempts",
                      { n: progress.attempts },
                    )}
                  </span>
                  <span>
                    {t(
                      progress.hints === 1 ? "{n} hint used" : "{n} hints used",
                      { n: progress.hints },
                    )}
                  </span>
                </div>
              </div>
              <div className="takeaway">
                <h2>{t("Take this back to work")}</h2>
                <p>
                  {t(
                    "A total can look correct when every row has the same status. Add a row that should be excluded to test whether your formula follows the business rule.",
                  )}{" "}
                </p>
              </div>
              <div className="completion-actions">
                <button className="primary-button" onClick={retry}>
                  {t("Practice with new numbers")} <ArrowRight size={17} />
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setProgress((state) => ({
                      ...state,
                      stage: "repair",
                      completedAt: null,
                    }));
                    setChecks(null);
                  }}
                >
                  {t("Review my report")}{" "}
                </button>
              </div>
              <p className="completion-footnote">
                {t(
                  "Your result is saved in this browser. More report challenges are in development.",
                )}{" "}
              </p>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <h1 ref={headingRef} tabIndex={-1}>
                    {stage === "investigate"
                      ? t("The revenue that wasn’t.")
                      : t("Make the formula hold up.")}
                  </h1>
                  <p>
                    {stage === "investigate"
                      ? t(
                          "A plausible total. One overlooked detail. Can you find it?",
                        )
                      : t(
                          "You found the problem. Now teach the formula the business rule.",
                        )}
                  </p>
                </div>
                <span className="time-label">
                  <Clock3 size={16} /> {t("5 min practice")}{" "}
                </span>
              </div>
              <section className="brief" aria-labelledby="brief-title">
                <div className="brief-icon">
                  <BookOpen size={21} />
                </div>
                <div>
                  <h2 id="brief-title">{t("Your brief")}</h2>
                  <p>
                    <LocalizedText message="“Send me the total revenue from <paid>Paid</paid> orders. Exclude <cancelled>Cancelled</cancelled> and <pending>Pending</pending> orders.”" />
                  </p>
                  <span>{t("Prepared training example · amounts in USD")}</span>
                </div>
              </section>
              <div className="workspace">
                <section className="sheet-panel" aria-labelledby="sheet-title">
                  <div className="sheet-toolbar">
                    <h2 id="sheet-title">
                      <FileSpreadsheet size={19} /> {t("November orders")}{" "}
                    </h2>
                    <span>
                      {t(rows.length === 1 ? "{n} order" : "{n} orders", {
                        n: rows.length,
                      })}
                    </span>
                  </div>
                  <div className="formula-bar">
                    <span className="formula-symbol" aria-hidden="true">
                      ƒx
                    </span>
                    {stage === "investigate" ? (
                      <code>{ORIGINAL_FORMULA}</code>
                    ) : (
                      <label className="formula-editor">
                        <span className="sr-only">{t("Revenue formula")}</span>
                        <textarea
                          ref={formulaRef}
                          rows={2}
                          spellCheck={false}
                          value={formula}
                          disabled={verifying}
                          onChange={(event) => {
                            setProgress((state) => ({
                              ...state,
                              formula: event.target.value,
                            }));
                            setChecks(null);
                            setVerifyError(null);
                          }}
                          maxLength={1000}
                          aria-describedby="formula-instructions"
                        />
                      </label>
                    )}
                    <span className="formula-label">
                      {stage === "investigate"
                        ? t("Given formula")
                        : t("Your formula")}
                    </span>
                  </div>
                  {stage === "repair" && (
                    <p
                      className="formula-instructions"
                      id="formula-instructions"
                    >
                      {t(
                        "Edit the formula above. Status is column B. Amount is column C. Rows 2–101 are available.",
                      )}{" "}
                      {t(
                        "Use English function names, commas between arguments, and Paid, Cancelled or Pending for status values.",
                      )}{" "}
                    </p>
                  )}
                  <div className="table-wrap">
                    <table>
                      <caption className="sr-only">
                        {t(
                          "Editable orders. Only Paid orders count toward revenue.",
                        )}{" "}
                      </caption>
                      <colgroup>
                        <col className="row-col" />
                        <col className="id-col" />
                        <col className="status-col" />
                        <col className="amount-col" />
                        <col className="action-col" />
                      </colgroup>
                      <thead>
                        <tr className="column-letters">
                          <th aria-label={t("Row number")} />
                          <th>A</th>
                          <th>B</th>
                          <th>C</th>
                          <th />
                        </tr>
                        <tr className="table-labels">
                          <th>1</th>
                          <th scope="col">{t("Order ID")}</th>
                          <th scope="col">{t("Status")}</th>
                          <th scope="col" className="right">
                            {t("Amount (USD)")}{" "}
                          </th>
                          <th>
                            <span className="sr-only">{t("Remove")}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => (
                          <tr
                            key={row.id}
                            className={
                              row.status !== "Paid" ? "excluded-row" : ""
                            }
                          >
                            <th scope="row" className="row-number">
                              {index + 2}
                            </th>
                            <td className="order-id">{row.id}</td>
                            <td>
                              <span
                                className={`status-select ${row.status.toLowerCase()}`}
                              >
                                <select
                                  aria-label={t("Status for {id}", {
                                    id: row.id,
                                  })}
                                  value={row.status}
                                  disabled={verifying}
                                  onChange={(event) =>
                                    updateOrder(index, {
                                      status: event.target.value as Status,
                                    })
                                  }
                                >
                                  <option value="Paid">{t("Paid")}</option>
                                  <option value="Cancelled">
                                    {t("Cancelled")}
                                  </option>
                                  <option value="Pending">
                                    {t("Pending")}
                                  </option>
                                </select>
                                <ChevronDown size={12} aria-hidden="true" />
                              </span>
                            </td>
                            <td>
                              <input
                                className="amount-input"
                                inputMode="decimal"
                                aria-label={t("Amount for {id}", {
                                  id: row.id,
                                })}
                                value={row.amount}
                                disabled={verifying}
                                onChange={(event) =>
                                  updateOrder(index, {
                                    amount: event.target.value,
                                  })
                                }
                                maxLength={20}
                              />
                            </td>
                            <td>
                              <button
                                className="row-delete icon-button"
                                aria-label={t("Remove {id}", { id: row.id })}
                                disabled={verifying}
                                onClick={() =>
                                  editRows(
                                    rows.filter(
                                      (_, position) => index !== position,
                                    ),
                                  )
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows.length === 0 && (
                      <div className="empty-table">
                        {t(
                          "Your report is empty. Add an order to test the revenue calculation.",
                        )}{" "}
                      </div>
                    )}
                  </div>
                  <div className="table-bottom">
                    <button
                      className="add-button"
                      onClick={addOrder}
                      disabled={verifying || rows.length >= 100}
                    >
                      <Plus size={16} /> {t("Add order")}{" "}
                    </button>
                    <span>
                      {t("{n} paid", { n: paidCount })}
                      {cancelledCount > 0
                        ? ` · ${t("{n} cancelled", { n: cancelledCount })}`
                        : ""}
                    </span>
                  </div>
                  <div className="sheet-footer">
                    <span className="sheet-tab">
                      <FileSpreadsheet size={14} /> {t("Orders")}{" "}
                    </span>
                    <span>{t("Editable training data")}</span>
                  </div>
                </section>
                <aside className="inspector" aria-labelledby="result-title">
                  <div className="result-heading">
                    <h2 id="result-title">{t("Report total")}</h2>
                    <span className="live-indicator">
                      {calculating ? t("Calculating") : t("Live")}
                    </span>
                  </div>
                  <div
                    className={`report-total ${calculation?.error ? "error-total" : ""}`}
                    aria-live="polite"
                    aria-busy={calculating}
                  >
                    {calculating
                      ? "—"
                      : calculation?.error
                        ? t("Check your input")
                        : calculation?.value !== undefined
                          ? money(calculation.value)
                          : "—"}
                  </div>
                  <p className="result-description">
                    {stage === "investigate"
                      ? t("Calculated by the given formula.")
                      : t("Calculated by your current formula.")}
                  </p>
                  {calculation?.error && !calculating && (
                    <p className="inline-error" role="alert">
                      {errorText(calculation)}
                    </p>
                  )}
                  {stage === "investigate" ? (
                    <>
                      <div className="instruction">
                        <span className="instruction-icon">
                          <FlaskConical size={19} />
                        </span>
                        <div>
                          <h3>{t("Try to break the report")}</h3>
                          <p>
                            {t(
                              "Change a status or add an order. Can you make this total disagree with the brief?",
                            )}{" "}
                          </p>
                        </div>
                      </div>
                      <button
                        className="primary-button full"
                        disabled={
                          calculating ||
                          !!rowError ||
                          calculation?.value === undefined
                        }
                        onClick={inspect}
                      >
                        {t("Test the report")} <ArrowRight size={17} />
                      </button>
                      {inspection && (
                        <div
                          className={`inspection-result ${inspection.kind}`}
                          role="status"
                        >
                          <div className="feedback-title">
                            {inspection.kind === "found" ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <CircleAlert size={18} />
                            )}
                            <strong>
                              {inspection.kind === "found"
                                ? t("Mistake found")
                                : t("So far, so good")}
                            </strong>
                          </div>
                          <p>{t(inspection.message)}</p>
                          {inspection.kind === "found" && evidence && (
                            <>
                              <div className="evidence-line">
                                <span>{t("Paid revenue")}</span>
                                <strong>{money(evidence.expected)}</strong>
                              </div>
                              <div className="evidence-line">
                                <span>{t("Overcounted")}</span>
                                <strong>
                                  {money(evidence.reported - evidence.expected)}
                                </strong>
                              </div>
                              <button
                                className="primary-button full"
                                onClick={startRepair}
                              >
                                {t("Fix the formula")} <ArrowRight size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="business-total">
                        <span>{t("Expected paid revenue")}</span>
                        <strong>
                          {expected === null ? "—" : money(expected)}
                        </strong>
                      </div>
                      <div className="instruction">
                        <span className="instruction-icon">
                          <ShieldCheck size={19} />
                        </span>
                        <div>
                          <h3>{t("Prove your fix")}</h3>
                          <p>
                            {t(
                              "Run your formula against 19 checks, including new rows and different order statuses.",
                            )}{" "}
                          </p>
                        </div>
                      </div>
                      <button
                        className="primary-button full"
                        onClick={verifyFormula}
                        disabled={
                          verifying ||
                          calculating ||
                          !!rowError ||
                          calculation?.value === undefined
                        }
                      >
                        {verifying ? (
                          <>
                            <LoaderCircle className="spin" size={17} />{" "}
                            {t("Checking your formula…")}{" "}
                          </>
                        ) : (
                          <>
                            {t("Verify my formula")} <ArrowRight size={17} />
                          </>
                        )}
                      </button>
                      {verifyError && (
                        <p className="inline-error" role="alert">
                          {errorText(verifyError)}
                        </p>
                      )}
                      {checks && !checks.every((check) => check.passed) && (
                        <div className="verification-results" role="status">
                          <h3>
                            {t("{passed} of {total} checks passed", {
                              passed: checks.filter((check) => check.passed)
                                .length,
                              total: checks.length,
                            })}
                          </h3>
                          <p>
                            {t(
                              "Use the failed examples to improve your formula.",
                            )}{" "}
                          </p>
                          {checks
                            .filter((check) => !check.passed)
                            .slice(0, 4)
                            .map((check) => (
                              <div
                                className="failed-check"
                                key={feedback(t, check.name)}
                              >
                                <strong>
                                  <X size={14} /> {feedback(t, check.name)}
                                </strong>
                                <span>{feedback(t, check.description)}</span>
                                <span>
                                  {check.error
                                    ? errorText({ error: check.error, code: check.code, params: check.params })
                                    : t("Expected {expected} · got {actual}", {
                                        expected: money(check.expected),
                                        actual: money(check.actual!),
                                      })}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="hint-section">
                    <button
                      className="hint-button"
                      disabled={verifying || progress.hints >= 3}
                      onClick={() =>
                        setProgress((state) => ({
                          ...state,
                          hints: Math.min(state.hints + 1, 3),
                        }))
                      }
                    >
                      <Lightbulb size={17} />
                      <span>
                        {progress.hints === 0
                          ? t("Need a small hint?")
                          : progress.hints < 3
                            ? t("Show another hint")
                            : t("All hints revealed")}
                      </span>
                      <span className="hint-count">{progress.hints}/3</span>
                    </button>
                    {progress.hints > 0 && (
                      <p className="hint-copy" aria-live="polite">
                        {t(hints[progress.hints - 1])}
                      </p>
                    )}
                    {progress.hints === 3 && stage === "repair" && (
                      <code className="hint-formula">{CORRECT_EXAMPLE}</code>
                    )}
                  </div>
                </aside>
              </div>
              <div className="workspace-bottom">
                <p>
                  <ShieldCheck size={15} />{" "}
                  {t("Your changes stay in this browser.")}{" "}
                </p>
                <button
                  className="text-button"
                  disabled={verifying}
                  onClick={() => setDialog("reset")}
                >
                  <RotateCcw size={14} /> {t("Start over")}{" "}
                </button>
              </div>
              {stage === "repair" && (
                <section className="reference">
                  <button
                    aria-expanded={formulaHelp}
                    onClick={() => setFormulaHelp(!formulaHelp)}
                  >
                    <BookOpen size={17} />
                    <span>{t("Formula reference")}</span>
                    <ChevronDown
                      className={formulaHelp ? "rotated" : ""}
                      size={16}
                    />
                  </button>
                  {formulaHelp && (
                    <div className="reference-body">
                      <p>
                        <code>SUMIF(range, criterion, sum_range)</code>{" "}
                        {t(
                          "adds amounts whose matching status meets a condition.",
                        )}{" "}
                      </p>
                      <p>
                        <code>=SUMIF(B2:B101,"Paid",C2:C101)</code>
                      </p>
                      <p>
                        {t(
                          "Available functions include SUM, SUMIF, SUMPRODUCT, IF, IFERROR, COUNTIF and ROUND. Use English function names and commas.",
                        )}{" "}
                      </p>
                    </div>
                  )}
                </section>
              )}
              <section className="learning-footer">
                <div className="learning-footer-icon">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2>{t("Small checks. Stronger judgement.")}</h2>
                  <p>
                    {stage === "investigate"
                      ? t(
                          "Before trusting an answer, find the example that could prove it wrong.",
                        )
                      : t(
                          "A fix is stronger when it also works on data you haven’t seen.",
                        )}
                  </p>
                </div>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>Fix the Report</span>
            <span>{t("Learn to trust your work.")}</span>
          </footer>
        </div>
      </main>
      {dialog === "help" && (
        <Modal title={t("A five-minute confidence check")} close={closeDialog}>
          <p>
            {t(
              "Practice a real reporting decision using prepared sample data. The brief defines the correct result.",
            )}{" "}
          </p>
          <ol className="help-list">
            <li>
              <strong>{t("Find the mistake.")}</strong>{" "}
              {t(
                "Edit amounts and statuses, then test the given formula. Try a row that should be excluded.",
              )}{" "}
            </li>
            <li>
              <strong>{t("Fix the formula.")}</strong>{" "}
              {t(
                "Write a formula that counts only Paid orders. Hints and a formula reference are available.",
              )}{" "}
            </li>
            <li>
              <strong>{t("Prove it works.")}</strong>{" "}
              {t(
                "Pass 19 checks with different amounts, statuses and row positions.",
              )}{" "}
            </li>
          </ol>
          <p className="modal-note">
            {t(
              "Progress is saved in this browser. This exercise supports 100 orders and amounts from $0 to $1,000,000.",
            )}{" "}
          </p>
          <button className="primary-button full" onClick={closeDialog}>
            {t("Got it")} <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {dialog === "reset" && (
        <Modal title={t("Start this exercise over?")} close={closeDialog}>
          <p>
            {t(
              "This will replace your orders, formula and saved progress with the original exercise.",
            )}{" "}
          </p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={closeDialog}>
              {t("Keep working")}{" "}
            </button>
            <button className="primary-button" onClick={reset}>
              {t("Start over")}{" "}
            </button>
          </div>
        </Modal>
      )}
      {dialog === "review" && (
        <Modal title={t("First case ready for review")} close={closeDialog}>
          <p>
            {t(
              "Find the revenue error, fix the formula and verify it against 19 datasets.",
            )}
          </p>
          <p>{t("Would you like to try this demo?")}</p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={closeDialog}>
              {t("Preview the interface")}
            </button>
            <button className="primary-button" onClick={closeDialog}>
              {t("Yes, start checking")} <ArrowRight size={16} />
            </button>
          </div>
          <p className="modal-note">
            {t(
              "This dialog is for previewing the demo. Changes are saved in this browser.",
            )}
          </p>
        </Modal>
      )}
    </div>
  );
}
