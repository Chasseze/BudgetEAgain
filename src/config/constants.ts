// Storage Keys for localStorage persistence
export const STORAGE_KEYS = {
  TRANSACTIONS: 'budget_tracker_transactions',
  BUDGET_LIMIT: 'budget_tracker_budget_limit',
  CATEGORY_BUDGETS: 'budget_tracker_category_budgets',
  SAVINGS_GOALS: 'budget_tracker_savings_goals',
  DARK_MODE: 'budget_tracker_dark_mode',
};

// Supported currencies
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

// Default currency
export const DEFAULT_CURRENCY = 'USD';

// Category colors for charts
export const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

// Expense categories
export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Shopping',
  'Healthcare',
  'Education',
  'Other'
];

// Income categories
export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Other'
];

// Category configuration with colors and default budgets
export const CATEGORY_CONFIG: Record<string, { color: string; budget: number }> = {
  'Food & Dining': { color: '#FF6B6B', budget: 500 },
  'Transportation': { color: '#4ECDC4', budget: 300 },
  'Entertainment': { color: '#45B7D1', budget: 200 },
  'Bills & Utilities': { color: '#FFA07A', budget: 400 },
  'Shopping': { color: '#98D8C8', budget: 300 },
  'Healthcare': { color: '#F7DC6F', budget: 200 },
  'Education': { color: '#BB8FCE', budget: 150 },
  'Other': { color: '#85C1E2', budget: 100 },
  'Salary': { color: '#4ade80', budget: 0 },
  'Freelance': { color: '#34d399', budget: 0 },
  'Investment': { color: '#22c55e', budget: 0 },
};

// Sample transactions for initial state
export const SAMPLE_TRANSACTIONS = [
  {
    id: "1",
    type: 'expense' as const,
    amount: 45.50,
    category: 'Food & Dining',
    description: 'Grocery shopping',
    date: '2025-01-25',
    receipt: null,
    isRecurring: false,
  },
  {
    id: "2",
    type: 'expense' as const,
    amount: 120.00,
    category: 'Bills & Utilities',
    description: 'Electric bill',
    date: '2025-01-23',
    receipt: null,
    isRecurring: true,
  },
  {
    id: "3",
    type: 'income' as const,
    amount: 3000.00,
    category: 'Salary',
    description: 'Monthly salary',
    date: '2025-01-01',
    receipt: null,
    isRecurring: true,
  },
  {
    id: "4",
    type: 'expense' as const,
    amount: 60.00,
    category: 'Transportation',
    description: 'Gas',
    date: '2025-01-20',
    receipt: null,
    isRecurring: false,
  },
  {
    id: "5",
    type: 'expense' as const,
    amount: 85.00,
    category: 'Entertainment',
    description: 'Movie and dinner',
    date: '2025-01-18',
    receipt: null,
    isRecurring: false,
  },
  {
    id: "6",
    type: 'expense' as const,
    amount: 200.00,
    category: 'Shopping',
    description: 'New clothes',
    date: '2025-01-15',
    receipt: null,
    isRecurring: false,
  },
  {
    id: "7",
    type: 'income' as const,
    amount: 500.00,
    category: 'Freelance',
    description: 'Side project payment',
    date: '2025-01-10',
    receipt: null,
    isRecurring: false,
  },
];

// Sample savings goals
export const SAMPLE_GOALS = [
  {
    id: "1",
    name: 'Vacation Fund',
    targetAmount: 2000,
    currentAmount: 850,
    deadline: '2025-06-01',
    color: '#4ECDC4',
  },
  {
    id: "2",
    name: 'Emergency Fund',
    targetAmount: 5000,
    currentAmount: 2500,
    deadline: '2025-12-31',
    color: '#FF6B6B',
  },
];

// Default budget limit
export const DEFAULT_BUDGET_LIMIT = 2500;

// Date range filter options
export const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

// Goal color options
export const GOAL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#4ade80', '#f472b6', '#a78bfa', '#fb923c',
];
