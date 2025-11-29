// Transaction Types
export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  receipt: string | null;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
}

// Savings Goal Types
export interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

// Category Configuration
export interface CategoryConfig {
  icon: string;
  color: string;
  budget: number;
}

// Form Data Types
export interface TransactionFormData {
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string;
  date: string;
  receipt: string | null;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
}

export interface GoalFormData {
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  color: string;
}

// Filter Types
export type DateRangeFilter = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
export type TypeFilter = 'all' | 'income' | 'expense';

// Toast Types
export interface ToastData {
  message: string;
  onUndo?: () => void;
}

// Tab Types
export type TabId = 'home' | 'transactions' | 'analytics' | 'goals' | 'settings';

// Chart Data Types
export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

export interface CategoryExpense {
  name: string;
  value: number;
  budget: number;
  color: string;
}
