export type Copy = { en: string; ru: string };
export type SkillId = "revenue" | "conversion" | "decisions";
export type Row = (string | number)[];
export type Choice = { id: string; label: Copy };
export type Lesson = {
  id: string;
  skill: SkillId;
  kind: "formula" | "decision";
  level: "foundation" | "practice";
  title: Copy;
  summary: Copy;
  brief: Copy;
  company: string;
  minutes: number;
  objective: Copy;
  columns: Copy[];
  rows: Row[];
  editableColumns: number[];
  initialFormula: string;
  format: "money" | "percent" | "text";
  diagnosis: Choice[];
  correctDiagnosis: string;
  explanation: Copy;
  hints: [Copy, Copy, Copy];
  solution: string;
  transfer: {
    prompt: Copy;
    options: Choice[];
    correct: string;
    explanation: Copy;
  };
  decisionOptions?: Choice[];
  correctDecision?: string;
};
export type HintLevel = 0 | 1 | 2 | 3;
export type LessonDraft = {
  attempt: number;
  hintLevel: HintLevel;
  rows: Row[];
  formula: string;
  diagnosis: string;
  decision: string;
  transfer: string;
  step: 0 | 1 | 2;
};
export type LessonInput = Omit<LessonDraft, "step" | "attempt"> & { lessonId: string };
export type LessonResult = {
  hintLevel: HintLevel;
  solutionRevealed: boolean;
  lessonId: string;
  score: number;
  breakdown?: { diagnosis: number; repair: number; transfer: number };
  diagnosisPassed: boolean;
  repairPassed: boolean;
  transferPassed: boolean;
  checks: { label: Copy; passed: boolean; expected: string; actual: string }[];
  at: string;
  snapshot?: LessonInput;
};
export type LearningState = {
  version: 2;
  results: LessonResult[];
  drafts: Record<string, LessonDraft>;
  attempts: Record<string, number>;
  goal: SkillId | "all";
};
export const LEARNING_KEY = "fix-the-report.learning.v2";
const c = (en: string, ru: string): Copy => ({ en, ru });
const option = (id: string, en: string, ru: string): Choice => ({ id, label: c(en, ru) });
export const SKILLS: { id: SkillId; title: Copy; description: Copy }[] = [
  { id: "revenue", title: c("Revenue", "Выручка"), description: c("See which money belongs in the report.", "Разберись, какие деньги учитывать в отчёте.") },
  { id: "conversion", title: c("Conversion", "Конверсия"), description: c("Find the story behind a percentage.", "Пойми, что на самом деле стоит за процентами.") },
  { id: "decisions", title: c("Decisions", "Решения"), description: c("Turn the numbers into a sensible next step.", "Принимай решения на основе данных.") },
];
const orderColumns = [c("Order", "Заказ"), c("Status", "Статус"), c("Amount, $", "Сумма, $")];
const conversionColumns = [c("Channel", "Канал"), c("Leads", "Лиды"), c("Sales", "Продажи"), c("Conversion", "Конверсия")];
const decisionColumns = [c("Channel", "Канал"), c("Revenue, $", "Выручка, $"), c("Ad spend, $", "Расходы, $"), c("Sales", "Продажи")];
const decisionOptions = [option("email", "Run a small Email test", "Небольшой тест рассылки"), option("ads", "Run a small Ads test", "Небольшой тест рекламы"), option("hold", "Keep the budget on hold", "Пока не увеличивать бюджет")];

