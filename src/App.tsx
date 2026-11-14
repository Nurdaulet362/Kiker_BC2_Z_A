import { useEffect, useRef, useState, type ReactNode } from "react";
import {
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

type Inspection = { kind: "match" | "found" | "error"; message: string };
const hints = [
  "The brief says paid orders. What should happen to the total if an order is cancelled?",
  "Try adding a $300 order with status Cancelled. Compare the report total with the sum of the Paid rows.",
  'SUMIF checks a condition before adding a value. Use column B for the status, "Paid" as the condition, and column C for the amount.',
];

function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
      className="modal"
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          aria-label="Close dialog"
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

export function App() {
  const [progress, setProgress] = useState<Progress>(() => {
    try {
      return restoreProgress(localStorage.getItem(STORAGE_KEY));
    } catch {
      return initialProgress();
    }
  });
  const [saveError, setSaveError] = useState(false);
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [calculating, setCalculating] = useState(true);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [checks, setChecks] = useState<FormulaCheck[] | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      setSaveError(false);
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
            setCalculation({ error: error.message });
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
    setVerifyError("");
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
        message:
          "These numbers agree. Try a valid order that should be excluded from paid revenue, then test again.",
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
      message:
        "You found a counterexample. The formula includes money that does not belong in paid revenue.",
    });
  }
  function startRepair() {
    setProgress((state) => ({ ...state, stage: "repair" }));
    setInspection(null);
  }
  async function verifyFormula() {
    setVerifying(true);
    setVerifyError("");
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
        setVerifyError(error.message);
    } finally {
      setVerifying(false);
    }
  }
  function reset() {
    verificationController.current?.abort();
    setProgress(initialProgress());
    setInspection(null);
    setChecks(null);
    setVerifyError("");
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
      title: "Find the mistake",
      description: "Put the report to the test",
      done: stage !== "investigate",
      current: stage === "investigate",
    },
    {
      title: "Fix the formula",
      description: "Make the rule work",
      done: stage === "complete",
      current: stage === "repair",
    },
    {
      title: "Prove it works",
      description: "Check it against fresh data",
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
            <BookOpen size={16} /> Practice library
          </div>
          <div className="lesson-selected">
            <FileSpreadsheet size={19} />
            <div>
              <strong>The cancelled order</strong>
              <span>Revenue reporting</span>
            </div>
            <ChevronRight size={16} />
          </div>
          <div className="sidebar-divider" />
          <h2 className="sidebar-title">Your path</h2>
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
              A good report holds up
              <br />
              when the data changes.
            </p>
          </div>
        </div>
        <div className="sidebar-footer">
          <span className="guest-avatar">Y</span>
          <div>
            <strong>Your practice space</strong>
            <span>Guest session · saved locally</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Practice <ChevronRight size={14} />
            <span>The cancelled order</span>
          </div>
          <button className="text-button" onClick={() => setDialog("help")}>
            <CircleHelp size={17} /> How it works
          </button>
        </header>
        <div className="content">
          {saveError && (
            <div role="status" className="notice warning">
              Your browser cannot save progress. Keep this tab open to continue
              your session.
            </div>
          )}
          {stage === "complete" ? (
            <section className="completion">
              <div className="completion-check">
                <CheckCheck size={38} strokeWidth={1.6} />
              </div>
              <h1 ref={headingRef} tabIndex={-1}>
                This report holds up.
              </h1>
              <p className="completion-lead">
                You found the hidden mistake, repaired the formula,
                <br className="desktop-break" /> and passed 19 checks, including
                fresh data.
              </p>
              <div className="completed-report">
                <div className="completed-heading">
                  <FileSpreadsheet size={20} />
                  <strong>The cancelled order</strong>
                  <span className="success-tag">
                    <Check size={14} /> Completed
                  </span>
                </div>
                <div className="before-after">
                  <div>
                    <span>Original report in your test</span>
                    <strong>{money(evidence!.reported)}</strong>
                  </div>
                  <ArrowRight size={22} />
                  <div>
                    <span>Correct paid revenue</span>
                    <strong className="green-text">
                      {money(evidence!.expected)}
                    </strong>
                  </div>
                </div>
                <div className="formula-saved">
                  <span>Your verified formula</span>
                  <code>{formula}</code>
                </div>
                <div className="completion-stats">
                  <span>
                    <ShieldCheck size={16} /> 19 checks passed
                  </span>
                  <span>
                    {progress.attempts}{" "}
                    {progress.attempts === 1 ? "attempt" : "attempts"}
                  </span>
                  <span>
                    {progress.hints} {progress.hints === 1 ? "hint" : "hints"}{" "}
                    used
                  </span>
                </div>
              </div>
              <div className="takeaway">
                <h2>Take this back to work</h2>
                <p>
                  A total can look correct when every row has the same status.
                  Add a row that should be excluded to test whether your formula
                  follows the business rule.
                </p>
              </div>
              <div className="completion-actions">
                <button className="primary-button" onClick={retry}>
                  Practice with new numbers <ArrowRight size={17} />
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
                  Review my report
                </button>
              </div>
              <p className="completion-footnote">
                Your result is saved in this browser. More report challenges are
                in development.
              </p>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <h1 ref={headingRef} tabIndex={-1}>
                    {stage === "investigate"
                      ? "The revenue that wasn’t."
                      : "Make the formula hold up."}
                  </h1>
                  <p>
                    {stage === "investigate"
                      ? "A plausible total. One overlooked detail. Can you find it?"
                      : "You found the problem. Now teach the formula the business rule."}
                  </p>
                </div>
                <span className="time-label">
                  <Clock3 size={16} /> 5 min practice
                </span>
              </div>
              <section className="brief" aria-labelledby="brief-title">
                <div className="brief-icon">
                  <BookOpen size={21} />
                </div>
                <div>
                  <h2 id="brief-title">Your brief</h2>
                  <p>
                    “Send me the total revenue from <strong>Paid</strong>{" "}
                    orders. Exclude <strong>Cancelled</strong> and{" "}
                    <strong>Pending</strong> orders.”
                  </p>
                  <span>Prepared training example · amounts in USD</span>
                </div>
              </section>
              <div className="workspace">
                <section className="sheet-panel" aria-labelledby="sheet-title">
                  <div className="sheet-toolbar">
                    <h2 id="sheet-title">
                      <FileSpreadsheet size={19} /> November orders
                    </h2>
                    <span>
                      {rows.length} {rows.length === 1 ? "order" : "orders"}
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
                        <span className="sr-only">Revenue formula</span>
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
                            setVerifyError("");
                          }}
                          maxLength={1000}
                          aria-describedby="formula-instructions"
                        />
                      </label>
                    )}
                    <span className="formula-label">
                      {stage === "investigate"
                        ? "Given formula"
                        : "Your formula"}
                    </span>
                  </div>
                  {stage === "repair" && (
                    <p
                      className="formula-instructions"
                      id="formula-instructions"
                    >
                      Edit the formula above. Status is column B. Amount is
                      column C. Rows 2–101 are available.
                    </p>
                  )}
                  <div className="table-wrap">
                    <table>
                      <caption className="sr-only">
                        Editable orders. Only Paid orders count toward revenue.
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
                          <th aria-label="Row number" />
                          <th>A</th>
                          <th>B</th>
                          <th>C</th>
                          <th />
                        </tr>
                        <tr className="table-labels">
                          <th>1</th>
                          <th scope="col">Order ID</th>
                          <th scope="col">Status</th>
                          <th scope="col" className="right">
                            Amount (USD)
                          </th>
                          <th>
                            <span className="sr-only">Remove</span>
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
                                  aria-label={`Status for ${row.id}`}
                                  value={row.status}
                                  disabled={verifying}
                                  onChange={(event) =>
                                    updateOrder(index, {
                                      status: event.target.value as Status,
                                    })
                                  }
                                >
                                  <option>Paid</option>
                                  <option>Cancelled</option>
                                  <option>Pending</option>
                                </select>
                                <ChevronDown size={12} aria-hidden="true" />
                              </span>
                            </td>
                            <td>
                              <input
                                className="amount-input"
                                inputMode="decimal"
                                aria-label={`Amount for ${row.id}`}
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
                                aria-label={`Remove ${row.id}`}
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
                        Your report is empty. Add an order to test the revenue
                        calculation.
                      </div>
                    )}
                  </div>
                  <div className="table-bottom">
                    <button
                      className="add-button"
                      onClick={addOrder}
                      disabled={verifying || rows.length >= 100}
                    >
                      <Plus size={16} /> Add order
                    </button>
                    <span>
                      {paidCount} paid
                      {cancelledCount > 0
                        ? ` · ${cancelledCount} cancelled`
                        : ""}
                    </span>
                  </div>
                  <div className="sheet-footer">
                    <span className="sheet-tab">
                      <FileSpreadsheet size={14} /> Orders
                    </span>
                    <span>Editable training data</span>
                  </div>
                </section>
                <aside className="inspector" aria-labelledby="result-title">
                  <div className="result-heading">
                    <h2 id="result-title">Report total</h2>
                    <span className="live-indicator">
                      {calculating ? "Calculating" : "Live"}
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
                        ? "Check your input"
                        : calculation?.value !== undefined
                          ? money(calculation.value)
                          : "—"}
                  </div>
                  <p className="result-description">
                    {stage === "investigate"
                      ? "Calculated by the given formula."
                      : "Calculated by your current formula."}
                  </p>
                  {calculation?.error && !calculating && (
                    <p className="inline-error" role="alert">
                      {calculation.error}
                    </p>
                  )}
                  {stage === "investigate" ? (
                    <>
                      <div className="instruction">
                        <span className="instruction-icon">
                          <FlaskConical size={19} />
                        </span>
                        <div>
                          <h3>Try to break the report</h3>
                          <p>
                            Change a status or add an order. Can you make this
                            total disagree with the brief?
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
                        Test the report <ArrowRight size={17} />
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
                                ? "Mistake found"
                                : "So far, so good"}
                            </strong>
                          </div>
                          <p>{inspection.message}</p>
                          {inspection.kind === "found" && evidence && (
                            <>
                              <div className="evidence-line">
                                <span>Paid revenue</span>
                                <strong>{money(evidence.expected)}</strong>
                              </div>
                              <div className="evidence-line">
                                <span>Overcounted</span>
                                <strong>
                                  {money(evidence.reported - evidence.expected)}
                                </strong>
                              </div>
                              <button
                                className="primary-button full"
                                onClick={startRepair}
                              >
                                Fix the formula <ArrowRight size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="business-total">
                        <span>Expected paid revenue</span>
                        <strong>
                          {expected === null ? "—" : money(expected)}
                        </strong>
                      </div>
                      <div className="instruction">
                        <span className="instruction-icon">
                          <ShieldCheck size={19} />
                        </span>
                        <div>
                          <h3>Prove your fix</h3>
                          <p>
                            Run your formula against 19 checks, including new
                            rows and different order statuses.
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
                            <LoaderCircle className="spin" size={17} /> Checking
                            your formula…
                          </>
                        ) : (
                          <>
                            Verify my formula <ArrowRight size={17} />
                          </>
                        )}
                      </button>
                      {verifyError && (
                        <p className="inline-error" role="alert">
                          {verifyError}
                        </p>
                      )}
                      {checks && !checks.every((check) => check.passed) && (
                        <div className="verification-results" role="status">
                          <h3>
                            {checks.filter((check) => check.passed).length} of{" "}
                            {checks.length} checks passed
                          </h3>
                          <p>
                            Use the failed examples to improve your formula.
                          </p>
                          {checks
                            .filter((check) => !check.passed)
                            .slice(0, 4)
                            .map((check) => (
                              <div className="failed-check" key={check.name}>
                                <strong>
                                  <X size={14} /> {check.name}
                                </strong>
                                <span>{check.description}</span>
                                <span>
                                  {check.error ||
                                    `Expected ${money(check.expected)} · got ${money(check.actual!)}`}
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
                          ? "Need a small hint?"
                          : progress.hints < 3
                            ? "Show another hint"
                            : "All hints revealed"}
                      </span>
                      <span className="hint-count">{progress.hints}/3</span>
                    </button>
                    {progress.hints > 0 && (
                      <p className="hint-copy" aria-live="polite">
                        {hints[progress.hints - 1]}
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
                  <ShieldCheck size={15} /> Your changes stay in this browser.
                </p>
                <button
                  className="text-button"
                  disabled={verifying}
                  onClick={() => setDialog("reset")}
                >
                  <RotateCcw size={14} /> Start over
                </button>
              </div>
              {stage === "repair" && (
                <section className="reference">
                  <button
                    aria-expanded={formulaHelp}
                    onClick={() => setFormulaHelp(!formulaHelp)}
                  >
                    <BookOpen size={17} />
                    <span>Formula reference</span>
                    <ChevronDown
                      className={formulaHelp ? "rotated" : ""}
                      size={16}
                    />
                  </button>
                  {formulaHelp && (
                    <div className="reference-body">
                      <p>
                        <code>SUMIF(range, criterion, sum_range)</code> adds
                        amounts whose matching status meets a condition.
                      </p>
                      <p>
                        <code>=SUMIF(B2:B101,"Paid",C2:C101)</code>
                      </p>
                      <p>
                        Available functions include SUM, SUMIF, SUMPRODUCT, IF,
                        IFERROR, COUNTIF and ROUND. Use English function names
                        and commas.
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
                  <h2>Small checks. Stronger judgement.</h2>
                  <p>
                    {stage === "investigate"
                      ? "Before trusting an answer, find the example that could prove it wrong."
                      : "A fix is stronger when it also works on data you haven’t seen."}
                  </p>
                </div>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>Fix the Report</span>
            <span>Learn to trust your work.</span>
          </footer>
        </div>
      </main>
      {dialog === "help" && (
        <Modal title="A five-minute confidence check" close={closeDialog}>
          <p>
            Practice a real reporting decision using prepared sample data. The
            brief defines the correct result.
          </p>
          <ol className="help-list">
            <li>
              <strong>Find the mistake.</strong> Edit amounts and statuses, then
              test the given formula. Try a row that should be excluded.
            </li>
            <li>
              <strong>Fix the formula.</strong> Write a formula that counts only
              Paid orders. Hints and a formula reference are available.
            </li>
            <li>
              <strong>Prove it works.</strong> Pass 19 checks with different
              amounts, statuses and row positions.
            </li>
          </ol>
          <p className="modal-note">
            Progress is saved in this browser. This exercise supports 100 orders
            and amounts from $0 to $1,000,000.
          </p>
          <button className="primary-button full" onClick={closeDialog}>
            Got it <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {dialog === "reset" && (
        <Modal title="Start this exercise over?" close={closeDialog}>
          <p>
            This will replace your orders, formula and saved progress with the
            original exercise.
          </p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={closeDialog}>
              Keep working
            </button>
            <button className="primary-button" onClick={reset}>
              Start over
            </button>
          </div>
        </Modal>
      )}
      {dialog === "review" && (
        <Modal title="Первый кейс готов к проверке" close={closeDialog}>
          <p>
            Можно пройти весь путь — найти ошибку в выручке, исправить формулу и
            проверить её на 19 наборах данных.
          </p>
          <p>Согласен попробовать этот вариант MVP?</p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={closeDialog}>
              Посмотреть интерфейс
            </button>
            <button className="primary-button" onClick={closeDialog}>
              Да, проверить <ArrowRight size={16} />
            </button>
          </div>
          <p className="modal-note">
            Это окно для просмотра готового демо. Изменения сохраняются в
            браузере.
          </p>
        </Modal>
      )}
    </div>
  );
}
