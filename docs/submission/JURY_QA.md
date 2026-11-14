# Fix the Report — jury Q&A

Answers describe the frozen application documented at `01302ea`, 14 November 2026. English answers are ready to say aloud; short Russian clarifications help the presenter preserve the distinction between implementation and hypothesis. Verification includes the fresh clean-clone runs recorded in [RELEASE_CHECK.md](RELEASE_CHECK.md).

## 1. Who is the user, and who pays?

**EN:** Our initial audience hypothesis is an adult preparing for a spreadsheet task or trying to work more confidently with business reports, especially in sales operations or analytics. The learner is also the proposed buyer. Age, geography, demand, and willingness to pay are not validated yet.

**RU:** Пользователь и предполагаемый покупатель — сам учащийся. Не выдавать старую гипотезу «США, 25–45» за исследованный сегмент.

Source: [CONTEXT.md](../../CONTEXT.md), [PRODUCT.md](../../PRODUCT.md).

## 2. What problem are you solving?

**EN:** We are testing whether people need more practice connecting formulas to the meaning of a report. A correct-looking number may include unpaid orders, average percentages incorrectly, or support the wrong budget decision. The product lets the learner diagnose, repair, and explain those mistakes.

**RU:** Сформулированная проблема — гипотеза. Интервью и масштаб проблемы ещё не подтверждены.

Source: [CONTEXT.md](../../CONTEXT.md), [learning/model.ts](../../src/learning/model.ts).

## 3. What is distinctive about the product?

**EN:** Our design connects one editable work artifact to diagnosis, an executable repair, a transfer question, and an explained review. The learner can change data and see whether the answer still holds. We have not completed a competitor study and are not claiming an exclusive category or a proven advantage over every alternative.

**RU:** Отличие демонстрируем через работающий цикл; «первые», «единственные» и «лучше всех курсов» не утверждаем.

Source: [PRODUCT.md](../../PRODUCT.md), [CASE_CONTEXT.md](../CASE_CONTEXT.md).

## 4. Is the product using AI to generate or grade answers?

**EN:** The running product has no live AI API or generative grading. Its six lessons are authored, and formulas execute in a browser worker. Expected answers are computed separately under the exercise rules. Decision answers are checked against the submitted data, not judged by a language model.

**RU:** Не обещать AI-персонализацию, генерацию уроков или субъективную проверку текста: этого нет.

Source: [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md), [learning/engine.ts](../../src/learning/engine.ts).

## 5. Do you compare the learner's formula with one correct string?

**EN:** No. We execute supported formulas and compare their computed results with independent expected values. For example, both a supported SUMIF solution and a supported equivalent using SUMIFS can pass the first lesson. Seven test datasets are useful evidence for that exercise, not a proof for every possible input.

**RU:** Проверяется поведение формулы, а не её буквальное совпадение. Конечные проверки не доказывают универсальную корректность.

Source: [CASE_CONTEXT.md](../CASE_CONTEXT.md), [SPRINT_SUMMARY.md](../SPRINT_SUMMARY.md).

## 6. What stops someone from entering the answer, such as `=1200`?

**EN:** In the first lesson, that constant matches the initial paid total but passes only one of seven checks. Different amounts, new rows, no paid orders, and an empty report expose the mistake. With the correct diagnosis and transfer answer, it scores 57/100 and does not complete the lesson.

**RU:** Это защита от ответа одним числом в текущем кейсе, а не защита от любых способов списывания.

Source: [CASE_CONTEXT.md](../CASE_CONTEXT.md), [SPRINT_SUMMARY.md](../SPRINT_SUMMARY.md).

## 7. What if they copy the correct formula?

**EN:** A supported formula that generalizes correctly should pass. We are not claiming cheating prevention. The separate transfer question checks one additional application of the rule, and hints are tracked. To establish learning, we still need to observe independent performance on unfamiliar tasks with target users.

**RU:** Правильное обобщение допустимо. Фиксированный вопрос и тесты ещё не подтверждают реальное освоение навыка.

Source: [CASE_CONTEXT.md](../CASE_CONTEXT.md), [CONTEXT.md](../../CONTEXT.md).

## 8. What does 100/100 mean? Is it a qualification?

**EN:** It is an exercise score: 20 points for diagnosis, up to 50 for repair, and 30 for transfer. Completion requires all repair checks, the correct transfer answer, at least 80 total points, and no full solution revealed during the attempt. It is not a certification, hiring prediction, or measure of job readiness.

**RU:** Правильная диагностика не обязательна для зачёта: верные исправление и перенос могут дать 80. Не говорить, что обязательно верны все три части.

Source: [CASE_CONTEXT.md — scoring](../CASE_CONTEXT.md), [learning/model.ts — isLessonComplete](../../src/learning/model.ts).

## 9. How do hints affect scoring?

