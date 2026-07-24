import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, TrendingDown, TrendingUp, Target } from 'lucide-react';

interface QuickAddFABProps {
  darkMode: boolean;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onAddGoal: () => void;
}

const QuickAddFAB: React.FC<QuickAddFABProps> = ({
  darkMode,
  onAddExpense,
  onAddIncome,
  onAddGoal,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const actions = [
    {
      label: 'Add Expense',
      icon: <TrendingDown className="w-4 h-4" />,
      color: 'bg-red-500 hover:bg-red-600',
      onClick: () => { setOpen(false); onAddExpense(); },
    },
    {
      label: 'Add Income',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'bg-emerald-500 hover:bg-emerald-600',
      onClick: () => { setOpen(false); onAddIncome(); },
    },
    {
      label: 'New Goal',
      icon: <Target className="w-4 h-4" />,
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => { setOpen(false); onAddGoal(); },
    },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 right-5 md:bottom-8 z-40 flex flex-col items-end gap-3"
    >
      {/* Action buttons — slide up when open */}
      <div
        className={`flex flex-col items-end gap-2 transition-all duration-200 origin-bottom ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`${action.color} text-white flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full shadow-lg transition-all duration-150 text-sm font-medium whitespace-nowrap hover:scale-105 active:scale-95`}
            aria-label={action.label}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close quick add menu' : 'Quick add'}
        aria-expanded={open}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${
          open
            ? darkMode
              ? 'bg-gray-700 text-white'
              : 'bg-gray-200 text-gray-700'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
        }`}
      >
        <span
          className={`transition-transform duration-300 ${open ? 'rotate-45' : 'rotate-0'}`}
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </span>
      </button>
    </div>
  );
};

export default QuickAddFAB;
