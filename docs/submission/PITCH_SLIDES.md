# Fix the Report — 10-slide pitch

Submission copy, 14 November 2026. Exactly ten slides. On-slide text is English; speaker notes are Russian. The frozen application is documented at commit `01302ea`. This file does not authorize publication.

Rendering guidance: render only each slide's **On-slide copy** and its caption. Keep the Russian notes and source notes outside the audience-facing slide. Screenshot paths refer to local, ignored artifacts relative to the project root; they are not included in Git. Submission captures were made from the frozen application on 14 November 2026 through real UI interactions, with no result fixtures or DOM-content edits; internal capture notes are in `.impeccable/review/submission/VISUAL_CHECK.md`. They are prepared examples, not customer results or a physical phone test. The committed [pitch PDF](Fix-the-Report-Pitch.pdf) contains the selected visuals.

## Slide 01 — Fix the Report

### On-slide copy

**Fix the Report**

Practice the judgment behind the spreadsheet.

Repair a misleading business report. Test the solution on different data. Explain what the numbers mean.

A working B2C learning prototype · English / Russian

### Speaker notes — RU

Fix the Report — тренажёр работы с бизнес-данными. Пользователь получает короткую рабочую ситуацию: отчёт выглядит правдоподобно, но в нём есть ошибка. Нужно найти причину, исправить расчёт или рекомендацию и применить принцип в другой ситуации. Сейчас этот путь работает в браузере. Мы показываем учебный продукт и его проверяемую бизнес-гипотезу; результаты обучения реальных пользователей ещё предстоит исследовать.

### Visual and caption

- Visual: current English learning home, or a clear crop of the first report workspace. Avoid an unverified dashboard with invented user metrics.
- Caption: **A fictional report. A real calculation. A specific next step.**
- Screenshot source: `.impeccable/review/submission/home-desktop.png` or `.impeccable/review/submission/workspace-after-pitch.png`. A screenshot is optional on this opening slide.

### Sources

[PRODUCT.md](../../PRODUCT.md), [CONTEXT.md](../../CONTEXT.md), [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md).

## Slide 02 — The learner and the problem

### On-slide copy

**“I know the formula. Can I trust the report?”**

Initial audience hypothesis: adults preparing for spreadsheet tasks in sales operations, analytics, or everyday work.

Their job: find the mistake, understand it, and know what to practise next.

### Speaker notes — RU

Начинаем с конкретной ситуации: человеку предстоит задание по таблицам или самостоятельная работа с отчётом. Знакомство с функцией ещё не отвечает на вопрос, какие строки считать и какой вывод делать. Предполагаемый покупатель — сам учащийся. Это пока гипотеза аудитории, а не результат интервью. Возраст, география, частота проблемы и готовность платить не подтверждены; старое описание «США, 25–45» не используем как установленный факт.

### Visual and caption

- Visual: three plain phrases around a small report illustration: **Which rows count? / Which metric is fair? / Which decision follows?**
- Caption: **The problem hypothesis: connect a calculation to its business meaning.**
- Screenshot source: none required; do not use a fabricated customer quote or testimonial. The headline is an illustrative learner question.

### Sources

[CONTEXT.md — user and task](../../CONTEXT.md), [PRODUCT.md — users](../../PRODUCT.md).

## Slide 03 — A complete practice loop

### On-slide copy

**One report, five learning steps**

1. Diagnose the mistake.
2. Repair the formula or decision.
3. Check it against the data.
4. Apply the principle elsewhere.
5. Review the result and choose the next lesson.

Progress stays on this device.

### Speaker notes — RU

В продукте реализован полный цикл. Сначала учащийся читает условие и исследует таблицу, затем выбирает причину и вводит решение. Формульные уроки исполняют формулу на семи или восьми наборах данных; задания на решения проверяют рекомендацию по отправленным данным. После этого идёт отдельный вопрос на перенос и сохранённый разбор. Прогресс хранится локально: это не аккаунт и не синхронизация между устройствами.

### Visual and caption

- Visual: a five-step flow with one current report screenshot. Keep the interface legible instead of placing five full screens side by side.
- Caption: **From an editable report to feedback and a next action.**
- Screenshot source: `.impeccable/review/submission/workspace-after-pitch.png`. The first lesson permits editing amounts; its status labels and row structure are fixed in the UI.

### Sources

[CASE_CONTEXT.md — learner path](../CASE_CONTEXT.md), [Workspace.tsx](../../src/learning/Workspace.tsx), [PROJECT_HANDOFF.md — state](../PROJECT_HANDOFF.md).

## Slide 04 — See the mistake move

### On-slide copy

**A cancelled order must not increase paid revenue.**

Original report: **$2,030**

Change one cancelled order: **$650 → $2,300**

Wrong total: **$3,680** · Paid total: **$1,200**

```excel
=SUMIF(B2:B101,"Paid",C2:C101)
```

### Speaker notes — RU

