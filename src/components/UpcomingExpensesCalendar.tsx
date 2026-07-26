import React, { useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  TrendingUp,
} from "lucide-react";
import {
  projectUpcoming,
  todayString,
  toDateString,
  Occurrence,
  RecurringTransaction,
} from "../utils/recurring";

interface UpcomingExpensesCalendarProps {
  transactions: (RecurringTransaction & { id: string })[];
  darkMode: boolean;
  currencySymbol: string;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_MONTHS_AHEAD = 12;

/**
 * Heat colour by how a day compares to a *typical* bill day this month.
 * Scaling against the month's maximum would paint every day red whenever
 * bills are similarly sized; scaling against the average keeps ordinary days
 * calm and reserves warm colours for days that are genuinely heavier.
 */
function intensityColor(ratioToTypical: number, darkMode: boolean): string {
  if (ratioToTypical <= 0) return darkMode ? "#1f2937" : "#f3f4f6";
  if (ratioToTypical < 0.75) return darkMode ? "#3730a3" : "#c7d2fe";
  if (ratioToTypical < 1.25) return darkMode ? "#4f46e5" : "#818cf8";
  if (ratioToTypical < 2) return "#f59e0b";
  return "#ef4444";
}

const UpcomingExpensesCalendar: React.FC<UpcomingExpensesCalendarProps> = ({
  transactions,
  darkMode,
  currencySymbol,
}) => {
  const today = new Date();
  const [offsetOverride, setOffsetOverride] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const textPrimary = darkMode ? "text-white" : "text-gray-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-500";

  // Everything still to come — used for the summary and the "next up" list
  const horizon = useMemo(() => {
    const end = new Date(
      today.getFullYear(),
      today.getMonth() + MAX_MONTHS_AHEAD + 1,
      0,
    );
    return projectUpcoming(transactions, todayString(), toDateString(end));
  }, [transactions]);

  // Open on the month holding the next bill, so the calendar isn't blank when
  // nothing is left in the current month
  const defaultOffset = useMemo(() => {
    const first = horizon[0];
    if (!first) return 0;
    const [fy, fm] = first.date.split("-").map(Number);
    const months =
      (fy - today.getFullYear()) * 12 + (fm - 1 - today.getMonth());
    return Math.min(MAX_MONTHS_AHEAD, Math.max(0, months));
  }, [horizon]);

  const offset = offsetOverride ?? defaultOffset;
  const setOffset = (updater: (o: number) => number) =>
    setOffsetOverride((o) => updater(o ?? defaultOffset));

  const viewDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const monthStart = toDateString(new Date(viewYear, viewMonth, 1));
  const monthEnd = toDateString(new Date(viewYear, viewMonth + 1, 0));

  const monthOccurrences = useMemo(
    () => horizon.filter((o) => o.date >= monthStart && o.date <= monthEnd),
    [horizon, monthStart, monthEnd],
  );

  // day-of-month → occurrences (expenses drive the heat map)
  const byDay = useMemo(() => {
    const map: Record<number, Occurrence[]> = {};
    for (const o of monthOccurrences) {
      const day = Number(o.date.slice(8, 10));
      (map[day] ||= []).push(o);
    }
    return map;
  }, [monthOccurrences]);

  const expenseTotalForDay = (day: number) =>
    (byDay[day] || [])
      .filter((o) => o.type === "expense")
      .reduce((s, o) => s + o.amount, 0);

  // Average spend across days that actually carry a bill
  const typicalDayTotal = useMemo(() => {
    const totals = Object.keys(byDay)
      .map((d) => expenseTotalForDay(Number(d)))
      .filter((v) => v > 0);
    if (totals.length === 0) return 1;
    return totals.reduce((s, v) => s + v, 0) / totals.length;
  }, [byDay]);

  const monthExpenseTotal = monthOccurrences
    .filter((o) => o.type === "expense")
    .reduce((s, o) => s + o.amount, 0);
  const monthIncomeTotal = monthOccurrences
    .filter((o) => o.type === "income")
    .reduce((s, o) => s + o.amount, 0);

  // Next 30 days, regardless of which month is being viewed
  const next30 = useMemo(() => {
    const cutoff = toDateString(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30),
    );
    return horizon.filter((o) => o.date <= cutoff);
  }, [horizon]);
  const next30Expenses = next30
    .filter((o) => o.type === "expense")
    .reduce((s, o) => s + o.amount, 0);

