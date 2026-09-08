import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  lazy,
  Suspense,
} from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Moon,
  Sun,
  Bell,
  X,
  Wallet,
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
// Chart components are lazy-loaded so the recharts bundle (~400 kB) is not
// downloaded until the dashboard actually renders (i.e. never on the login screen)
const ExpensesPieChart = lazy(() =>
  import("./components/Charts").then((m) => ({ default: m.ExpensesPieChart })),
);
const IncomeExpenseBarChart = lazy(() =>
  import("./components/Charts").then((m) => ({
    default: m.IncomeExpenseBarChart,
  })),
);
const CategoryBudgetChart = lazy(() =>
  import("./components/Charts").then((m) => ({
    default: m.CategoryBudgetChart,
  })),
);
const SummaryStats = lazy(() =>
  import("./components/Charts").then((m) => ({ default: m.SummaryStats })),
);
const SpendingTrendChart = lazy(() =>
  import("./components/Charts").then((m) => ({
    default: m.SpendingTrendChart,
  })),
);
const SpendingForecast = lazy(() => import("./components/SpendingForecast"));
import GoalsSection from "./components/GoalsSection";
import UpcomingGoalCard from "./components/UpcomingGoalCard";
import HealthScore from "./components/HealthScore";
import SettingsSection from "./components/SettingsSection";
import SpendingHeatmap from "./components/SpendingHeatmap";
import CategoryComparisonTable from "./components/CategoryComparisonTable";
import CSVImportModal from "./components/CSVImportModal";
import QuickAddFAB from "./components/QuickAddFAB";
import RecurringBanner, {
  DueOccurrence,
} from "./components/RecurringBanner";
import SpendingNudge from "./components/SpendingNudge";
import UpcomingExpensesCalendar from "./components/UpcomingExpensesCalendar";
import BudgetHistoryCard, {
  BudgetSnapshot,
} from "./components/BudgetHistoryCard";
import Auth from "./components/Auth";

// Utils
import {
  fromMinorUnits,
  getDateRange,
  normaliseMoney,
  parseDateOnly,
  toDateInputValue,
  toMinorUnits,
  exportToCSV,
} from "./utils/helpers";

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
import { db, app, storage } from "./config/firebase";
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
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { deleteObject, listAll, ref as storageRef } from "firebase/storage";

// Types
interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
  receipt: string | null;
  receiptPath?: string | null;
  isRecurring?: boolean;
  recurringFrequency?: "weekly" | "monthly" | "yearly";
  recurringSeriesId?: string | null;
  recurrenceEndDate?: string | null;
  goalId?: string | null;
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
  receiptPath?: string | null;
  isRecurring: boolean;
  recurringFrequency?: "weekly" | "monthly" | "yearly";
  goalId?: string;
  recurringSeriesId?: string | null;
  recurrenceEndDate?: string | null;
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
  reportEmail: "",
  customExpenseCategories: [],
  customIncomeCategories: [],
};

const defaultCategoryBudgets = (): Record<string, number> =>
  Object.fromEntries(
    EXPENSE_CATEGORIES.map((cat) => [cat, CATEGORY_CONFIG[cat]?.budget || 200]),
  );

const localId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const toStoredTransaction = (tx: Omit<Transaction, "id">) => {
  const { amount, ...rest } = tx;
  return {
  ...rest,
  // amountCents is the canonical persisted amount. `amount` is read only as
  // a legacy fallback for documents saved by previous versions.
  amountCents: toMinorUnits(amount),
  };
};