export const LESSONS: Lesson[] = [
  {
    id: "revenue-cancelled", skill: "revenue", kind: "formula", level: "foundation",
    title: c("The money that never arrived", "Деньги, которых не было"),
    summary: c("An online store reports a record week. Something doesn't add up.", "Магазин отчитался о рекордной неделе. Но что-то не сходится."),
    company: "MONO STORE", minutes: 7,
    brief: c("You are helping Mono Store close the week. The report adds every order to revenue, including cancellations and unpaid orders. Revenue here means the sum of Paid orders only. Repair the formula so it also handles new orders through row 101. If nothing was paid, revenue is $0.", "Ты помогаешь Mono Store подвести итоги недели. Отчёт складывает все заказы, включая отменённые и ещё не оплаченные. В этом задании выручка — сумма только заказов Paid. Исправь формулу с учётом новых заказов до строки 101. Если оплат нет, выручка равна $0."),
    objective: c("Count only money actually paid.", "Учти только оплаченные заказы."),
    columns: orderColumns, rows: [["M-101", "Paid", 480], ["M-102", "Paid", 320], ["M-103", "Cancelled", 650], ["M-104", "Paid", 400], ["M-105", "Pending", 180]], editableColumns: [2],
    initialFormula: "=SUM(C2:C101)", format: "money",
    diagnosis: [option("status", "Order status is ignored", "Не учитывается статус заказа"), option("average", "We should use the average order value", "Нужно взять среднюю сумму заказа"), option("rounding", "The total needs rounding", "Нужно округлить итог")],
    correctDiagnosis: "status",
    explanation: c("SUM includes cancelled and pending orders. Filter for Paid first, then add the amounts. Changing a cancelled order must never change paid revenue.", "SUM учитывает и отменённые, и ожидающие оплаты заказы. Сначала отбирай Paid, затем складывай суммы. Изменение отменённого заказа не должно менять выручку."),
    hints: [
      c("First keep only paid orders, then add their amounts.", "Сначала отбери оплаченные заказы, затем сложи их суммы."),
      c("SUMIF takes a condition range, a condition and an amount range. Status is in B, amount in C.", "SUMIF принимает диапазон условия, условие и диапазон сумм. Статус находится в B, сумма — в C."),
      c('SUMIF checks a condition before adding. The status is in B and the amount in C. Try =SUMIF(B2:B101,"Paid",C2:C101).', 'SUMIF складывает суммы по условию. Статус находится в B, сумма — в C. Попробуй =SUMIF(B2:B101,"Paid",C2:C101).'),
    ],
    solution: '=SUMIF(B2:B101,"Paid",C2:C101)',
    transfer: {
      prompt: c("A different store has $900 in Paid orders, $250 in Cancelled orders and $100 in Pending orders. What revenue should it report?", "У другого магазина $900 оплаченных заказов, $250 отменённых и $100 ожидающих оплаты. Какую выручку он должен указать?"),
      options: [option("900", "$900", "$900"), option("1150", "$1,150", "$1 150"), option("1250", "$1,250", "$1 250"), option("650", "$650", "$650")], correct: "900",
      explanation: c("Only the $900 actually paid counts. Both cancelled and pending orders are excluded.", "Учитываются только оплаченные $900. Отменённые и ожидающие оплаты заказы исключаются."),
    },
  },
  {
    id: "conversion-weighted", skill: "conversion", kind: "formula", level: "foundation",
    title: c("The average that lies", "Среднее, которое обманывает"),
    summary: c("Two channels. Two percentages. One misleading result.", "Два канала. Два процента. Один неверный вывод."),
    company: "BLOOM ACADEMY", minutes: 8,
    brief: c("Bloom Academy averages the conversion rates of two campaigns and reports 30%. But the campaigns reached very different numbers of leads. Overall conversion means all sales divided by all leads. Return a fraction (0.10 is 10%), support new channels through row 101, and return the text N/A when there are no leads.", "Bloom Academy усредняет конверсии двух кампаний и получает 30%. Но число лидов у них сильно различается. Общая конверсия — все продажи, делённые на всех лидов. Формула должна возвращать долю (0.10 — это 10%), учитывать новые каналы до строки 101 и возвращать текст N/A, если лидов нет."),
    objective: c("Calculate the conversion for all leads together.", "Посчитай конверсию по всем лидам вместе."),
    columns: conversionColumns, rows: [["Email", 10, 5, 0.5], ["Ads", 100, 10, 0.1]], editableColumns: [1, 2],
    initialFormula: "=AVERAGE(D2:D3)", format: "percent",
    diagnosis: [option("rounding", "The percentages need more decimal places", "Нужны более точные проценты"), option("weight", "The small channel has too much weight", "Маленький канал получает слишком большой вес"), option("best", "Only the best channel should count", "Нужно учитывать только лучший канал")], correctDiagnosis: "weight",
    explanation: c("A simple average treats 10 leads and 100 leads as equally important. Add sales first and divide by total leads: 15 / 110 = 13.64%.", "Обычное среднее придаёт одинаковый вес 10 и 100 лидам. Сложи продажи и раздели на всех лидов: 15 / 110 = 13,64%."),
    hints: [
      c("Combine the underlying sales and leads rather than averaging the channel percentages.", "Сложи продажи и лиды по всем каналам вместо усреднения процентов."),
      c("Divide SUM of column C by SUM of column B. Use IF for zero leads and include rows through 101.", "Раздели SUM столбца C на SUM столбца B. Используй IF для нулевого числа лидов и включи строки до 101."),
      c('Add column C, divide by column B. Guard against zero leads: =IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101)).', 'Раздели сумму C на сумму B. Учти отсутствие лидов: =IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101)).'),
    ],
    solution: '=IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101))',
    transfer: { prompt: c("A new campaign has 20 leads and 10 sales. Another has 180 leads and 18 sales. What is the combined conversion?", "У новой кампании 20 лидов и 10 продаж. У второй — 180 лидов и 18 продаж. Какова общая конверсия?"), options: [option("30", "30%", "30%"), option("14", "14%", "14%"), option("50", "50%", "50%"), option("15.56", "15.56%", "15,56%")], correct: "14", explanation: c("There are 28 sales from 200 leads. 28 / 200 = 14%, not the average of 50% and 10%.", "Всего 28 продаж на 200 лидов. 28 / 200 = 14%, а не среднее от 50% и 10%."), },
  },
  {
    id: "decisions-return", skill: "decisions", kind: "decision", level: "foundation",
    title: c("More sales. Less value.", "Больше продаж. Меньше пользы."),
    summary: c("The busiest channel wants more budget. Does it deserve it?", "Самый активный канал просит больше бюджета. Стоит ли его давать?"),
    company: "NORTH STUDIO", minutes: 6,
    brief: c("North Studio wants to choose one channel for a small advertising test. Compare contribution per advertising dollar: (revenue − ad spend) / ad spend. Use the channel with the higher positive ratio. If neither is positive, the ratios tie, or a channel has zero spend, do not choose that channel on this evidence. This simplified exercise excludes other business costs. One week cannot promise future returns.", "North Studio выбирает канал для небольшого рекламного теста. Сравни вклад на доллар расходов: (выручка − расходы) / расходы. Выбери канал с более высоким положительным значением. Если положительных значений нет или они равны — сохрани бюджет. Канал с нулевыми расходами сравнить этим способом нельзя. Другие расходы бизнеса в этой учебной модели не учитываются. Одна неделя не гарантирует будущий результат."),
    objective: c("Choose a small test using return, not sales volume.", "Выбери небольшой тест по отдаче, а не числу продаж."),
    columns: decisionColumns, rows: [["Email", 1400, 400, 14], ["Ads", 2400, 1800, 30]], editableColumns: [1, 2, 3], initialFormula: "", format: "text",
    diagnosis: [option("volume", "More sales do not mean better return", "Больше продаж не означает лучшую отдачу"), option("all", "Revenue alone is enough to choose", "Для выбора достаточно выручки"), option("guaranteed", "Last week's winner will always win", "Лидер прошлой недели всегда будет лучшим")], correctDiagnosis: "volume",
    explanation: c("Email produces $1,000 of contribution on $400 spend: $2.50 per dollar. Ads produces $600 on $1,800: $0.33. Email is the better small test on this evidence; the result is not a guarantee.", "Рассылка даёт вклад $1 000 при расходах $400: $2,50 на доллар. Реклама даёт $600 при расходах $1 800: $0,33. По этим данным рассылка лучше подходит для небольшого теста, но это не гарантия."),
    hints: [
      c("Compare the contribution from the same amount of spending, not the total sales volume.", "Сравни вклад на одинаковую сумму расходов, а не общее число продаж."),
      c("For each channel calculate (revenue − spend) / spend. Compare positive ratios and consider a tie.", "Для каждого канала вычисли (выручка − расходы) / расходы. Сравни положительные значения и проверь, нет ли ничьей."),
      c("In the original rows the ratios are (1400 − 400) / 400 = 2.5 and (2400 − 1800) / 1800 ≈ 0.33. Apply the brief’s rule to those values.", "В исходных строках значения равны (1400 − 400) / 400 = 2,5 и (2400 − 1800) / 1800 ≈ 0,33. Примени к ним правило из условия."),
    ],
    solution: "email", decisionOptions, correctDecision: "email",
    transfer: { prompt: c("Next week Email brings $900 on $600 spend. Ads brings $1,200 on $400 spend. Which channel deserves a small test now?", "На следующей неделе рассылка приносит $900 при расходах $600, а реклама — $1 200 при расходах $400. Какой канал теперь стоит протестировать?"), options: [option("email", "Email, because it won before", "Рассылку, ведь раньше она была лучше"), option("ads", "Ads, with $2 contribution per dollar", "Рекламу: вклад $2 на доллар расходов"), option("all", "Both are guaranteed to scale", "Оба гарантированно можно масштабировать"), option("split", "Split extra budget equally: both contributions are positive", "Разделить прибавку поровну: вклад обоих каналов положительный")], correct: "ads", explanation: c("The evidence changed. Email now returns $0.50 contribution per dollar, Ads $2. A previous winner need not stay the best choice.", "Данные изменились. Вклад рассылки теперь $0,50 на доллар, рекламы — $2. Прошлый лидер не обязательно остаётся лучшим выбором."), },
  },
  {
    id: "revenue-refunds", skill: "revenue", kind: "formula", level: "practice",
    title: c("Paid doesn't mean kept", "Оплачено — ещё не заработано"),
    summary: c("Payments look healthy. Returns tell a different story.", "Оплаты выглядят хорошо. Возвраты меняют картину."),
    company: "MONO STORE", minutes: 8,
    brief: c("Mono Store already excludes unpaid orders. Now customers have received partial refunds. For this report, net revenue is the amount of Paid orders minus refunds on those same Paid orders. Ignore every other status. Include future rows through 101 and return $0 if there are no paid orders.", "Mono Store уже исключает неоплаченные заказы. Но часть покупателей получила возвраты. В этом отчёте чистая выручка — суммы заказов Paid за вычетом возвратов по этим же заказам. Остальные статусы не учитывай. Учти будущие строки до 101. Если оплаченных заказов нет, верни $0."),
    objective: c("Keep the status filter and account for refunds.", "Сохрани фильтр по статусу и учти возвраты."),
    columns: [...orderColumns, c("Refund, $", "Возврат, $")], rows: [["M-201", "Paid", 500, 100], ["M-202", "Paid", 350, 0], ["M-203", "Cancelled", 900, 300], ["M-204", "Paid", 250, 250], ["M-205", "Pending", 150, 0]], editableColumns: [2, 3],
    initialFormula: '=SUMIF(B2:B101,"Paid",C2:C101)', format: "money",
    diagnosis: [option("refund", "Paid amounts still include refunded money", "Суммы оплат включают возвращённые деньги"), option("cancelled", "Cancelled orders should be counted too", "Нужно учитывать и отменённые заказы"), option("count", "We should count orders instead of money", "Нужно считать заказы, а не деньги")], correctDiagnosis: "refund",
    explanation: c("Apply the same Paid filter to both amounts and refunds, then subtract. Subtracting every refund would also deduct money from excluded orders.", "Отфильтруй Paid и для сумм, и для возвратов, затем вычти одно из другого. Если вычесть все возвраты, в расчёт попадут и исключённые заказы."),
    hints: [
      c("Only paid orders contribute revenue. Subtract refunds only for those same orders.", "Выручку дают только оплаченные заказы. Вычти возвраты только по этим же заказам."),
      c("Use one SUMIF for paid amounts in C and a second SUMIF for their refunds in D. Subtract the second total.", "Используй один SUMIF для оплаченных сумм в C и второй для возвратов по ним в D. Вычти второй итог из первого."),
      c('Use two SUMIF expressions: =SUMIF(B2:B101,"Paid",C2:C101)-SUMIF(B2:B101,"Paid",D2:D101).', 'Используй два SUMIF: =SUMIF(B2:B101,"Paid",C2:C101)-SUMIF(B2:B101,"Paid",D2:D101).'),
    ],
    solution: '=SUMIF(B2:B101,"Paid",C2:C101)-SUMIF(B2:B101,"Paid",D2:D101)',
    transfer: { prompt: c("Paid orders total $1,000 with $200 refunded. A cancelled order shows $500 and a $100 refund. What is net revenue under this report's rule?", "Оплаченные заказы: $1 000, возвраты по ним: $200. Отменённый заказ: $500 с возвратом $100. Какова чистая выручка по правилу этого отчёта?"), options: [option("800", "$800", "$800"), option("700", "$700", "$700"), option("1200", "$1,200", "$1 200"), option("1000", "$1,000", "$1 000")], correct: "800", explanation: c("$1,000 − $200 = $800. The cancelled order and its refund are both outside this metric.", "$1 000 − $200 = $800. Отменённый заказ и возврат по нему не входят в этот показатель."), },
  },
  {
    id: "conversion-growth", skill: "conversion", kind: "formula", level: "practice",
    title: c("The channel nobody counted", "Канал, который забыли"),
    summary: c("A new source of leads appeared. The old formula didn't notice.", "Появился новый источник лидов. Старая формула его не заметила."),
    company: "BLOOM ACADEMY", minutes: 7,
    brief: c("Bloom Academy launched a referral program. The report still counts only the first two channels. Calculate sales divided by leads across every channel, including future rows through 101. Return a fraction, or the text N/A when total leads are zero. A channel with no leads must also have no sales.", "Bloom Academy запустила реферальную программу, а отчёт по-прежнему учитывает только два первых канала. Раздели все продажи на всех лидов с учётом будущих строк до 101. Верни долю или текст N/A, если лидов нет. У канала без лидов не может быть продаж."),
    objective: c("Build a formula that grows with the report.", "Сделай формулу, которая учитывает рост отчёта."),
    columns: conversionColumns, rows: [["Email", 50, 5, 0.1], ["Ads", 150, 15, 0.1], ["Referral", 40, 20, 0.5]], editableColumns: [1, 2],
    initialFormula: "=SUM(C2:C3)/SUM(B2:B3)", format: "percent",
    diagnosis: [option("range", "The formula misses the new channel", "Формула не захватывает новый канал"), option("remove", "Referral leads should be removed", "Реферальные лиды нужно удалить"), option("average", "The three percentages need averaging", "Нужно усреднить три процента")], correctDiagnosis: "range",
    explanation: c("A formula can be mathematically correct and still reference incomplete data. Include all channels in both numerator and denominator, and handle an empty report explicitly.", "Формула может быть математически верной, но брать неполные данные. Включи все каналы и в числитель, и в знаменатель, а пустой отчёт обработай отдельно."),
    hints: [
      c("A correct calculation can still miss data. Check which rows both ranges include.", "Даже правильное вычисление может пропускать данные. Проверь строки обоих диапазонов."),
      c("Sum all sales in C and all leads in B through row 101. Use IF to return N/A when the lead total is zero.", "Сложи все продажи в C и всех лидов в B до строки 101. Через IF верни N/A, если сумма лидов равна нулю."),
      c('Extend both ranges to row 101 and add the zero-lead rule: =IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101)).', 'Расширь оба диапазона до 101-й строки и учти отсутствие лидов: =IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101)).'),
    ],
    solution: '=IF(SUM(B2:B101)=0,"N/A",SUM(C2:C101)/SUM(B2:B101))',
    transfer: { prompt: c("A new week's report contains three channels, all with zero leads and zero sales. What should overall conversion show?", "В отчёте за новую неделю три канала, у каждого ноль лидов и ноль продаж. Что должна показывать общая конверсия?"), options: [option("zero", "0%: no one converted", "0%: никто не купил"), option("na", "N/A: there is no denominator", "N/A: нет знаменателя"), option("last", "Last week's conversion", "Конверсию прошлой недели"), option("100", "100%: there are no unconverted leads", "100%: нет лидов, которые не купили")], correct: "na", explanation: c("Zero sales with some leads is 0%. Zero leads leaves conversion undefined, so the agreed report rule is N/A.", "Ноль продаж при наличии лидов — это 0%. При отсутствии лидов конверсия не определена, поэтому по условию показываем N/A."), },
  },
  {
    id: "decisions-hold", skill: "decisions", kind: "decision", level: "practice",
    title: c("When the best move is to wait", "Когда лучше не спешить"),
    summary: c("There is budget left. That doesn't mean it should be spent.", "Бюджет остался. Но это ещё не повод его тратить."),
    company: "NORTH STUDIO", minutes: 6,
    brief: c("Both channels want a larger budget. Compare (revenue − ad spend) / ad spend and choose a small test only for the higher positive ratio. Hold the budget if neither ratio is positive or they tie. A zero-spend channel cannot be compared using this ratio. Other business costs are excluded from this training example.", "Оба канала просят больше бюджета. Сравни (выручка − расходы) / расходы и выбери небольшой тест только для более высокого положительного значения. Если положительных значений нет или они равны, сохрани бюджет. Канал с нулевыми расходами нельзя сравнить этим способом. Прочие расходы бизнеса в учебном примере не учитываются."),
    objective: c("Recognize when the data doesn't support more spend.", "Заметь, когда данные не оправдывают новые расходы."),
    columns: decisionColumns, rows: [["Email", 800, 1000, 8], ["Ads", 1600, 2000, 20]], editableColumns: [1, 2, 3], initialFormula: "", format: "text",
    diagnosis: [option("negative", "Both channels spend more than they bring in", "Оба канала тратят больше, чем приносят"), option("biggest", "The larger channel must be the winner", "Крупнейший канал обязательно лучше"), option("budget", "Unused budget is always a mistake", "Неиспользованный бюджет — всегда ошибка")], correctDiagnosis: "negative",
    explanation: c("Both ratios are −0.20. Spending more on either would scale a negative contribution under this simplified model. Hold the increase and investigate the causes before testing again.", "Оба значения равны −0,20. В этой упрощённой модели увеличение расходов усилит отрицательный вклад. Сохрани бюджет и разберись с причинами перед новым тестом."),
    hints: [
      c("Compare revenue with spend before increasing the budget.", "Перед увеличением бюджета сравни выручку с расходами."),
      c("Calculate (revenue − spend) / spend for each row. Check whether a uniquely higher positive ratio exists.", "Вычисли (выручка − расходы) / расходы для каждой строки. Проверь, есть ли единственное лучшее положительное значение."),
      c("In the original rows: (800 − 1000) / 1000 = −0.2 and (1600 − 2000) / 2000 = −0.2. Apply the brief’s rule for equal or nonpositive ratios.", "В исходных строках: (800 − 1000) / 1000 = −0,2 и (1600 − 2000) / 2000 = −0,2. Примени правило из условия для равных или неположительных значений."),
    ],
    solution: "hold", decisionOptions, correctDecision: "hold",
    transfer: { prompt: c("After costs improve, Email brings $1,500 on $500 spend. Ads brings $1,800 on $600. Both ratios are 2.0. What should you do under the agreed rule?", "После снижения расходов рассылка приносит $1 500 при расходах $500, реклама — $1 800 при расходах $600. Оба значения равны 2,0. Что делать по принятому правилу?"), options: [option("ads", "Choose Ads because revenue is larger", "Выбрать рекламу: у неё больше выручка"), option("hold", "Hold: the ratio doesn't distinguish a winner", "Сохранить бюджет: показатель не выделяет победителя"), option("email", "Choose Email because it costs less", "Выбрать рассылку: она дешевле"), option("split", "Split the budget increase equally because the ratios match", "Разделить увеличение бюджета поровну, ведь показатели равны")], correct: "hold", explanation: c("The ratios tie. The rule calls for holding the increase, because this single metric cannot select a unique winner. More evidence could support a later decision.", "Значения равны. По правилу увеличение бюджета откладывается: один показатель не позволяет выбрать победителя. Дополнительные данные помогут принять решение позже."), },
  },
];

