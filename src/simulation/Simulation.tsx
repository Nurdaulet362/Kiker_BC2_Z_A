import { FUTURE_VERSION_WARNING } from "../storage-messages";
import { formulaIssue, type FormulaIssue } from "../formula-errors";
import { useErrorTranslation } from "../i18n";
import {
  feedback,
  LanguageSwitcher,
  LanguageContext,
  LocalizedText,
  useTranslation,
  type Translate,
} from "../i18n";
import { useContext, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Download,
  FileSpreadsheet,
  Lightbulb,
  LoaderCircle,
  Mail,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Modal } from "../App";
import { money, STATUSES, type Status } from "../model";
import { configureSessionItem, getSessionItem, setSessionItem, subscribeSaveStatus, type SaveStatus } from "../session-storage";
import type { Preview } from "./evaluate";
import {
  CHANNELS,
  TRIAL_KEY,
  channelMetrics,
  createScenario,
  initialTrial,
  rate,
  restoreTrial,
  validateScenario,
  type Answers,
  type Submission,
  type TrialState,
} from "./model";
import { runTrial } from "./worker";

const tasks = [
  {
    id: "revenue",
    title: "Repair the revenue",
    detail: "Count the money that belongs",
    points: 40,
  },
  {
    id: "conversion",
    title: "Check the conversion",
    detail: "Choose the right denominator",
    points: 35,
  },
  {
    id: "judgment",
    title: "Defend your decision",
    detail: "Turn evidence into a next step",
    points: 25,
  },
] as const;
const hintCopy = {
  revenue:
    'SUM includes every status. SUMIF can include only Paid orders. Try =SUMIF(B2:B101,"Paid",C2:C101).',
  conversion:
    'Add all paid orders, then divide by all leads. An average of channel percentages gives small channels too much weight. Try =IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101)).',
  judgment:
    "Compare (paid revenue − ad spend) / ad spend. Choose the higher positive ratio for a small test, hold the budget if neither is positive or they tie, and acknowledge that one week cannot guarantee future returns.",
};

