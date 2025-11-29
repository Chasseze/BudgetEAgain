import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

interface OverviewCardsProps {
  totalIncome: number;
  totalExpenses: number;
  remaining: number;
  budgetUsedPercent: number;
  darkMode: boolean;
}

const OverviewCards: React.FC<OverviewCardsProps> = ({
  totalIncome,
  totalExpenses,
  remaining,
  budgetUsedPercent,
  darkMode,
}) => {
  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      {/* Income Card */}
      <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg p-4 md:p-6 text-white transform transition-transform hover:scale-105">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>
        <p className="text-green-100 text-xs md:text-sm mb-1">Total Income</p>
        <p className="text-xl md:text-2xl lg:text-3xl font-bold truncate">
          ${formatAmount(totalIncome)}
        </p>
      </div>

      {/* Expenses Card */}
      <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-xl shadow-lg p-4 md:p-6 text-white transform transition-transform hover:scale-105">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <TrendingDown className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>
        <p className="text-red-100 text-xs md:text-sm mb-1">Total Expenses</p>
        <p className="text-xl md:text-2xl lg:text-3xl font-bold truncate">
          ${formatAmount(totalExpenses)}
        </p>
      </div>

      {/* Remaining Card */}
      <div
        className={`bg-gradient-to-br ${
          remaining >= 0
            ? 'from-blue-400 to-blue-600'
            : 'from-orange-400 to-orange-600'
        } rounded-xl shadow-lg p-4 md:p-6 text-white transform transition-transform hover:scale-105`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>
        <p className="text-blue-100 text-xs md:text-sm mb-1">Remaining</p>
        <p className="text-xl md:text-2xl lg:text-3xl font-bold truncate">
          {remaining < 0 ? '-' : ''}${formatAmount(Math.abs(remaining))}
        </p>
      </div>

      {/* Budget Used Card */}
      <div
        className={`bg-gradient-to-br ${
          budgetUsedPercent > 100
            ? 'from-red-400 to-red-600'
            : budgetUsedPercent > 80
            ? 'from-yellow-400 to-yellow-600'
            : 'from-purple-400 to-purple-600'
        } rounded-xl shadow-lg p-4 md:p-6 text-white transform transition-transform hover:scale-105`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>
        <p className="text-purple-100 text-xs md:text-sm mb-1">Budget Used</p>
        <p className="text-xl md:text-2xl lg:text-3xl font-bold">
          {Math.min(budgetUsedPercent, 999).toFixed(0)}%
        </p>
        {/* Progress bar */}
        <div className="w-full bg-white/30 rounded-full h-2 mt-2 overflow-hidden">
          <div
            className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default OverviewCards;
