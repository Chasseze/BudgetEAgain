import React, { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Minus, TrendingUp } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
}

interface CategoryComparisonTableProps {
  transactions: Transaction[];
  darkMode: boolean;
  currencySymbol?: string;
}

type SortKey = 'category' | 'delta';

function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

const CategoryComparisonTable: React.FC<CategoryComparisonTableProps> = ({
  transactions,
  darkMode,
  currencySymbol = '$',
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('delta');
  const [sortAsc, setSortAsc] = useState(false);

  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const rowHover = darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50';
  const headBg = darkMode ? 'bg-gray-700/60' : 'bg-gray-50';

  const now = new Date();
  const months = [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return { key: getMonthKey(d.getFullYear(), d.getMonth()), label: d.toLocaleDateString('en-US', { month: 'short' }) };
  }).reverse(); // oldest → newest

  const fmt = (n: number) =>
    n === 0
      ? '—'
      : `${currencySymbol}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  const tableData = useMemo(() => {
    // Collect all categories that appear in expense transactions
    const categories = [
      ...new Set(transactions.filter((t) => t.type === 'expense').map((t) => t.category)),
    ].sort();

    return categories.map((cat) => {
      const monthly = months.map((m) =>
        transactions
          .filter((t) => t.type === 'expense' && t.category === cat && t.date.startsWith(m.key))
          .reduce((s, t) => s + t.amount, 0),
      );

      const current = monthly[2];
      const prev = monthly[1];
      const delta = prev > 0 ? ((current - prev) / prev) * 100 : current > 0 ? 100 : 0;

      // Sparkline: normalise to 0-24px heights
      const maxVal = Math.max(...monthly, 1);
      const sparkHeights = monthly.map((v) => Math.max(3, (v / maxVal) * 24));

      return { cat, monthly, current, prev, delta, sparkHeights };
    });
  }, [transactions, months]);

  const sorted = useMemo(() => {
    const arr = [...tableData];
    arr.sort((a, b) => {
      if (sortKey === 'category') {
        return sortAsc ? a.cat.localeCompare(b.cat) : b.cat.localeCompare(a.cat);
      }
      return sortAsc ? a.delta - b.delta : b.delta - a.delta;
    });
    return arr;
  }, [tableData, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (tableData.length === 0) {
    return (
      <div className={`text-center py-8 ${textSecondary} text-sm`}>
        No expense data to compare yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-indigo-500" />
        <h3 className={`text-base font-semibold ${textPrimary}`}>Category Comparison</h3>
        <span className={`ml-auto text-xs ${textSecondary}`}>Last 3 months</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className={headBg}>
              <th
                className={`px-4 py-3 text-left font-semibold ${textSecondary} cursor-pointer select-none`}
                onClick={() => handleSort('category')}
              >
                Category {sortKey === 'category' && (sortAsc ? '↑' : '↓')}
              </th>
              {months.map((m) => (
                <th key={m.key} className={`px-3 py-3 text-right font-semibold ${textSecondary}`}>
                  {m.label}
                </th>
              ))}
              <th
                className={`px-3 py-3 text-right font-semibold ${textSecondary} cursor-pointer select-none`}
                onClick={() => handleSort('delta')}
              >
                Δ% {sortKey === 'delta' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className={`px-3 py-3 text-center font-semibold ${textSecondary}`}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ cat, monthly, delta, sparkHeights }) => {
              const deltaColor =
                delta > 10 ? 'text-red-500' : delta < -10 ? 'text-emerald-500' : textSecondary;
              const DeltaIcon =
                delta > 5 ? ArrowUp : delta < -5 ? ArrowDown : Minus;

              return (
                <tr
                  key={cat}
                  className={`border-t ${borderColor} ${rowHover} transition-colors`}
                >
                  <td className={`px-4 py-3 font-medium ${textPrimary} truncate max-w-[140px]`}>
                    {cat}
                  </td>
                  {monthly.map((val, mi) => (
                    <td key={mi} className={`px-3 py-3 text-right tabular-nums ${val === 0 ? textSecondary : textPrimary}`}>
                      {fmt(val)}
                    </td>
                  ))}
                  <td className={`px-3 py-3 text-right tabular-nums font-semibold ${deltaColor}`}>
                    <span className="inline-flex items-center gap-0.5 justify-end">
                      <DeltaIcon className="w-3 h-3" />
                      {monthly[1] === 0 && monthly[2] === 0
                        ? '—'
                        : `${Math.abs(delta).toFixed(0)}%`}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {/* Mini sparkline */}
                    <div className="flex items-end gap-0.5 justify-center h-6">
                      {sparkHeights.map((h, si) => (
                        <div
                          key={si}
                          className="w-2 rounded-sm"
                          style={{
                            height: `${h}px`,
                            backgroundColor:
                              si === 2
                                ? delta > 10
                                  ? '#ef4444'
                                  : delta < -10
                                    ? '#10b981'
                                    : '#6366f1'
                                : darkMode
                                  ? '#4b5563'
                                  : '#d1d5db',
                          }}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={`text-[10px] mt-2 ${textSecondary}`}>
        Δ% = current month vs previous month. Click column headers to sort.
      </p>
    </div>
  );
};

export default CategoryComparisonTable;
