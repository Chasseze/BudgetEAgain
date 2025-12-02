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
import SpendingInsights from "./components/SpendingInsights";
import {
  ExpensesPieChart,
  IncomeExpenseBarChart,
  CategoryBudgetChart,
  SummaryStats,
} from "./components/Charts";
import GoalsSection from "./components/GoalsSection";
import SettingsSection from "./components/SettingsSection";
import Auth from "./components/Auth";

// Utils
import { getDateRange, exportToCSV } from "./utils/helpers";

// Constants
import {
  STORAGE_KEYS,
  DEFAULT_BUDGET_LIMIT,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  DATE_RANGE_OPTIONS,
  CATEGORY_CONFIG,
  GOAL_COLORS,
  CURRENCIES,
  DEFAULT_CURRENCY,
} from "./config/constants";
import { db, app } from "./config/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

// Types
interface Transaction {
  id: string;
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
  id: string;
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

// User settings interface
interface UserSettings {
  currency: string;
  emailReports: boolean;
  reportEmail: string;
  customExpenseCategories: { name: string; color: string; budget?: number }[];
  customIncomeCategories: { name: string; color: string }[];
}

const DEFAULT_USER_SETTINGS: UserSettings = {
  currency: DEFAULT_CURRENCY,
  emailReports: false,
  reportEmail: '',
  customExpenseCategories: [],
  customIncomeCategories: [],
};

const App: React.FC = () => {
  // Persisted State
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

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // User Settings State
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);

  // Show toast helper
  const showToast = useCallback((message: string, onUndo?: () => void) => {
    setToast({ message, onUndo });
  }, []);

  // Firestore transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // User-scoped transactions - only load when user is authenticated
  React.useEffect(() => {
    if (!db ||!user) {
      setTransactions([]);
      setIsDataLoading(false);
      return;
    }
    setIsDataLoading(true);
    const q = query(
      collection(db, `users/${user.uid}/transactions`),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: data.type,
          amount: data.amount,
          category: data.category,
          description: data.description,
          date: data.date,
          receipt: data.receipt ?? null,
          isRecurring: data.isRecurring,
          recurringFrequency: data.recurringFrequency,
        };
      });
      setTransactions(txs);
      setIsDataLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const addTransaction = async (tx: Omit<Transaction, "id">) => {
    if (!db || !user) return;
    await addDoc(collection(db, `users/${user.uid}/transactions`), tx);
  };

  const updateTransaction = async (id: string | number, tx: Partial<Transaction>) => {
    if (!db || !user) return;
    await updateDoc(doc(db, `users/${user.uid}/transactions`, String(id)), tx);
  };

  const deleteTransaction = async (id: string | number) => {
    if (!db || !user) return;
    await deleteDoc(doc(db, `users/${user.uid}/transactions`, String(id)));
  };