  const fmt = (n: number) =>
    `${currencySymbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const fmtCompact = (n: number) =>
    n >= 1000
      ? `${currencySymbol}${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
      : `${currencySymbol}${Math.round(n)}`;

  const daysUntil = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const base = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return Math.round((target.getTime() - base.getTime()) / 86400000);
  };

  const relativeLabel = (date: string) => {
    const n = daysUntil(date);
    if (n === 0) return "today";
    if (n === 1) return "tomorrow";
    if (n < 7) return `in ${n} days`;
    if (n < 14) return "next week";
    return `in ${Math.round(n / 7)} weeks`;
  };

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Calendar cells
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = todayString();
  const selectedItems = selectedDate ? byDay[Number(selectedDate.slice(8, 10))] : null;

  if (horizon.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-5 h-5 text-indigo-500" />
          <h3 className={`text-base font-semibold ${textPrimary}`}>
            Upcoming Expenses
          </h3>
        </div>
        <p className={`text-sm ${textSecondary} py-6 text-center`}>
          Nothing scheduled yet. Tick <strong>Recurring</strong> when adding a
          transaction (rent, subscriptions, bills) and its future dates will
          appear here so you can plan ahead.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className={`text-base font-semibold ${textPrimary}`}>
              Upcoming Expenses
            </h3>
            <p className={`text-xs ${textSecondary}`}>
              {next30Expenses > 0
                ? `${fmt(next30Expenses)} due in the next 30 days`
                : "Nothing due in the next 30 days"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setOffset((o) => Math.max(0, o - 1));
              setSelectedDate(null);
            }}
            disabled={offset === 0}
            className={`p-1.5 rounded-lg transition-colors ${
              offset === 0
                ? "opacity-30 cursor-not-allowed"
                : darkMode
                  ? "hover:bg-gray-700"
                  : "hover:bg-gray-100"
            }`}
            aria-label="Previous month"
          >
            <ChevronLeft className={`w-4 h-4 ${textSecondary}`} />
          </button>
          <span
            className={`text-sm font-medium ${textPrimary} min-w-[110px] text-center`}
          >
            {monthLabel}
          </span>
          <button
            onClick={() => {
              setOffset((o) => Math.min(MAX_MONTHS_AHEAD, o + 1));
              setSelectedDate(null);
            }}
            disabled={offset >= MAX_MONTHS_AHEAD}
            className={`p-1.5 rounded-lg transition-colors ${
              offset >= MAX_MONTHS_AHEAD
                ? "opacity-30 cursor-not-allowed"
                : darkMode
                  ? "hover:bg-gray-700"
                  : "hover:bg-gray-100"
            }`}
            aria-label="Next month"
          >
            <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                className={`text-center text-[10px] font-medium ${textSecondary}`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null)
                return <div key={`empty-${idx}`} className="aspect-square" />;

