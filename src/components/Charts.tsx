import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';

// Types
interface CategoryExpense {
  name: string;
  value: number;
  budget: number;
  color: string;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

interface TrendData {
  date: string;
  amount: number;
}

// Props interfaces
interface PieChartProps {
  data: CategoryExpense[];
  darkMode: boolean;
}

interface BarChartProps {
  data: MonthlyData[];
  darkMode: boolean;
}

interface AreaChartProps {
  data: TrendData[];
  darkMode: boolean;
  color?: string;
  title?: string;
}

interface CategoryBudgetChartProps {
  data: CategoryExpense[];
  darkMode: boolean;
}

// Chart colors
const CHART_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
];

// Custom tooltip styling
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
  darkMode: boolean;
}> = ({ active, payload, label, darkMode }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className={`px-4 py-3 rounded-lg shadow-lg ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
      >
        {label && <p className="font-medium mb-1">{label}</p>}
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value?.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Pie Chart for Category Expenses
export const ExpensesPieChart: React.FC<PieChartProps> = ({ data, darkMode }) => {
  if (data.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-64 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        <div className="text-5xl mb-3">📊</div>
        <p className="text-lg font-medium">No expense data</p>
        <p className="text-sm">Start tracking to see your spending breakdown</p>
      </div>
    );
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    // name,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label if less than 5%

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={100}
          innerRadius={40}
          fill="#8884d8"
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
              stroke={darkMode ? '#1f2937' : '#fff'}
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => (
            <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Bar Chart for Income vs Expenses
export const IncomeExpenseBarChart: React.FC<BarChartProps> = ({
  data,
  darkMode,
}) => {
  if (data.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-64 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        <div className="text-5xl mb-3">📈</div>
        <p className="text-lg font-medium">No data available</p>
        <p className="text-sm">Add transactions to see your monthly comparison</p>
      </div>
    );
  }

  // Format month labels
  const formattedData = data.map((item) => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString('en-US', {
      month: 'short',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={formattedData}
        margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={darkMode ? '#374151' : '#e5e7eb'}
          vertical={false}
        />
        <XAxis
          dataKey="monthLabel"
          tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: darkMode ? '#374151' : '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
        />
        <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          formatter={(value) => (
            <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </span>
          )}
        />
        <Bar
          dataKey="income"
          fill="#4ade80"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          dataKey="expenses"
          fill="#f87171"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Area Chart for Spending Trends
export const SpendingTrendChart: React.FC<AreaChartProps> = ({
  data,
  darkMode,
  color = '#6366f1',
  // title,
}) => {
  if (data.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-48 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        <p className="text-sm">No trend data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={darkMode ? '#374151' : '#e5e7eb'}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${color})`}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Category Budget Progress Chart
export const CategoryBudgetChart: React.FC<CategoryBudgetChartProps> = ({
  data,
  darkMode,
}) => {
  if (data.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-48 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        <p className="text-sm">No budget data available</p>
      </div>
    );
  }

  // Calculate percentage for each category
  const budgetData = data
    .filter((item) => item.budget > 0)
    .map((item) => ({
      name: item.name,
      spent: item.value,
      budget: item.budget,
      percentage: Math.min((item.value / item.budget) * 100, 100),
      remaining: Math.max(item.budget - item.value, 0),
      color: item.color,
    }));

  if (budgetData.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-48 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        <p className="text-sm">Set category budgets in settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {budgetData.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              {item.name}
            </span>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              ${item.spent.toFixed(0)} / ${item.budget.toFixed(0)}
            </span>
          </div>
          <div
            className={`h-3 rounded-full overflow-hidden ${
              darkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${item.percentage}%`,
                backgroundColor:
                  item.percentage >= 100
                    ? '#ef4444'
                    : item.percentage >= 80
                    ? '#f59e0b'
                    : item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Summary Stats Component
interface SummaryStatsProps {
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
  averageExpense: number;
  darkMode: boolean;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({
  totalIncome,
  totalExpenses,
  transactionCount,
  averageExpense,
  darkMode,
}) => {
  const stats = [
    {
      label: 'Total Income',
      value: `$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      color: 'text-green-500',
    },
    {
      label: 'Total Expenses',
      value: `$${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      color: 'text-red-500',
    },
    {
      label: 'Transactions',
      value: transactionCount.toString(),
      color: darkMode ? 'text-indigo-400' : 'text-indigo-600',
    },
    {
      label: 'Avg. Expense',
      value: `$${averageExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      color: darkMode ? 'text-purple-400' : 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`p-4 rounded-xl ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}
        >
          <p
            className={`text-xs md:text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {stat.label}
          </p>
          <p className={`text-lg md:text-xl font-bold ${stat.color}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
};

export default {
  ExpensesPieChart,
  IncomeExpenseBarChart,
  SpendingTrendChart,
  CategoryBudgetChart,
  SummaryStats,
};
