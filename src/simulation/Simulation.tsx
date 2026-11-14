import { useEffect, useRef, useState } from "react";
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

function downloadReview(state: TrialState, result: Submission) {
  const snapshot = result.snapshot;
  const text = [
    "# Fix the Report — Work trial review",
    "",
    "Sales operations · The Friday revenue review",
    "Fictional training assignment. This score describes this exercise, not hiring readiness.",
    "",
    `Score: ${result.score}/100`,
    `Submitted: ${result.at}`,
    `Attempts: ${state.submissions.length}`,
    `Hints used: ${snapshot ? snapshot.hints.length : "Not recorded in this older review"}`,
    "",
    ...result.skills.flatMap((skill) => [
      `## ${skill.name}: ${skill.score}/${skill.maximum}`,
      ...skill.checks.map(
        (c) =>
          `- ${c.passed ? "PASS" : "REVIEW"}: ${c.name}. Expected: ${c.expected}. Submitted: ${c.actual}.`,
      ),
      "",
    ]),
    ...(snapshot
      ? [
          "## Submitted formulas",
          `Revenue: ${snapshot.answers.revenue}`,
          `Conversion: ${snapshot.answers.conversion}`,
          "",
          "## Personal handoff note (not graded)",
          snapshot.answers.note || "No note added.",
          "",
          "## Source data at submission",
          `Assignment: ${snapshot.scenario.seed + 1}`,
          "",
          "```json",
          JSON.stringify(snapshot.scenario, null, 2),
          "```",
        ]
      : [
          "The formulas, source data and handoff note were not recorded in this older review. Submit again to save a complete snapshot.",
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

export function Simulation() {
  const [state, setState] = useState<TrialState>(() => {
    try {
      return restoreTrial(localStorage.getItem(TRIAL_KEY));
    } catch {
      return initialTrial();
    }
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
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
      localStorage.setItem(TRIAL_KEY, JSON.stringify(state));
      setSaveError(false);
    } catch {
      setSaveError(true);
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
              revenue: { error: e.message },
              conversion: { error: e.message },
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
    setError("");
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
    setError("");
    setPreview(null);
  }
  async function submit() {
    if (rowError) return;
    setBusy(true);
    setError("");
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
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
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
          aria-label="Fix the Report home"
        >
          <span>
            <FileSpreadsheet size={23} />
          </span>
          fix the report.
        </button>
        <nav aria-label="Main navigation">
          <span className="sim-current-nav">Work simulations</span>
          <a href="#practice">Guided practice</a>
          <button
            onClick={() => setDialog("help")}
            aria-label="About this work trial"
          >
            <CircleHelp size={19} />
          </button>
        </nav>
      </header>
      <main className="sim-main">
        {saveError && (
          <p className="sim-error" role="status">
            Your browser cannot save this session. Keep the tab open to preserve
            your work.
          </p>
        )}
        {stage === "home" ? (
          <>
            <section className="sim-hero">
              <div className="sim-hero-copy">
                <h1 ref={heading} tabIndex={-1}>
                  Your next interview
                  <br />
                  has a spreadsheet.
                </h1>
                <p>
                  Rehearse the work before the real thing. Repair a flawed
                  report, make a decision, and find out exactly what to practice
                  next.
                </p>
                <div className="sim-hero-actions">
                  <button className="primary-button" onClick={start}>
                    {state.startedAt
                      ? "Continue my work trial"
                      : "Start the work trial"}
                    <ArrowRight size={18} />
                  </button>
                  <span>Free demo · no account needed</span>
                </div>
                <div className="sim-audience">
                  <BriefcaseBusiness size={18} />
                  <span>
                    For your next sales operations role
                    <br />
                    <small>
                      One complete assignment · self-paced · about 20 minutes
                    </small>
                  </span>
                </div>
              </div>
              <div className="sim-assignment-preview">
                <div className="sim-document-top">
                  <Mail size={17} />
                  <span>Your practice assignment</span>
                  <span>01</span>
                </div>
                <div className="sim-preview-body">
                  <h2>The Friday revenue review</h2>
                  <p>
                    “The report looks promising. Before we move next week’s
                    budget, can you check the numbers and tell me what you’d
                    do?”
                  </p>
                  <div className="sim-sender">
                    <span className="sim-avatar">M</span>
                    <span>
                      Maya Chen
                      <small>Operations lead · fictional company</small>
                    </span>
                  </div>
                </div>
                <div className="sim-preview-bottom">
                  <FileSpreadsheet size={20} />
                  <div>
                    <strong>weekly_report.xlsx</strong>
                    <span>
                      Orders, acquisition data & a questionable recommendation
                    </span>
                  </div>
                  <ChevronRight size={17} />
                </div>
              </div>
            </section>
            <section
              className="sim-overview"
              aria-labelledby="overview-heading"
            >
              <div>
                <h2 id="overview-heading">Show how you think.</h2>
                <p>
                  Work through the same report from raw numbers to a
                  recommendation. Get specific feedback, then try again with
                  different data.
                </p>
              </div>
              <ol>
                {tasks.map((task, i) => (
                  <li key={task.id}>
                    <span>{i + 1}</span>
                    <div>
                      <h3>{task.title}</h3>
                      <p>{task.detail}</p>
                    </div>
                    <small>{task.points} points</small>
                  </li>
                ))}
              </ol>
            </section>
            <section className="sim-practice-row">
              <BookOpen size={24} />
              <div>
                <h2>Need a warm-up?</h2>
                <p>
                  Find the cancelled order that breaks a revenue formula. A
                  guided, five-minute exercise.
                </p>
              </div>
              <a className="secondary-button" href="#practice">
                Try guided practice <ArrowRight size={16} />
              </a>
            </section>
            {latest && (
              <div className="sim-saved-result">
                <CheckCheck size={18} />
                <span>
                  Last submission: <strong>{latest.score}/100</strong> · saved
                  in this browser
                </span>
                <button
                  onClick={() => setState((s) => ({ ...s, stage: "result" }))}
                >
                  View review <ArrowRight size={15} />
                </button>
              </div>
            )}
          </>
        ) : stage === "work" ? (
          <>
            <div className="sim-page-title">
              <div>
                <h1 ref={heading} tabIndex={-1}>
                  The Friday revenue review
                </h1>
                <p>
                  You’re the sales operations candidate. Make this report ready
                  for a decision.
                </p>
              </div>
              <span className="sim-session-tag">
                <BriefcaseBusiness size={15} /> Assignment {scenario.seed + 1}
              </span>
            </div>
            <details className="sim-brief" open>
              <summary>
                <Mail size={18} />
                <span>From Maya, your operations lead</span>
                <ChevronRight size={16} />
              </summary>
              <div>
                <p>
                  Check <strong>paid revenue</strong>, calculate the{" "}
                  <strong>overall lead-to-paid conversion</strong>, then
                  recommend where to run the next small acquisition test.
                </p>
                <p>
                  Count only Paid orders. Cancelled and Pending orders do not
                  count as revenue or conversions. Use all leads as the
                  conversion denominator; with zero total leads, report{" "}
                  <strong>N/A</strong>.
                </p>
                <p>
                  For this exercise, contribution is paid revenue minus ad
                  spend. Compare contribution per dollar of ad spend; choose the
                  higher positive ratio. If neither is positive, or the ratios
                  tie, hold the budget. Other costs are held constant. One week
                  of results cannot guarantee future returns.
                </p>
                <span>
                  Fictional training data · USD · one paid order per converted
                  lead
                </span>
              </div>
            </details>
            <div className="sim-work-layout">
              <aside className="sim-task-list" aria-label="Assignment tasks">
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
                      <strong>{task.title}</strong>
                      <small>{task.points} points</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
                <div className="sim-draft-note">
                  <FileSpreadsheet size={20} />
                  <h2>A draft is a starting point.</h2>
                  <p>
                    The formulas and recommendation below are prepared examples.
                    Check the evidence before relying on them.
                  </p>
                </div>
              </aside>
              <section
                ref={taskPanel}
                className="sim-task-panel"
                aria-label={tasks.find((t) => t.id === active)!.title}
              >
                <div className="sim-task-heading">
                  <h2 ref={taskHeading} tabIndex={-1}>
                    {tasks.find((t) => t.id === active)!.title}
                  </h2>
                  <span>
                    {tasks.find((t) => t.id === active)!.points} points
                  </span>
                </div>
                {rowError && (
                  <p className="sim-error" role="alert">
                    {rowError}
                  </p>
                )}
                {active === "revenue" ? (
                  <>
                    <p className="sim-task-description">
                      The draft adds every order. Check which statuses belong in
                      paid revenue, then repair the formula. You can edit the
                      source data to test your reasoning.
                    </p>
                    <div className="sim-formula-section">
                      <label htmlFor="trial-revenue">
                        Paid revenue formula
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
                      <div className="sim-live-result">
                        <span>Your report total</span>
                        <strong aria-live="polite">
                          {calculating
                            ? "Calculating…"
                            : typeof preview?.revenue.value === "number"
                              ? money(preview.revenue.value)
                              : "—"}
                        </strong>
                      </div>
                      {preview?.revenue.error && !calculating && (
                        <p className="sim-error" role="alert">
                          {preview.revenue.error}
                        </p>
                      )}
                    </div>
                    <div className="sim-table-scroll">
                      <table className="sim-orders">
                        <caption>
                          Orders · A: Order ID · B: Status · C: Amount. E- IDs
                          are Email; A- IDs are Ads.
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Row</th>
                            <th scope="col">A · Order ID</th>
                            <th scope="col">B · Status</th>
                            <th scope="col">C · Amount ($)</th>
                            <th scope="col">
                              <span className="sr-only">Remove</span>
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
                                  aria-label={`Status for ${order.id}`}
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
                                    <option key={s}>{s}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  aria-label={`Amount for ${order.id}`}
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
                                  aria-label={`Remove ${order.id}`}
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
                          No orders. Paid revenue should be zero. Add an order
                          to keep testing.
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
                          <Plus size={15} /> Add {channel} order
                        </button>
                      ))}
                      <span>{scenario.orders.length}/100 orders</span>
                    </div>
                  </>
                ) : active === "conversion" ? (
                  <>
                    <p className="sim-task-description">
                      The draft averages the two channel percentages. Does that
                      give each lead the same weight? Paid orders below update
                      when you change order statuses.
                    </p>
                    <div className="sim-formula-section">
                      <label htmlFor="trial-conversion">
                        Overall conversion formula
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
                      <div className="sim-live-result">
                        <span>Your overall conversion</span>
                        <strong aria-live="polite">
                          {calculating
                            ? "Calculating…"
                            : rate(preview?.conversion.value)}
                        </strong>
                      </div>
                      {preview?.conversion.error && !calculating && (
                        <p className="sim-error" role="alert">
                          {preview.conversion.error}
                        </p>
                      )}
                    </div>
                    <div className="sim-table-scroll">
                      <table className="sim-channels">
                        <caption>
                          Acquisition sheet · row 1 contains headers. Formulas
                          can reference A1:D101.
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Row</th>
                            <th scope="col">A · Channel</th>
                            <th scope="col">B · Leads</th>
                            <th scope="col">C · Paid orders</th>
                            <th scope="col">D · Conversion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.map((channel, i) => (
                            <tr key={channel.name}>
                              <th scope="row">{i + 2}</th>
                              <td>{channel.name}</td>
                              <td>
                                <input
                                  aria-label={`Leads for ${channel.name}`}
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
                      Change the lead counts to test your formula. New channels
                      and zero-lead cases are included when you submit.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="sim-task-description">
                      The draft recommends Ads because it brought more paid
                      orders. Use the corrected source data to decide whether
                      that recommendation holds up.
                    </p>
                    <div className="sim-table-scroll">
                      <table className="sim-economics">
                        <caption>
                          Channel economics · source data, independent of your
                          submitted formulas
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Channel</th>
                            <th scope="col">Paid revenue</th>
                            <th scope="col">Ad spend ($)</th>
                            <th scope="col">Contribution</th>
                            <th scope="col">Per $1 spent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.map((channel, i) => (
                            <tr key={channel.name}>
                              <th scope="row">{channel.name}</th>
                              <td>{rowError ? "—" : money(channel.revenue)}</td>
                              <td>
                                <input
                                  aria-label={`Ad spend for ${channel.name}`}
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
                          Where would you run the next small budget test?
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
                            {label}
                          </label>
                        ))}
                      </fieldset>
                      <fieldset disabled={busy}>
                        <legend>Which evidence supports your decision?</legend>
                        {[
                          [
                            "contribution",
                            "Contribution per dollar of ad spend",
                          ],
                          ["volume", "The number of paid orders"],
                          ["conversion", "Conversion rate alone"],
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
                            {label}
                          </label>
                        ))}
                      </fieldset>
                      <fieldset disabled={busy}>
                        <legend>
                          What would you tell Maya about the risk?
                        </legend>
                        {[
                          [
                            "guaranteed",
                            "The same return is guaranteed at a higher budget.",
                          ],
                          [
                            "limited",
                            "One week is limited evidence. Run a small test and measure it.",
                          ],
                          [
                            "none",
                            "The totals are correct, so no more evidence is needed.",
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
                            {label}
                          </label>
                        ))}
                      </fieldset>
                      <label className="sim-note-label" htmlFor="handoff-note">
                        Your handoff note{" "}
                        <span>Optional · saved in your review, not graded</span>
                      </label>
                      <textarea
                        id="handoff-note"
                        value={answers.note}
                        disabled={busy}
                        maxLength={1200}
                        rows={3}
                        placeholder="Explain your recommendation in your own words…"
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
                      ? "Hint opened"
                      : "Show a worked hint"}
                  </button>
                  <span>Hint use is recorded in your review.</span>
                </div>
                {state.hints.includes(active) && (
                  <p className="sim-hint" role="status">
                    {hintCopy[active]}
                  </p>
                )}
                {taskResult && taskResult.checks.some((c) => !c.passed) && (
                  <details className="sim-previous-feedback">
                    <summary>Feedback from your last submission</summary>
                    {taskResult.checks
                      .filter((c) => !c.passed)
                      .slice(0, 3)
                      .map((c) => (
                        <p key={c.name}>
                          <strong>{c.name}:</strong> {c.explanation}
                          <br />
                          Expected {c.expected}; submitted {c.actual}.
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
                      Continue to{" "}
                      {active === "revenue" ? "conversion" : "your decision"}
                      <ArrowRight size={17} />
                    </button>
                  ) : (
                    <>
                      <p>
                        Submit all three parts for feedback.
                        <br />
                        {missingDecision
                          ? "Answer the three decision questions to submit."
                          : "Your formulas will also be checked on new data."}
                      </p>
                      <button
                        className="primary-button"
                        disabled={busy || !!rowError || missingDecision}
                        onClick={submit}
                      >
                        {busy ? (
                          <>
                            <LoaderCircle className="spin" size={17} />
                            Checking your report…
                          </>
                        ) : (
                          <>
                            Submit my work
                            <ArrowRight size={17} />
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
                {error && (
                  <p className="sim-error" role="alert">
                    {error}
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
                Restore source data
              </button>
              <p className="sim-autosave">
                <ShieldCheck size={14} />
                {saveError
                  ? "Saving unavailable in this browser"
                  : "Your formulas, edits and decisions are saved in this browser."}
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
                  ? "You can defend this report."
                  : "Now you know what to practice."}
              </h1>
              <p>
                {done
                  ? "Your formulas held up on new data, and your recommendation follows the evidence."
                  : "Your work exposed a few gaps. Review the evidence, repair your approach, and submit again."}
              </p>
            </section>
            <section
              className="sim-review-panel"
              aria-label="Your work trial review"
            >
              <div className="sim-score-heading">
                <div>
                  <h2>Your assignment review</h2>
                  <p>Sales operations · assignment {scenario.seed + 1}</p>
                </div>
                <div className="sim-score">
                  <strong>{latest.score}</strong>
                  <span>/100</span>
                </div>
              </div>
              <div className="sim-review-meta">
                <span>
                  {state.submissions.length}{" "}
                  {state.submissions.length === 1
                    ? "submission"
                    : "submissions"}
                </span>
                <span>
                  {latest.snapshot
                    ? `${latest.snapshot.hints.length} worked ${latest.snapshot.hints.length === 1 ? "hint" : "hints"} opened`
                    : "Hints not recorded in this older review"}
                </span>
                {state.submissions.length > 1 && (
                  <span>
                    First submission: {state.submissions[0].score}/100
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
                    <h3>{skill.name}</h3>
                    <strong>
                      {skill.score}/{skill.maximum}
                    </strong>
                    <button onClick={() => practice(skill.id)}>
                      {skill.score === skill.maximum ? "Review" : "Practice"}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <p>
                    {skill.checks.filter((c) => c.passed).length} of{" "}
                    {skill.checks.length} checks passed.
                  </p>
                  <details>
                    <summary>
                      {skill.score === skill.maximum
                        ? "See what held up"
                        : "See the evidence"}
                    </summary>
                    {skill.checks.map((c) => (
                      <div
                        className={`sim-check ${c.passed ? "passed" : "failed"}`}
                        key={c.name}
                      >
                        <strong>
                          {c.passed ? (
                            <Check size={14} />
                          ) : (
                            <CircleAlert size={14} />
                          )}
                          {c.name}
                        </strong>
                        <span>
                          Expected: {c.expected} · Submitted: {c.actual}
                        </span>
                        {!c.passed && <p>{c.explanation}</p>}
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
                {done ? "Try a fresh assignment" : "Practice my weakest skill"}
                <ArrowRight size={17} />
              </button>
              <button
                className="secondary-button"
                onClick={() => downloadReview(state, latest)}
              >
                <Download size={16} />
                Download my review
              </button>
            </div>
            <p className="sim-result-limit">
              This score reflects this assignment’s checks. It is not a hiring
              prediction or a professional certification. A fresh assignment
              changes the figures and can change the right decision.
            </p>
          </>
        ) : null}
      </main>
      <footer className="sim-footer">
        <span>Fix the Report · practice for work</span>
        <span>Fictional scenarios. Real calculations.</span>
      </footer>
      {dialog === "help" && (
        <Modal
          title="Practice the work, then review it"
          close={() => setDialog(null)}
        >
          <p>
            This demo is for adults preparing for a sales operations task or
            interview. It contains one complete fictional assignment and a
            guided revenue lesson.
          </p>
          <ol className="help-list">
            <li>
              Repair two spreadsheet formulas and make a budget-test
              recommendation.
            </li>
            <li>
              Submit for a review of 19 revenue checks, 8 conversion checks and
              3 decision checks.
            </li>
            <li>
              Practice the gaps, then try a fresh dataset. Hints are recorded;
              elapsed time does not affect your score.
            </li>
          </ol>
          <p>
            All data is fictional. Progress stays in this browser; there is no
            account or AI-generated grading.
          </p>
          <button className="primary-button" onClick={() => setDialog(null)}>
            Start exploring
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {dialog === "restore" && (
        <Modal title="Restore the source data?" close={() => setDialog(null)}>
          <p>
            This restores the orders, leads and ad spend for this assignment.
            Your formulas, decisions and earlier feedback will stay saved.
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDialog(null)}
            >
              Keep my edits
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
              Restore data
            </button>
          </div>
        </Modal>
      )}
      {dialog === "new" && (
        <Modal
          title="Try it without the same answers"
          close={() => setDialog(null)}
        >
          <p>
            The next assignment changes amounts, lead counts and channel costs.
            It starts a fresh review history. Download your current review first
            if you want to keep it.
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDialog(null)}
            >
              Keep this review
            </button>
            <button className="primary-button" onClick={fresh}>
              Start fresh assignment
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
