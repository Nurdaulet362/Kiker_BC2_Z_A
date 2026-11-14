# Fix the Report — two-minute demo

This is a rehearsed demonstration of the frozen application documented at `01302ea`, not a live user-study result. Main route: the current first lesson, **The money that never arrived**. Use the English UI, with Russian narration below. Do not mix its totals or scoring with the separate Work Trial.

An [offline recording](Fix-the-Report-Demo.webm) now accompanies this script: exactly 120 seconds, 1280×800, silent. It shows real actions in the demo build, not seeded results. Use the narration below when presenting; the recording itself has no voice or audio track. Its visual checks and discarded takes are summarized in [RELEASE_CHECK.md](RELEASE_CHECK.md).

## Before the timer

- Use a fresh guest/private browser context so existing user progress is preserved. Do not clear someone else's storage. Start on the learning home with the default all-skills path and no prior attempt.
- Use the existing local demo build at `http://127.0.0.1:4174/` if it is running and verified. It must show **Demo access — not a purchase**. This is a local preview address, not a published submission link. Startup instructions are in [BUILD_MODES.md](../BUILD_MODES.md); this script does not authorize deployment.
- The first lesson is also available in the normal build, usually at local port `4173`. For that run, do not describe demo access or expect Pro content to open. All steps below through the first completed review work in both modes.
- Confirm English is selected. First use defaults to English; a previously saved Russian preference has priority. Use the visible language switch if needed.
- Keep this supported formula ready to paste, including the capital **P** in `Paid`:

  ```excel
  =SUMIF(B2:B101,"Paid",C2:C101)
  ```

- Do not reveal the full solution during the attempt: it caps repair points and prevents completion. The two-minute run is a prepared demonstration, not a claim that a new learner normally finishes in two minutes. The first lesson's displayed estimate is seven minutes.
- A second tab may already be open at `/#pricing` for the last ten seconds. Its payment disclosure must stay visible. Do not create a signup form or an external interest link for this demo.

## Main run — exactly 2:00

| Time | Action in the English UI | Expected visible result | Narration — RU |
| --- | --- | --- | --- |
| 0:00–0:12 | Show the learning home. Start **The money that never arrived** using its **Start lesson** button. | Six authored lessons across Revenue, Conversion and Decisions. In the demo build, the access banner is visible. | «Fix the Report — практика работы с бизнес-отчётами. Здесь шесть авторских уроков по выручке, конверсии и решениям. Для показа Pro открыт в демо-режиме; это не покупка». Omit the last sentence in the normal build. |
| 0:12–0:25 | Point to the brief's **Paid** rule. Click **Open the report**. | Five orders. The initial `=SUM(C2:C101)` returns **$2,030.00**. | «Магазин складывает все заказы и получает 2030 долларов. Но по условию этого задания выручка — только оплаченные заказы». |
| 0:25–0:42 | In **Amount, $, row 4**, change the cancelled order M-103 from `650` to `2300`; leave the field so the edit is applied. | The wrong formula now returns **$3,680.00**. Paid amounts still total **$1,200.00**. | «Увеличим отменённый заказ до 2300. Отчёт вырос до 3680, хотя оплаченная сумма не изменилась. Так учащийся сам видит причину ошибки». |
| 0:42–1:02 | Choose **Order status is ignored**. Replace the formula with `=SUMIF(B2:B101,"Paid",C2:C101)`. Wait for the preview, then click **Check solution**. | Formula returns **$1,200.00**. Feedback: **Your solution holds up** / **The calculation works on the test data.** | «Указываем причину и фильтруем Paid. Получаем 1200. Формула действительно исполняется: дальше проверяется правило на других данных, а не совпадение с образцом текста». |
| 1:02–1:17 | Click **Apply the skill**. Select the option labelled **$900**, then **Finish lesson**. | A separate store scenario: Paid 900, Cancelled 250, Pending 100. The review opens. | «Теперь другая ситуация: 900 оплачено, 250 отменено, 100 ожидает оплаты. Выбираем 900 — переносим то же правило на новые числа». |
| 1:17–1:36 | Show **Lesson completed**, **100 out of 100**, and the **20 / 50 / 30** score components. Open **See the checks**. | **7/7** checks. Point to a different data mix and the last supported row, **101**. | «Разбор показывает три части результата: причина, исправление и перенос. Семь проверок включают другие суммы, новые строки и пустой отчёт. Это оценка упражнения, не профессиональная квалификация». |
| 1:36–1:50 | Reload the review. Show the same saved score. Click **Next lesson**. | The result remains on this browser. On a clean all-skills path after this successful attempt, **The average that lies** opens. | «Результат сохранён на этом устройстве. Есть следующий конкретный шаг — разобраться с общей конверсией. Повторные визиты и рост навыка ещё нужно проверить с реальными пользователями». |
| 1:50–2:00 | Switch to the prepared **Plans** tab, or open `/#pricing`. Point to Free, Pro, and the payment disclosure. | Free: **3 foundation lessons** and repeat. Pro: **$19/month**, **3 practice-level lessons**, **Work Trial**. **Payments are not connected yet. This is a product test.** | «Три базовых урока бесплатны. Pro за 19 долларов в месяц — гипотеза углублённой практики. Оплата не подключена. Следующий шаг — проверить ценность и спрос». |

