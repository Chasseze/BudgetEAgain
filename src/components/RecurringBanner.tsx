import React, { useMemo, useState } from "react";
import { RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  computeDueOccurrences,
  Occurrence,
  RecurringTransaction,
} from "../utils/recurring";

type Transaction = RecurringTransaction & { id: string };

export type DueOccurrence = Occurrence;

interface RecurringBannerProps {
  transactions: Transaction[];
  darkMode: boolean;
  currencySymbol: string;
  onPostAll: (due: DueOccurrence[]) => Promise<void>;
}

const RecurringBanner: React.FC<RecurringBannerProps> = ({
  transactions,
  darkMode,
  currencySymbol,
  onPostAll,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [posting, setPosting] = useState(false);

  const due = useMemo(() => computeDueOccurrences(transactions), [transactions]);

  if (dismissed || due.length === 0) return null;

  const handlePost = async () => {
    setPosting(true);
    try {
      await onPostAll(due);
    } finally {
      setPosting(false);
    }
  };

  const visible = expanded ? due : due.slice(0, 3);

  return (
    <div
      className={`mb-6 rounded-2xl border p-4 md:p-5 animate-slide-down ${
        darkMode
          ? "bg-indigo-950/60 border-indigo-800"
          : "bg-indigo-50 border-indigo-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            {due.length} recurring transaction{due.length !== 1 ? "s" : ""} due
          </h3>
          <p
            className={`text-xs mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            Based on your recurring entries, these haven&apos;t been posted yet.
          </p>

          <ul className="mt-3 space-y-1.5">
            {visible.map((d, i) => (
              <li
                key={`${d.description}-${d.date}-${i}`}
                className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${
                  darkMode ? "bg-gray-800/70" : "bg-white/80"
                }`}
              >
                <span
                  className={`truncate ${darkMode ? "text-gray-200" : "text-gray-800"}`}
                >
                  {d.description}{" "}
                  <span
                    className={darkMode ? "text-gray-500" : "text-gray-400"}
                  >
                    · {d.date}
                  </span>
                </span>
                <span
                  className={`font-semibold tabular-nums flex-shrink-0 ml-3 ${
                    d.type === "income" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {d.type === "income" ? "+" : "-"}
                  {currencySymbol}
                  {d.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </li>
            ))}
          </ul>

          {due.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs font-medium text-indigo-500 hover:text-indigo-400 inline-flex items-center gap-1"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Show all {due.length} <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={handlePost}
              disabled={posting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold shadow hover:shadow-lg transition-all disabled:opacity-60"
            >
              {posting ? "Adding…" : `Add all (${due.length})`}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                darkMode
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`p-1.5 rounded-lg flex-shrink-0 ${
            darkMode
              ? "hover:bg-gray-800 text-gray-500"
              : "hover:bg-white text-gray-400"
          }`}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default RecurringBanner;
