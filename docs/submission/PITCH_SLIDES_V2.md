# Fix the Report — pitch v2

Prepared 15 November 2026. Ten slides, English on-slide copy; EN talk track and RU preparation notes. This is a local v2 candidate; the previous PDF is retained. All external sources were checked on 15 November 2026. User-study and interest-form results: none reported by the owner. No payments, form, Supabase, or planned features are presented as implemented.

Target speaking schedule totals 4:55, including a 45-second demo. This is a proposed timing, not a completed human rehearsal. Read the talk track rather than every line of the slides. The original images specify US 25–45, B2C, browser, up to 10 slides, and the five judging weights. They do not explicitly specify the pitch language; English follows the established project decision.

## Slide 01 — PROBLEM (0:00–0:20)

### On-slide copy — EN

**Knowing a formula is only the start.**

Fix the Report · Spreadsheet assessment practice

A plausible report can still count the wrong money.

- **$2,030** — Reported revenue
- **$1,200** — Paid orders
- **$830** — Overstatement

Fictional training case. The amounts come from the working first lesson.

### Talk track — EN

A spreadsheet can calculate correctly and still answer the wrong business question. In our first case, a store reports 2,030 dollars, but only 1,200 was paid. Fix the Report lets the learner repair that mistake and see whether the repair survives different data.

### Подготовка — RU

Таблица может правильно складывать числа и при этом отвечать не на тот бизнес-вопрос. В нашем учебном примере магазин показывает 2030 долларов вместо оплаченных 1200. Пользователь сам исправляет правило, затем видит проверку своего решения. Это вымышленный учебный кейс; 830 долларов не являются потерями реального клиента.

Visual: .impeccable/review/submission/workspace-initial-desktop.png. Existing real application captures, prepared examples; not new customer sessions.

## Slide 02 — USER (0:20–0:45)

### On-slide copy — EN

**One person. One upcoming assessment.**

Audience set by the brief: US adults aged 25–45

Initial segment: people preparing for spreadsheet assessments in analyst and sales-ops hiring.

**Trigger — hypothesis**

An assessment in the next 1–3 weeks.

**Job to be done**

Find the misleading calculation, repair it, and explain the result.

**Buyer — hypothesis**

The individual learner, paying for preparation.

Urgency and willingness to pay are hypotheses. No customer interviews completed.

### Talk track — EN

The brief specifies US adults aged 25 to 45. Within that audience, we start with people preparing for analyst or sales-operations spreadsheet assessments. An upcoming assessment may create a reason to act now. That timing and the willingness to pay remain hypotheses; we have not yet interviewed customers.

### Подготовка — RU

США и возраст 25–45 — рамка организаторов. Внутри неё выбираем людей перед тестовым заданием на аналитическую или sales-ops роль. Срок 1–3 недели — гипотеза о моменте потребности, а не статистика. Покупателем предполагается сам человек. Интервью и готовность платить пока не подтверждены.

## Slide 03 — SOLUTION (0:45–1:10)

### On-slide copy — EN

**Repair a report. Test the reasoning.**

- Explore the report and choose the cause.
- Repair the formula or business decision.
- Run checks on different data.
- Answer a new-situation question.
- Read the review and choose the next lesson.

Implemented today · English / Russian · Progress saved on this device

### Talk track — EN

The learning loop is already working. You inspect a report, choose the cause, repair the formula or decision, and receive checks on other data. Then you answer a new-situation question and get a review with a next step. Progress stays on the device. The introductory lesson explains the rule; independent mastery is still to be tested.

### Подготовка — RU

Этот цикл реализован: исследование отчёта, причина, исправление, проверки, перенос и разбор. Вводный урок заранее объясняет принцип — это обучающее занятие. Мы не называем его доказательством самостоятельной профессиональной компетентности. Прогресс локальный, без аккаунта и синхронизации.

Visual: .impeccable/review/submission/workspace-after-pitch.png. Existing real application captures, prepared examples; not new customer sessions.

## Slide 04 — DEMO (1:10–1:55)

### On-slide copy — EN

**Change a cancelled order. Watch the error grow.**

- **$650 → $2,300** — Cancelled order
- **$2,030 → $3,680** — Original SUM total
- **$1,200 → $1,200** — Repaired paid total

```excel
=SUMIF(B2:B101,"Paid",C2:C101)
```

Prepared demo capture · Only Paid orders count in this exercise.

### Talk track — EN

Watch what happens when I change the cancelled order from 650 to 2,300 dollars. The original total rises to 3,680 even though paid revenue has not changed. I enter SUMIF with the exact status Paid. Revenue returns to 1,200. Now I check the formula against the other data sets.

### Подготовка — RU