В первом уроке магазин складывает все заказы: получается 2030 долларов, хотя оплачено только 1200. Меняем сумму отменённого заказа с 650 на 2300. Ошибочная SUM показывает уже 3680, но оплаченная выручка не меняется. Исправляем правило через SUMIF: учитываем только Paid. Для этого конкретного упражнения выручка определена как сумма оплаченных заказов; это учебная модель. Затем движок проверяет решение на семи наборах, включая пустой отчёт и заказ в строке 101.

### Visual and caption

- Visual: current workspace after entering `2300` in the amount for M-103 and before or after the formula repair. Pair it with the three stated totals.
- Caption: **Changing a cancelled amount changes the error, not the paid total.**
- Screenshot sources: `.impeccable/review/submission/workspace-before-pitch.png` and `.impeccable/review/submission/workspace-after-pitch.png`. Both show the real cancelled amount `2300`; the formula changes from SUM to SUMIF. Do not imply the learner can edit status labels or add rows in this lesson.

### Sources

[CASE_CONTEXT.md — original table and checks](../CASE_CONTEXT.md), [model.ts — revenue-cancelled](../../src/learning/model.ts), [engine.ts](../../src/learning/engine.ts).

## Slide 05 — Feedback that explains the score

### On-slide copy

**What worked? What needs practice?**

**20** Diagnosis · **50** Repair · **30** Transfer

Completion: all repair checks, correct transfer, 80+ points, no revealed solution.

Matching one number is insufficient: `=1200` passes only **1 of 7** checks.

Revealed solution: **75 maximum**.

### Speaker notes — RU

Разбор показывает, за что получены баллы, какие проверки не прошли и что попробовать дальше. Константа 1200 совпадает с исходным итогом, но проходит только одну из семи проверок. При правильных диагностике и переносе такая попытка получает 57 баллов и остаётся тренировочной. Полностью правильное самостоятельное решение даёт 100. Если во время попытки раскрыть полную подсказку, исправление ограничено 25 баллами, итог — 75, зачёта нет. Эти баллы описывают упражнение, а не профессиональную квалификацию.

### Visual and caption

- Visual: success, failed constant, and revealed-solution reviews. Keep completion labels visible.
- Caption: **Prepared examples: 100 completed; 57 and 75 remain practice only.**
- Screenshot sources: `.impeccable/review/submission/success-mobile.png`, `.impeccable/review/submission/failure-mobile.png`, `.impeccable/review/submission/revealed-mobile.png`. For detailed failed checks use `failure-desktop-full.png` in the same directory.

### Sources

[SPRINT_SUMMARY.md — learning path](../SPRINT_SUMMARY.md), [CASE_CONTEXT.md — scoring](../CASE_CONTEXT.md), [model.ts — isLessonComplete](../../src/learning/model.ts).

## Slide 06 — Working today

### On-slide copy

**Built and checked**

- Six lessons: revenue, conversion, decisions.
- Connected Work Trial.
- English / Russian; local progress.
- Formulas execute in workers.

Fresh clean-clone checks, **per mode**, 14 November:

**242 unit tests · 72 Chromium end-to-end tests passed**

### Speaker notes — RU

Сейчас есть шесть фиксированных авторских уроков, отдельный Work Trial, два языка, локальные черновики и история. Формулы действительно исполняются в ограниченном табличном окружении, а не сравниваются с единственной строкой ответа. При подготовке сдачи 14 ноября в чистом клоне замороженного кода заново прошли 242 unit-теста и 72 сквозных Chromium-теста в каждом из двух режимов: обычном и демо. Ошибок и повторных прогонов не было. Это проверка реализации, а не доказательство эффективности обучения. Firefox, WebKit и физический телефон не проверялись.

### Visual and caption

- Visual: three curriculum categories, with the test counts as a compact evidence strip. If showing Pro access, retain the visible demo banner.
- Caption: **Implemented behavior; verification recorded for both normal and demo builds.**
- Screenshot sources: `.impeccable/review/submission/home-desktop.png` or `.impeccable/review/submission/demo-pro-mobile.png`. The latter shows a Pro lesson with its demo disclosure.

### Sources

[RELEASE_CHECK.md — fresh clean-clone results](RELEASE_CHECK.md), [SPRINT_TASK_4_REPORT.md — earlier sprint checks](../SPRINT_TASK_4_REPORT.md), [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md).

## Slide 07 — A reason to come back

### On-slide copy

**The next lesson starts with this result.**

Implemented: a recommendation, saved reviews, and repeat practice.

Hypothesis: a clear next action helps learners continue and improve.

To test: independent performance on an unfamiliar task, a second lesson, and a later return.

### Speaker notes — RU

После попытки продукт предлагает следующий шаг. При слабом результате это может быть другой урок того же навыка; например, после ошибки в выручке — кейс с возвратами. В обычной сборке рекомендация на Pro ведёт на тариф, в демо открывает урок. Сейчас повтор основного урока использует его исходные данные. Новые сохраняемые варианты шести уроков и недельный план ещё не реализованы. Мы предполагаем, что понятное продолжение поможет возвращаться, но удержание и улучшение результатов пока не измерены.

