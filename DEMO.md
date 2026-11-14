# Fix the Report — product and demo

Fix the Report is a browser-based B2C practice product for spreadsheet assessments. Six authored lessons cover revenue, conversion and business decisions: diagnose a mistake, repair the report, apply the rule to a new scenario, and review the checks. Progress is saved in the browser. English is the first-use default; the EN/RU switch preserves a saved language preference, including Russian.

The application code is frozen at `01302ea`. Exercise scores describe these prepared tasks; learning gains, retention and willingness to pay still need validation with target users.

## Two-minute demonstration

Use a fresh browser context without clearing anyone's existing progress. The first lesson works in both normal and demo builds. Follow the timed [demo script](docs/submission/DEMO_SCRIPT.md) for the full presentation and recovery steps.

1. Open `/` and start **The money that never arrived**. Read the Paid-only rule and choose **Open the report**. The initial `=SUM(C2:C101)` returns **$2,030**.
2. Change cancelled order M-103, **Amount, $, row 4**, from `650` to plain `2300`. The erroneous SUM rises to **$3,680**; paid revenue remains **$1,200**. This lesson lets the learner edit amounts.
3. Choose **Order status is ignored**. Replace the formula with either supported solution below, using the exact case `"Paid"`, then choose **Check solution**:

   ```excel
   =SUMIF(B2:B101,"Paid",C2:C101)
   =SUMIFS(C2:C101,B2:B101,"Paid")
   ```

   Both execute against **seven checks**, including a different status mix, added orders, no paid orders, zero amounts, row 101 and an empty report. The engine checks results on data, not equality with one answer string.
4. Choose **Apply the skill**, select **$900** in the separate transfer scenario, then **Finish lesson**.
5. Show **100/100**, **Lesson completed**, and the **20 diagnosis / 50 repair / 30 transfer** breakdown. Open **See the checks** to show **7/7**.
6. Reload to show the saved result, then choose **Next lesson**. In a fresh all-skills path, the next recommendation is **The average that lies**; recommendations depend on saved results and the selected skill.
7. Open `/#pricing` and show Free, Pro and the payment disclosure below.

## Three score examples

These examples use the correct diagnosis, **Order status is ignored**, and the correct transfer answer, **$900**.

| Attempt | Checks and score | Review outcome |
| --- | --- | --- |
| Correct SUMIF or SUMIFS, without revealing the solution | 7/7; 20 + 50 + 30 = **100/100** | **Lesson completed** |
| Constant `=1200`, without revealing the solution | 1/7; 20 + 7 + 30 = **57/100** | **Practice only**; the initial total is right, but the rule fails on new data |
| Correct formula after revealing the full solution | 7/7; 20 + 25 + 30 = **75/100** | **Practice only**; revealing the solution caps repair credit |

Completion requires every repair check to pass, a correct transfer answer, at least 80 points and no revealed solution. Failed or revealed attempts remain in history without themselves adding a completed lesson. On a fresh all-skills path, a failed first lesson recommends **Paid doesn't mean kept**; it opens in demo mode and leads to Plans in normal mode.

## Free, Pro and the two build modes

- **Free:** three foundation lessons and repeat practice.
- **Pro:** a **$19/month product-test hypothesis** for three practice-level lessons and Work Trial. The UI states: **Payments are not connected yet. This is a product test.** There are no payments, accounts or server-side subscription entitlements. The external interest URL is empty, so no notification link is shown.
- **Normal build:** `VITE_DEMO_ACCESS=false` (also the default). Foundation lessons are available; practice-level lessons, their saved reviews and Work Trial lead to `/#pricing`.
- **Demo build:** `VITE_DEMO_ACCESS=true` at build time. All six lessons and Work Trial are available, with the persistent **Demo access — not a purchase** banner. Both modes run the real lessons and evaluate learner input.

Both builds are maintained and tested. The flag is baked into each build; changing localStorage or a preview process's environment does not unlock an existing normal build. See [BUILD_MODES.md](docs/BUILD_MODES.md) for reproducible commands and separate local outputs. Local preview addresses are not public deployment URLs.

The legacy `/#practice` route redirects to `/#lesson/revenue-cancelled`. **Work Trial** at `/#trial` is a separate connected assignment covering revenue, conversion and a channel decision. Its **30 checks** and **40/35/25** scoring must not be confused with the first lesson's seven checks and 20/50/30 scoring.

## Submission artifacts and verification

- [Pitch PDF](docs/submission/Fix-the-Report-Pitch.pdf): 10 slides.
- [Offline demo video](docs/submission/Fix-the-Report-Demo.webm): 120 seconds, silent; real interactions in the demo build.
- [Demo script](docs/submission/DEMO_SCRIPT.md): timed actions, narration and fallback references.
- [Release check](docs/submission/RELEASE_CHECK.md): fresh clean-clone verification of frozen source `01302ea`, with **242 unit tests and 72 Chromium tests passing in each build mode**, plus TypeScript and production builds. These are recorded release results, not a new test run for this documentation edit; Firefox/WebKit and a physical phone were not tested.
