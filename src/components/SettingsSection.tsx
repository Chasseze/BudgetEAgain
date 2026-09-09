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
  Mail,
  BadgeCheck,
  KeyRound,
  ShieldCheck,
  UserX,
  BarChart3,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { CURRENCIES, DEFAULT_CURRENCY, COLORS } from '../config/constants';

interface UserSettings {
  currency: string;
  emailReports: boolean;
  reportEmail: string;
  reportEmailVerified: boolean;
  reportEmailVerifiedFor: string;
  analyticsConsent: boolean;
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
  onExportAllData: () => Promise<void>;
  onClearData: () => void;
  onShowToast: (message: string) => void;
  userSettings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  expenseCategories: string[];
  incomeCategories: string[];
  user: User | null;
  onSendAccountVerification: () => Promise<void>;
  onRefreshAccountVerification: () => Promise<void>;
  onRequestReportEmailVerification: (email: string) => Promise<void>;
  onDeleteAccount: (password?: string) => Promise<void>;
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
  onExportAllData,
  onClearData,
  onShowToast,
  userSettings,
  onUpdateSettings,
  expenseCategories,
  incomeCategories,
  user,
  onSendAccountVerification,
  onRefreshAccountVerification,
  onRequestReportEmailVerification,
  onDeleteAccount,
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
  const [isSendingReportVerification, setIsSendingReportVerification] = useState(false);
  const [isSendingAccountVerification, setIsSendingAccountVerification] = useState(false);
  const [isRefreshingAccountVerification, setIsRefreshingAccountVerification] = useState(false);
  const [isExportingAllData, setIsExportingAllData] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteAcknowledgement, setDeleteAcknowledgement] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
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
  const normalizedReportEmail = reportEmail.trim().toLowerCase();
  const reportEmailIsVerified =
    userSettings.reportEmailVerified &&
    userSettings.reportEmailVerifiedFor === normalizedReportEmail;
  const usesPasswordSignIn = Boolean(
    user?.providerData.some((provider) => provider.providerId === 'password'),
  );

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
    const normalizedEmail = reportEmail.trim().toLowerCase();
    const emailIsVerified =
      userSettings.reportEmailVerified &&
      userSettings.reportEmailVerifiedFor === normalizedEmail;
    if (emailReports && !emailIsVerified) {
      onShowToast('Verify the report email address before enabling financial summaries.');
      return;
    }
    onUpdateSettings({ 
      emailReports, 
      reportEmail: normalizedEmail,
    });
    onShowToast('Email settings saved!');
  };

  const handleRequestReportVerification = async () => {
    const email = reportEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      onShowToast('Enter a valid report email address.');
      return;
    }
    setIsSendingReportVerification(true);
    try {
      await onRequestReportEmailVerification(email);
      onShowToast(`Verification email sent to ${email}.`);
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : 'Unable to send verification email.');
    } finally {
      setIsSendingReportVerification(false);
    }
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

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className={`block text-sm font-medium ${textSecondary}`}>
                  Report email address
                </label>
                {reportEmailIsVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <BadgeCheck className="w-4 h-4" /> Verified
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Verification required
                  </span>
                )}
              </div>
              <input
                type="email"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder="your@email.com"
                className={`w-full px-4 py-2 rounded-lg border ${inputBg}`}
              />
              <p className={`mt-2 text-xs ${textSecondary}`}>
                Financial summaries are sent only after this exact address confirms ownership.
              </p>
              <button
                type="button"
                onClick={handleRequestReportVerification}
                disabled={isSendingReportVerification || !normalizedReportEmail || reportEmailIsVerified}
                className="mt-3 w-full py-2.5 rounded-lg border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
              >
                {reportEmailIsVerified
                  ? 'Report email verified'
                  : isSendingReportVerification
                    ? 'Sending verification…'
                    : 'Send verification email'}
              </button>
            </div>
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

      {/* Account & Privacy */}
      <div className={`${bgCard} rounded-2xl shadow-lg p-6 transition-colors duration-300`}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
            <ShieldCheck className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>Account & Privacy</h3>
            <p className={`text-sm ${textSecondary}`}>Control access, communications, and your personal data</p>
          </div>
        </div>

        {user ? (
          <div className={`rounded-xl p-4 mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className={`font-medium break-all ${textPrimary}`}>{user.email || 'Signed-in account'}</p>
                <p className={`mt-1 text-sm ${user.emailVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {user.emailVerified ? 'Account email verified' : 'Account email not verified'}
                </p>
              </div>
              {!user.emailVerified && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsRefreshingAccountVerification(true);
                      try {
                        await onRefreshAccountVerification();
                      } catch (error) {
                        onShowToast(error instanceof Error ? error.message : 'Unable to refresh verification status.');
                      } finally {
                        setIsRefreshingAccountVerification(false);
                      }
                    }}
                    disabled={isRefreshingAccountVerification}
                    className="px-3 py-2 rounded-lg border border-emerald-200 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                  >
                    {isRefreshingAccountVerification ? 'Checking…' : "I've verified — refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSendingAccountVerification(true);
                      try {
                        await onSendAccountVerification();
                      } catch (error) {
                        onShowToast(error instanceof Error ? error.message : 'Unable to send verification email.');
                      } finally {
                        setIsSendingAccountVerification(false);
                      }
                    }}
                    disabled={isSendingAccountVerification}
                    className="px-3 py-2 rounded-lg border border-indigo-200 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                  >
                    {isSendingAccountVerification ? 'Sending…' : 'Send verification email'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className={`text-sm mb-4 ${textSecondary}`}>
            Account controls are available when you sign in with Firebase.
          </p>
        )}

        <div className={`rounded-xl p-4 mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <p className={`font-medium ${textPrimary}`}>Optional usage analytics</p>
              </div>
              <p className={`mt-1 text-sm ${textSecondary}`}>
                If enabled, Firebase Analytics receives limited app and device-use data. This app does not send your transactions, balances, categories, or report contents as analytics events.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={userSettings.analyticsConsent}
                onChange={(event) => void onUpdateSettings({ analyticsConsent: event.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            setIsExportingAllData(true);
            try {
              await onExportAllData();
            } catch (error) {
              onShowToast(error instanceof Error ? error.message : 'Unable to export all data.');
            } finally {
              setIsExportingAllData(false);
            }
          }}
          disabled={isExportingAllData}
          className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            darkMode
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          <Download className="w-5 h-5" />
          {isExportingAllData ? 'Preparing full export…' : 'Export all account data (JSON)'}
        </button>

        {user && (
          <div className={`mt-4 rounded-xl border ${darkMode ? 'border-red-900/70 bg-red-950/20' : 'border-red-200 bg-red-50'} p-4`}>
            <div className="flex items-start gap-3">
              <UserX className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${darkMode ? 'text-red-300' : 'text-red-800'}`}>Delete account</p>
                <p className={`mt-1 text-sm ${darkMode ? 'text-red-200/80' : 'text-red-700'}`}>
                  This permanently deletes your transactions, goals, settings, receipt files, and sign-in account. Export your data first.
                </p>
                {!showDeleteAccountConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteAccountConfirm(true)}
                    className="mt-3 px-3 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Delete my account
                  </button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <label className={`block text-sm font-medium ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                      Type DELETE to confirm
                      <input
                        value={deleteAcknowledgement}
                        onChange={(event) => setDeleteAcknowledgement(event.target.value)}
                        className={`mt-1.5 w-full px-3 py-2 rounded-lg border ${inputBg}`}
                        autoComplete="off"
                      />
                    </label>
                    {usesPasswordSignIn && (
                      <label className={`block text-sm font-medium ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                        Current password
                        <div className="relative mt-1.5">
                          <KeyRound className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                          <input
                            type="password"
                            value={deletePassword}
                            onChange={(event) => setDeletePassword(event.target.value)}
                            className={`w-full pl-9 pr-3 py-2 rounded-lg border ${inputBg}`}
                            autoComplete="current-password"
                          />
                        </div>
                      </label>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteAccountConfirm(false);
                          setDeleteAcknowledgement('');
                          setDeletePassword('');
                        }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-700'}`}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={deleteAcknowledgement !== 'DELETE' || (usesPasswordSignIn && !deletePassword) || isDeletingAccount}
                        onClick={async () => {
                          setIsDeletingAccount(true);
                          try {
                            await onDeleteAccount(deletePassword);
                          } catch (error) {
                            onShowToast(error instanceof Error ? error.message : 'Unable to delete your account.');
                          } finally {
                            setIsDeletingAccount(false);
                          }
                        }}
                        className="flex-1 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeletingAccount ? 'Deleting…' : 'Permanently delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
