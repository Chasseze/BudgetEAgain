import React, { useState, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  Moon,
  Sun,
  Bell,
  X,
} from "lucide-react";

// Hooks
import useLocalStorage from "./hooks/useLocalStorage";

// Components
import MobileNav from "./components/MobileNav";
import Toast from "./components/Toast";
import OverviewCards from "./components/OverviewCards";
import TransactionList from "./components/TransactionList";
import TransactionModal from "./components/TransactionModal";
import {
  ExpensesPieChart,
  IncomeExpenseBarChart,
  CategoryBudgetChart,
  SummaryStats,
} from "./components/Charts";
import GoalsSection from "./components/GoalsSection";
import SettingsSection from "./components/SettingsSection";
import ProgressRing from "./components/ProgressRing";

// Utils
import { getDateRange, exportToCSV } from "./utils/helpers";

// Constants
import {
  STORAGE_KEYS,
  SAMPLE_TRANSACTIONS,
  SAMPLE_GOALS,
  DEFAULT_BUDGET_LIMIT,
  EXPENSE_CATEGORIES,
  DATE_RANGE_OPTIONS,
  CATEGORY_CONFIG,
  GOAL_COLORS,
} from "./config/constants";

// Types
interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
  receipt: string | null;
  isRecurring?: boolean;
  recurringFrequency?: "weekly" | "monthly" | "yearly";
}

interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

interface TransactionFormData {
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string;
  date: string;
  receipt: string | null;
  isRecurring: boolean;
  recurringFrequency?: "weekly" | "monthly" | "yearly";
}

interface ToastData {
  message: string;
  onUndo?: () => void;
}