Для живого показа открыть первый урок заранее на таблице с исходной SUM. Изменить отменённый заказ с 650 на 2300 без знака валюты. Ошибочная сумма станет 3680. Выбрать причину Order status is ignored, ввести показанную SUMIF с Paid и нажать Check solution: 1200 и успешная проверка. Если связь задерживает, перейти к подписанным снимкам подготовленного прохождения, не изображать запись живой.

Visual: .impeccable/review/submission/workspace-after-pitch.png. Existing real application captures, prepared examples; not new customer sessions.

## Slide 05 — REAL CHECKING (1:55–2:20)

### On-slide copy — EN

**Matching one number does not pass.**

Checks include changed statuses, new rows, no paid orders and an empty report.

**A working formula**

7 / 7 checks passed
100 / 100
Lesson completed

**The constant =1200**

1 / 7 checks passed
57 / 100
Practice only

Prepared runs with correct diagnosis and transfer. Formulas execute; scores are not AI judgments.

### Talk track — EN

Typing 1,200 is not enough. That constant matches the first report, but fails six of seven checks. With correct diagnosis and transfer answers, it scores 57 and remains practice only. A valid formula passes seven checks and scores 100. These are prepared application results, not results from customers.

### Подготовка — RU

Константа совпадает с одним результатом, но проходит только одну из семи проверок. При правильной диагностике и переносе получается 57; корректная формула даёт 100. Проверка исполняет формулу и сравнивает результат на других данных. Это доказательство поведения продукта, не результатов обучения людей.

Visual: .impeccable/review/submission/success-mobile.png, .impeccable/review/submission/failure-mobile.png. Existing real application captures, prepared examples; not new customer sessions.

## Slide 06 — ALTERNATIVES (2:20–2:45)

### On-slide copy — EN

**Our focus: repairing a misleading report.**

**Microsoft SUMIF guide**

Function syntax, worked examples and data to try in Excel.

**DataCamp**

Interactive browser exercises and real-time feedback.

**Fix the Report**

Business-report repair, checks on other data, and an explained next step.

A focused workflow hypothesis. We have not established exclusive features or superior learning outcomes.

