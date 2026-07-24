import React, { useEffect, useRef } from 'react';
import { Award } from 'lucide-react';

interface HealthScoreProps {
  totalIncome: number;
  totalExpenses: number;
  budgetLimit: number;
  goals: { currentAmount: number; targetAmount: number }[];
  darkMode: boolean;
}

function computeScore(
  income: number,
  expenses: number,
  budgetLimit: number,
  goals: { currentAmount: number; targetAmount: number }[],
): number {
  // Savings rate component (30%)
  const savingsRate = income > 0 ? Math.max(0, (income - expenses) / income) : 0;
  const savingsScore = Math.min(savingsRate * 1.5, 1); // max score at 67% savings rate

  // Budget adherence (40%) — 1 if under budget, 0 if at 2× budget
  const budgetAdherence =
    budgetLimit > 0 ? Math.max(0, 1 - expenses / budgetLimit) : expenses === 0 ? 1 : 0;

  // Goal progress (30%)
  const goalScore =
    goals.length > 0
      ? goals.reduce((sum, g) => {
          const pct = g.targetAmount > 0 ? Math.min(1, g.currentAmount / g.targetAmount) : 0;
          return sum + pct;
        }, 0) / goals.length
      : 0.5; // neutral if no goals

  const raw = savingsScore * 30 + budgetAdherence * 40 + goalScore * 30;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: '#10b981' };
  if (score >= 60) return { label: 'Good', color: '#6366f1' };
  if (score >= 40) return { label: 'Fair', color: '#f59e0b' };
  return { label: 'Needs work', color: '#ef4444' };
}

const HealthScore: React.FC<HealthScoreProps> = ({
  totalIncome,
  totalExpenses,
  budgetLimit,
  goals,
  darkMode,
}) => {
  const score = computeScore(totalIncome, totalExpenses, budgetLimit, goals);
  const { label, color } = scoreLabel(score);

  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';

  // SVG arc gauge
  const radius = 52;
  const circumference = Math.PI * radius; // half circle
  const arcRef = useRef<SVGPathElement>(null);

  const pct = score / 100;
  const dashLength = circumference * pct;
  const gapLength = circumference - dashLength;

  useEffect(() => {
    const el = arcRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.strokeDashoffset = String(circumference);
    // force reflow
    void el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)';
    el.style.strokeDashoffset = String(circumference - dashLength);
  }, [score, circumference, dashLength]);

  const savingsRate =
    totalIncome > 0
      ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(0)
      : '0';
  const budgetAdherencePct =
    budgetLimit > 0
      ? Math.max(0, Math.min(100, 100 - (totalExpenses / budgetLimit) * 100)).toFixed(0)
      : '—';
  const avgGoalPct =
    goals.length > 0
      ? (
          (goals.reduce((s, g) => s + (g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0), 0) /
            goals.length) *
          100
        ).toFixed(0)
      : '—';

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-indigo-500" />
        <h3 className={`text-base font-semibold ${textPrimary}`}>Financial Health Score</h3>
      </div>

      {/* Gauge */}
      <div className="flex flex-col items-center mb-4">
        <svg width="140" height="80" viewBox="0 0 140 80" aria-label={`Health score: ${score}`}>
          {/* Track */}
          <path
            d="M 10 74 A 60 60 0 0 1 130 74"
            fill="none"
            stroke={darkMode ? '#374151' : '#e5e7eb'}
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Animated fill */}
          <path
            ref={arcRef}
            d="M 10 74 A 60 60 0 0 1 130 74"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${dashLength} ${gapLength}`}
            strokeDashoffset={circumference - dashLength}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
          />
          {/* Score text */}
          <text
            x="70"
            y="64"
            textAnchor="middle"
            fontSize="26"
            fontWeight="bold"
            fill={color}
          >
            {score}
          </text>
        </svg>
        <span className="text-sm font-semibold mt-1" style={{ color }}>
          {label}
        </span>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className={textSecondary}>Savings rate</span>
          <span className={`font-semibold ${textPrimary}`}>{savingsRate}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className={textSecondary}>Budget adherence</span>
          <span className={`font-semibold ${textPrimary}`}>
            {budgetAdherencePct === '—' ? '—' : `${budgetAdherencePct}%`}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className={textSecondary}>Avg goal progress</span>
          <span className={`font-semibold ${textPrimary}`}>
            {avgGoalPct === '—' ? '—' : `${avgGoalPct}%`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HealthScore;
