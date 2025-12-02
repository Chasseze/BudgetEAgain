import React from 'react';
import { Trash2, Edit2, Eye, RefreshCw } from 'lucide-react';
import CategoryBadge from './CategoryBadge';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  receipt: string | null;
  isRecurring?: boolean;
}

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onViewReceipt: (receipt: string) => void;
  darkMode: boolean;
  searchQuery?: string;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
  onViewReceipt,
  darkMode,
  searchQuery = '',
}) => {
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format amount
  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Highlight search matches
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  // Sort dates descending
  const sortedDates = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (transactions.length === 0) {
    return (
      <div
        className={`text-center py-12 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        <div className="text-6xl mb-4">📭</div>
        <p className="text-lg font-medium">No transactions found</p>
        <p className="text-sm mt-1">
          {searchQuery
            ? 'Try adjusting your search or filters'
            : 'Add your first transaction to get started'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          {/* Date Header */}
          <div
            className={`sticky top-0 z-10 py-2 px-1 mb-2 ${
              darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'
            }`}
          >
            <h3
              className={`text-sm font-semibold ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {formatDate(date)}
            </h3>
          </div>

          {/* Transactions for this date */}
          <div className="space-y-2">
            {groupedTransactions[date].map((transaction) => (
              <div
                key={transaction.id}
                className={`group flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                  transaction.type === 'income'
                    ? darkMode
                      ? 'border-green-800 bg-green-900/30 hover:bg-green-900/50'
                      : 'border-green-200 bg-green-50 hover:bg-green-100'
                    : darkMode
                    ? 'border-red-800 bg-red-900/30 hover:bg-red-900/50'
                    : 'border-red-200 bg-red-50 hover:bg-red-100'
                }`}
              >
                {/* Left side - Info */}
                <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4
                      className={`font-semibold truncate ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}
                    >
                      {highlightText(transaction.description, searchQuery)}
                    </h4>

                    {/* Recurring indicator */}
                    {transaction.isRecurring && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          darkMode
                            ? 'bg-indigo-900/50 text-indigo-300'
                            : 'bg-indigo-100 text-indigo-600'
                        }`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Recurring
                      </span>
                    )}

                    {/* Receipt indicator */}
                    {transaction.receipt && (
                      <button
                        onClick={() => onViewReceipt(transaction.receipt!)}
                        className={`p-1 rounded-full transition-colors ${
                          darkMode
                            ? 'text-indigo-400 hover:bg-indigo-900/50'
                            : 'text-indigo-600 hover:bg-indigo-100'
                        }`}
                        title="View receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Category badge */}
                  <div className="mb-1">
                    <CategoryBadge category={transaction.category} size="sm" />
                  </div>

                  {/* Date on mobile */}
                  <p
                    className={`text-xs sm:hidden ${
                      darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {formatDate(transaction.date)}
                  </p>
                </div>

                {/* Right side - Amount and actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  {/* Amount */}
                  <span
                    className={`text-xl sm:text-2xl font-bold whitespace-nowrap ${
                      transaction.type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}$
                    {formatAmount(transaction.amount)}
                  </span>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(transaction)}
                      className={`p-2 rounded-lg transition-all ${
                        darkMode
                          ? 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/50'
                          : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-100'
                      }`}
                      title="Edit transaction"
                    >
                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      onClick={() => onDelete(transaction.id)}
                      className={`p-2 rounded-lg transition-all ${
                        darkMode
                          ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/50'
                          : 'text-gray-500 hover:text-red-600 hover:bg-red-100'
                      }`}
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;
