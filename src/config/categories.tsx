import React from 'react';
import {
  Utensils,
  Car,
  Film,
  Zap,
  ShoppingBag,
  Heart,
  BookOpen,
  Package,
  Wallet,
  CreditCard,
  TrendingUp,
} from 'lucide-react';

export interface CategoryConfig {
  icon: React.ReactNode;
  color: string;
  budget: number;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  'Food & Dining': {
    icon: <Utensils className="w-4 h-4" />,
    color: '#FF6B6B',
    budget: 500,
  },
  'Transportation': {
    icon: <Car className="w-4 h-4" />,
    color: '#4ECDC4',
    budget: 300,
  },
  'Entertainment': {
    icon: <Film className="w-4 h-4" />,
    color: '#45B7D1',
    budget: 200,
  },
  'Bills & Utilities': {
    icon: <Zap className="w-4 h-4" />,
    color: '#FFA07A',
    budget: 400,
  },
  'Shopping': {
    icon: <ShoppingBag className="w-4 h-4" />,
    color: '#98D8C8',
    budget: 300,
  },
  'Healthcare': {
    icon: <Heart className="w-4 h-4" />,
    color: '#F7DC6F',
    budget: 200,
  },
  'Education': {
    icon: <BookOpen className="w-4 h-4" />,
    color: '#BB8FCE',
    budget: 150,
  },
  'Other': {
    icon: <Package className="w-4 h-4" />,
    color: '#85C1E2',
    budget: 100,
  },
  'Salary': {
    icon: <Wallet className="w-4 h-4" />,
    color: '#4ade80',
    budget: 0,
  },
  'Freelance': {
    icon: <CreditCard className="w-4 h-4" />,
    color: '#34d399',
    budget: 0,
  },
  'Investment': {
    icon: <TrendingUp className="w-4 h-4" />,
    color: '#22c55e',
    budget: 0,
  },
};

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Shopping',
  'Healthcare',
  'Education',
  'Other',
];

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Other'];

export const CHART_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
];

export const GOAL_COLORS = [
  '#4ECDC4',
  '#FF6B6B',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
  '#6366f1',
  '#ec4899',
];