              const dateStr = toDateString(new Date(viewYear, viewMonth, day));
              const items = byDay[day] || [];
              const expenseTotal = expenseTotalForDay(day);
              const isPast = dateStr < todayStr;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const bg = isPast
                ? darkMode
                  ? "#111827"
                  : "#f9fafb"
                : intensityColor(expenseTotal / typicalDayTotal, darkMode);
              const hasItems = items.length > 0;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(hasItems ? dateStr : null)}
                  title={
                    hasItems
                      ? `${items.map((i) => i.description).join(", ")} — ${fmt(expenseTotal)}`
                      : undefined
                  }
                  className={`aspect-square rounded-md flex flex-col items-center justify-center transition-transform ${
                    hasItems ? "cursor-pointer hover:scale-110 hover:z-10" : "cursor-default"
                  } ${
                    isToday
                      ? `ring-2 ring-indigo-500 ring-offset-1 ${darkMode ? "ring-offset-gray-800" : "ring-offset-white"}`
                      : ""
                  } ${isSelected ? "ring-2 ring-amber-400" : ""}`}
                  style={{ backgroundColor: bg }}
                >
                  <span
                    className={`text-[10px] font-semibold leading-none ${
                      expenseTotal > 0 && !isPast
                        ? "text-white/90"
                        : darkMode
                          ? "text-gray-500"
                          : "text-gray-400"
                    }`}
                  >
                    {day}
                  </span>
                  {expenseTotal > 0 && !isPast && (
                    <span className="text-[8px] font-medium text-white/80 leading-none mt-0.5 truncate max-w-full px-0.5">
                      {fmtCompact(expenseTotal)}
                    </span>
                  )}
                  {/* Income-only day still deserves a marker */}
                  {expenseTotal === 0 && items.length > 0 && !isPast && (
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Month totals + legend */}
          <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
            <div className={`text-xs ${textSecondary}`}>
              {monthExpenseTotal > 0 ? (
                <>
                  <span className={`font-semibold ${textPrimary}`}>
                    {fmt(monthExpenseTotal)}
                  </span>{" "}
                  due in {monthLabel.split(" ")[0]}
                </>
              ) : (
                <>Nothing due in {monthLabel.split(" ")[0]}</>
              )}
              {monthIncomeTotal > 0 && (
                <>
                  {" · "}
                  <span className="text-emerald-500 font-semibold">
                    +{fmt(monthIncomeTotal)}
                  </span>{" "}
                  expected
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] ${textSecondary}`}>Lighter day</span>
              {[0.4, 1, 1.5, 2.5].map((r) => (
                <div
                  key={r}
                  className="w-3.5 h-3.5 rounded-sm"
                  style={{ backgroundColor: intensityColor(r, darkMode) }}
                />
              ))}
              <span className={`text-[10px] ${textSecondary}`}>Heavier day</span>
            </div>
          </div>
        </div>

        {/* Side panel: selected day, or what's next */}
        <div className="lg:col-span-2">
          {selectedDate && selectedItems ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setSelectedDate(null)}
                  className={`p-1 rounded-md ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  aria-label="Back to upcoming list"
                >
                  <ArrowLeft className={`w-3.5 h-3.5 ${textSecondary}`} />
                </button>
                <h4 className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>
                  {new Date(selectedDate.replace(/-/g, "/")).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  )}{" "}
                  · {relativeLabel(selectedDate)}
                </h4>
              </div>
              <ul className="space-y-2">
                {selectedItems.map((o, i) => (
                  <li
                    key={`${o.description}-${i}`}
                    className={`rounded-xl px-3 py-2 ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-medium truncate ${textPrimary}`}>
                        {o.description}
                      </span>
                      <span
                        className={`text-xs font-semibold whitespace-nowrap ${
                          o.type === "income" ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {o.type === "income" ? "+" : "-"}
                        {fmt(o.amount)}
                      </span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                      {o.category} · {o.recurringFrequency}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h4
                className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textSecondary}`}
              >
                What&apos;s next
              </h4>
              {horizon.length === 0 ? (
                <p className={`text-xs ${textSecondary}`}>Nothing scheduled.</p>
              ) : (
                <ul className="space-y-2">
                  {horizon.slice(0, 5).map((o, i) => (
                    <li
                      key={`${o.description}-${o.date}-${i}`}
                      className={`rounded-xl px-3 py-2 ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-medium truncate ${textPrimary}`}
                        >
                          {o.description}
                        </span>
                        <span
                          className={`text-xs font-semibold whitespace-nowrap ${
                            o.type === "income"
                              ? "text-emerald-500"
                              : "text-red-500"
                          }`}
                        >
                          {o.type === "income" ? "+" : "-"}
                          {fmt(o.amount)}
                        </span>
                      </div>
                      <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                        {relativeLabel(o.date)} ·{" "}
                        {new Date(o.date.replace(/-/g, "/")).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {next30Expenses > 0 && (
                <div
                  className={`mt-3 rounded-xl px-3 py-2.5 border ${
                    darkMode
                      ? "bg-indigo-950/50 border-indigo-800"
                      : "bg-indigo-50 border-indigo-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                    <span className={`text-[11px] font-semibold ${textPrimary}`}>
                      Set aside {fmt(next30Expenses)}
                    </span>
                  </div>
                  <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                    to cover the next 30 days of recurring bills.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpcomingExpensesCalendar;
