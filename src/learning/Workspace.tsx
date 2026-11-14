import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileSpreadsheet,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  Target,
} from "lucide-react";
import { feedback, translate, type Language } from "../i18n";
import { gradeLesson, previewLesson } from "./client";
import { Modal } from "../App";
import {
  formatLessonValue,
  getLesson,
  isLessonComplete,
  normalizeRows,
  parseCellNumber,
  validateLessonRows,
  type Copy,
  type Lesson,
  type LessonDraft,
  type LessonResult,
} from "./model";

type WorkspaceProps = {
  lesson: Lesson;
  draft: LessonDraft;
  onDraft: (draft: LessonDraft) => void;
  onComplete: (result: LessonResult) => void;
  onExit: () => void;
  language: Language;
};

function text(language: Language, en: string, ru: string) {
  return language === "ru" ? ru : en;
}

function readableError(message: string, language: Language) {
  const validation: Record<string, string> = {
    "Use up to 100 data rows.": "В отчёте может быть не больше 100 строк данных.",
    "Check the report's row structure.": "Проверьте структуру строк отчёта.",
    "Enter numbers from 0 to 1,000,000.": "Введите числа от 0 до 1 000 000 во все числовые ячейки.",
    "Enter a number without a thousands separator, for example 1000.": "Укажите число без разделителя тысяч, например 1000",
    "Leads and sales must be whole numbers.": "Число лидов и продаж должно быть целым.",
    "Use no more than two decimal places for money.": "Укажите денежные суммы с точностью до двух знаков после запятой.",
    "Choose Paid, Cancelled or Pending for each order.": "Для каждого заказа нужен статус Paid, Cancelled или Pending.",
    "A refund cannot exceed the order amount.": "Сумма возврата не может превышать сумму заказа.",
    "Sales cannot exceed leads.": "Число продаж не может быть больше числа лидов.",
    "Keep both Email and Ads in this comparison.": "Для сравнения нужны оба канала: рассылка и реклама.",
  };
  if (language === "ru" && validation[message]) return validation[message];
  const localized = feedback((key, values) => translate(language, key, values), message);
  if (language === "ru" && localized === message) {
    return "Не удалось проверить данные. Используйте неотрицательные числа и проверьте формулу: названия функций, запятые, кавычки и скобки.";
  }
  return localized;
}

function Choice({
  name,
  id,
  selected,
  onChange,
  children,
}: {
  name: string;
  id: string;
  selected: string;
  onChange: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <label className={`lr-option${selected === id ? " is-selected" : ""}`}>
      <input type="radio" name={name} value={id} checked={selected === id} onChange={() => onChange(id)} />
      <span>{children}</span>
      {selected === id && <Check size={17} aria-hidden="true" />}
    </label>
  );
}

