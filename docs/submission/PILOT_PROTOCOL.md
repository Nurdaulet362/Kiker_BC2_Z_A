# Fix the Report — protocol for an observed pilot

Prepared 15 November 2026. This is a research plan, not a report of completed sessions. Target: five observed sessions, at most 15 minutes each. There are no participant results in this document or the CSV template.

The challenge audience is US adults aged 25–45. The initial segment hypothesis is people preparing for spreadsheet assessments for analyst or sales-ops roles. A convenient local sample can reveal usability problems; it does not validate demand in the US target segment.

## Purpose and limits

Observe whether a person can understand the first lesson, attempt a repair, interpret the review and choose a next step. Separately observe application of the rule to one unfamiliar report and understanding of the $19/month offer.

This small qualitative pilot does not establish learning effectiveness, willingness to purchase, retention or market size. A successful post-lesson task alone cannot establish improvement: there is no independent baseline or control group. App scores are exercise results, not measurements of professional ability.

## Before the first session

1. Record the exact public URL, observed release identifier if known, date and time zone, and normal/demo mode. Use the same release for all sessions; record any exception. Do not describe the newer repository commit as the live version unless verified.
2. Check that the first lesson opens and that Plans shows the actual offer. The demo banner must remain visible. Tell participants that Pro is open for the demonstration and payment is not connected.
3. Use a fresh browser profile for each participant so prior answers, language and progress do not carry over. Record actual device, browser, viewport and starting language. A desktop browser at a narrow width is not a physical phone test.
4. Prepare the unfamiliar report below as a separate sheet or document. It is a pilot instrument, not a new app lesson. Do not edit the product or its curriculum.
5. Use anonymous IDs such as P01. Keep raw notes and filled results in a private location outside the repository. Commit only this protocol and the empty template. Do not record names, email addresses, employer names or identifying quotations in the deck or repository.
6. Recruit adults who use spreadsheets or have prepared for a spreadsheet assessment. Record US / non-US / undisclosed, whether the participant is in the 25–45 range if they volunteer it, relevant experience and whether an assessment is upcoming. Do not infer nationality, age or eligibility from appearance.

Ask before recording notes: “May I take anonymous notes about where the exercise is clear or confusing? You can skip any question or stop at any time. We are testing the product, not you.” If consent is declined, do not retain participant-level observations. Recording audio/video is not part of this protocol.

## Fifteen-minute session

| Time | Action | Record |
| --- | --- | --- |
| 00:00–01:00 | Consent and brief context questions. Explain demo access and that payment is not connected. | Consent, anonymous ID, audience fit, prior spreadsheet experience, assessment timing. |
| 01:00–01:30 | Give only: “This is practice for repairing reports. Please try the first lesson.” After 30 seconds ask: “What do you think the task asks you to do?” | Participant's interpretation, coded as clear / partial / unclear; this is an observation, not an objective comprehension test. |
| 01:30–08:00 | Let the participant proceed. Remain quiet; do not point at the right formula or diagnosis. Allow normal in-app hints. | Start time, first independent action, obstacles, Check solution clicks, hint use, revealed solution, external help and whether the lesson reached review before the cutoff. |
| 08:00–09:00 | If a review was reached, ask: “What does this result tell you?” and “What would you do next?” If not, ask what blocked progress. | Understanding of success/practice status and spontaneous next step. Record an actual next-lesson click separately from a stated intention. |
| 09:00–12:00 | Present the separate unfamiliar report below, with no example solution visible. Stop at three minutes even if incomplete. | Initial answer, rule explanation and response to changed data. Record assistance; do not award “independent” if the observer gives the rule or formula. |
| 12:00–14:30 | Show the real Plans screen. Ask: “What do you understand you get for free and for $19/month?” Then: “Would you consider paying this amount for your current situation? Why or why not?” | Understanding of the offer; yes / no / unsure / declined; reasons; actual purchase availability. A verbal yes is stated interest only. |
| 14:30–15:00 | Ask: “What was the biggest obstacle?” Thank the participant. | One prioritized issue. Do not pitch improvements or persuade them to change a price answer. |

If a participant asks for help, first say: “Please use whatever help you would normally use.” Record exactly what happened. App hints, observer assistance, another person, search and AI assistance are distinct fields. If the observer explains a solution to continue a usability walkthrough, mark all dependent results as assisted.

If the lesson does not finish within its allocated time, record `not_reached_by_cutoff`; do not call it a failed lesson or invent a completion time. Continue with the unfamiliar report only if the participant is comfortable. Mark whether they reached the instructional review before that task. This difference limits comparisons between participants.

## Separate unfamiliar report

This task changes the values and column order. It tests application of the same Paid-only rule; it does not introduce refunds or a new accounting rule. Do not show the observer key until the answer has been recorded.

**Participant prompt — EN**

> You are preparing another store's report. Its revenue must include only orders with status Paid. The current report shows $915 using `=SUM(B2:B6)`. Review it and write a formula that also handles future orders through row 101. Explain the rule you used. You may answer in words if you cannot remember the formula syntax; we record those separately.

**Participant prompt — RU**

> Ты готовишь отчёт другого магазина. В выручку должны входить только заказы со статусом Paid. Сейчас отчёт показывает $915 по формуле `=SUM(B2:B6)`. Проверь его и напиши формулу, которая учитывает будущие заказы до строки 101. Объясни своё правило. Если не помнишь синтаксис, можно ответить словами — это будет отмечено отдельно.

