import { useEffect, useState } from "react";
import { ArrowRight, Plus, Pencil, CalendarClock } from "lucide-react";
import { getDashboardSummary } from "../utils/dashboard";
import {
  projectUpcoming,
  toDateString,
  type RecurringTransaction,
} from "../utils/recurring";
import { parseDateOnly } from "../utils/helpers";

interface Entry extends RecurringTransaction {
  id: string;
}
interface Goal {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  color: string;
}
interface Props<T extends Entry> {
  transactions: T[];
  budget: number;
  categories: { name: string; budget: number; color: string }[];
  goals: Goal[];
  currencySymbol: string;
  name?: string | null;
  loading: boolean;
  onAdd: () => void;
  onEdit: (transaction: T) => void;
  onNavigate: (tab: string) => void;
}

export default function Dashboard<T extends Entry>({
  transactions,
  budget,
  categories,
  goals,
  currencySymbol,
  name,
  loading,
  onAdd,
  onEdit,
  onNavigate,
}: Props<T>) {
  const [today, setToday] = useState(() => toDateString(new Date()));
  useEffect(() => {
    const update = () => setToday(toDateString(new Date()));
    const timer = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);
  const now = parseDateOnly(today);
  const summary = getDashboardSummary(transactions, budget, now);
  const money = (n: number) =>
    `${n < 0 ? "-" : ""}${currencySymbol}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const date = (value: string) =>
    parseDateOnly(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  const upcoming = projectUpcoming(
    transactions,
    today,
    toDateString(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30),
    ),
  ).filter((t) => t.type === "expense");
  const weekEnd = toDateString(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
  );
  const nextWeekTotal = upcoming
    .filter((t) => t.date <= weekEnd)
    .reduce((sum, t) => sum + t.amount, 0);
  const alerts = categories
    .map((category) => ({
      ...category,
      spent: summary.current
        .filter((t) => t.type === "expense" && t.category === category.name)
        .reduce((n, t) => n + t.amount, 0),
    }))
    .filter((c) => c.budget > 0 && c.spent / c.budget >= 0.8)
    .sort((a, b) => b.spent / b.budget - a.spent / a.budget);
  const recent = [...transactions]
    .filter((t) => t.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const panel =
    "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800";
  const muted = "text-sm text-slate-500 dark:text-slate-400";
  const link =
    "inline-flex items-center gap-1 rounded-lg text-sm font-medium text-indigo-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-300";
  const difference = summary.expenses - summary.previousExpenses;

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
            Your monthly overview
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {name ? `${name.split(" ")[0]}'s dashboard` : "Your dashboard"}
          </h2>
          <p className={`${muted} mt-1`}>
            {now.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}{" "}
            · Recorded through {date(today)}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={18} />
          Add transaction
        </button>
      </header>
      {loading ? (
        <div className={`${panel} animate-pulse`} role="status">
          Loading your dashboard…
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <section
              className={`${panel} lg:col-span-2`}
              aria-labelledby="dashboard-budget"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 id="dashboard-budget" className="font-semibold">
                  Monthly budget
                </h3>
                <button className={link} onClick={() => onNavigate("settings")}>
                  Manage <ArrowRight size={14} />
                </button>
              </div>
              <p className={`${muted} mt-5`}>
                {budget <= 0
                  ? "No monthly budget set"
                  : summary.budgetRemaining < 0
                    ? "Over budget"
                    : "Budget remaining"}
              </p>
              <p
                className={`mt-1 break-words text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl ${summary.budgetRemaining < 0 && budget > 0 ? "text-red-600 dark:text-red-400" : ""}`}
              >
                {budget > 0 ? money(Math.abs(summary.budgetRemaining)) : "—"}
              </p>
              {summary.percent !== null ? (
                <>
                  <div
                    role="progressbar"
                    aria-label="Monthly budget used"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, summary.percent)}
                    aria-valuetext={`${summary.percent.toFixed(1)}% used`}
                    className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
                  >
                    <div
                      className={`h-full rounded-full ${summary.percent > 100 ? "bg-red-500" : summary.percent >= 80 ? "bg-amber-500" : "bg-indigo-500"}`}
                      style={{ width: `${Math.min(100, summary.percent)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
                    <span>
                      {money(summary.expenses)}{" "}
                      <span className={muted}>of {money(budget)}</span>
                    </span>
                    <strong className="tabular-nums">
                      {summary.percent.toFixed(1)}% used
                    </strong>
                  </div>
                </>
              ) : (
                <p className={`${muted} mt-4`}>
                  Set a budget to see progress and a daily allowance.
                </p>
              )}
              <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-700">
                <p className="text-sm font-medium">
                  {summary.previousExpenses > 0
                    ? `${money(Math.abs(difference))} ${difference > 0 ? "more" : difference < 0 ? "less" : "difference"} in spending vs last month`
                    : "No spending recorded for the comparison period"}
                </p>
                <p className={`${muted} mt-1`}>
                  Compares the 1st through {date(today)} with the 1st through{" "}
                  {date(summary.previousEnd)} using recorded expenses.
                </p>
              </div>
            </section>
            <section
              className={`${panel} flex flex-col justify-between`}
              aria-labelledby="dashboard-allowance"
            >
              <div>
                <h3 id="dashboard-allowance" className="font-semibold">
                  Daily budget allowance
                </h3>
                <p className="mt-5 break-words text-3xl font-semibold tabular-nums text-indigo-600 dark:text-indigo-300">
                  {summary.dailyAllowance === null
                    ? "—"
                    : money(summary.dailyAllowance)}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    {" "}
                    / day
                  </span>
                </p>
                <p className={`${muted} mt-2`}>
                  {summary.daysLeft} days left, including today
                </p>
              </div>
              <p className={`${muted} mt-5`}>
                {budget <= 0
                  ? "Add a monthly budget in Settings to get started."
                  : summary.budgetRemaining < 0
                    ? "Your recorded expenses have exceeded this month’s budget."
                    : "Remaining budget divided by days left this month. Upcoming bills are not deducted; this is a planning estimate, not your bank balance."}
              </p>
            </section>
          </div>
          <section
            aria-label="Recorded income and expenses"
            className="grid gap-3 sm:grid-cols-3"
          >
            {[
              {
                label: "Income",
                value: summary.income,
                detail: "Recorded this month",
              },
              {
                label: "Expenses",
                value: summary.expenses,
                detail: "Recorded this month",
              },
              {
                label: "Net income",
                value: summary.netIncome,
                detail:
                  summary.savingsRate === null
                    ? "No income recorded this month"
                    : summary.netIncome < 0
                      ? "Expenses exceed recorded income"
                      : `${summary.savingsRate.toFixed(1)}% of income remaining`,
              },
            ].map((item) => (
              <div key={item.label} className={panel}>
                <p className={muted}>{item.label}</p>
                <p
                  className={`mt-2 break-words text-2xl font-semibold tabular-nums ${item.value < 0 ? "text-red-600 dark:text-red-400" : ""}`}
                >
                  {money(item.value)}
                </p>
                <p className={`${muted} mt-2`}>{item.detail}</p>
              </div>
            ))}
          </section>
          {alerts.length > 0 && (
            <section className={panel} aria-labelledby="dashboard-attention">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="dashboard-attention" className="font-semibold">
                  Needs attention
                </h3>
                <button
                  className={link}
                  onClick={() => onNavigate("analytics")}
                >
                  Review categories <ArrowRight size={14} />
                </button>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {alerts.map((c) => (
                  <li
                    key={c.name}
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30"
                  >
                    <p className="text-sm font-medium">
                      {c.name} · {((c.spent / c.budget) * 100).toFixed(1)}% used
                    </p>
                    <p className={`${muted} mt-1`}>
                      {money(c.spent)} of {money(c.budget)} ·{" "}
                      {c.spent > c.budget
                        ? `${money(c.spent - c.budget)} over`
                        : `${money(c.budget - c.spent)} left`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <section
              className={`${panel} lg:col-span-2`}
              aria-labelledby="dashboard-recent"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 id="dashboard-recent" className="font-semibold">
                  Recent activity
                </h3>
                <button
                  className={link}
                  onClick={() => onNavigate("transactions")}
                >
                  View all <ArrowRight size={14} />
                </button>
              </div>
              <p className={`${muted} mt-1`}>
                Your latest five transactions through today, across all months.
              </p>
              {recent.length ? (
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
                  {recent.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium">
                          {t.description || t.category}
                        </p>
                        <p className={`${muted} mt-1`}>
                          {t.category} · {date(t.date)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-semibold tabular-nums ${t.type === "income" ? "text-emerald-700 dark:text-emerald-400" : ""}`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {money(t.amount)}
                      </span>
                      <button
                        onClick={() => onEdit(t)}
                        aria-label={`Edit ${t.description || t.category} on ${date(t.date)}`}
                        className="shrink-0 rounded-lg p-3 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        <Pencil size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8">
                  <p className={muted}>
                    Your transactions will appear here once you add them.
                  </p>
                  <button className={`${link} mt-3`} onClick={onAdd}>
                    Add your first transaction
                  </button>
                </div>
              )}
            </section>
            <div className="space-y-6">
              <section className={panel} aria-labelledby="dashboard-bills">
                <div className="flex items-center gap-2">
                  <CalendarClock size={18} className="text-indigo-500" />
                  <h3 id="dashboard-bills" className="font-semibold">
                    Upcoming bills
                  </h3>
                </div>
                <p className="mt-4 text-2xl font-semibold tabular-nums">
                  {money(nextWeekTotal)}
                </p>
                <p className={muted}>Scheduled over the next seven days</p>
                {upcoming.length ? (
                  <ul className="mt-4 space-y-4">
                    {upcoming.slice(0, 3).map((bill, index) => (
                      <li
                        key={`${bill.recurringSeriesId}-${bill.date}-${index}`}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="break-words font-medium">
                            {bill.description || bill.category}
                          </p>
                          <p className={`${muted} mt-1`}>{date(bill.date)}</p>
                        </div>
                        <span className="shrink-0 font-medium tabular-nums">
                          {money(bill.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`${muted} mt-4`}>
                    No recurring expenses scheduled in the next 30 days. Mark a
                    transaction as recurring to plan future bills.
                  </p>
                )}
                <p className={`${muted} mt-4`}>
                  Estimates from recurring transactions; amounts may change.
                </p>
                <button
                  className={`${link} mt-4`}
                  onClick={() => onNavigate("analytics")}
                >
                  Open calendar <ArrowRight size={14} />
                </button>
              </section>
              <section className={panel} aria-labelledby="dashboard-goals">
                <div className="flex items-center justify-between gap-2">
                  <h3 id="dashboard-goals" className="font-semibold">
                    Savings goals
                  </h3>
                  <button className={link} onClick={() => onNavigate("goals")}>
                    Manage <ArrowRight size={14} />
                  </button>
                </div>
                {goals.length ? (
                  <ul className="mt-4 space-y-4">
                    {goals.slice(0, 3).map((goal) => (
                      <li key={goal.id}>
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="break-words">{goal.name}</span>
                          <span>
                            {goal.targetAmount > 0
                              ? (
                                  (goal.currentAmount / goal.targetAmount) *
                                  100
                                ).toFixed(0)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${goal.targetAmount > 0 ? Math.max(0, Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)) : 0}%`,
                              backgroundColor: goal.color,
                            }}
                          />
                        </div>
                        <p className={`${muted} mt-2`}>
                          {money(goal.currentAmount)} of{" "}
                          {money(goal.targetAmount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`${muted} mt-4`}>
                    Give your next milestone a name. Create a savings goal to
                    track your progress.
                  </p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