export function getLesson(id: string): Lesson {
  const lesson = LESSONS.find((item) => item.id === id);
  if (!lesson) throw new Error("Unknown lesson.");
  return lesson;
}

export function initialDraft(lessonId: string, attempt = 1): LessonDraft {
  const lesson = getLesson(lessonId);
  return { rows: lesson.rows.map((row) => [...row]), formula: lesson.initialFormula, diagnosis: "", decision: "", transfer: "", step: 0, hintLevel: 0, attempt };
}

export function initialLearning(): LearningState {
  return { version: 2, results: [], drafts: {}, attempts: {}, goal: "all" };
}

export function nextLessonAttempt(state: LearningState, lessonId: string): number {
  return Math.max(state.attempts[lessonId] ?? 0, state.results.filter(result => result.lessonId === lessonId).length) + 1;
}

export function saveLessonDraft(state: LearningState, lessonId: string, draft: LessonDraft): LearningState {
  return {
    ...state,
    drafts: { ...state.drafts, [lessonId]: draft },
    attempts: { ...state.attempts, [lessonId]: Math.max(state.attempts[lessonId] ?? 0, draft.attempt) },
  };
}

export function beginLesson(state: LearningState, lessonId: string): LearningState {
  if (state.drafts[lessonId]) return state;
  return saveLessonDraft(state, lessonId, initialDraft(lessonId, nextLessonAttempt(state, lessonId)));
}

