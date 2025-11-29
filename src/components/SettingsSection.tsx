import React, { useState } from 'react';
import { DollarSign, Save, RotateCcw, Download, Trash2, Bell, Palette } from 'lucide-react';

interface SettingsSectionProps {
  budgetLimit: number;
  setBudgetLimit: (limit: number) => void;
  categoryBudgets: Record<string, number>;
  setCategoryBudgets: (budgets: Record<string, number>) => void;
  darkMode: boolean;
  onExportData: () => void;
  onClearData: () => void;
  onShowToast: (message: string) => void;
}

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Shopping',
  'Healthcare',
  'Education',
  'Other',
];

const SettingsSection: React.FC<SettingsSectionProps> = ({
  budgetLimit,
  setBudgetLimit,
  categoryBudgets,
  setCategoryBudgets,
  darkMode,
  onExportData,
  onClearData,
  onShowToast,
}) => {
  const [localBudgetLimit, setLocalBudgetLimit] = useState(budgetLimit.toString());
  const [localCategoryBudgets, setLocalCategoryBudgets] = useState<Record<string, string>>(
    Object.fromEntries(
      EXPENSE_CATEGORIES.map((cat) => [cat, (categoryBudgets[cat] || 0).toString()])
    )
  );
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Styling classes
  const bgCard = darkMode ? 'bg-gray-800' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const inputBg = darkMode
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-300 text-gray-900';

  const handleSaveBudgetLimit = () => {
    const value = parseFloat(localBudgetLimit);
    if (!isNaN(value) && value >= 0) {
      setBudgetLimit(value);
      onShowToast('Budget limit saved!');
    } else {
      onShowToast('Please enter a valid amount');
    }
  };

  const handleSaveCategoryBudgets = () => {
    const newBudgets: Record<string, number> = {};
    let isValid = true;

    EXPENSE_CATEGORIES.forEach((cat) => {
      const value = parseFloat(localCategoryBudgets[cat] || '0');
      if (isNaN(value) || value < 0) {
        isValid = false;
      } else {
        newBudgets[cat] = value;
      }
    });

    if (isValid) {
      setCategoryBudgets(newBudgets);
      onShowToast('Category budgets saved!');
    } else {
      onShowToast('Please enter valid amounts for all categories');
    }
  };

  const handleResetCategoryBudgets = () => {
    const defaultBudgets: Record<string, string> = {
      'Food & Dining': '500',
      'Transportation': '300',
      'Entertainment': '200',
      'Bills & Utilities': '400',
      'Shopping': '300',
      'Healthcare': '200',
      'Education': '150',
      'Other': '100',
    };
    setLocalCategoryBudgets(defaultBudgets);
  };

  const handleClearAllData = () => {
    onClearData();
    setShowClearConfirm(false);
    onShowToast('All data has been cleared');
  };

  return (
    <div className="space-y-6">
      {/* Monthly Budget Limit */}
      <div className={`${bgCard} rounded-2xl shadow-lg p-6 transition-colors duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
            <DollarSign className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Monthly Budget Limit</h3>
            <p className={`text-sm ${textSecondary}`}>Set your overall spending limit</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary}`}>$</span>
            <input
              type="number"
              value={localBudgetLimit}
              onChange={(e) => setLocalBudgetLimit(e.target.value)}
              min="0"
              step="100"
              className={`w-full pl-8 pr-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${inputBg}`}
              placeholder="2500"
            />
          </div>
          <button
            onClick={handleSaveBudgetLimit}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>

      {/* Category Budgets */}
      <div className={`${bgCard} rounded-2xl shadow-lg p-6 transition-colors duration-300`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
              <Palette className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${textPrimary}`}>Category Budgets</h3>
              <p className={`text-sm ${textSecondary}`}>Set limits for each spending category</p>
            </div>
          </div>
          <button
            onClick={handleResetCategoryBudgets}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
            title="Reset to defaults"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {EXPENSE_CATEGORIES.map((category) => (
            <div key={category}>
              <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                {category}
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`}>
                  $
                </span>
                <input
                  type="number"
                  value={localCategoryBudgets[category] || ''}
                  onChange={(e) =>
                    setLocalCategoryBudgets((prev) => ({
                      ...prev,
                      [category]: e.target.value,
                    }))
                  }
                  min="0"
                  step="50"
                  className={`w-full pl-7 pr-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm ${inputBg}`}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveCategoryBudgets}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Category Budgets
        </button>
      </div>

      {/* Notifications */}
      <div className={`${bgCard} rounded-2xl shadow-lg p-6 transition-colors duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-yellow-900/50' : 'bg-yellow-100'}`}>
            <Bell className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Budget Alerts</h3>
            <p className={`text-sm ${textSecondary}`}>Get notified when approaching limits</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${textPrimary}`}>Enable Alerts</p>
              <p className={`text-sm ${textSecondary}`}>Show warnings at 80% of budget</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className={`${bgCard} rounded-2xl shadow-lg p-6 transition-colors duration-300`}>
        <h3 className={`text-lg font-semibold mb-4 ${textPrimary}`}>Data Management</h3>

        <div className="space-y-3">
          <button
            onClick={onExportData}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Download className="w-5 h-5" />
            Export Data as CSV
          </button>

          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                darkMode
                  ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              <Trash2 className="w-5 h-5" />
              Clear All Data
            </button>
          ) : (
            <div className={`p-4 rounded-xl border-2 ${darkMode ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
              <p className={`text-sm mb-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                Are you sure? This will permanently delete all your transactions, goals, and settings.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                    darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAllData}
                  className="flex-1 py-2 px-4 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700"
                >
                  Delete Everything
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* App Info */}
      <div className={`text-center py-4 ${textSecondary}`}>
        <p className="text-sm">Budget Tracker v1.0.0</p>
        <p className="text-xs mt-1">Built with React & Tailwind CSS</p>
      </div>
    </div>
  );
};

export default SettingsSection;
