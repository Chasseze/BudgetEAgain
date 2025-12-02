import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import ProgressRing from './ProgressRing';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

interface GoalsSectionProps {
  goals: SavingsGoal[];
  onAddGoal: () => void;
  onEditGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (id: string) => void;
  onUpdateProgress: (id: string, amount: number) => void;
  darkMode: boolean;
}

const QUICK_ADD_AMOUNTS = [10, 25, 50, 100];

const GoalsSection: React.FC<GoalsSectionProps> = ({
  goals,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
  onUpdateProgress,
  darkMode,
}) => {
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<Record<string, string>>({});

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (deadline: string): number => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return '#22c55e'; // green
    if (percentage >= 75) return '#4ade80'; // light green
    if (percentage >= 50) return '#fbbf24'; // yellow
    if (percentage >= 25) return '#fb923c'; // orange
    return '#ef4444'; // red
  };

  const handleQuickAdd = (goalId: string, amount: number) => {
    onUpdateProgress(goalId, amount);
  };

  const handleCustomAdd = (goalId: string) => {
    const amount = parseFloat(customAmount[goalId] || '0');
    if (amount > 0) {
      onUpdateProgress(goalId, amount);
      setCustomAmount((prev) => ({ ...prev, [goalId]: '' }));
    }
  };

  const bgCard = darkMode ? 'bg-gray-800' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const inputBg = darkMode
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-300 text-gray-900';

  if (goals.length === 0) {
    return (
      <div className={`${bgCard} rounded-2xl shadow-xl p-8 text-center`}>
        <div className="text-6xl mb-4">🎯</div>
        <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>
          No savings goals yet
        </h3>
        <p className={`${textSecondary} mb-6`}>
          Start setting goals to track your progress towards financial milestones
        </p>
        <button
          onClick={onAddGoal}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Your First Goal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className={`text-xl md:text-2xl font-bold ${textPrimary}`}>
            Savings Goals
          </h2>
          <p className={`text-sm ${textSecondary}`}>
            Track your progress towards financial goals
          </p>
        </div>
        <button
          onClick={onAddGoal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Goal</span>
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const percentage = (goal.currentAmount / goal.targetAmount) * 100;
          const daysRemaining = getDaysRemaining(goal.deadline);
          const isExpanded = expandedGoal === goal.id;
          const isCompleted = goal.currentAmount >= goal.targetAmount;

          return (
            <div
              key={goal.id}
              className={`${bgCard} rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ${
                isCompleted ? 'ring-2 ring-green-500' : ''
              }`}
            >
              {/* Goal Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Progress Ring */}
                  <div className="flex-shrink-0">
                    <ProgressRing
                      progress={percentage}
                      size={70}
                      strokeWidth={6}
                      color={goal.color || getProgressColor(percentage)}
                      darkMode={darkMode}
                    >
                      <span
                        className={`text-xs font-bold ${textPrimary}`}
                      >
                        {Math.min(percentage, 100).toFixed(0)}%
                      </span>
                    </ProgressRing>
                  </div>

                  {/* Goal Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold ${textPrimary} truncate`}>
                        {goal.name}
                      </h3>
                      {isCompleted && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Complete! 🎉
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm mb-2">
                      <span className={textSecondary}>
                        ${formatCurrency(goal.currentAmount)}
                      </span>
                      <span className={textSecondary}>/</span>
                      <span className={textPrimary} style={{ color: goal.color }}>
                        ${formatCurrency(goal.targetAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span
                        className={`flex items-center gap-1 ${
                          daysRemaining < 0
                            ? 'text-red-500'
                            : daysRemaining < 30
                            ? 'text-yellow-500'
                            : textSecondary
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {daysRemaining < 0
                          ? `${Math.abs(daysRemaining)} days overdue`
                          : `${daysRemaining} days left`}
                      </span>
                      <span className={textSecondary}>
                        Due {formatDate(goal.deadline)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditGoal(goal);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'hover:bg-gray-700 text-gray-400'
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                      title="Edit goal"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteGoal(goal.id);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'hover:bg-red-900/50 text-gray-400 hover:text-red-400'
                          : 'hover:bg-red-50 text-gray-500 hover:text-red-500'
                      }`}
                      title="Delete goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  className={`mt-3 h-2 rounded-full overflow-hidden ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: goal.color || getProgressColor(percentage),
                    }}
                  />
                </div>
              </div>

              {/* Expanded Section - Quick Add */}
              {isExpanded && !isCompleted && (
                <div
                  className={`px-4 pb-4 pt-2 border-t ${borderColor} animate-fade-in`}
                >
                  <p className={`text-sm ${textSecondary} mb-3`}>
                    Quick add to this goal:
                  </p>

                  {/* Quick Add Buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {QUICK_ADD_AMOUNTS.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleQuickAdd(goal.id, amount)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          darkMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        +${amount}
                      </button>
                    ))}
                  </div>

                  {/* Custom Amount */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span
                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        value={customAmount[goal.id] || ''}
                        onChange={(e) =>
                          setCustomAmount((prev) => ({
                            ...prev,
                            [goal.id]: e.target.value,
                          }))
                        }
                        placeholder="Custom amount"
                        className={`w-full pl-7 pr-4 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <button
                      onClick={() => handleCustomAdd(goal.id)}
                      disabled={!customAmount[goal.id] || parseFloat(customAmount[goal.id]) <= 0}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>

                  {/* Withdraw Option */}
                  <button
                    onClick={() => handleQuickAdd(goal.id, -10)}
                    className={`mt-3 text-sm ${
                      darkMode
                        ? 'text-gray-500 hover:text-gray-400'
                        : 'text-gray-400 hover:text-gray-600'
                    } transition-colors`}
                  >
                    Withdraw $10 from goal
                  </button>
                </div>
              )}

              {/* Completed Message */}
              {isExpanded && isCompleted && (
                <div
                  className={`px-4 pb-4 pt-2 border-t ${borderColor} text-center`}
                >
                  <div className="text-4xl mb-2">🎉</div>
                  <p className={`font-medium ${textPrimary}`}>
                    Congratulations! You've reached your goal!
                  </p>
                  <p className={`text-sm ${textSecondary} mt-1`}>
                    You saved ${formatCurrency(goal.currentAmount)} in total
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div
        className={`${bgCard} rounded-xl shadow-lg p-4 mt-6 ${borderColor} border`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className={`text-sm ${textSecondary}`}>Total Goals</p>
            <p className={`text-xl font-bold ${textPrimary}`}>{goals.length}</p>
          </div>
          <div>
            <p className={`text-sm ${textSecondary}`}>Total Saved</p>
            <p className="text-xl font-bold text-green-500">
              ${formatCurrency(goals.reduce((sum, g) => sum + g.currentAmount, 0))}
            </p>
          </div>
          <div>
            <p className={`text-sm ${textSecondary}`}>Total Target</p>
            <p className={`text-xl font-bold ${textPrimary}`}>
              ${formatCurrency(goals.reduce((sum, g) => sum + g.targetAmount, 0))}
            </p>
          </div>
          <div>
            <p className={`text-sm ${textSecondary}`}>Completed</p>
            <p className="text-xl font-bold text-indigo-500">
              {goals.filter((g) => g.currentAmount >= g.targetAmount).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalsSection;