export function normalizeRows(lesson: Lesson, rows: Row[]): Row[] {
  return rows.map((row) => {
    const next = [...row];
    if (lesson.skill === "conversion") next[3] = Number(next[1]) ? Number(next[2]) / Number(next[1]) : "N/A";
    return next;
  });
}

export function parseCellNumber(raw: string):
  | { value: number }
  | { error: "ambiguous" | "invalid" } {
  const compact = raw.trim().replace(/[ \u00a0\u202f]/g, "");
  if (/^\d+[,.]\d{3}$/.test(compact)) return { error: "ambiguous" };
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(compact)) return { error: "invalid" };
  const value = Number(compact.replace(",", "."));
  return Number.isFinite(value) ? { value } : { error: "invalid" };
}

export function validateLessonRows(lesson: Lesson, rows: Row[]): string | null {
  if (!Array.isArray(rows) || rows.length > 100) return "Use up to 100 data rows.";
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== lesson.columns.length || typeof row[0] !== "string" || !row[0] || row[0].length > 80) return "Check the report's row structure.";
    for (const index of lesson.editableColumns) {
      if (typeof row[index] === "string") {
        const parsed = parseCellNumber(row[index] as string);
        if ("error" in parsed && parsed.error === "ambiguous") {
          return "Enter a number without a thousands separator, for example 1000.";
        }
      }
      if (typeof row[index] !== "number" || !Number.isFinite(row[index]) || Number(row[index]) < 0 || Number(row[index]) > 1_000_000) return "Enter numbers from 0 to 1,000,000.";
      if (lesson.skill === "conversion" || (lesson.skill === "decisions" && index === 3)) {
        if (!Number.isInteger(row[index])) return "Leads and sales must be whole numbers.";
      } else if (Math.abs(Number(row[index]) * 100 - Math.round(Number(row[index]) * 100)) > 1e-6) return "Use no more than two decimal places for money.";
    }
    if (lesson.skill === "revenue" && !["Paid", "Cancelled", "Pending"].includes(String(row[1]))) return "Choose Paid, Cancelled or Pending for each order.";
    if (lesson.id === "revenue-refunds" && Number(row[3]) > Number(row[2])) return "A refund cannot exceed the order amount.";
    if (lesson.skill === "conversion" && Number(row[2]) > Number(row[1])) return "Sales cannot exceed leads.";
  }
  if (lesson.skill === "decisions" && (rows.length !== 2 || rows[0]?.[0] !== "Email" || rows[1]?.[0] !== "Ads")) return "Keep both Email and Ads in this comparison.";
  return null;
}

