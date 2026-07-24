import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
}

interface SpendingHeatmapProps {
  transactions: Transaction[];
  darkMode: boolean;
  currencySymbol?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getIntensityColor(amount: number, maxAmount: number, darkMode: boolean): string {
  if (amount === 0) return darkMode ? '#1f2937' : '#f3f4f6';
  const ratio = Math.min(amount / Math.max(maxAmount, 1), 1);
  if (ratio < 0.2) return darkMode ? '#064e3b' : '#d1fae5';
  if (ratio < 0.4) return darkMode ? '#065f46' : '#6ee7b7';
  if (ratio < 0.6) return '#f59e0b';
  if (ratio < 0.8) return '#f97316';
  return '#ef4444';
}

const SpendingHeatmap: React.FC<SpendingHeatmapProps> = ({
  transactions,
  darkMode,
  currencySymbol = '$',
}) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [tooltip, setTooltip] = useState<{ day: number; amount: number; x: number; y: number } | null>(null);

  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Build map of day → total expenses for the viewed month
  const dailyTotals = useMemo(() => {
    const map: Record<number, number> = {};
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(prefix))
      .forEach((t) => {
        const day = parseInt(t.date.substring(8, 10), 10);
        map[day] = (map[day] || 0) + t.amount;
      });
    return map;
  }, [transactions, viewYear, viewMonth]);

  const maxAmount = useMemo(() => Math.max(...Object.values(dailyTotals), 1), [dailyTotals]);
  const totalForMonth = useMemo(
    () => Object.values(dailyTotals).reduce((s, v) => s + v, 0),
    [dailyTotals],
  );

  // Calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handlePrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const handleNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  // Don't allow navigating beyond current month
  const isCurrentOrFuture =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth >= today.getMonth());

  // Build cells: empty slots + day cells
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-base font-semibold ${textPrimary}`}>Spending Heatmap</h3>
          <p className={`text-xs ${textSecondary} mt-0.5`}>
            {totalForMonth > 0
              ? `${currencySymbol}${totalForMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`
              : 'No expenses this month'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            aria-label="Previous month"
          >
            <ChevronLeft className={`w-4 h-4 ${textSecondary}`} />
          </button>
          <span className={`text-sm font-medium ${textPrimary} min-w-[120px] text-center`}>
            {monthLabel}
          </span>
          <button
            onClick={handleNext}
            disabled={isCurrentOrFuture}
            className={`p-1.5 rounded-lg transition-colors ${
              isCurrentOrFuture
                ? 'opacity-30 cursor-not-allowed'
                : darkMode
                  ? 'hover:bg-gray-700'
                  : 'hover:bg-gray-100'
            }`}
            aria-label="Next month"
          >
            <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className={`text-center text-[10px] font-medium ${textSecondary}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1 relative">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }
          const amount = dailyTotals[day] || 0;
          const isToday =
            day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();
          const bg = getIntensityColor(amount, maxAmount, darkMode);

          return (
            <div
              key={day}
              className={`aspect-square rounded-md flex items-center justify-center cursor-default relative transition-transform hover:scale-110 hover:z-10 ${
                isToday ? `ring-2 ring-indigo-500 ring-offset-1 ${darkMode ? 'ring-offset-gray-800' : 'ring-offset-white'}` : ''
              }`}
              style={{ backgroundColor: bg }}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                setTooltip({ day, amount, x: rect.left, y: rect.top });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <span
                className={`text-[10px] font-semibold select-none ${
                  amount > 0 ? 'text-white/90' : darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tooltip (portal-style via fixed pos) */}
      {tooltip && (
        <div
          className={`fixed z-50 pointer-events-none px-3 py-2 rounded-lg shadow-lg text-xs font-medium ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-800 border border-gray-200'
          }`}
          style={{ left: tooltip.x + 20, top: tooltip.y - 10 }}
        >
          {`${new Date(viewYear, viewMonth, tooltip.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: `}
          {tooltip.amount > 0
            ? `${currencySymbol}${tooltip.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : 'No spending'}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className={`text-[10px] ${textSecondary}`}>Less</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (
          <div
            key={ratio}
            className="w-4 h-4 rounded-sm"
            style={{ backgroundColor: getIntensityColor(ratio * maxAmount, maxAmount, darkMode) }}
          />
        ))}
        <span className={`text-[10px] ${textSecondary}`}>More</span>
      </div>
    </div>
  );
};

export default SpendingHeatmap;