export function Workspace({ lesson, draft, onDraft, onComplete, onExit, language }: WorkspaceProps) {
  const tr = (en: string, ru: string) => text(language, en, ru);
  const heading = useRef<HTMLHeadingElement>(null);
  const [preview, setPreview] = useState<{ value?: number | string; error?: string } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [repairReview, setRepairReview] = useState<LessonResult | null>(null);
  const [confirmSolution, setConfirmSolution] = useState(false);
  const [cellEdits, setCellEdits] = useState<Record<string, string>>({});
  const activeRequest = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const rowsError = validateLessonRows(lesson, draft.rows);
  const normalizedRows = rowsError ? draft.rows : normalizeRows(lesson, draft.rows);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
    setError("");
  }, [draft.step, lesson.id]);

  useEffect(() => () => { activeRequest.current?.abort(); }, []);

  useEffect(() => {
    if (draft.step !== 1 || lesson.kind !== "formula") return;
    if (rowsError) {
      setPreview(null);
      setCalculating(false);
      return;
    }
    const controller = new AbortController();
    let current = true;
    setCalculating(true);
    const timer = setTimeout(() => {
      previewLesson(lesson.id, draft.rows, draft.formula, controller.signal)
        .then((result) => { if (current) setPreview(result); })
        .catch((err: unknown) => {
          if (current && !(err instanceof DOMException && err.name === "AbortError")) {
            setPreview({ error: err instanceof Error ? err.message : "Could not calculate this formula." });
          }
        })
        .finally(() => { if (current) setCalculating(false); });
    }, 180);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [lesson.id, lesson.kind, draft.rows, draft.formula, draft.step, rowsError]);

  function updateDraft(patch: Partial<LessonDraft>) {
    activeRequest.current?.abort();
    requestId.current += 1;
    setBusy(false);
    setError("");
    setRepairReview(null);
    onDraft({ ...draft, ...patch });
  }

  function updateCell(row: number, column: number, value: string) {
    setCellEdits((previous) => ({ ...previous, [`${row}:${column}`]: value }));
    const parsed = parseCellNumber(value);
    const number = "value" in parsed ? parsed.value : value;
    const rows = draft.rows.map((cells, index) => index === row
      ? cells.map((cell, cellIndex) => cellIndex === column ? number : cell)
      : [...cells]);
    updateDraft({ rows });
  }

  function finishCell(row: number, column: number) {
    setCellEdits((previous) => {
      const next = { ...previous };
      delete next[`${row}:${column}`];
      return next;
    });
  }

  async function assess(complete: boolean) {
    setError("");
    if (rowsError) { setError(readableError(rowsError, language)); return; }
    if (!draft.diagnosis) {
      setError(tr("Choose the cause of the error first.", "Сначала выберите причину ошибки в отчёте."));
      return;
    }
    if (lesson.kind === "formula" && !draft.formula.trim()) {
      setError(tr("Write a formula before checking your solution.", "Введите формулу перед проверкой решения."));
      return;
    }
    if (lesson.kind === "decision" && !draft.decision) {
      setError(tr("Choose your recommendation before checking.", "Выберите рекомендацию перед проверкой."));
      return;
    }
    if (complete && !draft.transfer) {
      setError(tr("Choose an answer to the new situation.", "Выберите ответ для новой ситуации."));
      return;
    }
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const id = ++requestId.current;
    setBusy(true);
    try {
      const result = await gradeLesson({
        lessonId: lesson.id,
        rows: draft.rows,
        formula: draft.formula,
        diagnosis: draft.diagnosis,
        decision: draft.decision,
        transfer: draft.transfer,
        hintLevel: draft.hintLevel,
      }, controller.signal);
      if (id !== requestId.current || controller.signal.aborted) return;
      if (complete) onComplete(result);
      else setRepairReview(result);
    } catch (err) {
      if (id === requestId.current && !controller.signal.aborted) {
        setError(readableError(err instanceof Error ? err.message : "Could not check the solution. Please try again.", language));
      }
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  function displayCell(value: string | number, column: number) {
    if (typeof value === "number") {
      if (lesson.skill === "conversion" && column === 3) return formatLessonValue(value, "percent", language);
      return new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 2 }).format(value);
    }
    const statuses: Record<string, string> = { Paid: "Оплачен", Cancelled: "Отменён", Pending: "В ожидании", Refunded: "Возврат", Email: "Рассылка", Ads: "Реклама", Organic: "Поиск", Referral: "Рекомендации" };
    return language === "ru" ? (statuses[value] ?? value) : value;
  }

  const stages = [tr("The brief", "Задача"), tr("Fix the report", "Исправление"), tr("Apply the skill", "Закрепление")];

  return (
    <article className="lr-workspace">
      <div className="lr-work-top">
        <button className="lr-btn-quiet" type="button" onClick={onExit}><ArrowLeft size={17} />{tr("My learning", "Моё обучение")}</button>
        <span className="lr-eyebrow"><Clock3 size={14} />{lesson.minutes} {tr("min · your pace", "мин · в своём темпе")}</span>
      </div>
      <ol className="lr-stepper" aria-label={tr("Lesson progress", "Этапы задания")}>
        {stages.map((stage, index) => <li key={index} className={index === draft.step ? "is-current" : index < draft.step ? "is-complete" : ""} aria-current={index === draft.step ? "step" : undefined}>
          <span>{index < draft.step ? <Check size={14} /> : index + 1}</span><strong>{stage}</strong>
        </li>)}
      </ol>
      <header className="lr-lesson-heading">
        <p className="lr-eyebrow">{lesson.company} <span aria-hidden="true">/</span> {tr("Practice case", "Учебный кейс")}</p>
        <h1 ref={heading} tabIndex={-1}>{draft.step === 2 ? tr("A new situation. Same skill.", "Новая ситуация. Тот же навык.") : lesson.title[language]}</h1>
        <p>{draft.step === 2 ? tr("Check that the idea works beyond the report you just fixed.", "Проверьте, что вы поняли принцип и сможете применить его в другой задаче.") : lesson.summary[language]}</p>
      </header>

      {draft.step === 0 && <>
        <div className="lr-brief-grid">
          <article className="lr-memo">
            <div className="lr-memo-sender"><span className="lr-company-mark"><Building2 size={22} /></span><div><strong>{lesson.company}</strong><p>{tr("A note from your team lead", "Сообщение от руководителя")}</p></div><span className="lr-memo-dot" aria-hidden="true" /></div>
            <div className="lr-memo-body"><p>{lesson.brief[language]}</p><div className="lr-memo-objective"><Target size={21} /><div><strong>{tr("Your task", "Ваша задача")}</strong><p>{lesson.objective[language]}</p></div></div></div>
            <div className="lr-memo-attachment"><FileSpreadsheet size={22} /><div><strong>{tr("Report to review", "Отчёт для проверки")}</strong><span>{draft.rows.length} {tr("rows · editable worksheet", "строк · можно менять данные")}</span></div><span className="lr-file-tag">.sheet</span></div>
          </article>
          <aside className="lr-brief-aside">
            <span className="lr-aside-icon"><Lightbulb size={25} /></span>
            <h2>{tr("Learn by doing", "Разберётесь на практике")}</h2>
            <ol><li><span>01</span>{tr("Find what the report gets wrong.", "Найдите ошибку в отчёте.")}</li><li><span>02</span>{tr("Repair it and test your idea.", "Исправьте и проверьте решение.")}</li><li><span>03</span>{tr("Apply the rule to a new situation.", "Примените правило в новой ситуации.")}</li></ol>
            <p>{tr("Hints are available. There is no timer, and you can retry.", "Подсказки рядом. Таймера нет, задание можно повторить.")}</p>
          </aside>
        </div>
        <div className="lr-work-footer"><span>{tr("Fictional company and training data", "Вымышленная компания и учебные данные")}</span><button type="button" className="lr-btn-primary" onClick={() => updateDraft({ step: 1 })}>{tr("Open the report", "Открыть отчёт")}<ArrowRight size={18} /></button></div>
      </>}

      {draft.step === 1 && <>
        <div className="lr-work-grid">
          <section className="lr-data-panel" aria-label={tr("Report data", "Данные отчёта")}>
            <div className="lr-panel-heading"><span className="lr-panel-icon"><FileSpreadsheet size={20} /></span><div><h2>{tr("The source report", "Исходный отчёт")}</h2><p>{tr("Change a number and see what happens.", "Измените число и посмотрите, что произойдёт.")}</p></div></div>
            <div className="lr-sheet-wrap" tabIndex={0} role="region" aria-label={tr("Worksheet, scroll horizontally if needed", "Таблица, при необходимости прокрутите вправо")}>
              <table className="lr-sheet"><thead><tr><th className="lr-row-number" scope="col"><span className="lr-sr-only">{tr("Row", "Строка")}</span></th>{lesson.columns.map((column, i) => <th key={i} scope="col"><span className="lr-column-letter">{String.fromCharCode(65 + i)}</span>{column[language]}</th>)}</tr></thead><tbody>{normalizedRows.map((row, rowIndex) => <tr key={rowIndex}><th className="lr-row-number" scope="row">{rowIndex + 2}</th>{row.map((value, columnIndex) => <td key={columnIndex} className={typeof value === "number" || lesson.editableColumns.includes(columnIndex) ? "lr-number-cell" : undefined}>{lesson.editableColumns.includes(columnIndex) ? <input aria-label={`${lesson.columns[columnIndex][language]}${tr(", row ", ", строка ")}${rowIndex + 2}`} inputMode="decimal" type="text" value={cellEdits[`${rowIndex}:${columnIndex}`] ?? String(draft.rows[rowIndex][columnIndex])} onBlur={() => finishCell(rowIndex, columnIndex)} onChange={(e) => updateCell(rowIndex, columnIndex, e.target.value)} autoComplete="off" spellCheck={false} aria-invalid={!!rowsError} /> : <span className={typeof value === "string" && ["Paid", "Cancelled", "Pending", "Refunded"].includes(value) ? `lr-status lr-status-${value.toLowerCase()}` : undefined}>{displayCell(value, columnIndex)}</span>}</td>)}</tr>)}</tbody></table>
            </div>
            <div className="lr-data-foot"><span>{lesson.skill === "conversion" ? tr("Fictional data · leads and sales", "Учебные данные · лиды и продажи") : tr("Fictional data · amounts in USD", "Учебные данные · суммы в USD")}</span><button type="button" className="lr-btn-quiet" onClick={() => { setCellEdits({}); updateDraft({ rows: lesson.rows.map((row) => [...row]) }); }}><RotateCcw size={14} />{tr("Reset data", "Вернуть данные")}</button></div>
            {rowsError && <p className="lr-alert" role="alert"><CircleAlert size={17} />{readableError(rowsError, language)}</p>}
            <div className="lr-task-note"><Target size={18} /><p>{lesson.objective[language]}</p></div>
            <section className="lr-hint" aria-label={tr("Lesson hints", "Подсказки к занятию")}>
              {draft.hintLevel === 0 ? <button className="lr-hint-toggle" type="button" onClick={() => updateDraft({ hintLevel: 1 })}><Lightbulb size={18} />{tr("A hint, if you need one", "Подсказка, если понадобится")}</button> : <>
                <h3>{tr("Hints", "Подсказки")}</h3>
                {lesson.hints.slice(0, draft.hintLevel).map((hint, index) => <p key={index}><strong>{tr(`Level ${index + 1}`, `Уровень ${index + 1}`)}</strong>{hint[language]}</p>)}
                {draft.hintLevel === 1 && <button className="lr-btn-secondary" type="button" onClick={() => updateDraft({ hintLevel: 2 })}>{tr("Next hint", "Следующая подсказка")}</button>}
                {draft.hintLevel === 2 && <button className="lr-btn-secondary" type="button" onClick={() => setConfirmSolution(true)}>{tr("Show solution", "Показать решение")}</button>}
                {draft.hintLevel === 3 && <p role="status">{tr("Solution viewed. This attempt is practice only; repair points are capped at 25.", "Решение просмотрено. Эта попытка тренировочная: за исправление можно получить не более 25 баллов.")}</p>}
              </>}
            </section>
          </section>

          <section className="lr-answer-panel" aria-label={tr("Your solution", "Ваше решение")}>
            <fieldset className="lr-question"><legend><span className="lr-question-number" aria-hidden="true">1</span>{tr("What was wrong with the original report?", "В чём ошибка исходного отчёта?")}</legend>{lesson.diagnosis.map((option) => <Choice key={option.id} name="diagnosis" id={option.id} selected={draft.diagnosis} onChange={(diagnosis) => updateDraft({ diagnosis })}>{option.label[language]}</Choice>)}</fieldset>
            {lesson.kind === "formula" ? <div className="lr-formula-field"><label htmlFor="lr-formula"><span className="lr-question-number" aria-hidden="true">2</span>{tr("Your formula", "Ваша формула")}</label><p>{tr("The current formula contains an error. Edit it below.", "В текущей формуле есть ошибка. Исправьте её ниже.")}</p><div className="lr-formula-editor"><span aria-hidden="true">ƒx</span><textarea id="lr-formula" rows={3} value={draft.formula} maxLength={1000} spellCheck={false} onChange={(e) => updateDraft({ formula: e.target.value })} aria-describedby="lr-formula-help" /></div><p id="lr-formula-help" className="lr-field-help">{tr('Use English functions and status values ("Paid"), with commas. Rows 2–101 are available.', 'Названия функций и статусы ("Paid") — на английском, разделитель — запятая. Доступны строки 2–101.')}</p><div className="lr-output" role="status" aria-live="polite"><span>{tr("Your formula returns", "По вашей формуле")}</span>{calculating ? <span className="lr-calculating"><LoaderCircle size={17} className="lr-spin" />{tr("Calculating…", "Считаем…")}</span> : preview?.error ? <span className="lr-output-error">{readableError(preview.error, language)}</span> : <strong>{preview?.value !== undefined ? formatLessonValue(preview.value, lesson.format, language) : "—"}</strong>}</div></div> : <fieldset className="lr-question"><legend><span className="lr-question-number" aria-hidden="true">2</span>{tr("What would you recommend?", "Что вы порекомендуете?")}</legend>{lesson.decisionOptions?.map((option) => <Choice key={option.id} name="decision" id={option.id} selected={draft.decision} onChange={(decision) => updateDraft({ decision })}>{option.label[language]}</Choice>)}</fieldset>}
            {error && <p className="lr-alert" role="alert"><CircleAlert size={17} />{error}</p>}
            {repairReview && <div className={`lr-inline-feedback${repairReview.repairPassed && repairReview.diagnosisPassed ? " is-success" : " is-review"}`} role="status"><span>{repairReview.repairPassed && repairReview.diagnosisPassed ? <CheckCheck size={21} /> : <CircleAlert size={21} />}</span><div><strong>{repairReview.repairPassed && repairReview.diagnosisPassed ? tr("Your solution holds up", "Решение выдержало проверку") : tr("There is still something to explore", "Есть над чем поработать")}</strong><p>{repairReview.repairPassed ? (lesson.kind === "decision" ? tr("Your recommendation follows the current data.", "Рекомендация соответствует текущим данным.") : tr("The calculation works on the test data.", "Расчёт работает на проверочных данных.")) : tr(`${repairReview.checks.filter((check) => check.passed).length} of ${repairReview.checks.length} checks passed. Try the hint and check again, or continue to the review.`, `Пройдено ${repairReview.checks.filter((check) => check.passed).length} из ${repairReview.checks.length} проверок. Можно открыть подсказку и повторить проверку или продолжить до разбора.`)}</p>{!repairReview.diagnosisPassed && <p>{tr("Reconsider the cause you selected.", "Проверьте выбранную причину ошибки.")}</p>}</div></div>}
            <button type="button" className="lr-btn-secondary lr-check-button" onClick={() => void assess(false)} disabled={busy}>{busy ? <LoaderCircle size={17} className="lr-spin" /> : <CheckCheck size={18} />}{busy ? tr("Checking…", "Проверяем…") : tr("Check solution", "Проверить решение")}</button>
          </section>
        </div>
        <div className="lr-work-footer"><button className="lr-btn-quiet" type="button" onClick={() => updateDraft({ step: 0 })}><ArrowLeft size={16} />{tr("Read the brief", "Перечитать задачу")}</button>{repairReview ? <button className="lr-btn-primary" type="button" onClick={() => onDraft({ ...draft, step: 2 })}>{tr("Apply the skill", "Закрепить навык")}<ArrowRight size={18} /></button> : <span>{tr("Check your solution to continue", "Проверьте решение, чтобы продолжить")}</span>}</div>
      </>}

      {draft.step === 2 && <>
        <section className="lr-transfer-panel">
          <span className="lr-transfer-icon"><Target size={30} /></span><p className="lr-eyebrow">{tr("One more step", "Ещё один шаг")}</p>
          <fieldset className="lr-question lr-transfer-question"><legend>{lesson.transfer.prompt[language]}</legend>{lesson.transfer.options.map((option) => <Choice key={option.id} name="transfer" id={option.id} selected={draft.transfer} onChange={(transfer) => updateDraft({ transfer })}>{option.label[language]}</Choice>)}</fieldset>
          <p className="lr-transfer-note">{tr("This uses new data. Think about the rule, not the number you saw earlier.", "Здесь другие данные. Вспомните правило, а не число из предыдущего отчёта.")}</p>
          {error && <p className="lr-alert" role="alert"><CircleAlert size={17} />{error}</p>}
        </section>
        <div className="lr-work-footer"><button className="lr-btn-quiet" type="button" onClick={() => updateDraft({ step: 1 })}><ArrowLeft size={16} />{tr("Back to the report", "Вернуться к отчёту")}</button><button className="lr-btn-primary" type="button" onClick={() => void assess(true)} disabled={busy}>{busy ? <LoaderCircle size={18} className="lr-spin" /> : <Check size={18} />}{busy ? tr("Preparing your review…", "Готовим разбор…") : tr("Finish lesson", "Завершить задание")}</button></div>
      </>}
      {confirmSolution && <Modal title={tr("Show the full solution?", "Показать полное решение?")} close={() => setConfirmSolution(false)}>
        <p>{tr("After viewing the solution, repair points are capped at 25 out of 50 and this lesson will not count as completed. You can practise a similar case afterwards.", "После показа решения за исправление можно получить не более 25 из 50 баллов, а занятие не будет засчитано как пройденное. После этого можно потренироваться на похожем кейсе.")}</p>
        <div className="lr-solution-actions"><button className="lr-btn-secondary" type="button" onClick={() => setConfirmSolution(false)}>{tr("Keep trying myself", "Продолжить самостоятельно")}</button><button className="lr-btn-primary" type="button" onClick={() => { setConfirmSolution(false); updateDraft({ hintLevel: 3 }); }}>{tr("Show solution", "Показать решение")}</button></div>
      </Modal>}
    </article>
  );
}