  // Firestore logic for savingsGoals
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  // User-scoped savings goals
  React.useEffect(() => {
    if (!db || !user) {
      setSavingsGoals([]);
      return;
    }
    const q = collection(db, `users/${user.uid}/goals`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const goals: SavingsGoal[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          targetAmount: data.targetAmount,
          currentAmount: data.currentAmount,
          deadline: data.deadline,
          color: data.color,
        };
      });
      setSavingsGoals(goals);
    });
    return () => unsubscribe();
  }, [user]);

  // Function to add a goal to Firestore
  const addGoal = async (goal: Omit<SavingsGoal, "id">) => {
    if (!db || !user) return;
    await addDoc(collection(db, `users/${user.uid}/goals`), goal);
  };

  // Function to update a goal in Firestore
  const updateGoal = async (id: string, goal: Partial<SavingsGoal>) => {
    if (!db || !user) return;
    await updateDoc(doc(db, `users/${user.uid}/goals`, id), goal);
  };

  // Function to delete a goal from Firestore
  const deleteGoal = async (id: string) => {
    if (!db || !user) return;
    await deleteDoc(doc(db, `users/${user.uid}/goals`, id));
  };

  // Firestore logic for budgetLimit and categoryBudgets
  const [budgetLimit, setBudgetLimit] = useState<number>(DEFAULT_BUDGET_LIMIT);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(
    Object.fromEntries(EXPENSE_CATEGORIES.map((cat) => [cat, CATEGORY_CONFIG[cat]?.budget || 200]))
  );

  // User-scoped budgets
  React.useEffect(() => {
    if (!db || !user) {
      setBudgetLimit(DEFAULT_BUDGET_LIMIT);
      setCategoryBudgets(
        Object.fromEntries(EXPENSE_CATEGORIES.map((cat) => [cat, CATEGORY_CONFIG[cat]?.budget || 200]))
      );
      return;
    }
    const budgetDocRef = doc(db, `users/${user.uid}/settings`, "budgets");
    const unsubscribe = onSnapshot(budgetDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBudgetLimit(data.budgetLimit ?? DEFAULT_BUDGET_LIMIT);
        setCategoryBudgets(data.categoryBudgets ?? {});
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Function to update budgets in Firestore
  const updateBudgets = async (newBudgetLimit: number, newCategoryBudgets: Record<string, number>) => {
    // Update local state immediately for responsive UI
    setBudgetLimit(newBudgetLimit);
    setCategoryBudgets(newCategoryBudgets);
    
    // Persist to Firestore
    if (!db || !user) return;
    const budgetDocRef = doc(db, `users/${user.uid}/settings`, "budgets");
    try {
      await setDoc(budgetDocRef, {
        budgetLimit: newBudgetLimit,
        categoryBudgets: newCategoryBudgets,
      }, { merge: true });
    } catch (error) {
      console.error('Error saving budgets:', error);
      // Revert on error would require storing previous values
    }
  };

  // User-scoped settings (currency, email reports, custom categories)
  React.useEffect(() => {
    if (!db || !user) {
      setUserSettings(DEFAULT_USER_SETTINGS);
      return;
    }
    const settingsDocRef = doc(db, `users/${user.uid}/settings`, "preferences");
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserSettings({
          currency: data.currency ?? DEFAULT_CURRENCY,
          emailReports: data.emailReports ?? false,
          reportEmail: data.reportEmail ?? '',
          customExpenseCategories: data.customExpenseCategories ?? [],
          customIncomeCategories: data.customIncomeCategories ?? [],
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Function to update user settings in Firestore
  const updateUserSettings = async (newSettings: Partial<UserSettings>) => {
    if (!db || !user) return;
    const settingsDocRef = doc(db, `users/${user.uid}/settings`, "preferences");
    await setDoc(settingsDocRef, newSettings, { merge: true });
  };

  // Computed categories (default + custom)
  const expenseCategories = [
    ...EXPENSE_CATEGORIES,
    ...userSettings.customExpenseCategories.map(c => c.name),
  ];
  const incomeCategories = [
    ...INCOME_CATEGORIES,
    ...userSettings.customIncomeCategories.map(c => c.name),
  ];

  // Get currency symbol
  const getCurrencySymbol = () => {
    const currency = CURRENCIES.find(c => c.code === userSettings.currency);
    return currency?.symbol || '$';
  };

  // Get current currency symbol for display
  const currencySymbol = getCurrencySymbol();

  // Auth effect
  React.useEffect(() => {
    const auth = getAuth(app!);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Check auth state
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Budget Tracker...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuth={setUser} />;
  }

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
  const handleAddTransaction = async (formData: TransactionFormData) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      showToast("Transaction updated!");
      setEditingTransaction(null);
    } else {
      const newTransaction = {
        type: formData.type,
        amount: Number(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date,
        receipt: formData.receipt,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.recurringFrequency,
      };
      await addTransaction(newTransaction);
      showToast("Transaction added!");
    }
    setShowAddModal(false);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    const transaction = transactions.find((t) => t.id === id);
    if (transaction) {
      await deleteTransaction(id);
      showToast("Transaction deleted");
    }
  };

  const handleAddGoal = () => {
    if (!goalForm.name || !goalForm.targetAmount) {
      showToast("Please fill in goal name and target amount");
      return;
    }

    if (editingGoal) {
      updateGoal(editingGoal.id, {
        ...goalForm,
        targetAmount: parseFloat(goalForm.targetAmount),
        currentAmount: parseFloat(goalForm.currentAmount) || 0,
        deadline: goalForm.deadline,
        color: goalForm.color,
      });
      showToast("Goal updated!");
      setEditingGoal(null);
    } else {
      // When creating a new savings goal, use a string ID
      const newGoal: SavingsGoal = {
        id: Date.now().toString(), // or use a UUID generator for better uniqueness
        name: goalForm.name,
        targetAmount: parseFloat(goalForm.targetAmount),
        currentAmount: parseFloat(goalForm.currentAmount) || 0,
        deadline: goalForm.deadline,
        color: goalForm.color,
      };
      addGoal(newGoal);
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

  const handleDeleteGoal = (id: string) => {
    deleteGoal(id);
  };

  const handleUpdateGoalProgress = async (id: string, amount: number) => {
    const goal = savingsGoals.find((g) => g.id === id);
    if (!goal) return;
    const newAmount = Math.min(
      Math.max(0, goal.currentAmount + amount),
      goal.targetAmount
    );
    await updateGoal(id, { currentAmount: newAmount });
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

    <div className={`min-h-screen ${bgPrimary} pb-20 md:pb-8 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 mb-6 transition-colors duration-300`}>
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
              {/* User info */}
              {user && (
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${textSecondary} hidden sm:inline`}>
                    {user.displayName || user.email}
                  </span>
                  <button
                    onClick={async () => {
                      const auth = getAuth(app!);
                      await signOut(auth);
                      setUser(null);
                    }}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
              <button
                onClick={handleExportData}
                className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition-colors`}
                title="Export data"
              >
                <Download className={`w-5 h-5 ${textSecondary}`} />
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700 text-yellow-400" : "hover:bg-gray-100 text-gray-600"} transition-colors`}
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Budget Alerts */}
          {categoryAlerts.length > 0 && (
            <div className={`mt-4 p-3 rounded-lg ${darkMode ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50 border-yellow-200"} border`}>
              <div className="flex items-center gap-2 text-yellow-600">
                <Bell className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Budget alerts: {categoryAlerts.join(", ")} approaching limit
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Data Loading Indicator */}
        {isDataLoading && (
          <div className={`${bgCard} rounded-xl p-4 mb-6 shadow-lg flex items-center justify-center gap-3`}>
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className={textSecondary}>Loading your data...</span>
          </div>
        )}

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

            {/* Spending Insights */}
            <SpendingInsights
              transactions={transactions}
              categoryBudgets={categoryBudgets}
              budgetLimit={budgetLimit}
              currencySymbol={currencySymbol}
              darkMode={darkMode}
            />
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
            setBudgetLimit={(limit) => updateBudgets(limit, categoryBudgets)}
            categoryBudgets={categoryBudgets}
            setCategoryBudgets={(budgets) => updateBudgets(budgetLimit, budgets)}
            darkMode={darkMode}
            onExportData={handleExportData}
            onClearData={handleClearData}
            onShowToast={showToast}
            userSettings={userSettings}
            onUpdateSettings={updateUserSettings}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
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
        userId={user?.uid}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
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