export function formatLessonValue(value: number | string | undefined, format: Lesson["format"], language: "en" | "ru" = "en"): string {
  if (value === undefined) return "—";
  if (typeof value !== "number") return value;
  const locale = language === "ru" ? "ru-RU" : "en-US";
  return new Intl.NumberFormat(locale, format === "money" ? { style: "currency", currency: "USD", maximumFractionDigits: 2 } : format === "percent" ? { style: "percent", maximumFractionDigits: 2 } : { maximumFractionDigits: 2 }).format(value);
}

const validCopy = (value: unknown): value is Copy => !!value && typeof value === "object" && typeof (value as Copy).en === "string" && typeof (value as Copy).ru === "string";
const boundedString = (value: unknown, maximum = 1000): value is string => typeof value === "string" && value.length <= maximum;
const validHintLevel = (value: unknown) => value === undefined || value === 0 || value === 1 || value === 2 || value === 3;
function validDraft(lesson: Lesson, value: unknown): value is LessonDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as LessonDraft;
  // Preserve incomplete or inconsistent numeric edits, but never arbitrary structures.
  if (!Array.isArray(draft.rows) || draft.rows.length > 100 || !draft.rows.every((row) => Array.isArray(row) && row.length === lesson.columns.length && row.every((cell) => (typeof cell === "number" && Number.isFinite(cell) && Math.abs(cell) <= 1_000_000) || boundedString(cell, 80)))) return false;
  return (draft.attempt === undefined || (Number.isSafeInteger(draft.attempt) && draft.attempt > 0)) && validHintLevel(draft.hintLevel) && [0, 1, 2].includes(draft.step) && boundedString(draft.formula) && boundedString(draft.diagnosis, 80) && boundedString(draft.decision, 80) && boundedString(draft.transfer, 80);
}