**EN:** The first two hint levels explain the idea and structure without reducing points. Revealing the full solution requires confirmation, caps repair at 25/50, and makes that attempt practice only. The total can then reach at most 75/100. Hint use is stored with the attempt.

**RU:** Просмотр примера решения в разборе после отправки не меняет сохранённый балл задним числом.

Source: [CASE_CONTEXT.md](../CASE_CONTEXT.md), [learning/Workspace.tsx](../../src/learning/Workspace.tsx).

## 10. Is this fully compatible with Excel or Google Sheets?

**EN:** No full compatibility is claimed. It is a limited formula environment using fast-formula-parser, with an explicit function list and supported rows through 101. It includes SUMIF, SUMIFS, COUNTIF, COUNTIFS and other selected functions. A known limitation is case-sensitive criteria: `"Paid"` and `"paid"` differ, as do `"P*"` and `"p*"`.

**RU:** В демонстрации вводить именно `"Paid"`. Особенности пустых ячеек и экранирования wildcard не объявлять совместимыми с Excel.

Source: [PROJECT_HANDOFF.md — formula evaluation](../PROJECT_HANDOFF.md), [SPRINT_TASK_1B_REPORT.md](../SPRINT_TASK_1B_REPORT.md).

## 11. What content is available today? Are variants unlimited?

**EN:** There are six fixed authored lessons across revenue, conversion, and decisions, plus a separate connected Work Trial. The Work Trial already supports fresh assignment variants. The six-lesson learning path does not yet generate new persistent variants on repeat. We do not claim unlimited generated content.

**RU:** Не смешивать уже существующие варианты Work Trial с запланированными H4-вариантами шести уроков.

Source: [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md), [SPRINT_SUMMARY.md — limitations](../SPRINT_SUMMARY.md), [DEMO.md — retained Work Trial](../../DEMO.md).

## 12. What is implemented for returning users?

**EN:** Saved local drafts, attempt reviews, progress, repeat practice, and a rule-based next-lesson recommendation are implemented. A weak attempt can lead to another example in the same skill. Weekly plans, notifications, and new generated lesson variants are not implemented. We have no measured retention results yet.

**RU:** Удержание — гипотеза. В обычной сборке рекомендация Pro открывает тариф, а не закрытый урок.

Source: [learning/model.ts — recommendLesson](../../src/learning/model.ts), [access.ts](../../src/access.ts), [SPRINT_SUMMARY.md](../SPRINT_SUMMARY.md).

## 13. What is the business model?

**EN:** The pricing screen tests a freemium hypothesis. Free includes three foundation lessons and repeats. Proposed Pro is $19 per month for three practice-level lessons and Work Trial. The price is not validated, and we have no customer revenue to report. We need evidence that learners value continued practice enough to subscribe.

**RU:** Актуальная цена — $19/month. Прежнее предложение «пакет за $19» больше не является текущим тарифом.

Source: [Pricing.tsx](../../src/pricing/Pricing.tsx), [BUILD_MODES.md](../BUILD_MODES.md).

## 14. Can I purchase Pro now?

**EN:** No. The screen explicitly says payments are not connected and this is a product test. There is no checkout, account, renewal, or server-side entitlement system. The demo build opens Pro content for evaluation and labels every screen “Demo access — not a purchase.”

**RU:** Демо-флаг — не покупка; клиентское ограничение не является защищённой системой платного доступа.

Source: [SPRINT_TASK_4_REPORT.md](../SPRINT_TASK_4_REPORT.md), [access.ts](../../src/access.ts).

## 15. How do normal access and demo access differ?

**EN:** The normal build allows the three foundation lessons and their repeats; Pro routes lead to Plans. Only the exact build-time setting `VITE_DEMO_ACCESS=true` opens all six lessons and Work Trial, with the persistent demo banner. A localStorage flag does not change that mode. This is a static prototype access boundary, not payment security.

**RU:** Переменная при запуске preview не меняет уже собранное приложение; режим задаётся при сборке.

Source: [BUILD_MODES.md](../BUILD_MODES.md), [access.ts](../../src/access.ts).

## 16. Are you collecting emails or sending launch notifications?

**EN:** No. The app has no email form or notification flow. `PRO_INTEREST_URL` is an empty source constant, so the Get notified link is hidden. Setting it would require a source change and a rebuild; it is not an existing working signup integration.

**RU:** Не утверждать, что есть лист ожидания, внешняя форма или подписчики. На замороженном коде константу оставляем пустой.

Source: [access.ts](../../src/access.ts), [Pricing.tsx](../../src/pricing/Pricing.tsx), [BUILD_MODES.md](../BUILD_MODES.md).

## 17. Where does progress live? Can I switch devices?

