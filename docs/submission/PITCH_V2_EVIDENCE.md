# Pitch v2 — evidence and economic assumptions

Checked on 15 November 2026. This is an evidence ledger for the pitch, not a forecast, a market validation result, or financial statements. Sources were opened directly; search-result snippets were not used where they disagreed with the current official page.

## 1. What is known about the initial market

The event defines the audience as US adults aged 25–45. Within that audience, the initial segment is a **hypothesis**: people preparing for analyst or sales-operations spreadsheet assessments. The prevalence of those assessments, willingness to pay, and age overlap have not been measured.

One relevant labour-market proxy is **market research analysts and marketing specialists, SOC 13-1161**. BLS projects approximately **82,000 occupational openings per year on average during 2025–2035** and **7% employment growth** over that decade. This is a related occupation, not an exact definition of sales operations. [BLS Occupational Outlook Handbook](https://www.bls.gov/ooh/business-and-financial/market-research-analysts.htm)

The corresponding BLS table reports **952,700 jobs in 2025** and **1,019,000 projected jobs in 2035**. Table employment and opening values are in thousands. These figures describe jobs and a projected hiring/replacement flow, not unique applicants, paying learners, or a population limited to ages 25–45. [BLS occupational projections and characteristics](https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm)

**Slide-safe wording:** “82,000 projected annual openings in one related US occupation. A market-entry proxy, not our TAM. We still need to measure assessment prevalence and willingness to pay.”

### Why a credible TAM cannot yet be calculated

`Annual relevant candidates × share facing a spreadsheet assessment × share willing to pay × spend per buyer`

BLS openings do not supply the first term. A candidate can apply to multiple openings; one opening can attract many candidates. Converting jobs into distinct candidates requires an independently supported, deduplicated candidate-to-opening relationship. It also requires the share inside US ages 25–45. Those inputs are unknown.

A transparent bottom-up research model is:

`82,000 openings/year × r × s × w = potential paying learners/year`

- `r`: unique US 25–45 relevant candidates per opening, deduplicated across applications — **unknown**.
- `s`: share of those candidates facing the relevant assessment — **unknown**.
- `w`: share willing to buy this product at the tested price — **unknown**.

This model is not a TAM estimate until the missing inputs are supported. Distribution adds a separate reach factor; do not present a hypothetical 10% reach or purchase rate as observed demand. Do not multiply 82,000 by $19 × 12 and call that annual revenue: openings are not customers, and twelve paid months contradict the 2.5-month scenario below.

## 2. Price, lifetime contribution, and acquisition limits

The current proposed price is $19/month. Payments are not connected. No paid lifetime, actual gross margin, CAC, or paid retention has been observed.

| Input | Value | Status |
| --- | ---: | --- |
| Monthly price | $19 | Current product offer; demand not validated |
| Mean paid duration | 2.5 months | Assumption to validate |
| Gross/contribution margin before acquisition and fixed operating costs | 90% | Assumption to validate |
| Desired lifetime contribution / CAC | 3:1 | Planning target; not an event requirement |

Calculations from those assumptions:

| Quantity | Formula | Result |
| --- | --- | ---: |
| Lifetime revenue | $19 × 2.5 | $47.50 |
| Lifetime gross contribution, called contribution LTV here | $19 × 90% × 2.5 | **$42.75** |
| Maximum CAC for target 3:1 | $42.75 / 3 | **$14.25** |
| Acquisition break-even boundary before fixed costs | CAC < $42.75 | Not a profit forecast |

The event's stated condition is **LTV > CAC**. A 3:1 target is our stricter planning assumption. A margin-adjusted contribution LTV must not be described as measured revenue LTV or net profit. With CAC at $14.25, modeled lifetime contribution after acquisition is $28.50 before fixed operating costs. Average duration is not an observed churn rate.

### Processor fees do not prove a 90% margin

Stripe's US standard pricing lists **2.9% + $0.30 per successful domestic-card transaction**; international cards and currency conversion can add charges. Its optional Billing pay-as-you-go price is **0.7% of Billing volume**. These are reference prices for the stated US setup, not confirmed fees for this team's future merchant account. [Stripe US pricing](https://stripe.com/pricing?locale=en-US)

At $19, the domestic-card fee is $0.851; if Billing pay-as-you-go is used, the extra fee is $0.133, totaling $0.984 before rounding. A 90% gross-margin assumption allows $1.90 of total direct costs per paid month, leaving about $0.916 after those example fees for other direct costs. Hosting, support, content delivery, refunds and other applicable charges still need an actual cost model. Do not deduct processing again after applying a margin that already includes it.

### Sensitivity: all rows are scenarios, not results

| Assumed mean paid months | Contribution LTV at 90% | CAC ceiling for 3:1 |
| ---: | ---: | ---: |
| 1 | $17.10 | $5.70 |
| 2.5 | $42.75 | $14.25 |
| 6 | $102.60 | $34.20 |

Longer retention cannot be asserted merely because it improves the table. New workplace practice after hiring is a product hypothesis that must earn continued use and payment.

## 3. What $100M ARR would require

At a constant $19 monthly price:

`$100,000,000 / ($19 × 12) = 438,596.49 active paying subscribers`

Round to **about 439,000 active paying subscribers**. This is the subscriber base corresponding to that annualized recurring-revenue run rate, not a forecast or a current market size.

At a mature steady state with a constant inflow, mean paid duration of 2.5 months, and no reactivation/price expansion:

`438,596.49 / 2.5 = 175,438.60 new paying subscribers/month`

Round to **about 175,000 new payers per month**. This is the replacement flow needed to maintain the base under the assumptions; it is not sufficient to predict the speed of reaching that base from zero. Launch periods are not steady state. A growth plan must model cohort buildup and departures separately; this division is not a launch acquisition target.

This exposes a real constraint: a short assessment-preparation use case has a demanding replenishment requirement. Neither the BLS occupation proxy nor a polished demo proves the path to $100M ARR. Continuing professional practice and additional individual learner segments are possible expansion hypotheses, not shipped benefits or established markets.

## 4. Acquisition experiments consistent with B2C

Do not say “paid ads cannot work below $14.” No measured CPC, conversion rate, or acquisition cost is available. The defensible statement is: **“Our modeled CAC target is at most $14.25; channels remain unvalidated. We will test intent-led content and referrals first.”** Organic channels also consume time and money.

First proposed experiment: one explanation of a misleading report, distributed to a relevant career community or an intent-specific search page, leading to the free lesson. With permission and an implemented interest form, measure qualified visitors, lesson completion, expressed interest at $19, and later actual purchases. Record content, referral and staff-time costs; calculate paid CAC only when purchases exist. Interest conversion is not purchase conversion.

Universities, bootcamps and professional communities may introduce the product to **individual adult learners who pay personally**. Institutional licences, corporate team contracts and employer-paid training are B2B and should not be presented as this submission's business model. No partnerships have been secured or contacted as part of this preparation.

## 5. Alternatives: narrow verified statements only

| Alternative source | Verified statement | What this does not prove |
| --- | --- | --- |
| [Microsoft SUMIF reference](https://support.microsoft.com/en-us/excel/functions/sumif-function?ad=us&rs=en-us&ui=en-us) | Explains syntax and provides examples users can copy into a worksheet. | It does not establish that all Microsoft learning is passive or lacks practical exercises. |
| [Microsoft SUMIFS worked example](https://support.microsoft.com/en-us/excel/sum-values-based-on-multiple-conditions) | Offers sample data and describes an editable Excel-for-the-web example. | Do not claim editable reports are unique to Fix the Report. |
| [DataCamp interactive learning](https://www.datacamp.com/interactive-learning) | Describes browser-based interactive exercises including Excel. | Do not claim courses only provide videos, or that no competitor executes learner input. |

A defensible product claim is the demonstrated combination: **repair a misleading report, execute the learner's formula on different authored datasets, explain failed checks, then attempt a transfer question**. Market-wide exclusivity, better learning outcomes, and stronger retention have not been established. No competitor's full paid curriculum was audited.

## 6. Language for the deck

- “Assumptions — to validate: 90% contribution margin; 2.5 paid months.”
- “Modeled contribution LTV: $42.75. Target CAC ≤ $14.25 for 3:1.”
- “$100M ARR at $19/month implies ~439k active payers; ~175k new payers/month at a 2.5-month steady-state paid lifetime.”
- “Payments are not connected. Willingness to pay has not been validated.”
- “Market proxy, not TAM: BLS projects 82k annual openings in a related US occupation, 2025–35.”
- “Distribution hypothesis: career-intent content and referrals to individual learners. B2C.”

Do not invent pilot responses or label a local qualitative sample as US validation. Do not promise an 8–15 point improvement or an 85-point outcome: neither follows from these calculations.
