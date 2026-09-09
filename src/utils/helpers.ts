// Date range calculation utility
/** Parse a date-only value without UTC conversion shifting it a day west of GMT. */
export const parseDateOnly = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** Format a local date for <input type="date"> and date-only persistence. */
export const toDateInputValue = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calendar ranges for the transaction filter. Labels such as “This month”
 * must not silently mean “the trailing 30 days”.
 */
export const getDateRange = (filter: string): { start: Date; end: Date } => {
  const now = new Date();
  let start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  switch (filter) {
    case 'today':
      break;
    case 'week': {
      // ISO-style week: Monday through Sunday.
      const weekday = (now.getDay() + 6) % 7;
      start.setDate(now.getDate() - weekday);
      end.setDate(start.getDate() + 6);
      break;
    }
    case 'month':
      start.setDate(1);
      end.setMonth(now.getMonth() + 1, 0);
      break;
    case 'quarter': {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      start.setMonth(quarterStart, 1);
      end.setMonth(quarterStart + 3, 0);
      break;
    }
    case 'year':
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      break;
    default:
      start = new Date(0); // All time
  }
  return { start, end };
};

// Format currency
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = parseDateOnly(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format date for input fields
export const formatDateForInput = (date: Date = new Date()): string => {
  return toDateInputValue(date);
};

/** Keep display values stable while amounts are entered as decimal strings. */
export const toMinorUnits = (amount: number): number => Math.round((amount + Number.EPSILON) * 100);
export const fromMinorUnits = (amount: number): number => amount / 100;
export const normaliseMoney = (amount: number): number => fromMinorUnits(toMinorUnits(amount));

// Calculate percentage
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

// Clamp a number between min and max
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// Generate unique ID
export const generateId = (): number => {
  return Date.now() + Math.random();
};

// Debounce function for search
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Escape a value for safe inclusion in a CSV cell
const escapeCSVField = (value: string | number): string => {
  let str = String(value);
  // Prevent spreadsheets interpreting user-controlled fields as formulas.
  if (/^[=+\-@]/.test(str)) str = `'${str}`;
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Export transactions to CSV
export const exportToCSV = (
  transactions: Array<{
    date: string;
    type: string;
    category: string;
    description: string;
    amount: number;
  }>
): void => {
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
  const csvContent = [
    headers.join(','),
    ...transactions.map((t) =>
      [t.date, t.type, t.category, t.description, t.amount]
        .map(escapeCSVField)
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `budget-export-${formatDateForInput()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Download a portable JSON copy of all structured account data. */
export const exportToJSON = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Parse CSV file (for future import feature)
export const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split('\n');
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
};

// Get month name from date string
export const getMonthName = (dateString: string): string => {
  const date = new Date(dateString + '-01');
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// Check if a date is within range
export const isDateInRange = (
  dateString: string,
  start: Date,
  end: Date
): boolean => {
  const date = parseDateOnly(dateString);
  return date >= start && date <= end;
};

// Sort transactions by date (newest first)
export const sortByDateDesc = <T extends { date: string }>(items: T[]): T[] => {
  return [...items].sort(
    (a, b) => parseDateOnly(b.date).getTime() - parseDateOnly(a.date).getTime()
  );
};

// Group transactions by month
export const groupByMonth = <T extends { date: string }>(
  items: T[]
): Record<string, T[]> => {
  return items.reduce((acc, item) => {
    const month = item.date.substring(0, 7);
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(item);
    return acc;
  }, {} as Record<string, T[]>);
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Get contrasting text color for background
export const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};
