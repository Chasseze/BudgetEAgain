import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
}

interface SpendingNudgeProps {
  transactions: Transaction[];
  darkMode: boolean;
  currencySymbol: string;
}

const monthKey = (offset: number): string => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const SpendingNudge: React.FC<SpendingNudgeProps> = ({
  transactions,
  darkMode,
  currencySymbol,
}) => {
  const bgCard = darkMode
    ? "bg-gray-800/80 backdrop-blur-sm"
    : "bg-white/80 backdrop-blur-sm";
  const textPrimary = darkMode ? "text-white" : "text-gray-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-600";

  const insight = useMemo(() => {
    const current = monthKey(0);
    const previous = monthKey(1);

    const totals: Record<string, { cur: number; prev: number }> = {};
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const bucket = t.date.startsWith(current)
        ? "cur"
        : t.date.startsWith(previous)
          ? "prev"
          : null;
      if (!bucket) continue;
      if (!totals[t.category]) totals[t.category] = { cur: 0, prev: 0 };
      totals[t.category][bucket] += t.amount;
    }

    // Scale previous month's spend to the same point-in-month so a mid-month
    // comparison isn't automatically "down"
    const dayOfMonth = new Date().getDate();
    const daysInPrev = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      0,
    ).getDate();
    const paceFactor = Math.min(1, dayOfMonth / daysInPrev);

    type CategoryDelta = {
      category: string;
      cur: number;
      prevPaced: number;
      pct: number;
    };
    let worst: CategoryDelta | null = null;
    let best: CategoryDelta | null = null;

    for (const [category, { cur, prev }] of Object.entries(totals)) {
      const prevPaced = prev * paceFactor;
      // Ignore tiny categories where percentages are noise
      if (prevPaced < 20 && cur < 20) continue;
      if (prevPaced === 0) continue;
      const pct = ((cur - prevPaced) / prevPaced) * 100;
      if (pct > 20 && (!worst || pct > worst.pct)) {
        worst = { category, cur, prevPaced, pct };
      }
      if (pct < -20 && (!best || pct < best.pct)) {
        best = { category, cur, prevPaced, pct };
      }
    }

    return { worst, best };
  }, [transactions]);

  const fmt = (n: number) =>
    `${currencySymbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  let icon: React.ReactNode;
  let title: string;
  let body: string;
  let accent: string;

  if (insight.worst) {
    icon = <TrendingUp className="w-5 h-5 text-white" />;
    accent = "from-red-500 to-orange-500";
    title = `${insight.worst.category} is up ${Math.round(insight.worst.pct)}%`;
    body = `You've spent ${fmt(insight.worst.cur)} on ${insight.worst.category} this month, vs ${fmt(insight.worst.prevPaced)} by this point last month. Worth a look.`;
  } else if (insight.best) {
    icon = <TrendingDown className="w-5 h-5 text-white" />;
    accent = "from-emerald-500 to-teal-500";
    title = `${insight.best.category} is down ${Math.round(Math.abs(insight.best.pct))}%`;
    body = `You've spent ${fmt(insight.best.cur)} on ${insight.best.category} this month, vs ${fmt(insight.best.prevPaced)} by this point last month. Nice work!`;
  } else {
    icon = <Sparkles className="w-5 h-5 text-white" />;
    accent = "from-indigo-500 to-purple-500";
    title = "Spending looks steady";
    body =
      "No category is significantly up or down compared to last month. Keep it up!";
  }

  return (
    <div
      className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-5 transition-all duration-300 card-hover`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center flex-shrink-0`}
        >
          {icon}
        </div>
        <h3 className={`text-base md:text-lg font-semibold ${textPrimary}`}>
          Spending check
        </h3>
      </div>
      <p className={`text-sm font-semibold ${textPrimary} mb-1`}>{title}</p>
      <p className={`text-xs ${textSecondary}`}>{body}</p>
    </div>
  );
};

export default SpendingNudge;
