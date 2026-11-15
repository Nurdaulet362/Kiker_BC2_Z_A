import { FUTURE_VERSION_WARNING } from "../storage-messages";
import { useContext, useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, CheckCheck, ChevronRight, Clock3, Compass, FileCheck2, Flag, Layers3, Lightbulb, Menu, Target, TrendingUp, X } from "lucide-react";
import { LanguageContext, LanguageSwitcher, PAGE_COPY } from "../i18n";
import { configureSessionItem, getSessionItem, readSessionItem, setSessionItem, subscribe, subscribeSaveStatus, type SaveStatus } from "../session-storage";
import { LESSONS, SKILLS, LEARNING_KEY, findLessonResult, setLearningGoal, beginLesson, nextLessonAttempt, saveLessonDraft, initialDraft, initialLearning, isLessonComplete, restoreLearning, recommendLesson, type Copy, type Lesson, type LessonDraft, type LearningState, type SkillId } from "./model";
import { needsLearningBackup } from "./storage-backup";
import { mergeLearning, mergeLearningJSON, prepareLessonInput, recordLessonResult } from "./persistence";
import { LessonReview, Workspace } from "./Workspace";
import { canAccessLesson } from "../access";
import { Pricing } from "../pricing/Pricing";
import "./learning.css";

configureSessionItem(LEARNING_KEY, { version: 2, merge: mergeLearningJSON, needsBackup: needsLearningBackup });

const skillIcons = { revenue: FileCheck2, conversion: BarChart3, decisions: Target };

function SkillArt({ skill, compact = false }: { skill: SkillId; compact?: boolean }) {
  return <div className={`learn-art learn-art-${skill} ${compact ? "is-compact" : ""}`} aria-hidden="true">
    {skill === "revenue" ? <div className="learn-art-sheet"><span className="learn-art-sheet-title" /><span /><span /><span /><div><i /><b><Check size={15} /></b></div></div> : skill === "conversion" ? <div className="learn-art-bars"><i /><i /><i /><i /><div className="learn-art-arrow"><TrendingUp size={30} strokeWidth={1.7} /></div></div> : <div className="learn-art-target"><div><div><Target size={30} strokeWidth={1.6} /></div></div><span><ArrowUpRight size={24} /></span></div>}
  </div>;
}

function ReportIllustration({ language }: { language: "en" | "ru" }) {
  return <div className="learn-report-art" aria-hidden="true">
    <div className="learn-report-paper">
      <div className="learn-report-top"><span className="learn-tiny-icon"><BarChart3 size={15} /></span><span>{language === "ru" ? "Отчёт по выручке" : "Revenue report"}</span><i>···</i></div>
      <div className="learn-report-value"><span>{language === "ru" ? "Проверим цифры?" : "Do the numbers add up?"}</span><strong>$2,030<ArrowDownRight size={22} /></strong></div>
      <div className="learn-report-chart"><i /><i /><i /><i /><i /><i /></div>
      <div className="learn-report-caption"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span></div>
    </div>
    <div className="learn-report-sticker"><span><CheckCheck size={20} /></span><div><b>{language === "ru" ? "Сначала проверьте" : "Check before you trust"}</b><small>{language === "ru" ? "Потом принимайте решение" : "Then make your decision"}</small></div></div>
  </div>;
}