**EN:** Progress is stored locally in the browser, with saved drafts, result snapshots, cross-tab reconciliation, and backup handling. If storage fails, the open page can continue in memory with a warning. There is no account or cross-device cloud sync. Local storage can be cleared, and its backups are not a permanent server record.

**RU:** «Сохранено на этом устройстве» не означает аккаунт, облако или бессрочную сохранность.

Source: [PROJECT_HANDOFF.md — state contracts](../PROJECT_HANDOFF.md), [storage-merge.md](../storage-merge.md).

## 18. How do you support international users?

**EN:** The interface and lessons support English and Russian. A new session without a saved choice starts in English; a saved Russian choice is respected. Formula function names and status criteria remain English, even in the Russian interface. Localization is implemented; international demand is not yet validated.

**RU:** Не говорить, что язык выбирается по языку браузера. Статус в формуле — `"Paid"` в обоих интерфейсах.

Source: [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md), [CASE_CONTEXT.md](../CASE_CONTEXT.md).

## 19. How much of this actually works, and what do the tests prove?

**EN:** Fresh checks on 14 November in a clean clone of frozen commit 01302ea passed 242 unit tests and 72 Chromium end-to-end tests in each of the normal and demo modes, plus TypeScript and production builds. No verification run failed. These check behavior including scoring, routes, storage, languages, and access boundaries; they do not prove learning outcomes, retention, market demand, or complete browser compatibility.

**RU:** Это новые проверки чистого клона замороженного кода, не 242+72 «пользователя». Firefox, WebKit и физический телефон в этих проверках не покрыты.

Source: [RELEASE_CHECK.md — fresh clean-clone results](RELEASE_CHECK.md); earlier results in [SPRINT_TASK_4_REPORT.md](../SPRINT_TASK_4_REPORT.md).

## 20. Have you validated the product with real users?

**EN:** We do not have a completed target-user study or measured learning, retention, and revenue results to claim. The next validation should observe how target learners diagnose an unfamiliar report, what help they need, whether they choose a second task, and whether they return and are willing to pay. That is a proposed study, not completed traction.

**RU:** Не заменять исследование пользователей проверками команды, автоматическими тестами или нашей демонстрацией 100/100.

Source: [PRODUCT.md](../../PRODUCT.md), [CONTEXT.md](../../CONTEXT.md), [DEMO.md — validation limits](../../DEMO.md).

## 21. Why does this fit Zimran?

**EN:** We see a fit with consumer technology and practical product learning: a focused personal use case, an international interface, and a business hypothesis that can be tested with users. That is our interpretation of the direction described in the project context. We are not claiming a Zimran partnership, endorsement, or validated demand.

**RU:** Подписка — решение нашего проекта, не обязательное требование Zimran ко всем продуктам.

Source: [CONTEXT.md — Zimran direction](../../CONTEXT.md), referencing [Zimran](https://zimran.io/) and [Zimran IT School](https://itschool.zimran.io/en).

## 22. Where can we try the app and inspect its source?

**EN:** Open the [public demo](https://fix-the-report-zimran-n362.decent-chair-7924.chatgpt.site) and the [public GitHub repository](https://github.com/Nurdaulet362/Kiker_BC2_Z_A). The owner authorized both publications. The demo includes all six lessons and Work Trial with a persistent **Demo access — not a purchase** banner. Payments remain disconnected. The published demo passed 72/72 Chromium e2e tests on its first run; a physical-phone check remains pending.

**RU:** Демо и исходники опубликованы с разрешения владельца. Полный доступ в демо не означает покупку; оплата не подключена. Проверка на физическом телефоне ещё не выполнена.

Source: [PUBLIC_RELEASE.md — public verification](PUBLIC_RELEASE.md), [SUBMISSION_CHECKLIST.md — publication status](SUBMISSION_CHECKLIST.md).

## 23. What is the biggest remaining product risk?

**EN:** Whether this small practice loop produces enough independent learning and repeated value to justify a subscription. The implementation shows that the exercise can run and give transparent feedback. The next evidence must come from unfamiliar tasks and real target-user behavior, before we claim stronger learning or business outcomes.

**RU:** Главный открытый вопрос — ценность и повторный спрос, а не наличие работающей кнопки оплаты.

Source: [CONTEXT.md](../../CONTEXT.md), [PRODUCT.md](../../PRODUCT.md).

## 24. What would you build next?

**EN:** After validation and owner approval, the planned work includes persistent lesson variants and a weekly practice path. A real paid product would separately require accounts, payments, and server-side entitlement. None of those features should be presented as available today, and this submission work keeps application code frozen.

**RU:** Это направление дальнейшей работы, не обещанный срок и не разрешение сейчас менять код.

Source: [CONTEXT.md — planned work](../../CONTEXT.md), [SPRINT_SUMMARY.md — limitations](../SPRINT_SUMMARY.md), [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md).
