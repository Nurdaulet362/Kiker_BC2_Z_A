# Fix the Report

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated by the user to implement the accepted MVP plan. React, TypeScript and Vite. Browser formula evaluation and local progress persistence.

## Users
Initial audience hypothesis: adult learners improving practical spreadsheet and business-data skills for work. The buyer is the individual learner. Russian and English are supported. Age, geography and willingness to pay remain unvalidated hypotheses.

## Product Purpose
Learn to spot, repair and explain misleading business reports through short work assignments, transparent feedback and a targeted next lesson. The product should teach the principle, then verify that the learner can apply it to a new situation.

## Capabilities and Constraints
The default route is a learning dashboard with six bilingual cases in three skills: revenue, conversion and decisions. Each case includes a brief, editable dataset, diagnosis, formula or decision, a transfer question, a saved review and a targeted next action. Formula solutions are executed in a worker and checked against 7–8 independent datasets. Decision solutions respond to the submitted data. The score is 20 diagnosis + 50 repair + 30 transfer. Successful repair and transfer with at least 80 points count as completing a lesson. Unsuccessful submissions remain visible without falsely increasing completion. Guest access, local persistence and an in-tab fallback are supported. All companies and data are fictional. No live AI generation, account sync or subjective automated grading. Scores describe exercise performance, not job readiness or certification. Earlier exercises remain at #trial and #practice. Publishing is explicitly on hold at the owner's request.

## Operating Context
24-hour Zimran/AIESEC hackathon. Working product is 40% of scoring. The user explicitly delegated routine implementation decisions while away and asked to see the result on return.

## Brand Commitments
Product name is Fix the Report. The owner explicitly rejected the earlier interface and authorized a full rebuild. The new learning studio uses warm white, coral actions, blue-gray type and sage/sky/ochre skill illustrations. See REDESIGN.md for the new product and visual contract; DESIGN.md retains legacy styling details for the earlier routes.

## Product Principles
- Correctness is demonstrated through user-controlled data.
- Explain the business rule before testing it.
- Preserve the learner's progress and make retries easy.
- Judge formulas by computed behavior across varied data.
- Connect spreadsheet correctness to a decision the user can explain.
- Separate exercise results from unvalidated claims about employment outcomes.
