import { describe, expect, it } from "vitest";
import { getDashboardSummary } from "./dashboard";
const expense = (date: string, amount: number) => ({
  date,
  amount,
  type: "expense" as const,
  category: "Other",
  description: "",
});

describe("dashboard monthly summary", () => {
  it("uses actual equivalent dates and excludes future entries and later days of the previous month", () => {
    const result = getDashboardSummary(
      [
        expense("2026-09-08", 250),
        expense("2026-09-09", 999),
        expense("2026-08-08", 100),
        expense("2026-08-09", 999),
      ],
      2600,
      new Date(2026, 8, 8),
    );
    expect(result.expenses).toBe(250);
    expect(result.previousExpenses).toBe(100);
    expect(result.daysLeft).toBe(23);
    expect(result.budgetRemaining).toBe(2350);
  });
  it("preserves overspending and negative net income, with no negative allowance", () => {
    const result = getDashboardSummary(
      [expense("2026-09-08", 3000)],
      2600,
      new Date(2026, 8, 8),
    );
    expect(result.percent).toBeGreaterThan(100);
    expect(result.netIncome).toBe(-3000);
    expect(result.budgetRemaining).toBe(-400);
    expect(result.dailyAllowance).toBe(0);
  });
  it("distinguishes breaking even from missing income and handles no budget", () => {
    const records = [
      expense("2026-09-08", 10),
      { ...expense("2026-09-08", 10), type: "income" as const },
    ];
    const result = getDashboardSummary(records, 0, new Date(2026, 8, 8));
    expect(result.savingsRate).toBe(0);
    expect(result.percent).toBeNull();
    expect(result.dailyAllowance).toBeNull();
    expect(getDashboardSummary([], 0).savingsRate).toBeNull();
  });
  it("clamps comparisons to February and handles year boundaries and cents", () => {
    const march = getDashboardSummary(
      [expense("2024-02-29", 0.1), expense("2024-02-29", 0.2)],
      10,
      new Date(2024, 2, 31),
    );
    expect(march.previousEnd).toBe("2024-02-29");
    expect(march.previousExpenses).toBe(0.3);
    expect(march.daysLeft).toBe(1);
    const january = getDashboardSummary(
      [expense("2025-12-01", 20)],
      100,
      new Date(2026, 0, 1),
    );
    expect(january.previousExpenses).toBe(20);
    expect(january.daysLeft).toBe(31);
  });
});
