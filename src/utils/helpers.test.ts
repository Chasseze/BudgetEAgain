import { describe, expect, it } from 'vitest';
import {
  exportToCSV,
  getDateRange,
  normaliseMoney,
  parseDateOnly,
  toDateInputValue,
  toMinorUnits,
} from './helpers';

describe('getDateRange', () => {
  it('returns whole calendar months rather than a trailing 30-day period', () => {
    const now = new Date();
    const { start, end } = getDateRange('month');
    expect(toDateInputValue(start)).toBe(toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
    expect(toDateInputValue(end)).toBe(toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  });
});

describe('date-only and money helpers', () => {
  it('keeps date-only values in local calendar time', () => {
    const date = parseDateOnly('2026-03-01');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(1);
  });

  it('normalizes decimal input through integer minor units', () => {
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(normaliseMoney(10.999)).toBe(11);
  });
});

describe('CSV export', () => {
  it('neutralizes spreadsheet formulas in user-controlled cells', async () => {
    const createObjectURL = URL.createObjectURL;
    const revokeObjectURL = URL.revokeObjectURL;
    const captured: { value: Blob | MediaSource | null } = { value: null };
    URL.createObjectURL = (value) => {
      captured.value = value;
      return 'blob:test';
    };
    URL.revokeObjectURL = () => undefined;
    const originalDocument = globalThis.document;
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: () => ({ click: () => undefined }),
        body: { appendChild: () => undefined, removeChild: () => undefined },
      },
    });

    exportToCSV([{ date: '2026-09-08', type: 'expense', category: 'Other', description: '=SUM(A1:A2)', amount: 1 }]);
    if (!(captured.value instanceof Blob)) throw new Error('Expected a CSV blob');
    expect(await captured.value.text()).toContain("'=SUM(A1:A2)");

    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
  });
});
