import { toMinorUnits, fromMinorUnits } from "./helpers";
import { toDateString, type RecurringTransaction } from "./recurring";

export function getDashboardSummary<T extends RecurringTransaction>(
  transactions: T[],
  budget: number,
  now = new Date(),
) {
  const today = toDateString(now);
  const monthStart = toDateString(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const monthEnd = toDateString(
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
  );
  const previousStart = toDateString(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  );
  const previousDay = Math.min(
    now.getDate(),
    new Date(now.getFullYear(), now.getMonth(), 0).getDate(),
  );
  const previousEnd = toDateString(
    new Date(now.getFullYear(), now.getMonth() - 1, previousDay),
  );
  const current = transactions.filter(
    (t) => t.date >= monthStart && t.date <= today,
  );
  const sum = (items: T[], type: "income" | "expense") =>
    fromMinorUnits(
      items
        .filter((t) => t.type === type)
        .reduce((n, t) => n + toMinorUnits(t.amount), 0),
    );
  const income = sum(current, "income");
  const expenses = sum(current, "expense");
  const previousExpenses = sum(
    transactions.filter(
      (t) => t.date >= previousStart && t.date <= previousEnd,
    ),
    "expense",
  );
  const budgetRemaining = fromMinorUnits(
    toMinorUnits(budget) - toMinorUnits(expenses),
  );
  const netIncome = fromMinorUnits(
    toMinorUnits(income) - toMinorUnits(expenses),
  );
  const daysLeft =
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() -
    now.getDate() +
    1;
  return {
    today,
    monthEnd,
    previousEnd,
    current,
    income,
    expenses,
    previousExpenses,
    budgetRemaining,
    netIncome,
    percent: budget > 0 ? (expenses / budget) * 100 : null,
    dailyAllowance: budget > 0 ? Math.max(0, budgetRemaining) / daysLeft : null,
    savingsRate: income > 0 ? (netIncome / income) * 100 : null,
    daysLeft,
  };
}