type ReviewProps = {
  lesson: Lesson;
  result: LessonResult;
  recommendation: { lessonId: string; reason: Copy };
  onStart: (id: string) => void;
  onHome: () => void;
  language: Language;
};

export function LessonReview({ lesson, result, recommendation, onStart, onHome, language }: ReviewProps) {
  const tr = (en: string, ru: string) => text(language, en, ru);
  const heading = useRef<HTMLHeadingElement>(null);
  const next = getLesson(recommendation.lessonId);
  const checkDisplay = (value: string) => {
    const option = lesson.decisionOptions?.find((item) => item.id === value);
    if (option) return option.label[language];
    return feedback((key, values) => translate(language, key, values), value);
  };
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [result]);
  const components = [
    { label: tr("Found the cause", "Причина ошибки"), passed: result.diagnosisPassed, points: result.diagnosisPassed ? 20 : 0, max: 20, detail: result.diagnosisPassed ? tr("You spotted the assumption behind the error.", "Вы нашли неверное допущение в отчёте.") : lesson.diagnosis.find((option) => option.id === lesson.correctDiagnosis)?.label[language] },
    { label: tr("Repaired the report", "Исправление отчёта"), passed: result.repairPassed, points: result.score - (result.diagnosisPassed ? 20 : 0) - (result.transferPassed ? 30 : 0), max: 50, detail: lesson.kind === "decision" ? tr("Your recommendation was checked against the report you submitted.", "Рекомендация проверена по данным отчёта, который вы отправили.") : tr(`${result.checks.filter((check) => check.passed).length} of ${result.checks.length} checks passed on different data.`, `${result.checks.filter((check) => check.passed).length} из ${result.checks.length} проверок пройдено на разных данных.`) },
    { label: tr("Applied the principle", "Перенос навыка"), passed: result.transferPassed, points: result.transferPassed ? 30 : 0, max: 30, detail: result.transferPassed ? tr("You used the same idea in a new situation.", "Вы применили принцип в новой ситуации.") : tr("Revisit the example below before your next case.", "Перед следующим кейсом изучите объяснение ниже.") },
  ];
  return <article className="lr-review">
    <div className="lr-work-top"><button className="lr-btn-quiet" type="button" onClick={onHome}><ArrowLeft size={17} />{tr("My learning", "Моё обучение")}</button><span className="lr-eyebrow">{lesson.title[language]}</span></div>
    <section className="lr-review-hero"><div><span className="lr-completion-label"><Check size={15} />{tr("Lesson reviewed", "Задание разобрано")}</span><h1 ref={heading} tabIndex={-1}>{tr("Your lesson review", "Задание разобрано")}</h1><p>{isLessonComplete(result) ? tr("You have a solid foundation. Put it to work in the next case.", "Основа уже есть. Теперь примените её в следующем кейсе.") : tr("You found a useful place to focus. Let’s turn these mistakes into practice.", "Теперь понятно, что стоит потренировать. Разберём ошибки и закрепим навык.")}</p></div><div className="lr-score-ring" style={{ "--score": `${result.score}%` } as React.CSSProperties}><div><strong className="lr-score-number">{result.score}</strong><span>{tr("out of 100", "из 100")}</span></div></div></section>
    {result.solutionRevealed && <p className="lr-inline-feedback is-review" role="status">{tr("You viewed the solution — try a similar case. This lesson is not counted as completed; repair points are capped at 25 out of 50.", "Вы смотрели решение — попробуйте похожий кейс. Занятие не засчитано как пройденное; за исправление можно получить не более 25 из 50 баллов.")}</p>}
    <div className="lr-review-grid">{components.map((component, index) => <section className={`lr-review-item${component.passed ? " is-success" : " is-review"}`} key={index}><div className="lr-review-item-top">{component.passed ? <CheckCheck size={20} /> : <Target size={20} />}<span>{component.points}<small> / {component.max}</small></span></div><h2>{component.label}</h2><p>{component.detail}</p></section>)}</div>
    <section className="lr-review-explanation"><div className="lr-panel-heading"><Lightbulb size={22} /><h2>{tr("The rule, with the original example", "Правило на исходном примере")}</h2></div><p>{lesson.explanation[language]}</p>{lesson.kind === "formula" && <div className="lr-solution"><span>{tr("One possible formula", "Один из вариантов формулы")}</span><code>{lesson.solution}</code></div>}{result.snapshot?.formula && lesson.kind === "formula" && <div className="lr-submitted-formula"><span>{tr("Your submitted formula", "Ваша формула при отправке")}</span><code>{result.snapshot.formula}</code></div>}<div className="lr-transfer-explanation"><strong>{tr("In the new situation", "В новой ситуации")}</strong><p>{lesson.transfer.explanation[language]}</p></div></section>
    <details className="lr-checks"><summary><CheckCheck size={18} />{tr("See the checks", "Посмотреть проверки")}<span>{result.checks.filter((check) => check.passed).length}/{result.checks.length}</span><ChevronDown size={17} /></summary><ul>{result.checks.map((check, index) => <li key={index}><span className={check.passed ? "lr-check-pass" : "lr-check-fail"}>{check.passed ? <Check size={17} /> : <CircleAlert size={17} />}</span><div><strong>{check.label[language]}</strong><p>{tr("Expected", "Ожидалось")}: <code>{checkDisplay(check.expected)}</code> <span aria-hidden="true">·</span> {tr("Your result", "Ваш результат")}: <code>{checkDisplay(check.actual)}</code></p></div></li>)}</ul></details>
    <section className="lr-next-lesson"><div><p className="lr-eyebrow">{tr("Your next step", "Ваш следующий шаг")}</p><h2>{next.title[language]}</h2><p>{recommendation.reason[language]}</p></div><button type="button" className="lr-btn-primary" onClick={() => onStart(recommendation.lessonId)}>{tr("Next lesson", "Следующее задание")}<ArrowRight size={18} /></button></section>
    <div className="lr-work-footer"><button type="button" className="lr-btn-quiet" onClick={() => onStart(lesson.id)}><RotateCcw size={16} />{tr("Try again", "Попробовать ещё раз")}</button><span>{tr("This score describes your practice, not a professional qualification.", "Баллы показывают результат задания и не являются профессиональной оценкой.")}</span></div>
  </article>;
}
