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

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  'Food & Dining': {
    icon: <Utensils className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#FF6B6B',
  },
  'Transportation': {
    icon: <Car className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#4ECDC4',
  },
  'Entertainment': {
    icon: <Film className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#45B7D1',
  },
  'Bills & Utilities': {
    icon: <Zap className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#FFA07A',
  },
  'Shopping': {
    icon: <ShoppingBag className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#98D8C8',
  },
  'Healthcare': {
    icon: <Heart className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#F7DC6F',
  },
  'Education': {
    icon: <BookOpen className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#BB8FCE',
  },
  'Other': {
    icon: <Package className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#85C1E2',
  },
  'Salary': {
    icon: <Wallet className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#4ade80',
  },
  'Freelance': {
    icon: <CreditCard className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#34d399',
  },
  'Investment': {
    icon: <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />,
    color: '#22c55e',
  },
};

const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'md',
  showIcon = true,
}) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Other'];

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium transition-all duration-200 hover:scale-105 ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      {showIcon && (
        <span className="flex-shrink-0">{config.icon}</span>
      )}
      <span className="truncate max-w-[100px] md:max-w-none">{category}</span>
    </span>
  );
};

// Export the category config for use in other components
export const getCategoryConfig = (category: string) => {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Other'];
};

export const getCategoryColor = (category: string): string => {
  return (CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Other']).color;
};

export const getCategoryIcon = (category: string): React.ReactNode => {
  return (CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Other']).icon;
};

export default CategoryBadge;
