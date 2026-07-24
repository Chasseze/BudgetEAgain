import React from "react";
import { Calendar, Clock, Target, TrendingUp } from "lucide-react";

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

interface UpcomingGoalCardProps {
  goals: SavingsGoal[];
  darkMode: boolean;
  currencySymbol?: string;
  onViewGoals?: () => void;
}

const UpcomingGoalCard: React.FC<UpcomingGoalCardProps> = ({
  goals,
  darkMode,
  currencySymbol = "$",
  onViewGoals,
}) => {
  const bgCard = darkMode
    ? "bg-gray-800/80 backdrop-blur-sm"
    : "bg-white/80 backdrop-blur-sm";
  const textPrimary = darkMode ? "text-white" : "text-gray-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-600";
  const borderColor = darkMode ? "border-gray-700" : "border-gray-200";

  // Find the goal with the nearest deadline that isn't completed
  const getUpcomingGoal = (): SavingsGoal | null => {
    const incompleteGoals = goals.filter(
      (g) => g.currentAmount < g.targetAmount,
    );

    if (incompleteGoals.length === 0) return null;

    return incompleteGoals.sort(
      (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    )[0];
  };

  const getDaysRemaining = (deadline: string): number => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const upcomingGoal = getUpcomingGoal();

  if (!upcomingGoal) {
    return (
      <div
        className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-5 transition-all duration-300 card-hover border ${borderColor}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            className={`text-base md:text-lg font-semibold ${textPrimary} flex items-center gap-2`}
          >
            <Clock className="w-4 h-4" />
            Upcoming Goal
          </h3>
          {onViewGoals && (
            <button
              onClick={onViewGoals}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all →
            </button>
          )}
        </div>
        <div className="text-center py-4">
          <div
            className={`inline-flex p-3 rounded-full mb-3 ${
              darkMode ? "bg-gray-700/50" : "bg-gray-100"
            }`}
          >
            <Target className="w-6 h-6 opacity-50" />
          </div>
          <p className={`text-sm ${textSecondary}`}>
            All goals completed! Create a new goal to stay on track.
          </p>
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(upcomingGoal.deadline);
  const percentage =
    upcomingGoal.targetAmount > 0
      ? Math.min(
          100,
          (upcomingGoal.currentAmount / upcomingGoal.targetAmount) * 100,
        )
      : 0;
  const remaining = upcomingGoal.targetAmount - upcomingGoal.currentAmount;

  // Determine urgency color
  const getUrgencyColor = () => {
    if (daysRemaining < 0) return "text-red-500";
    if (daysRemaining < 7) return "text-orange-500";
    if (daysRemaining < 30) return "text-yellow-500";
    return "text-green-500";
  };

  const getUrgencyBg = () => {
    if (daysRemaining < 0) return darkMode ? "bg-red-900/30" : "bg-red-50";
    if (daysRemaining < 7)
      return darkMode ? "bg-orange-900/30" : "bg-orange-50";
    if (daysRemaining < 30)
      return darkMode ? "bg-yellow-900/30" : "bg-yellow-50";
    return darkMode ? "bg-green-900/30" : "bg-green-50";
  };

  return (
    <div
      className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-5 transition-all duration-300 card-hover border ${borderColor}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className={`text-base md:text-lg font-semibold ${textPrimary} flex items-center gap-2`}
        >
          <Clock className="w-4 h-4" />
          Upcoming Goal
        </h3>
        {onViewGoals && (
          <button
            onClick={onViewGoals}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Manage →
          </button>
        )}
      </div>

      {/* Goal Name and Days remaining on same line */}
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-semibold ${textPrimary} truncate flex-1 mr-2`}>
          {upcomingGoal.name}
        </h4>
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${getUrgencyBg()} ${getUrgencyColor()}`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {daysRemaining < 0
            ? `${Math.abs(daysRemaining)} days overdue`
            : daysRemaining === 0
              ? "Due today"
              : daysRemaining === 1
                ? "1 day left"
                : `${daysRemaining} days left`}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className={textSecondary}>
            {currencySymbol}
            {formatCurrency(upcomingGoal.currentAmount)} of {currencySymbol}
            {formatCurrency(upcomingGoal.targetAmount)}
          </span>
          <span className={textSecondary}>{percentage.toFixed(0)}%</span>
        </div>
        <div
          className={`h-2 rounded-full overflow-hidden ${
            darkMode ? "bg-gray-700" : "bg-gray-200"
          }`}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${percentage}%`,
              backgroundColor: upcomingGoal.color,
            }}
          />
        </div>
      </div>

      {/* Remaining amount and Due date on same line */}
      <div
        className={`flex items-center justify-between text-xs pt-2 border-t ${borderColor}`}
      >
        <div className={`flex items-center gap-2 ${textSecondary}`}>
          <TrendingUp className="w-3.5 h-3.5" />
          <span>
            <span className={textPrimary}>
              {currencySymbol}
              {formatCurrency(remaining)}
            </span>{" "}
            more to reach your goal
          </span>
        </div>
        <span className={`${getUrgencyColor()} font-medium`}>
          Due {formatDate(upcomingGoal.deadline)}
        </span>
      </div>
    </div>
  );
};

export default UpcomingGoalCard;
