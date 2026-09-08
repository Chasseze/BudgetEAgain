import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, PiggyBank } from 'lucide-react';

// Animates a number from its previous value to a new target value
function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    let rafId: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(start + diff * ease);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return display;
}

interface OverviewCardsProps {
  totalIncome: number;
  totalExpenses: number;
  remaining: number;
  budgetUsedPercent: number;
  darkMode: boolean;
  currencySymbol?: string;
}

const OverviewCards: React.FC<OverviewCardsProps> = ({
  totalIncome,
  totalExpenses,
  remaining,
  budgetUsedPercent,
  currencySymbol = '$',
  // darkMode,
}) => {
  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const animatedIncome = useCountUp(totalIncome);
  const animatedExpenses = useCountUp(totalExpenses);
  const animatedRemaining = useCountUp(Math.abs(remaining));
  const animatedBudgetPct = useCountUp(budgetUsedPercent);
  const savingsRate = totalIncome > 0 ? Math.round((remaining / totalIncome) * 100) : 0;

  return (
    <div className="space-y-3 md:space-y-4 mb-6">
      {/* Top row — 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Income Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-md p-4 md:p-6 text-white transition-shadow hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
          <p className="text-green-100 text-xs md:text-sm mb-1">Total Income</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold truncate">
            {currencySymbol}{formatAmount(animatedIncome)}
          </p>
        </div>

        {/* Expenses Card */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-md p-4 md:p-6 text-white transition-shadow hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingDown className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
          <p className="text-red-100 text-xs md:text-sm mb-1">Total Expenses</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold truncate">
            {currencySymbol}{formatAmount(animatedExpenses)}
          </p>
        </div>

        {/* Remaining Card */}
        <div
          className={`bg-gradient-to-br ${
            remaining >= 0
              ? 'from-blue-400 to-blue-600'
              : 'from-orange-400 to-orange-600'
          } rounded-xl shadow-md p-4 md:p-6 text-white transition-shadow hover:shadow-lg`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
          <p className="text-blue-100 text-xs md:text-sm mb-1">Remaining</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold truncate">
            {remaining < 0 ? '-' : ''}{currencySymbol}{formatAmount(animatedRemaining)}
          </p>
        </div>

        {/* Budget Used Card */}
        <div
          className={`bg-gradient-to-br ${
            budgetUsedPercent > 100
              ? 'from-red-400 to-red-600'
              : budgetUsedPercent > 80
              ? 'from-yellow-400 to-yellow-600'
              : 'from-purple-400 to-purple-600'
          } rounded-xl shadow-md p-4 md:p-6 text-white transition-shadow hover:shadow-lg`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
          <p className="text-purple-100 text-xs md:text-sm mb-1">Budget Used</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold">
            {Math.min(animatedBudgetPct, 999).toFixed(0)}%
          </p>
          {/* Progress bar */}
          <div className="w-full bg-white/30 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(animatedBudgetPct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Savings Rate banner */}
      <div
        className={`bg-gradient-to-r ${
          savingsRate >= 20
            ? 'from-indigo-500 to-purple-600'
            : savingsRate > 0
            ? 'from-indigo-400 to-blue-500'
            : 'from-gray-500 to-gray-600'
        } rounded-xl shadow-md px-5 py-3 text-white flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <p className="text-white/80 text-xs">Savings Rate</p>
            <p className="font-semibold text-sm">
              {savingsRate > 0
                ? `You're saving ${savingsRate}% of your income`
                : savingsRate === 0
                ? 'No income recorded for this period'
                : 'Spending exceeds income this period'}
            </p>
          </div>
        </div>
        <span className="text-2xl font-bold">
          {savingsRate > 0 ? `${savingsRate}%` : '—'}
        </span>
      </div>
    </div>
  );
};

export default OverviewCards;
