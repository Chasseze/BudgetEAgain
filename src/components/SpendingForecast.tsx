import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
}

interface SpendingForecastProps {
  transactions: Transaction[];
  budgetLimit: number;
  darkMode: boolean;
  currencySymbol?: string;
}

const SpendingForecast: React.FC<SpendingForecastProps> = ({
  transactions,
  budgetLimit,
  darkMode,
  currencySymbol = '$',
}) => {
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const fmt = (n: number) =>
    `${currencySymbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const { currentSpend, projected, dailyRate, chartData } = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const expenses = transactions.filter(
      (t) => t.type === 'expense' && t.date.startsWith(prefix),
    );

    // Daily totals for actual days
    const byDay: Record<number, number> = {};
    expenses.forEach((t) => {
      const d = parseInt(t.date.substring(8, 10), 10);
      byDay[d] = (byDay[d] || 0) + t.amount;
    });

    const currentSpend = expenses.reduce((s, t) => s + t.amount, 0);
    const dailyRate = dayOfMonth > 0 ? currentSpend / dayOfMonth : 0;
    const projected = dailyRate * daysInMonth;

    // Build chart: cumulative actual + projection
    let cumulative = 0;
    const data: { day: number; actual?: number; forecast?: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      cumulative += byDay[d] || 0;
      if (d <= dayOfMonth) {
        data.push({ day: d, actual: parseFloat(cumulative.toFixed(2)) });
      } else {
        const forecastVal = parseFloat((cumulative + dailyRate * (d - dayOfMonth)).toFixed(2));
        data.push({ day: d, forecast: forecastVal });
      }
    }
    // Bridge actual→forecast at dayOfMonth
    if (dayOfMonth < daysInMonth && data[dayOfMonth - 1]) {
      data[dayOfMonth - 1].forecast = data[dayOfMonth - 1].actual;
    }

    return { currentSpend, projected, dailyRate, chartData: data };
  }, [transactions, year, month, dayOfMonth, daysInMonth]);

  // Don't render until we have at least 3 days of data
  if (dayOfMonth < 3 || currentSpend === 0) return null;

  const isOverBudget = projected > budgetLimit;
  const pctUsed = budgetLimit > 0 ? (currentSpend / budgetLimit) * 100 : 0;

  const bannerClass = isOverBudget
    ? darkMode
      ? 'bg-red-900/30 border-red-700/50'
      : 'bg-red-50 border-red-200'
    : darkMode
      ? 'bg-emerald-900/30 border-emerald-700/50'
      : 'bg-emerald-50 border-emerald-200';

  const iconColor = isOverBudget ? 'text-red-500' : 'text-emerald-500';

  const remaining = budgetLimit > 0 ? budgetLimit - currentSpend : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-indigo-500" />
        <h3 className={`text-base font-semibold ${textPrimary}`}>Month-End Forecast</h3>
        <span
          className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Day {dayOfMonth} of {daysInMonth}
        </span>
      </div>

      {/* Banner */}
      <div className={`rounded-xl border p-3 mb-4 flex items-start gap-3 ${bannerClass}`}>
        {isOverBudget ? (
          <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
        ) : (
          <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
        )}
        <div>
          <p className={`text-sm font-semibold ${textPrimary}`}>
            {isOverBudget ? 'Projected to exceed budget' : 'On track this month'}
          </p>
          <p className={`text-xs mt-0.5 ${textSecondary}`}>
            You've spent <strong>{fmt(currentSpend)}</strong> in {dayOfMonth} days
            {' '}({fmt(dailyRate)}/day).
            {budgetLimit > 0 ? (
              <>
                {' '}At this pace, you'll reach{' '}
                <strong>{fmt(projected)}</strong> by month-end —{' '}
                {isOverBudget ? (
                  <span className="text-red-500 font-semibold">
                    {fmt(projected - budgetLimit)} over your {fmt(budgetLimit)} budget.
                  </span>
                ) : (
                  <span className="text-emerald-500 font-semibold">
                    {fmt(remaining!)} still available.
                  </span>
                )}
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* Budget progress bar */}
      {budgetLimit > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className={textSecondary}>Budget used</span>
            <span className={`font-semibold ${pctUsed > 80 ? 'text-red-500' : textPrimary}`}>
              {pctUsed.toFixed(0)}% of {fmt(budgetLimit)}
            </span>
          </div>
          <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, pctUsed)}%`,
                backgroundColor: pctUsed > 90 ? '#ef4444' : pctUsed > 70 ? '#f59e0b' : '#10b981',
              }}
            />
          </div>
        </div>
      )}

      {/* Cumulative chart */}
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              backgroundColor: darkMode ? '#1f2937' : '#fff',
              border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
              borderRadius: '8px',
              fontSize: 12,
            }}
            labelFormatter={(v) => `Day ${v}`}
            formatter={(value: number) => [fmt(value), '']}
          />
          {budgetLimit > 0 && (
            <ReferenceLine
              y={budgetLimit}
              stroke={darkMode ? '#ef4444' : '#dc2626'}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'Budget', fill: darkMode ? '#ef4444' : '#dc2626', fontSize: 10, position: 'insideTopRight' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#actualGrad)"
            dot={false}
            connectNulls={false}
            name="Actual"
          />
          <Area
            type="monotone"
            dataKey="forecast"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 4"
            fill="url(#forecastGrad)"
            dot={false}
            connectNulls={false}
            name="Forecast"
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className={`text-[10px] text-center mt-1 ${textSecondary}`}>
        — actual &nbsp;&nbsp; - - forecast
      </p>
    </div>
  );
};

export default SpendingForecast;