export function restoreLearning(raw: string | null): LearningState {
  try {
    if (!raw) return initialLearning();
    const state = JSON.parse(raw) as LearningState;
    if (!state || state.version !== 2 || !["all", ...SKILLS.map((skill) => skill.id)].includes(state.goal) || !Array.isArray(state.results) || state.results.length > 500 || !state.drafts || typeof state.drafts !== "object" || Array.isArray(state.drafts)) return initialLearning();
    const drafts: Record<string, LessonDraft> = {};
    for (const lesson of LESSONS) {
      if (state.drafts[lesson.id] && validDraft(lesson, state.drafts[lesson.id])) drafts[lesson.id] = { ...state.drafts[lesson.id], hintLevel: state.drafts[lesson.id].hintLevel ?? 0 };
    }
    const results = state.results.filter((result) => {
      if (!result || !LESSONS.some((lesson) => lesson.id === result.lessonId) || !Number.isInteger(result.score) || result.score < 0 || result.score > 100 || ![result.diagnosisPassed, result.repairPassed, result.transferPassed].every((v) => typeof v === "boolean") || !boundedString(result.at, 40) || !Number.isFinite(Date.parse(result.at)) || !Array.isArray(result.checks) || result.checks.length > 30) return false;
      if (!result.checks.every((check) => check && validCopy(check.label) && typeof check.passed === "boolean" && boundedString(check.expected, 200) && boundedString(check.actual, 1500))) return false;
      if (result.breakdown !== undefined) {
        const breakdown = result.breakdown;
        if (!breakdown || !Number.isInteger(breakdown.diagnosis) || breakdown.diagnosis < 0 || breakdown.diagnosis > 20 || !Number.isInteger(breakdown.repair) || breakdown.repair < 0 || breakdown.repair > 50 || !Number.isInteger(breakdown.transfer) || breakdown.transfer < 0 || breakdown.transfer > 30 || breakdown.diagnosis + breakdown.repair + breakdown.transfer !== result.score) return false;
      }
      if (!validHintLevel(result.hintLevel)) return false;
      if (result.solutionRevealed !== undefined && result.solutionRevealed !== ((result.hintLevel ?? 0) === 3)) return false;
      if (result.snapshot && (result.snapshot.lessonId !== result.lessonId || !validDraft(getLesson(result.lessonId), { ...result.snapshot, step: 2 }))) return false;
      return true;
    }).map((result) => ({
      ...result,
      hintLevel: result.hintLevel ?? 0,
      solutionRevealed: result.solutionRevealed ?? result.hintLevel === 3,
      ...(result.snapshot ? { snapshot: { ...result.snapshot, hintLevel: result.snapshot.hintLevel ?? 0 } } : {}),
    }));
    const attempts: Record<string, number> = {};
    for (const lesson of LESSONS) {
      const saved = state.attempts?.[lesson.id];
      if (Number.isSafeInteger(saved) && saved >= 0) attempts[lesson.id] = saved;
      else if (state.attempts === undefined) attempts[lesson.id] = results.filter(result => result.lessonId === lesson.id).length;
      if (drafts[lesson.id]) {
        const draft = drafts[lesson.id];
        draft.attempt ??= Math.max(attempts[lesson.id] ?? 0, results.filter(result => result.lessonId === lesson.id).length) + 1;
        attempts[lesson.id] = Math.max(attempts[lesson.id] ?? 0, draft.attempt);
      }
    }
    return { version: 2, goal: state.goal, drafts, attempts, results };
  } catch { return initialLearning(); }
}

