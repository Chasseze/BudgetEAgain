import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Award, Target, Zap } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface SpendingInsightsProps {
  transactions: Transaction[];
  budgetLimit: number;
  categoryBudgets: Record<string, number>;
  darkMode: boolean;
  currencySymbol: string;
}

interface Insight {
  type: 'warning' | 'success' | 'info' | 'tip';
  icon: React.ReactNode;
  title: string;
  description: string;
  value?: string;
}

const SpendingInsights: React.FC<SpendingInsightsProps> = ({
  transactions,
  budgetLimit,
  categoryBudgets,
  darkMode,
  currencySymbol,
}) => {
  const bgCard = darkMode ? 'bg-gray-800' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';

  // Get current month and previous month data
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const isCurrentMonth = (date: string) => {
    const d = new Date(date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const isPrevMonth = (date: string) => {
    const d = new Date(date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear;
  };

  // Calculate spending by category for current and previous month
  const currentMonthExpenses = transactions.filter(
    (t) => t.type === 'expense' && isCurrentMonth(t.date)
  );
  const prevMonthExpenses = transactions.filter(
    (t) => t.type === 'expense' && isPrevMonth(t.date)
  );

  const currentMonthTotal = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const prevMonthTotal = prevMonthExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const currentByCategory = currentMonthExpenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const prevByCategory = prevMonthExpenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  // Generate insights
  const insights: Insight[] = [];

  // 1. Overall spending comparison
  if (prevMonthTotal > 0) {
    const percentChange = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
    if (percentChange > 20) {
      insights.push({
        type: 'warning',
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'Spending increased significantly',
        description: `You've spent ${Math.abs(percentChange).toFixed(0)}% more this month compared to last month.`,
        value: `+${currencySymbol}${(currentMonthTotal - prevMonthTotal).toFixed(2)}`,
      });
    } else if (percentChange < -10) {
      insights.push({
        type: 'success',
        icon: <TrendingDown className="w-5 h-5" />,
        title: 'Great job saving!',
        description: `You've spent ${Math.abs(percentChange).toFixed(0)}% less this month compared to last month.`,
        value: `-${currencySymbol}${Math.abs(currentMonthTotal - prevMonthTotal).toFixed(2)}`,
      });
    }
  }

  // 2. Category-specific insights
  Object.keys(currentByCategory).forEach((category) => {
    const current = currentByCategory[category];
    const prev = prevByCategory[category] || 0;
    const budget = categoryBudgets[category] || 0;

    // Check if category spending increased significantly
    if (prev > 0) {
      const catChange = ((current - prev) / prev) * 100;
      if (catChange > 30) {
        insights.push({
          type: 'warning',
          icon: <AlertTriangle className="w-5 h-5" />,
          title: `${category} spending up`,
          description: `You've spent ${catChange.toFixed(0)}% more on ${category} this month.`,
          value: `+${currencySymbol}${(current - prev).toFixed(2)}`,
        });
      }
    }

    // Check if approaching budget limit
    if (budget > 0 && current > budget * 0.9 && current <= budget) {
      insights.push({
        type: 'info',
        icon: <Target className="w-5 h-5" />,
        title: `${category} near budget limit`,
        description: `You've used ${((current / budget) * 100).toFixed(0)}% of your ${category} budget.`,
        value: `${currencySymbol}${(budget - current).toFixed(2)} left`,
      });
    }

    // Check if over budget
    if (budget > 0 && current > budget) {
      insights.push({
        type: 'warning',
        icon: <AlertTriangle className="w-5 h-5" />,
        title: `${category} over budget!`,
        description: `You've exceeded your ${category} budget by ${currencySymbol}${(current - budget).toFixed(2)}.`,
        value: `${currencySymbol}${current.toFixed(2)} / ${currencySymbol}${budget.toFixed(2)}`,
      });
    }
  });

  // 3. Top spending category
  const topCategory = Object.entries(currentByCategory).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    insights.push({
      type: 'info',
      icon: <Zap className="w-5 h-5" />,
      title: 'Top spending category',
      description: `${topCategory[0]} is your biggest expense this month.`,
      value: `${currencySymbol}${topCategory[1].toFixed(2)}`,
    });
  }

  // 4. Budget adherence
  if (budgetLimit > 0) {
    const budgetUsed = (currentMonthTotal / budgetLimit) * 100;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const expectedUsage = (dayOfMonth / daysInMonth) * 100;

    if (budgetUsed < expectedUsage - 10) {
      insights.push({
        type: 'success',
        icon: <Award className="w-5 h-5" />,
        title: 'On track with budget!',
        description: `You're spending less than expected for this point in the month.`,
        value: `${budgetUsed.toFixed(0)}% used`,
      });
    }
  }

  // 5. Savings tips based on patterns
  if (currentByCategory['Food & Dining'] > 500) {
    insights.push({
      type: 'tip',
      icon: <Zap className="w-5 h-5" />,
      title: 'Tip: Reduce dining expenses',
      description: 'Consider meal prepping to save on food costs.',
    });
  }

  if (currentByCategory['Entertainment'] > 200) {
    insights.push({
      type: 'tip',
      icon: <Zap className="w-5 h-5" />,
      title: 'Tip: Entertainment savings',
      description: 'Look for free events or subscription alternatives.',
    });
  }

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return {
          bg: darkMode ? 'bg-red-900/30' : 'bg-red-50',
          border: darkMode ? 'border-red-800' : 'border-red-200',
          icon: 'text-red-500',
          text: darkMode ? 'text-red-300' : 'text-red-700',
        };
      case 'success':
        return {
          bg: darkMode ? 'bg-green-900/30' : 'bg-green-50',
          border: darkMode ? 'border-green-800' : 'border-green-200',
          icon: 'text-green-500',
          text: darkMode ? 'text-green-300' : 'text-green-700',
        };
      case 'info':
        return {
          bg: darkMode ? 'bg-blue-900/30' : 'bg-blue-50',
          border: darkMode ? 'border-blue-800' : 'border-blue-200',
          icon: 'text-blue-500',
          text: darkMode ? 'text-blue-300' : 'text-blue-700',
        };
      case 'tip':
        return {
          bg: darkMode ? 'bg-purple-900/30' : 'bg-purple-50',
          border: darkMode ? 'border-purple-800' : 'border-purple-200',
          icon: 'text-purple-500',
          text: darkMode ? 'text-purple-300' : 'text-purple-700',
        };
    }
  };

  if (insights.length === 0) {
    return (
      <div className={`${bgCard} rounded-2xl shadow-lg p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${textPrimary}`}>
          💡 Spending Insights
        </h3>
        <p className={textSecondary}>
          Add more transactions to see personalized spending insights and tips.
        </p>
      </div>
    );
  }

  return (
    <div className={`${bgCard} rounded-2xl shadow-lg p-6`}>
      <h3 className={`text-lg font-semibold mb-4 ${textPrimary}`}>
        💡 Spending Insights
      </h3>
      <div className="space-y-3">
        {insights.slice(0, 5).map((insight, index) => {
          const styles = getInsightStyles(insight.type);
          return (
            <div
              key={index}
              className={`p-4 rounded-xl border ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${styles.icon}`}>{insight.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`font-medium ${styles.text}`}>{insight.title}</h4>
                    {insight.value && (
                      <span className={`text-sm font-semibold ${styles.text}`}>
                        {insight.value}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${textSecondary}`}>{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpendingInsights;
