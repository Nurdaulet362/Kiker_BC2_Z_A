# Fix the Report — work trial

## Product hypothesis

An individual preparing for a sales operations interview wants to rehearse a realistic spreadsheet assignment and identify what to practice before the real assessment. The user is a US adult aged 25–45. This is the Skills track and a B2C purchase hypothesis, not a tool sold to employers.

The first complete assignment combines report repair and a business decision. The earlier standalone cancelled-order lesson remains a guided warm-up.

## Two-minute demo

1. Open the root route. Start **The Friday revenue review**.
2. The draft revenue formula reports **$3,280**. Paid revenue is **$1,800**; cancelled and pending orders are included by mistake.
3. The draft conversion is **7.50%**. The correct rate is **15 paid orders / 250 leads = 6.00%**.
4. Move to the decision. Both channels have $900 paid revenue. Email costs $200 and contributes $700; Ads costs $1,100 and contributes −$200. The draft's advice to choose Ads because of order volume is unjustified under the assignment rule.
5. Submit the draft formulas and a volume-based Ads recommendation. The review identifies failed checks and a specific skill to practice.
6. Repair revenue with `=SUMIF(B2:B101,"Paid",C2:C101)` and conversion with `=IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101))`.
7. Recommend an Email test, select contribution per dollar as the evidence, and acknowledge that one week does not guarantee future returns. Submit: **100/100, 30 checks passed**. Show first versus latest score; worked hints are recorded if used.
8. Start a fresh assignment. The next variant changes the costs so **Ads** becomes the better test. The learner must read the evidence again.

For an interactive jury moment, change a channel's ad spend. Its contribution changes immediately, and the accepted recommendation changes with it. Changes to order statuses also update paid revenue and the conversion numerator.

## What the score means

- Revenue accuracy: 40 points, proportional to 19 passed checks.
- Metric reasoning: 35 points, proportional to 8 passed checks, including zero leads, new channels and row 101.
- Business judgment: 25 points — channel choice 10, economic evidence 10, appropriate uncertainty 5.

These are transparent exercise rules. The score is not a validated hiring prediction. The optional handoff note is saved but not graded. The system executes formulas on data; it does not compare text against one answer string. Expected values are computed independently.

## How this addresses the rubric

| Criterion | Demonstrable evidence | Still to validate |
| --- | --- | --- |
| Product & engineering, 40% | Connected editable data, formula execution, multiple test datasets, full submission and retry loop | Public production deployment |
| Value & retention, 20% | Diagnose gaps → targeted practice → fresh assignment | Whether users return and improve without hints |
| Problem & user, 15% | A specific personal situation: an upcoming sales operations assessment | Interviews with actual target users |
| Business potential, 15% | Hypothesis: sell an individual preparation pack for a near-term assessment | Willingness to pay, acquisition cost, repeat demand and market size |
| Originality, 10% | One work artifact links calculations, a decision and falsifiable feedback | Competitor comparison; do not claim a unique category |

## Pricing experiment, not a launched offer

Test a **$19 preparation pack** against free practice with real target users. This is a proposed test price, not market evidence or a live checkout. A short preparation pack fits the immediate use case; recurring revenue needs separate evidence of continued demand. No payment flow or misleading purchase confirmation is implemented.

Ask target users to complete an unfamiliar variant after feedback, observe where they need help, and ask what they currently do before a spreadsheet assessment. Do not substitute hackathon teammate approval for target-user validation.

## Remaining submission work

Public deployment, a public repository for the final submission, and the pitch PDF of up to 10 slides. The private source repository remains private until its owner authorizes the visibility change.