export function isLessonComplete(result: LessonResult): boolean {
  return !result.solutionRevealed && result.repairPassed && result.transferPassed && result.score >= 80;
}

export function shuffleOptions<T>(options: readonly T[], seed: string): T[] {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state = Math.imul(state ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function recommendLesson(state: LearningState): { lessonId: string; reason: Copy } {
  const pool = LESSONS.filter((lesson) => state.goal === "all" || lesson.skill === state.goal);
  const latestByLesson = new Map(state.results.map((result) => [result.lessonId, result]));
  const latest = state.results.at(-1);
  if (latest && !isLessonComplete(latest)) {
    const skill = getLesson(latest.lessonId).skill;
    if (state.goal === "all" || state.goal === skill) {
      const related = pool.find((lesson) => lesson.skill === skill && lesson.id !== latest.lessonId && (!latestByLesson.has(lesson.id) || !isLessonComplete(latestByLesson.get(lesson.id)!)));
      return { lessonId: related?.id ?? latest.lessonId, reason: related ? c("Based on your last attempt: practise this skill with a different example.", "По последней попытке: закрепи этот навык на другом примере.") : c("Revisit this case and focus on the checks that didn't pass.", "Вернись к этому кейсу и разбери непройденные проверки.") };
    }
  }
  const next = pool.find((lesson) => !latestByLesson.has(lesson.id));
  if (next) return { lessonId: next.id, reason: state.results.length ? c("Your next step: apply the skill in a new situation.", "Следующий шаг — примени навык в новой ситуации.") : c("A short first case to see how you work with data.", "Короткий первый кейс, чтобы попробовать работу с данными.") };
  const weakest = [...pool].sort((a, b) => (latestByLesson.get(a.id)?.score ?? 0) - (latestByLesson.get(b.id)?.score ?? 0))[0];
  const allPerfect = pool.every((lesson) => latestByLesson.get(lesson.id)?.score === 100);
  return { lessonId: weakest.id, reason: allPerfect ? c("You've completed this path. Revisit a case to keep the skill fresh.", "Этот путь пройден. Повтори кейс, чтобы закрепить навык.") : c("Revisit the skill with the most room to improve.", "Вернись к навыку, в котором ещё есть пространство для роста.") };
}