The title of the next recommendation depends on saved results and the selected skill. The stated **The average that lies** outcome assumes the fresh, all-skills context above; never claim that every learner must see the same recommendation.

## Optional jury challenge — outside the two-minute run

Use a new attempt, not the completed result's saved snapshot.

1. Open the first lesson again. If starting from its review, use **Try again**; otherwise use **Practice again** on its card.
2. Open the report and choose **Order status is ignored**.
3. Enter `=1200` and click **Check solution**. It matches the current paid total but passes only **1 of 7** checks.
4. Continue with **Apply the skill**, select **$900**, and **Finish lesson**.
5. Show **57/100**, **Practice only**, and the failed checks. A failed submission remains in history but does not itself add a completed lesson.
6. Point to the recommended refunds lesson, **Paid doesn't mean kept**. In the demo build it opens; in the normal build the attempt to open it leads to **Plans**. Both are intended behavior.

Say: «Число 1200 верно только для исходного отчёта. На других данных оно ломается. Продукт показывает конкретную причину и предлагает, что потренировать дальше».

## Recovery and presentation limits

- **Stored state changes the opening screen:** return to the rehearsed fresh browser context. Do not erase an existing user's history for the presentation.
- **The total is unexpected:** use **Reset data**, confirm the initial formula is `=SUM(C2:C101)`, and enter plain `2300` in row 4. The first lesson lets the learner edit amounts, not statuses or rows.
- **The formula errors:** check straight double quotes, English function names, comma separators, and the exact case `"Paid"`. `"paid"` is not equivalent in this engine.
- **A Pro link opens Plans:** this is correct for the normal build. Continue the foundation lesson; do not imply that someone purchased access.
- **A full solution was revealed:** expect a maximum **75/100** and **Practice only**. Start a fresh attempt if you need to demonstrate the independent completion path; do not label the assisted attempt completed.
- **A live interaction fails or time runs short:** show a labelled previously captured screenshot and say it is a recorded example. Do not claim that it just executed. The submission captures below are from actual interactions with the frozen application; they are local files, not customer data.
- **No public link exists yet:** use plain text **APP URL — PENDING AUTHORIZED DEPLOYMENT**. Do not show a fake published address or encode a placeholder in a QR code.

## Screenshot fallback references

All paths below are local, ignored artifacts relative to the project root; they are not included in Git. These captures were made on 14 November 2026 from real UI interactions with frozen code, without result fixtures or DOM-content edits. They are prepared examples, not user-study results. The narrow viewport is desktop Chromium emulation, not a physical phone. Internal capture notes: `.impeccable/review/submission/VISUAL_CHECK.md`. The committed [offline recording](Fix-the-Report-Demo.webm) provides the shared fallback; its verification is in [RELEASE_CHECK.md](RELEASE_CHECK.md).

| State | File | Truthful caption |
| --- | --- | --- |
| Report before repair | `.impeccable/review/submission/workspace-before-pitch.png` | Cancelled amount 2300; the SUM formula reports 3680. |
| Report after repair | `.impeccable/review/submission/workspace-after-pitch.png` | Same data; SUMIF reports paid revenue of 1200. |
| Failed constant answer | `.impeccable/review/submission/failure-mobile.png` | Prepared example: a constant answer scores 57/100; Practice only. |
| Successful review | `.impeccable/review/submission/success-mobile.png` | Prepared example: completed first lesson; Next lesson is visible at 375 pixels. |
| Revealed solution | `.impeccable/review/submission/revealed-mobile.png` | Prepared example: 75/100 after revealing the solution; Practice only. |
| Current pricing design | `.impeccable/review/submission/pricing-desktop.png` | Product-test pricing, with no payment connection. |
| Demo disclosure | `.impeccable/review/submission/demo-pro-mobile.png` | Pro lesson under explicitly labelled demo access. |

## Evidence used

- [CASE_CONTEXT.md](../CASE_CONTEXT.md): current first-lesson data, seven checks, score rules, exact transfer answer.
- [learning/model.ts](../../src/learning/model.ts): current lesson titles, data, recommendations, and completion rule.
- [learning/Workspace.tsx](../../src/learning/Workspace.tsx): visible button labels and review behavior.
- [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md): current routes, language persistence, storage, and formula limitations.
- [BUILD_MODES.md](../BUILD_MODES.md), [access.ts](../../src/access.ts), [Pricing.tsx](../../src/pricing/Pricing.tsx): current pricing, normal/demo boundary, and empty interest URL.
- [SPRINT_SUMMARY.md](../SPRINT_SUMMARY.md), [SPRINT_TASK_4_REPORT.md](../SPRINT_TASK_4_REPORT.md): historical final verification, not a new test run.
- [RELEASE_CHECK.md](RELEASE_CHECK.md): separate fresh clean-clone verification during submission preparation; 242 unit and 72 Chromium tests passed in each mode.

The [product demo overview](../../DEMO.md) describes the frozen sprint. Parts of [CASE_CONTEXT.md](../CASE_CONTEXT.md) retain the earlier route/pricing context; the current access implementation and final sprint reports take precedence for those details.
