/**
 * Shared recurrence logic.
 *
 * A "series" is a group of transactions that repeat: same type, category,
 * description, amount and frequency. The most recent transaction in a series
 * is its anchor — occurrences are projected forward from there.
 */

export type Frequency = "weekly" | "monthly" | "yearly";

export interface RecurringTransaction {
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: Frequency;
}

export interface Occurrence {
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
  recurringFrequency: Frequency;
}

export const toDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayString = (): string => toDateString(new Date());

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

/**
 * Dates after `anchor` that fall within [windowStart, windowEnd], inclusive.
 *
 * Monthly/yearly steps are computed from the anchor's day-of-month rather than
 * from the previous occurrence, so a bill on the 31st stays on the 31st instead
 * of drifting to the 28th permanently after passing through February.
 */
export const generateOccurrenceDates = (
  anchor: string,
  freq: Frequency,
  windowStart: string,
  windowEnd: string,
  maxCount = 400,
): string[] => {
  const [ay, am, ad] = anchor.split("-").map(Number);
  if (!ay || !am || !ad) return [];

  const dates: string[] = [];
  for (let i = 1; i <= maxCount; i++) {
    let date: string;
    if (freq === "weekly") {
      // Day overflow rolls months/years over correctly
      date = toDateString(new Date(ay, am - 1, ad + 7 * i));
    } else if (freq === "monthly") {
      const absMonth = am - 1 + i;
      const y = ay + Math.floor(absMonth / 12);
      const m = ((absMonth % 12) + 12) % 12;
      date = toDateString(new Date(y, m, Math.min(ad, daysInMonth(y, m))));
    } else {
      const y = ay + i;
      date = toDateString(
        new Date(y, am - 1, Math.min(ad, daysInMonth(y, am - 1))),
      );
    }

    if (date > windowEnd) break;
    if (date >= windowStart) dates.push(date);
  }
  return dates;
};

/** Latest transaction for each recurring series. */
export const getRecurringSeries = (
  transactions: RecurringTransaction[],
): RecurringTransaction[] => {
  const series = new Map<string, RecurringTransaction>();
  for (const t of transactions) {
    if (!t.isRecurring || !t.recurringFrequency) continue;
    const key = `${t.type}|${t.category}|${t.description}|${t.amount}|${t.recurringFrequency}`;
    const existing = series.get(key);
    if (!existing || t.date > existing.date) series.set(key, t);
  }
  return [...series.values()];
};

const toOccurrence = (
  anchor: RecurringTransaction,
  date: string,
): Occurrence => ({
  type: anchor.type,
  amount: anchor.amount,
  category: anchor.category,
  description: anchor.description,
  date,
  recurringFrequency: anchor.recurringFrequency!,
});

/** Occurrences that should already have been posted (up to and including today). */
export const computeDueOccurrences = (
  transactions: RecurringTransaction[],
): Occurrence[] => {
  const today = todayString();
  const due: Occurrence[] = [];
  for (const anchor of getRecurringSeries(transactions)) {
    // Cap the backfill so a long-dormant series doesn't flood the list
    const dates = generateOccurrenceDates(
      anchor.date,
      anchor.recurringFrequency!,
      "0000-01-01",
      today,
      12,
    );
    dates.forEach((d) => due.push(toOccurrence(anchor, d)));
  }
  return due.sort((a, b) => a.date.localeCompare(b.date));
};

/** Occurrences falling strictly after today, within the given window. */
export const projectUpcoming = (
  transactions: RecurringTransaction[],
  windowStart: string,
  windowEnd: string,
): Occurrence[] => {
  const today = todayString();
  const start = windowStart > today ? windowStart : today;
  const upcoming: Occurrence[] = [];
  for (const anchor of getRecurringSeries(transactions)) {
    const dates = generateOccurrenceDates(
      anchor.date,
      anchor.recurringFrequency!,
      start,
      windowEnd,
    );
    dates
      .filter((d) => d > today)
      .forEach((d) => upcoming.push(toOccurrence(anchor, d)));
  }
  return upcoming.sort((a, b) => a.date.localeCompare(b.date));
};