function downloadReview(state: TrialState, result: Submission, t: Translate, errorText: (issue: FormulaIssue) => string) {
  const snapshot = result.snapshot;
  const text = [
    t("# Fix the Report — Work trial review"),
    "",
    t("Sales operations · The Friday revenue review"),
    t(
      "Fictional training assignment. This score describes this exercise, not hiring readiness.",
    ),
    "",
    t("Score: {score}/100", { score: result.score }),
    t("Submitted: {at}", { at: result.at }),
    t("Attempts: {n}", { n: state.submissions.length }),
    t("Hints used: {n}", {
      n: snapshot
        ? snapshot.hints.length
        : t("Not recorded in this older review"),
    }),
    "",
    ...result.skills.flatMap((skill) => [
      `## ${t(skill.name)}: ${skill.score}/${skill.maximum}`,
      ...skill.checks.map((c) =>
        t("- {status}: {name}. Expected: {expected}. Submitted: {actual}.", {
          status: t(c.passed ? "PASS" : "REVIEW"),
          name: feedback(t, c.name),
          expected: feedback(t, c.expected),
          actual: errorText({ error: c.actual, code: c.code, params: c.params }),
        }),
      ),
      "",
    ]),
    ...(snapshot
      ? [
          t("## Submitted formulas"),
          t("Revenue: {formula}", { formula: snapshot.answers.revenue }),
          t("Conversion: {formula}", { formula: snapshot.answers.conversion }),
          "",
          t("## Personal handoff note (not graded)"),
          snapshot.answers.note || t("No note added."),
          "",
          t("## Source data at submission"),
          t("Assignment: {n}", { n: snapshot.scenario.seed + 1 }),
          "",
          "```json",
          JSON.stringify(snapshot.scenario, null, 2),
          "```",
        ]
      : [
          t(
            "The formulas, source data and handoff note were not recorded in this older review. Submit again to save a complete snapshot.",
          ),
        ]),
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/markdown;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "fix-the-report-review.md";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

configureSessionItem(TRIAL_KEY, { version: 1 });

export function Simulation() {
  const t = useTranslation();
  const { language } = useContext(LanguageContext);
  const errorText = useErrorTranslation();
  const [state, setState] = useState<TrialState>(() => {
    try {
      return restoreTrial(getSessionItem(TRIAL_KEY));
    } catch {
      return initialTrial();
    }
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FormulaIssue | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("ok");
  useEffect(() => subscribeSaveStatus(TRIAL_KEY, setSaveStatus), []);
  const [dialog, setDialog] = useState<"help" | "restore" | "new" | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const taskHeading = useRef<HTMLHeadingElement>(null);
  const taskPanel = useRef<HTMLElement>(null);
  const previousTask = useRef(state.active);
  const assessment = useRef<AbortController | null>(null);
  const { scenario, answers, active, stage } = state;
  const metrics = channelMetrics(scenario);
  const rowError = validateScenario(scenario);
  const latest = state.submissions.at(-1);
  const taskResult = latest?.skills.find((s) => s.id === active);

  useEffect(() => {
    try {
      setSessionItem(TRIAL_KEY, JSON.stringify(state));
    } catch {
      setSaveStatus("unavailable");
    }
  }, [state]);
  useEffect(() => {
    if (stage !== "work") return;
    const controller = new AbortController();
    setCalculating(true);
    const timer = setTimeout(() => {
      runTrial("preview", scenario, answers, 0, controller.signal)
        .then((result) => {
          setPreview(result);
          setCalculating(false);
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setPreview({
              revenue: formulaIssue(e),
              conversion: formulaIssue(e),
            });
            setCalculating(false);
          }
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [scenario, answers.revenue, answers.conversion, stage]);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [stage]);
  useEffect(() => {
    if (stage === "work" && previousTask.current !== active) {
      taskHeading.current?.focus({ preventScroll: true });
      taskPanel.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    }
    previousTask.current = active;
  }, [active, stage]);
  useEffect(() => () => assessment.current?.abort(), []);

  function answer<K extends keyof Answers>(key: K, value: Answers[K]) {
    setState((s) => ({ ...s, answers: { ...s.answers, [key]: value } }));
    setError(null);
  }
  function editOrder(index: number, field: "status" | "amount", value: string) {
    setState((s) => ({
      ...s,
      scenario: {
        ...s.scenario,
        orders: s.scenario.orders.map((o, i) =>
          i === index ? { ...o, [field]: value } : o,
        ),
      },
    }));
  }
  function editChannel(index: number, field: "leads" | "spend", value: string) {
    setState((s) => ({
      ...s,
      scenario: {
        ...s.scenario,
        channels: s.scenario.channels.map((c, i) =>
          i === index ? { ...c, [field]: value } : c,
        ),
      },
    }));
  }
  function start() {
    setState((s) => ({
      ...s,
      stage: "work",
      startedAt: s.startedAt ?? new Date().toISOString(),
    }));
  }
  function fresh() {
    const next = initialTrial((state.scenario.seed + 1) % 1000000);
    setState({ ...next, stage: "work", startedAt: new Date().toISOString() });
    setDialog(null);
    setError(null);
    setPreview(null);
  }
  async function submit() {
    if (rowError) return;
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    assessment.current = controller;
    try {
      const seconds = Math.max(
        0,
        Math.round((Date.now() - Date.parse(state.startedAt!)) / 1000),
      );
      const result = await runTrial(
        "assess",
        scenario,
        answers,
        seconds,
        controller.signal,
      );
      if (result.snapshot) result.snapshot.hints = [...state.hints];
      setState((s) => ({
        ...s,
        stage: "result",
        submissions: [...s.submissions.slice(-49), result],
      }));
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(formulaIssue(e));
    } finally {
      setBusy(false);
    }
  }
  function practice(id?: TrialState["active"]) {
    const weakest = latest?.skills.reduce((a, b) =>
      a.score / a.maximum <= b.score / b.maximum ? a : b,
    );
    setState((s) => ({
      ...s,
      stage: "work",
      active: id ?? weakest?.id ?? "revenue",
    }));
  }
  const done = latest?.score === 100;
  const missingDecision =
    !answers.channel || !answers.evidence || !answers.limitation;

  return (
    <div className="sim-app">
      <header className="sim-header">
        <button
          className="sim-brand"
          onClick={() => setState((s) => ({ ...s, stage: "home" }))}
          disabled={busy}
          aria-label={t("Fix the Report home")}
        >
          <span>
            <FileSpreadsheet size={23} />
          </span>
          fix the report.
        </button>
        <nav aria-label={t("Main navigation")}>
          <span className="sim-current-nav">{t("Work simulations")}</span>
          <a href="#lesson/revenue-cancelled">{t("Guided practice")}</a>
          <button
            onClick={() => setDialog("help")}
            aria-label={t("About this work trial")}
          >
            <CircleHelp size={19} />
          </button>
          <LanguageSwitcher />
        </nav>
      </header>
      <main className="sim-main">
        {saveStatus !== "ok" && (
          <p className="sim-error" role="status">
            {saveStatus === "future-version" ? FUTURE_VERSION_WARNING[language] : t(
              "Your browser cannot save this session. Keep the tab open to preserve your work.",
            )}{" "}
          </p>
        )}
        {stage === "home" ? (
          <>
            <section className="sim-hero">
              <div className="sim-hero-copy">
                <span className="sim-eyebrow">
                  {t("Sales operations interview practice")}{" "}
                </span>
                <h1 ref={heading} tabIndex={-1}>
                  {t("Your next interview")} <br />
                  {t("has a spreadsheet.")}{" "}
                </h1>
                <p>
                  {t(
                    "Practice a spreadsheet assessment before your interview. Repair the numbers, recommend a budget test, and get specific feedback on what to improve.",
                  )}{" "}
                </p>
                <div className="sim-hero-actions">
                  <button className="primary-button" onClick={start}>
                    {state.startedAt
                      ? t("Continue my work trial")
                      : t("Start the work trial")}
                    <ArrowRight size={18} />
                  </button>
                  <span>{t("Free demo · no account needed")}</span>
                </div>
                <p className="sim-proof-note">
                  {t(
                    "Two formulas. One decision. 30 checks on your work.",
                  )}{" "}
                </p>
                <div className="sim-audience">
                  <BriefcaseBusiness size={18} />
                  <span>
                    {t("For your next sales operations role")} <br />
                    <small>
                      {t(
                        "One complete assignment · self-paced · about 20 minutes",
                      )}{" "}
                    </small>
                  </span>
                </div>
              </div>
              <div className="sim-assignment-preview">
                <div className="sim-document-top">
                  <Mail size={17} />
                  <span>{t("Your practice assignment")}</span>
                  <span>01</span>
                </div>
                <div className="sim-preview-body">
                  <h2>{t("The Friday revenue review")}</h2>
                  <p>
                    {t(
                      "“The report looks promising. Before we move next week’s budget, can you check the numbers and tell me what you’d do?”",
                    )}{" "}
                  </p>
                  <div className="sim-sender">
                    <span className="sim-avatar">M</span>
                    <span>
                      {t("Maya Chen")}{" "}
                      <small>{t("Operations lead · fictional company")}</small>
                    </span>
                  </div>
                </div>
                <div className="sim-preview-bottom">
                  <FileSpreadsheet size={20} />
                  <div>
                    <strong>weekly_report.xlsx</strong>
                    <span>
                      {t(
                        "Orders, acquisition data & a questionable recommendation",
                      )}{" "}
                    </span>
                  </div>
                  <ChevronRight size={17} />
                </div>
              </div>
            </section>
            <section
              className="sim-outcomes"
              aria-labelledby="outcomes-heading"
            >
              <h2 id="outcomes-heading">{t("What you leave with.")}</h2>
              <div>
                <article>
                  <FileSpreadsheet size={21} aria-hidden="true" />
                  <h3>{t("Formulas tested on new data")}</h3>
                  <p>
                    {t(
                      "See which checks pass and which fail when order statuses, lead counts and rows change.",
                    )}{" "}
                  </p>
                </article>
                <article>
                  <BriefcaseBusiness size={21} aria-hidden="true" />
                  <h3>{t("A reason behind your decision")}</h3>
                  <p>
                    {t(
                      "Compare revenue and acquisition costs, then explain which channel deserves a small test.",
                    )}{" "}
                  </p>
                </article>
                <article>
                  <Download size={21} aria-hidden="true" />
                  <h3>{t("A review you can keep")}</h3>
                  <p>
                    {t(
                      "Download your results, work on the gaps and try again with a different set of numbers.",
                    )}{" "}
                  </p>
                </article>
              </div>
            </section>
            <section
              className="sim-overview"
              aria-labelledby="overview-heading"
            >
              <div>
                <h2 id="overview-heading">{t("Show how you think.")}</h2>
                <p>
                  {t(
                    "Work through the same report from raw numbers to a recommendation. Get specific feedback, then try again with different data.",
                  )}{" "}
                </p>
              </div>
              <ol>
                {tasks.map((task, i) => (
                  <li key={task.id}>
                    <span>{i + 1}</span>
                    <div>
                      <h3>{t(task.title)}</h3>
                      <p>{t(task.detail)}</p>
                    </div>
                    <small>{t("{n} points", { n: task.points })}</small>
                  </li>
                ))}
              </ol>
            </section>
            <section className="sim-practice-row">
              <BookOpen size={24} />
              <div>
                <h2>{t("Need a warm-up?")}</h2>
                <p>
                  {t(
                    "Find the cancelled order that breaks a revenue formula. A guided, seven-minute exercise.",
                  )}{" "}
                </p>
              </div>
              <a className="secondary-button" href="#lesson/revenue-cancelled">
                {t("Try guided practice")} <ArrowRight size={16} />
              </a>
            </section>
            {latest && (
              <div className="sim-saved-result">
                <CheckCheck size={18} />
                <span>
                  {t("Last submission: {score}/100 · saved in this browser", {
                    score: latest.score,
                  })}
                </span>
                <button
                  onClick={() => setState((s) => ({ ...s, stage: "result" }))}
                >
                  {t("View review")} <ArrowRight size={15} />
                </button>
              </div>
            )}
            <section className="sim-faq" aria-labelledby="faq-heading">
              <div>
                <h2 id="faq-heading">{t("Before you start.")}</h2>
                <p>{t("A few details so you know what to expect.")}</p>
              </div>
              <div className="sim-faq-items">
                <details>
                  <summary>
                    {t("Do I need Excel or advanced formula skills?")}
                  </summary>
                  <p>
                    <LocalizedText
                      message="Everything runs in this browser. Basic spreadsheet familiarity helps; worked hints are available if you get stuck. For a shorter introduction, try the <practice>guided cancelled-order lesson</practice>."
                      tags={{
                        practice: (label) => <a href="#lesson/revenue-cancelled">{label}</a>,
                      }}
                    />
                  </p>
                </details>
                <details>
                  <summary>{t("What does my score tell me?")}</summary>
                  <p>
                    {t(
                      "It shows how your work performed on 19 revenue checks, 8 conversion checks and 3 decision checks. You can inspect the evidence and retry. It is an exercise result, not a certification or a prediction of getting hired.",
                    )}{" "}
                  </p>
                </details>
                <details>
                  <summary>
                    {t("Is it free, and will my progress be saved?")}
                  </summary>
                  <p>
                    {t(
                      "This demo is free and needs no account. Progress is saved in this browser when storage is available; it does not sync across devices. If saving is blocked, your work stays available while this page remains open, including when you switch exercises. Reloading or closing it can lose unsaved work.",
                    )}{" "}
                  </p>
                </details>
              </div>
            </section>
            <section
              className="sim-closing-action"
              aria-labelledby="closing-heading"
            >
              <div>
                <h2 id="closing-heading">
                  {t("Try the work before the interview.")}
                </h2>
                <p>
                  {t(
                    "Start with a draft report. Leave knowing what to practice next.",
                  )}{" "}
                </p>
              </div>
              <button className="primary-button" onClick={start}>
                {state.startedAt
                  ? t("Continue my practice")
                  : t("Start my practice")}
                <ArrowRight size={17} />
              </button>
            </section>
          </>
        ) : stage === "work" ? (
          <>
            <div className="sim-page-title">
              <div>
                <h1 ref={heading} tabIndex={-1}>
                  {t("The Friday revenue review")}{" "}
                </h1>
                <p>
                  {t(
                    "You’re the sales operations candidate. Make this report ready for a decision.",
                  )}{" "}
                </p>
              </div>
              <span className="sim-session-tag">
                <BriefcaseBusiness size={15} />{" "}
                {t("Assignment {n}", { n: scenario.seed + 1 })}
              </span>
            </div>
            <details className="sim-brief" open>
              <summary>
                <Mail size={18} />
                <span>{t("From Maya, your operations lead")}</span>
                <ChevronRight size={16} />
              </summary>
              <div>
                <p>
                  <LocalizedText message="Check <revenue>paid revenue</revenue>, calculate the <conversion>overall lead-to-paid conversion</conversion>, then recommend where to run the next small acquisition test." />
                </p>
                <p>
                  <LocalizedText message="Count only Paid orders. Cancelled and Pending orders do not count as revenue or conversions. Use all leads as the conversion denominator; with zero total leads, report <na>N/A</na>." />
                </p>
                <p>
                  {t(
                    "For this exercise, contribution is paid revenue minus ad spend. Compare contribution per dollar of ad spend; choose the higher positive ratio. If neither is positive, or the ratios tie, hold the budget. Other costs are held constant. One week of results cannot guarantee future returns.",
                  )}{" "}
                </p>
                <span>
                  {t(
                    "Fictional training data · USD · one paid order per converted lead",
                  )}{" "}
                </span>
              </div>
            </details>
            <div className="sim-work-layout">
              <aside
                className="sim-task-list"
                aria-label={t("Assignment tasks")}
              >
                {tasks.map((task, i) => (
                  <button
                    key={task.id}
                    className={active === task.id ? "active" : ""}
                    onClick={() => setState((s) => ({ ...s, active: task.id }))}
                    aria-current={active === task.id ? "step" : undefined}
                    disabled={busy}
                  >
                    <span className="sim-step-number">{i + 1}</span>
                    <span>
                      <strong>{t(task.title)}</strong>
                      <small>{t("{n} points", { n: task.points })}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
                <div className="sim-draft-note">
                  <FileSpreadsheet size={20} />
                  <h2>{t("A draft is a starting point.")}</h2>
                  <p>
                    {t(
                      "The formulas and recommendation below are prepared examples. Check the evidence before relying on them.",
                    )}{" "}
                  </p>
                </div>
              </aside>
              <section
                ref={taskPanel}
                className="sim-task-panel"
                aria-label={t(tasks.find((task) => task.id === active)!.title)}
              >
                <div className="sim-task-heading">
                  <h2 ref={taskHeading} tabIndex={-1}>
                    {t(tasks.find((task) => task.id === active)!.title)}
                  </h2>
                  <span>
                    {t("{n} points", {
                      n: tasks.find((task) => task.id === active)!.points,
                    })}
                  </span>
                </div>
                {rowError && (
                  <p className="sim-error" role="alert">
                    {feedback(t, rowError)}
                  </p>
                )}
                {active === "revenue" ? (
                  <>
                    <p className="sim-task-description">
                      {t(
                        "The draft adds every order. Check which statuses belong in paid revenue, then repair the formula. You can edit the source data to test your reasoning.",
                      )}{" "}
                    </p>
                    <div className="sim-formula-section">
                      <label htmlFor="trial-revenue">
                        {t("Paid revenue formula")}{" "}
                      </label>
                      <div className="sim-formula-input">
                        <span aria-hidden="true">ƒx</span>
                        <textarea
                          id="trial-revenue"
                          value={answers.revenue}
                          onChange={(e) => answer("revenue", e.target.value)}
                          spellCheck={false}
                          maxLength={1000}
                          disabled={busy}
                          rows={2}
                        />
                      </div>
                      <p className="formula-instructions">
                        {t(
                          "Use English function names, commas between arguments, and Paid, Cancelled or Pending for status values.",
                        )}
                      </p>
                      <div className="sim-live-result">
                        <span>{t("Your report total")}</span>
                        <strong aria-live="polite">
                          {calculating
                            ? t("Calculating…")
                            : typeof preview?.revenue.value === "number"
                              ? money(preview.revenue.value)
                              : "—"}
                        </strong>
                      </div>
                      {preview?.revenue.error && !calculating && (
                        <p className="sim-error" role="alert">
                          {errorText(preview.revenue)}
                        </p>
                      )}
                    </div>
                    <div className="sim-table-scroll">
                      <table className="sim-orders">
                        <caption>
                          {t(
                            "Orders · A: Order ID · B: Status · C: Amount. E- IDs are Email; A- IDs are Ads.",
                          )}{" "}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">{t("Row")}</th>
                            <th scope="col">{t("A · Order ID")}</th>
                            <th scope="col">{t("B · Status")}</th>
                            <th scope="col">{t("C · Amount ($)")}</th>
                            <th scope="col">
                              <span className="sr-only">{t("Remove")}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {scenario.orders.map((order, i) => (
                            <tr key={order.id}>
                              <th scope="row">{i + 2}</th>
                              <td>{order.id}</td>
                              <td>
                                <select
                                  aria-label={t("Status for {id}", {
                                    id: order.id,
                                  })}
                                  value={order.status}
                                  onChange={(e) =>
                                    editOrder(
                                      i,
                                      "status",
                                      e.target.value as Status,
                                    )
                                  }
                                  disabled={busy}
                                  className={`sim-status sim-${order.status.toLowerCase()}`}
                                >
                                  {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {t(s)}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  aria-label={t("Amount for {id}", {
                                    id: order.id,
                                  })}
                                  value={order.amount}
                                  inputMode="decimal"
                                  maxLength={30}
                                  onChange={(e) =>
                                    editOrder(i, "amount", e.target.value)
                                  }
                                  disabled={busy}
                                />
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  aria-label={t("Remove {id}", {
                                    id: order.id,
                                  })}
                                  disabled={busy}
                                  onClick={() =>
                                    setState((s) => ({
                                      ...s,
                                      scenario: {
                                        ...s.scenario,
                                        orders: s.scenario.orders.filter(
                                          (_, index) => index !== i,
                                        ),
                                      },
                                    }))
                                  }
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!scenario.orders.length && (
                        <p className="sim-empty">
                          {t(
                            "No orders. Paid revenue should be zero. Add an order to keep testing.",
                          )}{" "}
                        </p>
                      )}
                    </div>
                    <div className="sim-add-orders">
                      {CHANNELS.map((channel) => (
                        <button
                          key={channel}
                          disabled={busy || scenario.orders.length >= 100}
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              scenario: {
                                ...s.scenario,
                                orders: [
                                  ...s.scenario.orders,
                                  {
                                    id: `${channel[0]}-N${Date.now()}`,
                                    channel,
                                    status: "Paid",
                                    amount: "300",
                                  },
                                ],
                              },
                            }))
                          }
                        >
                          <Plus size={15} />{" "}
                          {t("Add {channel} order", { channel: t(channel) })}
                        </button>
                      ))}
                      <span>
                        {t("{n}/100 orders", { n: scenario.orders.length })}
                      </span>
                    </div>
                  </>
                ) : active === "conversion" ? (
                  <>
                    <p className="sim-task-description">
                      {t(
                        "The draft averages the two channel percentages. Does that give each lead the same weight? Paid orders below update when you change order statuses.",
                      )}{" "}
                    </p>
                    <div className="sim-formula-section">
                      <label htmlFor="trial-conversion">
                        {t("Overall conversion formula")}{" "}
                      </label>
                      <div className="sim-formula-input">
                        <span aria-hidden="true">ƒx</span>
                        <textarea
                          id="trial-conversion"
                          value={answers.conversion}
                          onChange={(e) => answer("conversion", e.target.value)}
                          spellCheck={false}
                          maxLength={1000}
                          disabled={busy}
                          rows={2}
                        />
                      </div>
                      <p className="formula-instructions">
                        {t(
                          "Use English function names and commas between arguments. A zero-lead result is the text N/A.",
                        )}
                      </p>
                      <div className="sim-live-result">
                        <span>{t("Your overall conversion")}</span>
                        <strong aria-live="polite">
                          {calculating
                            ? t("Calculating…")
                            : rate(preview?.conversion.value)}
                        </strong>
                      </div>
                      {preview?.conversion.error && !calculating && (
                        <p className="sim-error" role="alert">
                          {errorText(preview.conversion)}
                        </p>
                      )}
                    </div>
                    <div className="sim-table-scroll">
                      <table className="sim-channels">
                        <caption>
                          {t(
                            "Acquisition sheet · row 1 contains headers. Formulas can reference A1:D101.",
                          )}{" "}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">{t("Row")}</th>
                            <th scope="col">{t("A · Channel")}</th>
                            <th scope="col">{t("B · Leads")}</th>
                            <th scope="col">{t("C · Paid orders")}</th>
                            <th scope="col">{t("D · Conversion")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.map((channel, i) => (
                            <tr key={channel.name}>
                              <th scope="row">{i + 2}</th>
                              <td>{t(channel.name)}</td>
                              <td>
                                <input
                                  aria-label={t("Leads for {channel}", {
                                    channel: t(channel.name),
                                  })}
                                  inputMode="numeric"
                                  maxLength={30}
                                  value={scenario.channels[i].leads}
                                  disabled={busy}
                                  onChange={(e) =>
                                    editChannel(i, "leads", e.target.value)
                                  }
                                />
                              </td>
                              <td>{channel.paid}</td>
                              <td>{rate(channel.conversion)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="sim-data-note">
                      {t(
                        "Change the lead counts to test your formula. New channels and zero-lead cases are included when you submit.",
                      )}{" "}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="sim-task-description">
                      {t(
                        "The draft recommends Ads because it brought more paid orders. Use the corrected source data to decide whether that recommendation holds up.",
                      )}{" "}
                    </p>
                    <div className="sim-table-scroll">
                      <table className="sim-economics">
                        <caption>
                          {t(
                            "Channel economics · source data, independent of your submitted formulas",
                          )}{" "}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">{t("Channel")}</th>
                            <th scope="col">{t("Paid revenue")}</th>
                            <th scope="col">{t("Ad spend ($)")}</th>
                            <th scope="col">{t("Contribution")}</th>
                            <th scope="col">{t("Per $1 spent")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.map((channel, i) => (
                            <tr key={channel.name}>
                              <th scope="row">{t(channel.name)}</th>
                              <td>{rowError ? "—" : money(channel.revenue)}</td>
                              <td>
                                <input
                                  aria-label={t("Ad spend for {channel}", {
                                    channel: t(channel.name),
                                  })}
                                  value={scenario.channels[i].spend}
                                  inputMode="decimal"
                                  maxLength={30}
                                  disabled={busy}
                                  onChange={(e) =>
                                    editChannel(i, "spend", e.target.value)
                                  }
                                />
                              </td>
                              <td
                                className={
                                  channel.contribution < 0
                                    ? "sim-negative"
                                    : "sim-positive"
                                }
                              >
                                {rowError ? "—" : money(channel.contribution)}
                              </td>
                              <td>
                                {rowError
                                  ? "—"
                                  : channel.spend > 0
                                    ? money(
                                        channel.contribution / channel.spend,
                                      )
                                    : "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="sim-decision-fields">
                      <fieldset disabled={busy}>
                        <legend>
                          {t(
                            "Where would you run the next small budget test?",
                          )}{" "}
                        </legend>
                        {[
                          ["Email", "Email"],
                          ["Ads", "Ads"],
                          ["Neither", "Hold the budget and investigate"],
                        ].map(([value, label]) => (
                          <label key={value}>
                            <input
                              type="radio"
                              name="channel"
                              value={value}
                              checked={answers.channel === value}
                              onChange={() =>
                                answer("channel", value as Answers["channel"])
                              }
                            />
                            {t(label)}
                          </label>
                        ))}
                      </fieldset>
                      <fieldset disabled={busy}>
                        <legend>
                          {t("Which evidence supports your decision?")}
                        </legend>
                        {[
                          [
                            "contribution",
                            "Contribution per dollar of ad spend",
                          ],
                          ["volume", "More paid orders show which channel can absorb more budget"],
                          ["conversion", "A higher conversion rate means the next customer will cost less"],
                        ].map(([value, label]) => (
                          <label key={value}>
                            <input
                              type="radio"
                              name="evidence"
                              value={value}
                              checked={answers.evidence === value}
                              onChange={() =>
                                answer("evidence", value as Answers["evidence"])
                              }
                            />
                            {t(label)}
                          </label>
                        ))}
                      </fieldset>
                      <fieldset disabled={busy}>
                        <legend>
                          {t("What would you tell Maya about the risk?")}{" "}
                        </legend>
                        {[
                          [
                            "guaranteed",
                            "A positive return means the budget can be scaled without added risk.",
                          ],
                          [
                            "limited",
                            "One week is limited evidence. Run a small test and measure it.",
                          ],
                          [
                            "none",
                            "Once the formulas are verified, this week is enough evidence for a full rollout.",
                          ],
                        ].map(([value, label]) => (
                          <label key={value}>
                            <input
                              type="radio"
                              name="limitation"
                              value={value}
                              checked={answers.limitation === value}
                              onChange={() =>
                                answer(
                                  "limitation",
                                  value as Answers["limitation"],
                                )
                              }
                            />
                            {t(label)}
                          </label>
                        ))}
                      </fieldset>
                      <label className="sim-note-label" htmlFor="handoff-note">
                        {t("Your handoff note")}{" "}
                        <span>
                          {t("Optional · saved in your review, not graded")}
                        </span>
                      </label>
                      <textarea
                        id="handoff-note"
                        value={answers.note}
                        disabled={busy}
                        maxLength={1200}
                        rows={3}
                        placeholder={t(
                          "Explain your recommendation in your own words…",
                        )}
                        onChange={(e) => answer("note", e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div className="sim-help-row">
                  <button
                    disabled={busy}
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        hints: s.hints.includes(active)
                          ? s.hints
                          : [...s.hints, active],
                      }))
                    }
                  >
                    <Lightbulb size={17} />
                    {state.hints.includes(active)
                      ? t("Hint opened")
                      : t("Show a worked hint")}
                  </button>
                  <span>{t("Hint use is recorded in your review.")}</span>
                </div>
                {state.hints.includes(active) && (
                  <p className="sim-hint" role="status">
                    {t(hintCopy[active])}
                  </p>
                )}
                {taskResult && taskResult.checks.some((c) => !c.passed) && (
                  <details className="sim-previous-feedback">
                    <summary>{t("Feedback from your last submission")}</summary>
                    {taskResult.checks
                      .filter((c) => !c.passed)
                      .slice(0, 3)
                      .map((c) => (
                        <p key={feedback(t, c.name)}>
                          <strong>{feedback(t, c.name)}:</strong>{" "}
                          {feedback(t, c.explanation)}
                          <br />
                          {t("Expected {expected}; submitted {actual}.", {
                            expected: feedback(t, c.expected),
                            actual: errorText({ error: c.actual, code: c.code, params: c.params }),
                          })}
                        </p>
                      ))}
                  </details>
                )}
                <div className="sim-task-next">
                  {active !== "judgment" ? (
                    <button
                      className="primary-button"
                      disabled={busy}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          active:
                            active === "revenue" ? "conversion" : "judgment",
                        }))
                      }
                    >
                      {t(
                        active === "revenue"
                          ? "Continue to conversion"
                          : "Continue to your decision",
                      )}
                      <ArrowRight size={17} />
                    </button>
                  ) : (
                    <>
                      <p>
                        {t("Submit all three parts for feedback.")} <br />
                        {missingDecision
                          ? t("Answer the three decision questions to submit.")
                          : t(
                              "Your formulas will also be checked on new data.",
                            )}
                      </p>
                      <button
                        className="primary-button"
                        disabled={busy || !!rowError || missingDecision}
                        onClick={submit}
                      >
                        {busy ? (
                          <>
                            <LoaderCircle className="spin" size={17} />
                            {t("Checking your report…")}{" "}
                          </>
                        ) : (
                          <>
                            {t("Submit my work")} <ArrowRight size={17} />
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
                {error && (
                  <p className="sim-error" role="alert">
                    {errorText(error)}
                  </p>
                )}
              </section>
            </div>
            <div className="sim-session-tools">
              <button
                className="sim-source-reset"
                onClick={() => setDialog("restore")}
                disabled={busy}
              >
                <RotateCcw size={14} />
                {t("Restore source data")}{" "}
              </button>
              <p className="sim-autosave">
                <ShieldCheck size={14} />
                {saveStatus === "future-version"
                  ? FUTURE_VERSION_WARNING[language]
                  : saveStatus === "unavailable"
                  ? t("Saving unavailable in this browser")
                  : t(
                      "Your formulas, edits and decisions are saved in this browser.",
                    )}
              </p>
            </div>
          </>
        ) : latest ? (
          <>
            <section className="sim-result-heading">
              <div className={`sim-result-icon ${done ? "passed" : ""}`}>
                {done ? <CheckCheck size={32} /> : <BookOpen size={32} />}
              </div>
              <h1 ref={heading} tabIndex={-1}>
                {done
                  ? t("You can defend this report.")
                  : t("Now you know what to practice.")}
              </h1>
              <p>
                {done
                  ? t(
                      "Your formulas held up on new data, and your recommendation follows the evidence.",
                    )
                  : t(
                      "Your work exposed a few gaps. Review the evidence, repair your approach, and submit again.",
                    )}
              </p>
            </section>
            <section
              className="sim-review-panel"
              aria-label={t("Your work trial review")}
            >
              <div className="sim-score-heading">
                <div>
                  <h2>{t("Your assignment review")}</h2>
                  <p>
                    {t("Sales operations · assignment {n}", {
                      n: scenario.seed + 1,
                    })}
                  </p>
                </div>
                <div className="sim-score">
                  <strong>{latest.score}</strong>
                  <span>/100</span>
                </div>
              </div>
              <div className="sim-review-meta">
                <span>
                  {t(
                    state.submissions.length === 1
                      ? "{n} submission"
                      : "{n} submissions",
                    { n: state.submissions.length },
                  )}
                </span>
                <span>
                  {latest.snapshot
                    ? t(
                        latest.snapshot.hints.length === 1
                          ? "{n} worked hint opened"
                          : "{n} worked hints opened",
                        { n: latest.snapshot.hints.length },
                      )
                    : t("Hints not recorded in this older review")}
                </span>
                {state.submissions.length > 1 && (
                  <span>
                    {t("First submission: {score}/100", {
                      score: state.submissions[0].score,
                    })}
                  </span>
                )}
              </div>
              {latest.skills.map((skill) => (
                <div className="sim-skill-result" key={skill.id}>
                  <div>
                    <span
                      className={
                        skill.score === skill.maximum
                          ? "sim-positive"
                          : "sim-negative"
                      }
                    >
                      {skill.score === skill.maximum ? (
                        <Check size={20} />
                      ) : (
                        <CircleAlert size={20} />
                      )}
                    </span>
                    <h3>{t(skill.name)}</h3>
                    <strong>
                      {skill.score}/{skill.maximum}
                    </strong>
                    <button onClick={() => practice(skill.id)}>
                      {skill.score === skill.maximum
                        ? t("Review")
                        : t("Practice")}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <p>
                    {t("{passed} of {total} checks passed.", {
                      passed: skill.checks.filter((c) => c.passed).length,
                      total: skill.checks.length,
                    })}
                  </p>
                  <details>
                    <summary>
                      {skill.score === skill.maximum
                        ? t("See what held up")
                        : t("See the evidence")}
                    </summary>
                    {skill.checks.map((c) => (
                      <div
                        className={`sim-check ${c.passed ? "passed" : "failed"}`}
                        key={feedback(t, c.name)}
                      >
                        <strong>
                          {c.passed ? (
                            <Check size={14} />
                          ) : (
                            <CircleAlert size={14} />
                          )}
                          {feedback(t, c.name)}
                        </strong>
                        <span>
                          {t("Expected: {expected} · Submitted: {actual}", {
                            expected: feedback(t, c.expected),
                            actual: errorText({ error: c.actual, code: c.code, params: c.params }),
                          })}
                        </span>
                        {!c.passed && <p>{feedback(t, c.explanation)}</p>}
                      </div>
                    ))}
                  </details>
                </div>
              ))}
            </section>
            <div className="sim-result-actions">
              <button
                className="primary-button"
                onClick={() => (done ? setDialog("new") : practice())}
              >
                {done
                  ? t("Try a fresh assignment")
                  : t("Practice my weakest skill")}
                <ArrowRight size={17} />
              </button>
              <button
                className="secondary-button"
                onClick={() => downloadReview(state, latest, t, errorText)}
              >
                <Download size={16} />
                {t("Download my review")}{" "}
              </button>
            </div>
            <p className="sim-result-limit">
              {t(
                "This score reflects this assignment’s checks. It is not a hiring prediction or a professional certification. A fresh assignment changes the figures and can change the right decision.",
              )}{" "}
            </p>
          </>
        ) : null}
      </main>
      <footer className="sim-footer">
        <span>{t("Fix the Report · practice for work")}</span>
        <span>{t("Fictional scenarios. Real calculations.")}</span>
      </footer>
      {dialog === "help" && (
        <Modal
          title={t("Practice the work, then review it")}
          close={() => setDialog(null)}
        >
          <p>
            {t(
              "This demo is for adults preparing for a sales operations task or interview. It contains one complete fictional assignment and a guided revenue lesson.",
            )}{" "}
          </p>
          <ol className="help-list">
            <li>
              {t(
                "Repair two spreadsheet formulas and make a budget-test recommendation.",
              )}{" "}
            </li>
            <li>
              {t(
                "Submit for a review of 19 revenue checks, 8 conversion checks and 3 decision checks.",
              )}{" "}
            </li>
            <li>
              {t(
                "Practice the gaps, then try a fresh dataset. Hints are recorded; elapsed time does not affect your score.",
              )}{" "}
            </li>
          </ol>
          <p>
            {t(
              "All data is fictional. Progress stays in this browser; there is no account or AI-generated grading.",
            )}{" "}
          </p>
          <button className="primary-button" onClick={() => setDialog(null)}>
            {t("Start exploring")} <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {dialog === "restore" && (
        <Modal
          title={t("Restore the source data?")}
          close={() => setDialog(null)}
        >
          <p>
            {t(
              "This restores the orders, leads and ad spend for this assignment. Your formulas, decisions and earlier feedback will stay saved.",
            )}{" "}
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDialog(null)}
            >
              {t("Keep my edits")}{" "}
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setState((s) => ({
                  ...s,
                  scenario: createScenario(s.scenario.seed),
                }));
                setDialog(null);
              }}
            >
              {t("Restore data")}{" "}
            </button>
          </div>
        </Modal>
      )}
      {dialog === "new" && (
        <Modal
          title={t("Try it without the same answers")}
          close={() => setDialog(null)}
        >
          <p>
            {t(
              "The next assignment changes amounts, lead counts and channel costs. It starts a fresh review history. Download your current review first if you want to keep it.",
            )}{" "}
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDialog(null)}
            >
              {t("Keep this review")}{" "}
            </button>
            <button className="primary-button" onClick={fresh}>
              {t("Start fresh assignment")} <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
