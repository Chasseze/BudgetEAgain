import React from 'react';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  darkMode?: boolean;
  showPercentage?: boolean;
  children?: React.ReactNode;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#6366f1',
  darkMode = false,
  showPercentage = false,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const offset = circumference - (clampedProgress / 100) * circumference;

  // Determine color based on progress if not specified
  const getProgressColor = () => {
    if (color !== '#6366f1') return color;
    if (clampedProgress >= 100) return '#ef4444'; // red
    if (clampedProgress >= 80) return '#f59e0b'; // yellow
    return '#6366f1'; // indigo
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={darkMode ? '#374151' : '#e5e7eb'}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children ? (
          children
        ) : showPercentage ? (
          <span
            className={`text-sm font-semibold ${
              darkMode ? 'text-white' : 'text-gray-700'
            }`}
          >
            {Math.round(clampedProgress)}%
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default ProgressRing;