export function LearningApp() {
  const { language } = useContext(LanguageContext);
  const c = (en: string, ru: string) => language === "ru" ? ru : en;
  const tx = (copy: Copy) => copy[language];
  const [state, setState] = useState<LearningState>(() => {
    try { return mergeLearning(initialLearning(), restoreLearning(getSessionItem(LEARNING_KEY))); } catch { return initialLearning(); }
  });
  const [hash, setHash] = useState(location.hash);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(() => matchMedia("(max-width: 800px)").matches);
  const sidebar = useRef<HTMLElement>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("ok");
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = matchMedia("(max-width: 800px)");
    const update = () => { setMobile(media.matches); setMenu(false); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!menu || !mobile) return;
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMenu(false); }
      if (event.key !== "Tab") return;
      const controls = sidebar.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); before?.focus(); };
  }, [menu, mobile]);
  useEffect(() => {
    const update = () => { setHash(location.hash); setMenu(false); };
    addEventListener("hashchange", update);
    return () => removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    const unsubscribe = subscribe(LEARNING_KEY, () => {
      setState(previous => {
        const next = mergeLearning(previous, restoreLearning(getSessionItem(LEARNING_KEY)));
        return JSON.stringify(next) === JSON.stringify(previous) ? previous : next;
      });
    });
    const unsubscribeStatus = subscribeSaveStatus(LEARNING_KEY, setSaveStatus);
    return () => { unsubscribe(); unsubscribeStatus(); };
  }, []);
  useEffect(() => {
    try { setSessionItem(LEARNING_KEY, JSON.stringify(state)); }
    catch { setSaveStatus("unavailable"); }
  }, [state]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    main.current?.querySelector<HTMLElement>("h1")?.focus();
  }, [hash]);
  const navigate = (route: string) => { location.hash = route; setMenu(false); };
  const start = (id: string) => {
    const lesson = LESSONS.find(item => item.id === id);
    if (lesson && !canAccessLesson(lesson.level)) {
      navigate("pricing");
      return;
    }
    setState(previous => beginLesson(previous, id));
    navigate(`lesson/${id}`);
  };
  const latestResults = new Map(state.results.map(result => [result.lessonId, result]));
  const completed = new Set([...latestResults.values()].filter(isLessonComplete).map(result => result.lessonId));
  const recommended = recommendLesson(state);
  const nextLesson = LESSONS.find(lesson => lesson.id === recommended.lessonId) ?? LESSONS[0];
  const lessonId = hash.startsWith("#lesson/") ? hash.slice(8) : "";
  const activeLesson = LESSONS.find(lesson => lesson.id === lessonId);
  const reviewId = hash.startsWith("#review/") ? hash.slice(8) : "";
  const result = findLessonResult(state.results, reviewId);
  const reviewedLesson = result && LESSONS.find(lesson => lesson.id === result.lessonId);
  const lockedContent = !!((activeLesson && !canAccessLesson(activeLesson.level)) || (reviewedLesson && !canAccessLesson(reviewedLesson.level)));
  const isPricing = hash === "#pricing" || lockedContent;
  const isProgress = hash === "#progress";
  const isDashboard = !activeLesson && !result && !isProgress && !isPricing;
  useEffect(() => {
    if (lockedContent) location.replace("#pricing");
  }, [hash, lockedContent]);
  const activeSkill = activeLesson?.skill;
  const selectedLessons = LESSONS.filter(lesson => state.goal === "all" || lesson.skill === state.goal);
  const latestFor = (id: string) => state.results.filter(result => result.lessonId === id).at(-1);
  const skillScore = (id: SkillId) => {
    const latest = state.results.filter(result => LESSONS.find(lesson => lesson.id === result.lessonId)?.skill === id).at(-1);
    return latest?.score;
  };
  const progress = Math.round(completed.size / LESSONS.length * 100);

  return <div className="learn-app">
    <a className="learn-skip" href="#learning-main" onClick={event => { event.preventDefault(); main.current?.focus(); }}>{c("Skip to content", "Перейти к содержимому")}</a>
    <aside ref={sidebar} className={`learn-sidebar ${menu ? "is-open" : ""}`} inert={mobile && !menu} role={mobile && menu ? "dialog" : undefined} aria-modal={mobile && menu ? true : undefined} aria-label={mobile && menu ? c("Navigation", "Навигация") : undefined}>
      <button className="learn-sidebar-close" onClick={() => setMenu(false)} aria-label={c("Close navigation", "Закрыть навигацию")}><X size={18} /></button>
      <button className="learn-brand" onClick={() => navigate("learn")} aria-label={c("Fix the Report home", "Fix the Report — главная")}><span className="learn-brand-icon"><BarChart3 size={23} strokeWidth={2.4} /></span><span>Fix the Report<span className="learn-brand-dot">.</span></span></button>
      <div className="learn-sidebar-label">{c("YOUR WORKSPACE", "ВАШЕ ПРОСТРАНСТВО")}</div>
      <nav className="learn-navigation" aria-label={c("Main navigation", "Основная навигация")}>
        <button className={!isProgress && !isPricing ? "is-active" : ""} onClick={() => navigate("learn")} aria-current={isDashboard ? "page" : undefined}><BookOpen size={19} />{c("My learning", "Обучение")}<ChevronRight size={15} /></button>
        <button className={isProgress ? "is-active" : ""} onClick={() => navigate("progress")} aria-current={isProgress ? "page" : undefined}><TrendingUp size={19} />{c("My progress", "Мой прогресс")}</button>
        <button className={isPricing ? "is-active" : ""} onClick={() => navigate("pricing")} aria-current={isPricing ? "page" : undefined}><Layers3 size={19} />{c("Plans", "Тарифы")}</button>
      </nav>
      <div className="learn-sidebar-label learn-path-label">{c("LEARNING PATH", "УЧЕБНЫЙ МАРШРУТ")}</div>
      <nav className="learn-skill-nav" aria-label={c("Skills", "Навыки")}>
        {SKILLS.map(skill => { const Icon = skillIcons[skill.id]; const done = LESSONS.filter(lesson => lesson.skill === skill.id && completed.has(lesson.id)).length; return <button key={skill.id} className={activeSkill === skill.id || (isDashboard && state.goal === skill.id) ? "is-active" : ""} onClick={() => { setState(previous => setLearningGoal(previous, skill.id)); navigate("learn"); }}><Icon size={17} /><span>{tx(skill.title)}</span><small>{done}/2</small></button>; })}
      </nav>
      <div className="learn-sidebar-bottom"><div className="learn-small-spark"><Lightbulb size={20} /></div><strong>{c("A little practice. Every day.", "Немного практики. Каждый день.")}</strong><p>{c("One report, one insight, one step forward.", "Один отчёт, один новый навык, один шаг вперёд.")}</p><div className="learn-local-note"><span />{c("Progress saved on this device", "Прогресс на этом устройстве")}</div></div>
    </aside>
    {menu && <button className="learn-menu-backdrop" aria-label={c("Close menu", "Закрыть меню")} onClick={() => setMenu(false)} />}
    <div className="learn-body" inert={mobile && menu}>
      <header className="learn-topbar"><div className="learn-topbar-left"><button className="learn-mobile-menu" aria-label={c("Toggle navigation", "Открыть меню")} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={20} /> : <Menu size={20} />}</button><span>{c("Workspace", "Личный кабинет")}</span><ChevronRight size={13} /><b>{isPricing ? c("Plans", "Тарифы") : isProgress ? c("Progress", "Прогресс") : activeLesson ? c("Practice", "Практика") : result ? c("Lesson review", "Разбор занятия") : c("Learning", "Обучение")}</b></div><div className="learn-topbar-right"><LanguageSwitcher /><div className="learn-profile"><span>{c("L", "У")}</span><div>{c("Your workspace", "Ваш кабинет")}<small>{c("Learning without an account", "Можно учиться без регистрации")}</small></div></div></div></header>
      <main className="learn-main" id="learning-main" ref={main} tabIndex={-1}>
        {saveStatus !== "ok" && <p className="learn-save-warning" role="status">{saveStatus === "future-version" ? FUTURE_VERSION_WARNING[language] : c("Browser storage is unavailable. Your progress stays in this tab until you close or reload it.", "Хранилище браузера недоступно. Прогресс сохранится только в этой вкладке до закрытия или перезагрузки.")}</p>}
        {isPricing ? <Pricing /> : activeLesson ? <Workspace key={activeLesson.id} lesson={activeLesson} draft={state.drafts[activeLesson.id] ?? initialDraft(activeLesson.id, nextLessonAttempt(state, activeLesson.id))} onDraft={(draft: LessonDraft) => setState(previous => saveLessonDraft(previous, activeLesson.id, draft))} onPrepare={input => prepareLessonInput(mergeLearning(state, restoreLearning(readSessionItem(LEARNING_KEY))), input)} onComplete={submission => { const saved = restoreLearning(readSessionItem(LEARNING_KEY)); setState(previous => recordLessonResult(mergeLearning(previous, saved), submission)); navigate(`review/${submission.id}`); }} onExit={() => navigate("learn")} language={language} /> : result && reviewedLesson ? <LessonReview lesson={reviewedLesson} result={result} recommendation={recommended} onStart={start} onHome={() => navigate("learn")} language={language} /> : isProgress ? <>
          <div className="learn-page-heading"><div><p className="learn-eyebrow">{c("EVERY ATTEMPT COUNTS", "КАЖДАЯ ПОПЫТКА — ЭТО ОПЫТ")}</p><h1 tabIndex={-1}>{c("See how far you’ve come", "Ваш прогресс в деталях")}</h1><p>{c("Find your strengths and choose what to practice next.", "Посмотрите, что уже получается и чему уделить внимание.")}</p></div></div>
          <div className="learn-progress-summary"><div><span>{c("Completed lessons", "Пройдено занятий")}</span><strong>{completed.size}<small> / {LESSONS.length}</small></strong></div><div><span>{c("Total attempts", "Всего попыток")}</span><strong>{state.results.length}</strong></div><div><span>{c("Skills practiced", "Навыков в работе")}</span><strong>{SKILLS.filter(skill => skillScore(skill.id) !== undefined).length}<small> / 3</small></strong></div></div>
          <div className="learn-section-title"><h2>{c("Your skill map", "Ваша карта навыков")}</h2><span>{c("Latest attempt for each skill", "Последняя попытка по каждому навыку")}</span></div>
          <div className="learn-skill-score-grid">{SKILLS.map(skill => { const score = skillScore(skill.id); const Icon = skillIcons[skill.id]; return <div key={skill.id} className="learn-skill-score"><span className={`learn-skill-badge ${skill.id}`}><Icon size={20} /></span><h3>{tx(skill.title)}</h3><p>{tx(skill.description)}</p><div><strong>{score === undefined ? "—" : score}<small>{score !== undefined && " / 100"}</small></strong><span>{score === undefined ? c("Not started", "Ещё не начато") : score >= 80 ? c("Keep practicing", "Закрепите результат") : c("Worth another try", "Есть что потренировать")}</span></div><div className="learn-meter"><i style={{ width: `${score ?? 0}%` }} /></div><button className="learn-text-button" onClick={() => start(LESSONS.find(lesson => lesson.skill === skill.id && !completed.has(lesson.id))?.id ?? LESSONS.find(lesson => lesson.skill === skill.id)!.id)}>{c("Practice this skill", "Тренировать навык")}<ArrowRight size={16} /></button></div>; })}</div>
          <section className="learn-history"><div className="learn-section-title"><h2>{c("Your learning history", "История занятий")}</h2></div>{state.results.length === 0 ? <div className="learn-empty"><Flag size={29} /><h3>{c("Your first insight starts here", "Первый шаг ещё впереди")}</h3><p>{c("Complete a lesson to see your score and personal feedback here.", "Пройдите занятие — здесь появятся ваш результат и разбор ошибок.")}</p><button className="lr-btn-primary" onClick={() => start(nextLesson.id)}>{c("Start learning", "Начать занятие")}<ArrowRight size={17} /></button></div> : <div className="learn-history-list">{[...state.results].reverse().map(entry => { const lesson = LESSONS.find(lesson => lesson.id === entry.lessonId)!; return <button key={entry.id} onClick={() => navigate(`review/${entry.id}`)}><span className={`learn-skill-badge ${lesson.skill}`}><Check size={18} /></span><span><b>{tx(lesson.title)}</b><small>{new Date(entry.at).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></span><strong>{entry.score}<small>/100</small></strong><ChevronRight size={18} /></button>; })}</div>}</section>
          <p className="learn-score-note">{c("Scores reflect performance on these learning tasks, not a professional certification.", "Баллы отражают результаты учебных заданий и не являются профессиональной сертификацией.")}</p>
        </> : <>
          <div className="learn-page-heading"><div><p className="learn-eyebrow">{c("PRACTICAL SKILLS. REAL UNDERSTANDING.", "ПРАКТИЧЕСКИЕ НАВЫКИ. НАСТОЯЩЕЕ ПОНИМАНИЕ.")}</p><h1 tabIndex={-1}>{state.results.length ? c("Ready for your next insight?", "Готовы к следующему открытию?") : PAGE_COPY[language].headline}</h1><p>{PAGE_COPY[language].description}</p></div><span className="learn-heading-badge"><Compass size={16} />{c("Your learning space", "Ваше пространство для роста")}</span></div>
          <div className="learn-dashboard-grid"><div className="learn-dashboard-content">
            <section className="learn-feature"><div className="learn-feature-copy"><span className="learn-feature-kicker"><span />{state.results.length ? c("YOUR NEXT STEP", "ВАШ СЛЕДУЮЩИЙ ШАГ") : c("START WITH A SMALL WIN", "НАЧНИТЕ С МАЛЕНЬКОЙ ПОБЕДЫ")}</span><h2>{tx(nextLesson.title)}</h2><p>{tx(nextLesson.summary)}</p><div className="learn-feature-meta"><span><Clock3 size={15} />{nextLesson.minutes} {c("min", "мин")}</span><span><Layers3 size={15} />{c("Learn by doing", "Обучение на практике")}</span></div><button className="lr-btn-primary" onClick={() => start(nextLesson.id)}>{!canAccessLesson(nextLesson.level) ? c("View Pro plan", "Посмотреть тариф Pro") : state.drafts[nextLesson.id] ? c("Continue learning", "Продолжить занятие") : c("Start learning", "Начать занятие")}<ArrowRight size={18} /></button></div><ReportIllustration language={language} /></section>
            {state.results.length > 0 && <p className="learn-recommendation-reason"><Lightbulb size={16} />{tx(recommended.reason)}</p>}
            <section className="learn-work-trial" aria-label={c("Work Trial", "Рабочее задание (Work Trial)")}>
              <div><strong>{c("Ready to connect the skills?", "Готовы объединить навыки?")}</strong><p>{c("Work through revenue, conversion and a budget decision in one assignment.", "Проверьте выручку, конверсию и решение о бюджете в одном задании.")}</p></div>
              <a href="#trial">{c("Work Trial", "Рабочее задание (Work Trial)")}<ArrowUpRight size={17} aria-hidden="true" /></a>
            </section>
            <section className="learn-curriculum" aria-labelledby="curriculum-heading"><div className="learn-section-title"><h2 id="curriculum-heading">{c("Your learning path", "Ваш учебный маршрут")}</h2><span>{c("6 lessons · 3 skills", "6 занятий · 3 навыка")}</span></div><div className="learn-filter" role="group" aria-label={c("Filter by skill", "Фильтр по навыку")}><button aria-pressed={state.goal === "all"} onClick={() => setState(previous => setLearningGoal(previous, "all"))}>{c("All lessons", "Все занятия")}</button>{SKILLS.map(skill => <button key={skill.id} aria-pressed={state.goal === skill.id} onClick={() => setState(previous => setLearningGoal(previous, skill.id))}>{tx(skill.title)}</button>)}</div><div className="learn-course-grid">{selectedLessons.map(lesson => <LessonCard key={lesson.id} lesson={lesson} language={language} index={LESSONS.indexOf(lesson)} score={latestFor(lesson.id)?.score} passed={completed.has(lesson.id)} draft={!!state.drafts[lesson.id]} onStart={() => start(lesson.id)} />)}</div></section>
            <div className="learn-bottom-note"><span><BookOpen size={19} /></span><p>{c("Understanding comes from practice.", "Понимание приходит с практикой.")}<small>{c("Change the data. Check your assumptions. Take the skill with you.", "Меняйте данные. Проверяйте предположения. Применяйте навык в работе.")}</small></p></div>
          </div><aside className="learn-dashboard-aside">
            <section className="learn-progress-panel"><div className="learn-section-title"><h2>{c("Your progress", "Ваш прогресс")}</h2><TrendingUp size={18} /></div><div className="learn-progress-ring" style={{ "--progress": `${progress}%` } as React.CSSProperties}><div><strong>{completed.size}<small>/{LESSONS.length}</small></strong><span>{c("lessons completed", "занятий пройдено")}</span></div></div><h3>{completed.size === 0 ? c("Every skill starts somewhere", "Всё начинается с первого шага") : c("You’re building a habit", "Вы уже движетесь вперёд")}</h3><p>{completed.size === 0 ? c("Your first lesson takes less than 10 minutes. Let’s make it count.", "Первое занятие займёт меньше 10 минут. Давайте начнём.") : c("Come back to the skills that need a little more practice.", "Возвращайтесь к навыкам, которым нужно чуть больше практики.")}</p><button className="learn-text-button" onClick={() => navigate("progress")}>{c("View my progress", "Посмотреть прогресс")}<ArrowRight size={16} /></button></section>
            <section className="learn-how"><h2>{c("A small lesson. A useful skill.", "Короткое занятие. Полезный навык.")}</h2><ol><li><span>01</span><div><strong>{c("Step into a real task", "Погрузитесь в задачу")}</strong><p>{c("A work brief with a clear goal.", "Рабочая ситуация и понятная цель.")}</p></div></li><li><span>02</span><div><strong>{c("Try, explore, fix", "Попробуйте и исправьте")}</strong><p>{c("Change data and test your idea.", "Меняйте данные и проверяйте идею.")}</p></div></li><li><span>03</span><div><strong>{c("Make the skill yours", "Закрепите навык")}</strong><p>{c("Apply it in a new situation.", "Примените его в новой ситуации.")}</p></div></li></ol></section>
            <div className="learn-quiet-note"><Lightbulb size={19} /><p>{c("Mistakes are part of learning. Here, they help you choose your next step.", "Ошибаться здесь полезно. Ошибки помогают выбрать следующий шаг.")}</p></div>
          </aside></div>
        </>}
        <footer className="learn-footer"><span>Fix the Report <span>© 2026</span></span><span>{c("Practice today. Think clearer tomorrow.", "Практика сегодня. Ясность завтра.")}</span></footer>
      </main>
    </div>
  </div>;
}

