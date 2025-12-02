import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Save, 
  RotateCcw, 
  Download, 
  Trash2, 
  Bell, 
  Palette,
  Globe,
  Plus,
  X,
  Mail
} from 'lucide-react';
import { CURRENCIES, DEFAULT_CURRENCY, COLORS } from '../config/constants';

interface UserSettings {
  currency: string;
  emailReports: boolean;
  reportEmail: string;
  customExpenseCategories: { name: string; color: string; budget?: number }[];
  customIncomeCategories: { name: string; color: string }[];
}

interface SettingsSectionProps {
  budgetLimit: number;
  setBudgetLimit: (limit: number) => void;
  categoryBudgets: Record<string, number>;
  setCategoryBudgets: (budgets: Record<string, number>) => void;
  darkMode: boolean;
  onExportData: () => void;
  onClearData: () => void;
  onShowToast: (message: string) => void;
  userSettings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  expenseCategories: string[];
  incomeCategories: string[];
}

const DEFAULT_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Shopping',
  'Healthcare',
  'Education',
  'Other',
];

const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
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
  userSettings,
  onUpdateSettings,
  expenseCategories,
  incomeCategories,
}) => {
  const [localBudgetLimit, setLocalBudgetLimit] = useState(budgetLimit.toString());
  const [localCategoryBudgets, setLocalCategoryBudgets] = useState<Record<string, string>>(
    Object.fromEntries(
      expenseCategories.map((cat) => [cat, (categoryBudgets[cat] || 0).toString()])
    )
  );
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState(userSettings.currency || DEFAULT_CURRENCY);
  
  // Email reports state
  const [emailReports, setEmailReports] = useState(userSettings.emailReports || false);
  const [reportEmail, setReportEmail] = useState(userSettings.reportEmail || '');
  
  // Custom categories state
  const [showAddExpenseCategory, setShowAddExpenseCategory] = useState(false);
  const [showAddIncomeCategory, setShowAddIncomeCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(COLORS[0]);
  const [newCategoryBudget, setNewCategoryBudget] = useState('');

  // Update local state when props change
  useEffect(() => {
    setLocalCategoryBudgets(
      Object.fromEntries(
        expenseCategories.map((cat) => [cat, (categoryBudgets[cat] || 0).toString()])
      )
    );
  }, [expenseCategories, categoryBudgets]);

  useEffect(() => {
    setSelectedCurrency(userSettings.currency || DEFAULT_CURRENCY);
    setEmailReports(userSettings.emailReports || false);
    setReportEmail(userSettings.reportEmail || '');
  }, [userSettings]);

  // Styling classes
  const bgCard = darkMode ? 'bg-gray-800' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';
  const inputBg = darkMode
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-300 text-gray-900';

  const getCurrencySymbol = () => {
    const currency = CURRENCIES.find(c => c.code === selectedCurrency);
    return currency?.symbol || '$';
  };

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

    expenseCategories.forEach((cat) => {
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

  const handleCurrencyChange = (code: string) => {
    setSelectedCurrency(code);
    onUpdateSettings({ currency: code });
    onShowToast(`Currency changed to ${code}`);
  };

  const handleSaveEmailSettings = () => {
    onUpdateSettings({ 
      emailReports, 
      reportEmail 
    });
    onShowToast('Email settings saved!');
  };

  const handleAddCategory = (type: 'expense' | 'income') => {
    if (!newCategoryName.trim()) {
      onShowToast('Please enter a category name');
      return;
    }

    const existingCategories = type === 'expense' ? expenseCategories : incomeCategories;
    if (existingCategories.includes(newCategoryName.trim())) {
      onShowToast('Category already exists');
      return;
    }

    const newCategory = {
      name: newCategoryName.trim(),
      color: newCategoryColor,
      budget: type === 'expense' ? parseFloat(newCategoryBudget) || 0 : undefined,
    };

    if (type === 'expense') {
      const updated = [...(userSettings.customExpenseCategories || []), newCategory];
      onUpdateSettings({ customExpenseCategories: updated });
    } else {
      const updated = [...(userSettings.customIncomeCategories || []), { name: newCategory.name, color: newCategory.color }];
      onUpdateSettings({ customIncomeCategories: updated });
    }

    setNewCategoryName('');
    setNewCategoryColor(COLORS[0]);
    setNewCategoryBudget('');
    setShowAddExpenseCategory(false);
    setShowAddIncomeCategory(false);
    onShowToast(`${type === 'expense' ? 'Expense' : 'Income'} category added!`);
  };

  const handleDeleteCategory = (type: 'expense' | 'income', categoryName: string) => {
    if (type === 'expense') {
      const updated = (userSettings.customExpenseCategories || []).filter(c => c.name !== categoryName);
      onUpdateSettings({ customExpenseCategories: updated });
    } else {
      const updated = (userSettings.customIncomeCategories || []).filter(c => c.name !== categoryName);
      onUpdateSettings({ customIncomeCategories: updated });
    }
    onShowToast('Category deleted');
  };

  const isDefaultCategory = (categoryName: string, type: 'expense' | 'income') => {
    const defaults = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
    return defaults.includes(categoryName);
  };

  return (
    <div className="space-y-6">
      {/* Currency Selection */}
      <div className={`${bgCard} rounded-2xl shadow-lg p-6 transition-colors duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-green-900/50' : 'bg-green-100'}`}>
            <Globe className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Currency</h3>
            <p className={`text-sm ${textSecondary}`}>Select your preferred currency</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {CURRENCIES.map((currency) => (
            <button
              key={currency.code}
              onClick={() => handleCurrencyChange(currency.code)}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                selectedCurrency === currency.code
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                  : `border-transparent ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${selectedCurrency === currency.code ? 'text-indigo-600' : textPrimary}`}>
                  {currency.symbol}
                </span>
                <span className={`text-sm ${textSecondary}`}>{currency.code}</span>
              </div>
              <p className={`text-xs ${textSecondary} mt-1 truncate`}>{currency.name}</p>
            </button>
          ))}
        </div>
      </div>

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
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary}`}>{getCurrencySymbol()}</span>
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
          {expenseCategories.map((category) => (
            <div key={category}>
              <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                {category}
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`}>
                  {getCurrencySymbol()}
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

      {/* Custom Categories */}
      <div className={`${bgCard} rounded-2xl shadow-lg p-6 transition-colors duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-orange-900/50' : 'bg-orange-100'}`}>
            <Plus className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Custom Categories</h3>
            <p className={`text-sm ${textSecondary}`}>Add your own expense and income categories</p>
          </div>
        </div>

        {/* Expense Categories */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className={`font-medium ${textPrimary}`}>Expense Categories</h4>
            <button
              onClick={() => setShowAddExpenseCategory(!showAddExpenseCategory)}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          </div>

          {showAddExpenseCategory && (
            <div className={`p-4 rounded-xl mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${inputBg}`}
                />
                <input
                  type="number"
                  placeholder="Budget (optional)"
                  value={newCategoryBudget}
                  onChange={(e) => setNewCategoryBudget(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${inputBg}`}
                />
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${textSecondary}`}>Color:</span>
                  <div className="flex gap-1 flex-wrap">
                    {COLORS.slice(0, 8).map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewCategoryColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform ${newCategoryColor === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddCategory('expense')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Add Category
                </button>
                <button
                  onClick={() => setShowAddExpenseCategory(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {expenseCategories.map((cat) => (
              <div
                key={cat}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
              >
                <span className={`text-sm ${textPrimary}`}>{cat}</span>
                {!isDefaultCategory(cat, 'expense') && (
                  <button
                    onClick={() => handleDeleteCategory('expense', cat)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Income Categories */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`font-medium ${textPrimary}`}>Income Categories</h4>
            <button
              onClick={() => setShowAddIncomeCategory(!showAddIncomeCategory)}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          </div>

          {showAddIncomeCategory && (
            <div className={`p-4 rounded-xl mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${inputBg}`}
                />
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${textSecondary}`}>Color:</span>
                  <div className="flex gap-1 flex-wrap">
                    {COLORS.slice(0, 8).map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewCategoryColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform ${newCategoryColor === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddCategory('income')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Add Category
                </button>
                <button
                  onClick={() => setShowAddIncomeCategory(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {incomeCategories.map((cat) => (
              <div
                key={cat}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
              >
                <span className={`text-sm ${textPrimary}`}>{cat}</span>
                {!isDefaultCategory(cat, 'income') && (
                  <button
                    onClick={() => handleDeleteCategory('income', cat)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Email Reports */}
      <div className={`${bgCard} rounded-2xl shadow-lg p-6 transition-colors duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
            <Mail className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Monthly Reports</h3>
            <p className={`text-sm ${textSecondary}`}>Receive spending summaries via email</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-medium ${textPrimary}`}>Enable Monthly Reports</p>
                <p className={`text-sm ${textSecondary}`}>Get a summary on the 1st of each month</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={emailReports}
                  onChange={(e) => setEmailReports(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {emailReports && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={`w-full px-4 py-2 rounded-lg border ${inputBg}`}
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSaveEmailSettings}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Email Settings
          </button>
        </div>
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
        <p className="text-sm">Budget Tracker v2.0.0</p>
        <p className="text-xs mt-1">Built with React, Firebase & Tailwind CSS</p>
      </div>
    </div>
  );
};

export default SettingsSection;