Sources / links: [Microsoft: SUMIF guide](https://support.microsoft.com/en-us/excel/functions/sumif-function) · [DataCamp: interactive learning](https://www.datacamp.com/interactive-learning)

### Talk track — EN

Good alternatives already exist. Microsoft explains functions with examples, and DataCamp offers interactive exercises with feedback. Our focus is narrower: repair a misleading business report and see the repair challenged by different data. We have not proved that this is unique or produces better learning; that comparison belongs in the pilot.

### Подготовка — RU

Не называем все курсы пассивными: официальная страница DataCamp прямо описывает интерактивную практику. Microsoft даёт примеры, которые можно воспроизвести. Наше отличие формулируем как фокус рабочего сценария, не как доказанную исключительность. Источники на слайде описывают выбранные страницы, не полный аудит продуктов.

## Slide 07 — VALUE & RETURN (2:45–3:10)

### On-slide copy — EN

**From one lesson to continued practice.**

**Working today**

6 authored lessons
Saved reviews and next-step recommendations
Work Trial with changing figures

**Planned — not available**

Fresh variants for the six lessons
A weekly practice goal
New report types for work after hiring

Hypothesis: unfamiliar practice and relevant follow-up create repeat value. Return behavior is not measured.

### Talk track — EN

Today the product offers six authored lessons, saved reviews, recommendations and a Work Trial with changing figures. Fresh variants across the lessons, weekly goals and new report types are planned. The business depends on discovering whether people need continued practice after hiring. We have not measured that return behavior.

### Подготовка — RU

Слева только существующее. Повтор обычного урока сейчас возвращает его исходные данные; изменяемые варианты есть в Work Trial. Справа планы, не доступные Pro-функции. Следующий урок помогает продолжению, но не равен измеренному удержанию. Будем проверять возвращение без напоминания отдельно от ответов после контакта исследователя.

## Slide 08 — BUSINESS MODEL (3:10–3:45)

### On-slide copy — EN

**A price hypothesis with explicit economics.**

Free: 3 foundation lessons + repeat practice.
Pro proposal: $19/month for 3 practice lessons + Work Trial.

**Assumptions — to validate**

Average paid lifetime: 2.5 months
Gross margin: 90%

**Scenario arithmetic**

Gross-profit LTV: $19 × 90% × 2.5 = $42.75
CAC budget at 3:1: ≤ $14.25

No payments or interest form connected. LTV, margin, CAC and demand are not measured; fixed costs excluded.

### Talk track — EN

The proposed price is 19 dollars a month. Assuming a two-and-a-half-month paid lifetime and a 90 percent gross margin gives gross-profit lifetime value of 42 dollars and 75 cents. A three-to-one target would permit acquisition cost of 14 dollars and 25 cents. These are assumptions, not observed economics. Payments and an interest form are not connected.

### Подготовка — RU

Средняя оплаченная длительность 2,5 месяца — отдельное допущение, не результат исследования подготовки. Маржа 90% тоже не измерена: комиссии провайдера её не доказывают. LTV здесь валовая прибыль до привлечения и постоянных затрат. 3:1 — наш рабочий ориентир, организаторы требуют только LTV > CAC. Платную рекламу без данных не объявляем нерентабельной; органические каналы тоже требуют труда и бюджета.

## Slide 09 — MARKET & SCALE (3:45–4:30)

### On-slide copy — EN

**Start narrow. Test what scale would require.**

Planned acquisition tests: search content, LinkedIn and career-community referrals. Learners remain the buyers.

**One adjacent US occupation**

82,000 openings / year
Market research analysts, 2025–35
7% projected employment growth
Openings are not candidates or our TAM.

**$100M ARR stress test**

$19/month → 438,596 active payers
At 2.5 paid months → 175,439 new payers/month
Steady-state scenario, not a forecast.

Scale requires longer-lived consumer value or more individual segments. Reach, conversion and CAC are unknown.

Sources / links: [BLS OOH: Market Research Analysts, 2025–35](https://www.bls.gov/ooh/business-and-financial/market-research-analysts.htm)

### Talk track — EN

BLS projects 82,000 annual openings in one adjacent US occupation. That is neither a candidate count nor our market size. At 19 dollars a month, 100 million dollars in annual recurring revenue would require about 439,000 active subscribers. A two-and-a-half-month lifetime would require about 175,000 new subscribers every month at steady state. That scale needs broader recurring value. We will first test search content, LinkedIn and community referrals, including their labor costs.

### Подготовка — RU

82 тысячи — среднегодовые вакансии одной смежной профессии, не кандидаты и не платящий рынок. Для расчёта снизу вверх не хватает уникальных людей 25–45, доли тестов по таблицам и готовности платить; формула и пробелы в evidence. Поток 175439 верен при установившейся базе, постоянной цене и среднем оплачиваемом сроке 2,5 месяца. Это проверка сложности цели, не обещание её достижения. Университеты и буткемпы допустимы как каналы рекомендаций отдельным людям, не корпоративные покупатели.

## Slide 10 — EVIDENCE & NEXT 30 DAYS (4:30–4:55)

### On-slide copy — EN

**Working demo. User evidence comes next.**

No user-study or interest-form results yet.

**Days 1–7 · Planned**

5 observed sessions
Task understanding, help needed, unfamiliar task

**Days 8–14 · Planned**

US target-user interviews
Assessment context and price objections

**Days 15–30 · Planned**

Measure interest and later return
Test prep-pack vs subscription demand

Small non-US sessions, if recruited, will be labeled exploratory. No learning or demand uplift claimed.

Sources / links: [Try the live demo](https://fix-the-report-zimran-n362.decent-chair-7924.chatgpt.site) · [Public source code](https://github.com/Nurdaulet362/Kiker_BC2_Z_A)

### Talk track — EN

The demo is working, but we have no user-study or interest-form results yet. Next we will observe five sessions, test an unfamiliar report, interview US target users and measure later return and price interest. We will use that evidence to choose between a preparation package and a subscription. You can try the demo now.

### Подготовка — RU

Пользователь подтвердил, что результатов пока нет. Не подставляем цифру N=5 как выполненный пилот. Первые пять наблюдений — план; если участники не из США, это явно указываем. Слова об эффективности, конверсии и удержании не заявляем. Цена и формат подписки остаются проверяемыми гипотезами. Это направление потребительского обучения соответствует нашему пониманию Zimran, без заявления о партнёрстве.

## Supporting documents

- [Evidence and arithmetic](PITCH_V2_EVIDENCE.md): official sources, cost assumptions, market-sizing limits.
- [Pilot protocol](PILOT_PROTOCOL.md): neutral observations and an unfamiliar task.
- [Empty pilot template](PILOT_RESULTS_TEMPLATE.csv): no participant data.
- [Working plan](PITCH_V2_PLAN.md): current release state, rule corrections, timing and fallback.

At pitch preparation time (08:05 Asia/Almaty, 15 November), the public demo used application 01302ea while GitHub main was a45a002. A subsequent release may update the demo; verify its recorded GitHub source and public checks before quoting release-specific test counts. This deck describes the shared learning behavior and makes no release-specific test-count claim. All comparisons of alternative products are limited to their linked provider pages and are not claims that competitors lack other features.
