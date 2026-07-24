import React, { useMemo } from "react";
import { History, Flame, CheckCircle2, XCircle } from "lucide-react";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
}

export interface BudgetSnapshot {
  month: string; // YYYY-MM
  budgetLimit: number;
}

interface BudgetHistoryCardProps {
  transactions: Transaction[];
  snapshots: BudgetSnapshot[];
  currentBudgetLimit: number;
  darkMode: boolean;
  currencySymbol: string;
}

const BudgetHistoryCard: React.FC<BudgetHistoryCardProps> = ({
  transactions,
  snapshots,
  currentBudgetLimit,
  darkMode,
  currencySymbol,
}) => {
  const textPrimary = darkMode ? "text-white" : "text-gray-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-500";

  const rows = useMemo(() => {
    const snapshotByMonth = new Map(snapshots.map((s) => [s.month, s]));

    // Last 6 complete months, newest first (exclude the in-progress month)
    const months: string[] = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 1; i <= 6; i++) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push(
        `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
      );
    }

    return months.map((month) => {
      const spent = transactions
        .filter((t) => t.type === "expense" && t.date.startsWith(month))
        .reduce((s, t) => s + t.amount, 0);
      const income = transactions
        .filter((t) => t.type === "income" && t.date.startsWith(month))
        .reduce((s, t) => s + t.amount, 0);
      // Prefer the budget as it was that month; fall back to today's budget
      const budget = snapshotByMonth.get(month)?.budgetLimit ?? currentBudgetLimit;
      const hasData = spent > 0 || income > 0;
      return { month, spent, income, budget, under: spent <= budget, hasData };
    });
  }, [transactions, snapshots, currentBudgetLimit]);

  // Streak: consecutive complete months (newest backwards) with data and under budget
  const streak = useMemo(() => {
    let n = 0;
    for (const r of rows) {
      if (!r.hasData) break;
      if (!r.under) break;
      n++;
    }
    return n;
  }, [rows]);

  const monthLabel = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const fmt = (n: number) =>
    `${currencySymbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const visibleRows = rows.filter((r) => r.hasData);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-indigo-500" />
        <h3 className={`text-base font-semibold ${textPrimary}`}>
          Budget History
        </h3>
        {streak > 0 && (
          <span
            className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              darkMode
                ? "bg-orange-900/40 text-orange-300"
                : "bg-orange-100 text-orange-600"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            {streak} month{streak !== 1 ? "s" : ""} under budget
          </span>
        )}
      </div>

      {visibleRows.length === 0 ? (
        <p className={`text-sm ${textSecondary} py-4 text-center`}>
          Once you have a full month of transactions, your budget track record
          will show up here.
        </p>
      ) : (
        <ul className="space-y-2">
          {visibleRows.map((r) => {
            const pct = r.budget > 0 ? (r.spent / r.budget) * 100 : 0;
            return (
              <li
                key={r.month}
                className={`rounded-xl px-4 py-3 ${
                  darkMode ? "bg-gray-700/50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className={`font-medium ${textPrimary}`}>
                    {monthLabel(r.month)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      r.under ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {r.under ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {fmt(r.spent)} / {fmt(r.budget)}
                  </span>
                </div>
                <div
                  className={`h-1.5 rounded-full overflow-hidden ${
                    darkMode ? "bg-gray-600" : "bg-gray-200"
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      r.under ? "bg-emerald-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default BudgetHistoryCard;