function LessonCard({ lesson, language, index, score, passed, draft, onStart }: { lesson: Lesson; language: "en" | "ru"; index: number; score?: number; passed: boolean; draft: boolean; onStart: () => void }) {
  const c = (en: string, ru: string) => language === "ru" ? ru : en;
  const action = !canAccessLesson(lesson.level) ? c("View Pro plan", "Посмотреть тариф Pro")
    : score !== undefined ? c("Practice again", "Повторить")
    : draft ? c("Continue lesson", "Продолжить")
    : c("Start lesson", "Начать занятие");
  return <article className={`learn-course learn-course-${lesson.skill}`}>
    <div className="learn-course-top"><span className="learn-course-number">{String(index + 1).padStart(2, "0")}</span><SkillArt skill={lesson.skill} /><span className="learn-course-level">{lesson.level === "practice" && "Pro · "}{passed ? <><Check size={12} />{c("Completed", "Пройдено")}</> : score !== undefined ? c("Keep practicing", "Закрепите навык") : lesson.level === "foundation" ? c("Foundation", "Основы") : c("Practice", "Закрепление")}</span></div>
    <div className="learn-course-content"><h3>{lesson.title[language]}</h3><p>{lesson.summary[language]}</p><div className="learn-course-meta"><span><Clock3 size={14} />{lesson.minutes} {c("min", "мин")}</span><span>{score !== undefined ? `${score}/100` : lesson.kind === "formula" ? c("Spreadsheet practice", "Работа с таблицей") : c("Decision practice", "Принятие решений")}</span></div><button onClick={onStart} data-testid={`lesson-${lesson.id}`} aria-label={`${action}: ${lesson.title[language]}`}>{action}<ArrowUpRight size={17} /></button></div>
  </article>;
}