### Visual and caption

- Visual: current review showing **Next lesson**, with the recommended lesson title. Use a normal-build or demo-build screenshot consistently with its actual route behavior.
- Caption: **A next action exists. Repeat use still needs validation.**
- Screenshot sources: `.impeccable/review/submission/success-mobile.png` or `.impeccable/review/submission/failure-mobile.png` for the next action at an emulated 375-pixel width.

### Sources

[model.ts — recommendLesson](../../src/learning/model.ts), [access.ts](../../src/access.ts), [SPRINT_SUMMARY.md — limitations](../SPRINT_SUMMARY.md).

## Slide 08 — A business hypothesis we can test

### On-slide copy

**Free**

3 foundation lessons + repeat practice

**Pro — $19/month**

3 practice-level lessons + Work Trial

Price and subscription demand are hypotheses.

Payments are not connected. Demo access is not a purchase. Client-side gating is not payment security.

### Speaker notes — RU

Тариф уже показан в интерфейсе: бесплатные три базовых занятия и повтор, Pro за 19 долларов в месяц — три занятия уровня practice и Work Trial. Это тест предложения, не работающая подписка: нет оплаты, аккаунтов и серверной проверки права доступа. В демо Pro открыт флагом сборки и везде отмечен плашкой «Demo access — not a purchase». Внешний адрес интереса пустой; формы, сбора e-mail и уведомлений нет. Готовность платить и достаточную причину для ежемесячной подписки нужно проверить отдельно.

### Visual and caption

- Visual: current English pricing screen, including the payment disclosure.
- Caption: **An explicit product test: Free and proposed Pro access.**
- Screenshot source: `.impeccable/review/submission/pricing-desktop.png`. Do not add a fictional checkout, purchase confirmation, or working interest link.

### Sources

[Pricing.tsx](../../src/pricing/Pricing.tsx), [access.ts](../../src/access.ts), [BUILD_MODES.md](../BUILD_MODES.md), [SPRINT_TASK_4_REPORT.md](../SPRINT_TASK_4_REPORT.md).

## Slide 09 — Why this direction fits Zimran

### On-slide copy

**A focused consumer learning product**

- Practical personal value.
- English / Russian interface.
- Free practice leading to deeper learning.
- Decisions to validate with users.

Our interpretation of strategic fit; no partnership or endorsement claimed.

### Speaker notes — RU

Мы видим соответствие направлению Zimran в потребительском продукте с понятной личной пользой, международным интерфейсом и проверяемой бизнес-моделью. Контекст проекта опирается на официальное описание Zimran как компании, создающей потребительские технологические бизнесы, и на её образовательную программу, объединяющую исследование пользователей, аналитику и продуктовую работу. Это наша интерпретация соответствия, а не заявление о партнёрстве или поддержке. Подписка — гипотеза нашего проекта; мы не приписываем её обязательным требованиям Zimran.

### Visual and caption

- Visual: three words or icons — **Learn / Measure / Iterate**. Keep Fix the Report's own visual identity.
- Caption: **Consumer value, international access, and a testable business model.**
- Screenshot source: none required. Avoid partner-logo lockups or endorsements.

### Sources

[CONTEXT.md — Zimran direction](../../CONTEXT.md), which records the source check on 14 November 2026: [Zimran](https://zimran.io/) and [Zimran IT School](https://itschool.zimran.io/en). This slide states a project interpretation, not a claim of measured traction.

## Slide 10 — The next proof comes from learners

### On-slide copy

**Can the learner fix the next unfamiliar report?**

Next: observe target learners, test independent transfer, return behavior, and willingness to pay.

**Try the practice loop. Challenge the formula.**

[OPEN THE DEMO](https://fix-the-report-zimran-n362.decent-chair-7924.chatgpt.site)

[VIEW THE SOURCE](https://github.com/Nurdaulet362/Kiker_BC2_Z_A)

### Speaker notes — RU

Мы уже можем показать работающий цикл и проверить формулу на изменённых данных. Следующее доказательство — работа реальных целевых пользователей: могут ли они самостоятельно решить незнакомое задание, выбирают ли второй урок, возвращаются ли позже и готовы ли платить. Это план исследования, не отчёт о проведённых интервью или продажах. С разрешения владельца опубликованы демо и исходники на GitHub; ссылки на слайде ведут к ним. Демо открывает все уроки с постоянной пометкой «Demo access — not a purchase»; оплата не подключена.

### Visual and caption

- Visual: close with the first report and the two public links above. Any QR code must encode the actual demo URL.
- Caption: **Working prototype now. User evidence next.**
- Screenshot source: `.impeccable/review/submission/workspace-after-pitch.png` or `.impeccable/review/submission/success-mobile.png`.

### Sources

[PRODUCT.md — audience and constraints](../../PRODUCT.md), [CONTEXT.md](../../CONTEXT.md), [SUBMISSION_CHECKLIST.md — publication status](SUBMISSION_CHECKLIST.md).