const App: React.FC = () => {
  // Persisted State
  const [darkMode, setDarkMode] = useLocalStorage<boolean>(
    STORAGE_KEYS.DARK_MODE,
    false,
  );
  // A fully local mode keeps the app useful when Firebase is intentionally
  // unconfigured (or when someone wants a private, single-device budget).
  const [localTransactions, setLocalTransactions] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.TRANSACTIONS,
    [],
  );
  const [localGoals, setLocalGoals] = useLocalStorage<SavingsGoal[]>(
    STORAGE_KEYS.SAVINGS_GOALS,
    [],
  );
  const [localBudget, setLocalBudget] = useLocalStorage(
    STORAGE_KEYS.BUDGET_LIMIT,
    DEFAULT_BUDGET_LIMIT,
  );
  const [localCategoryBudgets, setLocalCategoryBudgets] = useLocalStorage<Record<string, number>>(
    STORAGE_KEYS.CATEGORY_BUDGETS,
    defaultCategoryBudgets(),
  );
  const [localSettings, setLocalSettings] = useLocalStorage<UserSettings>(
    "budget_tracker_preferences",
    DEFAULT_USER_SETTINGS,
  );
  const isLocalMode = !db || !app;

  // UI State
  const [activeTab, setActiveTab] = useState("home");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [presetType, setPresetType] = useState<"income" | "expense" | null>(
    null,
  );
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
    deadline: toDateInputValue(),
    color: GOAL_COLORS[0],
  });

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Keep the root `dark` class + PWA theme color in sync so global dark
  // styles (scrollbars, floating labels) and the browser chrome follow
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", darkMode ? "#030712" : "#6366f1");
  }, [darkMode]);

  // User Settings State
  const [userSettings, setUserSettings] = useState<UserSettings>(
    DEFAULT_USER_SETTINGS,
  );

  // Show toast helper
  const showToast = useCallback((message: string, onUndo?: () => void) => {
    setToast({ message, onUndo });
  }, []);

  // Firestore transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // User-scoped transactions - only load when user is authenticated
  React.useEffect(() => {
    if (isLocalMode) {
      setTransactions(localTransactions);
      setIsDataLoading(false);
      return;
    }
    if (!db || !user) {
      setTransactions([]);
      setIsDataLoading(false);
      return;
    }
    setIsDataLoading(true);
    const q = query(
      collection(db, `users/${user.uid}/transactions`),
      orderBy("date", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: data.type,
          amount: fromMinorUnits(
            Number.isInteger(data.amountCents)
              ? data.amountCents
              : toMinorUnits(Number(data.amount) || 0),
          ),
          category: data.category,
          description: data.description,
          date: data.date,
          receipt: data.receipt ?? null,
          receiptPath: data.receiptPath ?? null,
          isRecurring: data.isRecurring,
          recurringFrequency: data.recurringFrequency,
          recurringSeriesId: data.recurringSeriesId ?? null,
          recurrenceEndDate: data.recurrenceEndDate ?? null,
          goalId: data.goalId ?? null,
        };
      });
      setTransactions(txs);
      setIsDataLoading(false);
    });
    return () => unsubscribe();
  }, [user, isLocalMode, localTransactions]);

  const addTransaction = async (tx: Omit<Transaction, "id">) => {
    if (isLocalMode) {
      setLocalTransactions((current) => [{ ...tx, id: localId() }, ...current]);
      return;
    }
    if (!db || !user) return;
    await addDoc(collection(db, `users/${user.uid}/transactions`), toStoredTransaction(tx));
  };

  const updateTransaction = async (
    id: string | number,
    tx: Partial<Transaction>,
  ) => {
    if (isLocalMode) {
      setLocalTransactions((current) => current.map((item) => item.id === String(id) ? { ...item, ...tx } : item));
      return;
    }
    if (!db || !user) return;
    const { amount, ...rest } = tx;
    await updateDoc(doc(db, `users/${user.uid}/transactions`, String(id)), {
      ...rest,
      ...(amount === undefined ? {} : { amountCents: toMinorUnits(amount) }),
    });
  };

  const deleteTransaction = async (id: string | number) => {
    if (isLocalMode) {
      setLocalTransactions((current) => current.filter((item) => item.id !== String(id)));
      return;
    }
    if (!db || !user) return;
    await deleteDoc(doc(db, `users/${user.uid}/transactions`, String(id)));
  };

  // Firestore logic for savingsGoals
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isGoalsLoading, setIsGoalsLoading] = useState(true);

  // User-scoped savings goals
  React.useEffect(() => {
    if (isLocalMode) {
      setSavingsGoals(localGoals);
      setIsGoalsLoading(false);
      return;
    }
    if (!db || !user) {
      setSavingsGoals([]);
      setIsGoalsLoading(false);
      return;
    }
    setIsGoalsLoading(true);
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
      setIsGoalsLoading(false);
    });
    return () => unsubscribe();
  }, [user, isLocalMode, localGoals]);

  // Function to add a goal to Firestore
  const addGoal = async (goal: Omit<SavingsGoal, "id">) => {
    if (isLocalMode) {
      setLocalGoals((current) => [...current, { ...goal, id: localId() }]);
      return;
    }
    if (!db || !user) return;
    await addDoc(collection(db, `users/${user.uid}/goals`), goal);
  };

  // Function to update a goal in Firestore
  const updateGoal = async (id: string, goal: Partial<SavingsGoal>) => {
    if (isLocalMode) {
      setLocalGoals((current) => current.map((item) => item.id === id ? { ...item, ...goal } : item));
      return;
    }
    if (!db || !user) return;
    await updateDoc(doc(db, `users/${user.uid}/goals`, id), goal);
  };

  // Function to delete a goal from Firestore
  const deleteGoal = async (id: string) => {
    if (isLocalMode) {
      setLocalGoals((current) => current.filter((item) => item.id !== id));
      return;
    }
    if (!db || !user) return;
    await deleteDoc(doc(db, `users/${user.uid}/goals`, id));
  };

  // Firestore logic for budgetLimit and categoryBudgets
  const [budgetLimit, setBudgetLimit] = useState<number>(DEFAULT_BUDGET_LIMIT);
  const [categoryBudgets, setCategoryBudgets] = useState<
    Record<string, number>
  >(
    defaultCategoryBudgets(),
  );

  // User-scoped budgets
  React.useEffect(() => {
    if (isLocalMode) {
      setBudgetLimit(localBudget);
      setCategoryBudgets(localCategoryBudgets);
      return;
    }
    if (!db || !user) {
      setBudgetLimit(DEFAULT_BUDGET_LIMIT);
      setCategoryBudgets(defaultCategoryBudgets());
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
  }, [user, isLocalMode, localBudget, localCategoryBudgets]);

  // Function to update budgets in Firestore
  const updateBudgets = async (
    newBudgetLimit: number,
    newCategoryBudgets: Record<string, number>,
  ) => {
    // Update local state immediately for responsive UI
    setBudgetLimit(newBudgetLimit);
    setCategoryBudgets(newCategoryBudgets);

    // Persist to Firestore
    if (isLocalMode) {
      setLocalBudget(newBudgetLimit);
      setLocalCategoryBudgets(newCategoryBudgets);
      return;
    }
    if (!db || !user) return;
    const budgetDocRef = doc(db, `users/${user.uid}/settings`, "budgets");
    try {
      await setDoc(
        budgetDocRef,
        {
          budgetLimit: newBudgetLimit,
          categoryBudgets: newCategoryBudgets,
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Error saving budgets:", error);
      // Revert on error would require storing previous values
    }
  };

  // Budget history snapshots (users/{uid}/budgetHistory/{YYYY-MM})
  const [budgetSnapshots, setBudgetSnapshots] = useState<BudgetSnapshot[]>([]);

  React.useEffect(() => {
    if (isLocalMode || !db || !user) {
      setBudgetSnapshots([]);
      return;
    }
    const unsubscribe = onSnapshot(
      collection(db, `users/${user.uid}/budgetHistory`),
      (snapshot) => {
        setBudgetSnapshots(
          snapshot.docs.map((d) => ({
            month: d.id,
            budgetLimit: d.data().budgetLimit ?? 0,
          })),
        );
      },
    );
    return () => unsubscribe();
  }, [user, isLocalMode]);

  // Once per session: snapshot last month's budget so history stays accurate
  // even after the user changes their budget later
  const snapshotWritten = React.useRef(false);
  React.useEffect(() => {
    if (isLocalMode || !db || !user || isDataLoading || snapshotWritten.current) return;
    const d = new Date();
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const monthKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    const hadActivity = transactions.some((t) => t.date.startsWith(monthKey));
    if (!hadActivity) return;
    snapshotWritten.current = true;
    const ref = doc(db, `users/${user.uid}/budgetHistory`, monthKey);
    getDoc(ref)
      .then((snap) => {
        if (!snap.exists()) {
          return setDoc(ref, {
            budgetLimit,
            categoryBudgets,
            createdAt: new Date().toISOString(),
          });
        }
      })
      .catch((err) => console.error("Budget snapshot failed:", err));
  }, [user, isLocalMode, isDataLoading, transactions, budgetLimit, categoryBudgets]);

  // User-scoped settings (currency, email reports, custom categories)
  React.useEffect(() => {
    if (isLocalMode) {
      setUserSettings(localSettings);
      return;
    }
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
          reportEmail: data.reportEmail ?? "",
          customExpenseCategories: data.customExpenseCategories ?? [],
          customIncomeCategories: data.customIncomeCategories ?? [],
        });
      }
    });
    return () => unsubscribe();
  }, [user, isLocalMode, localSettings]);

  // Function to update user settings in Firestore
  const updateUserSettings = async (newSettings: Partial<UserSettings>) => {
    if (isLocalMode) {
      setLocalSettings((current) => ({ ...current, ...newSettings }));
      return;
    }
    if (!db || !user) return;
    const settingsDocRef = doc(db, `users/${user.uid}/settings`, "preferences");
    await setDoc(settingsDocRef, newSettings, { merge: true });
  };

  // Computed categories (default + custom)
  const expenseCategories = useMemo(
    () => [
      ...EXPENSE_CATEGORIES,
      ...userSettings.customExpenseCategories.map((c) => c.name),
    ],
    [userSettings.customExpenseCategories],
  );
  const incomeCategories = useMemo(
    () => [
      ...INCOME_CATEGORIES,
      ...userSettings.customIncomeCategories.map((c) => c.name),
    ],
    [userSettings.customIncomeCategories],
  );

  // Get current currency symbol for display
  const currencySymbol = useMemo(() => {
    const currency = CURRENCIES.find((c) => c.code === userSettings.currency);
    return currency?.symbol || "$";
  }, [userSettings.currency]);

  // Auth effect
  React.useEffect(() => {
    if (isLocalMode || !app) {
      setAuthChecked(true);
      return;
    }
    const auth = getAuth(app!);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, [isLocalMode]);

  // Calculations — memoized so filter/search/tab changes don't recompute everything
  const { start: filterStart, end: filterEnd } = useMemo(
    () => getDateRange(filterDateRange),
    [filterDateRange],
  );

  const filteredByDate = useMemo(
    () =>
      transactions.filter((t) => {
        const transactionDate = parseDateOnly(t.date);
        return transactionDate >= filterStart && transactionDate <= filterEnd;
      }),
    [transactions, filterStart, filterEnd],
  );

  const { totalIncome, totalExpenses } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const t of filteredByDate) {
      if (t.type === "income") income += t.amount;
      else expenses += t.amount;
    }
    return { totalIncome: income, totalExpenses: expenses };
  }, [filteredByDate]);

  const remaining = totalIncome - totalExpenses;
  const budgetUsedPercent =
    budgetLimit > 0 ? (totalExpenses / budgetLimit) * 100 : 0;

  const expensesByCategory = useMemo(
    () =>
      expenseCategories
        .map((cat) => {
          const customCatConfig = userSettings.customExpenseCategories.find(
            (c) => c.name === cat,
          );
          return {
            name: cat,
            value: filteredByDate
              .filter((t) => t.type === "expense" && t.category === cat)
              .reduce((sum, t) => sum + t.amount, 0),
            budget: categoryBudgets[cat] || 0,
            color:
              customCatConfig?.color ||
              CATEGORY_CONFIG[cat]?.color ||
              "#85C1E2",
          };
        })
        .filter((item) => item.value > 0),
    [
      expenseCategories,
      filteredByDate,
      categoryBudgets,
      userSettings.customExpenseCategories,
    ],
  );

  const filteredTransactions = useMemo(
    () =>
      filteredByDate
        .filter((t) => {
          const categoryMatch =
            filterCategory === "all" || t.category === filterCategory;
          const typeMatch = filterType === "all" || t.type === filterType;
          const search = searchQuery.toLowerCase();
          const searchMatch =
            search === "" ||
            t.description.toLowerCase().includes(search) ||
            t.category.toLowerCase().includes(search);
          return categoryMatch && typeMatch && searchMatch;
        })
        .sort(
          (a, b) => parseDateOnly(b.date).getTime() - parseDateOnly(a.date).getTime(),
        ),
    [filteredByDate, filterCategory, filterType, searchQuery],
  );

  // Monthly chart data
  const chartData = useMemo(() => {
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
    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [transactions]);

  // Daily spending trend (expenses only)
  const dailyTrendData = useMemo(() => {
    const byDate = filteredByDate
      .filter((t) => t.type === "expense")
      .reduce(
        (acc, t) => {
          if (!acc[t.date]) acc[t.date] = { date: t.date, amount: 0 };
          acc[t.date].amount += t.amount;
          return acc;
        },
        {} as Record<string, { date: string; amount: number }>,
      );
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredByDate]);

  // Category alerts
  const categoryAlerts = useMemo(
    () =>
      EXPENSE_CATEGORIES.filter((cat) => {
        const spent = filteredByDate
          .filter((t) => t.type === "expense" && t.category === cat)
          .reduce((sum, t) => sum + t.amount, 0);
        const budget = categoryBudgets[cat] || 0;
        return budget > 0 && spent > budget * 0.8;
      }),
    [filteredByDate, categoryBudgets],
  );

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

  if (!user && !isLocalMode) {
    return <Auth onAuth={setUser} />;
  }

  // Handlers
  const deleteReceipt = async (path?: string | null) => {
    if (!path || !storage) return;
    try {
      await deleteObject(storageRef(storage, path));
    } catch (error) {
      // Deletion is best-effort for legacy download URLs that do not include a path.
      console.warn("Unable to delete receipt:", error);
    }
  };

  const deleteReceiptFolder = async (path: string): Promise<void> => {
    if (!storage) return;
    const folder = storageRef(storage, path);
    const entries = await listAll(folder);
    await Promise.all(entries.items.map((item) => deleteObject(item)));
    await Promise.all(entries.prefixes.map((prefix) => deleteReceiptFolder(prefix.fullPath)));
  };
  const handleAddTransaction = async (formData: TransactionFormData) => {
    if (editingTransaction) {
      const nextAmount = normaliseMoney(parseFloat(formData.amount));
      const previousReceiptPath = editingTransaction.receiptPath;
      await updateTransaction(editingTransaction.id, {
        ...formData,
        amount: nextAmount,
        goalId: editingTransaction.goalId ?? null,
        recurringSeriesId: formData.isRecurring
          ? editingTransaction.recurringSeriesId || localId()
          : null,
      });
      if (previousReceiptPath && previousReceiptPath !== formData.receiptPath) {
        await deleteReceipt(previousReceiptPath);
      }
      showToast("Transaction updated!");
      setEditingTransaction(null);
    } else {
      const amount = normaliseMoney(Number(formData.amount));
      const goalId = formData.type === "income" ? formData.goalId || null : null;
      const newTransaction = {
        type: formData.type,
        amount,
        category: formData.category,
        description: formData.description,
        date: formData.date,
        receipt: formData.receipt,
        receiptPath: formData.receiptPath ?? null,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.recurringFrequency,
        recurringSeriesId: formData.isRecurring ? localId() : null,
        recurrenceEndDate: formData.isRecurring ? formData.recurrenceEndDate || null : null,
        goalId,
      };
      await addTransaction(newTransaction);

      // Linked goal contribution: bump the goal's progress too
      const goal = goalId ? savingsGoals.find((g) => g.id === goalId) : null;
      if (goal) {
        const newAmount = Math.min(
          goal.currentAmount + amount,
          goal.targetAmount,
        );
        await updateGoal(goal.id, { currentAmount: newAmount });
        showToast(`Transaction added & "${goal.name}" updated!`);
      } else {
        showToast("Transaction added!");
      }
    }
    setShowAddModal(false);
    setPresetType(null);
  };

  // Post all due recurring occurrences in one batch
  const handlePostRecurring = async (due: DueOccurrence[]) => {
    if (due.length === 0) return;
    if (isLocalMode) {
      await Promise.all(due.map((d) => addTransaction({
        ...d,
        receipt: null,
        receiptPath: null,
        isRecurring: true,
        goalId: null,
      })));
      showToast(`Added ${due.length} recurring transaction${due.length !== 1 ? "s" : ""}!`);
      return;
    }
    if (!db || !user) return;
    const batch = writeBatch(db);
    due.forEach((d) => {
      const ref = doc(collection(db!, `users/${user.uid}/transactions`));
      batch.set(ref, {
        type: d.type,
        amountCents: toMinorUnits(d.amount),
        category: d.category,
        description: d.description,
        date: d.date,
        receipt: null,
        receiptPath: null,
        isRecurring: true,
        recurringFrequency: d.recurringFrequency,
        recurringSeriesId: d.recurringSeriesId ?? null,
        recurrenceEndDate: d.recurrenceEndDate ?? null,
        goalId: null,
      });
    });
    await batch.commit();
    showToast(
      `Added ${due.length} recurring transaction${due.length !== 1 ? "s" : ""}!`,
    );
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    const transaction = transactions.find((t) => t.id === id);
    if (!transaction) return;

    await deleteTransaction(id);
    let restored = false;
    // Preserve the attachment while Undo is visible; otherwise a restored
    // transaction would point at a deleted receipt.
    const cleanupTimer = window.setTimeout(() => {
      if (!restored) void deleteReceipt(transaction.receiptPath);
    }, 5_100);

    // Offer undo ΓÇö re-add the transaction if user taps Undo before toast dismisses
    showToast("Transaction deleted", async () => {
      restored = true;
      window.clearTimeout(cleanupTimer);
      const { id: removedId, ...restoreData } = transaction;
      void removedId;
      await addTransaction(restoreData);
    });
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
      deadline: toDateInputValue(),
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
      goal.targetAmount,
    );
    await updateGoal(id, { currentAmount: newAmount });
    showToast(amount > 0 ? "Added to goal!" : "Removed from goal!");
  };

  const handleExportData = () => {
    exportToCSV(filteredTransactions);
    showToast(
      `Exported ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? "s" : ""}!`,
    );
  };

  const handleImportCSV = async (
    rows: {
      date: string;
      type: "income" | "expense";
      category: string;
      description: string;
      amount: number;
    }[],
  ): Promise<{ imported: number; skipped: number }> => {
    const keyOf = (row: Pick<Transaction, "date" | "type" | "category" | "description" | "amount">) =>
      `${row.date}|${row.type}|${row.category}|${row.description.trim().toLowerCase()}|${toMinorUnits(row.amount)}`;
    const existing = new Set(transactions.map(keyOf));
    const uniqueRows = rows
      .map((row) => ({ ...row, amount: normaliseMoney(row.amount) }))
      .filter((row) => {
        const key = keyOf(row);
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });
    const skipped = rows.length - uniqueRows.length;
    if (isLocalMode) {
      await Promise.all(uniqueRows.map((row) => addTransaction({
        ...row,
        receipt: null,
        receiptPath: null,
        isRecurring: false,
        goalId: null,
      })));
      showToast(`Imported ${uniqueRows.length} transaction${uniqueRows.length !== 1 ? "s" : ""}${skipped ? `; skipped ${skipped} duplicate${skipped !== 1 ? "s" : ""}` : ""}.`);
      return { imported: uniqueRows.length, skipped };
    }
    if (!db || !user) return { imported: 0, skipped: rows.length };
    // Firestore batches cap at 500 writes — chunk to stay under it
    const CHUNK = 450;
    for (let i = 0; i < uniqueRows.length; i += CHUNK) {
      const batch = writeBatch(db);
      uniqueRows.slice(i, i + CHUNK).forEach((row) => {
        const ref = doc(collection(db!, `users/${user.uid}/transactions`));
        batch.set(ref, toStoredTransaction({ ...row, receipt: null, receiptPath: null, isRecurring: false, goalId: null }));
      });
      await batch.commit();
    }
    showToast(
      `Imported ${uniqueRows.length} transaction${uniqueRows.length !== 1 ? "s" : ""}${skipped ? `; skipped ${skipped} duplicate${skipped !== 1 ? "s" : ""}` : ""}.`,
    );
    return { imported: uniqueRows.length, skipped };
  };

  const openQuickAdd = (type: "income" | "expense") => {
    setEditingTransaction(null);
    setPresetType(type);
    setShowAddModal(true);
  };

  const handleClearData = async () => {
    if (isLocalMode) {
      setLocalTransactions([]);
      setLocalGoals([]);
      setLocalBudget(DEFAULT_BUDGET_LIMIT);
      setLocalCategoryBudgets(defaultCategoryBudgets());
      setLocalSettings(DEFAULT_USER_SETTINGS);
      setBudgetSnapshots([]);
      return;
    }
    if (!db || !user) return;

    const [txSnap, goalSnap, historySnap] = await Promise.all([
      getDocs(collection(db, `users/${user.uid}/transactions`)),
      getDocs(collection(db, `users/${user.uid}/goals`)),
      getDocs(collection(db, `users/${user.uid}/budgetHistory`)),
    ]);
    const refs = [
      ...txSnap.docs.map((item) => item.ref),
      ...goalSnap.docs.map((item) => item.ref),
      ...historySnap.docs.map((item) => item.ref),
      doc(db, `users/${user.uid}/settings`, "budgets"),
      doc(db, `users/${user.uid}/settings`, "preferences"),
    ];
    for (let index = 0; index < refs.length; index += 450) {
      const batch = writeBatch(db);
      refs.slice(index, index + 450).forEach((item) => batch.delete(item));
      await batch.commit();
    }
    await deleteReceiptFolder(`receipts/${user.uid}`);

    setBudgetLimit(DEFAULT_BUDGET_LIMIT);
    setCategoryBudgets(defaultCategoryBudgets());
    setBudgetSnapshots([]);
  };

  // Styling classes
  const bgPrimary = darkMode
    ? "bg-gray-950"
    : "bg-slate-50";
  const bgCard = darkMode
    ? "bg-gray-900"
    : "bg-white";
  const textPrimary = darkMode ? "text-white" : "text-gray-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-600";
  const borderColor = darkMode ? "border-gray-700" : "border-gray-200";
  const inputBg = darkMode
    ? "bg-gray-700/80 border-gray-600 text-white"
    : "bg-white/90 border-gray-300 text-gray-900";

  return (
    <div
      className={`min-h-screen ${bgPrimary} pb-20 md:pb-8 transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div
          className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 mb-6 transition-all duration-300 border ${borderColor} card-hover`}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Logo + title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                  Budget Tracker
                </h1>
                <p className={`${textSecondary} text-xs md:text-sm`}>
                  Take control of your finances
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {/* User info */}
              {user && (
                <div className="flex items-center gap-2">
                  {/* Avatar with initials */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow">
                    {(user.displayName || user.email || "?")
                      .split(" ")
                      .map((w: string) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <span
                    className={`text-sm font-medium ${textSecondary} hidden sm:inline max-w-[160px] truncate`}
                  >
                    {user.displayName || user.email}
                  </span>
                  <button
                    onClick={async () => {
                      const auth = getAuth(app!);
                      await signOut(auth);
                      setUser(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Logout
                  </button>
                </div>
              )}
              {isLocalMode && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${darkMode ? "bg-amber-900/40 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                  Local-only mode
                </span>
              )}
              <div
                className={`w-px h-6 hidden sm:block ${darkMode ? "bg-gray-600" : "bg-gray-300"}`}
              ></div>
              <button
                onClick={handleExportData}
                className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition-colors`}
                title="Export filtered data"
              >
                <Download className={`w-5 h-5 ${textSecondary}`} />
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? "hover:bg-gray-700 text-yellow-400"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
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
              className={`mt-4 p-3 rounded-lg ${darkMode ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50 border-yellow-200"} border`}
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

        {/* Data Loading Skeleton */}
        {isDataLoading && (
          <div className="space-y-6 mb-6">
            {/* Overview cards skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`${bgCard} rounded-xl shadow-lg p-4 md:p-6 overflow-hidden relative`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg mb-3 animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  />
                  <div
                    className={`h-3 w-16 rounded mb-2 animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  />
                  <div
                    className={`h-7 w-24 rounded animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  />
                </div>
              ))}
            </div>
            {/* Chart skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className={`${bgCard} rounded-2xl shadow-xl p-6 overflow-hidden relative`}
                >
                  <div
                    className={`h-5 w-40 rounded mb-4 animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  />
                  <div
                    className={`h-64 rounded-xl animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Desktop Navigation ΓÇö sliding pill */}
        {(() => {
          const tabList = [
            "home",
            "transactions",
            "analytics",
            "goals",
            "settings",
          ];
          const activeIndex = tabList.indexOf(activeTab);
          return (
            <div
              className={`relative hidden md:flex mb-6 ${bgCard} rounded-xl shadow-lg overflow-hidden transition-colors duration-300 border ${borderColor}`}
            >
              {/* Sliding background pill */}
              <div
                className="absolute inset-y-0 bg-gradient-to-r from-indigo-600 to-purple-600 pointer-events-none"
                style={{
                  width: "20%",
                  transform: `translateX(${activeIndex * 100}%)`,
                  transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
              {tabList.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative z-10 flex-1 py-3 px-4 capitalize font-medium transition-colors duration-200 ${
                    activeTab === tab
                      ? "text-white"
                      : darkMode
                        ? "text-gray-400 hover:text-white"
                        : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          );
        })()}

        {/* Tab content — keyed so each tab switch fades in.
            Suspense covers the lazy-loaded chart components. */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className={`${bgCard} rounded-2xl shadow-xl p-6 overflow-hidden relative`}
                >
                  <div
                    className={`h-5 w-40 rounded mb-4 animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  />
                  <div
                    className={`h-64 rounded-xl animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  />
                </div>
              ))}
            </div>
          }
        >
        <div key={activeTab} className="animate-fade-in">

        {/* ==================== HOME TAB ==================== */}
        {activeTab === "home" && (
          <>
            {/* Recurring transactions due */}
            {!isDataLoading && (
              <RecurringBanner
                transactions={transactions}
                darkMode={darkMode}
                currencySymbol={currencySymbol}
                onPostAll={handlePostRecurring}
              />
            )}

            {/* Hero / Welcome Banner */}
            <div
              className={`mb-6 rounded-3xl overflow-hidden relative ${
                darkMode
                  ? "bg-gradient-to-r from-indigo-800 via-purple-800 to-slate-900"
                  : "bg-indigo-600"
              }`}
            >
              <div className="absolute inset-0 opacity-40 mix-blend-soft-light pointer-events-none">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10 px-5 py-6 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center gap-6">
                {/* Left: Greeting + summary */}
                <div className="flex-1 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                    Personal finance snapshot
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    {user?.displayName
                      ? `Welcome back, ${user.displayName.split(" ")[0]}`
                      : "Welcome back"}
                  </h2>
                  <p className="text-sm md:text-base text-white/80 max-w-xl">
                    See how you&apos;re tracking{" "}
                    {DATE_RANGE_OPTIONS.find(
                      (o) => o.value === filterDateRange,
                    )?.label?.toLowerCase()}
                    . Stay on top of your spending, savings, and goals at a
                    glance.
                  </p>

                  <div className="mt-4 inline-flex flex-wrap gap-2 bg-black/10 rounded-2xl p-1">
                    <button
                      onClick={() => {
                        setEditingTransaction(null);
                        setShowAddModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-700 text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add transaction
                    </button>
                    <button
                      onClick={() => setActiveTab("goals")}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-white text-sm font-medium shadow-md transition-colors"
                    >
                      View savings goals
                    </button>
                    <button
                      onClick={() => setActiveTab("transactions")}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500/90 hover:bg-sky-400 text-white text-sm font-medium shadow-md transition-colors"
                    >
                      Recent activity
                    </button>
                  </div>
                </div>

                {/* Right: Key numbers */}
                <div className="w-full md:w-auto md:min-w-[260px]">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div
                      className={`col-span-2 md:col-span-2 rounded-2xl p-4 backdrop-blur-md border border-white/15 ${
                        darkMode ? "bg-black/40 text-white" : "bg-white/95 text-slate-900"
                      }`}
                    >
                      <p className={`text-xs mb-1 ${darkMode ? "text-white/70" : "text-slate-500"}`}>
                        Remaining this period
                      </p>
                      <p className="text-2xl font-semibold">
                        {currencySymbol}
                        {Math.abs(remaining).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className={`mt-1 text-[11px] ${darkMode ? "text-white/70" : "text-slate-500"}`}>
                        YouΓÇÖve used{" "}
                        <span className={`font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
                          {Math.min(
                            100,
                            Math.max(0, budgetUsedPercent),
                          ).toFixed(0)}
                          %
                        </span>{" "}
                        of your main budget.
                      </p>
                    </div>

                    <div className="bg-black/10 rounded-2xl p-3.5 border border-white/10 text-white">
                      <p className="text-[11px] text-white/70 mb-0.5">Income</p>
                      <p className="text-lg font-semibold leading-tight">
                        {currencySymbol}
                        {totalIncome.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>

                    <div className="bg-black/10 rounded-2xl p-3.5 border border-white/10 text-white">
                      <p className="text-[11px] text-white/70 mb-0.5">
                        Expenses
                      </p>
                      <p className="text-lg font-semibold leading-tight">
                        {currencySymbol}
                        {totalExpenses.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Keep the home screen focused on current position and next actions.
                Detail-heavy visualizations live in Analytics. */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left column: Overview */}
              <div className="xl:col-span-3 space-y-6">
                {/* Overview Cards */}
                <OverviewCards
                  totalIncome={totalIncome}
                  totalExpenses={totalExpenses}
                  remaining={remaining}
                  budgetUsedPercent={budgetUsedPercent}
                  darkMode={darkMode}
                  currencySymbol={currencySymbol}
                />

                {/* Detailed charts are available in Analytics. */}
                <div className="hidden grid-cols-1 lg:grid-cols-2 gap-6">
                  <div
                    className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 transform-gpu overflow-visible card-hover`}
                  >
                    <h2
                      className={`text-lg md:text-xl font-bold ${textPrimary} mb-4 flex items-center justify-between`}
                    >
                      <span>Expenses by category</span>
                    </h2>
                    <ExpensesPieChart
                      data={expensesByCategory}
                      darkMode={darkMode}
                      currencySymbol={currencySymbol}
                    />
                  </div>

                  <div
                    className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 card-hover`}
                  >
                    <h2
                      className={`text-lg md:text-xl font-bold ${textPrimary} mb-1 flex items-center justify-between`}
                    >
                      <span>Income vs expenses</span>
                    </h2>
                    <p className={`text-xs ${textSecondary} mb-4`}>
                      Last 6 months overview
                    </p>
                    <IncomeExpenseBarChart
                      data={chartData}
                      darkMode={darkMode}
                      currencySymbol={currencySymbol}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Insight row – Health Score + Forecast + Spending Check */}
            <div className="hidden grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
              <HealthScore
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                budgetLimit={budgetLimit}
                goals={savingsGoals}
                darkMode={darkMode}
              />
              <SpendingForecast
                transactions={transactions}
                budgetLimit={budgetLimit}
                darkMode={darkMode}
                currencySymbol={currencySymbol}
              />
              <SpendingNudge
                transactions={transactions}
                darkMode={darkMode}
                currencySymbol={currencySymbol}
              />
            </div>

            {/* Upcoming recurring expenses — forward-looking planner */}
            <div
              aria-hidden="true"
              className={`hidden ${bgCard} rounded-2xl shadow-xl p-4 md:p-6 mt-6 transition-all duration-300 card-hover`}
            >
              <UpcomingExpensesCalendar
                transactions={transactions}
                darkMode={darkMode}
                currencySymbol={currencySymbol}
              />
            </div>

            {/* Bottom row – 3 cards in a single horizontal row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* This period at a glance */}
              <div
                aria-hidden="true"
                className={`hidden ${bgCard} rounded-2xl shadow-xl p-4 md:p-5 transition-all duration-300 card-hover`}
              >
                <h3
                  className={`text-base md:text-lg font-semibold ${textPrimary} mb-2`}
                >
                  This period at a glance
                </h3>
                <p className={`text-xs ${textSecondary} mb-4`}>
                  Quick view of how your spending compares to your budget.
                </p>
                <SpendingTrendChart
                  data={dailyTrendData}
                  darkMode={darkMode}
                  color="#6366f1"
                  title="Daily expenses"
                  currencySymbol={currencySymbol}
                />
              </div>

              {/* Savings goals */}
              <div
                className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-5 transition-all duration-300 card-hover`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className={`text-base md:text-lg font-semibold ${textPrimary}`}
                  >
                    Savings goals
                  </h3>
                  <button
                    onClick={() => setActiveTab("goals")}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Manage →
                  </button>
                </div>
                {savingsGoals.length === 0 ? (
                  <p className={`text-xs ${textSecondary}`}>
                    You don&apos;t have any goals yet. Create your first savings
                    goal to start tracking progress visually.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto hide-scrollbar">
                    {savingsGoals.slice(0, 3).map((goal) => {
                      const pct =
                        goal.targetAmount > 0
                          ? Math.min(
                              100,
                              (goal.currentAmount / goal.targetAmount) * 100,
                            )
                          : 0;
                      return (
                        <li key={goal.id}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className={textPrimary}>{goal.name}</span>
                            <span className={textSecondary}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                          <div
                            className={`h-1.5 rounded-full overflow-hidden ${darkMode ? "bg-gray-700" : "bg-gray-200/70"}`}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: goal.color,
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Upcoming Goal */}
              <UpcomingGoalCard
                goals={savingsGoals}
                darkMode={darkMode}
                currencySymbol={currencySymbol}
                onViewGoals={() => setActiveTab("goals")}
              />
            </div>
          </>
        )}

        {/* ==================== TRANSACTIONS TAB ==================== */}
        {activeTab === "transactions" && (
          <div
            className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 card-hover`}
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
                  onClick={() => setShowImportModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                  }`}
                  title="Import transactions from CSV"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                </button>

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
                  {[
                    ...new Set([...expenseCategories, ...incomeCategories]),
                  ].map((cat) => (
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

            {/* Category chips ΓÇö quick filter */}
            {(() => {
              const usedCategories = [
                ...new Set(
                  transactions
                    .filter((t) => {
                      const d = parseDateOnly(t.date);
                      return d >= filterStart && d <= filterEnd;
                    })
                    .map((t) => t.category),
                ),
              ].sort();
              if (usedCategories.length === 0) return null;
              return (
                <div
                  className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none"
                  style={{ scrollbarWidth: "none" }}
                >
                  <button
                    onClick={() => setFilterCategory("all")}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      filterCategory === "all"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : darkMode
                          ? "bg-gray-700 text-gray-300 border-gray-600 hover:border-indigo-400"
                          : "bg-gray-100 text-gray-600 border-gray-200 hover:border-indigo-400"
                    }`}
                  >
                    All
                  </button>
                  {usedCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setFilterCategory(filterCategory === cat ? "all" : cat)
                      }
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        filterCategory === cat
                          ? "text-white border-transparent"
                          : darkMode
                            ? "bg-gray-700 text-gray-300 border-gray-600 hover:border-indigo-400"
                            : "bg-gray-100 text-gray-700 border-gray-200 hover:border-indigo-400"
                      }`}
                      style={
                        filterCategory === cat
                          ? {
                              backgroundColor:
                                CATEGORY_CONFIG[cat]?.color || "#6366f1",
                              borderColor:
                                CATEGORY_CONFIG[cat]?.color || "#6366f1",
                            }
                          : {}
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Transactions List */}
            <TransactionList
              transactions={filteredTransactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onViewReceipt={setSelectedReceipt}
              darkMode={darkMode}
              searchQuery={searchQuery}
              currencySymbol={currencySymbol}
            />
          </div>
        )}

        {/* ==================== ANALYTICS TAB ==================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div
              className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 card-hover`}
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
                currencySymbol={currencySymbol}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <HealthScore
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                budgetLimit={budgetLimit}
                goals={savingsGoals}
                darkMode={darkMode}
              />
              <div className={`${bgCard} rounded-2xl border ${borderColor} p-4 md:p-6`}>
                <SpendingForecast
                  transactions={transactions}
                  budgetLimit={budgetLimit}
                  darkMode={darkMode}
                  currencySymbol={currencySymbol}
                />
              </div>
              <SpendingNudge
                transactions={transactions}
                darkMode={darkMode}
                currencySymbol={currencySymbol}
              />
            </div>

            <div className={`${bgCard} rounded-2xl border ${borderColor} p-4 md:p-6`}>
              <UpcomingExpensesCalendar
                transactions={transactions}
                darkMode={darkMode}
                currencySymbol={currencySymbol}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div
                className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 transform-gpu overflow-visible card-hover`}
              >
                <h2
                  className={`text-lg md:text-xl font-bold ${textPrimary} mb-4`}
                >
                  Spending Breakdown
                </h2>
                <ExpensesPieChart
                  data={expensesByCategory}
                  darkMode={darkMode}
                  currencySymbol={currencySymbol}
                />
              </div>

              <div
                className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 card-hover`}
              >
                <h2
                  className={`text-lg md:text-xl font-bold ${textPrimary} mb-4`}
                >
                  Monthly Comparison
                </h2>
                <IncomeExpenseBarChart data={chartData} darkMode={darkMode} currencySymbol={currencySymbol} />
              </div>
            </div>

            {/* Spending Trend */}
            <div
              className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 card-hover`}
            >
              <h2
                className={`text-lg md:text-xl font-bold ${textPrimary} mb-4`}
              >
                Daily Spending Trend
              </h2>
              <SpendingTrendChart
                data={dailyTrendData}
                darkMode={darkMode}
                color="#6366f1"
                title="Daily Expenses"
                currencySymbol={currencySymbol}
              />
            </div>

            {/* Category Budget Progress */}
            <div
              className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 card-hover`}
            >
              <h2
                className={`text-lg md:text-xl font-bold ${textPrimary} mb-4`}
              >
                Category Budget Progress
              </h2>
              <CategoryBudgetChart
                data={expensesByCategory}
                darkMode={darkMode}
                currencySymbol={currencySymbol}
              />
            </div>

            {/* Heatmap + month-over-month comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div
                className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 card-hover`}
              >
                <SpendingHeatmap
                  transactions={transactions}
                  darkMode={darkMode}
                  currencySymbol={currencySymbol}
                />
              </div>

              <div
                className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 card-hover`}
              >
                <CategoryComparisonTable
                  transactions={transactions}
                  darkMode={darkMode}
                  currencySymbol={currencySymbol}
                />
              </div>

              <div
                className={`${bgCard} rounded-2xl shadow-xl p-4 md:p-6 transition-all duration-300 card-hover`}
              >
                <BudgetHistoryCard
                  transactions={transactions}
                  snapshots={budgetSnapshots}
                  currentBudgetLimit={budgetLimit}
                  darkMode={darkMode}
                  currencySymbol={currencySymbol}
                />
              </div>

              {/* Spending Insights — shares the row with Budget History on desktop */}
              <SpendingInsights
                transactions={transactions}
                categoryBudgets={categoryBudgets}
                budgetLimit={budgetLimit}
                currencySymbol={currencySymbol}
                darkMode={darkMode}
              />
            </div>
          </div>
        )}

        {/* ==================== GOALS TAB ==================== */}
        {activeTab === "goals" &&
          (isGoalsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`${bgCard} rounded-2xl shadow-lg p-6 overflow-hidden relative`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-16 h-16 rounded-full animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                    />
                    <div className="flex-1 space-y-2">
                      <div
                        className={`h-4 w-32 rounded animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                      />
                      <div
                        className={`h-3 w-20 rounded animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                      />
                    </div>
                  </div>
                  <div
                    className={`h-2 rounded-full animate-shimmer ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <GoalsSection
              goals={savingsGoals}
              onAddGoal={() => {
                setEditingGoal(null);
                setGoalForm({
                  name: "",
                  targetAmount: "",
                  currentAmount: "",
                  deadline: toDateInputValue(),
                  color: GOAL_COLORS[0],
                });
                setShowGoalModal(true);
              }}
              onEditGoal={handleEditGoal}
              onDeleteGoal={handleDeleteGoal}
              onUpdateProgress={handleUpdateGoalProgress}
              darkMode={darkMode}
              currencySymbol={currencySymbol}
            />
          ))}

        {/* ==================== SETTINGS TAB ==================== */}
        {activeTab === "settings" && (
          <SettingsSection
            budgetLimit={budgetLimit}
            setBudgetLimit={(limit) => updateBudgets(limit, categoryBudgets)}
            categoryBudgets={categoryBudgets}
            setCategoryBudgets={(budgets) =>
              updateBudgets(budgetLimit, budgets)
            }
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
        </Suspense>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
      />

      {/* Quick Add floating action button */}
      <QuickAddFAB
        darkMode={darkMode}
        onAddExpense={() => openQuickAdd("expense")}
        onAddIncome={() => openQuickAdd("income")}
        onAddGoal={() => {
          setEditingGoal(null);
          setGoalForm({
            name: "",
            targetAmount: "",
            currentAmount: "",
            deadline: toDateInputValue(),
            color: GOAL_COLORS[0],
          });
          setShowGoalModal(true);
        }}
      />

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportCSV}
        darkMode={darkMode}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingTransaction(null);
          setPresetType(null);
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
                receiptPath: editingTransaction.receiptPath,
                isRecurring: editingTransaction.isRecurring || false,
                recurringFrequency: editingTransaction.recurringFrequency,
                recurringSeriesId: editingTransaction.recurringSeriesId,
                recurrenceEndDate: editingTransaction.recurrenceEndDate,
              }
            : presetType
              ? {
                  type: presetType,
                  amount: "",
                  category:
                    presetType === "expense"
                      ? expenseCategories[0]
                      : incomeCategories[0],
                  description: "",
                  date: toDateInputValue(),
                  receipt: null,
                  receiptPath: null,
                  isRecurring: false,
                  recurringFrequency: "monthly",
                }
              : undefined
        }
        isEditing={!!editingTransaction}
        darkMode={darkMode}
        userId={user?.uid}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        currencySymbol={currencySymbol}
        goals={savingsGoals.map((g) => ({ id: g.id, name: g.name }))}
      />

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div
            className={`${bgCard} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in`}
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
                    {currencySymbol}
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
                    {currencySymbol}
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
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setSelectedReceipt(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] animate-scale-in">
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