| Spreadsheet row | A — Order | B — Amount, USD | C — Status |
| ---: | --- | ---: | --- |
| 2 | R-201 | 275 | Cancelled |
| 3 | R-202 | 210 | Paid |
| 4 | R-203 | 90 | Pending |
| 5 | R-204 | 340 | Paid |
| 6 | R-205 | 0 | Paid |

After recording the initial answer, show these changes in sequence:

1. Add R-206 at row 7: amount 800, status Cancelled. Ask for the new revenue and why.
2. Add R-207 at row 8: amount 125, status Paid. Ask for the new revenue and whether the submitted formula handles it.

**Observer key — do not show during the task**

- Original all-status sum: 275 + 210 + 90 + 340 + 0 = 915.
- Paid-only total: 210 + 340 + 0 = 550.
- After the cancelled order: 550; after the paid order: 675.
- One valid formula: `=SUMIF(C2:C101,"Paid",B2:B101)`. Other equivalent expressions are acceptable if they implement the rule and support the stated range. A constant 550 is not a general repair. A correct verbal rule is not a syntactically valid formula; record both independently.
- Record four separate observations: Paid-only rule stated, initial total correct, both changes correct, formula covers the reordered columns and future rows. Use yes / no / not_observed, plus assistance details. These are pilot observations, not a new score or a change to app grading.
- If a formula is not executed in a spreadsheet, mark verification as manual review. Do not report that it passed the app's hidden checks. Record syntax uncertainty rather than guessing.

## Follow-up and return behavior

Do not label a request to recall a formula after one hour as retention or proof of transfer. It measures prompted recall and may reward memorizing a string. A reminder also influences return behavior.

If a participant separately agrees to follow-up, the owner may later invite them to a different task. Record invitation time, whether they were prompted, whether they returned, and what they did. This protocol does not authorize an agent to contact anyone. Contacts and consent records stay outside the repository.

Unprompted return requires an observation window and a reliable way to identify a returning consenting participant. The current local-progress product does not provide a validated cross-device retention metric. If no such observation exists, write “Return behavior not yet measured.” Do not report same-session Next lesson clicks as next-day retention.

## Reporting rules

- Publish counts with denominators: “3 of 5 reached review without observer help,” not just “60% success.” Keep in-app hints visible in the breakdown.
- Separate participants recruited, consented, started, reached review, completed the unfamiliar task and answered the price question. Exclusions need a stated reason.
- Describe the sample: for example, `n=5, all non-US, qualitative convenience sample` only if those facts are recorded. Do not automatically fill n=5 because it was the target.
- Report actual results even if they are unfavorable. Include at least one observed obstacle; do not claim statistical significance or causal learning improvement.
- Price answers are stated interest. An interest-form submission is not a payment. Report date/time cutoff, form availability and the exact question wording alongside counts.
- Keep pilot responses and interest-form responses separate unless consented anonymous matching allows deduplication. Do not add the two totals to claim unique interested people. If duplicates cannot be checked, say so and report submissions rather than unique users.
- No form data means “No form results available,” not “0% conversion.” No observed pilot means “No user data yet,” not “Users did not improve.”

## Slide 10 copy when no results are available

**Evidence today**

Working practice loop; software checks documented separately. No user-study results or payment evidence yet.

**Next validation**

Five observed sessions: task comprehension, independent application to an unfamiliar report, next-step choice and stated price interest. Report sample location and assistance. Validate the US segment and later return separately.

**Speaker note — RU:** Это план исследования, а не результаты. Мы не утверждаем улучшение навыка, удержание или спрос. Техническая проверка подтверждает работу сценария; поведение и готовность платить будут проверяться на людях.

## Empty results template

`PILOT_RESULTS_TEMPLATE.csv` contains 22 headers and no participant rows. Duplicate it into private storage before collecting observations. Combined fields keep the sheet quick to fill; place detailed events in `notes_anonymized`. No personal contact fields are included.

- `session_datetime_with_timezone`: include the UTC offset, for example the format `YYYY-MM-DDTHH:MM:SS+05:00`.
- `source_url_release_mode`: URL, verified release or `unknown`, and normal/demo mode. `device_browser_viewport_language`: actual device, browser, CSS viewport and starting language, separated by semicolons.
- `spreadsheet_assessment_context`: brief relevant experience and assessment timing; omit identifying details.
- `lesson_outcome_time_seconds`: reached review / completed / practice only / `not_reached_by_cutoff`, plus observed seconds. `checks_hints_reveal`: Check solution count, highest in-app hint level and whether the solution was revealed. Put an observed app score in notes if useful.
- `assistance`: distinguish `none`, `app_hint`, `observer` and `external`, with the affected step. Use `assisted` on dependent unfamiliar-task observations if someone supplied the rule or formula; app hints in the preceding lesson do not automatically mean the later task was assisted.
- `unfamiliar_rule`, `unfamiliar_formula`, `unfamiliar_changes`: record correct / incorrect / uncertain / `not_observed`; for changes include the initial and two subsequent totals. In notes record whether the review was seen first, help, time cutoff and formula verification method. Manual review must not be described as an executed check.
- `next_action_observed`: distinguish a spoken intention from an actual same-session click. `price_answer`: yes / no / unsure / declined; it is stated interest, not a purchase.
- `followup_status`: use `not_observed` unless a follow-up actually occurred. If measured, record `prompted` or `unprompted`, the action and observation window; store further detail in notes. A prompted return is not organic retention.

Use `not_observed` whenever an event was not measured and `declined` when the participant skips a question. Neither means a negative result. Leave unavailable measurements explicit instead of filling guessed values.