const App: React.FC = () => {
  // Persisted State
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.TRANSACTIONS,
    SAMPLE_TRANSACTIONS,
  );
  const [budgetLimit, setBudgetLimit] = useLocalStorage<number>(
    STORAGE_KEYS.BUDGET_LIMIT,
    DEFAULT_BUDGET_LIMIT,
  );
  const [categoryBudgets, setCategoryBudgets] = useLocalStorage<
    Record<string, number>
  >(
    STORAGE_KEYS.CATEGORY_BUDGETS,
    Object.fromEntries(
      EXPENSE_CATEGORIES.map((cat) => [
        cat,
        CATEGORY_CONFIG[cat]?.budget || 200,
      ]),
    ),
  );
  const [savingsGoals, setSavingsGoals] = useLocalStorage<SavingsGoal[]>(
    STORAGE_KEYS.SAVINGS_GOALS,
    SAMPLE_GOALS,
  );
  const [darkMode, setDarkMode] = useLocalStorage<boolean>(
    STORAGE_KEYS.DARK_MODE,
    false,
  );

  // UI State
  const [activeTab, setActiveTab] = useState("home");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Transaction | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Goal Form State
  const [goalForm, setGoalForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    deadline: new Date().toISOString().split("T")[0],
    color: GOAL_COLORS[0],
  });

  // Show toast helper
  const showToast = useCallback((message: string, onUndo?: () => void) => {
    setToast({ message, onUndo });
  }, []);

  // Calculations
  const { start: filterStart, end: filterEnd } = getDateRange(filterDateRange);

  const filteredByDate = transactions.filter((t) => {
    const transactionDate = new Date(t.date);
    return transactionDate >= filterStart && transactionDate <= filterEnd;
  });

  const totalIncome = filteredByDate
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredByDate
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const remaining = totalIncome - totalExpenses;
  const budgetUsedPercent =
    budgetLimit > 0 ? (totalExpenses / budgetLimit) * 100 : 0;

  const expensesByCategory = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat,
    value: filteredByDate
      .filter((t) => t.type === "expense" && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0),
    budget: categoryBudgets[cat] || 0,
    color: CATEGORY_CONFIG[cat]?.color || "#85C1E2",
  })).filter((item) => item.value > 0);

  const filteredTransactions = transactions
    .filter((t) => {
      const categoryMatch =
        filterCategory === "all" || t.category === filterCategory;
      const typeMatch = filterType === "all" || t.type === filterType;
      const transactionDate = new Date(t.date);
      const dateMatch =
        transactionDate >= filterStart && transactionDate <= filterEnd;
      const searchMatch =
        searchQuery === "" ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && typeMatch && dateMatch && searchMatch;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Monthly chart data
  const monthlyData = transactions.reduce(
    (acc, t) => {
      const month = t.date.substring(0, 7);
      if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 };
      if (t.type === "income") acc[month].income += t.amount;
      else acc[month].expenses += t.amount;
      return acc;
    },
    {} as Record<string, { month: string; income: number; expenses: number }>,
  );

  const chartData = Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  // Category alerts
  const categoryAlerts = EXPENSE_CATEGORIES.filter((cat) => {
    const spent = filteredByDate
      .filter((t) => t.type === "expense" && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    const budget = categoryBudgets[cat] || 0;
    return budget > 0 && spent > budget * 0.8;
  });

  // Handlers
  const handleAddTransaction = (formData: TransactionFormData) => {
    if (editingTransaction) {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTransaction.id
            ? { ...t, ...formData, amount: parseFloat(formData.amount) }
            : t,
        ),
      );
      showToast("Transaction updated!");
      setEditingTransaction(null);
    } else {
      const newTransaction: Transaction = {
        id: Date.now(),
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date,
        receipt: formData.receipt,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.recurringFrequency,
      };
      setTransactions((prev) => [newTransaction, ...prev]);
      showToast("Transaction added!");
    }
    setShowAddModal(false);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  };

  const handleDeleteTransaction = (id: number) => {
    const transaction = transactions.find((t) => t.id === id);
    if (transaction) {
      setLastDeleted(transaction);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      showToast("Transaction deleted", () => {
        setTransactions((prev) => [transaction, ...prev]);
        setLastDeleted(null);
      });
    }
  };

  const handleAddGoal = () => {
    if (!goalForm.name || !goalForm.targetAmount) {
      showToast("Please fill in goal name and target amount");
      return;
    }

    if (editingGoal) {
      setSavingsGoals((prev) =>
        prev.map((g) =>
          g.id === editingGoal.id
            ? {
                ...g,
                name: goalForm.name,
                targetAmount: parseFloat(goalForm.targetAmount),
                currentAmount: parseFloat(goalForm.currentAmount) || 0,
                deadline: goalForm.deadline,
                color: goalForm.color,
              }
            : g,
        ),
      );
      showToast("Goal updated!");
      setEditingGoal(null);
    } else {
      const newGoal: SavingsGoal = {
        id: Date.now(),
        name: goalForm.name,
        targetAmount: parseFloat(goalForm.targetAmount),
        currentAmount: parseFloat(goalForm.currentAmount) || 0,
        deadline: goalForm.deadline,
        color: goalForm.color,
      };
      setSavingsGoals((prev) => [...prev, newGoal]);
      showToast("Goal created!");
    }

    setGoalForm({
      name: "",
      targetAmount: "",
      currentAmount: "",
      deadline: new Date().toISOString().split("T")[0],
      color: GOAL_COLORS[0],
    });
    setShowGoalModal(false);
  };

  const handleEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline,
      color: goal.color,
    });
    setShowGoalModal(true);
  };

  const handleDeleteGoal = (id: number) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
    showToast("Goal deleted");
  };

  const handleUpdateGoalProgress = (id: number, amount: number) => {
    setSavingsGoals((prev) =>
      prev.map((g) =>
        g.id === id
          ? {
              ...g,
              currentAmount: Math.min(
                Math.max(0, g.currentAmount + amount),
                g.targetAmount,
              ),
            }
          : g,
      ),
    );
    showToast(amount > 0 ? "Added to goal!" : "Removed from goal!");
  };

  const handleExportData = () => {
    exportToCSV(transactions);
    showToast("Data exported!");
  };

  const handleClearData = () => {
    setTransactions([]);
    setSavingsGoals([]);
    setBudgetLimit(DEFAULT_BUDGET_LIMIT);
    setCategoryBudgets(
      Object.fromEntries(
        EXPENSE_CATEGORIES.map((cat) => [
          cat,
          CATEGORY_CONFIG[cat]?.budget || 200,
        ]),
      ),
    );
  };

  // Styling classes
  const bgPrimary = darkMode
    ? "bg-gray-900"
    : "bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50";
  const bgCard = darkMode ? "bg-gray-800" : "bg-white";
  const textPrimary = darkMode ? "text-white" : "text-gray-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-600";
  const borderColor = darkMode ? "border-gray-700" : "border-gray-200";
  const inputBg = darkMode
    ? "bg-gray-700 border-gray-600 text-white"
    : "bg-white border-gray-300 text-gray-900";

  return (
    <div
      className={`min-h-screen ${bgPrimary} pb-20 md:pb-8 transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div
          className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 mb-6 transition-colors duration-300`}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Budget Tracker
              </h1>
              <p className={`${textSecondary} text-sm md:text-base`}>
                Take control of your finances
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={handleExportData}
                className={`p-2 rounded-lg ${
                  darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                } transition-colors`}
                title="Export data"
              >
                <Download className={`w-5 h-5 ${textSecondary}`} />
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${
                  darkMode
                    ? "hover:bg-gray-700 text-yellow-400"
                    : "hover:bg-gray-100 text-gray-600"
                } transition-colors`}
                title="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Budget Alerts */}
          {categoryAlerts.length > 0 && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                darkMode
                  ? "bg-yellow-900/30 border-yellow-700"
                  : "bg-yellow-50 border-yellow-200"
              } border`}
            >
              <div className="flex items-center gap-2 text-yellow-600">
                <Bell className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Budget alerts: {categoryAlerts.join(", ")} approaching limit
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <div
          className={`hidden md:flex gap-2 mb-6 ${bgCard} rounded-xl p-2 shadow-lg transition-colors duration-300`}
        >
          {["home", "transactions", "analytics", "goals", "settings"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-4 rounded-lg capitalize transition-all font-medium ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : darkMode
                      ? "text-gray-400 hover:bg-gray-700 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {tab}
              </button>
            ),
          )}
        </div>

        {/* ==================== HOME TAB ==================== */}
        {activeTab === "home" && (
          <>
            {/* Quick Actions */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className={`px-3 py-2 rounded-lg border text-sm ${inputBg}`}
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setEditingTransaction(null);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all font-medium"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Transaction</span>
              </button>
            </div>

            {/* Overview Cards */}
            <OverviewCards
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              remaining={remaining}
              budgetUsedPercent={budgetUsedPercent}
              darkMode={darkMode}
            />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div
                className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-colors duration-300`}
              >
                <h2
                  className={`text-lg md:text-xl font-bold ${textPrimary} mb-4`}
                >
                  Expenses by Category
                </h2>
                <ExpensesPieChart
                  data={expensesByCategory}
                  darkMode={darkMode}
                />
              </div>

              <div
                className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-colors duration-300`}
              >
                <h2
                  className={`text-lg md:text-xl font-bold ${textPrimary} mb-4`}
                >
                  Income vs Expenses
                </h2>
                <IncomeExpenseBarChart data={chartData} darkMode={darkMode} />
              </div>
            </div>

            {/* Recent Transactions */}
            <div
              className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-colors duration-300`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg md:text-xl font-bold ${textPrimary}`}>
                  Recent Transactions
                </h2>
                <button
                  onClick={() => setActiveTab("transactions")}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  View All →
                </button>
              </div>
              <TransactionList
                transactions={filteredTransactions.slice(0, 5)}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onViewReceipt={setSelectedReceipt}
                darkMode={darkMode}
              />
            </div>
          </>
        )}

        {/* ==================== TRANSACTIONS TAB ==================== */}
        {activeTab === "transactions" && (
          <div
            className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-colors duration-300`}
          >
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary}`}
                />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl border ${inputBg} focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                    showFilters
                      ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                      : darkMode
                        ? "bg-gray-700 border-gray-600 text-gray-300"
                        : "bg-gray-100 border-gray-200 text-gray-700"
                  } transition-colors`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>

                <button
                  onClick={() => {
                    setEditingTransaction(null);
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add</span>
                </button>
              </div>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div
                className={`flex flex-wrap gap-3 mb-6 p-4 rounded-xl ${
                  darkMode ? "bg-gray-700" : "bg-gray-50"
                }`}
              >
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${inputBg}`}
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${inputBg}`}
                >
                  <option value="all">All Categories</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${inputBg}`}
                >
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Transactions List */}
            <TransactionList
              transactions={filteredTransactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onViewReceipt={setSelectedReceipt}
              darkMode={darkMode}
              searchQuery={searchQuery}
            />
          </div>
        )}

        {/* ==================== ANALYTICS TAB ==================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div
              className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-colors duration-300`}
            >
              <h2
                className={`text-lg md:text-xl font-bold ${textPrimary} mb-4`}
              >
                Summary Statistics
              </h2>
              <SummaryStats
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                transactionCount={filteredTransactions.length}
                averageExpense={
                  filteredTransactions.filter((t) => t.type === "expense")
                    .length > 0
                    ? totalExpenses /
                      filteredTransactions.filter((t) => t.type === "expense")
                        .length
                    : 0
                }
                darkMode={darkMode}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div
                className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-colors duration-300`}
              >
                <h2
                  className={`text-lg md:text-xl font-bold ${textPrimary} mb-4`}
                >
                  Spending Breakdown
                </h2>
                <ExpensesPieChart
                  data={expensesByCategory}
                  darkMode={darkMode}
                />
              </div>

              <div
                className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-colors duration-300`}
              >
                <h2
                  className={`text-lg md:text-xl font-bold ${textPrimary} mb-4`}
                >
                  Monthly Comparison
                </h2>
                <IncomeExpenseBarChart data={chartData} darkMode={darkMode} />
              </div>
            </div>

            {/* Category Budget Progress */}
            <div
              className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-colors duration-300`}
            >
              <h2
                className={`text-lg md:text-xl font-bold ${textPrimary} mb-4`}
              >
                Category Budget Progress
              </h2>
              <CategoryBudgetChart
                data={expensesByCategory}
                darkMode={darkMode}
              />
            </div>
          </div>
        )}

        {/* ==================== GOALS TAB ==================== */}
        {activeTab === "goals" && (
          <GoalsSection
            goals={savingsGoals}
            onAddGoal={() => {
              setEditingGoal(null);
              setGoalForm({
                name: "",
                targetAmount: "",
                currentAmount: "",
                deadline: new Date().toISOString().split("T")[0],
                color: GOAL_COLORS[0],
              });
              setShowGoalModal(true);
            }}
            onEditGoal={handleEditGoal}
            onDeleteGoal={handleDeleteGoal}
            onUpdateProgress={handleUpdateGoalProgress}
            darkMode={darkMode}
          />
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {activeTab === "settings" && (
          <SettingsSection
            budgetLimit={budgetLimit}
            setBudgetLimit={setBudgetLimit}
            categoryBudgets={categoryBudgets}
            setCategoryBudgets={setCategoryBudgets}
            darkMode={darkMode}
            onExportData={handleExportData}
            onClearData={handleClearData}
            onShowToast={showToast}
          />
        )}
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleAddTransaction}
        initialData={
          editingTransaction
            ? {
                type: editingTransaction.type,
                amount: editingTransaction.amount.toString(),
                category: editingTransaction.category,
                description: editingTransaction.description,
                date: editingTransaction.date,
                receipt: editingTransaction.receipt,
                isRecurring: editingTransaction.isRecurring || false,
                recurringFrequency: editingTransaction.recurringFrequency,
              }
            : undefined
        }
        isEditing={!!editingTransaction}
        darkMode={darkMode}
      />

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className={`${bgCard} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden`}
          >
            <div
              className={`flex justify-between items-center p-6 border-b ${borderColor}`}
            >
              <h2 className={`text-xl font-bold ${textPrimary}`}>
                {editingGoal ? "Edit Goal" : "Create Goal"}
              </h2>
              <button
                onClick={() => {
                  setShowGoalModal(false);
                  setEditingGoal(null);
                }}
                className={`p-2 rounded-lg ${
                  darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${textSecondary}`}
                >
                  Goal Name
                </label>
                <input
                  type="text"
                  value={goalForm.name}
                  onChange={(e) =>
                    setGoalForm({ ...goalForm, name: e.target.value })
                  }
                  placeholder="e.g., Vacation Fund"
                  className={`w-full px-4 py-3 rounded-xl border ${inputBg} focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${textSecondary}`}
                >
                  Target Amount
                </label>
                <div className="relative">
                  <span
                    className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary}`}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    value={goalForm.targetAmount}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, targetAmount: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="100"
                    className={`w-full pl-8 pr-4 py-3 rounded-xl border ${inputBg} focus:ring-2 focus:ring-indigo-500`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${textSecondary}`}
                >
                  Current Amount (Optional)
                </label>
                <div className="relative">
                  <span
                    className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary}`}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    value={goalForm.currentAmount}
                    onChange={(e) =>
                      setGoalForm({
                        ...goalForm,
                        currentAmount: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    min="0"
                    step="10"
                    className={`w-full pl-8 pr-4 py-3 rounded-xl border ${inputBg} focus:ring-2 focus:ring-indigo-500`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${textSecondary}`}
                >
                  Target Date
                </label>
                <input
                  type="date"
                  value={goalForm.deadline}
                  onChange={(e) =>
                    setGoalForm({ ...goalForm, deadline: e.target.value })
                  }
                  className={`w-full px-4 py-3 rounded-xl border ${inputBg} focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${textSecondary}`}
                >
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setGoalForm({ ...goalForm, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        goalForm.color === color
                          ? "scale-125 ring-2 ring-offset-2 ring-indigo-500"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={`p-6 border-t ${borderColor} flex gap-3`}>
              <button
                onClick={() => {
                  setShowGoalModal(false);
                  setEditingGoal(null);
                }}
                className={`flex-1 py-3 rounded-xl font-medium ${
                  darkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
                className="flex-1 py-3 rounded-xl font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
              >
                {editingGoal ? "Update Goal" : "Create Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Viewer Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedReceipt(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedReceipt}
              alt="Receipt"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.onUndo}
          onClose={() => setToast(null)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default App;
